// Only move reserved preview refs. PR code is built by Cloudflare, never here.
module.exports = async function syncCloudflarePreview({ github, context, core }) {
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
  const pull = await getPull();

  if (pull.base.repo.full_name !== fullName || pull.base.ref !== 'main') {
    throw new Error('只允許為這個儲存庫的 main PR 發布預覽。');
  }

  if (pull.state === 'closed') {
    if (await getPreviewRef()) {
      await github.rest.git.deleteRef({ ...repository, ref });
      core.info(`已移除 PR #${number} 的預覽分支。`);
    }
    return;
  }

  if (context.payload.action === 'closed') {
    core.notice('PR 已重新開啟，略過過期的關閉事件。');
    return;
  }

  // Match the existing Pages integration: fork PRs do not receive previews.
  if (pull.head.repo?.full_name !== fullName) {
    core.notice('Fork PR 維持原有行為，不自動發布 Cloudflare 預覽。');
    return;
  }

  const sha = pull.head.sha;
  const eventSha = context.payload.pull_request?.head.sha;
  if (eventSha && eventSha !== sha) {
    core.notice('PR 已有更新的 Commit，略過這次過期的事件。');
    return;
  }
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('PR Commit SHA 無效。');

  const existing = await getPreviewRef();
  if (existing?.object.sha === sha) {
    core.info(`PR #${number} 的 ${sha} 已交給 Cloudflare，略過重複發布。`);
    return;
  }

  // Recheck after reading the destination so a late event cannot publish old code.
  const latest = await getPull();
  if (latest.state !== 'open' || latest.head.sha !== sha) {
    core.notice('PR 狀態或 Commit 已更新，由最新的執行處理。');
    return;
  }

  if (existing) {
    // Force updates are confined to this workflow's disposable per-PR mirror.
    await github.rest.git.updateRef({ ...repository, ref, sha, force: true });
  } else {
    await github.rest.git.createRef({ ...repository, ref: `refs/${ref}`, sha });
  }
  core.info(`已將 PR #${number} 的最新 Commit ${sha} 交給 Cloudflare。`);
  await core.summary
    .addHeading(`Cloudflare PR #${number}`)
    .addRaw(`Commit: \`${sha}\`\n\n`)
    .addRaw('已送出建置；實際部署結果請查看這筆 Commit 的 Cloudflare Pages 檢查。\n')
    .write();
};
