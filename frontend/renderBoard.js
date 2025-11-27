import { state, getGrid, gridHasFreshEntries, gridHasNeedsReview } from "./store.js";
import { drillDown } from "./actions.js";

export function renderMandalaBoard(gridBoardEl, detailPanelEl) {
    gridBoardEl.innerHTML = "";
    const template = document.getElementById("gridCardTemplate");
    const grid = getGrid(state.currentGridId);

    if (!grid) {
        gridBoardEl.innerHTML =
            "<div class='empty-state'>尚未載入任何格子，請確認 API 或 fallback 資料。</div>";
        detailPanelEl.innerHTML =
            "<div class='placeholder'><h2>沒有資料</h2><p>請先貼入逐字稿或檢查伺服器。</p></div>";
        return;
    }

    const mandala = buildMandala(grid);
    const slotOrder = [
        { slot: 1, itemIndex: 0 },
        { slot: 2, itemIndex: 1 },
        { slot: 3, itemIndex: 2 },
        { slot: 4, itemIndex: 3 },
        { slot: 5, itemIndex: null },
        { slot: 6, itemIndex: 4 },
        { slot: 7, itemIndex: 5 },
        { slot: 8, itemIndex: 6 },
        { slot: 9, itemIndex: 7 },
    ];

    slotOrder.forEach(({ slot, itemIndex }) => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector(".grid-card");
        card.classList.add(`slot-${slot}`);
        let targetGrid = null;

        if (slot === 5) {
            card.classList.add("center");
            clone.querySelector(".grid-id").textContent = `#${grid.gridId}`;
            clone.querySelector(".grid-title").textContent =
                mandala.centerTitle || grid.title;
            clone.querySelector(".grid-detail").textContent = mandala.center || "";
            clone.querySelector(".grid-note").textContent = grid.persona || "";
            targetGrid = grid;
        } else if (mandala.items[itemIndex]) {
            const item = mandala.items[itemIndex];
            card.classList.add("outer");
            clone.querySelector(".grid-id").textContent = item.targetGridId
                ? `#${item.targetGridId}`
                : "•";
            clone.querySelector(".grid-title").textContent = item.title;
            clone.querySelector(".grid-detail").textContent = item.detail;
            clone.querySelector(".grid-note").textContent = item.targetGridId
                ? "點擊展開"
                : "";
            if (item.targetGridId) {
                card.addEventListener("click", () => drillDown(item.targetGridId));
                targetGrid = getGrid(item.targetGridId);
            }
        } else {
            clone.querySelector(".grid-title").textContent = "";
            clone.querySelector(".grid-detail").textContent = "";
        }

        const needsCount = (targetGrid?.needsReview?.length || 0);
        const flag = card.querySelector(".needs-review-flag");
        if (flag) {
            if (needsCount > 0) {
                flag.textContent = `需覆核 ${needsCount}`;
                flag.classList.remove("hidden");
                card.classList.add("has-review");
            } else {
                flag.classList.add("hidden");
                card.classList.remove("has-review");
            }
        }

        if (targetGrid && gridHasFreshEntries(targetGrid)) {
            card.classList.add("fresh");
        }

        gridBoardEl.appendChild(clone);
    });
}

function buildMandala(grid) {
    if (grid.mandala) {
        return grid.mandala;
    }
    return {
        centerTitle: grid.title,
        center: grid.summary[0] || "",
        items: [],
    };
}

export function renderOverviewBoard(overviewBoardEl) {
    overviewBoardEl.innerHTML = "";
    const ordered = [...state.grids].sort((a, b) => a.gridId - b.gridId);

    ordered.forEach((grid) => {
        const mandala = buildMandala(grid);
        const article = document.createElement("article");
        article.className = "overview-mandala";
        if (gridHasFreshEntries(grid)) {
            article.classList.add("fresh");
        }
        if (gridHasNeedsReview(grid)) {
            article.classList.add("has-review");
        }
        article.innerHTML = `
      <h3>#${grid.gridId} ${grid.title}</h3>
      <div class="mini-grid">
        ${buildMiniCells(grid, mandala).join("")}
      </div>
    `;
        overviewBoardEl.appendChild(article);
    });
}

function buildMiniCells(grid, mandala) {
    const cells = [];
    const slots = [
        mandala.items[0],
        mandala.items[1],
        mandala.items[2],
        mandala.items[3],
        null,
        mandala.items[4],
        mandala.items[5],
        mandala.items[6],
        mandala.items[7],
    ];
    slots.forEach((item, index) => {
        if (index === 4) {
            cells.push(
                `<div class="mini-cell center"><strong>${grid.gridId}</strong><span>${mandala.centerTitle || grid.title}</span></div>`
            );
        } else if (item) {
            cells.push(
                `<div class="mini-cell"><strong>${item.title}</strong><span>${item.detail}</span></div>`
            );
        } else {
            cells.push('<div class="mini-cell"></div>');
        }
    });
    return cells;
}
