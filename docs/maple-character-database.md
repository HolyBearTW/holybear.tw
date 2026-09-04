# HolyBear MapleStory 角色資料庫維運

## 架構與資料責任

- Cloudflare Pages 繼續發布 VitePress；`public/_routes.json` 僅將 `/api/*` 送入 Pages Functions。
- D1 binding 固定為 `DB`，database 為 `holybear-maple-db`。
- `vars` 與 D1 都在 `env.production` 明確重述；Pages 的 non-inheritable bindings 不可只依賴 top-level 繼承。
- NEXON 提供官方最新角色資料；正式 key 只存在 Pages secret `NEXON_API_KEY`。
- MaplerHouse tracked 僅建立初始角色池。所有 seed 先進 staging，再以名稱解析 OCID。
- MaplerHouse 的 `/status`、`/track` 與 history API 仍直接負責成長報告，沒有被 D1 取代。
- `ranking_snapshots` 現階段只預留 schema，不排程高頻寫入。

## Schema 與 migrations

`migrations/0001_characters_and_sources.sql` 建立 `characters`、`character_sources`、`account_groups`；`0002_import_pipeline.sql` 建立 `import_jobs`、`character_import_staging`、`import_job_errors`；`0003_ranking_and_account_signals.sql` 建立 `ranking_snapshots`、`account_group_signals`。不可修改已套用的 migration；後續變更一律新增編號檔。

本機空 DB：

```powershell
yarn d1:migrate:local
yarn typecheck:functions
yarn test:maple-db
npx wrangler pages functions build
```

本機 Pages + Functions：

```powershell
npx wrangler pages dev .vitepress/dist
```

Wrangler 會使用本機 D1 state；secret 請放在未 commit 的 `.dev.vars` 或以 Wrangler secret 管理，不要放入 `wrangler.toml`。

## API

- `GET /api/characters/:name`：fresh D1 hit 直接回傳；miss/stale 時查 NEXON 並 upsert。刷新失敗且有舊資料時回 `stale: true`。
- `GET /api/rankings/combat-power?page=&pageSize=&world=&job=&minLevel=`：D1 分頁與篩選，按 `combat_power DESC, ocid ASC` 排序。
- `GET /api/rankings/character/:name`：直接用 SQL 計算角色名次與總數。
- `GET /api/characters/:name/alts`：回傳 account group、confidence、alts 與「依公開聯盟資料推定」聲明。
- `GET /api/nexon/*`：只允許既有 dashboard 所需的 NEXON path，server-side 加入正式 key。
- `POST /api/admin/import/:source`、`GET /api/admin/import/status`：必須帶 `Authorization: Bearer <IMPORT_ADMIN_SECRET>`。

## Importer、checkpoint 與 resume

每次 admin POST 只處理一個來源頁或一個 OCID resolution batch，適合 Pages Functions 執行時間與免費額度。成功頁才更新 `last_page`；失敗頁保持原 checkpoint，下一次從同一安全點重試。單一角色失敗寫入 `import_job_errors` 並進 retry/failed，不會終止整批。

MaplerHouse 預設 page size 100。來源資料只負責角色 discovery；HolyBear rank 一律由 D1 重新計算。

分段執行：

```powershell
$env:HOLYBEAR_API_BASE_URL='https://你的-pages-preview-url'
$env:IMPORT_ADMIN_SECRET='已設定的值'
$env:IMPORT_REQUEST_DELAY_MS='1000'
yarn import:maple maplerhouse 100
```

腳本到達 step 上限會正常停止；job checkpoint 已在 D1，重跑同來源會自動續傳。不要把 admin secret 寫進前端或 workflow log。

## Freshness、retry 與流量控制

- `CHARACTER_FRESHNESS_SECONDS` 預設 900。
- `NEXON_RESOLUTION_BATCH_SIZE` 預設 8、`NEXON_CONCURRENCY` 2、`NEXON_REQUEST_DELAY_MS` 200。
- `NEXON_RETRY_LIMIT` 5、`NEXON_REQUEST_TIMEOUT_MS` 10000；429、5xx、timeout 與 network error 使用 exponential backoff。
- 大量 seed 不需一天完成。每個來源頁與 resolution batch 都有 checkpoint，可依 D1 writes、Workers requests 與 NEXON quota 每日分段執行。
- `character_sources.raw_json` 預設不保存完整第三方 payload，以避免 27 萬筆重複 JSON 浪費 D1 storage。

## Account groups

`account_groups` 不是官方帳號 ID。現階段只把含至少兩個具名角色的完整 Union Champion roster canonicalize + SHA-256，完全相同的高識別 roster 才自動建立 `high` group；`union_level` 絕不單獨用來合併。Raider/Artifact/Champion 變動可能使 fingerprint 改變，舊訊號保留供後續人工與深度 review。

## Production、rollback 與 troubleshooting

Production migration 與 secret 必須由有 Cloudflare 權限的人執行：

```powershell
npx wrangler d1 migrations apply holybear-maple-db --remote
npx wrangler pages secret put NEXON_API_KEY --project-name holybear-tw
npx wrangler pages secret put IMPORT_ADMIN_SECRET --project-name holybear-tw
```

先發布 preview、檢查 `/api/health`、小批 import、角色 miss/hit/stale、排行榜分頁與既有 growth UI，再推進 production branch。若新 API 異常，可回滾 Pages deployment；舊 `maplerhouseService.ts` ranking 實作仍保留，可暫時把前端 imports 切回，Growth/History 不受影響。D1 migration 採 forward-only；schema 修正新增 migration，不直接改 production table。

常見問題：`NEXON_API_KEY is not configured` 表示 Pages secret 未設；import 401 表示 `IMPORT_ADMIN_SECRET` 不符；D1 quota 接近上限時降低每日 step 數並於隔日 resume。
