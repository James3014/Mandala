import {
    state,
    pushToStack,
    popFromStack,
    resetStack,
    setCurrentGridId,
    ROOT_GRID_ID,
    fetchSegmentLog,
} from "./store.js";
import { fetchSegmentLog as apiFetchSegmentLog } from "./api.js";

export function drillDown(targetGridId) {
    pushToStack(state.currentGridId);
    setCurrentGridId(targetGridId);
}

export function handleBack() {
    const prev = popFromStack();
    if (prev) {
        setCurrentGridId(prev);
    } else {
        setCurrentGridId(ROOT_GRID_ID);
    }
}

export function jumpToGrid(gridId) {
    if (gridId === ROOT_GRID_ID) {
        resetStack();
    } else {
        resetStack();
        pushToStack(ROOT_GRID_ID);
    }
    setCurrentGridId(gridId);
}

export async function getSegmentLog(segmentId) {
    try {
        const data = await apiFetchSegmentLog(segmentId);
        return data.history;
    } catch (error) {
        console.warn("log 取得失敗，改用預設資料");
        return [
            { action: "inserted", similarity: 0.4, comment: "新段落寫入" },
            { action: "merged", similarity: 0.9, comment: "與既有摘要相似" },
        ];
    }
}
