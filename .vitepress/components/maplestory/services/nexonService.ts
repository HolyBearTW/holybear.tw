import { 
  CharacterBasic, CharacterEquipment, CharacterStat, DashboardData, OcidResponse
} from '../types';

const BASE_URL = 'https://open.api.nexon.com/maplestorytw/v1';

// Helper to get date in Taiwan timezone (UTC+8)
const getTaiwanDate = (offsetDays = 0) => {
  const now = new Date();
  const twTimestamp = now.getTime() + (3600000 * 8); 
  const twDate = new Date(twTimestamp);
  
  twDate.setUTCDate(twDate.getUTCDate() - offsetDays);
  
  // === 必須要有這段檢查，否則晚上12點後會報錯 ===
  const checkDate = new Date(now.getTime() + (3600000 * 8));
  if (twDate > checkDate) {
      twDate.setUTCDate(twDate.getUTCDate() - 1);
  }
  // ===========================================

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
  const date7DaysAgo = getDateBefore(8); 

  // 3. Fetch all details in batches
  const urls = [
    buildUrl('/character/basic', ocid, dateParam),
    buildUrl('/character/stat', ocid, dateParam),
    buildUrl('/character/item-equipment', ocid, dateParam),
    buildUrl('/character/ability', ocid, dateParam),
    buildUrl('/character/hyper-stat', ocid, dateParam),
    buildUrl('/character/link-skill', ocid, dateParam),
    buildUrl('/user/union', ocid, dateParam),
    buildUrl('/user/union-raider', ocid, dateParam),
    buildUrl('/user/union-artifact', ocid, dateParam),
    buildUrl('/user/union-champion', ocid, dateParam),
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
    buildUrl('/character/android-equipment', ocid, dateParam),
  ];

  const responses: Response[] = [];
  const BATCH_SIZE = 5; 

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const batchRes = await Promise.all(batch.map(async (url, idx) => {
        await wait(idx * 50); 
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

  const [
    basicRes, statRes, equipRes, abilityRes, hyperRes, linkRes,
    unionRes, unionRaiderRes, artifactRes, unionChampionRes, petRes, symbolRes, setRes, vmatrixRes, hexaRes, dojoRes,
    skill5Res, skill6Res,
    skill0Res, skill1Res, skill2Res, skill3Res, skill4Res,
    basic7DaysRes, popularityRes, hexaStatRes, cashItemRes, beautyRes, androidRes
  ] = responses;

  if (!basicRes.ok) {
      throw new Error('Failed to fetch basic character details. API might be unstable or maintenance.');
  }

  const basic: CharacterBasic = await basicRes.json();
  const stat: CharacterStat = statRes.ok ? await statRes.json() : { final_stat: [] }; 
  const equipment: CharacterEquipment = equipRes.ok ? await equipRes.json() : { item_equipment: [] };

  const safeJson = async (res: Response, fallback: any = undefined) => {
      return res.ok ? await res.json() : fallback;
  };

  const ability = await safeJson(abilityRes, { ability_grade: "Hidden", ability_info: [] });
  const hyperStat = await safeJson(hyperRes, { character_class: basic.character_class, hyper_stat_preset_1: [] });
  const linkSkill = await safeJson(linkRes, { character_link_skill: [] });
  const union = await safeJson(unionRes);
  const unionRaider = await safeJson(unionRaiderRes);
  const unionArtifact = await safeJson(artifactRes);
  const unionChampion = await safeJson(unionChampionRes);
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
  const androidEquipment = await safeJson(androidRes);

  if (popularityRes && popularityRes.ok) {
      const popData = await popularityRes.json();
      stat.pop = typeof popData.popularity === 'string' ? parseInt(popData.popularity, 10) : popData.popularity;
  } else {
      const popStat = stat.final_stat?.find((s: any) => s.stat_name === 'Popularity' || s.stat_name === '名聲');
      if (popStat) {
          stat.pop = parseInt(popStat.stat_value);
      }
  }

  let lastUpdated = specificDate; 
  if (!lastUpdated) {
      if (basic.date) {
          lastUpdated = basic.date.split('T')[0];
      } else {
          lastUpdated = new Date().toISOString().split('T')[0];
      }
  }

  return {
    basic, stat, equipment, ability, hyperStat, linkSkill, union, unionRaider, unionArtifact, unionChampion,
    petEquipment, symbolEquipment, setEffect, vMatrix, hexaMatrix, hexaMatrixStat,
    dojo, skill5, skill6, skill0, skill1, skill2, skill3, skill4,
    character_basic_7days_ago: basic7Days,
    cashItemEquipment, beautyEquipment, androidEquipment, lastUpdated
  };
};

export const findBestDateInPastWeek = async (characterName: string, apiKey: string): Promise<{ date: string, combatPower: number } | null> => {
  const headers = { 'x-nxopen-api-key': apiKey, 'accept': 'application/json' };

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

  const dates = Array.from({ length: 7 }, (_, i) => getTaiwanDate(i + 1));
  console.log('[BestRecord] Scanning dates:', dates);

  const requests = dates.map(async (date) => {
    try {
      const url = `${BASE_URL}/character/stat?ocid=${ocid}&date=${date}`;
      const res = await fetch(url, { headers, cache: 'no-store' });
      if (!res.ok) return null; 
      const data = await res.json();
      const cpStat = data.final_stat.find((s: any) => s.stat_name === '戰鬥力' || s.stat_name === 'Combat Power');
      if (!cpStat) return null;
      const combatPower = parseInt(cpStat.stat_value.replace(/,/g, ''), 10);
      return { date, combatPower };
    } catch (err) {
      return null;
    }
  });

  const results = await Promise.all(requests);
  const validRecords = results.filter(r => r !== null) as { date: string, combatPower: number }[];
  
  if (validRecords.length === 0) return null;

  validRecords.sort((a, b) => b.combatPower - a.combatPower);
  return validRecords[0];
};

/**
 * 取得過去 7 天的等級與經驗值變化
 * 修正版：包含「今天」的最新資料
 */
export const fetchWeeklyHistory = async (characterName: string, apiKey: string) => {
  const headers = { 'x-nxopen-api-key': apiKey, 'accept': 'application/json' };

  let ocid = ocidCache[characterName];
  if (!ocid) {
    const ocidUrl = `${BASE_URL}/id?character_name=${encodeURIComponent(characterName)}`;
    try {
      const res = await fetch(ocidUrl, { headers });
      if (!res.ok) throw new Error('無法取得 OCID');
      const data = await res.json();
      ocid = data.ocid;
      ocidCache[characterName] = ocid;
    } catch (e) { return []; }
  }

  // 1. 初始請求
  const rawData = new Array(8).fill(null);
  const requests = [];
  for (let i = 0; i < 8; i++) { 
    requests.push((async () => {
      try {
        const queryDate = getTaiwanDate(i);
        const url = (i === 0) 
          ? `${BASE_URL}/character/basic?ocid=${ocid}`
          : `${BASE_URL}/character/basic?ocid=${ocid}&date=${queryDate}`;

        const res = await fetch(url, { headers, cache: 'no-store' });
        const dateObj = new Date(queryDate);
        const displayDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

        if (!res.ok) {
            return { 
                success: false, 
                diffDays: i, 
                date: displayDate,
                fullDate: queryDate 
            };
        } 

        const data = await res.json();
        return {
          success: true,
          date: displayDate,
          fullDate: queryDate,
          level: data.character_level,
          expRate: parseFloat(data.character_exp_rate),
          diffDays: i 
        };
      } catch (e) {
        return { success: false, diffDays: i };
      }
    })());
  }

  const results = await Promise.all(requests);

  results.forEach(r => {
      if (r && typeof r.diffDays === 'number') {
          rawData[r.diffDays] = r;
      }
  });

  // 2. 執行「線性插值」修補，並強制修正小數位數
  for (let i = 7; i >= 0; i--) {
      const current = rawData[i];

      if (!current || !current.success) {
          let prevValid = null;
          for (let p = i + 1; p < 8; p++) {
              if (rawData[p] && rawData[p].success) {
                  prevValid = rawData[p];
                  break;
              }
          }

          let nextValid = null;
          for (let n = i - 1; n >= 0; n--) {
              if (rawData[n] && rawData[n].success) {
                  nextValid = rawData[n];
                  break;
              }
          }

          if (prevValid && nextValid) {
              // === 關鍵修正：強制 3 位小數 ===
              const avg = (prevValid.expRate + nextValid.expRate) / 2;
              const interpolatedExp = parseFloat(avg.toFixed(3));
              
              rawData[i] = {
                  ...current,
                  success: true,
                  isInterpolated: true,
                  level: nextValid.level,
                  expRate: interpolatedExp
              };
          }
          else if (prevValid) {
              rawData[i] = {
                  ...current,
                  success: true,
                  isEstimated: true,
                  level: prevValid.level,
                  expRate: prevValid.expRate
              };
          }
          else if (nextValid) {
              rawData[i] = {
                  ...current,
                  success: true,
                  isEstimated: true,
                  level: nextValid.level,
                  expRate: nextValid.expRate
              };
          }
      }
  }

  return rawData
    .filter(r => r && r.success)
    .sort((a, b) => b.diffDays - a.diffDays);
};