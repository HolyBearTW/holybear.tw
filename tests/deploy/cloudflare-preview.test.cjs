const test = require('node:test');
const assert = require('node:assert/strict');
const syncPreview = require('../../.github/scripts/sync-cloudflare-preview.cjs');

const latestSha = 'b'.repeat(40);
const oldSha = 'a'.repeat(40);
const isolationBaseSha = 'c'.repeat(40);

function fixture(options = {}) {
  const configContent = 'name = "holybear-tw"\n';
  const pull = {
    number: 576,
    state: 'open',
    base: { ref: 'main', repo: { full_name: 'HolyBearTW/holybear.tw' } },
    head: { sha: latestSha, repo: { full_name: 'HolyBearTW/holybear.tw' } }
  };
  const writes = [];
  const outputs = {};
  const summaryText = [];
  const notFound = () => { throw Object.assign(new Error('Not found'), { status: 404 }); };
  let reads = 0;
  const context = {
    repo: { owner: 'HolyBearTW', repo: 'holybear.tw' },
    payload: { action: 'synchronize', pull_request: { number: 576, head: { sha: latestSha } } }
  };
  const summary = {
    addHeading() { return this; },
    addRaw(value) { summaryText.push(value); return this; },
    async write() {}
  };
  return {
    pull, writes, context, outputs, summaryText,
    args: {
      context,
      previewEnabled: true,
      isolationBaseSha,
      validatePreviewConfig: (content) => {
        assert.equal(content, configContent);
        if (options.validatorError) throw new Error('Private validator detail');
        return options.configAccepted ?? true;
      },
      core: { info() {}, notice() {}, setOutput(name, value) { outputs[name] = value; }, summary },
      github: { rest: {
        repos: {
          compareCommitsWithBasehead: async (input) => {
            assert.equal(input.basehead, `${isolationBaseSha}...${pull.head.sha}`);
            if (options.compareError) throw new Error('Comparison unavailable');
            return { data: { status: options.comparisonStatus ?? 'ahead' } };
          },
          getContent: async (input) => {
            assert.equal(input.path, 'wrangler.toml');
            assert.equal(input.ref, pull.head.sha);
            if (options.configReadError) throw new Error('Config unavailable');
            return { data: {
              type: 'file', path: 'wrangler.toml', encoding: 'base64',
              size: Buffer.byteLength(configContent),
              content: Buffer.from(configContent).toString('base64'),
              ...options.configResponse
            } };
          }
        },
        pulls: { get: async () => {
          reads++;
          if (reads > 1 && options.onRecheck) options.onRecheck(pull);
          return { data: structuredClone(pull) };
        } },
        git: {
          getRef: async () => options.existingSha
            ? { data: { object: { sha: options.existingSha } } }
            : notFound(),
          createRef: async (input) => writes.push({ operation: 'create', ...input }),
          updateRef: async (input) => writes.push({ operation: 'update', ...input }),
          deleteRef: async (input) => {
            if (options.deleteMissing) notFound();
            writes.push({ operation: 'delete', ...input });
          }
        }
      } }
    }
  };
}

test('publishes only the current PR head to its reserved preview ref', async () => {
  const f = fixture();
  await syncPreview(f.args);
  assert.deepEqual(f.writes, [{ operation: 'create', owner: 'HolyBearTW', repo: 'holybear.tw',
    ref: 'refs/heads/cloudflare-preview/pr-576', sha: latestSha }]);
});

test('safe PR publishing is automatic when the optional switch is absent', async () => {
  const f = fixture();
  delete f.args.previewEnabled;
  const result = await syncPreview(f.args);
  assert.equal(result.state, 'submitted');
  assert.equal(f.writes[0].sha, latestSha);
});

test('the explicit pause cannot create or advance an existing preview ref', async () => {
  for (const existingSha of [undefined, oldSha]) {
    const f = fixture({ existingSha });
    f.args.previewEnabled = false;
    await syncPreview(f.args);
    assert.deepEqual(f.writes, []);
  }
});

test('a manual dispatch also respects an explicit pause', async () => {
  const f = fixture();
  f.args.previewEnabled = false;
  f.context.payload = { inputs: { pull_request_number: '576' } };
  await syncPreview(f.args);
  assert.deepEqual(f.writes, []);
});

test('only a boolean true enables publishing', async () => {
  const f = fixture();
  f.args.previewEnabled = 'true';
  await syncPreview(f.args);
  assert.deepEqual(f.writes, []);
});

test('closing a PR still cleans up its mirror while publishing is paused', async () => {
  const f = fixture({ existingSha: latestSha });
  f.args.previewEnabled = false;
  delete f.args.isolationBaseSha;
  f.pull.state = 'closed';
  f.context.payload.action = 'closed';
  await syncPreview(f.args);
  assert.deepEqual(f.writes, [{ operation: 'delete', owner: 'HolyBearTW', repo: 'holybear.tw',
    ref: 'heads/cloudflare-preview/pr-576' }]);
});

