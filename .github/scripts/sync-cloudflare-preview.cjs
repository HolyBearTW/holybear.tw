// Only move reserved preview refs. PR code is built by Cloudflare, never here.
module.exports = async function syncCloudflarePreview({ github, context, core, previewEnabled = true, isolationBaseSha, validatePreviewConfig }) {
  const number = Number(
    context.payload.pull_request?.number ?? context.payload.inputs?.pull_request_number
  );
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new Error('必須指定有效的 PR 編號。');
  }

  const repository = context.repo;
  const fullName = `${repository.owner}/${repository.repo}`;
  const ref = `heads/cloudflare-preview/pr-${number}`;
  const getPull = async () => (await github.rest.pulls.get({
    ...repository,
    pull_number: number
  })).data;
  const getPreviewRef = async () => {
    try {
      return (await github.rest.git.getRef({ ...repository, ref })).data;
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  };
  const finish = async (state, message, sha) => {
    core.info(message);
    core.setOutput('preview_state', state);
    if (sha) core.setOutput('preview_sha', sha);
    await core.summary
      .addHeading(`Cloudflare PR #${number}: ${state}`)
      .addRaw(`${message}\n\n`)
      .addRaw('此工作只回報觸發狀態；not-run、unchanged、submitted 都不是部署 Success。\n')
      .addRaw('建置／部署成敗以同一 Commit 的官方 Cloudflare Pages Check 與 Deployment Status 為準，不能以 Preview 網址的 301 判定。\n')
      .write();
    return { state, ...(sha ? { sha } : {}) };
  };
  const pull = await getPull();

  if (pull.base.repo.full_name !== fullName || pull.base.ref !== 'main') {
    throw new Error('只允許為這個儲存庫的 main PR 發布預覽。');
  }

  if (pull.state === 'closed') {
    if (await getPreviewRef()) {
      await github.rest.git.deleteRef({ ...repository, ref });
      core.info(`已移除 PR #${number} 的預覽分支。`);
    }
    return finish('closed', 'PR 已關閉；沒有提交新的部署。');
  }

  if (context.payload.action === 'closed') {
    return finish('not-run', 'PR 已重新開啟，略過過期的關閉事件。');
  }

  // Safe same-repository PRs publish automatically. An explicit false can pause
  // dispatch; closing a PR must still remove only its reserved mirror ref.
  if (previewEnabled !== true) {
    return finish('not-run', 'CLOUDFLARE_PREVIEW_ENABLED 明確停用或設定無效；本次 Preview 未執行。');
  }

  // Match the existing Pages integration: fork PRs do not receive previews.
  if (pull.head.repo?.full_name !== fullName) {
    return finish('not-run', 'Fork PR 維持原有行為，不自動發布 Cloudflare 預覽。');
  }

  const sha = pull.head.sha;
  const eventSha = context.payload.pull_request?.head.sha;
  if (eventSha && eventSha !== sha) {
    return finish('not-run', 'PR 已有更新的 Commit，略過這次過期的事件。');
  }
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('PR Commit SHA 無效。');

  // Mirroring the exact PR SHA must not rebuild an old PR that predates the
  // isolation fix. Resolve the real introducing commit from trusted main history.
  if (typeof isolationBaseSha !== 'string' || !/^[a-f0-9]{40}$/.test(isolationBaseSha)) {
    return finish('not-run', '受信任分支尚無有效的隔離修補 Commit，Preview 未執行。');
  }
  const comparison = (await github.rest.repos.compareCommitsWithBasehead({
    ...repository,
    basehead: `${isolationBaseSha}...${sha}`
  })).data;
  if (!['ahead', 'identical'].includes(comparison.status)) {
    return finish('not-run', 'PR 尚未包含已核准的 Preview 隔離基準，請先合併或 rebase 後再發布。');
  }

  // Only parse PR configuration as data. Never checkout or execute PR scripts.
  if (typeof validatePreviewConfig !== 'function') {
    return finish('not-run', '缺少受信任的 Preview 設定驗證器，拒絕發布。');
  }
  const config = (await github.rest.repos.getContent({
    ...repository,
    path: 'wrangler.toml',
    ref: sha
  })).data;
  const maxConfigBytes = 64 * 1024;
  if (config?.type !== 'file' || config.path !== 'wrangler.toml' || config.encoding !== 'base64'
    || !Number.isSafeInteger(config.size) || config.size < 1 || config.size > maxConfigBytes
    || typeof config.content !== 'string' || config.content.length > 100 * 1024) {
    return finish('not-run', 'PR 的 Wrangler 設定格式或大小無效，拒絕發布。');
  }
  const encoded = config.content.replace(/\r?\n/g, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    return finish('not-run', 'PR 的 Wrangler 設定編碼無效，拒絕發布。');
  }
  const decoded = Buffer.from(encoded, 'base64');
  const content = decoded.toString('utf8');
  if (decoded.length !== config.size || !Buffer.from(content, 'utf8').equals(decoded)) {
    return finish('not-run', 'PR 的 Wrangler 設定不是有效的 UTF-8 檔案，拒絕發布。');
  }
  try {
    if (await validatePreviewConfig(content) !== true) {
      return finish('not-run', 'PR 的 Preview 資源隔離設定未通過驗證，拒絕發布。');
    }
  } catch {
    // Do not print untrusted config or validator output into Actions logs.
    return finish('not-run', 'PR 的 Preview 資源隔離驗證失敗，拒絕發布。');
  }

  const existing = await getPreviewRef();
  if (existing?.object.sha === sha) {
    return finish('unchanged', `PR #${number} 的 ${sha} 已交給 Cloudflare；未送出重複建置，須查看既有部署結果。`, sha);
  }

  // Recheck after reading the destination so a late event cannot publish old code.
  const latest = await getPull();
  if (latest.state !== 'open' || latest.head.sha !== sha) {
    return finish('not-run', 'PR 狀態或 Commit 已更新，由最新的執行處理。');
  }

  if (existing) {
    // Force updates are confined to this workflow's disposable per-PR mirror.
    await github.rest.git.updateRef({ ...repository, ref, sha, force: true });
  } else {
    await github.rest.git.createRef({ ...repository, ref: `refs/${ref}`, sha });
  }
  return finish('submitted', `已將 PR #${number} 的最新 Commit ${sha} 交給 Cloudflare；建置結果尚待官方 Check 回報。`, sha);
};

// Called only after checking out the trusted default branch with full history.
// No repository variable or PR-supplied SHA can weaken the ancestry baseline.
module.exports.resolveIsolationBaseSha = function resolveIsolationBaseSha(execFileSync) {
  const sha = execFileSync('git', [
    'log', '-1', '--format=%H', '--diff-filter=A', '--', 'functions/_shared/preview-isolation.ts'
  ], { encoding: 'utf8', timeout: 10000 }).trim();
  if (!/^[a-f0-9]{40}$/.test(sha)) return undefined;
  execFileSync('git', ['merge-base', '--is-ancestor', sha, 'HEAD'], { timeout: 10000 });
  return sha;
};
