import { GoogleGenerativeAI } from "@google/generative-ai";
import { DashboardData } from "../types";

// === Helper: 錯誤訊息美化 ===
const extractErrorMessage = (error: any): string => {
  if (!error) return 'Unknown Error';
  
  // 優先檢查 axios 或 fetch 錯誤物件結構
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  
  let msg = error.message || error.toString();

  // 1. 嘗試解析隱藏在文字中的 JSON 錯誤
  try {
    const jsonStart = msg.indexOf('{');
    const jsonEnd = msg.lastIndexOf('}') + 1;
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonStr = msg.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonStr);
      if (parsed.error && parsed.error.message) return parsed.error.message;
      if (parsed.message) return parsed.message;
    }
  } catch (e) {}
  
  return msg;
};

// === Helper: 資料減肥 (保留) ===
const cleanDataForAI = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(cleanDataForAI);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const k = key.toLowerCase();
      if (k.includes('icon') || k.includes('image') || k.includes('url') || k.includes('avatar')) return acc;
      if (k.includes('date_') || k.includes('expire')) return acc;
      if (k.includes('description') || k.includes('desc')) return acc;
      if (k.includes('_preset_2') || k.includes('_preset_3')) return acc;
      if (k === 'title' || k === 'world_name') {}
      acc[key] = cleanDataForAI(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

// === Helper: 安全提取 Stream Chunk 文字 (兼容不同 SDK 版本) ===
const extractTextFromChunk = (chunk: any): string => {
  try {
    // 1. 優先嘗試官方標準方法 (若是函式 - 舊版 SDK)
    if (typeof chunk.text === 'function') {
      return chunk.text();
    }
    // 2. 其次嘗試直接屬性
    if (typeof chunk.text === 'string') {
      return chunk.text;
    }
    // 3. 最後嘗試深層解析 (若為原始 JSON 結構)
    if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content && chunk.candidates[0].content.parts) {
      return chunk.candidates[0].content.parts[0].text || '';
    }
    return '';
  } catch (e) {
    return '';
  }
};

