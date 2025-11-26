"""Static mandala definitions for each grid cell."""

MANDALA_BLUEPRINT = {
    1: {
        "centerTitle": "學員價值與定位",
        "center": "服務想認真進步、需要被引導的初～中階學員與重視安全的家庭客。",
        "items": [
            {"title": "初學者 Persona", "detail": "第一次滑雪、怕跌倒、不熟裝備與雪場。"},
            {"title": "回鍋進階者", "detail": "上過幾堂課，卡在某個動作，想明顯進步。"},
            {"title": "家庭／親子客", "detail": "幫小孩／伴侶找安全、有耐心的教練。"},
            {"title": "安全與風險", "detail": "擔心摔傷、迷路或遇到雷教練。"},
            {"title": "價格與預算", "detail": "願意為安心與明確進步付中高價。"},
            {"title": "學習目標", "detail": "拍好看影片、跟團不拖油瓶、穩穩自己滑。"},
            {"title": "決策猶豫點", "detail": "不懂差別、怕踩雷、資訊分散。"},
            {"title": "價值主張", "detail": "幫你挑適合教練，安全、好懂、有進步。"},
        ],
    },
    2: {
        "centerTitle": "教練價值與合作",
        "center": "讓專業、穩定教練在 SKiDIY 帶課更省事又被尊重。",
        "items": [
            {"title": "理想特質", "detail": "專業、重視安全、願意溝通、有耐心。"},
            {"title": "Persona", "detail": "全職、季節、本業兼職教練。"},
            {"title": "合作誘因", "detail": "穩定生源、行政減少、可視化收入。"},
            {"title": "分潤結構", "detail": "抽成與結算規則透明。"},
            {"title": "教學支持", "detail": "教案、影片、回饋工具、同儕交流。"},
            {"title": "成長路徑", "detail": "新進→穩定→核心→帶團隊。"},
            {"title": "合作承諾", "detail": "堂數預期、檔期安排、休假自由。"},
            {"title": "品牌曝光", "detail": "個人頁、評價、故事與社群露出。"},
        ],
    },
    3: {
        "centerTitle": "品牌定位與商業模式",
        "center": "專注滑雪教學的媒合與成長平台，以課程與服務費為主。",
        "items": [
            {"title": "一句話定位", "detail": "讓學員跟好教練，安心學滑雪。"},
            {"title": "品牌關鍵字", "detail": "安心、專業、透明、成長、社群。"},
            {"title": "主要收入", "detail": "課程媒合抽成、平台服務費。"},
            {"title": "延伸收入", "detail": "裝備導購、保險、講座、聯名活動。"},
            {"title": "成本概念", "detail": "人力、系統、行銷、金流工具。"},
            {"title": "核心差異", "detail": "專注教學與成長，不賣行程。"},
            {"title": "市場假設", "detail": "滑雪教育處成長期、習慣養成中。"},
            {"title": "商業風險", "detail": "季節性強、規模未成、易被模仿。"},
        ],
    },
    4: {
        "centerTitle": "課程與產品設計",
        "center": "為學員設計看得懂的學習路徑與課程線。",
        "items": [
            {"title": "課程分級", "detail": "Lv1 初雪、Lv2 轉彎、Lv3 刻滑等。"},
            {"title": "課程型態", "detail": "團體、半自組、1 對 1、親子。"},
            {"title": "命名包裝", "detail": "一看就知道適合哪個級別。"},
            {"title": "學習成果", "detail": "影片、動作清單等可見成果。"},
            {"title": "行前模組", "detail": "裝備指南、行前影片、FAQ。"},
            {"title": "課後延伸", "detail": "線上回顧、動作分析、下一季建議。"},
            {"title": "特殊族群", "detail": "女滑班、兒童、銀髮、安全入門。"},
            {"title": "組合策略", "detail": "體驗→課程包→季度/年度成長。"},
        ],
    },
    5: {
        "centerTitle": "SKiDIY 核心目標",
        "center": "打造學員安心進步 × 教練穩定合作的平台。",
        "items": [
            {"title": "① 學員價值", "detail": "服務想認真進步、重視安全的學員。", "targetGridId": 1},
            {"title": "② 教練價值", "detail": "教練帶課省事又被尊重。", "targetGridId": 2},
            {"title": "③ 品牌與商業", "detail": "專注教學媒合，課程收入為核心。", "targetGridId": 3},
            {"title": "④ 課程產品", "detail": "清楚學習路徑與課程線。", "targetGridId": 4},
            {"title": "⑥ 平台體驗", "detail": "網站/後台都順暢。", "targetGridId": 6},
            {"title": "⑦ 行銷社群", "detail": "內容與社群累積夥伴。", "targetGridId": 7},
            {"title": "⑧ 營運交付", "detail": "報名到課後都有 SOP。", "targetGridId": 8},
            {"title": "⑨ 數據能力", "detail": "指標與文件讓團隊越做越聰明。", "targetGridId": 9},
        ],
    },
    6: {
        "centerTitle": "平台體驗與工具",
        "center": "讓學員與教練在系統上輕鬆完成任務。",
        "items": [
            {"title": "學員前台", "detail": "找課、看教練、報名付款一氣呵成。"},
            {"title": "行程中心", "detail": "一眼看到報名課程與集合資訊。"},
            {"title": "教練後台", "detail": "課表、提醒、待確認訂單。"},
            {"title": "通知系統", "detail": "行前提醒、天候異動、課後問卷。"},
            {"title": "管理後台", "detail": "課程上架、教練管理、訂單報表。"},
            {"title": "多裝置", "detail": "手機優先、桌機也清楚。"},
            {"title": "異常處理", "detail": "改期、取消、退款流程有引導。"},
            {"title": "一致風格", "detail": "視覺、文案、按鈕命名一致。"},
        ],
    },
    7: {
        "centerTitle": "行銷流量與社群",
        "center": "把陌生流量變成學員並經營成夥伴。",
        "items": [
            {"title": "主戰場平台", "detail": "IG、FB、YouTube、LINE 社群。"},
            {"title": "內容主軸", "detail": "教學知識、裝備攻略、雪場資訊。"},
            {"title": "雪季節奏", "detail": "暖身→招募→收季→冬後經營。"},
            {"title": "導流機制", "detail": "內容→LINE→諮詢→報名。"},
            {"title": "社群互動", "detail": "問答、挑戰、聚會、徵故事。"},
            {"title": "口碑推薦", "detail": "推薦碼、介紹好友優惠。"},
            {"title": "內容流程", "detail": "題目池、排程、範本、素材庫。"},
            {"title": "成效指標", "detail": "互動率、官網點擊、轉換比例。"},
        ],
    },
    8: {
        "centerTitle": "營運流程與服務交付",
        "center": "報名→行前→當日→課後都有穩定 SOP。",
        "items": [
            {"title": "報名與訂單", "detail": "確認資訊完整後通知教練/夥伴。"},
            {"title": "行前溝通", "detail": "裝備、集合點、時間、注意安全。"},
            {"title": "當日報到", "detail": "集合點、負責人、緊急聯絡方式。"},
            {"title": "課中標準", "detail": "時數、人數、休息、安全檢查。"},
            {"title": "異常流程", "detail": "天候、延誤、受傷、設備問題處理。"},
            {"title": "課後收尾", "detail": "教練回報、名單確認、照片整理。"},
            {"title": "客服規則", "detail": "改期、退款、抱怨的判準與時限。"},
            {"title": "檢討節奏", "detail": "每週/季檢討常見問題與優化。"},
        ],
    },
    9: {
        "centerTitle": "數據系統與內部能力",
        "center": "用指標與知識庫累積經驗，讓團隊越做越聰明。",
        "items": [
            {"title": "北極星指標", "detail": "例如活躍學員數、完成課程數。"},
            {"title": "營運指標", "detail": "報名量、轉換率、回頭率。"},
            {"title": "漏斗指標", "detail": "流量、互動率、社群轉報名比例。"},
            {"title": "教學滿意度", "detail": "課後評分、推薦意願、投訴率。"},
            {"title": "資料工具", "detail": "GA、表單、儀表板、手動記錄。"},
            {"title": "知識庫", "detail": "SOP、決策紀錄、專案回顧。"},
            {"title": "內部培訓", "detail": "SKiDIY 101、流程與工具教學。"},
            {"title": "檢討迭代", "detail": "季末回顧，決定下季重點。"},
        ],
    },
}


def get_mandala(grid_id: int) -> dict | None:
    """Helper for the service to attach mandala info to responses."""
    return MANDALA_BLUEPRINT.get(grid_id)
