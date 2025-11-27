import { fetchGrids, fetchSegmentLog, postSegments } from "./api.js";
import {
  state,
  setGrids,
  getGrid,
  setCurrentGridId,
  setViewMode,
  setSearchResults,
  addRecentSegments,
  setClearFreshTimer,
  pushToStack,
  popFromStack,
  resetStack,
  getStackPath,
  gridHasFreshEntries,
  gridHasNeedsReview,
  ROOT_GRID_ID,
} from "./store.js";
import { renderMandalaBoard, renderOverviewBoard } from "./renderBoard.js";
import { renderDetailPanel } from "./renderDetail.js";
import { renderSearchResults } from "./renderSearch.js";
import { renderIngestResults } from "./renderIngest.js";
import { subscribe } from "./store.js";

const appBodyEl = document.querySelector(".app-body");
const gridBoardEl = document.getElementById("gridBoard");
const overviewBoardEl = document.getElementById("overviewBoard");
const detailPanelEl = document.getElementById("detailPanel");
const gridFilterEl = document.getElementById("gridFilter");
const statusFilterEl = document.getElementById("statusFilter");
const searchInputEl = document.getElementById("searchInput");
const resultCountEl = document.getElementById("resultCount");
const resultsListEl = document.getElementById("resultsList");
const logModalEl = document.getElementById("logModal");
const logListEl = document.getElementById("logList");
const closeModalBtn = document.getElementById("closeModal");
const backButtonEl = document.getElementById("backButton");
const breadcrumbEl = document.getElementById("mandalaBreadcrumb");
const viewModeInputs = document.querySelectorAll('input[name="viewMode"]');
const segmentFormEl = document.getElementById("segmentForm");
const segmentSourceInput = document.getElementById("segmentSource");
const segmentTextInput = document.getElementById("segmentText");
const segmentStatusEl = document.getElementById("segmentStatus");
const segmentSubmitButton = document.getElementById("segmentSubmit");
const toastStackEl = document.getElementById("toastStack");
const ingestResultsEl = document.getElementById("ingestResults");
const ingestTableBodyEl = document.getElementById("ingestTableBody");

// State is now managed in store.js

const MandalaModule = {
  render: render,
  renderBoard: () => renderMandalaBoard(gridBoardEl, detailPanelEl),
  renderOverview: () => renderOverviewBoard(overviewBoardEl),
  renderDetail: () => renderDetailPanel(detailPanelEl, getGrid(state.currentGridId), logModalEl, logListEl),
  updateControls,
};

const SearchModule = {
  filter: filterSearchResults,
  render: () => renderSearchResults(resultsListEl, resultCountEl, detailPanelEl),
};

const SegmentModule = {
  submit: handleSegmentSubmit,
  setStatus: setSegmentStatus,
  renderResults: (results) => renderIngestResults(ingestResultsEl, ingestTableBodyEl, results),
};

async function init() {
  await loadGrids();
  populateGridFilter();
  viewModeInputs.forEach((input) =>
    input.addEventListener("change", (event) => setViewModeHandler(event.target.value))
  );

  // Subscribe to state changes
  subscribe(() => {
    // Optional: fine-grained updates could go here, but for now we rely on explicit render calls
    // or we could auto-render on state change.
    // For this refactor, we keep the explicit render calls to match existing behavior,
    // but the store notifies listeners.
    // Let's just re-render search results if they change?
    // Actually, let's keep it simple and manual for now as per original logic.
  });

  if (segmentFormEl) {
    segmentFormEl.addEventListener("submit", SegmentModule.submit);
  }
  MandalaModule.render();
}

async function loadGrids() {
  try {
    const data = await fetchGrids();
    setGrids(data.grids.map(normalizeGrid));
  } catch (error) {
    console.warn(
      "載入 API 失敗，改用內建假資料。請執行 `python serve.py` 以啟用後端 API。"
    );
    setGrids(fallbackGrids.grids);
  }
}

