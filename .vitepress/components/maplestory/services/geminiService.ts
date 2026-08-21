import { GoogleGenerativeAI } from "@google/generative-ai";
import { DashboardData } from "../types";
import { DEFAULT_AI_MODEL, getAiModelOption, isOpenAiModel } from "../data/aiModels";

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

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';

const compactRecord = (record: any) => Object.fromEntries(
  Object.entries(record || {}).filter(([, value]) => hasValue(value) && value !== '0' && value !== 0)
);

const summarizeItemOption = (option: any) => compactRecord(option);

const buildAiSnapshot = (data: DashboardData) => {
  const equipment = (data.equipment?.item_equipment || []).map(item => ({
    slot: item.item_equipment_slot,
    name: item.item_name,
    level: item.item_level,
    starforce: Number(item.starforce) || 0,
    scroll: `${item.scroll_upgrade || 0}/${(Number(item.scroll_upgrade) || 0) + (Number(item.scroll_upgradable_count) || 0)}`,
    specialRingLevel: item.special_ring_level || undefined,
    potentialGrade: item.potential_option_grade || undefined,
    potentials: [item.potential_option_1, item.potential_option_2, item.potential_option_3].filter(Boolean),
    additionalPotentialGrade: item.additional_potential_option_grade || undefined,
    additionalPotentials: [item.additional_potential_option_1, item.additional_potential_option_2, item.additional_potential_option_3].filter(Boolean),
    totalOption: summarizeItemOption(item.item_total_option),
    flameOption: summarizeItemOption(item.item_add_option),
    scrollOption: summarizeItemOption(item.item_etc_option),
    exceptionalOption: summarizeItemOption(item.item_exceptional_option),
    soul: item.soul_name ? { name: item.soul_name, option: item.soul_option } : undefined,
  }));

  const pets = [1, 2, 3].map(index => {
    const pet = data.petEquipment as any;
    const equipmentInfo = pet?.[`pet_${index}_equipment`];
    const name = pet?.[`pet_${index}_name`];
    if (!name && !equipmentInfo) return null;
    return {
      name,
      type: pet?.[`pet_${index}_pet_type`],
      skills: pet?.[`pet_${index}_skill`] || [],
      potentials: pet?.[`pet_${index}_potential`] || [],
      equipment: equipmentInfo ? {
        name: equipmentInfo.item_name,
        options: equipmentInfo.item_option || [],
        scrollUpgrade: equipmentInfo.scroll_upgrade,
        scrollUpgradable: equipmentInfo.scroll_upgradable,
      } : undefined,
    };
  }).filter(Boolean);

  const hexaStatGroups = data.hexaMatrixStat
    ? [
        data.hexaMatrixStat.character_hexa_stat_core,
        data.hexaMatrixStat.character_hexa_stat_core_2,
        data.hexaMatrixStat.character_hexa_stat_core_3,
      ].flat().filter(Boolean)
    : [];

  const familiar = data.familiar;
  const familiarList = familiar?.familiar_list || familiar?.familiar_info || [];
  const previous = data.character_basic_7days_ago;

  return {
    profile: {
      name: data.basic.character_name,
      world: data.basic.world_name,
      class: data.basic.character_class,
      level: data.basic.character_level,
      expRate: data.basic.character_exp_rate,
      guild: data.basic.character_guild_name,
      liberationCleared: data.basic.liberation_quest_clear_flag,
      dataDate: data.lastUpdated,
    },
    sevenDayGrowth: previous ? {
      previousLevel: previous.character_level,
      previousExpRate: previous.character_exp_rate,
      levelDelta: data.basic.character_level - previous.character_level,
    } : null,
    finalStats: Object.fromEntries((data.stat?.final_stat || []).map(stat => [stat.stat_name, stat.stat_value])),
    unspentResources: {
      ap: data.stat?.remain_ap || 0,
      abilityFame: data.ability?.remain_fame || 0,
      hyperStatPoints: data.hyperStat?.hyper_stat_preset_1_remain_point || 0,
      artifactAp: data.unionArtifact?.union_artifact_remain_ap || 0,
    },
    equipmentPreset: data.equipment?.preset_no,
    equipment,
    title: data.equipment?.title?.title_name || null,
    ability: {
      grade: data.ability?.ability_grade,
      lines: (data.ability?.ability_info || []).map(line => ({ grade: line.ability_grade, value: line.ability_value })),
    },
    hyperStats: (data.hyperStat?.hyper_stat_preset_1 || []).filter(stat => stat.stat_level > 0).map(stat => ({
      type: stat.stat_type,
      level: stat.stat_level,
      increase: stat.stat_increase,
    })),
    linkSkills: (data.linkSkill?.character_link_skill || []).map(skill => ({
      name: skill.skill_name,
      level: skill.skill_level,
      effect: skill.skill_effect,
    })),
    ownedLinkSkill: data.linkSkill?.character_owned_link_skill ? {
      name: data.linkSkill.character_owned_link_skill.skill_name,
      level: data.linkSkill.character_owned_link_skill.skill_level,
      effect: data.linkSkill.character_owned_link_skill.skill_effect,
    } : null,
    union: data.union ? {
      level: data.union.union_level,
      grade: data.union.union_grade,
      artifactLevel: data.unionArtifact?.union_artifact_level ?? data.unionArtifact?.level ?? data.union.union_artifact_level,
      raiderPreset: data.unionRaider?.use_preset_no,
      raiderStats: data.unionRaider?.union_raider_stat || [],
      occupiedStats: data.unionRaider?.union_occupied_stat || [],
      innerStats: data.unionRaider?.union_inner_stat || [],
      blocks: (data.unionRaider?.union_block || []).map(block => ({
        class: block.block_class,
        level: block.block_level,
        type: block.block_type,
      })),
      artifactEffects: data.unionArtifact?.union_artifact_effect || [],
      artifactCrystals: (data.unionArtifact?.union_artifact_crystal || []).map(crystal => ({
        name: crystal.name,
        level: crystal.level,
        options: [crystal.crystal_option_name_1, crystal.crystal_option_name_2, crystal.crystal_option_name_3].filter(Boolean),
      })),
      champions: (data.unionChampion?.union_champion || []).map(champion => ({
        class: champion.champion_class,
        grade: champion.champion_grade,
        slot: champion.champion_slot,
        badges: champion.champion_badge_info || [],
      })),
      championBadges: data.unionChampion?.champion_badge_total_info || [],
    } : null,
    pets,
    symbols: (data.symbolEquipment?.symbol || []).map(symbol => ({
      name: symbol.symbol_name,
      level: symbol.symbol_level,
      force: symbol.symbol_force,
      growth: `${symbol.symbol_growth_count}/${symbol.symbol_require_growth_count}`,
      stats: compactRecord({ str: symbol.symbol_str, dex: symbol.symbol_dex, int: symbol.symbol_int, luk: symbol.symbol_luk, hp: symbol.symbol_hp }),
    })),
    setEffects: (data.setEffect?.set_effect || []).map(set => ({
      name: set.set_name,
      count: set.total_set_count,
      activeEffects: (set.set_effect_info || []).filter(effect => effect.set_count <= set.total_set_count),
    })),
    vMatrix: (data.vMatrix?.character_v_core_equipment || []).map(core => ({
      name: core.v_core_name,
      type: core.v_core_type,
      level: core.v_core_level + core.slot_level,
      enhancedSkills: [core.v_core_skill_1, core.v_core_skill_2, core.v_core_skill_3].filter(Boolean),
    })),
    hexaMatrix: (data.hexaMatrix?.character_hexa_core_equipment || []).map(core => ({
      name: core.hexa_core_name,
      type: core.hexa_core_type,
      level: core.hexa_core_level,
    })),
    hexaStats: hexaStatGroups.map(core => ({
      slot: core.slot_id,
      grade: core.stat_grade,
      main: `${core.main_stat_name} Lv.${core.main_stat_level}`,
      sub1: `${core.sub_stat_name_1} Lv.${core.sub_stat_level_1}`,
      sub2: `${core.sub_stat_name_2} Lv.${core.sub_stat_level_2}`,
    })),
    fifthAndSixthJobSkills: [data.skill5, data.skill6].filter(Boolean).flatMap(group =>
      (group?.character_skill || []).map(skill => ({ name: skill.skill_name, level: skill.skill_level }))
    ),
    familiar: {
      cards: familiarList.map(card => ({
        name: card.familiar_name,
        grade: card.familiar_grade,
        level: card.familiar_level,
        summoned: card.summoned_flag,
        skill: card.skill_name,
        options: card.option || [],
      })),
      linkSlots: (familiar?.familiar_link_slot || []).map(slot => ({
        slot: slot.slot_id,
        familiar: slot.familiar_name,
        active: slot.active_flag,
      })),
    },
    dojo: data.dojo ? {
      bestFloor: data.dojo.dojang_best_floor,
      bestTimeSeconds: data.dojo.dojang_best_time,
      recordDate: data.dojo.date_dojang_record,
    } : null,
    dataAvailability: {
      equipment: equipment.length > 0,
      symbols: Boolean(data.symbolEquipment),
      union: Boolean(data.union),
      unionRaider: Boolean(data.unionRaider),
      unionArtifact: Boolean(data.unionArtifact),
      unionChampion: Boolean(data.unionChampion),
      pets: Boolean(data.petEquipment),
      setEffects: Boolean(data.setEffect),
      vMatrix: Boolean(data.vMatrix),
      hexaMatrix: Boolean(data.hexaMatrix),
      hexaStats: Boolean(data.hexaMatrixStat),
      familiar: Boolean(data.familiar),
      dojo: Boolean(data.dojo),
      sevenDayGrowth: Boolean(previous),
    },
  };
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

const extractOpenAiResponseText = (payload: any): string => {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  if (!Array.isArray(payload?.output)) return '';

  return payload.output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .filter((content: any) => content?.type === 'output_text' && typeof content?.text === 'string')
    .map((content: any) => content.text)
    .join('');
};

const isCredentialError = (message: string) => {
  const normalized = message.toLowerCase();
  return message.includes('401') || message.includes('403') || normalized.includes('api key') || normalized.includes('authentication');
};

const isQuotaError = (message: string) => {
  const normalized = message.toLowerCase();
  return message.includes('429') || normalized.includes('quota') || normalized.includes('rate limit') || normalized.includes('exhausted');
};

const analyzeWithOpenAiModel = async (
  prompt: string,
  apiKey: string,
  selectionId: string,
  onProgress?: (msg: string) => void
): Promise<string> => {
  const [, model = 'gpt-5.6-sol', mode = 'standard'] = selectionId.split(':');
  const controller = new AbortController();
  const timeoutMs = mode === 'pro' ? 120000 : mode === 'fast' || model.includes('luna') ? 35000 : 60000;
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  onProgress?.(`正在連線 ${getAiModelOption(selectionId)?.label || model}...`);

  const requestBody: Record<string, any> = {
    model,
    input: prompt,
    max_output_tokens: 10000,
    store: false,
    reasoning: {
      effort: mode === 'fast' || model.includes('luna') ? 'low' : 'medium',
      ...(mode === 'pro' ? { mode: 'pro' } : {}),
    },
    text: { verbosity: mode === 'pro' ? 'medium' : 'low' },
    ...(mode === 'fast' ? { service_tier: 'fast' } : {}),
  };

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    onProgress?.('模型已接收資料，正在生成精簡健檢報告...');
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || `OpenAI API 回應失敗 (${response.status})`;
      throw new Error(`${response.status}: ${message}`);
    }

    const text = extractOpenAiResponseText(payload);
    if (!text) throw new Error(`Empty Response from ${model}`);

    const modeLabel = mode === 'pro' ? 'Pro' : mode === 'fast' ? '快速' : '標準';
    return `${text}\n\n_(OpenAI 模型：**${model}** / ${modeLabel}模式)_`;
  } catch (error: any) {
    if (timedOut || error?.name === 'AbortError') {
      throw new Error(`TIMEOUT: ${model} 在 ${timeoutMs / 1000} 秒內沒有回傳`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const analyzeWithOpenAi = async (
  prompt: string,
  apiKey: string,
  selectionId: string,
  onProgress?: (msg: string) => void
): Promise<string> => {
  const modelsToTry = [...new Set([
    selectionId,
    'openai:gpt-5.6-terra:standard',
    'openai:gpt-5.6-luna:standard',
  ])];
  let lastError: unknown = null;
  let quotaError: unknown = null;

  for (const currentModel of modelsToTry) {
    try {
      console.log(`Trying OpenAI Model: ${currentModel}`);
      const result = await analyzeWithOpenAiModel(prompt, apiKey, currentModel, onProgress);
      if (currentModel === selectionId) return result;
      return `${result}\n\n_(您選擇的是 **${selectionId}**，本次已自動切換備用模型)_`;
    } catch (error: any) {
      const message = extractErrorMessage(error);
      console.error(`[OpenAI Error] Model: ${currentModel} Failed`);
      console.error(`[OpenAI Error] Details: ${message}`);
      lastError = error;
      if (isQuotaError(message)) quotaError = error;

      if (isCredentialError(message)) break;
      onProgress?.(`⚠️ ${getAiModelOption(currentModel)?.label || currentModel} 無回應或暫時不可用，立即切換備用模型...`);
    }
  }

  const message = extractErrorMessage(quotaError || lastError);
  if (isCredentialError(message)) {
    return 'AI Analysis Failed: ⚠️ **OpenAI API Key 無效或沒有權限**\n\n請在設定中確認 OpenAI API Key 與專案權限。\n\n👉 [前往 OpenAI Platform 建立或管理 API Key](https://platform.openai.com/api-keys)';
  }
  if (isQuotaError(message)) {
    return '⚠️ **OpenAI 額度已達上限 (Rate Limit Exceeded)**\n\n所有 OpenAI 備用模型皆無法使用，請檢查 API 額度或更換 API Key。\n\n👉 [前往 OpenAI Platform 管理 API Key](https://platform.openai.com/api-keys)';
  }
  return `AI Analysis Failed: ⚠️ **OpenAI 模型皆無回應或分析失敗**\n\n${message || '請稍後再試。'}`;
};

export const analyzeCharacter = async (data: DashboardData, geminiApiKey: string, openAiApiKey: string, modelId: string = DEFAULT_AI_MODEL, ignoreWarnings: boolean = false, onProgress?: (msg: string) => void): Promise<string> => {
  if (isOpenAiModel(modelId) ? !openAiApiKey : !geminiApiKey) {
    return isOpenAiModel(modelId)
      ? "💡 **請先設定 OpenAI API Key**\n\n請點擊 **「設定模型 / API Key」**，輸入您的 OpenAI API Key 後再執行分析。\n\n👉 [前往 OpenAI Platform 建立 API Key](https://platform.openai.com/api-keys)"
      : "💡 **請在使用前設定您的 API Key**\n\n基於資安考量，本站不再內建公用的 API Key。\n請點擊右下方的 **「設定模型 / API Key」** 按鈕，輸入您專屬的 [Google Gemini API 金鑰](https://aistudio.google.com/app/apikey) 以啟用分析功能。";
  }

  onProgress?.('正在整理戰鬥資料與缺漏欄位...');

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

  const isChallengerServer = data.basic.world_name === '挑戰者' || data.basic.world_name.includes('挑戰者');
  const aiSnapshot = buildAiSnapshot(data);
  onProgress?.('資料整理完成，正在送交模型分析...');

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
       * **重要規則：** **創世/命運武器是固定素質，無法強化 (卷軸/星力)，主要檢查潛能、附加潛能與星火。** 請勿因其未衝卷或星力低而給予負評。
       * **新版靈魂寶珠規則：** 官方已調整靈魂寶珠系統。資料中若有靈魂可作補充描述，但**未裝備靈魂寶珠不算缺陷、不得扣分，也不得列為必要改善項目**。

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
       - **LV280 燦爛的凶星:** 普通 400 / 困難 550
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
        - **燦爛的凶星:** 普通 5億 / 困難 15億
        - **林波:** 普通 7億 / 困難 12~14億
        - **巴德利斯:** 普通 10億 / 困難 20~30億
        - **尤比太 (LV295):** 單吃最低 30億
          (請根據玩家的面板戰鬥力與上述門檻進行評估，並在「BOSS 攻略建議」中標註最高可單吃難度。)

    **【⚠️ 絕對邏輯運算守則 (Strict Logic Gate)】**
    在進行「BOSS 攻略建議」分析時，請務必執行以下邏輯檢查，嚴禁違反：
    1. **戰力硬門檻：** 請拿玩家的「面板戰鬥力」與上述「BOSS 單人通關最低戰力需求表」進行數值比對。
    2. **禁止越級：** 若玩家戰鬥力 **低於** 表格中的門檻，且**非**上述「強勢職業」 (Kanna/Hayato/Mo Xuan)，**絕對禁止** 評價為「穩通」、「碾壓」或「單吃」。必須誠實標註為「戰力不足，建議組隊」或「極限挑戰」。
    3. **權重優先級：** 「戰力門檻」的權重 > 「等級壓制」或「TMS裝備加成」。即便等級高、裝備好，只要面板戰力沒到 (且非強勢職業)，就不算穩通。

    --- 健檢資料 ---
    下列 JSON 已排除圖片、外觀、到期日與未使用預設，並整理所有可用戰鬥資料。
    dataAvailability=false 代表 API 未提供資料，不等於玩家數值為 0；不得據此扣分。
    分析時優先使用 finalStats 的面板戰鬥力，再交叉檢查完整裝備、潛能／附加潛能、星火、卷軸、卓越強化、超級屬性、傳授技能、聯盟配置／神器／冠軍、寵物、符文成長、套裝、V／HEXA 核心、HEXA 屬性、怪怪卡、武陵與七日成長。靈魂資料僅供補充，不得作為必要條件。
    ${JSON.stringify(aiSnapshot)}
    
    ---

    --- 輸出格式（務必依序、精簡、不得重複） ---
    0. **角色機體簡評：** 3~5 點，涵蓋職業／等級、面板戰力、聯盟／神器、裝備與系統短板。
    1. 輸出「### 戰力評級：分數（級別）」，下一行以「>」寫一句核心理由，再列精簡依據。
    2. **BOSS 攻略建議：** Markdown 表格使用「| BOSS名稱 | 最高可單吃難度 | 建議 | 關鍵短評 |」。固定依序列出全部 18 隻：史烏、戴米安、露希妲、威爾、戴斯克、頓凱爾、真‧希拉、瑪麗西亞、守護天使綠水靈、黑魔法師、賽蓮、卡洛斯、最初的敵對者、燦爛的凶星、咖凌、林波、巴德利斯、尤比太。依硬門檻選最高難度；若未達最低門檻，仍列最低難度並標示「戰力不足」。短評限一句。
    3. **提升建議：** 僅列 2 項具體、可執行且投資報酬率最高的項目；從所有可用戰鬥資料交叉找真正短板，不要只看裝備。
    4. 輸出「### 💡 專家點評：」，這是整份報告最有個性、不可壓縮的重點段落。下一行以「>」寫 **180~320 字**，像熟識多年的台灣楓之谷老玩家在 Discord 語音裡認真分析後順手虧朋友：先引用 2~3 個真實機體亮點或短板，再自然延伸 1~2 個貼切的老玩家梗；可以幽默、辛辣、羨慕、敬佩或有情懷，但必須有鋪陳與收尾。每次依角色資料重新創作，禁止套版、硬塞流行語、關鍵字堆砌或只寫一句敷衍短評。
    5. 最後單獨輸出「--- Analysis Complete ---」。

    禁止開場白、中途省略、重複章節或改變 0→1→2→3→4 順序。
  `;

  if (isOpenAiModel(modelId)) {
    return analyzeWithOpenAi(prompt, openAiApiKey, modelId, onProgress);
  }

  // === 修正開始: 重新定義模型列表與錯誤優先級 ===
  
  // 1. 強制過濾：若傳入 gemini-2.0-flash (可能來自舊緩存)，直接升級為 2.5，避免觸發 2.0 額度錯誤
  const effectiveModel = modelId === 'gemini-2.0-flash' ? 'gemini-2.5-flash' : modelId;

  // 依目前穩定性與速度排序；保留 2.5 Flash 作為跨世代最後備援。
  let modelsToTry = [effectiveModel, 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'];
  
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
  const withTimeout = <T,>(promise: Promise<T>, ms: number, modelName: string): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`TIMEOUT: Model ${modelName} did not respond within ${ms / 1000} seconds`)),
        ms,
      );
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  };

  for (const currentModel of modelsToTry) {
    try {
      console.log(`Trying Gemini Model: ${currentModel}`);
      onProgress?.(`正在嘗試連線 ${currentModel.replace('gemini-', '')} 模型...`);
      
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ 
        model: currentModel,
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
      });

      const isProModel = currentModel.includes('pro');
      const FIRST_RESPONSE_TIMEOUT_MS = isProModel ? 75000 : 35000;
      const STREAM_IDLE_TIMEOUT_MS = isProModel ? 60000 : 35000;
      
      const generationConfig: { maxOutputTokens: number; temperature?: number } = {
          maxOutputTokens: 10000,
      };

      // Gemini 3.7 已移除舊式取樣參數，舊模型則維持原本設定。
      if (currentModel !== 'gemini-3.7-flash') {
        generationConfig.temperature = 0.7;
      }

      // @ts-ignore
      const firstContentDeadline = Date.now() + FIRST_RESPONSE_TIMEOUT_MS;
      const result = await withTimeout(
        model.generateContentStream({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig
        }), 
        FIRST_RESPONSE_TIMEOUT_MS,
        currentModel
      );

      let fullText = '';
      let hasReportedFirstContent = false;
      const iterator = result.stream[Symbol.asyncIterator]();

      try {
        while (true) {
          const remainingFirstContentTime = Math.max(1, firstContentDeadline - Date.now());
          const waitMs = fullText ? STREAM_IDLE_TIMEOUT_MS : remainingFirstContentTime;
          const step = await withTimeout(iterator.next(), waitMs, currentModel);
          if (step.done) break;

          let chunkText = '';
          try {
            chunkText = step.value.text();
          } catch {
            // 某些 Block 情況下 text() 會噴錯，繼續等待有效文字。
          }

          if (chunkText) {
            fullText += chunkText;
            if (!hasReportedFirstContent) {
              hasReportedFirstContent = true;
              onProgress?.('模型已開始回傳內容，正在完成健檢報告...');
            }
          }
        }
      } catch (error) {
        if (iterator.return) {
          await iterator.return().catch(() => undefined);
        }
        throw error;
      }

      if (!fullText) throw new Error(`Empty Response from ${currentModel}`);
      
      const modelNote = currentModel === effectiveModel
        ? `_(Gemini 模型：已依照您的選擇使用 **${currentModel}**)_`
        : `_(Gemini 模型：您選擇的是 **${effectiveModel}**，本次因 fallback 實際使用 **${currentModel}**)_`;

      return fullText + `\n\n${modelNote}`;

    } catch (error: any) {
      const cleanMsg = extractErrorMessage(error);
      
      // 使用 console.error 確保在控制台顯示紅色錯誤 (使用者可能過濾了 warn)
      console.error(`[Gemini Error] Model: ${currentModel} Failed`);
      console.error(`[Gemini Error] Details: ${cleanMsg}`);
      console.error('--- RAW ERROR OBJECT ---');
      console.dir(error); 
      console.error('------------------------');
      
      // === 關鍵邏輯：優先捕捉 429 錯誤 ===
      if (isQuotaError(cleanMsg)) {
          quotaError = error; // 抓到了！這是最有價值的錯誤
      } else if (cleanMsg.includes('503') || cleanMsg.includes('overloaded') || cleanMsg.includes('UNAVAILABLE') || cleanMsg.includes('TIMEOUT')) {
          serverOverloadedError = error; // 抓到了！伺服器忙碌或超時
      }
      
      lastError = error;
      
      if (isCredentialError(cleanMsg)) break;
      onProgress?.(`⚠️ ${currentModel.replace('gemini-', '')} 無回應或暫時不可用，立即切換備用模型...`);
    }
  }

  // 錯誤處理：優先檢查是否有遇過 Quota Error，其次是 Overloaded Error
  const finalError = quotaError || serverOverloadedError || lastError; 
  
  if (finalError) {
      const errorMsg = extractErrorMessage(finalError);
      console.error("All Gemini Models Failed. Final Error:", errorMsg);

      if (isCredentialError(errorMsg)) {
        return "AI Analysis Failed: ⚠️ **Gemini API Key 無效或沒有權限**\n\n請在設定中確認 Gemini API Key 與專案權限。";
      }

      if (isQuotaError(errorMsg)) {
        return "⚠️ **AI 額度已達上限 (Rate Limit Exceeded)**\n\n所有 Gemini 備用模型皆無法使用，請檢查目前 API Key 的額度，稍後再試或更換另一組 Key。";
      }

      if (errorMsg.includes('503') || errorMsg.includes('overloaded') || errorMsg.includes('UNAVAILABLE')) {
        return "AI Analysis Failed: ⚠️ **AI 伺服器忙碌中 (Server Overloaded)**\n\n系統已依序嘗試所有 Gemini 備用模型，但目前皆無法回應，請稍後再試。";
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
