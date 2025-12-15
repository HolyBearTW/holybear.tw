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

  const lastUpdated = new Date().toLocaleString('zh-TW', { hour12: false });

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
    lastUpdated
  };
};