function normalizeGrid(raw) {
  if (!raw) return raw;
  return {
    gridId: raw.grid_id ?? raw.gridId,
    title: raw.title,
    persona: raw.persona || "",
    summary: raw.summary ?? [],
    entries: raw.entries ?? [],
    needsReview: raw.needs_review ?? raw.needsReview ?? [],
    updatedAt: raw.updated_at ?? raw.updatedAt ?? "",
    mandala: raw.mandala,
    hasNewEntry: raw.hasNewEntry ?? false,
    needsReviewCount: raw.needs_review ? raw.needs_review.length : raw.needsReviewCount ?? 0,
  };
}

function populateGridFilter() {
  state.grids.forEach((grid) => {
    const option = document.createElement("option");
    option.value = grid.gridId;
    option.textContent = `${grid.gridId} ${grid.title}`;
    gridFilterEl.appendChild(option);
  });
}

// getGrid is imported from store.js

function render() {
  if (state.viewMode === "single") {
    appBodyEl.classList.remove("overview-mode");
    gridBoardEl.classList.remove("hidden");
    overviewBoardEl.classList.add("hidden");
    detailPanelEl.classList.remove("hidden");
    backButtonEl.disabled =
      state.currentGridId === ROOT_GRID_ID && state.mandalaStack.length === 0;
    MandalaModule.renderBoard();
    MandalaModule.renderDetail(); // Ensure detail is also rendered
  } else {
    appBodyEl.classList.add("overview-mode");
    gridBoardEl.classList.add("hidden");
    overviewBoardEl.classList.remove("hidden");
    detailPanelEl.classList.add("hidden");
    backButtonEl.disabled = true;
    MandalaModule.renderOverview();
  }
}

function setViewModeHandler(mode) {
  setViewMode(mode);
  MandalaModule.render();
}

// Render functions moved to separate modules

function drillDown(targetGridId) {
  pushToStack(state.currentGridId);
  setCurrentGridId(targetGridId);
  MandalaModule.render();
}

function handleBack() {
  const prev = popFromStack();
  if (prev) {
    setCurrentGridId(prev);
  } else {
    setCurrentGridId(ROOT_GRID_ID);
  }
  MandalaModule.render();
}

function jumpToGrid(gridId) {
  if (gridId === ROOT_GRID_ID) {
    resetStack();
  } else {
    resetStack();
    pushToStack(ROOT_GRID_ID);
  }
  setCurrentGridId(gridId);
  MandalaModule.render();
}

function updateControls() {
  breadcrumbEl.textContent = getStackPath();
}

// Render functions moved to separate modules

function filterSearchResults() {
  const keyword = searchInputEl.value.trim().toLowerCase();
  const gridFilter = gridFilterEl.value;
  const statusFilter = statusFilterEl.value;

  const allEntries = state.grids.flatMap((grid) =>
    grid.entries.map((entry) => ({
      ...entry,
      gridId: grid.gridId,
      gridTitle: grid.title,
    }))
  );
  let filtered = allEntries;

  if (gridFilter) {
    filtered = filtered.filter((entry) => entry.gridId === Number(gridFilter));
  }
  if (statusFilter) {
    filtered = filtered.filter((entry) => entry.status === statusFilter);
  }
  if (keyword) {
    filtered = filtered.filter(
      (entry) =>
        entry.snippet.toLowerCase().includes(keyword) ||
        entry.source.toLowerCase().includes(keyword)
    );
  }

  setSearchResults(filtered);
  SearchModule.render();
}

// Render functions moved to separate modules

async function openLogModal(segmentId) {
  try {
    const data = await fetchSegmentLog(segmentId);
    renderLogList(logListEl, data.history);
  } catch (error) {
    console.warn("log 取得失敗，改用預設資料");
    renderLogList(logListEl, [
      { action: "inserted", similarity: 0.4, comment: "新段落寫入" },
      { action: "merged", similarity: 0.9, comment: "與既有摘要相似" },
    ]);
  }
  logModalEl.classList.add("visible");
}

