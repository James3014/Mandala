import { getState } from "./store.js";
import { NavigationModule } from "./modules/navigation.js";

export function renderSearchResults(resultsListEl, resultCountEl, detailPanelEl, onNavigate) {
    const state = getState();
    resultsListEl.innerHTML = "";
    resultCountEl.textContent = `${state.searchResults.length} 筆`;
    state.searchResults.forEach((entry) => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>#${entry.gridId} ${entry.gridTitle}</strong><br />${entry.snippet}`;
        li.addEventListener("click", () => {
            if (onNavigate) {
                onNavigate(entry.gridId);
            } else {
                NavigationModule.jumpToGrid(entry.gridId);
            }
            // Wait for render to complete then scroll
            setTimeout(() => {
                const element = detailPanelEl.querySelector(`[data-segment-id="${entry.segment_id}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                    element.classList.add("highlight");
                    setTimeout(() => element.classList.remove("highlight"), 1500);
                }
            }, 100);
        });
        resultsListEl.appendChild(li);
    });
}
