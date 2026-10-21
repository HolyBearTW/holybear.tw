# Cloudflare Pages 部署

正式環境仍由 `deploy-vitepress.yml` 將原始碼發布到 `cloudflare-production`。
連續推送至 `main` 時，先等待 60 秒；新的執行會取消前一次執行，只發布最新 Commit。
已經交給 Cloudflare 的建置仍會繼續，等待期間的中間版本不會送出建置。

PR 使用 `cloudflare-preview.yml`，依 PR 編號分組並等待 60 秒。
等待期間的新 Commit 會取消前一次執行，再由最新執行重新等待。
確認 PR 仍開啟且 Commit 未過期後，將同一筆 SHA 寫入 `cloudflare-preview/pr-<編號>`，
由 Cloudflare 原有 Git 整合建置。重複事件不會再次更新相同 SHA。
不同 PR 各自處理；關閉 PR 時移除專用分支。Fork PR 維持原本不自動預覽的行為。

`pull_request_target` 僅執行預設分支的部署腳本，不 checkout 或執行 PR 程式碼。
不需要新增 Cloudflare API Token 到 GitHub。GitHub 執行成功代表已送出建置，
實際成敗仍由該 Commit 的 Cloudflare Pages 檢查回報。

## Cloudflare 專案設定

啟用工作流程時，`holybear-tw` 的 Git 設定必須為：

- Production branch：`cloudflare-production`，保留自動部署。
- Preview deployments：`custom`。
- Include preview branches：`cloudflare-preview/pr-*`。
- Exclude preview branches：`main`。

先將工作流程放到 `main`，再調整 Preview Include 規則；兩者必須搭配使用。
可手動執行 PR 工作流程並輸入 PR 編號，為既有 PR 發布預覽。

`wrangler.toml` 的共用 `[vars]` 與 `[env.production.vars]` 均設定 Node 24、
Yarn 1.22.22 及 `SKIP_DEPENDENCY_INSTALL=1`，讓預覽和正式環境使用同一套建置工具。
舊 PR 尚未包含這些設定時，需要先合併含修正的 `main`；
只調整 Cloudflare 後台變數會被舊版 Wrangler 設定覆蓋。
完整 Git 歷史與文章日期檢查仍由 `scripts/cloudflare-build.sh` 執行。
