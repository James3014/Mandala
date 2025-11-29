import { getGrid, gridHasFreshEntries, gridHasNeedsReview, ROOT_GRID_ID, getState } from "./store.js";
import { NavigationModule } from "./modules/navigation.js";

export function renderMandalaBoard(gridBoardEl, detailPanelEl, onNavigate) {
    const state = getState();
    console.log("[renderMandalaBoard] 開始渲染，currentGridId:", state.currentGridId);
    gridBoardEl.innerHTML = "";
    const template = document.getElementById("gridCardTemplate");
    const grid = getGrid(state.currentGridId);

    if (!grid) {
        console.warn("[renderMandalaBoard] 無法取得grid资料，currentGridId:", state.currentGridId, "state.grids:", state.grids);
        renderEmptyState(gridBoardEl, detailPanelEl);
        return;
    }

    console.log("[renderMandalaBoard] 成功取得grid:", grid.title);
    const mandala = buildMandala(grid);

    for (let slot = 1; slot <= 9; slot++) {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector(".grid-card");
        card.classList.add(`slot-${slot}`);

        if (slot === 5) {
            renderCenterCard(card, clone, grid, mandala);
        } else {
            renderItemCard(card, clone, slot, mandala, onNavigate);
        }

        gridBoardEl.appendChild(clone);
    }
    console.log("[renderMandalaBoard] 渲染完成，已加入", gridBoardEl.children.length, "個格子");
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

function renderItemCard(card, clone, slot, mandala, onNavigate) {
    // Calculate item index: Slots 1-4 map to 0-3, Slots 6-9 map to 4-7
    const itemIndex = slot < 5 ? slot - 1 : slot - 2;
    const item = mandala.items[itemIndex];

    if (item) {
        card.classList.add("outer");
        clone.querySelector(".grid-id").textContent = item.targetGridId ? `#${item.targetGridId}` : "•";
        clone.querySelector(".grid-title").textContent = item.title;
        clone.querySelector(".grid-detail").textContent = item.detail;
        clone.querySelector(".grid-note").textContent = item.targetGridId ? "點擊展開" : "";

        if (item.targetGridId && onNavigate) {
            card.addEventListener("click", () => onNavigate(item.targetGridId));
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

export function renderOverviewBoard(overviewBoardEl, onNavigate) {
    console.log("[renderOverviewBoard] 渲染 9×9 曼陀羅總覽");
    overviewBoardEl.innerHTML = "";

    const rootGrid = getState().grids.find(g => g.gridId === ROOT_GRID_ID);
    if (!rootGrid || !rootGrid.mandala) {
        overviewBoardEl.innerHTML = '<div class="error">無法載入中心主題</div>';
        return;
    }

    const container = document.createElement("div");
    container.className = "full-mandala-grid";

    for (let bigSlot = 1; bigSlot <= 9; bigSlot++) {
        const bigCell = renderBigCell(bigSlot, rootGrid, onNavigate);
        container.appendChild(bigCell);
    }

    overviewBoardEl.appendChild(container);
}

function renderBigCell(bigSlot, rootGrid, onNavigate) {
    const bigCell = document.createElement("div");
    bigCell.className = "mandala-big-cell";

    if (bigSlot === 5) {
        bigCell.classList.add("center-cell");
        bigCell.innerHTML = `
            <div class="big-cell-header">#${rootGrid.gridId} ${rootGrid.mandala.centerTitle}</div>
            <div class="big-cell-content">${escapeHtml(rootGrid.mandala.center)}</div>
        `;
        bigCell.style.cursor = "pointer";
        bigCell.addEventListener("click", () => {
            if (onNavigate) onNavigate(ROOT_GRID_ID);
        });
    } else {
        const itemIndex = bigSlot < 5 ? bigSlot - 1 : bigSlot - 2;
        const item = rootGrid.mandala.items[itemIndex];

        if (item && item.targetGridId) {
            const subGrid = getState().grids.find(g => g.gridId === item.targetGridId);
            if (subGrid) {
                bigCell.innerHTML = renderSubGrid(subGrid);
                bigCell.style.cursor = "pointer";
                bigCell.addEventListener("click", () => {
                    if (onNavigate) onNavigate(item.targetGridId);
                });
                if (gridHasFreshEntries(subGrid)) {
                    bigCell.classList.add("fresh");
                }
                if (gridHasNeedsReview(subGrid)) {
                    bigCell.classList.add("has-review");
                }
            }
        }
    }

    return bigCell;
}

function renderSubGrid(grid) {
    const mandala = buildMandala(grid);
    let html = `<div class="big-cell-header">#${grid.gridId} ${grid.title}</div>`;
    html += '<div class="mini-grid-9">';

    for (let slot = 1; slot <= 9; slot++) {
        if (slot === 5) {
            html += `<div class="mini-cell center"><strong>${grid.gridId}</strong><span>${escapeHtml(mandala.centerTitle || grid.title)}</span></div>`;
        } else {
            const itemIndex = slot < 5 ? slot - 1 : slot - 2;
            const item = mandala.items[itemIndex];
            if (item) {
                const truncatedTitle = item.title.length > 15 ? item.title.substring(0, 15) + '…' : item.title;
                html += `<div class="mini-cell"><span class="mini-title">${escapeHtml(truncatedTitle)}</span></div>`;
            } else {
                html += '<div class="mini-cell empty"></div>';
            }
        }
    }

    html += '</div>';
    return html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
