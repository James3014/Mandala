import { state } from "./store.js";
import { getSegmentLog } from "./actions.js";

export function renderDetailPanel(detailPanelEl, grid, logModalEl, logListEl) {
    if (!grid) {
        detailPanelEl.innerHTML =
            "<div class='placeholder'><h2>沒有資料</h2><p>請確認 API 是否回傳內容。</p></div>";
        return;
    }
    detailPanelEl.innerHTML = `
    <header>
      <p class="grid-id">#${grid.gridId}</p>
      <h2>${grid.title}</h2>
      <p>
        ${grid.persona}
        ${grid.needsReview?.length
            ? `<span class="detail-needs-review">需覆核 ${grid.needsReview.length}</span>`
            : ""
        }
      </p>
    </header>
    <section>
      <div class="section-header"><h3>Summary</h3><small>維持 3-5 條</small></div>
      <ul class="summary-list">
        ${grid.summary.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </section>
    <section class="entries">
      <div class="section-header">
        <h3>Entries (${grid.entries.length})</h3>
      </div>
      <ul class="entries-list">
        ${grid.entries.map(renderEntry).join("")}
      </ul>
    </section>
    <section>
      <div class="section-header">
        <h3>Needs Review (${grid.needsReview.length})</h3>
      </div>
      <ul class="needs-review-list">
        ${grid.needsReview.length
            ? grid.needsReview.map(renderEntry).join("")
            : "<li>無待覆核段落</li>"
        }
      </ul>
    </section>
    ${renderMandalaDetail(grid)}
  `;

    detailPanelEl.querySelectorAll(".action-view-log").forEach((button) => {
        button.addEventListener("click", () => openLogModal(button.dataset.segmentId, logModalEl, logListEl));
    });
}

function renderEntry(entry) {
    const classes = ["entry"];
    if (state.recentSegmentIds.has(entry.segment_id)) {
        classes.push("fresh");
    }
    if (entry.status === "needs_review") {
        classes.push("needs-review");
    }
    return `
    <li class="${classes.join(" ")}">
      <div>
        <p class="snippet">${entry.snippet}</p>
        <small class="meta">
          ${entry.source} · ${entry.status} · conf ${entry.confidence}
          ${entry.related_grids?.length ? ` · related ${entry.related_grids.join(",")}` : ""}
        </small>
      </div>
      <button class="action-view-log" data-segment-id="${entry.segment_id}">
        查看 Log
      </button>
    </li>
  `;
}

function renderMandalaDetail(grid) {
    if (!grid.mandala || !grid.mandala.items?.length) {
        return "";
    }

    return `
    <section class="mandala-section">
      <div class="section-header">
        <h3>曼陀羅展開</h3>
        <small>中心 + 外圈 8 格</small>
      </div>
      <div class="mandala-center">
        <strong>${grid.mandala.centerTitle || grid.title}</strong>
        <p>${grid.mandala.center}</p>
      </div>
      <div class="mandala-grid">
        ${grid.mandala.items
            .map(
                (item) => `
              <article class="mandala-item">
                <h4>${item.title}</h4>
                <p>${item.detail}</p>
              </article>
            `
            )
            .join("")}
      </div>
    </section>
  `;
}

async function openLogModal(segmentId, logModalEl, logListEl) {
    const history = await getSegmentLog(segmentId);
    renderLogList(logListEl, history);
    logModalEl.classList.add("visible");
}

function renderLogList(logListEl, entries) {
    logListEl.innerHTML = entries
        .map(
            (log) => `
        <li>
          <strong>${log.action}</strong>
          <span>similarity ${log.similarity}</span>
          <p>${log.comment || ""}</p>
        </li>
      `
        )
        .join("");
}