// UPDATE: 預設值改為 gemini-3.1-flash-lite-preview
export const analyzeCharacter = async (data: DashboardData, apiKey: string, modelId: string = 'gemini-3.1-flash-lite-preview', ignoreWarnings: boolean = false, onProgress?: (msg: string) => void): Promise<string> => {
  if (!apiKey) {
    return "💡 **請在使用前設定您的 API Key**\n\n基於資安考量，本站不再內建公用的 API Key。\n請點擊右下方的 **「設定模型 / API Key」** 按鈕，輸入您專屬的 [Google Gemini API 金鑰](https://aistudio.google.com/app/apikey) 以啟用分析功能。";
  }

  // 1. 資料前處理
  const simpleData = cleanDataForAI(data);

  // 1.5. 【代碼層攔截】練功裝備判定
  const getStatValue = (names: string[]): number => {
    const stat = data.stat.final_stat.find(s => names.includes(s.stat_name));
    if (!stat || !stat.stat_value) return 0;
    return parseFloat(stat.stat_value.replace(/[^0-9.]/g, '')) || 0;
  };

  const dropRate = getStatValue(['Item Drop Rate', '道具掉落率']);
  const mesoRate = getStatValue(['Mesos Obtain', '楓幣獲得量']);

  // 觸發條件：掉寶 > 150 或 楓幣 > 150
  // 因應「豪華真實符文 (Luxury Authentic Force)」與神器系統可能提供約 50%~100% 的常駐掉寶/楓幣率，
  // 故將門檻大幅放寬至 150%，只有超過此數值才判定為特地穿著打寶/打錢裝。
  if (!ignoreWarnings && (dropRate > 150 || mesoRate > 150)) {
    return `WARNING_DROP_RATE_TOO_HIGH|${dropRate}|${mesoRate}`;
  }

  // 2. 提取摘要 (保留)
  const relevantStats = data.stat.final_stat
    .filter(s => ['STR', 'DEX', 'INT', 'LUK', 'HP', 'Combat Power', 'Boss Damage', 'Ignore Defense Rate', 'Final Damage', 'Critical Damage', 'Item Drop Rate', 'Mesos Obtain'].includes(s.stat_name) || ['戰鬥力', 'BOSS怪物傷害', '無視防禦率', '最終傷害', '爆擊傷害', '道具掉落率', '楓幣獲得量'].includes(s.stat_name))
    .map(s => `${s.stat_name}: ${s.stat_value}`)
    .join(', ');

  const specialStats = data.stat.final_stat
    .filter(s => ['Star Force', 'Arcane Power', 'Authentic Force', '星力', '神秘力量', '真實之力'].includes(s.stat_name))
    .map(s => `${s.stat_name}: ${s.stat_value}`)
    .join(', ');

  const artifactLevel = data.unionArtifact?.union_artifact_level ?? data.union?.union_artifact_level ?? 0;
  const unionInfo = `聯盟等級: ${data.union?.union_level || 0}, 神器等級: ${artifactLevel}`;

  const isChallengerServer = data.basic.world_name === '挑戰者' || data.basic.world_name.includes('挑戰者');

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
      
      // TMS 特殊欄位 (官方 Slot 名稱)
      item.item_equipment_slot === '馴服的怪物' || item.item_equipment_slot === 'Tamed Monster' || // Totem 1
      item.item_equipment_slot === '馬鞍' || item.item_equipment_slot === 'Saddle' ||             // Totem 2
      item.item_equipment_slot === '怪物裝備' || item.item_equipment_slot === 'Monster Equipment' || // Totem 3
      
      // 兼容可能出現的舊名稱或 API 變體
      item.item_equipment_slot === 'Totem 1' || 
      item.item_equipment_slot === 'Totem 2' ||
      item.item_equipment_slot === 'Totem 3' ||
      
      item.item_name.includes('寶玉') || // 寶玉通常在 Pendant 欄位，靠名稱抓
      item.item_name.includes('圖騰') || // 額外保險
      
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
    .slice(0, 40) // 放寬數量限制，確保能包含圖騰寶玉後不被截斷
    .map(item => {
      // 針對「寶玉」進行特殊顯示名稱處理，避免 AI 混淆
      let displaySlot = item.item_equipment_slot;
      if (item.item_name.includes('寶玉') && (displaySlot === 'Pendant' || displaySlot === '墜飾')) {
         displaySlot = 'Gem'; // 強制改名為 Gem (寶玉)
      }
      
      let info = `[${displaySlot}] ${item.item_name}`;
      
      // 1. 基本資訊 (星力/等級/塔戒)
      const baseDetails = [];
      if (item.starforce && item.starforce !== '0') baseDetails.push(`${item.starforce}星`);
      if (item.special_ring_level) baseDetails.push(`塔戒Lv.${item.special_ring_level}`);
      if (item.soul_name) baseDetails.push(`靈魂:${item.soul_name}`);
      if (baseDetails.length > 0) info += ` (${baseDetails.join(', ')})`;

      // 2. 潛能階級
      const potGrade = item.potential_option_grade;
      const addPotGrade = item.additional_potential_option_grade;
      if (potGrade || addPotGrade) {
        info += ` | 階級: ${potGrade || '無'}/${addPotGrade || '無'}`;
      }

      // 3. 詳細潛能 (主潛+附加) - 讓 AI 看到完整數據
      const mainLines = [item.potential_option_1, item.potential_option_2, item.potential_option_3].filter(Boolean);
      const addLines = [item.additional_potential_option_1, item.additional_potential_option_2, item.additional_potential_option_3].filter(Boolean);
      
      if (mainLines.length > 0) info += ` | 主潛: ${mainLines.join(' / ')}`;
      if (addLines.length > 0) info += ` | 附加: ${addLines.join(' / ')}`;

      // 4. 武器類顯示總攻
      if (['Weapon', 'Sub Weapon'].includes(item.item_equipment_slot)) {
         info += ` | 總攻: ${item.item_total_option.attack_power || 0} / 總魔: ${item.item_total_option.magic_power || 0}`;
      }

      return info;
    })
    .join('\n    '); // 使用換行符號讓每個裝備獨立一行，方便 AI 閱讀

  // [新增] 拼圖判定 Logic
  const puzzle = data.set_effect?.set_effect?.find(s => s.set_name.includes('拼圖'));
  const puzzleInfo = puzzle ? `\n    [拼圖] ${puzzle.set_name}` : '';

  const prompt = `
    您是一位《新楓之谷》（TMS 台灣伺服器）的頂尖理論計算專家與骨灰級玩家。
    請依據提供的角色數據，進行嚴格且符合當前版本環境（Meta）的強度分析。
    
    **【重要語言規範】**
    1. **全繁體中文輸出：** 請全程使用 **台灣繁體中文 (Traditional Chinese)** 回答。
    2. **術語在地化：** 所有遊戲術語（如裝備名稱、屬性、BOSS名）**必須使用 TMS 官方譯名**，嚴禁使用 GMS (英文) 或 CMS (簡體) 用語。
       - (X) Attack Power -> (O) 攻擊力
       - (X) Ignore Defense -> (O) 無視防禦
       - (X) Boss Damage -> (O) BOSS傷害
       - (X) Pitch Boss -> (O) 漆黑BOSS
       - **塔戒 (Seed Ring) 命名規範：** **禁止使用縮寫（如 RoR4, WJ4）**。請務必使用完整中文名稱 (例如：規範戒指 Lv4、武器泡泡 Lv4)。
    3. **禁止晶晶體：** 除非是常見縮寫 (如 ARC, AUT)，否則請勿中英夾雜。

    --- 【當前遊戲環境設定 (Meta Context)】 ---
    0. **【特例檢測】挑戰者伺服器判定 (Challenger Server Check)：**
       ${isChallengerServer 
         ? `**注意：該角色位於「挑戰者伺服器」。此為特殊活動伺服器，擁有強大的被動 Buff 能力 (如高額無視防禦、BOSS傷害)，不需要依賴聯盟戰地與聯盟神器。** 
            - **請完全忽略「聯盟戰地」與「聯盟神器」的檢核** (即使很低或為0也是正常的)。
            - 由於伺服器 Buff 強大，可以視為該角色自帶額外戰鬥力，**請將其 BOSS 攻略能力適度上調 (比一般伺服器更容易打王)。**` 
         : `此為一般伺服器角色，請正常檢核「聯盟戰地」與「聯盟神器」是否達標。`
       }

    0-1. **【特例檢測】職業強度修正 (Class Balance Adjustment)：**
       **「陰陽師 (Kanna)」、「劍豪 (Hayato)」、「墨玄 (Mo Xuan)」、「琳恩 (Lynn)」** 為現行版本 **T0 級別強勢職業**。
       - 由於技能倍率/機制過於強大，**請適度下調其戰力檢核標準 (Combat Power Standard)**。 
       - 意即：即便戰力稍低於上述「BOSS 單人通關最低戰力需求表」或「評級標準」，仍可判定為達標/通關。

       **【注意】關於「蓮」的職業識別：**
       - 如果看到職業欄位顯示 **「蓮」**，這就是新職業。
       - **絕對不是** 劍豪 (Hayato)、也不是阿戴爾、琳恩或幻獸師。請務必將「蓮」正確識別。

    1. **武器/能源階級：** 認定「命運武器」為目前最強武器；「米特拉的憤怒」為目前最強能源（漆黑裝備），其次是「創世武器 (Genesis)」，再來是「神秘冥界 (Arcane)」。
       * **重要規則：** **創世/命運武器是固定素質，無法強化 (卷軸/星力)，僅能洗潛能、附加潛能以及星火和靈魂寶珠。** 請勿因其未衝卷或星力低而給予負評。
       * **靈魂寶珠判定 (Soul Orb)：** 請務必檢視武器是否鑲嵌靈魂寶珠。
         - **T0 (頂標)：** 武公寶珠 (最強爆發)、瑪麗西亞寶珠 (最強增傷)。
         - **T1 (優秀)：** 艾畢奈亞寶珠 (BOSS攻擊增傷)、露希妲寶珠 (增加無視防禦)、烏勒斯寶珠 (小幅增加BOSS攻擊力)。
         - 若擁有 T0 寶珠，請給予極高評價。

    2. **防具階級：** 「永恆裝備 (Eternal)」為頂標，其次是「滅龍騎士盔甲 (Dragon Knight/Breath of Divinity set)」，再來是神秘冥界。
    3. **特殊道具判定：** * **塔戒 (Seed Rings) / MX-131 / 黑翼胸章：** 此類裝備無法衝星與洗潛能（MX-131/黑翼為胸章），顯示「0星/無潛能」為正常現象。只要裝備清單中包含此類道具，即代表該玩家具備高階配裝觀念，請直接視為「加分項目」並給予正面評價。
       * **VIP 胸章：** 這是極稀有的絕版道具，且是**唯一可以上潛能與衝星 (最高5星)** 的胸章。若玩家擁有此裝備且有潛能，請給予極高評價。
       * **卓越強化 (Exceptional Enhancement)：** 
         - **僅限「漆黑BOSS裝備 (Pitch Boss Set)」的「腰帶 (Belt)、臉飾 (Face)、眼飾 (Eye)、耳環 (Earrings)」部位** 可進行此強化，且**強化一次即為滿級**。
         - 其他漆黑部位 (如戒指/項鍊/心臟/徽章) 無法卓越強化。
         - 若發現裝備有此強化，代表該玩家投入了巨額成本，**請務必給予極高評價**。
         - **重要例外：「光輝BOSS裝備 (Brilliant Boss Set)」(如: 根源的耳語、死亡之誓、不朽的遺產) 目前版本無法進行卓越強化**，請勿對此類裝備提出卓越強化的建議或檢查。
       * **內在潛能 (Inner Ability)：** **第 2、3 排潛能「罕見 (Unique)」即為正常達標** (打王低標)，切勿要求這些欄位必須是傳說 (Legendary)，因為那通常需要高額現金道具且非必要。但**屬性內容必須實用** (如：異常狀態增傷/無視冷卻/BOSS傷害/爆擊率/加持時間等) 才算合格；若為廢屬性 (如防禦/跳躍) 則屬配置不當。
    
    3-1. **潛能屬性判定標準 (Potential Logic)：**
       - **攻擊力% (ATT%) / 魔法攻擊力%：** **僅限「武器 (Weapon)、副武器 (Secondary)、能源 (Emblem)」(所謂的三武)** 有效。
       - **其他防具/飾品 (Armor/Accessory)：**
         - **主潛能 (Main Potential)：** 以 **主屬性% (STR/DEX/INT/LUK)** 為首要考量。
           * **例外：手套 (Gloves)** 的 **「爆擊傷害 (Crit Damage)」(如: 雙爆/三爆)** 效益遠高於主屬性，為最高優先級。
           * **例外：帽子 (Hat)** 的 **「冷卻時間減少 (Cooltime Reduction, -CD)」** (如: -1或-2秒)。
             - **請注意：此屬性並非所有職業適用。**
             - 若該職業高度依賴短CD技能 (如：傑諾、幻影俠盜、神之子、劍豪等)，且帽子有 -CD 屬性，請給予極高評價 (因為這比純屬性更難取得)。
             - 若該職業無需 -CD，則視為普通屬性或次等屬性。
         - **附加潛能 (Additional Potential)：** 以 **主屬性%** 或 **「每9級屬性+1 / +2 (Per 9 Lvl + Stat)」** 為首要考量。若防具出現攻擊力數值(非%)亦可接受，但屬性%還是優選。

    4. **技能等級標準：**
       - **六轉 (HEXA/VI) 技能：** 技能名稱常帶有「VI」後綴。滿等 30 級。**Lv 1~9 為初期，Lv 10~19 為中階，Lv 20+ 為高階。** 請勿將六轉技能等級（如 Lv.5）誤判為過低，這在六轉系統中屬於正常過渡期。
       - **六轉 (HEXA) 屬性核心：** **切勿建議玩家追求「主屬性 Lv.10」**。該等級機率極低，僅理論上可行。
         * **主屬性 Lv.5~7** 即為合格/優秀標準。
         * **主屬性 Lv.8+** 已屬頂尖運氣/重金打造。
         * 分析時請勿因為屬性核心未滿級而給予負面評價。
       - **五轉 (V 矩陣)：** 單顆核心滿等 25 級。若看到 V 矩陣核心等級較低，可能是新練的核心，或是額外的技能點，請優先依據「六轉技能」是否存在來判斷機體強度。
       - **聯盟神器 (Union Artifact)：** **請注意「神器等級」滿等並非 Lv.50 (水晶七顆才是50等，但通常代表有一定培養才能達到此等級)。** 
         * 玩家的神器等級通常會隨著水晶數量與等級加總而更高 (例如 Lv.55+)。
         * **切勿看到 Lv.50 就判定為滿等**；該等級僅屬高階水準(也很足夠了)，等級再往上才是頂尖玩家會考慮。

    5. **台版特色：** 分析時請務必考量 TMS 特有道具（如：天上的氣息、MX-131、黑翼胸章、女武神之心、培羅德套裝）以及高階卷軸（星彩卷、黑卷、救世卷、命運卷、V卷）與星力（22星為高標）的加成影響。
    6. **評分標準 (C級 ~ SSS+級 / 突破制評分)：** 
       請嚴格根據「面板戰鬥力 (Combat Power)」進行分級，**切勿自行腦補「有效戰力」而將分數打過高**。
       *註：即便裝備再好，若面板戰鬥力未達標，仍不可給予該階級的分數 (例如：2.5億戰力不可評為 SS 級)。*

       - **C 級 (新手/回鍋 | 1-4 分)：** 湊齊深淵/航海，等級 < 260，ARC 成長中，無 AUT。
       - **B 級 (中階玩家 | 5-7 分)：** 神秘套裝/培羅德/10星，等級 260+ (已六轉)，ARC 達標黑魔法師 (1320)，AUT 起步 (賽爾尼溫/阿爾克斯)。
       - **A 級 (高階玩家 | 8-9 分)：** 滅龍或永恆混搭/主潛能傳說/漆黑BOSS裝備/創世解放，等級 275+ (桃源境以上)，AUT 充足 (350~500+)。
       - **S 級 (頂尖強者 | 10 分)：** **戰力 2 億以上** (約普通卡洛斯門檻)。創世武器解放、17 星為標配，等級 280+。
       - **S+ 級 (卓越超群 | 10.5 分)：** **戰力 4 億以上** (可單吃終極史烏)。
       - **SS 級 (超凡入聖 | 11-12 分)：** **戰力 10 億以上** (可單吃混沌卡洛斯)。**必須嚴格達到 10 億才可給予此階級**。22 星為標配，附加潛能傳說，命運武器解放，光輝裝備，AUT 高標 (600+)。
       - **SSS 級 (絕世神人 | 13-14 分)：** **戰力 11 億 - 19.9 億**。頂級配置，全伺服器前段班。
       - **SSS+ 級 (傳說再世 | 15 分)：** **戰力 20 億以上**。理論頂點，無懈可擊 (單吃終極難度)。

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
       - **LV280 燦爛的兇星 (尚未開放):** 普通 400 / 困難 550
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
        - **露希妲:** 簡單 300萬 / 普通 1000萬 / 困難 3200~3500萬
        - **威爾:** 簡單 500萬 / 普通 1000萬 / 困難 2800萬
        - **巨大怪獸戴斯克:** 普通 1300萬 / 混沌 2300萬
        - **親衛隊長頓凱爾:** 普通 1300萬 / 困難 2800萬
        - **真‧希拉:** 普通 1500萬 / 困難 2800~3000萬
        - **瑪麗西亞:** 普通 2億 / 終極 20億(此為3人組隊最低戰力，除非非常熟悉機制否則目前版本無單吃終極難度可能)
        - **守護天使綠水靈:** 普通 2000萬 / 混沌 4000萬
        - **黑魔法師:** 困難 6500萬 / 終極 7~8.5億
        - **賽蓮:** 普通 5000萬 / 困難 9000萬~1億 / 終極 8.5~10億
        - **監視者卡洛斯:** 簡單 7000萬 / 普通 2億 / 混沌 10億 / 終極 22~25億
        - **最初的敵對者:** 簡單 1億 / 普通 4億 / 困難 15億 / 終極 40億
        - **咖凌:** 簡單 1億 / 普通 4.3億 / 困難 10~12億 / 終極 30~35億
        - **燦爛的兇星 (尚未開放):** 普通 7~8億 / 困難 13~15億
        - **林波:** 普通 7億 / 困難 12~14億
        - **巴德利斯:** 普通 10億 / 困難 20~30億
          (請根據玩家的面板戰鬥力與上述門檻進行評估，並在「BOSS 攻略建議」中標註最高可單吃難度。)

    **【⚠️ 絕對邏輯運算守則 (Strict Logic Gate)】**
    在進行「BOSS 攻略建議」分析時，請務必執行以下邏輯檢查，嚴禁違反：
    1. **戰力硬門檻：** 請拿玩家的「面板戰鬥力」與上述「BOSS 單人通關最低戰力需求表」進行數值比對。
    2. **禁止越級：** 若玩家戰鬥力 **低於** 表格中的門檻，且**非**上述「強勢職業」 (Kanna/Hayato/Mo Xuan)，**絕對禁止** 評價為「穩通」、「碾壓」或「單吃」。必須誠實標註為「戰力不足，建議組隊」或「極限挑戰」。
    3. **權重優先級：** 「戰力門檻」的權重 > 「等級壓制」或「TMS裝備加成」。即便等級高、裝備好，只要面板戰力沒到 (且非強勢職業)，就不算穩通。

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
    ${topItems}${puzzleInfo}

    --- 完整詳細數據 (Full JSON) ---
    (已過濾圖片與冗餘資訊，請參考此處進行深度分析)
    ${JSON.stringify(simpleData)}
    
    ---

    請依照以下要求，**依序**輸出您的分析結果。

    0.  **角色機體簡評 (摘要)：** 請用列點方式，快速總結該角色的核心狀態 (職業/等級、面板戰鬥力、聯盟戰地/神器、重點裝備狀態)，作為分析開場。

    1.  **戰力評級：** 
        請使用 **標題語法 (###)** 與 **引用語法 (>)** 將分數特別放大高亮，使其在報告中非常顯眼。
        格式範例：
        ### 戰力評級：15 分 (SSS+ 級 - 傳說再世)
        > **(此處用一句話簡述核心理由)**
        
        並在下方詳細說明給分依據。

    2.  **BOSS 攻略建議 (關鍵指標)：** 
        *   **直接建立 Markdown 表格**，**切勿在此重複列出角色數據**。
        *   表頭格式：| BOSS名稱 | 最高可單吃難度 | 建議 | 關鍵短評 |
        *   **完整列表強制要求：** 表格必須包含以下 **14 隻** BOSS，嚴禁遺漏或截斷：
             **史烏、戴米安、露希妲、威爾、戴斯克、頓凱爾、真‧希拉、瑪麗西亞、守護天使綠水靈、黑魔法師、賽蓮、卡洛斯、最初的敵對者、燦爛的兇星 (標註尚未開放)、咖凌、林波、巴德利斯**。
             (即使玩家戰力很低，也必須列出所有 BOSS 並標註「戰力不足」。請勿偷懶只列出幾隻。)
        *   **內容填寫規則：** 
            - **最高可單吃難度**：請根據戰力門檻找出該玩家能單吃的「最高難度」。
            - 若連最低難度都無法單吃（戰力未達標），請填寫該 BOSS 的最低難度並在建議欄標註「戰力不足」。
        *   請精簡「關鍵短評」文字，以確保表格能完整輸出。

    3.  **提升建議 (針對 TMS 環境)：** 提出 **2 項具體且高投資報酬率** 的傷害提升建議。
        * 請全方位檢視「短版」 (例如：裝備雖強但 ARC/AUT 不足、或六轉技能等級過低、聯盟戰地太低等)。

    4.  **點評：** 
        請使用 **標題語法 (###)** 與 **引用語法 (>)** 將這段評語特別放大高亮。
        格式範例：
        ### 💡 專家點評：
        > 「(您的幽默吐槽內容...)」

        **內容要求：**
        請發揮您的創意，根據該玩家的數據寫下一段 **30~100 字左右**，幽默、辛辣或充滿情懷並帶有「楓之谷老玩家梗」來吐槽或稱讚他的狀態的評語。
        *   **風格建議：** 可以是「骨灰級老手對新手的期許」、「土豪玩家的羨慕嫉妒恨」、「肝帝的敬佩」、或是「非洲人炸裝的同情」。
        *   **嚴格禁止硬湊：** 上述括號內的範例僅是列舉，請**絕對不要**把「廣播收點、尬廣跟上、測謊機、練等到暴斃」這些詞全部硬塞在同一段話裡。
        *   **自然融入：** 請根據玩家的「真實機體」選擇 **1 個最貼切的梗** 即可。
            - 裝備太強：笑他是「橘子親兒子」或「把薪水都變成喜歡的形狀」。
            - 裝備太爛：笑他「穿成掉寶裝」或「是被外掛搶圖搶到沒心情玩嗎」。
            - 練度太高：笑他「是不是住在練功場」或「肝還在嗎」。
            - 運氣太差：笑他「被橘子機率制裁」或「該去拜拜了」。
        *   讓這段話像個真實的台灣資深玩家在 Discord 用語音嗆朋友一樣自然，不要寫成像是關鍵字堆砌的機器人文章！
    
    5.  **結束標記：** 請在分析結束時輸出一行「--- Analysis Complete ---」。

    **【嚴格輸出格式控制】**
    *   **No Intro:** 禁止輸出「根據您的數據...」、「這是一份分析...」等廢話。
    *   **No Loops:** 禁止重複輸出已經寫過的章節。
    *   **Complete Output:** 必須完整輸出上述所有對應章節，絕對不可中斷。
    *   **Structure:** 必須嚴格遵守 0 -> 1 -> 2 -> 3 -> 4 的順序。
  `;

  // === 修正開始: 重新定義模型列表與錯誤優先級 ===
  
  // 1. 強制過濾：若傳入 gemini-2.0-flash (可能來自舊緩存)，直接升級為 2.5，避免觸發 2.0 額度錯誤
  const effectiveModel = modelId === 'gemini-2.0-flash' ? 'gemini-2.5-flash' : modelId;

  let modelsToTry = [effectiveModel];

  // 3.1 系列 (Pro/Flash/Lite) -> 3.1 Flash-Lite -> 3.0 Flash -> 2.5 Flash
  if (effectiveModel.includes('3.1')) {
      if (effectiveModel !== 'gemini-3.1-flash-lite-preview') {
          modelsToTry.push('gemini-3.1-flash-lite-preview');
      }
      modelsToTry.push('gemini-3-flash-preview');
      modelsToTry.push('gemini-2.5-flash');
  } 
  // 3.0 系列 -> 2.5 Flash
  else if (effectiveModel.includes('3.0') || effectiveModel.includes('3-')) { 
      // 若使用者選的是 3.0 Pro，也可以考慮降級跑 3.0 Flash，再跑 2.5 Flash
      if (effectiveModel !== 'gemini-3-flash-preview') {
          modelsToTry.push('gemini-3-flash-preview');
      }
      modelsToTry.push('gemini-2.5-flash');
  } else {
      modelsToTry.push('gemini-2.5-flash');
  }
  
  // 2. 去除重複並過濾空值
  modelsToTry = [...new Set(modelsToTry)].filter(Boolean);
  
  // 3. 再次確保清單中沒有 2.0 (雙重保險)
  modelsToTry = modelsToTry.filter(m => m !== 'gemini-2.0-flash');

  let lastError: any = null;
  // 關鍵新增：用來暫存「額度滿」的錯誤，因為它的優先級比「找不到模型」高
  let quotaError: any = null; 
  // 新增：伺服器過載標記
  let serverOverloadedError: any = null;

  // const ai = new GoogleGenAI({ apiKey }); // Removed to fix hidden error

  // Helper: 帶超時的 Promise Wrapper
  const withTimeout = (promise: Promise<any>, ms: number, modelName: string) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`TIMEOUT: Model ${modelName} did not respond within ${ms/1000} seconds`)), ms))
    ]);
  };

  for (const currentModel of modelsToTry) {
    try {
      console.log(`Trying Gemini Model: ${currentModel}`);
      onProgress?.(`正在嘗試連線 ${currentModel.replace('gemini-', '')} 模型...`);
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: currentModel,
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
      });

      // 根據模型調整超時時間：應使用者要求延長等待時間
      // Preview 模型與穩定版模型皆統一給予 180 秒 (3分鐘) 以避免 3.0 模型思考過久導致 Timeout
      const TIMEOUT_MS = 180000;
      
      const generationConfig = {
          maxOutputTokens: 16384, // 增加 Token 上限以避免截斷 (原 8192)
          temperature: 0.7,
      };

      // @ts-ignore
      const result = await withTimeout(
        model.generateContentStream({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig
        }), 
        TIMEOUT_MS, 
        currentModel
      );
      
      let fullText = '';
      
      for await (const chunk of result.stream) {
        let chunkText = '';
        try {
            chunkText = chunk.text();
        } catch (e) { 
            // 某些 Block 情況下 text() 會噴錯
        }
        
        if (chunkText) {
          fullText += chunkText;
        }
      }

      if (!fullText) throw new Error(`Empty Response from ${currentModel}`);
      
      return fullText + `\n\n_(Gemini 模型： **${currentModel}**)_`;

    } catch (error: any) {
      const cleanMsg = extractErrorMessage(error);
      
      // 使用 console.error 確保在控制台顯示紅色錯誤 (使用者可能過濾了 warn)
      console.error(`[Gemini Error] Model: ${currentModel} Failed`);
      console.error(`[Gemini Error] Details: ${cleanMsg}`);
      console.error('--- RAW ERROR OBJECT ---');
      console.dir(error); 
      console.error('------------------------');
      
      onProgress?.(`⚠️ ${currentModel.replace('gemini-', '')} 連線失敗/額度滿，正在切換備用模型...`);

      // === 關鍵邏輯：優先捕捉 429 錯誤 ===
      if (cleanMsg.includes('429') || cleanMsg.includes('Quota') || cleanMsg.includes('exhausted')) {
          quotaError = error; // 抓到了！這是最有價值的錯誤
      } else if (cleanMsg.includes('503') || cleanMsg.includes('overloaded') || cleanMsg.includes('UNAVAILABLE') || cleanMsg.includes('TIMEOUT')) {
          serverOverloadedError = error; // 抓到了！伺服器忙碌或超時
      }
      
      lastError = error;
      
      // 失敗後多等幾秒，讓使用者看清楚錯誤提示，也避免過快重試被打回
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // 錯誤處理：優先檢查是否有遇過 Quota Error，其次是 Overloaded Error
  const finalError = quotaError || serverOverloadedError || lastError; 
  
  if (finalError) {
      const errorMsg = extractErrorMessage(finalError);
      console.error("All Gemini Models Failed. Final Error:", errorMsg);

      if (errorMsg.includes('429') || errorMsg.includes('Quota') || errorMsg.includes('exhausted')) {
        return "⚠️ **AI 額度已達上限 (Rate Limit Exceeded)**\n\n因使用人數眾多，公用額度暫時耗盡。請稍等 1 分鐘後再試，或更換您自己的 Google Gemini API Key。";
      }

      if (errorMsg.includes('503') || errorMsg.includes('overloaded') || errorMsg.includes('UNAVAILABLE')) {
        return "AI Analysis Failed: ⚠️ **AI 伺服器忙碌中 (Server Overloaded)**\n\nGoogle Gemini 伺服器目前負載過高，暫時無法回應。請稍等 30 秒後再試，或嘗試切換至較穩定的 gemini-2.5-flash 模型。";
      }

      if (errorMsg.includes('TIMEOUT')) {
         return "AI Analysis Failed: ⚠️ **AI 分析連線逾時 (Timeout)**\n\n等待 AI 回應時間過長，系統已自動中止連線。建議您稍後再試，或檢查您的網路連線。";
      }

      if (errorMsg.includes('API key not valid') || errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('invalid authentication credentials')) {
        return "AI Analysis Failed: ⚠️ **AI 分析失敗：API Key 無效**\n\n您輸入的 API Key 無法使用，可能已失效或複製錯誤。\n請確認 Key 是否正確，或[取得新的免費 API Key](https://aistudio.google.com/app/apikey)。";
      }

      if (errorMsg.includes('User location is not supported')) {
         return "AI Analysis Failed: ⚠️ **AI 分析失敗：地區不支援**\n\nGoogle Gemini 目前不支援您所在的地區 (或 VPN IP)。";
      }

      if (errorMsg.includes('Permission denied')) {
         return "AI Analysis Failed: ⚠️ **AI 分析失敗：權限不足**\n\n您的 API Key 沒有權限存取此模型，請檢查 Google Cloud Console 設定。";
      }
      
      if (errorMsg.includes('404') || errorMsg.includes('not found')) {
         return `AI Analysis Failed: ⚠️ **AI 分析失敗：找不到模型**\n\n系統無法連接 AI 模型 (${modelsToTry.join(', ')})。\n通常是因為 Google 暫時下架了舊模型，請嘗試切換其他模型。`;
      }

      return `AI Analysis Failed: ⚠️ **AI 分析發生未預期錯誤**\n\n錯誤訊息: ${errorMsg}\n\n(Tried models: ${modelsToTry.join(', ')})`;
  }
  
  return "AI Analysis Failed: Unknown Error.";
};