closeModalBtn.addEventListener("click", () => logModalEl.classList.remove("visible"));
logModalEl.addEventListener("click", (event) => {
  if (event.target === logModalEl) {
    logModalEl.classList.remove("visible");
  }
});

searchInputEl.addEventListener("input", SearchModule.filter);
gridFilterEl.addEventListener("change", SearchModule.filter);
statusFilterEl.addEventListener("change", SearchModule.filter);
backButtonEl.addEventListener("click", handleBack);

async function handleSegmentSubmit(event) {
  event.preventDefault();
  const rawText = (segmentTextInput.value || "").trim();
  if (!rawText) {
    setSegmentStatus("請先貼上逐字稿內容", "error");
    return;
  }
  const source = (segmentSourceInput.value || "").trim() || "manual";
  const blocks = splitSegments(rawText);
  if (!blocks.length) {
    setSegmentStatus("無法解析段落，請再確認格式", "error");
    return;
  }

  const segments = blocks.map((text, index) => ({
    source,
    text,
    segment_id: `manual-${Date.now()}-${index}`,
    timestamp: new Date().toISOString(),
  }));

  segmentSubmitButton.disabled = true;
  setSegmentStatus("分類中...", "info");
  try {
    const result = await postSegments(segments);
    setSegmentStatus(`完成，上傳 ${segments.length} 段`, "success");
    pushToast(`已新增 ${segments.length} 段洞察`, "success");
    const preview = segments[0]?.text?.split("\n")[0] || "";
    if (preview) {
      pushToast(`首段：${preview.slice(0, 40)}${preview.length > 40 ? "…" : ""}`, "info");
    }
    addRecentSegments(segments.map((seg) => seg.segment_id));
    scheduleFreshClear();
    SegmentModule.renderResults(result.results || []);
    segmentTextInput.value = "";
    await loadGrids();
    MandalaModule.render();
  } catch (error) {
    console.error(error);
    setSegmentStatus("送出失敗，請稍後再試", "error");
  } finally {
    segmentSubmitButton.disabled = false;
  }
}

