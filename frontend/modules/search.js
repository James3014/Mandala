import { state, setSearchResults } from "../store.js";
import { renderSearchResults } from "../renderSearch.js";

export const SearchModule = {
    filter: (searchInputEl, gridFilterEl, statusFilterEl, resultsListEl, resultCountEl, detailPanelEl) => {
        const keyword = searchInputEl.value.trim().toLowerCase();
        const gridFilter = gridFilterEl.value;
        const statusFilter = statusFilterEl.value;

        const allEntries = state.grids.flatMap((grid) =>
            grid.entries.map((entry) => ({
                ...entry,
                gridId: grid.gridId,
                gridTitle: grid.title,
            }))
        );
        let filtered = allEntries;

        if (gridFilter) {
            filtered = filtered.filter((entry) => entry.gridId === Number(gridFilter));
        }
        if (statusFilter) {
            filtered = filtered.filter((entry) => entry.status === statusFilter);
        }
        if (keyword) {
            filtered = filtered.filter(
                (entry) =>
                    entry.snippet.toLowerCase().includes(keyword) ||
                    entry.source.toLowerCase().includes(keyword)
            );
        }

        setSearchResults(filtered);
        renderSearchResults(resultsListEl, resultCountEl, detailPanelEl);
    },
};
