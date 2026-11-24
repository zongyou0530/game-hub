# GAME HUB

個人遊戲入口網站：遊戲好友邀請、QR Code、YouTube 影片中心與個人資料。使用原生 HTML/CSS/JavaScript，可部署於 GitHub Pages。

## 快速部署

1. 建立 GitHub Repository，例如 `game-hub`。
2. 將本專案所有檔案上傳到 Repository 根目錄。
3. 開啟 **Settings → Pages**。
4. 在 **Build and deployment** 選擇 **Deploy from a branch**。
5. Branch 選 `main`，資料夾選 `/ (root)`，按 Save。
6. 等待部署完成，網址通常是 `https://你的帳號.github.io/game-hub/`。

若 Repository 命名為 `你的帳號.github.io`，網址則是 `https://你的帳號.github.io/`。

## 如何更新內容

### 方法 A：網站內管理介面
1. 開啟網站，點右上角「管理內容」。
2. 在遊戲管理、影片管理或個人資料分頁編輯。
3. 修改會先儲存在目前瀏覽器的 localStorage 草稿。
4. 到「匯入 / 匯出」按「匯出全部資料 JSON」。
5. 將下載的 `games.json`、`videos.json`、`profile.json` 上傳並覆蓋 Repository 的 `data/` 對應檔案。
6. 若新增封面或 QR Code，請一併上傳到 `assets/covers/` 或 `assets/qrcodes/`，並在資料中填入相對路徑。
7. Commit changes，等待 Pages 部署。

### 方法 B：直接編輯 JSON
在 GitHub 網頁版開啟 `data/games.json`、`data/videos.json` 或 `data/profile.json`，按鉛筆圖示修改，再 Commit changes。

## 新增遊戲範例

```json
{
  "name": "Minecraft",
  "category": "PC",
  "player_id": "Java Edition",
  "description": "我的 Minecraft 生存世界。",
  "cover": "assets/covers/minecraft.jpg",
  "qrcode": "",
  "invite_url": ""
}
```

`category` 可用 `Mobile`、`PC`、`Console`。

## 新增 YouTube 影片範例

```json
{
  "title": "Minecraft 生存日記 #01",
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "category": "Minecraft 直播",
  "description": "本次直播的內容簡介。"
}
```

支援一般 YouTube 網址、`youtu.be`、`/shorts/`、`/live/` 連結。影片可以在網站內嵌播放，也可在播放器中使用 YouTube 原始網址開啟。

## 管理功能與安全性說明

- GitHub Pages 是靜態託管，沒有可直接寫入 Repository 的伺服器端 API。
- 管理介面支援新增、編輯、刪除、匯入、匯出與本機草稿。
- 本機草稿只存在目前瀏覽器，不會自動同步到其他裝置，也不會自動發布。
- **不要把 GitHub Personal Access Token 放進前端程式碼**，因為網站訪客可以讀取它。
- 不要上傳私人資訊、密碼或不希望公開的 QR Code。
- 建議影片使用 YouTube 連結，不要把大型影片檔直接放進 Git Repository。
