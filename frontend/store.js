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

// Simple reactive state with immutability
let state = { ...initialState };

const listeners = new Set();

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function notify() {
    listeners.forEach((listener) => listener(state));
}

function updateState(updates) {
    state = { ...state, ...updates };
    notify();
}

// --- Actions ---

export function setGrids(newGrids) {
    updateState({ grids: [...newGrids] });
}

export function getGrid(gridId) {
    return state.grids.find((item) => item.gridId === gridId);
}

export function getState() {
    return state;
}

export function setCurrentGridId(gridId) {
    updateState({ currentGridId: gridId });
}

export function setViewMode(mode) {
    console.log(`[setViewMode] Changing viewMode from '${state.viewMode}' to '${mode}'`);
    updateState({ viewMode: mode });
}

export function setSearchResults(results) {
    updateState({ searchResults: [...results] });
}

export function addRecentSegments(segmentIds) {
    updateState({ recentSegmentIds: new Set([...state.recentSegmentIds, ...segmentIds]) });
}

export function clearRecentSegments() {
    updateState({ recentSegmentIds: new Set() });
}

export function setClearFreshTimer(timerId) {
    if (state.clearFreshTimer) {
        clearTimeout(state.clearFreshTimer);
    }
    updateState({ clearFreshTimer: timerId });
}

// Stack Navigation
export function pushToStack(gridId) {
    updateState({ mandalaStack: [...state.mandalaStack, gridId] });
}

export function popFromStack() {
    const stack = [...state.mandalaStack];
    const popped = stack.pop();
    updateState({ mandalaStack: stack });
    return popped;
}

export function resetStack() {
    updateState({ mandalaStack: [] });
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
