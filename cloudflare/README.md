# Cloudflare Worker 部署說明

本目錄的 `worker.js` 是 Game Hub 的後端 API，請部署到既有的 Cloudflare Worker：`game-hub-api`。

## 必要設定

### Environment variables

| 名稱 | 類型 | 用途 |
|---|---|---|
| `GITHUB_CLIENT_ID` | Text | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | Secret | GitHub OAuth App Client Secret |
| `GITHUB_APP_ID` | Text | GitHub App ID |
| `GITHUB_PRIVATE_KEY` | Secret | GitHub App 完整 PEM 私鑰 |
| `GITHUB_INSTALLATION_ID` | Text | GitHub App Installation ID |

### KV binding

將已建立的 KV namespace 綁定至 Worker：

- Variable name：`SESSIONS`
- KV namespace：`GAME_HUB_SESSIONS`

### GitHub OAuth App

Authorization callback URL 必須是：

```text
https://game-hub-api.zongyooou.workers.dev/auth/callback
```

GitHub App 必須安裝在 `zongyou0530/game-hub`，並具有 Contents: Read and write 與 Metadata: Read-only 權限。

## 部署步驟

1. 開啟 Cloudflare Dashboard → Workers & Pages。
2. 選取既有的 `game-hub-api` Worker。
3. 開啟 Edit code。
4. 將本檔 `worker.js` 的完整內容貼入 Worker 編輯器。
5. 確認上述 Environment variables 與 KV binding 均已設定。
6. Deploy。
7. 開啟 `https://game-hub-api.zongyooou.workers.dev/health`，應回傳 `{"ok":true,"service":"game-hub-api"}`。

## API 路徑

- `GET /health`：健康檢查
- `GET /auth/login`：開始 GitHub OAuth
- `GET /auth/callback`：驗證 GitHub 帳號並建立管理 session
- `GET /api/me`：確認管理 session
- `GET /api/data`：讀取三份 JSON
- `PUT /api/data`：先備份再更新三份 JSON
- `POST /auth/logout`：登出

管理者以 GitHub 使用者 ID `250560159` 與帳號 `zongyou0530` 雙重核對。Session 儲存在 KV，閒置 60 分鐘後過期；每次成功 API 請求會延長有效期。

## 備份行為

每次更新前，Worker 會先將 `data/games.json`、`data/videos.json`、`data/profile.json` 的原始內容複製到：

```text
backups/<UTC timestamp>/
```

三份備份全部成功後，才開始更新正式資料。

## 安全注意

- 絕對不要把 Client Secret 或 PEM 私鑰提交到 GitHub。
- 前端只保存短效管理 session token 於目前分頁的 sessionStorage，不保存 GitHub OAuth access token。
- 由於 GitHub Pages 與 workers.dev 是不同網域，瀏覽器跨站 Cookie 限制會影響 HttpOnly Cookie 方案；此版本採用短效 Bearer session。網站若日後加入自訂網域，可再升級為同站 HttpOnly Cookie。
- 上線前請先測試登入、錯誤帳號拒絕、讀取資料、儲存資料、備份檔案與登出。