test('an absent or malformed isolation baseline cannot publish a preview', async () => {
  for (const baseline of [undefined, '', 'main', '../main', 'c'.repeat(39)]) {
    const f = fixture();
    f.args.isolationBaseSha = baseline;
    await syncPreview(f.args);
    assert.deepEqual(f.writes, []);
  }
});

test('PRs behind or diverged from the isolation fix cannot update a preview ref', async () => {
  for (const comparisonStatus of ['behind', 'diverged', 'unknown']) {
    const f = fixture({ existingSha: oldSha, comparisonStatus });
    await syncPreview(f.args);
    assert.deepEqual(f.writes, []);
  }
});

test('the approved isolation baseline itself may be published', async () => {
  const f = fixture({ comparisonStatus: 'identical' });
  f.pull.head.sha = isolationBaseSha;
  f.context.payload.pull_request.head.sha = isolationBaseSha;
  await syncPreview(f.args);
  assert.equal(f.writes[0].sha, isolationBaseSha);
});

test('a failed baseline comparison cannot publish a preview', async () => {
  const f = fixture({ compareError: true });
  await assert.rejects(syncPreview(f.args), /Comparison unavailable/);
  assert.deepEqual(f.writes, []);
});

test('publishing requires a trusted validator even after the ancestry gate passes', async () => {
  const f = fixture();
  delete f.args.validatePreviewConfig;
  await syncPreview(f.args);
  assert.deepEqual(f.writes, []);
});

test('a rejected or failing config validator cannot change preview refs', async () => {
  for (const options of [{ configAccepted: false }, { validatorError: true }]) {
    const f = fixture({ existingSha: oldSha, ...options });
    await syncPreview(f.args);
    assert.deepEqual(f.writes, []);
  }
});

test('invalid configuration download responses fail closed', async () => {
  for (const configResponse of [
    { type: 'dir' }, { path: 'another.toml' }, { encoding: 'none' },
    { size: 65537 }, { content: '!not-base64!' }, { size: 1 },
    { size: 1, content: '/w==' },
  ]) {
    const f = fixture({ configResponse });
    await syncPreview(f.args);
    assert.deepEqual(f.writes, []);
  }
});

test('a failed config download cannot publish a preview', async () => {
  const f = fixture({ configReadError: true });
  await assert.rejects(syncPreview(f.args), /Config unavailable/);
  assert.deepEqual(f.writes, []);
});

test('an older event cannot publish after newer commits arrive', async () => {
  const f = fixture();
  f.context.payload.pull_request.head.sha = oldSha;
  await syncPreview(f.args);
  assert.deepEqual(f.writes, []);
});

test('an out-of-order event cannot roll the mirror back', async () => {
  const f = fixture({ existingSha: latestSha });
  f.context.payload.pull_request.head.sha = oldSha;
  await syncPreview(f.args);
  assert.deepEqual(f.writes, []);
});

test('repeated events for the same commit do not trigger another deployment', async () => {
  const f = fixture({ existingSha: latestSha });
  await syncPreview(f.args);
  assert.deepEqual(f.writes, []);
});

test('new commits replace only the disposable PR mirror', async () => {
  const f = fixture({ existingSha: oldSha });
  await syncPreview(f.args);
  assert.deepEqual(f.writes, [{ operation: 'update', owner: 'HolyBearTW', repo: 'holybear.tw',
    ref: 'heads/cloudflare-preview/pr-576', sha: latestSha, force: true }]);
});

test('a commit arriving immediately before publication prevents a stale update', async () => {
  const f = fixture({ onRecheck: (pull) => { pull.head.sha = 'c'.repeat(40); } });
  await syncPreview(f.args);
  assert.deepEqual(f.writes, []);
});

test('closing a PR during preparation prevents publication', async () => {
  const f = fixture({ onRecheck: (pull) => { pull.state = 'closed'; } });
  await syncPreview(f.args);
  assert.deepEqual(f.writes, []);
});

test('closed PRs remove only their preview ref', async () => {
  const f = fixture({ existingSha: latestSha });
  f.pull.state = 'closed';
  await syncPreview(f.args);
  assert.deepEqual(f.writes, [{ operation: 'delete', owner: 'HolyBearTW', repo: 'holybear.tw',
    ref: 'heads/cloudflare-preview/pr-576' }]);
});

test('closing a PR without a preview is harmless', async () => {
  const f = fixture({ deleteMissing: true });
  f.pull.state = 'closed';
  await syncPreview(f.args);
  assert.deepEqual(f.writes, []);
});

test('a stale close event cannot delete a reopened preview', async () => {
  const f = fixture();
  f.context.payload.action = 'closed';
  await syncPreview(f.args);
  assert.deepEqual(f.writes, []);
});

