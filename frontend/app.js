import { fetchSegmentLog } from "./api.js";
import {
  getState,
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

// Centralized DOM Elements
const DOM = {
  appBody: document.querySelector(".app-body"),
  gridBoard: document.getElementById("gridBoard"),
  overviewBoard: document.getElementById("overviewBoard"),
  detailPanel: document.getElementById("detailPanel"),
  gridFilter: document.getElementById("gridFilter"),
  statusFilter: document.getElementById("statusFilter"),
  searchInput: document.getElementById("searchInput"),
  resultCount: document.getElementById("resultCount"),
  resultsList: document.getElementById("resultsList"),
  logModal: document.getElementById("logModal"),
  logList: document.getElementById("logList"),
  closeModal: document.getElementById("closeModal"),
  backButton: document.getElementById("backButton"),
  breadcrumb: document.getElementById("mandalaBreadcrumb"),
  viewModeInputs: document.querySelectorAll('input[name="viewMode"]'),
  segmentForm: document.getElementById("segmentForm"),
  segmentFormSection: document.querySelector(".segment-form"),
  segmentSource: document.getElementById("segmentSource"),
  segmentText: document.getElementById("segmentText"),
  segmentStatus: document.getElementById("segmentStatus"),
  segmentSubmit: document.getElementById("segmentSubmit"),
  toastStack: document.getElementById("toastStack"),
  ingestResults: document.getElementById("ingestResults"),
  ingestTableBody: document.getElementById("ingestTableBody"),
  loadingIndicator: document.getElementById("loadingIndicator"),
};

function showLoading() {
  DOM.loadingIndicator?.classList.remove("hidden");
}

function hideLoading() {
  DOM.loadingIndicator?.classList.add("hidden");
}

const handleNavigate = (targetGridId) => {
  setViewMode("single");
  NavigationModule.drillDown(targetGridId);
  MandalaModule.render();
};

const MandalaModule = {
  render: render,
  renderBoard: () => renderMandalaBoard(DOM.gridBoard, DOM.detailPanel, handleNavigate),
  renderOverview: () => renderOverviewBoard(DOM.overviewBoard, handleNavigate),
  renderDetail: () => renderDetailPanel(DOM.detailPanel, getGrid(getState().currentGridId), DOM.logModal, DOM.logList),
  updateControls: () => NavigationModule.updateControls(DOM.breadcrumb),
};

async function init() {
  console.log("[init] 開始初始化");
  showLoading();
  try {
    await loadGrids();
    console.log("[init] loadGrids 完成，state.grids.length:", getState().grids.length);
    populateGridFilter();
  } finally {
    hideLoading();
  }

  // Event Listeners
  DOM.viewModeInputs.forEach((input) =>
    input.addEventListener("change", (event) => setViewModeHandler(event.target.value))
  );

  if (DOM.segmentForm) {
    DOM.segmentForm.addEventListener("submit", (e) => SegmentModule.submit(e, {
      segmentTextInput: DOM.segmentText,
      segmentSourceInput: DOM.segmentSource,
      segmentStatusEl: DOM.segmentStatus,
      segmentSubmitButton: DOM.segmentSubmit,
      toastStackEl: DOM.toastStack,
      ingestResultsEl: DOM.ingestResults,
      ingestTableBodyEl: DOM.ingestTableBody
    }, { onRender: MandalaModule.render }));
  }

  DOM.searchInput.addEventListener("input", handleSearch);
  DOM.gridFilter.addEventListener("change", handleSearch);
  DOM.statusFilter.addEventListener("change", handleSearch);

  DOM.backButton.addEventListener("click", () => {
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
  getState().grids.forEach((grid) => {
    const option = document.createElement("option");
    option.value = grid.gridId;
    option.textContent = `${grid.gridId} ${grid.title}`;
    DOM.gridFilter.appendChild(option);
  });
}

function render() {
  const state = getState();
  console.log(`[render] Current viewMode: '${state.viewMode}'`);
  
  // Update radio buttons
  DOM.viewModeInputs.forEach(input => {
    input.checked = input.value === state.viewMode;
  });
  
  if (state.viewMode === "single") {
    DOM.appBody.classList.remove("overview-mode");
    DOM.gridBoard.classList.remove("hidden");
    DOM.overviewBoard.classList.add("hidden");
    DOM.detailPanel.classList.remove("hidden");
    DOM.segmentFormSection.classList.remove("hidden");
    DOM.backButton.disabled =
      state.currentGridId === ROOT_GRID_ID && state.mandalaStack.length === 0;
    MandalaModule.renderBoard();
    MandalaModule.renderDetail();
  } else {
    console.log("[render] Switch to overview mode");
    DOM.appBody.classList.add("overview-mode");
    DOM.gridBoard.classList.add("hidden");
    DOM.overviewBoard.classList.remove("hidden");
    DOM.detailPanel.classList.add("hidden");
    DOM.segmentFormSection.classList.add("hidden");
    DOM.backButton.disabled = true;
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
  SearchModule.filter(DOM.searchInput, DOM.gridFilter, DOM.statusFilter, DOM.resultsList, DOM.resultCount, DOM.detailPanel, handleNavigate);
}

// Log Modal Logic (kept here for now as it interacts with DOM directly and is simple)
async function openLogModal(segmentId) {
  try {
    const data = await fetchSegmentLog(segmentId);
    renderLogList(DOM.logList, data.history);
  } catch (error) {
    console.warn("log 取得失敗，改用預設資料");
    renderLogList(DOM.logList, [
      { action: "inserted", similarity: 0.4, comment: "新段落寫入" },
      { action: "merged", similarity: 0.9, comment: "與既有摘要相似" },
    ]);
  }
  DOM.logModal.classList.add("visible");
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

DOM.closeModal.addEventListener("click", () => DOM.logModal.classList.remove("visible"));
DOM.logModal.addEventListener("click", (event) => {
  if (event.target === DOM.logModal) {
    DOM.logModal.classList.remove("visible");
  }
});

init();
