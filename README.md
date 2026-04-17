# PostLab · FuturestarAI

AI 驅動的 Instagram 輪播貼文產生器 — 輸入主題，30 秒產出吸睛文案與視覺排版。

## 功能

- 輸入關鍵字，AI 自動產出 3 / 5 / 7 / 10 張輪播文案
- 6 種內容風格（教學、勵志、幽默、品牌、產品、問答）
- 8 種視覺主題色
- 即時預覽 IG 400×400 輪播 Slide
- 可直接編輯文案（即時同步到預覽）
- 下載單張 / 全部為 PNG 圖片
- 一鍵複製全部文案
- 鍵盤左右鍵 + 手機觸控滑動切換
- 手機版 RWD 響應式設計

## 技術架構

```
使用者瀏覽器（GitHub Pages）→ Cloudflare Worker（藏 API Key）→ Gemini 2.0 Flash API
```

| 元件 | 說明 | 費用 |
|------|------|------|
| 前端 | 單頁 HTML，託管於 GitHub Pages | 免費 |
| API 代理 | Cloudflare Worker（含 Rate Limit + CORS） | 免費（10 萬次/天） |
| AI 模型 | Google Gemini 2.0 Flash | ~$0.0004 / 次 |

## 部署步驟

### 第一步：部署 Cloudflare Worker

1. 註冊 / 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左側選單 → **Workers & Pages** → **Create**
3. 名稱輸入 `postlab-api` → 點 **Deploy**
4. 點 **Edit Code**，貼上 `worker.js` 的全部內容 → 點 **Deploy**
5. 回到 Worker 頁面 → **Settings** → **Variables and Secrets**
6. 點 **Add**：
   - 類型：**Secret**
   - 名稱：`GEMINI_API_KEY`
   - 值：貼上你的 [Gemini API Key](https://aistudio.google.com/apikey)
7. 再新增一個變數（選填但建議）：
   - 類型：**Text**
   - 名稱：`ALLOWED_ORIGIN`
   - 值：`https://你的帳號.github.io`（限制只有你的網站能呼叫）
8. 點 **Save**

記下你的 Worker URL，格式：`https://postlab-api.你的子網域.workers.dev`

### 第二步：更新前端 Worker URL

打開 `index.html`，找到這行：

```javascript
const WORKER_URL = 'https://postlab-api.YOUR_SUBDOMAIN.workers.dev';
```

改成你的實際 Worker URL，然後 commit + push。

### 第三步：啟用 GitHub Pages

1. 進入 GitHub repo → **Settings** → **Pages**
2. **Source** 選 **Deploy from a branch**
3. **Branch** 選 `main`，資料夾選 `/ (root)`
4. 點 **Save**
5. 等 1-2 分鐘，網址：`https://你的帳號.github.io/postlab/`

## 檔案說明

```
postlab/
├── index.html    前端（UI + 邏輯，單一檔案）
├── worker.js     Cloudflare Worker（API 代理 + 安全防護）
└── README.md     說明文件
```

## 安全機制

- API Key 存在 Cloudflare 環境變數，前端看不到
- CORS 可鎖定只允許指定網域
- Rate Limit：每 IP 每分鐘 15 次
- 請求驗證：檢查 body 結構 + prompt 長度上限 5000 字
- 前端 XSS 防護：所有 AI 回傳內容經 escapeHtml 處理

## API 費用估算

| 使用量 | 費用（美元） | 約新台幣 |
|--------|------------|---------|
| 100 次 | $0.04 | NT$1 |
| 1,000 次 | $0.43 | NT$14 |
| 10,000 次 | $4.30 | NT$135 |
