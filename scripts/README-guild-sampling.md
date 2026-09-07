# 已知公會成員取樣

本功能新增獨立的 `nexon_guild` 來源，保留 MaplerHouse 排行榜與本機 JSON 匯入流程。程式不排程、不自動開啟下一輪，不使用 MapleKit、其他新資料站或爬蟲。

## 來源與涵蓋範圍

公會候選僅從本站 `characters` 的非空 `world_name + guild_name` 組合建立，每輪開始時固定清單，以伺服器、公會名稱排序，取指定的 `maxGuilds` 上限。匯入後新發現的公會不會加入同一輪。上限造成的截取也不是隨機抽樣。

台版官方 API：

- `GET https://open.api.nexon.com/maplestorytw/v1/guild/id?guild_name=...&world_name=...`
- `GET https://open.api.nexon.com/maplestorytw/v1/guild/basic?oguild_id=...`
- `GET .../id?character_name=...`、`GET .../character/basic?ocid=...`、`GET .../character/stat?ocid=...`

端點及 `guild_member` 字串陣列依據 [NEXON 台版公會文件](https://openapi.nexon.com/game/maplestorytw/?id=51) 與其官方 schema。未提供全服公會列舉介面；本功能不宣稱已知公會清單完整。

## 樣本說明

本資料為排行榜及已知公會成員樣本。公會來源不涵蓋未加入公會的角色，且偏向活躍、主力角色，等級與戰力分布可能偏高；各項比例僅代表樣本內佔比，不代表全服。未入公會角色仍可能由原排行榜來源收錄。

此說明同時放在排行榜及雷達圖的「樣本來源與限制」。雷達仍讀取本站排行榜，保留等級篩選、職業分層抽樣及既有快取架構，只調整角色去重為 OCID 優先。雷達的抽樣筆數也不等於整個角色池人數。新增比例時，分母必須是符合該指標有效條件的去重角色數，不能相加來源筆數或推估全服。

## D1 migration

`migrations/0009_guild_sampling.sql`：

- `characters.nexon_requested_at`：官方角色查詢開始時間；舊列保留 NULL，首次再利用前須通過新版驗證。
- `character_import_staging.source_metadata_json`：保存公會 ID、伺服器、公會名稱及名冊觀測時間。
- `import_jobs.lease_token` / `lease_until`：防止同一公會工作同時執行多個步驟；中斷後最長 10 分鐘可重取租約。
- `guild_import_candidates`：固定的本輪候選、官方公會 ID、完成／重試／失敗狀態及觀測資訊。
- 公會候選索引與單一未完成公會工作的唯一索引。

沿用 `characters` 的 OCID 主鍵、`character_sources` 的 `(ocid, source)` 主鍵及 staging 的 `(source, source_id)` 唯一鍵；不重建、不清空主資料，不修改現有線上資料。新版程式需要此 migration 才能寫入，未套用前請勿啟動新版 importer。migration 本身不會重新驗證或刪除舊資料。

## 完整流程與更新規則

1. `start`：驗證管理員憑證、明確的公會上限（1–10000），建立／接續未完成的公會工作，固定候選清單；不呼叫 NEXON。
2. `stage`：每次處理一個待處理或已到期重試的公會，取得官方公會 ID 與名冊。驗證伺服器、公會名稱、成員數與名冊欄位，缺漏名冊不能當成空公會。
3. 名冊以 `[伺服器, 角色名稱]` 作候選鍵去重；這只是查詢線索。名冊內不含戰力，staging 的空欄位／零值不得直接進主資料。名冊寫入與公會完成標記在同一 D1 transaction 提交；失敗可續跑。
4. 所有候選公會處理完畢後 `resolve`：每批預設 16 名角色。公會名冊角色只要以「世界＋正規化角色名稱」在 `characters` 找到既有列，就直接補 `nexon_guild` 來源，不呼叫角色詳細 API；只有完全找不到的角色才查 OCID、basic、stat。這個來源比對不會因舊資料或新鮮度而重新查角色 API。
5. 其他候選經官方角色 API 取得 OCID、基本資料與戰力；已知官方 OCID 可省去 `/id`。公會名冊角色須核對名稱與伺服器；舊 OCID 對不上時重新查 `/id`，仍不一致則記錄失敗，不按名稱強行合併。
6. 必填名稱、伺服器、職業、正整數等級、角色圖片、公會欄位及非負整數戰力必須有效。明確回傳的戰力 `0` 有效；缺少戰力、空字串、NaN、負值、缺少基本欄位無效。資料日期若存在必須可解析，basic/stat 同時有日期時必須一致。缺漏資料重試，耗盡次數後標示失敗，保留既有有效主資料。
7. 最終以 OCID upsert，保留 `maplerhouse`／`manual_seed`／`nexon_guild`／`nexon` 等多個來源。兩筆都有官方資料日期時先比日期，同日期再比查詢開始時間；其中任一筆沒有日期時比較查詢開始時間。舊版列以既有 `updated_at` 作過渡比較基準。較早請求晚回來不能覆蓋較新資料；較新的有效戰力即使下降也應更新。
8. 舊有效資料若因刷新失敗而保留，仍有原本時間戳記，不偽裝成本輪新資料。主表一個 OCID 一筆；角色改名但 OCID 不變不會增加筆數。不同 OCID 不按同名或同帳號合併；官方 OCID 若真的改變，需要另外取得身份證據，不能推測合併。
9. staging 在新一輪接手舊候選時重設成 pending、清除先前重試狀態；同一輪的重複名冊不反覆重排已解析角色。來源觀測時間與公會線索保存在 `character_sources`；來源標記表示曾收錄，不保證現在仍屬於該公會。退會不刪除角色。
10. 完成後沿用排行榜快照刷新。部分公會／角色可失敗，`completed` 表示本輪佇列處理完畢，不表示所有查詢都成功；檢查 `checkpoint_json.guilds.failed`、`failed_count` 及 `import_job_errors`。403／401 會停止當次工作，不把全部公會標為失敗。

預算沿用 `IMPORT_D1_READ_BUDGET`、`IMPORT_D1_WRITE_BUDGET`；官方呼叫沿用 `NEXON_CONCURRENCY`、`NEXON_REQUEST_DELAY_MS`、`NEXON_RETRY_LIMIT`、`NEXON_REQUEST_TIMEOUT_MS`。租約防止正常操作重疊，不是永久鎖；不要在長時間請求仍執行時另開同一工作。

## API request 估算

不含重試、身份重新解析與排行榜快照：`2G + 3U + 2K`。

- `G`：實際展開的公會數；新一輪各需 guild/id + guild/basic，共 2 次。當輪已保存公會 ID 的名冊重試通常只需 basic。
- `U`：需要更新且沒有已知官方 OCID 的去重角色數，各 3 次。
- `K`：依本次策略為 0；既有角色只補來源，不進角色資料更新。若另行統計舊資料或欄位不完整，不能把它們轉成角色 API 請求。
- 新鮮且有效的已收錄角色：角色 API 0 次，只補來源。

例如 10 個公會，合併後 1000 個候選，其中 500 個已存在、500 個完全不存在：`20 + 1500 = 1520` 次官方請求。這只是算例，未查詢正式資料估量。

每個 endpoint 最多嘗試 `NEXON_RETRY_LIMIT` 次；佇列另有同上限的延後重試，故極端情況不只乘一次 retryLimit。以預設 5 次計，持續暫時失敗的 endpoint 在多次續跑後可能嘗試到 25 次。`--steps` 限制管理端變更步驟數，不是官方 request 數；`--all` 也只處理指定工作，不會自動開下一輪。官方實際次數記錄在 `import_jobs.nexon_request_count`，包含 HTTP 重試；程序突然中斷前尚未落盤的計數可能遺失。

## 手動第一輪（尚未執行）

先在經批准的目標套用 migration 並部署相容版本，設定伺服器 `NEXON_API_KEY` / `IMPORT_ADMIN_SECRET`。本機 shell 設定 `HOLYBEAR_API_BASE_URL` 和 `IMPORT_ADMIN_SECRET`；不要把憑證寫入指令或提交到 Git。

先建立最多一個已知公會的工作，不打官方 API：

```powershell
npm run import:maple -- nexon_guild --start --max-guilds 1 --steps 1
```

記下回傳的 `job.id`，用實際數字取代下列 `123`。

```powershell
# 展開一個公會；只有名冊暫存，還不建立角色主資料
npm run import:maple -- nexon_guild --job 123 --steps 1

# 下一步解析最多一批（預設 16 名），之後可逐批檢查
npm run import:maple -- nexon_guild --job 123 --steps 1

# 唯讀檢查該工作
npm run import:maple -- nexon_guild --job 123 --status
```

只做唯讀估算、不建立 guild job、不寫入 staging 或角色主表：

```powershell
npm run import:maple -- nexon_guild --estimate --max-guilds 1
```

estimate 只呼叫官方 `guild/id` 與 `guild/basic`，然後用本站 D1 的「世界＋角色名稱」比對；角色 API request 預估為 `3U`，既有角色的 `K` 為 0。`--estimate` 不建立工作、不寫入 D1。

只有在確認估算結果後，才續跑指定工作的全部步驟：

```powershell
npm run import:maple -- nexon_guild --job 123 --all
```

若重試時間未到，指令會保留斷點並結束，稍後用同一 job ID 續跑。`--start` 在有未完成工作時接續原工作，不會擴張已固定的候選清單。全部處理完後才可再次 `--start --max-guilds N` 開新一輪。現有排行榜可明確使用 `maplerhouse --all --refresh` 開新一輪；本機 JSON 可用 `manual --all --refresh`（必須先完成待處理／重試佇列並停止既有背景匯入），原本不帶 `--refresh` 的續跑方式不變。

本次實作驗證只在記憶體 SQLite 套用所有 migration，官方回應全部為測試 fixture；尚未套用正式 D1 migration、部署或執行真實公會匯入。

## 本機驗證

```powershell
npm run test:maple-db
npm run typecheck:functions
npm run check:maple-calculator
git diff --check
```

測試使用 Node 22 的 `node:sqlite`，不連線正式 D1；涵蓋固定候選、世界區分、官方端點、OCID 合併、多來源、新鮮資料重用、過期刷新、舊回應防護、缺漏資料重試、交易回滾、D1 參數限制、工作鎖、管理員驗證及原排行榜流程。

## 修改檔案清單

| 類別 | 檔案 |
| --- | --- |
| 公會流程（新增） | `functions/_shared/guild-import.ts`、`scripts/run-guild-import.mjs` |
| 既有管理端／入口 | `functions/api/admin/import/[source].ts`、`scripts/run-maple-import.mjs` |
| 共用驗證／更新（新增） | `functions/_shared/character-policy.mjs` |
| 既有資料流程 | `functions/_shared/character-repository.ts`、`functions/_shared/import-repository.ts`、`functions/_shared/nexon-client.ts`、`functions/_shared/models.ts`、`functions/_shared/importers/importer.ts`、`scripts/run-manual-seed-import.mjs` |
| D1（新增） | `migrations/0009_guild_sampling.sql` |
| 雷達取樣 | `scripts/generate-tms-radar-reference.mjs`、`scripts/lib/tms-radar-sampling.mjs` |
| UI | `.vitepress/theme/maplestory/components/RecentPowerRanking.tsx`、`.vitepress/theme/maplestory/components/StatRadarChart.tsx` |
| 共用樣本說明（新增） | `.vitepress/theme/maplestory/data/sampleNotice.ts` |
| 測試（新增） | `tests/maple-db/guild-import.test.ts`、`tests/maple-db/sqlite-d1.ts` |
| 操作文件（新增） | `scripts/README-guild-sampling.md` |
