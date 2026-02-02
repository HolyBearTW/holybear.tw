import { GoogleGenAI } from "@google/genai";
import { DashboardData } from "../types";

// === Helper: 資料減肥 (關鍵優化) ===
const cleanDataForAI = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(cleanDataForAI);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const k = key.toLowerCase();
      // 1. 移除圖片與網址
      if (k.includes('icon') || k.includes('image') || k.includes('url') || k.includes('avatar')) {
        return acc;
      }
      // 2. 移除日期與過期資訊
      if (k.includes('date_') || k.includes('expire')) {
        return acc;
      }
      // 3. 移除描述
      if (k.includes('description') || k.includes('desc')) {
        return acc;
      }
      // 4. 移除備用預設
      if (k.includes('_preset_2') || k.includes('_preset_3')) {
        return acc;
      }
      // 5. 移除其他不必要的 UI 標記
      if (k === 'title' || k === 'world_name') {
        // 保留基本資訊
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

  // 1. 資料前處理
  const simpleData = cleanDataForAI(data);

  // 2. 提取重點摘要 (保留你原本的邏輯)
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
        .slice(0, 10)
        .map(s => `${s.v_core_name} Lv.${s.v_core_level + s.slot_level}`)
        .join(', ')
    : '無五轉技能';

  const abilityLines = data.ability.ability_info
    .map((a, i) => `Line ${i+1} (${a.ability_grade}): ${a.ability_value}`)
    .join('; ');

  const topItems = data.equipment.item_equipment
    .filter(item => 
      item.item_equipment_slot === 'Weapon' || 
      item.item_equipment_slot === 'Sub Weapon' || 
      item.item_equipment_slot === 'Emblem' || 
      parseInt(item.starforce) > 17 || 
      item.potential_option_grade === 'Legendary' ||
      ['規範', '永續', 'MX-131', '黑翼', 'VIP', '創世', '米特拉', '永恆', '滅龍'].some(keyword => item.item_name.includes(keyword))
    )
    .slice(0, 20)
    .map(item => `${item.item_equipment_slot}: ${item.item_name} (${item.starforce}星, ${item.potential_option_grade || '無潛能'}${item.special_ring_level ? ', 塔戒Lv.' + item.special_ring_level : ''})`)
    .join('; ');

  // Prompt 內容保持不變
  const prompt = `
    您是一位《新楓之谷》（TMS 台灣伺服器）的頂尖理論計算專家與骨灰級玩家。
    請依據提供的角色數據，進行嚴格且符合當前版本環境（Meta）的強度分析。

    --- 【當前遊戲環境設定 (Meta Context)】 ---
    0. **【優先檢測】練功裝備判定 (Farming Gear Check)：**
       請優先檢查面板數據中的 **「道具掉落率 (Item Drop Rate)」** 與 **「楓幣獲得量 (Mesos Obtain)」**。
       * **若任一數值超過 100% (或兩者相加超過 150%)**：
           請判斷該玩家穿著「練功/打寶裝備」，而非「打王裝備」。
           **請直接拒絕評分**，並僅回覆：「⚠️ **檢測到您目前穿著練功/打寶裝備 (掉寶/楓幣率過高)**。為了獲得準確的戰力評估，請更換為全輸出的『打王裝備 (Bossing Gear)』後再重新進行分析。」
           **(請勿輸出任何分數、戰力評級或 BOSS 建議)**。
       * 若數值正常，請繼續進行以下分析。

    1. **武器/能源階級：** 認定「命運武器」為目前最強武器；「米特拉的憤怒」為目前最強能源（漆黑裝備），其次是「創世武器 (Genesis)」，再來是「神秘冥界 (Arcane)」。
    2. **防具階級：** 「永恆裝備 (Eternal)」為頂標，其次是「滅龍騎士盔甲」，再來是神秘冥界。
    3. **特殊道具判定：**
       * **塔戒 / MX-131 / 黑翼胸章：** 此類裝備0星/無潛能為正常現象，視為加分項目。
       * **VIP 胸章：** 稀有絕版，若有潛能與星力請給予極高評價。
       * **內在潛能：** 第 2、3 排「罕見」即達標，不強求傳說，但屬性需實用。
    4. **技能等級標準：**
       - **六轉 (HEXA)：** Lv 1~9 初期，Lv 10~19 中階，Lv 20+ 高階。
       - **屬性核心：** Lv.5~7 合格，切勿強求 Lv.10。
       - **五轉：** 優先依據六轉技能判斷強度。
    5. **台版特色：** 考量天上、MX-131、黑翼、女武神之心、V卷/X卷、22星。
    6. **評分標準 (C ~ SSS+ / 面板戰力基準)：** - S 級 (10分): 戰力 1億+ (創世/17星)
       - SS 級 (11-12分): 戰力 5億+ (22星/雙傳/AUT高標)
       - SSS 級 (13-14分): 戰力 10億+
       - SSS+ 級 (15分): 戰力 20億+
    7. **BOSS 數據與增減傷：** (參考前文設定，略)
    
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
    ${JSON.stringify(simpleData)}
    
    ---

    請依照以下四點要求，**依序**輸出您的分析結果。
    **⚠️ 重要：請直接從「1. 戰力評級」開始輸出。**

    1.  **戰力評級：** 請輸出 **「分數 (階級)」** 並簡述給分理由。
    2.  **BOSS 攻略建議 (關鍵指標)：** 建立 Markdown 表格。
    3.  **提升建議 (針對 TMS 環境)：** 提出 2 項高投報率建議。
    4.  **點評：** 一句簡短、幽默的楓之谷老玩家梗。
  `;

  // === 關鍵修正：定義模型嘗試順序 ===
  // 1. 如果使用者選了 3.0，我們嘗試 3.0 (Preview) -> 2.5 (Stable) -> 1.5 (Stable)
  // 2. 移除已過期的 2.0-flash-exp
  let modelsToTry = [modelId];
  
  if (modelId.includes('3.0')) {
      // 修正名稱：通常 API 需要完整的 Preview 名稱
      modelsToTry = ['gemini-3.0-flash-preview', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  } else {
      // 預設備案
      modelsToTry.push('gemini-2.5-flash', 'gemini-1.5-flash');
  }
  // 去除重複並過濾空值
  modelsToTry = [...new Set(modelsToTry)].filter(Boolean);

  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    try {
      console.log(`Trying Gemini Model: ${currentModel}`);

      // === 核心修正：根據模型名稱動態決定 API 版本 ===
      // 3.0 系列 -> v1beta (測試版路徑)
      // 2.5 / 1.5 系列 -> v1 (穩定版路徑)
      const isPreview = currentModel.includes('3.0') || currentModel.includes('preview') || currentModel.includes('exp');
      const apiVersion = isPreview ? 'v1beta' : 'v1';

      // 每次迴圈根據版本重新初始化 Client
      const ai = new GoogleGenAI({ 
        apiKey,
        // @ts-ignore: 適應不同版本的 SDK 定義
        apiClient: { apiVersion } 
      });

      const config = {
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
        }
      };

      // @ts-ignore
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config
      });
      
      const text = typeof response.text === 'function' ? response.text() : response.text;
      if (!text) throw new Error(`Empty Response from ${currentModel}`);
      
      return text;

    } catch (error: any) {
      console.warn(`Gemini Model (${currentModel}) failed with version ${currentModel.includes('3.0') ? 'v1beta' : 'v1'}: ${error.message}`);
      
      // 特殊處理：如果是 404 Not Found，通常代表版本不對，迴圈會自動試下一個穩定版
      lastError = error;
    }
  }

  // 錯誤處理
  const finalError = lastError;
  console.error("All Gemini Models Failed. Final Error:", finalError);
  
  if (finalError) {
      if (finalError.message?.includes('429') || finalError.status === 429) {
        return "⚠️ **公用 AI 額度已達上限**\n\n請使用您自己的 API Key。";
      }
      return `AI Analysis Failed: ${finalError.message}. (Tried: ${modelsToTry.join(', ')})`;
  }
  
  return "AI Analysis Failed: Unknown Error.";
};
