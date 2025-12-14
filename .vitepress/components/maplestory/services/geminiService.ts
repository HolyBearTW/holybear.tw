import { GoogleGenAI } from "@google/genai";
import { DashboardData } from "../types";

export const analyzeCharacter = async (data: DashboardData, apiKey: string, modelId: string = 'gemini-2.5-flash'): Promise<string> => {
  if (!apiKey) {
    return "Gemini API Key is missing. Please provide a valid API Key.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // 1. 基礎面板 (包含 B傷、無視、主屬等)
  const relevantStats = data.stat.final_stat
    .filter(s => ['STR', 'DEX', 'INT', 'LUK', 'HP', 'Combat Power', 'Boss Damage', 'Ignore Defense Rate', 'Final Damage', 'Critical Damage'].includes(s.stat_name) || ['戰鬥力', 'BOSS怪物傷害', '無視防禦率', '最終傷害', '爆擊傷害'].includes(s.stat_name))
    .map(s => `${s.stat_name}: ${s.stat_value}`)
    .join(', ');

  // 2. 進階指標 (星力、ARC、AUT)
  const specialStats = data.stat.final_stat
    .filter(s => ['Star Force', 'Arcane Power', 'Authentic Force', '星力', '神秘力量', '真實之力'].includes(s.stat_name))
    .map(s => `${s.stat_name}: ${s.stat_value}`)
    .join(', ');

  // 3. 系統練度 (聯盟、神器)
  const unionInfo = `聯盟等級: ${data.union?.union_level || 0}, 神器等級: ${data.unionArtifact?.union_artifact_crystal?.reduce((acc, curr) => acc + curr.level, 0) || 0}`;

  // 4. 技能練度 (Hexa / V)
  const hexaSkills = data.hexaMatrix?.character_hexa_core_equipment?.length 
    ? data.hexaMatrix.character_hexa_core_equipment.map(s => `${s.hexa_core_name} Lv.${s.hexa_core_level}`).join(', ')
    : '無六轉技能';

  const vSkills = data.vMatrix?.character_v_core_equipment?.length
    ? data.vMatrix.character_v_core_equipment
        .sort((a, b) => (b.v_core_level + b.slot_level) - (a.v_core_level + a.slot_level))
        .slice(0, 8) // 取前 8 個重要技能
        .map(s => `${s.v_core_name} Lv.${s.v_core_level + s.slot_level}`)
        .join(', ')
    : '無五轉技能';

  const abilityLines = data.ability.ability_info
    .map((a, i) => `Line ${i+1} (${a.ability_grade}): ${a.ability_value}`)
    .join('; ');

  // 裝備清單擴充 (取前 15 件，包含武器、副武、能源、心臟等關鍵部位，以及塔戒)
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
      item.item_name.includes('創世胸章') ||
      item.item_name.includes('米特拉') ||
      item.item_name.includes('永恆') ||
      item.item_name.includes('滅龍')
    )
    .slice(0, 15)
    .map(item => `${item.item_equipment_slot}: ${item.item_name} (${item.starforce}星, ${item.potential_option_grade || '無潛能'}${item.special_ring_level ? ', 塔戒Lv.' + item.special_ring_level : ''})`)
    .join('; ');

  const prompt = `
    您是一位《新楓之谷》（TMS 台灣伺服器）的頂尖理論計算專家與骨灰級玩家。
    請依據提供的角色數據，進行嚴格且符合當前版本環境（Meta）的強度分析。

    --- 【當前遊戲環境設定 (Meta Context)】 ---
    1. **武器/能源階級：** 認定「${"命運武器" /* 若變數名稱不同請自行替換 */}」為目前最強武器；「米特拉的憤怒」為目前最強能源（漆黑裝備），其次是「創世武器 (Genesis)」，再來是「神秘冥界 (Arcane)」。
    2. **防具階級：** 「永恆裝備 (Eternal)」為頂標，其次是「滅龍騎士盔甲 (Dragon Knight/Breath of Divinity set)」，再來是神秘冥界。
    3. **特殊道具判定：** 
       * **塔戒 (Seed Rings) / MX-131 / 黑翼胸章：** 此類裝備無法衝星與洗潛能（MX-131/黑翼為胸章），顯示「0星/無潛能」為正常現象。只要裝備清單中包含此類道具，即代表該玩家具備高階配裝觀念，請直接視為「加分項目」並給予正面評價。
       * **VIP 胸章：** 這是極稀有的絕版道具，且是**唯一可以上潛能與衝星 (最高5星)** 的胸章。若玩家擁有此裝備且有潛能，請給予極高評價。
    4. **技能等級標準：**
       - **六轉 (HEXA/VI)：** 技能名稱常帶有「VI」後綴。滿等 30 級。**Lv 1~9 為初期，Lv 10~19 為中階，Lv 20+ 為高階。** 請勿將六轉技能等級（如 Lv.5）誤判為過低，這在六轉系統中屬於正常過渡期。
       - **五轉 (V 矩陣)：** 單顆核心滿等 25 級。若看到 V 矩陣核心等級較低，可能是新練的核心，或是額外的技能點，請優先依據「六轉技能」是否存在來判斷機體強度（有六轉通常代表五轉基礎已達標）。
    5. **台版特色：** 分析時請務必考量 TMS 特有道具（如：天上的氣息、MX-131、黑翼胸章、女武神之心、培羅德套裝）以及高階卷軸（V卷、X卷）與星力（22星為高標）的加成影響。
    6. **評分標準：** - 1-4分：新手/回鍋 (湊齊深淵/航海)
       - 5-7分：中階 (神秘套裝/培羅德套裝/17星/初步成型)
       - 8-9分：高階 (滅龍或永恆混搭/22星/雙傳說潛能/漆黑BOSS裝備(口紅/眼罩/米特拉的憤怒/創世胸章/全面控制心臟等)/創世武器解放)
       - 10分：頂尖 (頂級永恆/頂素質/特殊高價道具齊全/光輝BOSS裝備(根源的耳語等)/25星以上/命運武器解放)

    --- 輸入的角色數據 ---
    角色名稱：${data.basic.character_name} (等級 ${data.basic.character_level} / 職業：${data.basic.character_class})
    
    【核心機體】
    - 面板數據：${relevantStats}
    - 進階指標：${specialStats}
    - 系統練度：${unionInfo}
    - 內在潛能：${abilityLines || '無'}

    【技能練度】
    - 六轉 (HEXA)：${hexaSkills}
    - 五轉 (V矩陣)：${vSkills}

    【關鍵裝備】
    ${topItems}
    ---

    請依照以下四點要求，輸出您的分析結果：

    1.  **戰力評級：** 根據上述【當前遊戲環境設定】，給予 **1 到 10 分** 的「綜合戰鬥力評級」。請簡述給分理由。

    2.  **BOSS 攻略建議 (關鍵指標)：** 
        請根據角色的「戰鬥力」、「無視防禦」、「BOSS傷害」與「ARC/AUT」，依序評估以下高階 BOSS 的攻略可能性 (分為：輕鬆單吃 / 勉強單吃 / 組隊可打 / 機體不足)。
        **請務必明確區分難度 (普通/困難/混沌/終極)，並嚴格檢視 ARC/AUT 是否達標 (未達標傷害會劇減)。**
        **注意：ARC 或 AUT 達標即無懲罰 (100% 傷害)，高於需求可獲增傷。請勿將「未達增傷標準」誤判為「傷害懲罰」。**
        **僅需針對具備 AUT 需求的 BOSS 檢核真實之力；若該 BOSS 僅需 ARC (如黑魔法師、露希妲)，請勿提及 AUT 相關建議。**
        **史烏、戴米安、守護者天使綠水靈、瑪麗西亞並不需要 ARC 與 AUT 要求，但由於沒有這兩者的增傷加成，請特別留意其實力評估。**
        **【關鍵判斷標準】：Grandis 地區 BOSS (賽蓮、卡洛斯、咖凌、林波、巴德利斯) 血量極高，單吃門檻極高。即使 AUT 達標，若戰鬥力未達頂尖水準 (例如：普通林波/咖凌單吃通常需 5 億以上戰鬥力)，請預設為「組隊可打」。請勿輕易給出「單吃」評價，除非機體數值極度溢出。**

        **【參考數據 (Reference Data)】**
        *   **巴德利斯：** 普通 (AUT 700) / 困難 (AUT 700)
        *   **林波 (Limbo)：** 普通 (AUT 500) / 困難 (AUT 500)
        *   **咖凌 (Kaling)：** 普通 (AUT 330) / 困難 (AUT 350) / 終極 (AUT 480)
        *   **監視者卡洛斯 (Kalos)：** 混沌 (AUT 300) / 終極 (AUT 440)
        *   **賽蓮 (Seren)：** 困難 (AUT 200) / 終極 (AUT 350)
        *   **黑魔法師 (Black Mage)：** 困難/終極 (ARC 1320)
        *   **終極史烏：** (需極高機體，單吃低標4億戰鬥力以上)

        **評估清單：**
        *   **入門高階：** 困難露希妲/威爾、混沌戴斯克、困難真希拉、混沌守護天使綠水靈、困難頓凱爾
        *   **頂尖門檻：** 黑魔法師、困難賽蓮
        *   **神之領域：** 監視者卡洛斯(混沌)、咖凌(普通/困難)、林波(普通/困難)
        *   **終極挑戰：** 終極史烏、終極賽蓮、終極卡洛斯、終極咖凌、巴德利斯(普通/困難)

        *   *請針對每個 BOSS 提供簡短的評語，並說明目前角色的「關鍵指標」是否足以應付該 BOSS 的挑戰。*

    3.  **提升建議 (針對 TMS 環境)：** 提出 **2 項具體且高投資報酬率** 的傷害提升建議。
        * 請全方位檢視「短版」 (例如：裝備雖強但 ARC/AUT 不足、或六轉技能等級過低、聯盟戰地太低等)。
        * 若裝備已是頂尖，請建議細節優化 (如：更換附加潛能、星火數值、或特定胸章/特殊裝備/塔戒選擇)。

    4.  **點評：** 用一句簡短、幽默且帶有「楓之谷老玩家梗」的話語來吐槽或稱讚他的狀態 (例如提到炸裝、廣播、搶圖、肝帝、練等狂人等文化)。

    **【重要格式要求】**
    * **語言：** 必須且僅使用 **繁體中文 (Traditional Chinese)**。
    * **風格：** 專業、犀利、針對性強。
    * **用語：** 請勿使用 "AF" 這種模糊縮寫，請明確使用 "ARC" (神秘力量) 或 "AUT" (真實之力)。若數值高於需求，請使用「達標且享有增傷」等直白描述，避免使用「完美溢出」等可能讓玩家困惑的術語。
    * **格式：** 請靈活使用 **Markdown 語法**。對於「BOSS 攻略建議」或數據對比，**強烈建議使用表格 (Table)** 以提升閱讀體驗。其他部分可使用條列式。
  `;

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

  try {
    // Try requested model first
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config
    });
    const text = typeof response.text === 'function' ? response.text() : response.text;
    return text || "Failed to generate analysis (Empty Response). Check console for details.";
  } catch (error: any) {
    console.warn(`Gemini Model (${modelId}) failed, trying fallback...`, error.message);
    try {
        // Fallback to 2.0 (Stable)
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config
        });
        const text = typeof response.text === 'function' ? response.text() : response.text;
        return text || "Failed to generate analysis (Empty Response).";
    } catch (fallbackError: any) {
        console.warn("Gemini 2.0 Flash failed, trying gemini-flash-latest...", fallbackError.message);
        try {
            // Fallback 2: latest alias
            const response = await ai.models.generateContent({
                model: 'gemini-flash-latest',
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config
            });
            const text = typeof response.text === 'function' ? response.text() : response.text;
            return text || "Failed to generate analysis (Empty Response).";
        } catch (finalError: any) {
            console.error("Gemini Error:", finalError);
            
            // 3. List available models to help user debug
            try {
                console.log("Attempting to list available models...");
                const modelsResponse = await ai.models.list();
                console.log("--- AVAILABLE GEMINI MODELS ---");
                const models = [];
                // @ts-ignore - Pager is async iterable
                for await (const model of modelsResponse) {
                    models.push(model);
                }
                console.table(models);
                console.log("-------------------------------");
            } catch (listError) {
                console.warn("Failed to list models:", listError);
            }

            if (finalError.message?.includes('429') || finalError.status === 429) {
                return "⚠️ **公用 AI 額度已達上限 (Rate Limit Exceeded)**\n\n因使用人數眾多，公用額度暫時耗盡。請點擊下方的「**設定模型 / API Key**」按鈕，填入您自己的 Google Gemini API Key 即可繼續免費使用。\n\n👉 [取得免費 API Key (Google AI Studio)](https://aistudio.google.com/app/apikey)";
            }

            return `AI Analysis Failed: ${finalError.message || finalError.toString()}. \n\nPlease check the browser console (F12) to see the list of available models for your API Key.`;
        }
  }
};
};
