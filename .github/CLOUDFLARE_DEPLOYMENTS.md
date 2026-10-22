# Cloudflare Pages 部署與環境用途

## Production

既有流程保持 `main` → `deploy-vitepress.yml` → `cloudflare-production` → Cloudflare Pages。
連續推送先等待 60 秒，只發布最新 Commit；正式分支只允許向前推進。
本次不變更 Production 的兩個 D1、R2、外部 Durable Object Worker、Secret 或 Access。
`env.production` 的 `PAGES_DEPLOYMENT_ENV=production` 保留完整網站與既有 API 行為。

建置指定 Node.js **24.22.1**、Yarn **1.22.22**，使用鎖定的 `yarn.lock`。
`.node-version` 與 Wrangler vars 一致；`scripts/cloudflare-build.sh` 在套件安裝前檢查
實際 Node，日誌必須出現 `Build Node.js: 24.22.1`。Dashboard 覆寫若選到未修補版本，
建置會失敗，不能繞過檢查。完整 Git 歷史、文章日期、部署 SHA 驗證仍保留。
Functions 執行於 Cloudflare Workers Runtime；建置 Node 版本不是 Functions 的伺服器版本。

## 一般 PR Preview：只驗證建置與部署

PR Preview 不供瀏覽或測試動態功能。預設及 `env.preview` 均不綁 D1、R2 或 DO，
`PREVIEW_FUNCTIONS_ENABLED=false`、`PREVIEW_RESOURCE_SCOPE=unconfigured`。
API middleware 在任何 handler 或資料操作前回覆 503；這不妨礙靜態建置或部署成功。
不需要新增測試資料庫、bucket、DO Worker 或 Secret。

保留既有啟用的 Bulk Redirect：

- 來源 `https://holybear-tw.pages.dev/`，目標 `https://holybear.tw`，狀態 301。
- 包含子網域、子路徑符合、保留路徑尾碼、保留查詢字串。
- 規則排除 `survey-preview.holybear-tw.pages.dev`，保留其原有 Access。

不移除規則、不替一般 PR 新增轉址例外，也不以 301 當作建置失敗。
靜態 `_headers`、前端 Firebase 計數來源限制及既有 XSS／CSV／相依修補均保留。

### PR 自動觸發與隔離門檻

`cloudflare-preview.yml` 仍處理 main 的同儲存庫 PR；fork 維持原有不自動部署行為。
受信任的 `pull_request_target` 只遷出預設分支，不執行 PR 程式碼、不讀出或新增
Cloudflare API Token。通過驗證後才 mirror 同一 PR SHA 到 `cloudflare-preview/pr-<編號>`。
既有 Pages branch control 保持 `custom`、include `cloudflare-preview/pr-*`、exclude `main`。
關閉 PR 只清理其 mirror ref，不刪歷史 atomic deployment，也不觸碰問卷 alias。

`CLOUDFLARE_PREVIEW_ENABLED` 未設定或為 `true` 時自動處理安全 PR；明確 `false`
才暫停送出，其他非空無效值會拒絕送出。無需設定此變數來恢復原有自動 PR 流程。
不再依賴 `CLOUDFLARE_PREVIEW_ISOLATION_BASE_SHA`：從受信任預設分支的完整歷史，
找出首次加入 `functions/_shared/preview-isolation.ts` 的實際 Commit，再確認它是
受信任 HEAD 的祖先。不存在基準或 PR 未包含它時不發布，舊 PR 需先合併最新 main。
因此不會因變數未設定而永久停用，也不會自動重建修補前的舊 PR。

祖先檢查後，PR 的 `wrangler.toml` 僅當資料下載，交給受信任的
`python3 scripts/check-pages-isolation.py --stdin --pr-preview` 驗證。
此模式要求一般 PR 的 default／Preview **零資料綁定且 API 關閉**，也拒絕問卷專用
設定；不能把隔離資源或正式 ID 偷渡回一般 PR。下載、解析或比較失敗一律不推進 ref。
runner 的 Python 3.11+ 僅用標準函式庫解析 TOML，不執行候選 PR 的檔案。

首次安全修補 PR 在合併前仍使用 GitHub 上既有的受信任 workflow；此 PR 的實際
Wrangler 已無 Preview 正式綁定。新祖先門檻須待修補合併進 main 後才生效，不能將
未提交的本機變更誤報為 GitHub 已生效。不要手動重送修補前的舊 PR SHA。

### 正確解讀 ✓／✕／未執行

唯一建置／部署判準是**相同 PR Commit** 的官方 `Cloudflare Pages` Check
（app `cloudflare-workers-and-pages`）與對應 Cloudflare Deployment Status：

