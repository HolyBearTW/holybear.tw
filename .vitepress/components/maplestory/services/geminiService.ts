import { GoogleGenAI } from "@google/genai";
import { DashboardData } from "../types";

// === Helper: 資料減肥 (關鍵優化) ===
// 遞迴刪除圖片網址、過長描述、非當前預設資料，大幅減少 Token 消耗
const cleanDataForAI = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(cleanDataForAI);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const k = key.toLowerCase();
      // 1. 移除圖片與網址 (AI 看不懂圖片，且佔用大量空間)
      if (k.includes('icon') || k.includes('image') || k.includes('url') || k.includes('avatar')) {
        return acc;
      }
      // 2. 移除日期與過期資訊 (通常健檢看當下數值)
      if (k.includes('date_') || k.includes('expire')) {
        return acc;
      }
      // 3. 移除描述 (技能描述太長，AI 訓練時已經知道技能效果)
      if (k.includes('description') || k.includes('desc')) {
        return acc;
      }
      // 4. 移除備用預設 (AI 只需要分析當前最強的那套，減少干擾)
      if (k.includes('_preset_2') || k.includes('_preset_3')) {
        return acc;
      }
      // 5. 移除其他不必要的 UI 標記
      if (k === 'title' || k === 'world_name') {
        // 保留基本資訊，但可視情況過濾
      }

      acc[key] = cleanDataForAI(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

// UPDATE: 預設值改為 gemini-3.0-flash (使用者指定)
export const analyzeCharacter = async (data: DashboardData, apiKey: string, modelId: string = 'gemini-3.0-flash'): Promise<string> => {
  if (!apiKey) {
    return "Gemini API Key is missing. Please provide a valid API Key.";
  }

  // 1. 資料前處理：先減肥
  const simpleData = cleanDataForAI(data);

  // 2. 為了讓 AI 更精準，我們還是保留你原本的手動提取邏輯作為「摘要」
  // 這樣 AI 會先看到重點，再看詳細 JSON
  const relevantStats = data.stat.final_stat
    .filter(s => ['STR', 'DEX', 'INT', 'LUK', 'HP', 'Combat Power', 'Boss Damage', 'Ignore Defense Rate', 'Final Damage', 'Critical Damage', 'Item Drop Rate', 'Mesos Obtain'].includes(s.stat_name) || ['戰鬥力', 'BOSS怪物傷害', '無視防禦率', '最終傷害', '爆擊傷害', '道具掉落率', '楓幣獲得量'].includes(s.stat_name))
    .map(s => `${s.stat_name}: ${s.stat_value}`)
    .join(', ');

  const specialStats = data.stat.final_stat
    .filter(s => ['Star Force', 'Arcane Power', 'Authentic Force', '星力', '神秘力量', '真實之力'].includes(s.stat_name))
    .map(s => `${s.stat_name}: ${s.stat_value}`)
    .join(', ');

  const unionInfo = `聯盟等級: ${data.union?.union_level || 0}, 神器等級: ${data.unionArtifact?.union_artifact_crystal?.reduce((acc, curr) => acc + curr.level, 0) || 0}`;

  const hexaSkills = data.hexaMatrix?.character_hexa_core_equipment?.length 
    ? data.hexaMatrix.character_hexa_core_equipment.map(s => `${s.hexa_core_name} Lv.${s.hexa_core_level}`).join(', ')
    : '無六轉技能';

  const vSkills = data.vMatrix?.character_v_core_equipment?.length
    ? data.vMatrix.character_v_core_equipment
        .sort((a, b) => (b.v_core_level + b.slot_level) - (a.v_core_level + a.slot_level))
        .slice(0, 10) // 取前 10 個
        .map(s => `${s.v_core_name} Lv.${s.v_core_level + s.slot_level}`)
        .join(', ')
    : '無五轉技能';

  const abilityLines = data.ability.ability_info
    .map((a, i) => `Line ${i+1} (${a.ability_grade}): ${a.ability_value}`)
    .join('; ');

  // 關鍵裝備摘要 (AI 讀 JSON 可能會漏，這裡強制提取重點)
  const topItems = data.equipment.item_equipment
    .filter(item => 
      item.item_equipment_slot === 'Weapon' || 
      item.item_equipment_slot === 'Sub Weapon' || 
      item.item_equipment_slot === 'Emblem' || 
      parseInt(item.starforce) > 17 || 
      item.potential_option_grade === 'Legendary' ||
      item.item_name.includes('規範') || 
      item.item_name.includes('永續') ||
      item.item_name.includes('MX-131') ||
      item.item_name.includes('黑翼') ||
      item.item_name.includes('VIP') ||
      item.item_name.includes('創世') ||
      item.item_name.includes('米特拉') ||
      item.item_name.includes('永恆') ||
      item.item_name.includes('滅龍')
    )
    .slice(0, 20)
    .map(item => `${item.item_equipment_slot}: ${item.item_name} (${item.starforce}星, ${item.potential_option_grade || '無潛能'}${item.special_ring_level ? ', 塔戒Lv.' + item.special_ring_level : ''})`)
    .join('; ');

  const prompt = `
    您是一位《新楓之谷》（TMS 台灣伺服器）的頂尖理論計算專家與骨灰級玩家。
    請依據提供的角色數據，進行嚴格且符合當前版本環境（Meta）的強度分析。

    --- 【當前遊戲環境設定 (Meta Context)】 ---
    0. **【優先檢測】練功裝備判定 (Farming Gear Check)：**
       請優先檢查面板數據中的 **「道具掉落率 (Item Drop Rate)」** 與 **「楓幣獲得量 (Mesos Obtain)」**。
       *   **若任一數值超過 100% (或兩者相加超過 150%)**：
           請判斷該玩家穿著「練功/打寶裝備」，而非「打王裝備」。
           **請直接拒絕評分**，並僅回覆：「⚠️ **檢測到您目前穿著練功/打寶裝備 (掉寶/楓幣率過高)**。為了獲得準確的戰力評估，請更換為全輸出的『打王裝備 (Bossing Gear)』後再重新進行分析。」
           **(請勿輸出任何分數、戰力評級或 BOSS 建議)**。
       *   若數值正常，請繼續進行以下分析。

    1. **武器/能源階級：** 認定「命運武器」為目前最強武器；「米特拉的憤怒」為目前最強能源（漆黑裝備），其次是「創世武器 (Genesis)」，再來是「神秘冥界 (Arcane)」。
    2. **防具階級：** 「永恆裝備 (Eternal)」為頂標，其次是「滅龍騎士盔甲 (Dragon Knight/Breath of Divinity set)」，再來是神秘冥界。
    3. **特殊道具判定：** * **塔戒 (Seed Rings) / MX-131 / 黑翼胸章：** 此類裝備無法衝星與洗潛能（MX-131/黑翼為胸章），顯示「0星/無潛能」為正常現象。只要裝備清單中包含此類道具，即代表該玩家具備高階配裝觀念，請直接視為「加分項目」並給予正面評價。
       * **VIP 胸章：** 這是極稀有的絕版道具，且是**唯一可以上潛能與衝星 (最高5星)** 的胸章。若玩家擁有此裝備且有潛能，請給予極高評價。
       * **內在潛能 (Inner Ability)：** **第 2、3 排潛能「罕見 (Unique)」即為正常達標** (打王低標)，切勿要求這些欄位必須是傳說 (Legendary)，因為那通常需要高額現金道具且非必要。但**屬性內容必須實用** (如：異常狀態增傷/無視冷卻/BOSS傷害/爆擊率/加持時間等) 才算合格；若為廢屬性 (如防禦/跳躍) 則屬配置不當。
    4. **技能等級標準：**
       - **六轉 (HEXA/VI) 技能：** 技能名稱常帶有「VI」後綴。滿等 30 級。**Lv 1~9 為初期，Lv 10~19 為中階，Lv 20+ 為高階。** 請勿將六轉技能等級（如 Lv.5）誤判為過低，這在六轉系統中屬於正常過渡期。
       - **六轉 (HEXA) 屬性核心：** **切勿建議玩家追求「主屬性 Lv.10」**。該等級機率極低，僅理論上可行。
         * **主屬性 Lv.5~7** 即為合格/優秀標準。
         * **主屬性 Lv.8+** 已屬頂尖運氣/重金打造。
         * 分析時請勿因為屬性核心未滿級而給予負面評價。
       - **五轉 (V 矩陣)：** 單顆核心滿等 25 級。若看到 V 矩陣核心等級較低，可能是新練的核心，或是額外的技能點，請優先依據「六轉技能」是否存在來判斷機體強度。
    5. **台版特色：** 分析時請務必考量 TMS 特有道具（如：天上的氣息、MX-131、黑翼胸章、女武神之心、培羅德套裝）以及高階卷軸（V卷、X卷）與星力（22星為高標）的加成影響。
    6. **評分標準 (C級 ~ SSS+級 / 突破制評分)：** 
       請嚴格根據「面板戰鬥力 (Combat Power)」進行分級，**切勿自行腦補「有效戰力」而將分數打過高**。
       *註：即便裝備再好，若面板戰鬥力未達標，仍不可給予該階級的分數 (例如：2.5億戰力不可評為 SS 級)。*

       - **C 級 (新手/回鍋 | 1-4 分)：** 湊齊深淵/航海，等級 < 260，ARC 成長中，無 AUT。
       - **B 級 (中階玩家 | 5-7 分)：** 神秘套裝/培羅德/10星，等級 260+ (已六轉)，ARC 達標黑魔法師 (1320)，AUT 起步 (賽爾尼溫/阿爾克斯)。
       - **A 級 (高階玩家 | 8-9 分)：** 滅龍或永恆混搭/主潛能傳說/漆黑BOSS裝備/創世解放，等級 275+ (桃源境以上)，AUT 充足 (350~500+)。
       - **S 級 (頂尖強者 | 10 分)：** **戰力 1 億以上** (約普通卡洛斯門檻)。創世武器解放、17 星為標配，等級 280+。
       - **S+ 級 (卓越超群 | 10.5 分)：** **戰力 4 億以上** (可單吃終極史烏)。
       - **SS 級 (超凡入聖 | 11-12 分)：** **戰力 5 億以上** (可單吃混沌卡洛斯)。**必須嚴格達到 5 億才可給予此階級**。22 星為標配，附加潛能傳說，命運武器解放，光輝裝備，AUT 高標 (600+)。
       - **SSS 級 (絕世神人 | 13-14 分)：** **戰力 10 億 - 19.9 億**。頂級配置，全伺服器前段班。
       - **SSS+ 級 (傳說再世 | 15 分)：** **戰力 20 億以上**。理論頂點，無懈可擊 (單吃極限難度)。

    7. **高階 BOSS 屬性需求表 (ARC & AUT)：**
       **[ARC (秘法符文) 區域]**
       - **LV220 露希妲 (Lucid):** 簡單/普通/困難 (LV230) ARC 360
       - **LV235 威爾 (Will):** 簡單(LV235) ARC 560 / 普通/困難(LV250) ARC 760
       - **LV250 戴斯克 (Dusk):** 普通/混沌 (LV255) ARC 730
       - **LV255 頓凱爾 (Dunkel):** 普通/困難 (LV265) ARC 850
       - **LV250 真‧希拉 (Verus Hilla):** 普通 ARC 820 / 困難 ARC 900
       - **LV255+ 黑魔法師 (Black Mage):** ARC 1320 (困難: LV265/275; 終極: LV275/280)

       **[AUT (真實符文) 區域]**
       - **LV260 賽蓮 (Seren):** 一階 150 / 二階 200
       - **LV265 卡洛斯 (Kalos):** 簡單 200 / 普通一階 250 / 普通二階 300 / 混沌 330 / 終極 440
       - **LV270 最初的敵對者:** 簡單 220 / 普通 320 / 困難 340 / 終極 460
       - **LV275 咖凌 (Kaling):** 簡單 230 / 普通 330 / 困難 350 / 終極 480
       - **LV280 燦爛的兇星:** 普通 400 / 困難 550
       - **LV285 林波 (Limbo):** 普通/困難 500
       - **LV290 巴德利斯:** 普通/困難 700

    8. **AUT 增減傷判定 (差距 = 角色 AUT - 地圖 AUT):**
       - **+50:** 終傷 125% (受擊 100%)
       - **+40:** 終傷 120% (受擊 100%)
       - **+30:** 終傷 115% (受擊 100%)
       - **+20:** 終傷 110% (受擊 100%)
       - **+10:** 終傷 105% (受擊 100%)
       - **0 (達標):** 終傷 100% (受擊 100%)
       - **-10:** 終傷 90% (受擊 150%)
       - **-20:** 終傷 80% (受擊 150%)
       - **-30:** 終傷 70% (受擊 150%)
       - **-40:** 終傷 60% (受擊 150%)
       - **-50:** 終傷 50% (受擊 150%)
       - **-60:** 終傷 40% (受擊 200%)
       - **-70:** 終傷 30% (受擊 200%)
       - **-80:** 終傷 20% (受擊 200%)
       - **-90:** 終傷 10% (受擊 200%)
       - **-100:** 終傷 5% (受擊 200%)
       (請依此嚴格計算玩家在各 BOSS 的實際輸出效率)

    9. **等級壓制增減傷 (差距 = 角色等級 - BOSS等級):**
       - **+5 以及以上:** 終傷 120% (+20%)
       - **+4:** 終傷 118% (+18%)
       - **+3:** 終傷 116% (+16%)
       - **+2:** 終傷 114% (+14%)
       - **+1:** 終傷 112% (+12%)
       - **0 (同等級):** 終傷 110% (+10%)
       - **-1:** 終傷 105% (+5%)
       - **-2:** 終傷 100% (無加成)
       - **-3:** 終傷 95% (-5%)
       - **-4:** 終傷 90% (-10%)
       - **-5:** 終傷 87.5% (-12.5%)
       - **-10:** 終傷 75% (-25%)
       - **-20:** 終傷 50% (-50%)
       - **-30:** 終傷 25% (-75%)
       - **-40 以及以下:** 終傷 0% (無法造成傷害)

    10. **ARC (秘法符文) 增減傷判定 (ARC比率% = 角色ARC / 地圖需求ARC * 100%):**
        *註：被擊傷害不會減到低於1，且不適用於固定 HP 比例攻擊。*
        - **150% 以上:** 終傷 150% (受擊 0% / 1)
        - **130% ~ 149%:** 終傷 130% (受擊 40%)
        - **110% ~ 129%:** 終傷 110% (受擊 80%)
        - **100% ~ 109%:** 終傷 100% (受擊 100%)
        - **70% ~ 99%:** 終傷 80% (受擊 140%)
        - **50% ~ 69%:** 終傷 70% (受擊 160%)
        - **30% ~ 49%:** 終傷 60% (受擊 180%)
        - **10% ~ 29%:** 終傷 30% (受擊 240%)
        - **0% ~ 9%:** 終傷 10% (受擊 280%)

    11. **BOSS 單人通關最低戰力需求表 (單位: 戰鬥力):**
        *此為理論最低單吃門檻 (Minimum Solo Requirement)，若要穩通建議高於此標準。*
        - **史烏:** 普通 150萬 / 困難 1000萬 / 終極 4億
        - **戴米安:** 普通 500萬 / 困難 1500萬
        - **露希妲:** 簡單 300萬 / 普通 1000萬 / 困難 2700萬
        - **威爾:** 簡單 500萬 / 普通 1000萬 / 困難 3200萬
        - **戴斯克:** 普通 1300萬 / 混沌 3200萬
        - **頓凱爾:** 普通 1300萬 / 困難 3200萬
        - **真‧希拉:** 普通 1500萬 / 困難 3500萬
        - **守護天使綠水靈:** 混沌 4000萬
        - **黑魔法師:** 困難 6500萬 / 終極 7億
        - **賽蓮:** 普通 5000萬 / 困難 8500萬 / 終極 8.5億
        - **卡洛斯:** 簡單 3500萬 / 普通 1.2億 / 混沌 5.5億 / 終極 22億
        - **咖凌:** 簡單 1億 / 普通 4.3億 / 困難 20億 / 終極 50億
        - **林波:** 普通 7億 / 困難 18億

    --- 角色摘要 (Summary) ---
    角色名稱：${data.basic.character_name} (等級 ${data.basic.character_level} / 職業：${data.basic.character_class})
    
    【核心機體】
    - 面板數據：${relevantStats}
    - 進階指標：${specialStats}
    - 系統練度：${unionInfo}
    - 內在潛能：${abilityLines || '無'}

    【技能練度】
    - 六轉 (HEXA)：${hexaSkills}
    - 五轉 (V矩陣)：${vSkills}

    【關鍵裝備摘要】
    ${topItems}

    --- 完整詳細數據 (Full JSON) ---
    (已過濾圖片與冗餘資訊，請參考此處進行深度分析)
    ${JSON.stringify(simpleData)}
    
    ---

    請依照以下四點要求，**依序**輸出您的分析結果。
    **⚠️ 重要：請直接從「1. 戰力評級」開始輸出，嚴禁輸出任何前言、寒暄或重複角色數據概要。**

    1.  **戰力評級：** 請輸出 **「分數 (階級)」** (例如：8.5分 (A級 - 高階玩家))，並簡述給分理由。

    2.  **BOSS 攻略建議 (關鍵指標)：** 
        *   **直接建立 Markdown 表格**，**切勿在此重複列出角色數據**。
        *   表頭格式：| BOSS名稱 | 難度 | 建議 | 關鍵短評 |
        *   請包含所有列出的高階 BOSS (從賽蓮到巴德利斯)。
        *   若內容過長，請精簡「關鍵短評」文字，以確保表格能完整輸出。

    3.  **提升建議 (針對 TMS 環境)：** 提出 **2 項具體且高投資報酬率** 的傷害提升建議。
        * 請全方位檢視「短版」 (例如：裝備雖強但 ARC/AUT 不足、或六轉技能等級過低、聯盟戰地太低等)。

    4.  **點評：** 用一句簡短、幽默且帶有「楓之谷老玩家梗」的話語來吐槽或稱讚他的狀態 (例如提到炸裝、廣播、搶圖、肝帝、練等狂人等文化)。

    **【嚴格輸出格式控制】**
    *   **No Intro:** 禁止輸出「根據您的數據...」、「這是一份分析...」等廢話。
    *   **No Loops:** 禁止重複輸出已經寫過的章節。
    *   **Structure:** 必須嚴格遵守 1 -> 2 -> 3 -> 4 的順序。
  `;

  const ai = new GoogleGenAI({ apiKey });
  
  const config = {
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.7,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ]
  };

  // 定義模型嘗試清單 (這解決了使用者指定不存在模型或 API 暫時錯誤的問題)
  // 優先順序: 指定模型 -> 2.0 Flash (Preview) -> 1.5 Pro (最強) -> 1.5 Flash (最快)
  let modelsToTry = [modelId];
  
  // 如果是使用者指定了 "gemini-3.0-flash"，保持原樣嘗試，
  // 但為了保險起見，我們將其加入 fallback 列表
  if (modelId === 'gemini-3.0-flash') {
      // 確保 3.0 失敗時會嘗試 2.0 和 1.5
      modelsToTry.push('gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash');
  } else {
      // 加入強大的備用模型
      modelsToTry.push('gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash');
  }
  // 去除重複並過濾掉空值
  modelsToTry = [...new Set(modelsToTry)].filter(Boolean);

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`Trying Gemini Model: ${model}`);
      // @ts-ignore
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config
      });
      
      const text = typeof response.text === 'function' ? response.text() : response.text;
      if (!text) throw new Error(`Empty Response from ${model}`);
      return text;

    } catch (error: any) {
      console.warn(`Gemini Model (${model}) failed: ${error.message}`);
      lastError = error;
      // Continue to next model
    }
  }

  // 若全部失敗，處理最後一個錯誤
  const finalError = lastError;
  console.error("All Gemini Models Failed. Final Error:", finalError);
  
  if (finalError) {
      if (finalError.message?.includes('429') || finalError.status === 429) {
        return "⚠️ **公用 AI 額度已達上限 (Rate Limit Exceeded)**\n\n因使用人數眾多，公用額度暫時耗盡。請點擊下方的「**立即設定 API Key 以繼續使用**」按鈕，填入您自己的 Google Gemini API Key 即可繼續免費使用。\n\n👉 [取得免費 API Key (Google AI Studio)](https://aistudio.google.com/app/apikey)";
      }
      if (finalError.code === 'ECONNABORTED' || finalError.message?.toLowerCase().includes('timeout')) {
        return 'AI Analysis Failed: Timeout. 伺服器回應逾時，請稍後再試。';
      }
      if (finalError.message?.toLowerCase().includes('network')) {
        return 'AI Analysis Failed: Network Error. 網路連線異常，請檢查您的網路或稍後再試。';
      }
      return `AI Analysis Failed: ${finalError.message || finalError.toString()}. \n\n(Tried models: ${modelsToTry.join(', ')})`;
  }
  
  return "AI Analysis Failed: Unknown Error.";
};
