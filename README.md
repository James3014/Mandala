# SKiDIY Linus 九宮格應用

以 Linus 原則打造的九宮格分類系統：後端用 `LinusService` 自動分類 / 合併逐字稿並輸出曼陀羅資料結構；前端提供 **單宮模式**（中心＋外圈八格）與 **9×9 總覽**（一次瀏覽 81 個子格），支援搜尋、needs_review 狀態與 InsightLog。

## 目錄總覽
```
Mandala/
├─ linus_app/           # 後端核心模組（classifier、integrator、summary、service、mandala blueprint）
├─ frontend/            # 單頁應用（Vanilla JS + CSS）
├─ serve.py             # Dev server；同時提供靜態檔與 /api/* 端點
├─ tests/               # pytest 單元測試
└─ doc/                 # SDD / API / 測試 / 前端規格文件
```

## 快速開始（本機開發）

1. 安裝 Python 3.11+。  
2. 安裝依賴：本專案僅用標準函式庫，不需額外套件。
3. 執行測試（可選）：
   ```bash
   pytest
   ```
4. 啟動前後端整合伺服器：
   ```bash
   python3 serve.py
   ```
   - 預設 http://127.0.0.1:8000  
   - `/api/grids`、`/api/grids/{id}`、`/api/segments`、`/api/segments/{id}/log` 直接呼叫 `LinusService`。
   - `frontend/index.html` 會自動呼叫上述 API；若後端沒開，畫面會改用內建 fallback 資料。

5. 貼逐字稿：向 `/api/segments` `POST` 段落即可，即時看到九宮格更新。可用 curl 或直接在 Python 互動式 shell 呼叫 `LinusService.post_segments()`。

## 部署到 Zeabur

1. 於 GitHub 建立 Repo，推送本專案內容。  
2. Zeabur 建立新服務並連結該 Repo，選擇 **Python** Runtime。  
3. 指定部署設定：
   - **Start Command**：`python3 serve.py`
   - **Port**：Zeabur 會注入 `PORT` 環境變數，可修改 `serve.py` 的 `run()` 以 `int(os.getenv("PORT", 8000))` 監聽（目前預設 8000，Zeabur 亦支援固定 Port 轉發）。  
   - 無需額外 build step；Zeabur 會自動以 `pip install -r requirements.txt` 方式安裝，但本專案沒有第三方依賴，可空白。  
4. 部署後，Zeabur 會提供一個公開 URL，直接瀏覽 `/index.html` 即可；API 路徑 `/api/*` 會共享同一網域。

> 若要自訂 Port 或使用 FastAPI/Gunicorn，可複製 `LinusService` 進入任意 WSGI/ASGI 架構；Zeabur 的 Start Command 依框架調整即可。

## API 摘要

- `POST /api/segments`：一次貼多段逐字稿，回傳每段的 `grid_assignments`、`status`、`summary_notes`。  
- `GET /api/grids`：回傳所有格子的 summary / entries / needs_review + `mandala`（中心＋外圈八格）。  
- `GET /api/grids/{id}`：單一格詳細資料。  
- `GET /api/segments/{segment_id}/log`：InsightLog（inserted / merged / marked_review）。  

資料結構詳見 `doc/LINUS_API_SPEC.md`、`doc/LINUS_FRONTEND_SDD.md`。

## 開發筆記

- **9×9 總覽**與**單宮模式**共用同一份 `mandala` 定義（`linus_app/mandala_blueprint.py`），確保畫面與 API 同步。  
- 若要持久化資料，可將 `GridCell.entries`、`InsightLog` 改寫入資料庫，再於 `LinusService` 讀寫。  
- 前端沒有框架，相依極少；若要改用 React/Vite，可把 `frontend/app.js` 的邏輯移植成 Hook/Store，再保留同樣的 API 介面。

如需更多細節（SDD、測試計畫、前端需求），請參閱 `doc/` 目录。Happy shipping!