test('fork PRs retain the existing no-preview behavior', async () => {
  const f = fixture();
  f.pull.head.repo.full_name = 'contributor/holybear.tw';
  await syncPreview(f.args);
  assert.deepEqual(f.writes, []);
});

test('manual dispatch can prepare an existing PR without a new commit', async () => {
  const f = fixture();
  f.context.payload = { inputs: { pull_request_number: '576' } };
  await syncPreview(f.args);
  assert.equal(f.writes[0].sha, latestSha);
});

test('invalid PR numbers cannot change refs', async () => {
  const f = fixture();
  f.context.payload = { inputs: { pull_request_number: '../main' } };
  await assert.rejects(syncPreview(f.args), /PR 編號/);
  assert.deepEqual(f.writes, []);
});

test('malformed commit IDs cannot change refs', async () => {
  const f = fixture();
  f.pull.head.sha = '../main';
  f.context.payload.pull_request.head.sha = '../main';
  await assert.rejects(syncPreview(f.args), /SHA 無效/);
  assert.deepEqual(f.writes, []);
});

test('PRs targeting another base cannot change refs', async () => {
  const f = fixture();
  f.pull.base.ref = 'cloudflare-production';
  await assert.rejects(syncPreview(f.args), /main PR/);
  assert.deepEqual(f.writes, []);
});


test('dispatch and refusal have explicit states and never report deployment success', async () => {
  for (const [options, enabled, expected] of [
    [{}, true, 'submitted'], [{ comparisonStatus: 'behind' }, true, 'not-run'],
    [{ configAccepted: false }, true, 'not-run'], [{}, false, 'not-run'],
    [{ existingSha: latestSha }, true, 'unchanged'],
  ]) {
    const f = fixture(options);
    f.args.previewEnabled = enabled;
    const result = await syncPreview(f.args);
    assert.equal(result.state, expected);
    assert.equal(f.outputs.preview_state, expected);
    assert.notEqual(result.state, 'success');
    assert.match(f.summaryText.join(''), /Cloudflare Pages Check.*Deployment Status/);
  }
});

test('the isolation baseline comes from trusted introduction history and is verified as an ancestor', () => {
  const calls = [];
  const sha = syncPreview.resolveIsolationBaseSha((command, args) => {
    calls.push({ command, args });
    return calls.length === 1 ? `${isolationBaseSha}\n` : '';
  });
  assert.equal(sha, isolationBaseSha);
  assert.deepEqual(calls, [
    { command: 'git', args: ['log', '-1', '--format=%H', '--diff-filter=A', '--', 'functions/_shared/preview-isolation.ts'] },
    { command: 'git', args: ['merge-base', '--is-ancestor', isolationBaseSha, 'HEAD'] },
  ]);
});

test('missing or invalid trusted history cannot invent a baseline', () => {
  for (const value of ['', 'main', 'a'.repeat(39), 'A'.repeat(40)]) {
    assert.equal(syncPreview.resolveIsolationBaseSha(() => value), undefined);
  }
  assert.throws(() => syncPreview.resolveIsolationBaseSha(() => { throw new Error('History unavailable'); }), /History unavailable/);
});

test('a non-ancestor trusted baseline fails closed', () => {
  let reads = 0;
  assert.throws(() => syncPreview.resolveIsolationBaseSha(() => {
    if (++reads === 1) return isolationBaseSha;
    throw new Error('Not an ancestor');
  }), /Not an ancestor/);
});

test('the workflow keeps PR execution away from write credentials and needs no baseline variable', () => {
  const fs = require('node:fs');
  const yaml = require('yaml');
  const workflow = yaml.parse(fs.readFileSync(require('node:path').join(__dirname, '../../.github/workflows/cloudflare-preview.yml'), 'utf8'));
  assert.deepEqual(workflow.on.pull_request_target.branches, ['main']);
  const checkout = workflow.jobs.preview.steps.find((step) => step.uses?.startsWith('actions/checkout@'));
  assert.equal(checkout.with.ref, '${{ github.event.repository.default_branch }}');
  assert.equal(checkout.with['persist-credentials'], false);
  assert.equal(checkout.with['fetch-depth'], 0);
  const dispatch = workflow.jobs.preview.steps.find((step) => step.uses?.startsWith('actions/github-script@'));
  assert.equal(dispatch.env.CLOUDFLARE_PREVIEW_ISOLATION_BASE_SHA, undefined);
  assert.match(dispatch.with.script, /isolationBaseSha: syncPreview.resolveIsolationBaseSha/);
  assert.match(dispatch.with.script, /'--stdin', '--pr-preview'/);
  assert.match(dispatch.with.script, /previewEnabled: !process.env.CLOUDFLARE_PREVIEW_ENABLED/);
  assert.doesNotMatch(dispatch.with.script, /wrangler (?:deploy|pages deploy)|curl|fetch\(/);
});
