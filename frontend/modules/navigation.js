import {
    state,
    pushToStack,
    setCurrentGridId,
    popFromStack,
    resetStack,
    getStackPath,
    getGrid,
    ROOT_GRID_ID,
} from "../store.js";

export const NavigationModule = {
    drillDown: (targetGridId) => {
        pushToStack(state.currentGridId);
        setCurrentGridId(targetGridId);
    },

    handleBack: () => {
        const prev = popFromStack();
        if (prev) {
            setCurrentGridId(prev);
        } else {
            setCurrentGridId(ROOT_GRID_ID);
        }
    },

    jumpToGrid: (gridId) => {
        if (gridId === ROOT_GRID_ID) {
            resetStack();
        } else {
            resetStack();
            pushToStack(ROOT_GRID_ID);
        }
        setCurrentGridId(gridId);
    },

    updateControls: (breadcrumbEl) => {
        if (breadcrumbEl) {
            breadcrumbEl.textContent = getStackPath();
        }
    },
};
