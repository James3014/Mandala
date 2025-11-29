import { fetchSegmentLog } from "./api.js";
import {
  state,
  getGrid,
  setViewMode,
  ROOT_GRID_ID,
  subscribe,
} from "./store.js";
import { renderMandalaBoard, renderOverviewBoard } from "./renderBoard.js";
import { renderDetailPanel } from "./renderDetail.js";
import { renderSearchResults } from "./renderSearch.js";
import { loadGrids } from "./modules/data.js";
import { SearchModule } from "./modules/search.js";
import { NavigationModule } from "./modules/navigation.js";
import { SegmentModule } from "./modules/segment.js";

// DOM Elements
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
const segmentFormSectionEl = document.querySelector(".segment-form");
const segmentSourceInput = document.getElementById("segmentSource");
const segmentTextInput = document.getElementById("segmentText");
const segmentStatusEl = document.getElementById("segmentStatus");
const segmentSubmitButton = document.getElementById("segmentSubmit");
const toastStackEl = document.getElementById("toastStack");
const ingestResultsEl = document.getElementById("ingestResults");
const ingestTableBodyEl = document.getElementById("ingestTableBody");

const MandalaModule = {
  render: render,
  renderBoard: () => {
    const handleNavigate = (targetGridId) => {
      NavigationModule.drillDown(targetGridId);
      MandalaModule.render();
    };
    renderMandalaBoard(gridBoardEl, detailPanelEl, handleNavigate);
  },
  renderOverview: () => renderOverviewBoard(overviewBoardEl, handleNavigate),
  renderDetail: () => renderDetailPanel(detailPanelEl, getGrid(state.currentGridId), logModalEl, logListEl),
  updateControls: () => NavigationModule.updateControls(breadcrumbEl),
};

async function init() {
  console.log("[init] 開始初始化");
  await loadGrids();
  console.log("[init] loadGrids 完成，state.grids.length:", state.grids.length);
  populateGridFilter();

  // Event Listeners
  viewModeInputs.forEach((input) =>
    input.addEventListener("change", (event) => setViewModeHandler(event.target.value))
  );

  if (segmentFormEl) {
    segmentFormEl.addEventListener("submit", (e) => SegmentModule.submit(e, {
      segmentTextInput,
      segmentSourceInput,
      segmentStatusEl,
      segmentSubmitButton,
      toastStackEl,
      ingestResultsEl,
      ingestTableBodyEl
    }, { onRender: MandalaModule.render }));
  }

  searchInputEl.addEventListener("input", handleSearch);
  gridFilterEl.addEventListener("change", handleSearch);
  statusFilterEl.addEventListener("change", handleSearch);

  backButtonEl.addEventListener("click", () => {
    NavigationModule.handleBack();
    MandalaModule.render();
  });

  // Initial Render
  MandalaModule.render();
}

// Subscribe to state changes
subscribe(() => {
  // We could auto-render here, but keeping manual for now to match original flow
  // except for navigation which we might want to trigger updates
});

function populateGridFilter() {
  state.grids.forEach((grid) => {
    const option = document.createElement("option");
    option.value = grid.gridId;
    option.textContent = `${grid.gridId} ${grid.title}`;
    gridFilterEl.appendChild(option);
  });
}

function render() {
  console.log(`[render] Current viewMode: '${state.viewMode}'`);
  if (state.viewMode === "single") {
    appBodyEl.classList.remove("overview-mode");
    gridBoardEl.classList.remove("hidden");
    overviewBoardEl.classList.add("hidden");
    detailPanelEl.classList.remove("hidden");
    segmentFormSectionEl.classList.remove("hidden");
    backButtonEl.disabled =
      state.currentGridId === ROOT_GRID_ID && state.mandalaStack.length === 0;
    MandalaModule.renderBoard();
    MandalaModule.renderDetail();
  } else {
    console.log("[render] Switch to overview mode");
    appBodyEl.classList.add("overview-mode");
    gridBoardEl.classList.add("hidden");
    overviewBoardEl.classList.remove("hidden");
    detailPanelEl.classList.add("hidden");
    segmentFormSectionEl.classList.add("hidden");
    backButtonEl.disabled = true;
    MandalaModule.renderOverview();
  }
  MandalaModule.updateControls();
}

function setViewModeHandler(mode) {
  setViewMode(mode);
  MandalaModule.render();
}

function handleSearch() {
  const handleNavigate = (targetGridId) => {
    NavigationModule.jumpToGrid(targetGridId);
    MandalaModule.render();
  };
  SearchModule.filter(searchInputEl, gridFilterEl, statusFilterEl, resultsListEl, resultCountEl, detailPanelEl, handleNavigate);
}

// Log Modal Logic (kept here for now as it interacts with DOM directly and is simple)
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

function renderLogList(container, history) {
  container.innerHTML = "";
  history.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.action} - ${item.comment} (Sim: ${item.similarity})`;
    container.appendChild(li);
  });
}

// Expose openLogModal globally if needed by renderDetail
window.openLogModal = openLogModal;

closeModalBtn.addEventListener("click", () => logModalEl.classList.remove("visible"));
logModalEl.addEventListener("click", (event) => {
  if (event.target === logModalEl) {
    logModalEl.classList.remove("visible");
  }
});

init();
