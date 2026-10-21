const test = require('node:test');
const assert = require('node:assert/strict');
const syncPreview = require('../../.github/scripts/sync-cloudflare-preview.cjs');

const latestSha = 'b'.repeat(40);
const oldSha = 'a'.repeat(40);

function fixture(options = {}) {
  const pull = {
    number: 576,
    state: 'open',
    base: { ref: 'main', repo: { full_name: 'HolyBearTW/holybear.tw' } },
    head: { sha: latestSha, repo: { full_name: 'HolyBearTW/holybear.tw' } }
  };
  const writes = [];
  const notFound = () => { throw Object.assign(new Error('Not found'), { status: 404 }); };
  let reads = 0;
  const context = {
    repo: { owner: 'HolyBearTW', repo: 'holybear.tw' },
    payload: { action: 'synchronize', pull_request: { number: 576, head: { sha: latestSha } } }
  };
  const summary = {
    addHeading() { return this; },
    addRaw() { return this; },
    async write() {}
  };
  return {
    pull, writes, context,
    args: {
      context,
      core: { info() {}, notice() {}, summary },
      github: { rest: {
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
