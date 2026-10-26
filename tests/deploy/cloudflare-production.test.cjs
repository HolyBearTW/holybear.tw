const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { dirname, join, resolve } = require('node:path');

const workflow = readFileSync(resolve(__dirname, '../../.github/workflows/deploy-vitepress.yml'), 'utf8');
const releaseScript = workflow.match(
  /        id: cloudflare-release[\s\S]*?        run: \|\r?\n([\s\S]*?)(?=\r?\n      - name:)/
)[1].replace(/^          /gm, '').replace(/\r\n/g, '\n');
const bash = process.platform === 'win32'
  ? resolve(execFileSync('git', ['--exec-path'], { encoding: 'utf8' }).trim(), '../../../bin/bash.exe')
  : 'bash';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'cloudflare-production-'));
  t.after(() => {
    assert.equal(dirname(root), resolve(tmpdir()));
    rmSync(root, { recursive: true, force: true });
  });
  const origin = join(root, 'origin.git');
  const work = join(root, 'work');
  const output = join(root, 'output');
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'Deployment Test',
    GIT_AUTHOR_EMAIL: 'deployment@example.invalid',
    GIT_COMMITTER_NAME: 'Deployment Test',
    GIT_COMMITTER_EMAIL: 'deployment@example.invalid',
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'commit.gpgsign',
    GIT_CONFIG_VALUE_0: 'false',
    GITHUB_OUTPUT: output
  };
  const git = (...args) => execFileSync('git', args, { cwd: work, env, encoding: 'utf8', stdio: 'pipe' }).trim();
  execFileSync('git', ['init', '--bare', origin], { env, stdio: 'pipe' });
  execFileSync('git', ['clone', origin, work], { env, stdio: 'pipe' });
  git('checkout', '-b', 'main');
  const commit = (text) => {
    writeFileSync(join(work, 'content.txt'), text);
    git('add', 'content.txt');
    git('commit', '-m', text);
    return git('rev-parse', 'HEAD');
  };
  const base = commit('base');
  git('push', 'origin', 'main:main', 'main:cloudflare-production');
  const release = () => git('ls-remote', '--heads', 'origin', 'refs/heads/cloudflare-production').split(/\s+/)[0];
  const run = (extraEnv = {}) => spawnSync(bash, ['--noprofile', '--norc', '-c', `
git() {
  if [ "\${1:-}" = push ] && [ -n "\${TEST_RACE_SHA:-}" ]; then
    command git --git-dir="$TEST_ORIGIN" update-ref refs/heads/cloudflare-production "$TEST_RACE_SHA"
  fi
  command git "$@"
}
${releaseScript}`], { cwd: work, env: { ...env, TEST_ORIGIN: origin, ...extraEnv }, encoding: 'utf8' });
  return { git, commit, base, release, run, work, output };
}

test('publishes a normal main update and reports the exact SHA', (t) => {
  const f = fixture(t);
  const latest = f.commit('latest');
  f.git('push', 'origin', 'main');
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.release(), latest);
  assert.equal(readFileSync(f.output, 'utf8').trim(), `sha=${latest}`);
});

test('recovers production after main history is rewritten', (t) => {
  const f = fixture(t);
  const old = f.commit('original');
  f.git('push', 'origin', 'main', 'main:cloudflare-production');
  f.git('checkout', '--detach', f.base);
  const latest = f.commit('rewritten');
  f.git('push', `--force-with-lease=refs/heads/main:${old}`, 'origin', `${latest}:main`);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.release(), latest);
});

test('rejects a stale checkout without moving production', (t) => {
  const f = fixture(t);
  f.commit('newer main');
  f.git('push', 'origin', 'main');
  f.git('checkout', '--detach', f.base);
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /HEAD 已不是遠端 main/);
  assert.equal(f.release(), f.base);
});

test('does not overwrite a production update made after the remote SHA check', (t) => {
  const f = fixture(t);
  const latest = f.commit('latest');
  f.git('push', 'origin', 'main');
  const concurrent = f.commit('concurrent production');
  f.git('push', 'origin', `${concurrent}:refs/heads/test-race`);
  f.git('checkout', '--detach', latest);
  const result = f.run({ TEST_RACE_SHA: concurrent });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /stale info/);
  assert.equal(f.release(), concurrent);
});

test('creates a missing production branch', (t) => {
  const f = fixture(t);
  f.git('push', 'origin', ':refs/heads/cloudflare-production');
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.release(), f.base);
});

test('does not push again when production already matches main', (t) => {
  const f = fixture(t);
  const concurrent = f.commit('would only appear if a push happened');
  f.git('push', 'origin', `${concurrent}:refs/heads/test-race`);
  f.git('checkout', '--detach', f.base);
  const result = f.run({ TEST_RACE_SHA: concurrent });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /無需重複發布/);
  assert.equal(f.release(), f.base);
});

test('refuses an uncommitted checkout', (t) => {
  const f = fixture(t);
  writeFileSync(join(f.work, 'content.txt'), 'uncommitted');
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /尚未 Commit/);
  assert.equal(f.release(), f.base);
});
