import { state, getGrid, gridHasFreshEntries, gridHasNeedsReview } from "./store.js";
import { NavigationModule } from "./modules/navigation.js";

export function renderMandalaBoard(gridBoardEl, detailPanelEl) {
    gridBoardEl.innerHTML = "";
    const template = document.getElementById("gridCardTemplate");
    const grid = getGrid(state.currentGridId);

    if (!grid) {
        renderEmptyState(gridBoardEl, detailPanelEl);
        return;
    }

    const mandala = buildMandala(grid);

    for (let slot = 1; slot <= 9; slot++) {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector(".grid-card");
        card.classList.add(`slot-${slot}`);

        if (slot === 5) {
            renderCenterCard(card, clone, grid, mandala);
        } else {
            renderItemCard(card, clone, slot, mandala);
        }

        gridBoardEl.appendChild(clone);
    }
}

function renderEmptyState(gridBoardEl, detailPanelEl) {
    gridBoardEl.innerHTML =
        "<div class='empty-state'>尚未載入任何格子，請確認 API 或 fallback 資料。</div>";
    detailPanelEl.innerHTML =
        "<div class='placeholder'><h2>沒有資料</h2><p>請先貼入逐字稿或檢查伺服器。</p></div>";
}

function renderCenterCard(card, clone, grid, mandala) {
    card.classList.add("center");
    clone.querySelector(".grid-id").textContent = `#${grid.gridId}`;
    clone.querySelector(".grid-title").textContent = mandala.centerTitle || grid.title;
    clone.querySelector(".grid-detail").textContent = mandala.center || "";
    clone.querySelector(".grid-note").textContent = grid.persona || "";

    if (gridHasFreshEntries(grid)) {
        card.classList.add("fresh");
    }
}

function renderItemCard(card, clone, slot, mandala) {
    // Calculate item index: Slots 1-4 map to 0-3, Slots 6-9 map to 4-7
    const itemIndex = slot < 5 ? slot - 1 : slot - 2;
    const item = mandala.items[itemIndex];

    if (item) {
        card.classList.add("outer");
        clone.querySelector(".grid-id").textContent = item.targetGridId ? `#${item.targetGridId}` : "•";
        clone.querySelector(".grid-title").textContent = item.title;
        clone.querySelector(".grid-detail").textContent = item.detail;
        clone.querySelector(".grid-note").textContent = item.targetGridId ? "點擊展開" : "";

        if (item.targetGridId) {
            card.addEventListener("click", () => NavigationModule.drillDown(item.targetGridId));
            const targetGrid = getGrid(item.targetGridId);
            updateReviewStatus(card, targetGrid);
            if (targetGrid && gridHasFreshEntries(targetGrid)) {
                card.classList.add("fresh");
            }
        }
    } else {
        clone.querySelector(".grid-title").textContent = "";
        clone.querySelector(".grid-detail").textContent = "";
    }
}

function updateReviewStatus(card, targetGrid) {
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
    for (let slot = 1; slot <= 9; slot++) {
        if (slot === 5) {
            cells.push(
                `<div class="mini-cell center"><strong>${grid.gridId}</strong><span>${mandala.centerTitle || grid.title}</span></div>`
            );
        } else {
            const itemIndex = slot < 5 ? slot - 1 : slot - 2;
            const item = mandala.items[itemIndex];
            if (item) {
                cells.push(
                    `<div class="mini-cell"><strong>${item.title}</strong><span>${item.detail}</span></div>`
                );
            } else {
                cells.push('<div class="mini-cell"></div>');
            }
        }
    }
    return cells;
}