function splitSegments(rawText) {
  return rawText
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

function setSegmentStatus(message, type) {
  if (!segmentStatusEl) return;
  segmentStatusEl.textContent = message;
  segmentStatusEl.className = "";
  if (type) {
    segmentStatusEl.classList.add(type);
  }
}

function pushToast(message, type = "info", duration = 4000) {
  if (!toastStackEl) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastStackEl.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// gridHasFreshEntries and gridHasNeedsReview are imported from store.js

function scheduleFreshClear() {
  setClearFreshTimer(setTimeout(() => {
    import("./store.js").then(({ clearRecentSegments }) => {
      clearRecentSegments();
      MandalaModule.render();
    });
  }, 8000));
}

// Render functions moved to separate modules

const fallbackGrids = {
  grids: [
    {
      gridId: 1,
      title: "學員價值與定位",
      persona: "初/中階學員、家庭客",
      summary: [
        "本次新增：冬季體驗課的安全疑慮要提前告知家長",
        "加強行前 Q&A，減少臨時取消",
        "追蹤推薦轉換率，設置明確 CTA",
      ],
      updatedAt: "今天 09:30",
      needsReviewCount: 0,
      hasNewEntry: true,
      entries: [
        {
          segment_id: "seg-aw1",
          snippet: "冬季體驗課需要對家長說清楚裝備與保險細節。",
          source: "meeting-2024-09-20",
          status: "new_entry",
          confidence: 0.87,
          related_grids: [8],
        },
      ],
      needsReview: [],
      mandala: {
        centerTitle: "學員價值與定位",
        center:
          "最優先服務「想認真進步、需要被引導」的初～中階學員與重視安全的家庭客。",
        items: [
          {
            title: "初學者 Persona",
            detail: "第一次滑雪、怕跌倒、不熟裝備與雪場。",
          },
          {
            title: "回鍋進階者 Persona",
            detail: "上過幾堂課，卡在某個動作，想明顯進步。",
          },
          {
            title: "家庭／親子客 Persona",
            detail: "幫小孩／伴侶找「安全、有耐心」的教練。",
          },
          {
            title: "安全與風險感受",
            detail: "對「摔傷、迷路、遇到雷教練」有明顯擔心。",
          },
          {
            title: "價格帶與預算習慣",
            detail: "願意為「安心與明確進步」付中高價。",
          },
          {
            title: "學習目標類型",
            detail: "想拍好看影片、想跟團不拖油瓶、想穩穩自己滑。",
          },
          {
            title: "決策過程與猶豫點",
            detail: "不懂差別、怕踩雷、怕被推銷、資訊太散亂。",
          },
          {
            title: "關鍵價值主張",
            detail: "幫你挑適合的教練與課程，安全、好懂、有進步。",
          },
        ],
      },
    },
    {
      gridId: 2,
      title: "教練價值與合作",
      persona: "教練 / HR",
      summary: [
        "本次新增：核心教練要有專屬招募漏斗",
        "建立教案共創空間，並以 Slack 通知更新",
        "透明化分潤與排班指標",
      ],
      updatedAt: "昨天 18:45",
      needsReviewCount: 1,
      hasNewEntry: true,
      entries: [
        {
          segment_id: "seg-co1",
          snippet: "核心教練需要更清楚的排班透明度。",
          source: "coach-sync",
          status: "new_entry",
          confidence: 0.82,
          related_grids: [],
        },
      ],
      needsReview: [
        {
          segment_id: "seg-co2",
          snippet: "是否把合約更新同步給兼職教練？",
          source: "coach-sync",
          status: "needs_review",
          confidence: 0.59,
        },
      ],
      mandala: {
        centerTitle: "教練價值與合作",
        center: "讓專業、穩定的教練在 SKiDIY 帶課更省事、更穩定、更被尊重。",
        items: [
          { title: "理想教練特質", detail: "專業、安全意識高、願意溝通、有耐心。" },
          { title: "教練 Persona 分類", detail: "全職、季節、本業兼職教練。" },
          {
            title: "合作誘因",
            detail: "穩定生源、行政減少、可視化收入、專業品牌背書。",
          },
          {
            title: "分潤與收益",
            detail: "清楚的抽成與結算規則，不用猜、不怕被少算。",
          },
          {
            title: "教學支持",
            detail: "教案、教學影片、回饋工具、同儕交流。",
          },
          {
            title: "教練成長路徑",
            detail: "新進 → 穩定合作 → 核心教練 → 帶團隊／講師。",
          },
          {
            title: "合作溝通與承諾",
            detail: "堂數預期、檔期安排、休假與拒單自由度。",
          },
          {
            title: "教練品牌與曝光",
            detail: "個人頁面、學員評價、故事內容、社群露出。",
          },
        ],
      },
    },
    {
      gridId: 3,
      title: "品牌定位與商業模式",
      persona: "策略 / 商務",
      summary: [
        "本次新增：合約條款需保留 AI 建議的彈性",
        "日本市場與募資進展同步做定位驗證",
        "評估冬季票價與損益平衡",
      ],
      updatedAt: "今天 10:05",
      needsReviewCount: 0,
      hasNewEntry: true,
      entries: [
        {
          segment_id: "seg-agr",
          snippet: "合約 SOW 條款需要立即補進合作文件中。",
          source: "meeting",
          status: "new_entry",
          confidence: 0.91,
          related_grids: [8],
        },
      ],
      needsReview: [],
      mandala: {
        centerTitle: "品牌定位與商業模式",
        center: "專注滑雪教學的媒合與成長平台，課程與服務費為主、合作專案為輔。",
        items: [
          {
            title: "一句話定位",
            detail: "讓學員跟好教練，安心學會滑雪的平台。",
          },
          {
            title: "品牌關鍵字",
            detail: "安心、專業、透明、成長、社群。",
          },
          {
            title: "主要收入來源",
            detail: "課程媒合抽成、平台服務費、團體／企業方案。",
          },
          {
            title: "延伸收入來源",
            detail: "裝備導購、保險合作、講座內容、聯名活動。",
          },
          {
            title: "成本結構",
            detail: "人力、系統開發、行銷、金流工具。",
          },
          {
            title: "核心差異點",
            detail: "專注教學與成長，不是旅行社賣行程。",
          },
          {
            title: "市場階段假設",
            detail: "滑雪市場成長期，教育市場＋習慣養成。",
          },
          {
            title: "商業風險",
            detail: "季節性強、規模經濟未成、競品易模仿表面功能。",
          },
        ],
      },
    },
    {
      gridId: 4,
      title: "課程與產品設計",
      persona: "產品 / 課務",
      summary: [
        "維持課程分級與成果敘事",
        "記錄行前 / 課後 touchpoint",
        "特殊族群需求追蹤",
      ],
      updatedAt: "本週 08:00",
      needsReviewCount: 0,
      hasNewEntry: false,
      entries: [],
      needsReview: [],
      mandala: {
        centerTitle: "課程與產品設計",
        center: "為學員設計清楚的學習路徑與課程線，從入門到進階。",
        items: [
          { title: "課程分級架構", detail: "Lv1 初雪、Lv2 基礎轉彎、Lv3 刻滑入門…" },
          {
            title: "課程型態組合",
            detail: "團體班、半自組小團、1 對 1、親子班。",
          },
          {
            title: "課程包裝與命名",
            detail: "名稱清楚，讓學員一看就知道自己適合哪一級。",
          },
          {
            title: "學習目標與成果",
            detail: "每級對應可見成果（影片 / 動作清單）。",
          },
          {
            title: "行前準備模組",
            detail: "裝備指南、行前影片、常見問題、注意事項。",
          },
          {
            title: "課後延伸產品",
            detail: "線上回顧、動作分析、下一季推薦方案。",
          },
          {
            title: "特殊族群課程",
            detail: "女滑班、兒童班、銀髮族、安全入門班。",
          },
          {
            title: "產品組合策略",
            detail: "體驗 → 連續課程包 → 季度／年度成長計畫。",
          },
        ],
      },
    },
    {
      gridId: 5,
      title: "SKiDIY 核心目標",
      persona: "中心主題",
      summary: [
        "打造學員安心 × 教練穩定合作的平台",
        "守住安全、品質與成長三個北極星",
        "任何變更都不破壞既有體驗",
      ],
      updatedAt: "今天 11:00",
      needsReviewCount: 0,
      hasNewEntry: false,
      entries: [],
      needsReview: [],
      mandala: {
        centerTitle: "SKiDIY 核心目標",
        center: "打造學員安心進步 × 教練穩定合作的滑雪平台。",
        items: [
          {
            title: "① 學員價值與定位",
            detail: "服務想認真進步、重視安全的學員。",
            targetGridId: 1,
          },
          {
            title: "② 教練價值與合作",
            detail: "讓專業教練帶課省事又被尊重。",
            targetGridId: 2,
          },
          {
            title: "③ 品牌定位與商業模式",
            detail: "專注教學媒合，課程收入為核心。",
            targetGridId: 3,
          },
          {
            title: "④ 課程與產品設計",
            detail: "設計清楚的學習路徑與課程線。",
            targetGridId: 4,
          },
          {
            title: "⑥ 平台體驗與工具",
            detail: "網站／後台讓雙方都順暢。",
            targetGridId: 6,
          },
          {
            title: "⑦ 行銷流量與社群",
            detail: "內容與社群累積長期夥伴。",
            targetGridId: 7,
          },
          {
            title: "⑧ 營運流程與服務交付",
            detail: "報名到課後都有 SOP。",
            targetGridId: 8,
          },
          {
            title: "⑨ 數據系統與內部能力",
            detail: "指標與文件讓團隊越做越聰明。",
            targetGridId: 9,
          },
        ],
      },
    },
    {
      gridId: 6,
      title: "平台體驗與工具",
      persona: "產品 / 工程",
      summary: [
        "前台 / 後台的異常處理流程要標準化",
        "行程中心通知要有 SLA",
        "平台改善需支援營運 SOP",
      ],
      updatedAt: "昨天 14:20",
      needsReviewCount: 1,
      hasNewEntry: true,
      entries: [
        {
          segment_id: "seg-sys1",
          snippet: "教練申請流程需要自動化審核。",
          source: "ops",
          status: "new_entry",
          confidence: 0.84,
          related_grids: [8],
        },
      ],
      needsReview: [
        {
          segment_id: "seg-sys2",
          snippet: "開課追蹤要不要進 CRM？",
          source: "ops",
          status: "needs_review",
          confidence: 0.7,
        },
      ],
      mandala: {
        centerTitle: "平台體驗與工具",
        center: "讓學員與教練在網站／系統上輕鬆完成任務。",
        items: [
          { title: "學員前台體驗", detail: "找課、看教練、報名、付款一氣呵成。" },
          { title: "學員行程中心", detail: "一眼看到課程、時間、集合地點。" },
          { title: "教練後台首頁", detail: "課表、待確認訂單、提醒集中。" },
          { title: "通知與提醒系統", detail: "行前提醒、天候異動、課後問卷。" },
          { title: "管理後台功能", detail: "課程上架、教練管理、訂單與報表。" },
          { title: "多裝置適配", detail: "手機優先、桌機也清楚。" },
          { title: "異常情境處理", detail: "改期、取消、天候中止都有引導。" },
          { title: "體驗一致性與風格", detail: "視覺、文案、按鈕命名一致。" },
        ],
      },
    },
    {
      gridId: 7,
      title: "行銷流量與社群",
      persona: "行銷 / 社群",
      summary: [
        "品牌啟動會議鎖定冬季檔期",
        "社群漏斗要增加 lead scoring",
        "DBDB 建議先釐清差異化再推廣",
      ],
      updatedAt: "今天 09:50",
      needsReviewCount: 0,
      hasNewEntry: true,
      entries: [
        {
          segment_id: "seg-mkt1",
          snippet: "DBDB 建議先釐清品牌差異化再推廣。",
          source: "marketing",
          status: "new_entry",
          confidence: 0.83,
          related_grids: [3],
        },
      ],
      needsReview: [],
      mandala: {
        centerTitle: "行銷流量與社群",
        center: "把陌生流量變成學員，再變成長期夥伴。",
        items: [
          { title: "主戰場平台", detail: "IG、FB、YouTube、Line 官方／社群。" },
          { title: "內容主軸", detail: "教學知識、裝備攻略、雪場資訊、故事。" },
          { title: "雪季節奏", detail: "暖身 → 招生 → 收季回顧 → 冬後經營。" },
          { title: "導流與轉換", detail: "內容 → Line／社團 → 諮詢 → 報名。" },
          { title: "社群互動", detail: "問答、挑戰、聚會、徵故事／影片。" },
          { title: "口碑推薦", detail: "推薦碼、介紹好友優惠、心得小禮。" },
          { title: "內容產出流程", detail: "題目池、排程、範本、素材庫。" },
          { title: "成效指標", detail: "追蹤數、互動率、官網點擊、轉換比例。" },
        ],
      },
    },
    {
      gridId: 8,
      title: "營運流程與服務交付",
      persona: "營運 / 客服",
      summary: [
        "本次新增：附件 A 付款條件需要明確化",
        "教練媒合 / 開課追蹤自動化規格確定",
        "行動項目要綁定截止日期",
      ],
      updatedAt: "今天 10:20",
      needsReviewCount: 2,
      hasNewEntry: true,
      entries: [
        {
          segment_id: "seg-pay",
          snippet: "付款系統應透明，附件 A 狀態要顯示。",
          source: "meeting",
          status: "new_entry",
          confidence: 0.88,
          related_grids: [3],
        },
      ],
      needsReview: [
        {
          segment_id: "seg-pay2",
          snippet: "附件 A 的簽核是否要經過 DBA？",
          source: "meeting",
          status: "needs_review",
          confidence: 0.74,
        },
        {
          segment_id: "seg-pay3",
          snippet: "付款流程中缺少負責人指派。",
          source: "meeting",
          status: "needs_review",
          confidence: 0.71,
        },
      ],
      mandala: {
        centerTitle: "營運流程與服務交付",
        center: "把「報名 → 行前 → 當日上課 → 課後」變成穩定可複製的 SOP。",
        items: [
          {
            title: "報名與訂單建立",
            detail: "收到訂單 → 確認資訊完整 → 通知教練／夥伴。",
          },
          {
            title: "行前溝通 SOP",
            detail: "固定訊息模板：裝備、集合點、時間、注意安全。",
          },
          {
            title: "當日集合與報到",
            detail: "明確集合點、負責人、緊急聯絡方式。",
          },
          {
            title: "課中服務標準",
            detail: "時數、人數上限、休息安排、安全檢查。",
          },
          {
            title: "異常狀況流程",
            detail: "天候、延誤、受傷、設備問題的處理步驟。",
          },
          {
            title: "課後收尾與紀錄",
            detail: "教練回報上課情況、學生名單確認、照片整理。",
          },
          {
            title: "客服處理規則",
            detail: "改期、退款、抱怨的判準與回覆時限。",
          },
          {
            title: "營運檢討節奏",
            detail: "每週／每季檢討一次常見問題與流程優化點。",
          },
        ],
      },
    },
    {
      gridId: 9,
      title: "數據系統與內部能力",
      persona: "資料 / PM",
      summary: [
        "募資 900 萬進度需要 Dashboard 呈現",
        "營運績效與損益平衡分析要資料化",
        "系統優化排程需納入內部培訓",
      ],
      updatedAt: "今天 09:05",
      needsReviewCount: 1,
      hasNewEntry: true,
      entries: [
        {
          segment_id: "seg-data1",
          snippet: "損益平衡分析需要完整儀表板。",
          source: "finance",
          status: "new_entry",
          confidence: 0.81,
          related_grids: [8],
        },
      ],
      needsReview: [
        {
          segment_id: "seg-data2",
          snippet: "募資數據是否可公開？",
          source: "finance",
          status: "needs_review",
          confidence: 0.68,
        },
      ],
      mandala: {
        centerTitle: "數據系統與內部能力",
        center: "用指標與知識庫累積經驗，讓團隊越做越聰明。",
        items: [
          { title: "北極星指標", detail: "如：每季完成 ≥2 堂課的活躍學員數。" },
          {
            title: "關鍵營運指標",
            detail: "報名量、轉換率、回頭率、教練合作留存。",
          },
          {
            title: "行銷與漏斗指標",
            detail: "流量、互動率、社群轉報名比例。",
          },
          {
            title: "教學與滿意度",
            detail: "課後評分、推薦意願、投訴率。",
          },
          {
            title: "資料收集與工具",
            detail: "GA、表單、Dashboard、手動記錄。",
          },
          {
            title: "知識庫與文件化",
            detail: "SOP、決策紀錄、專案回顧放在 Notion / 雲端。",
          },
          {
            title: "內部培訓與 Onboarding",
            detail: "SKiDIY 101、流程與工具教學。",
          },
          {
            title: "檢討與迭代習慣",
            detail: "季末回顧會：看數據、談心得、調整重點。",
          },
        ],
      },
    },
  ],
};

init();
