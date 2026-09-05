#!/usr/bin/env bash
set -euo pipefail

readonly HISTORY_SENTINEL_COMMIT="5418d386d77f6e80e4cbd28af956e5849c2103bc"
readonly HISTORY_SENTINEL_FILE="blog/2025-07-18.md"
readonly HISTORY_SENTINEL_DATE="2025-07-18T21:53:14+08:00"

echo "確認 Cloudflare checkout 與完整 Git 歷史..."

if [ "$(git rev-parse --is-shallow-repository)" = "true" ]; then
  git fetch --unshallow --tags origin
else
  git fetch --tags --prune origin
fi

if [ "$(git rev-parse --is-shallow-repository)" != "false" ]; then
  echo "Git 歷史仍是 shallow repository，為避免 Blog 日期錯誤而停止建置。" >&2
  exit 1
fi

if ! git cat-file -e "${HISTORY_SENTINEL_COMMIT}^{commit}" 2>/dev/null; then
  echo "找不到歷史基準 Commit：${HISTORY_SENTINEL_COMMIT}" >&2
  exit 1
fi

if ! git merge-base --is-ancestor "$HISTORY_SENTINEL_COMMIT" HEAD; then
  echo "目前部署 Commit 不包含既有 Blog 歷史，停止建置。" >&2
  exit 1
fi

sentinel_date="$(
  git log --diff-filter=A --follow --format=%aI -- "$HISTORY_SENTINEL_FILE" \
    | tail -n 1
)"

if [ "$sentinel_date" != "$HISTORY_SENTINEL_DATE" ]; then
  echo "Blog 歷史日期驗證失敗。" >&2
  echo "預期：${HISTORY_SENTINEL_DATE}" >&2
  echo "實際：${sentinel_date:-無法取得}" >&2
  exit 1
fi

git_sha="$(git rev-parse HEAD)"
if [ -n "${CF_PAGES_COMMIT_SHA:-}" ] && [ "$CF_PAGES_COMMIT_SHA" != "$git_sha" ]; then
  echo "Cloudflare Commit SHA 與 checkout HEAD 不一致。" >&2
  echo "Cloudflare：${CF_PAGES_COMMIT_SHA}" >&2
  echo "Git HEAD：${git_sha}" >&2
  exit 1
fi

echo "清除上一版輸出，保留可復用的 Vite / VitePress 快取..."
rm -rf .vitepress/dist

echo "安裝鎖定版本的專案套件..."
yarn install --frozen-lockfile --non-interactive --prefer-offline

echo "安裝部署用 Sharp（不修改 package.json / yarn.lock）..."
yarn add \
  --dev \
  --ignore-scripts \
  --pure-lockfile \
  --non-interactive \
  --prefer-offline \
  sharp@0.35.3

echo "最佳化部署圖片..."
yarn run optimize:deploy-images

echo "建置 VitePress..."
yarn run build

echo "建立不可快取的部署版本標記..."
DEPLOY_GIT_SHA="$git_sha" node --input-type=module <<'NODE'
import fs from 'node:fs'

const metadata = {
  commit: process.env.DEPLOY_GIT_SHA ?? '',
  branch: process.env.CF_PAGES_BRANCH ?? '',
  builtAt: new Date().toISOString()
}

const serializedMetadata = `${JSON.stringify(metadata)}\n`

fs.mkdirSync('.vitepress/dist/api', { recursive: true })
fs.writeFileSync('.vitepress/dist/__deploy.json', serializedMetadata)
fs.writeFileSync('.vitepress/dist/api/__deploy.json', serializedMetadata)

fs.appendFileSync(
  '.vitepress/dist/_headers',
  '\n/__deploy.json\n  Cache-Control: no-store\n\n/api/__deploy.json\n  Cache-Control: no-store\n'
)
NODE

echo "Cloudflare Pages 建置完成：${git_sha}"
