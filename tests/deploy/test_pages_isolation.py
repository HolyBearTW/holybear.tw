"""Offline deployment policy tests. UUID fixtures are not provisioned resources."""

import copy
import json
import runpy
import tomllib
import unittest
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
POLICY = runpy.run_path(str(ROOT / "scripts/check-pages-isolation.py"))
validate = POLICY["validate_config"]


class PagesIsolationTests(unittest.TestCase):
    def setUp(self):
        self.config = tomllib.loads((ROOT / "wrangler.toml").read_text())

    def configured_preview(self):
        preview = self.config["env"]["preview"]
        preview["d1_databases"] = [
            {"binding": binding, "database_name": POLICY["PREVIEW_D1"][binding],
             "database_id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "unit-test-only-" + binding)),
             "migrations_dir": values[2]}
            for binding, values in POLICY["PRODUCTION_D1"].items()
        ]
        preview["r2_buckets"] = [{"binding": "EVIDENCE_ARCHIVE", "bucket_name": "holybear-maple-evidence-preview"}]
        preview["durable_objects"] = {"bindings": [{"name": "NEXON_RATE_LIMITER", "class_name": "NexonRateLimiter", "script_name": "holybear-nexon-rate-limiter-preview"}]}
        preview["vars"].update(PREVIEW_FUNCTIONS_ENABLED="true", PREVIEW_RESOURCE_SCOPE="isolated", NEXON_RATE_LIMITER_REQUIRED="true")
        return preview

    def test_current_configuration_has_no_default_or_preview_resources(self):
        self.assertTrue(validate(self.config))
        for scope in [self.config, self.config["env"]["preview"]]:
            self.assertEqual(scope["d1_databases"], [])
            self.assertEqual(scope["r2_buckets"], [])
            self.assertEqual(scope["durable_objects"], {"bindings": []})
            self.assertEqual(scope["vars"]["PREVIEW_FUNCTIONS_ENABLED"], "false")

    def test_production_keeps_the_original_resource_ids_names_and_migrations(self):
        production = self.config["env"]["production"]
        self.assertEqual(production["d1_databases"], [
            {"binding": key, "database_name": value[0], "database_id": value[1], "migrations_dir": value[2]}
            for key, value in POLICY["PRODUCTION_D1"].items()
        ])
        self.assertEqual(production["r2_buckets"], [{"binding": "EVIDENCE_ARCHIVE", "bucket_name": "holybear-maple-evidence"}])
        self.assertEqual(production["durable_objects"]["bindings"][0]["script_name"], "holybear-nexon-rate-limiter")

    def test_a_future_complete_preview_is_explicitly_isolated(self):
        self.configured_preview()
        self.assertTrue(validate(self.config))

    def test_pr_workflow_accepts_only_the_resource_free_profile(self):
        self.assertTrue(validate(self.config, "pr-preview"))
        self.configured_preview()
        with self.assertRaises(ValueError):
            validate(self.config, "pr-preview")

    def test_disabled_pr_apis_cannot_hide_even_an_isolated_binding(self):
        self.config["env"]["preview"]["d1_databases"] = [copy.deepcopy(POLICY["SURVEY_PREVIEW_D1"])]
        with self.assertRaises(ValueError):
            validate(self.config, "pr-preview")

    def survey_config(self):
        return tomllib.loads((ROOT / "wrangler.survey-preview.toml").read_text(encoding="utf-8"))

    def test_survey_profile_reuses_only_the_existing_isolated_d1(self):
        config = self.survey_config()
        self.assertTrue(validate(config, "survey-preview"))
        self.assertEqual(config["env"]["preview"]["d1_databases"], [POLICY["SURVEY_PREVIEW_D1"]])
        self.assertEqual(config["env"]["production"], self.config["env"]["production"])
        for scope in [config, *config["env"].values()]:
            self.assertEqual(scope["vars"]["NODE_VERSION"], "24.22.1")

    def test_survey_profile_cannot_be_published_as_an_ordinary_pr(self):
        for purpose in ["default", "pr-preview"]:
            with self.assertRaises(ValueError):
                validate(self.survey_config(), purpose)

    def test_survey_profile_cannot_fall_back_to_any_production_or_new_d1(self):
        for identifier in [*[value[1] for value in POLICY["PRODUCTION_D1"].values()],
                           str(uuid.uuid5(uuid.NAMESPACE_DNS, "not-the-existing-survey-d1"))]:
            with self.subTest(identifier=identifier):
                config = self.survey_config()
                config["env"]["preview"]["d1_databases"][0]["database_id"] = identifier
                with self.assertRaises(ValueError):
                    validate(config, "survey-preview")

    def test_survey_profile_rejects_maple_d1_r2_and_do_bindings(self):
        for resource in POLICY["RESOURCE_KEYS"]:
            with self.subTest(resource=resource):
                config = self.survey_config()
                config["env"]["preview"][resource] = copy.deepcopy(self.config["env"]["production"][resource])
                with self.assertRaises(ValueError):
                    validate(config, "survey-preview")

    def test_survey_profile_requires_explicit_survey_only_markers(self):
        for key, value in [("PAGES_DEPLOYMENT_ENV", "preview"), ("PAGES_DEPLOYMENT_ENV", "production"),
                           ("PREVIEW_FUNCTIONS_ENABLED", "false"), ("PREVIEW_RESOURCE_SCOPE", "isolated")]:
            with self.subTest(key=key, value=value):
                config = self.survey_config()
                config["env"]["preview"]["vars"][key] = value
                with self.assertRaises(ValueError):
                    validate(config, "survey-preview")

    def test_any_production_d1_id_is_rejected_for_either_preview_database(self):
        for binding in ["DB", "SURVEY_DB"]:
            for values in POLICY["PRODUCTION_D1"].values():
                with self.subTest(binding=binding, production_database=values[0]):
                    self.setUp()
                    preview = self.configured_preview()
                    next(item for item in preview["d1_databases"] if item["binding"] == binding)["database_id"] = values[1]
                    with self.assertRaises(ValueError):
                        validate(self.config)

    def test_production_bucket_or_do_worker_cannot_be_used_by_preview(self):
        for resource in ["r2_buckets", "durable_objects"]:
            with self.subTest(resource=resource):
                self.setUp()
                preview = self.configured_preview()
                preview[resource] = copy.deepcopy(self.config["env"]["production"][resource])
                with self.assertRaises(ValueError):
                    validate(self.config)

    def test_default_resources_cannot_fall_back_to_production(self):
        for resource in POLICY["RESOURCE_KEYS"]:
            with self.subTest(resource=resource):
                self.setUp()
                self.config[resource] = copy.deepcopy(self.config["env"]["production"][resource])
                with self.assertRaises(ValueError):
                    validate(self.config)

    def test_preview_cannot_claim_to_be_production(self):
        self.config["env"]["preview"]["vars"]["PAGES_DEPLOYMENT_ENV"] = "production"
        with self.assertRaises(ValueError):
            validate(self.config)

    def test_preview_rejects_placeholder_database_ids(self):
        for identifier in ["TODO", "00000000-0000-0000-0000-000000000000"]:
            with self.subTest(identifier=identifier):
                self.setUp()
                self.configured_preview()["d1_databases"][0]["database_id"] = identifier
                with self.assertRaises(ValueError):
                    validate(self.config)

    def test_enabled_preview_requires_all_resource_types(self):
        for resource in POLICY["RESOURCE_KEYS"]:
            with self.subTest(resource=resource):
                self.setUp()
                preview = self.configured_preview()
                preview[resource] = {"bindings": []} if resource == "durable_objects" else []
                with self.assertRaises(ValueError):
                    validate(self.config)

    def test_unknown_bindings_and_other_pages_environments_are_rejected(self):
        for key in ["services", "kv_namespaces", "queues"]:
            with self.subTest(key=key):
                self.setUp()
                self.config["env"]["preview"][key] = []
                with self.assertRaises(ValueError):
                    validate(self.config)
        self.setUp()
        self.config["env"]["staging"] = {}
        with self.assertRaises(ValueError):
            validate(self.config)

    def test_secrets_cannot_be_committed_as_plaintext_vars(self):
        for scope in [self.config, *self.config["env"].values()]:
            scope["vars"]["NEXON_API_KEY"] = "unit-test-only-secret"
            with self.assertRaises(ValueError):
                validate(self.config)
            del scope["vars"]["NEXON_API_KEY"]

    def test_preview_do_has_its_own_script_and_no_public_endpoint_or_cron(self):
        preview = tomllib.loads((ROOT / "wrangler.nexon-rate-limiter.preview.toml").read_text())
        production = tomllib.loads((ROOT / "wrangler.nexon-rate-limiter.toml").read_text())
        self.assertEqual(preview["name"], "holybear-nexon-rate-limiter-preview")
        self.assertNotEqual(preview["name"], production["name"])
        self.assertEqual(preview["main"], production["main"])
        self.assertEqual(preview["migrations"], production["migrations"])
        self.assertFalse(preview["workers_dev"])
        self.assertNotIn("triggers", preview)

    def test_static_preview_remains_outside_functions_and_all_handlers_are_guarded(self):
        routes = json.loads((ROOT / "public/_routes.json").read_text())
        self.assertEqual(routes, {"version": 1, "include": ["/api/*"], "exclude": []})
        for path in (ROOT / "functions").rglob("*.ts"):
            if "export const onRequest" in path.read_text() and path.name != "_middleware.ts":
                self.assertEqual(path.relative_to(ROOT / "functions").parts[0], "api", path)
        self.assertFalse((ROOT / "public/_worker.js").exists())


if __name__ == "__main__":
    unittest.main()