| 實際證據 | 判定 |
| --- | --- |
| Cloudflare build／deploy 成功，Check success | ✓ Success |
| Cloudflare build／deploy 失敗，Check failure | ✕ Failure |
| queued／active | 等待中 |
| skipped／canceled／不存在本次部署 | 未完成建置驗證，不能算 Success |

GitHub Actions 的「提交 PR Preview」綠勾只表示觸發腳本完成。
腳本另外輸出 `preview_state`：`submitted`（已送出）、`not-run`（未送出）、
`unchanged`（同 SHA 已送過，須查看既有結果）、`closed`（關閉清理）。
這些值都不是部署成功；GitHub 對 skipped job 的綠勾也不能代替 Cloudflare Check。
Preview URL 回傳 301 是預期設計，不執行網址 200 或角色 API 的驗收。

## survey-preview：既有問卷獨立環境

保留現有部署、`survey-preview` 的 301 轉址例外、Cloudflare Access 及已存在的 D1：
`holybear-survey-db-preview`，UUID `5e28ff94-daa3-402c-836e-5d7f8f861cbf`。
它不是一般 PR 建置驗證環境，不新增任何雲端資源，也不借用正式問卷 D1。
Production／一般 PR 新部署不會回溯改寫既有問卷 atomic deployment 的 Functions 或綁定。

**未來重新部署問卷時不可直接使用 main 的一般 PR Wrangler 設定**，否則零綁定與
API 關閉會產生 503。已提供 `wrangler.survey-preview.toml` 作為本機可審閱範本；
它不會自動被目前 Production／PR 流程選用。在另行授權的問卷專用分支／工作樹，
保留問卷原有內容，再將範本選作該部署的 `wrangler.toml`，並由受信任版本驗證：

```sh
python3 scripts/check-pages-isolation.py wrangler.toml --survey-preview
```

此專用模式鎖定上列**既有 UUID**，只允許 `SURVEY_DB`，禁止 Maple DB、R2、DO、
正式 D1、任意新測試 D1 及未宣告 binding 類型。default 仍無綁定，Production 設定
與主設定完全相同。一般 PR 驗證器拒絕此模式，避免誤送入 PR 自動部署。
這只是未來操作說明；本次不建立 survey 分支、不改 branch control、不部署。

Runtime 需要明確 `PAGES_DEPLOYMENT_ENV=survey-preview`、
`PREVIEW_RESOURCE_SCOPE=survey-only`、`PREVIEW_FUNCTIONS_ENABLED=true`，以及
`SURVEY_DB`、現有問卷的三項 Secret（`SURVEY_ADMIN_SECRET`、
`SURVEY_FINGERPRINT_SECRET`、`TURNSTILE_SECRET_KEY`）與公開 `TURNSTILE_SITE_KEY`。
不要求 NEXON、匯入或其他八項完整站點資源。缺少條件或多出 DB／R2／DO 就拒絕。

只允許 `/api/survey`、`/api/survey/site-key`、`/api/admin/session`、
`/api/admin/survey` 及其數字 ID 路由；其他 API 維持 503。
原有 handler 的方法限制、管理認證、Turnstile、IP 指紋及 CSV 遮蔽仍照常執行。
不使用 Host、Origin、轉送標頭或 CF_PAGES_* 變數放行；也沒有退回 `env.DB` 的路徑。
Runtime binding 無法顯示 D1 UUID，身份保證來自受信任設定驗證與正式授權部署時的
Cloudflare 實際綁定核對，不能把 marker 當作資料庫身份證明。

問卷重新部署後仍需以既有 Access 身份登入並驗收問卷；未登入的 Access 302 是正常
保護行為。此項線上重部署／驗收未在本次執行，不可聲稱本機測試等於線上已更新。

## 發布與失敗處理

只在完整修補提交、PR 審閱及核准後沿既有 Production 流程發布。
部署後核對 Cloudflare build Node、部署 Commit、正式 `__deploy.json` 與
`/api/__deploy.json` 的 SHA，並用 `/api/health`、問卷 site-key 等唯讀 API 驗收。
不要以可能寫入資料的角色查詢、問卷 POST、DELETE 或 migration 作為正式探測。

建置失敗不會發布該次輸出；上一個成功版本會繼續服務，可能仍是未修補版本。
應在包含完整安全修補的 HEAD 修正建置原因再重建，不能繞過 Node guard、改鎖檔策略、
回退舊 Commit、重跑舊 workflow SHA，或直接上傳先前留下的 dist。

參考官方文件：[Pages Wrangler 設定與 source of truth](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)、
[Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)、
[GitHub skipped job 語意](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions)。
