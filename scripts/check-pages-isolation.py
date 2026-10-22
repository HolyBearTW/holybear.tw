#!/usr/bin/env python3
"""Validate Pages resource isolation without credentials, network, or PR execution.

Requires Python 3.11+ (stdlib tomllib). The trusted GitHub workflow passes the
candidate commit's raw TOML on stdin; local operators can validate a file.
"""

import argparse
import sys
import tomllib
import uuid
from pathlib import Path


PRODUCTION_D1 = {
    "DB": ("holybear-maple-db-2", "83a4d165-d1ac-44d2-82c2-ca3ed111c50e", "migrations"),
    "SURVEY_DB": ("holybear-survey-db", "edea16a9-d316-4c96-bbf5-87c3fb696975", "migrations-survey"),
}
PREVIEW_D1 = {"DB": "holybear-maple-db-preview", "SURVEY_DB": "holybear-survey-db-preview"}
SURVEY_PREVIEW_D1 = {
    "binding": "SURVEY_DB", "database_name": "holybear-survey-db-preview",
    "database_id": "5e28ff94-daa3-402c-836e-5d7f8f861cbf", "migrations_dir": "migrations-survey",
}
RESOURCE_KEYS = {"d1_databases", "r2_buckets", "durable_objects"}
ENV_KEYS = RESOURCE_KEYS | {"vars"}
SECRET_KEYS = {
    "NEXON_API_KEY", "IMPORT_ADMIN_SECRET", "CONSUMER_FALLBACK_SECRET", "SURVEY_ADMIN_SECRET",
    "SURVEY_FINGERPRINT_SECRET", "TURNSTILE_SECRET_KEY", "MAINTENANCE_BYPASS_KEY", "RADAR_AUTOMATION_KEY",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def variables(scope):
    values = scope.get("vars")
    require(isinstance(values, dict), "Every Pages scope must explicitly define vars")
    require(all(isinstance(value, str) for value in values.values()), "Pages vars must be strings")
    require(not SECRET_KEYS.intersection(values), "Do not store credentials in Wrangler vars")
    return values


def resources(scope, production=False):
    require(RESOURCE_KEYS.issubset(scope), "Explicit D1, R2 and DO declarations are required in every scope")
    d1 = scope["d1_databases"]
    r2 = scope["r2_buckets"]
    objects = scope["durable_objects"]
    require(isinstance(d1, list) and isinstance(r2, list), "D1 and R2 declarations must be arrays")
    require(isinstance(objects, dict) and set(objects) == {"bindings"}, "Invalid DO declaration")
    bindings = objects["bindings"]
    require(isinstance(bindings, list), "DO bindings must be an array")
    seen = set()
    identifiers = set()
    for entry in d1:
        require(isinstance(entry, dict), "Invalid D1 binding")
        require(set(entry) == {"binding", "database_name", "database_id", "migrations_dir"}, "Unexpected D1 binding fields")
        name = entry["binding"]
        require(name in PRODUCTION_D1 and name not in seen, "Unexpected or repeated D1 binding")
        seen.add(name)
        prod_name, prod_id, migrations = PRODUCTION_D1[name]
        require(entry["migrations_dir"] == migrations, "D1 migration directory changed")
        if production:
            require((entry["database_name"], entry["database_id"]) == (prod_name, prod_id), "Production D1 must remain unchanged")
        else:
            require(entry["database_name"] == PREVIEW_D1[name], "Preview D1 must use its dedicated database name")
            identifier = entry["database_id"]
            require(isinstance(identifier, str), "Invalid Preview D1 identifier")
            try:
                parsed = uuid.UUID(identifier)
            except (ValueError, AttributeError):
                raise ValueError("Preview D1 requires a real database UUID") from None
            require(parsed.int != 0 and str(parsed) == identifier, "Invalid Preview D1 UUID")
            require(identifier not in {value[1] for value in PRODUCTION_D1.values()}, "Preview D1 cannot use a Production ID")
            require(identifier not in identifiers, "Preview databases must be separate")
            identifiers.add(identifier)
    require(len(r2) <= 1 and len(bindings) <= 1, "Unexpected additional R2 or DO bindings")
    if r2:
        require(r2 == [{"binding": "EVIDENCE_ARCHIVE", "bucket_name": "holybear-maple-evidence" + ("" if production else "-preview")}], "R2 must use the environment-specific bucket")
    if bindings:
        require(bindings == [{"name": "NEXON_RATE_LIMITER", "class_name": "NexonRateLimiter", "script_name": "holybear-nexon-rate-limiter" + ("" if production else "-preview")}], "DO must use the environment-specific external Worker")
    if production:
        require(seen == set(PRODUCTION_D1) and len(r2) == len(bindings) == 1, "Production resources must remain complete")
    return seen == set(PRODUCTION_D1) and len(r2) == len(bindings) == 1


def validate_config(config, purpose="default"):
    require(purpose in {"default", "pr-preview", "survey-preview"}, "Unknown deployment purpose")
    require(isinstance(config, dict), "Invalid Pages configuration")
    require(set(config) <= ENV_KEYS | {"name", "pages_build_output_dir", "compatibility_date", "env"}, "Unexpected Pages configuration or binding type; review isolation policy first")
    require(config.get("name") == "holybear-tw", "Unexpected Pages project")
    require(config.get("pages_build_output_dir") == ".vitepress/dist", "Unexpected Pages output directory")
    environments = config.get("env")
    require(isinstance(environments, dict) and set(environments) == {"preview", "production"}, "Pages must explicitly declare Preview and Production")
    defaults = variables(config)
    require(defaults.get("PAGES_DEPLOYMENT_ENV") == "preview", "Default environment must fail closed as Preview")
    require(defaults.get("PREVIEW_FUNCTIONS_ENABLED") == "false", "Default API access must remain disabled")
    require(defaults.get("PREVIEW_RESOURCE_SCOPE") == "unconfigured", "Default resource scope must remain unconfigured")
    resources(config)
    require(config["d1_databases"] == config["r2_buckets"] == [] and config["durable_objects"]["bindings"] == [], "Default scope must never bind remote resources")

    for name, scope in environments.items():
        require(isinstance(scope, dict) and set(scope) == ENV_KEYS, "Every Pages environment must explicitly define only reviewed vars and bindings")
        values = variables(scope)
        if name == "preview" and purpose == "survey-preview":
            require(values.get("PAGES_DEPLOYMENT_ENV") == "survey-preview", "Survey Preview marker mismatch")
            require(values.get("PREVIEW_FUNCTIONS_ENABLED") == "true", "Survey Preview API must be enabled")
            require(values.get("PREVIEW_RESOURCE_SCOPE") == "survey-only", "Survey Preview must be survey-only")
            require(scope["d1_databases"] == [SURVEY_PREVIEW_D1], "Survey Preview must use only the existing isolated survey D1 UUID")
            require(scope["r2_buckets"] == [] and scope["durable_objects"] == {"bindings": []}, "Survey Preview cannot bind R2 or DO")
            continue
        require(values.get("PAGES_DEPLOYMENT_ENV") == name, "Pages environment marker mismatch")
        complete = resources(scope, production=name == "production")
        if name == "preview":
            if purpose == "pr-preview":
                require(scope["d1_databases"] == scope["r2_buckets"] == [] and scope["durable_objects"]["bindings"] == [], "PR Preview must not bind any data resources")
                require(values.get("PREVIEW_FUNCTIONS_ENABLED") == "false" and values.get("PREVIEW_RESOURCE_SCOPE") == "unconfigured", "PR Preview APIs must stay disabled")
            require(values.get("PREVIEW_FUNCTIONS_ENABLED") in {"true", "false"}, "Invalid Preview API enable flag")
            require(values.get("PREVIEW_RESOURCE_SCOPE") in {"isolated", "unconfigured"}, "Invalid Preview resource scope")
            if values["PREVIEW_FUNCTIONS_ENABLED"] == "true":
                require(values["PREVIEW_RESOURCE_SCOPE"] == "isolated" and complete, "Enabled Preview requires all isolated bindings")
                require(values.get("NEXON_RATE_LIMITER_REQUIRED") == "true", "Preview must require the isolated rate limiter")
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("config", nargs="?", default="wrangler.toml")
    parser.add_argument("--stdin", action="store_true", help="Validate candidate TOML, without executing its code")
    purpose = parser.add_mutually_exclusive_group()
    purpose.add_argument("--pr-preview", action="store_true", help="Require a build-only PR with no data bindings")
    purpose.add_argument("--survey-preview", action="store_true", help="Require the existing isolated survey-only D1 profile")
    args = parser.parse_args()
    try:
        raw = sys.stdin.buffer.read(65537) if args.stdin else Path(args.config).read_bytes()
        require(len(raw) <= 65536, "Pages configuration exceeds the review limit")
        config = tomllib.loads(raw.decode("utf-8"))
        validate_config(config, "survey-preview" if args.survey_preview else "pr-preview" if args.pr_preview else "default")
    except (OSError, ValueError, TypeError) as error:
        # Never echo candidate TOML, variables or credentials in CI logs.
        if isinstance(error, tomllib.TOMLDecodeError):
            print("Pages isolation validation failed: invalid TOML", file=sys.stderr)
        elif isinstance(error, UnicodeDecodeError):
            print("Pages isolation validation failed: invalid UTF-8", file=sys.stderr)
        elif isinstance(error, ValueError):
            print(f"Pages isolation validation failed: {error}", file=sys.stderr)
        else:
            print("Pages isolation validation failed: invalid configuration", file=sys.stderr)
        return 1
    print("Pages isolation configuration validated; actual resource identities and Secrets still require Dashboard verification.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
