import { fetchGrids } from "../api.js";
import { setGrids } from "../store.js";
import { fallbackGrids } from "../data/fallback.js";

export async function loadGrids() {
    try {
        console.log("正在嘗試從 API 載入資料...");
        const data = await fetchGrids();
        if (data && data.grids && data.grids.length > 0) {
            console.log("API 資料載入成功，共", data.grids.length, "筆");
            setGrids(data.grids.map(normalizeGrid));
        } else {
            console.warn("API 回傳資料為空，改用內建假資料");
            setGrids(fallbackGrids.grids);
        }
    } catch (error) {
        console.warn(
            "載入 API 失敗，改用內建假資料。請執行 `python serve.py` 以啟用後端 API。",
            error
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
