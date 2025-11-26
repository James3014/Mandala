"""Static configuration such as the nine-grid definitions and keyword mapping."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class GridDefinition:
    grid_id: int
    title: str
    persona: str
    keywords: List[str]
    fallback_summary: List[str]


GRID_DEFINITIONS: Dict[int, GridDefinition] = {
    1: GridDefinition(
        grid_id=1,
        title="學員價值與定位",
        persona="初/中階學員、家庭客",
        keywords=["學員", "安全", "進步", "推薦", "猶豫", "預算"],
        fallback_summary=[
            "關注學員安全與進步體驗",
            "記錄造成猶豫或預算衝擊的因素",
            "把握推薦轉換的最佳契機",
        ],
    ),
    2: GridDefinition(
        grid_id=2,
        title="教練價值與合作",
        persona="全職/兼職/核心教練",
        keywords=["教練", "分潤", "教案", "曝光", "合作", "承諾"],
        fallback_summary=[
            "掌握教練資源需求與承諾",
            "釐清分潤與教案支援",
            "保障合作可見度與成長",
        ],
    ),
    3: GridDefinition(
        grid_id=3,
        title="品牌定位與商業模式",
        persona="策略 / 商務",
        keywords=["品牌", "定位", "收入", "合約", "SOW", "商業", "差異"],
        fallback_summary=[
            "定義品牌差異化與收入結構",
            "追蹤合約條款與商務風險",
            "連結市場驗證與募資進度",
        ],
    ),
    4: GridDefinition(
        grid_id=4,
        title="課程與產品設計",
        persona="課務 / 產品",
        keywords=["課程", "產品", "分級", "成果", "行前", "課後", "模組"],
        fallback_summary=[
            "維護課程分級與成果敘事",
            "記錄行前 / 課後 Touchpoint",
            "確保特殊族群需求被照顧",
        ],
    ),
    5: GridDefinition(
        grid_id=5,
        title="中心核心目標",
        persona="策略 / KPI",
        keywords=["目標", "北極星", "願景", "風險", "品質", "安心"],
        fallback_summary=[
            "重申安心進步與合作北極星",
            "列示關鍵風險與防線",
            "同步策略節奏與回顧",
        ],
    ),
    6: GridDefinition(
        grid_id=6,
        title="平台體驗與工具",
        persona="產品 / 工程",
        keywords=["平台", "介面", "後台", "前台", "通知", "系統", "工具"],
        fallback_summary=[
            "盤點前台 / 後台操作與異常",
            "追蹤工具與通知改善",
            "確保體驗支援營運 SOP",
        ],
    ),
    7: GridDefinition(
        grid_id=7,
        title="行銷流量與社群",
        persona="行銷 / 社群",
        keywords=["行銷", "社群", "內容", "漏斗", "口碑", "品牌活動"],
        fallback_summary=[
            "記錄內容節奏與漏斗指標",
            "聚焦品牌啟動與社群互動",
            "同步募資與行銷配套",
        ],
    ),
    8: GridDefinition(
        grid_id=8,
        title="營運流程與服務交付",
        persona="營運 / 客服",
        keywords=["營運", "流程", "SOP", "付款", "報名", "提醒", "追蹤"],
        fallback_summary=[
            "維持報名 -> 課後完整 SOP",
            "揭露付款 / 附件流程狀態",
            "確保異常與教練媒合處置",
        ],
    ),
    9: GridDefinition(
        grid_id=9,
        title="數據系統與內部能力",
        persona="資料 / PM",
        keywords=["數據", "指標", "Dashboard", "損益", "知識庫", "紀錄"],
        fallback_summary=[
            "逐步建立 Dashboard 與指標擁有權",
            "記錄損益與募資進度",
            "推進內部知識庫與培訓",
        ],
    ),
}
