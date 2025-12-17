import { 
  CharacterBasic, CharacterEquipment, CharacterStat, CharacterAbility, 
  CharacterHyperStat, CharacterLinkSkill, DashboardData, OcidResponse 
} from '../types';

const BASE_URL = 'https://open.api.nexon.com/maplestorytw/v1';

// Helper to get date in Taiwan timezone (UTC+8)
const getTaiwanDate = (offsetDays = 0) => {
  const now = new Date();
  const twTimestamp = now.getTime() + (3600000 * 8); 
  const twDate = new Date(twTimestamp);
  twDate.setUTCDate(twDate.getUTCDate() - offsetDays);
  
  const year = twDate.getUTCFullYear();
  const month = String(twDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(twDate.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

const getDateBefore = (days: number) => getTaiwanDate(days);

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simple in-memory cache for OCID to save API calls
const ocidCache: Record<string, string> = {};

/**
 * Helper to build the URL.
 * Only appends the 'date' parameter if it is explicitly provided.
 * This allows fetching "current" data by omitting the date.
 */
const buildUrl = (endpoint: string, ocid: string, date?: string) => {
  let url = `${BASE_URL}${endpoint}?ocid=${ocid}`;
  if (date) {
    url += `&date=${date}`;
  }
  return url;
};

const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> => {
  let lastStatus: number | null = null;
  const headers = new Headers(options.headers || {});
  headers.set('Cache-Control', 'no-cache');
  headers.set('Pragma', 'no-cache');
  
  const newOptions = { ...options, headers, cache: 'no-store' as RequestCache };

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, newOptions);
      lastStatus = res.status;
      
      if (res.ok) return res;
      
      // If 429 (Too Many Requests), wait and retry
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoff * Math.pow(2, i);
        console.warn(`Rate limited on ${url}. Retrying in ${waitTime}ms...`);
        await wait(waitTime);
        continue;
      }

      // If 400 Bad Request (Invalid Parameter), usually means date is invalid or data not ready
      if (res.status === 400) {
         try {
            const clone = res.clone();
            const errBody = await clone.text();
            console.error(`Bad Request (400) on ${url}:`, errBody);
         } catch (e) {
            console.warn(`Failed to read error body for ${url}`, e);
         }
         return res; 
      }

      // If 5xx (Server Error), wait and retry
      if (res.status >= 500) {
        console.warn(`Server error ${res.status} on ${url}. Retrying...`);
        await wait(backoff * (i + 1));
        continue;
      }

      // Ignore 403 for Dojo/Union (Privacy settings or no data)
      if (res.status === 403) {
        return res; 
      }

      return res;
    } catch (err) {
      console.warn(`Network error on ${url}: ${err}. Retrying...`);
      if (i === retries - 1) throw err;
      await wait(backoff * (i + 1));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries. Last Status: ${lastStatus}`);
};

export const fetchCharacterData = async (characterName: string, apiKey: string, specificDate?: string): Promise<DashboardData> => {
  const headers = {
    'x-nxopen-api-key': apiKey,
    'accept': 'application/json'
  };

  // 1. Get OCID (Check cache first)
  let ocid = ocidCache[characterName];
  
  if (!ocid) {
    // Note: OCID endpoint does not take a date parameter
    const ocidUrl = `${BASE_URL}/id?character_name=${encodeURIComponent(characterName)}`;
    const ocidRes = await fetchWithRetry(ocidUrl, { headers });
    
    if (!ocidRes.ok) {
       try {
          const errorData = await ocidRes.json();
          console.warn('OCID Fetch Error:', errorData);
       } catch (e) {
          // Ignore
       }
       throw new Error('該角色在資料庫中找不到');
    }
    
    const ocidData: OcidResponse = await ocidRes.json();
    ocid = ocidData.ocid;
    ocidCache[characterName] = ocid;
  }

  // 2. Prepare Date Parameters
  // If specificDate is undefined, we simply don't pass it to buildUrl, 
  // which tells the API to fetch the "latest" available data (approx 15 min delay).
  const dateParam = specificDate; 
  
  // For historical comparison (7 days ago), we explicitly calculate the date.
  // Note: If you want "7 days before the specificDate", logic needs adjustment, 
  // but usually "7 days ago from today" is fine for trends.
  const date7DaysAgo = getDateBefore(8); 

  // 3. Fetch all details in batches
  // We use buildUrl to cleanly handle the optional date
  const urls = [
    buildUrl('/character/basic', ocid, dateParam),
    buildUrl('/character/stat', ocid, dateParam),
    buildUrl('/character/item-equipment', ocid, dateParam),
    buildUrl('/character/ability', ocid, dateParam),
    buildUrl('/character/hyper-stat', ocid, dateParam),
    buildUrl('/character/link-skill', ocid, dateParam),
    buildUrl('/user/union', ocid, dateParam),
    buildUrl('/user/union-artifact', ocid, dateParam),
    buildUrl('/character/pet-equipment', ocid, dateParam),
    buildUrl('/character/symbol-equipment', ocid, dateParam),
    buildUrl('/character/set-effect', ocid, dateParam),
    buildUrl('/character/vmatrix', ocid, dateParam),
    buildUrl('/character/hexamatrix', ocid, dateParam),
    buildUrl('/character/dojang', ocid, dateParam),
    // Skills need extra params, so we build manually but conditionally add date
    `${BASE_URL}/character/skill?ocid=${ocid}&character_skill_grade=5${dateParam ? `&date=${dateParam}` : ''}`,
    `${BASE_URL}/character/skill?ocid=${ocid}&character_skill_grade=6${dateParam ? `&date=${dateParam}` : ''}`,
    `${BASE_URL}/character/skill?ocid=${ocid}&character_skill_grade=0${dateParam ? `&date=${dateParam}` : ''}`,
    `${BASE_URL}/character/skill?ocid=${ocid}&character_skill_grade=1${dateParam ? `&date=${dateParam}` : ''}`,
    `${BASE_URL}/character/skill?ocid=${ocid}&character_skill_grade=2${dateParam ? `&date=${dateParam}` : ''}`,
    `${BASE_URL}/character/skill?ocid=${ocid}&character_skill_grade=3${dateParam ? `&date=${dateParam}` : ''}`,
    `${BASE_URL}/character/skill?ocid=${ocid}&character_skill_grade=4${dateParam ? `&date=${dateParam}` : ''}`,
    // Historical comparison always needs a date
    `${BASE_URL}/character/basic?ocid=${ocid}&date=${date7DaysAgo}`,
    
    buildUrl('/character/popularity', ocid, dateParam),
    buildUrl('/character/hexamatrix-stat', ocid, dateParam),
    buildUrl('/character/cashitem-equipment', ocid, dateParam),
    buildUrl('/character/beauty-equipment', ocid, dateParam),
  ];

  const responses: Response[] = [];
  const BATCH_SIZE = 5; // Slightly increased batch size

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const batchRes = await Promise.all(batch.map(async (url, idx) => {
        await wait(idx * 50); // Minimal stagger
        try {
          return await fetchWithRetry(url, { headers });
        } catch (err) {
          console.warn(`[Partial Failure] Failed to fetch ${url}. Ignoring.`, err);
          return new Response(JSON.stringify({}), { status: 404, statusText: "Partial Failure" });
        }
    }));
    responses.push(...batchRes);
    if (i + BATCH_SIZE < urls.length) await wait(500); 
  }

  // Destructure responses (Make sure the order matches the urls array exactly!)
  const [
    basicRes, statRes, equipRes, abilityRes, hyperRes, linkRes,
    unionRes, artifactRes, petRes, symbolRes, setRes, vmatrixRes, hexaRes, dojoRes,
    skill5Res, skill6Res,
    skill0Res, skill1Res, skill2Res, skill3Res, skill4Res,
    basic7DaysRes, popularityRes, hexaStatRes, cashItemRes, beautyRes
  ] = responses;

  // Basic validation - if these fail, the whole dashboard is useless
  if (!basicRes.ok) {
     throw new Error('Failed to fetch basic character details. API might be unstable or maintenance.');
  }

  const basic: CharacterBasic = await basicRes.json();
  const stat: CharacterStat = statRes.ok ? await statRes.json() : { final_stat: [] }; // Safe fallback
  const equipment: CharacterEquipment = equipRes.ok ? await equipRes.json() : { item_equipment: [] };

  // Helper for safe JSON parsing
  const safeJson = async (res: Response, fallback: any = undefined) => {
      return res.ok ? await res.json() : fallback;
  };

  // Parse all data
  const ability = await safeJson(abilityRes, { ability_grade: "Hidden", ability_info: [] });
  const hyperStat = await safeJson(hyperRes, { character_class: basic.character_class, hyper_stat_preset_1: [] });
  const linkSkill = await safeJson(linkRes, { character_link_skill: [] });
  const union = await safeJson(unionRes);
  const unionArtifact = await safeJson(artifactRes);
  const petEquipment = await safeJson(petRes);
  const symbolEquipment = await safeJson(symbolRes);
  const setEffect = await safeJson(setRes);
  const vMatrix = await safeJson(vmatrixRes);
  const hexaMatrix = await safeJson(hexaRes);
  const dojo = await safeJson(dojoRes);
  
  const skill5 = await safeJson(skill5Res);
  const skill6 = await safeJson(skill6Res);
  const skill0 = await safeJson(skill0Res);
  const skill1 = await safeJson(skill1Res);
  const skill2 = await safeJson(skill2Res);
  const skill3 = await safeJson(skill3Res);
  const skill4 = await safeJson(skill4Res);
  
  const basic7Days = await safeJson(basic7DaysRes);
  const hexaMatrixStat = await safeJson(hexaStatRes);
  const cashItemEquipment = await safeJson(cashItemRes);
  const beautyEquipment = await safeJson(beautyRes);

  // Popularity handling
  if (popularityRes && popularityRes.ok) {
      const popData = await popularityRes.json();
      stat.pop = typeof popData.popularity === 'string' ? parseInt(popData.popularity, 10) : popData.popularity;
  } else {
      // Fallback: Try to find in stat.final_stat
      const popStat = stat.final_stat?.find((s: any) => s.stat_name === 'Popularity' || s.stat_name === '名聲');
      if (popStat) {
          stat.pop = parseInt(popStat.stat_value);
      }
  }

  // === NEW DATE LOGIC ===
  // 使用 API 回傳的 basic.date 作為資料真實日期，而非當下時間
  // basic.date 格式通常為 "2025-12-17T00:00:00+09:00" 或 undefined
  // 如果是查當天，dateParam 為 undefined，我們就顯示今天或 API 回傳的日期
  // 如果是查歷史，dateParam 為 "YYYY-MM-DD"，我們就顯示該日期
  let lastUpdated = specificDate; 
  
  if (!lastUpdated) {
      // 如果沒有指定日期 (即時查詢)，嘗試使用 API 回傳的日期
      if (basic.date) {
          lastUpdated = basic.date.split('T')[0];
      } else {
          // 如果連 API 都沒給日期，只好用今天
          lastUpdated = new Date().toISOString().split('T')[0];
      }
  }

  return {
    basic,
    stat,
    equipment,
    ability,
    hyperStat,
    linkSkill,
    union,
    unionArtifact,
    petEquipment,
    symbolEquipment,
    setEffect,
    vMatrix,
    hexaMatrix,
    hexaMatrixStat,
    dojo,
    skill5,
    skill6,
    skill0,
    skill1,
    skill2,
    skill3,
    skill4,
    character_basic_7days_ago: basic7Days,
    cashItemEquipment,
    beautyEquipment,
    lastUpdated // 現在這是一個 YYYY-MM-DD 字串
  };
};

/**
 * 掃描過去 7 天的資料，找出戰鬥力 (Combat Power) 最高的那一天
 * 用於解決玩家下線時穿著掉寶裝，導致查詢數據不準確的問題
 */
export const findBestDateInPastWeek = async (characterName: string, apiKey: string): Promise<{ date: string, combatPower: number } | null> => {
  const headers = { 
    'x-nxopen-api-key': apiKey, 
    'accept': 'application/json' 
  };

  // 1. 取得 OCID (利用現有的 Cache 機制或重新 Fetch)
  let ocid = ocidCache[characterName];
  if (!ocid) {
    const ocidUrl = `${BASE_URL}/id?character_name=${encodeURIComponent(characterName)}`;
    try {
      const res = await fetch(ocidUrl, { headers });
      if (!res.ok) throw new Error('無法取得 OCID');
      const data = await res.json();
      ocid = data.ocid;
      ocidCache[characterName] = ocid;
    } catch (e) {
      console.error('OCID fetch failed inside findBestDate', e);
      throw new Error('無法找到該角色，請確認 ID 是否正確');
    }
  }

  // 2. 產生過去 7 天的日期 (從昨天開始往前推 7 天，避開今天因為可能還沒結算)
  // 範圍：昨天 (offset 1) ~ 7天前 (offset 7)
  const dates = Array.from({ length: 7 }, (_, i) => getTaiwanDate(i + 1));
  console.log('[BestRecord] Scanning dates:', dates);

  // 3. 平行發送請求 (只查 Stat 輕量級 API)
  // 使用 no-store 確保我們拿到的是伺服器最新狀態，不使用 retry 以加快速度
  const requests = dates.map(async (date) => {
    try {
      const url = `${BASE_URL}/character/stat?ocid=${ocid}&date=${date}`;
      const res = await fetch(url, { headers, cache: 'no-store' });
      
      if (!res.ok) return null; // 該日期可能沒資料或維修，直接跳過
      
      const data = await res.json();
      
      // 尋找戰鬥力欄位 (支援中英文 key)
      const cpStat = data.final_stat.find((s: any) => s.stat_name === '戰鬥力' || s.stat_name === 'Combat Power');
      
      if (!cpStat) return null;

      // 移除逗號並轉為數字
      const combatPower = parseInt(cpStat.stat_value.replace(/,/g, ''), 10);
      return { date, combatPower };
    } catch (err) {
      // 網路錯誤直接忽略該天
      return null;
    }
  });

  // 等待所有請求完成
  const results = await Promise.all(requests);
  
  // 4. 過濾無效資料並排序 (戰鬥力由大到小)
  const validRecords = results.filter(r => r !== null) as { date: string, combatPower: number }[];
  
  if (validRecords.length === 0) {
    return null;
  }

  // 降序排列：最大的在 index 0
  validRecords.sort((a, b) => b.combatPower - a.combatPower);
  
  const bestRecord = validRecords[0];
  console.log(`[BestRecord] Found best record on ${bestRecord.date}: ${bestRecord.combatPower}`);
  
  return bestRecord;
};