import { postSegments } from "../api.js";
import { addRecentSegments, setClearFreshTimer, clearRecentSegments } from "../store.js";
import { renderIngestResults } from "../renderIngest.js";
import { loadGrids } from "./data.js";

export const SegmentModule = {
    submit: async (event, elements, callbacks) => {
        event.preventDefault();
        const {
            segmentTextInput,
            segmentSourceInput,
            segmentStatusEl,
            segmentSubmitButton,
            toastStackEl,
            ingestResultsEl,
            ingestTableBodyEl
        } = elements;

        const rawText = (segmentTextInput.value || "").trim();
        if (!rawText) {
            setSegmentStatus(segmentStatusEl, "請先貼上逐字稿內容", "error");
            return;
        }
        const source = (segmentSourceInput.value || "").trim() || "manual";
        const blocks = splitSegments(rawText);
        if (!blocks.length) {
            setSegmentStatus(segmentStatusEl, "無法解析段落，請再確認格式", "error");
            return;
        }

        const segments = blocks.map((text, index) => ({
            source,
            text,
            segment_id: `manual-${Date.now()}-${index}`,
            timestamp: new Date().toISOString(),
        }));

        segmentSubmitButton.disabled = true;
        setSegmentStatus(segmentStatusEl, "分類中...", "info");
        try {
            const result = await postSegments(segments);
            setSegmentStatus(segmentStatusEl, `完成，上傳 ${segments.length} 段`, "success");
            pushToast(toastStackEl, `已新增 ${segments.length} 段洞察`, "success");
            const preview = segments[0]?.text?.split("\n")[0] || "";
            if (preview) {
                pushToast(toastStackEl, `首段：${preview.slice(0, 40)}${preview.length > 40 ? "…" : ""}`, "info");
            }
            addRecentSegments(segments.map((seg) => seg.segment_id));
            scheduleFreshClear(callbacks.onRender);
            renderIngestResults(ingestResultsEl, ingestTableBodyEl, result.results || []);
            segmentTextInput.value = "";

            // Reload grids and trigger render
            await loadGrids();
            if (callbacks.onRender) callbacks.onRender();

        } catch (error) {
            console.error(error);
            setSegmentStatus(segmentStatusEl, "送出失敗，請稍後再試", "error");
        } finally {
            segmentSubmitButton.disabled = false;
        }
    },
};

function splitSegments(rawText) {
    return rawText
        .split(/\n\s*\n+/)
        .map((block) => block.trim())
        .filter((block) => block.length > 0);
}

function setSegmentStatus(el, message, type) {
    if (!el) return;
    el.textContent = message;
    el.className = "";
    if (type) {
        el.classList.add(type);
    }
}

function pushToast(el, message, type = "info", duration = 4000) {
    if (!el) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    el.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

function scheduleFreshClear(onRender) {
    setClearFreshTimer(setTimeout(() => {
        clearRecentSegments();
        if (onRender) onRender();
    }, 8000));
}
