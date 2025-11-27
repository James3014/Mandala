export const ROOT_GRID_ID = 5;

const initialState = {
    grids: [],
    currentGridId: ROOT_GRID_ID,
    mandalaStack: [],
    searchResults: [],
    viewMode: "single",
    recentSegmentIds: new Set(),
    clearFreshTimer: null,
};

// Simple reactive state
export const state = { ...initialState };

const listeners = new Set();

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function notify() {
    listeners.forEach((listener) => listener(state));
}

// --- Actions ---

export function setGrids(newGrids) {
    state.grids = newGrids;
    notify();
}

export function getGrid(gridId) {
    return state.grids.find((item) => item.gridId === gridId);
}

export function setCurrentGridId(gridId) {
    state.currentGridId = gridId;
    notify();
}

export function setViewMode(mode) {
    state.viewMode = mode;
    notify();
}

export function setSearchResults(results) {
    state.searchResults = results;
    notify();
}

export function addRecentSegments(segmentIds) {
    state.recentSegmentIds = new Set([...state.recentSegmentIds, ...segmentIds]);
    notify();
}

export function clearRecentSegments() {
    state.recentSegmentIds.clear();
    notify();
}

export function setClearFreshTimer(timerId) {
    if (state.clearFreshTimer) {
        clearTimeout(state.clearFreshTimer);
    }
    state.clearFreshTimer = timerId;
}

// Stack Navigation
export function pushToStack(gridId) {
    state.mandalaStack.push(gridId);
}

export function popFromStack() {
    return state.mandalaStack.pop();
}

export function resetStack() {
    state.mandalaStack = [];
}

export function getStackPath() {
    return [...state.mandalaStack, state.currentGridId]
        .map((id) => getGrid(id)?.title || `#${id}`)
        .join(" › ");
}

// Helpers
export function gridHasFreshEntries(grid) {
    if (!grid || !grid.entries) {
        return false;
    }
    return grid.entries.some((entry) => state.recentSegmentIds.has(entry.segment_id));
}

export function gridHasNeedsReview(grid) {
    if (!grid) return false;
    const list = grid.needsReview || grid.needs_review || [];
    return list.length > 0;
}
