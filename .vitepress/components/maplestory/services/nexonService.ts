import { 
  CharacterBasic, CharacterEquipment, CharacterStat, CharacterAbility, 
  CharacterHyperStat, CharacterLinkSkill, DashboardData, OcidResponse 
} from '../types';

const BASE_URL = 'https://open.api.nexon.com/maplestorytw/v1';

// Helper to get date in Taiwan timezone (UTC+8)
const getTaiwanDate = (offsetDays = 0) => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const twTimestamp = utc + (3600000 * 8); // UTC + 8 hours
  const twDate = new Date(twTimestamp);
  twDate.setUTCDate(twDate.getUTCDate() - offsetDays);
  
  const year = twDate.getUTCFullYear();
  const month = String(twDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(twDate.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

const getYesterday = () => getTaiwanDate(1);
const getDateBefore = (days: number) => getTaiwanDate(days);

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simple in-memory cache for OCID to save API calls
const ocidCache: Record<string, string> = {};

// Helper to determine the latest available data date
const determineLatestDate = async (ocid: string, apiKey: string): Promise<string> => {
    const headers = { 
        'x-nxopen-api-key': apiKey, 
        'accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    };
    // Try Today (0), Yesterday (1), Day Before (2)
    for (const offset of [0, 1, 2]) {
        const dateStr = getTaiwanDate(offset);
        const url = `${BASE_URL}/character/basic?ocid=${ocid}&date=${dateStr}`;
        try {
            const res = await fetch(url, { headers, cache: 'no-store' });
            if (res.ok) {
                console.log(`[Date Probe] Found data for date: ${dateStr}`);
                return dateStr;
            }
        } catch (e) {
            console.warn(`[Date Probe] Failed to probe date ${dateStr}`, e);
        }
    }
    return getTaiwanDate(1); // Fallback to yesterday
};

const fetchWithRetry = async (url: string, options: RequestInit, retries = 5, backoff = 2000): Promise<Response> => {
  let lastStatus: number | null = null;
  // Ensure headers exist
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
        // Use exponential backoff: 2s, 4s, 8s, 16s, 32s
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoff * Math.pow(2, i);
        console.warn(`Rate limited on ${url}. Retrying in ${waitTime}ms...`);
        await wait(waitTime);
        continue;
      }

      // If 400 Bad Request (Invalid Parameter), log it and stop retrying
      if (res.status === 400) {
         const errBody = await res.text();
         console.error(`Bad Request (400) on ${url}:`, errBody);
         return res; // Return the error response, caller will handle it
      }

      // If 5xx (Server Error), wait and retry
      if (res.status >= 500) {
        console.warn(`Server error ${res.status} on ${url}. Retrying...`);
        await wait(backoff * (i + 1));
        continue;
      }

      // Ignore 403 for Dojo (Privacy settings) to avoid console noise
      if (res.status === 403 && (url.includes('/dojo') || url.includes('/dojang'))) {
        return res; // Return the 403 response, caller will handle it as undefined
      }

      // For other errors (400, 401, 403, 404), return immediately as they are likely permanent
      return res;
    } catch (err) {
      // Network errors, retry
      console.warn(`Network error on ${url}: ${err}. Retrying...`);
      if (i === retries - 1) throw err;
      await wait(backoff * (i + 1));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries. Last Status: ${lastStatus}`);
};

export const fetchCharacterData = async (characterName: string, apiKey: string): Promise<DashboardData> => {
  const headers = {
    'x-nxopen-api-key': apiKey,
    'accept': 'application/json'
  };

  // const dateParam = getYesterday(); // Removed, calculated dynamically later
  const date7DaysAgo = getDateBefore(8); // 7 days before yesterday

  // 1. Get OCID (Check cache first)
  let ocid = ocidCache[characterName];
  
  if (!ocid) {
    const ocidUrl = `${BASE_URL}/id?character_name=${encodeURIComponent(characterName)}`;
    const ocidRes = await fetchWithRetry(ocidUrl, { headers });
    
    if (!ocidRes.ok) {
       const errorData = await ocidRes.json();
       throw new Error(errorData?.error?.message || 'Failed to fetch OCID. Name might be incorrect or API key invalid.');
    }
    
    const ocidData: OcidResponse = await ocidRes.json();
    ocid = ocidData.ocid;
    ocidCache[characterName] = ocid; // Cache it
  }

  // 2. Determine the best date to fetch
  const dateParam = await determineLatestDate(ocid, apiKey);

  // 3. Fetch all details in batches to avoid Rate Limiting (429)
  // Add timestamp to prevent caching
  const timestamp = Date.now();
  const urls = [
    `${BASE_URL}/character/basic?ocid=${ocid}&date=${dateParam}`,
    `${BASE_URL}/character/stat?ocid=${ocid}&date=${dateParam}`,
    `${BASE_URL}/character/item-equipment?ocid=${ocid}&date=${dateParam}`,
    `${BASE_URL}/character/ability?ocid=${ocid}&date=${dateParam}`,
    `${BASE_URL}/character/hyper-stat?ocid=${ocid}&date=${dateParam}`,
    `${BASE_URL}/character/link-skill?ocid=${ocid}&date=${dateParam}`,
    `${BASE_URL}/user/union?ocid=${ocid}&date=${dateParam}`,
    `${BASE_URL}/user/union-artifact?ocid=${ocid}&date=${dateParam}`,
    `${BASE_URL}/character/pet-equipment?ocid=${ocid}&date=${dateParam}`,
    `${BASE_URL}/character/symbol-equipment?ocid=${ocid}&date=${dateParam}`,
    `${BASE_URL}/character/set-effect?ocid=${ocid}&date=${dateParam}`,
    `${BASE_URL}/character/vmatrix?ocid=${ocid}&date=${dateParam}`,
    `${BASE_URL}/character/hexamatrix?ocid=${ocid}&date=${dateParam}`,
    `${BASE_URL}/character/dojang?ocid=${ocid}&date=${dateParam}`,
    `${BASE_URL}/character/skill?ocid=${ocid}&date=${dateParam}&character_skill_grade=5`,
    `${BASE_URL}/character/skill?ocid=${ocid}&date=${dateParam}&character_skill_grade=6`,
    `${BASE_URL}/character/skill?ocid=${ocid}&date=${dateParam}&character_skill_grade=0`,
    `${BASE_URL}/character/skill?ocid=${ocid}&date=${dateParam}&character_skill_grade=1`,
    `${BASE_URL}/character/skill?ocid=${ocid}&date=${dateParam}&character_skill_grade=2`,
    `${BASE_URL}/character/skill?ocid=${ocid}&date=${dateParam}&character_skill_grade=3`,
    `${BASE_URL}/character/skill?ocid=${ocid}&date=${dateParam}&character_skill_grade=4`,
    `${BASE_URL}/character/basic?ocid=${ocid}&date=${date7DaysAgo}`,
    `${BASE_URL}/character/popularity?ocid=${ocid}&date=${dateParam}`,
    `${BASE_URL}/character/hexamatrix-stat?ocid=${ocid}&date=${dateParam}`,
  ];

  const responses: Response[] = [];
  const BATCH_SIZE = 4;

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    // Add a small random delay to each request in batch to further spread them out slightly
    const batchRes = await Promise.all(batch.map(async (url, idx) => {
        await wait(idx * 100); 
        try {
          return await fetchWithRetry(url, { headers });
        } catch (err) {
          console.warn(`[Partial Failure] Failed to fetch ${url}. Ignoring to keep app alive.`, err);
          // Return a dummy 404 response so it's handled as "data missing" rather than "app crash"
          return new Response(JSON.stringify({}), { status: 404, statusText: "Partial Failure" });
        }
    }));
    responses.push(...batchRes);
    if (i + BATCH_SIZE < urls.length) await wait(1000); // 1s delay between batches
  }

  const [
    basicRes, statRes, equipRes, abilityRes, hyperRes, linkRes,
    unionRes, artifactRes, petRes, symbolRes, setRes, vmatrixRes, hexaRes, dojoRes,
    skill5Res, skill6Res,
    skill0Res, skill1Res, skill2Res, skill3Res, skill4Res,
    basic7DaysRes, popularityRes, hexaStatRes
  ] = responses;

  if (!basicRes.ok || !statRes.ok || !equipRes.ok) {
    throw new Error('Failed to fetch basic character details. Please try again or check the character name.');
  }

  const basic: CharacterBasic = await basicRes.json();
  const stat: CharacterStat = await statRes.json();
  const equipment: CharacterEquipment = await equipRes.json();
  
  // Try to find popularity in stat.final_stat or assume 0 if not present in standard fields
  // Note: TW API might differ slightly, but we'll map what we have.
  // We can try to extract 'Popularity' from final_stat if it exists there.
  /* Removed old logic, now handled by dedicated API call */

  // Safe parsing for potential missing data
  let ability: CharacterAbility = { date: dateParam, ability_grade: "Hidden", remain_fame: 0, ability_info: [] };
  if (abilityRes.ok) ability = await abilityRes.json();

  let hyperStat: CharacterHyperStat = { character_class: basic.character_class, hyper_stat_preset_1: [], hyper_stat_preset_1_remain_point: 0 };
  if (hyperRes.ok) hyperStat = await hyperRes.json();

  let linkSkill: CharacterLinkSkill = { character_link_skill: [] };
  if (linkRes.ok) linkSkill = await linkRes.json();

  // New Data Parsing
  const union = unionRes.ok ? await unionRes.json() : undefined;
  const unionArtifact = artifactRes.ok ? await artifactRes.json() : undefined;
  const petEquipment = petRes.ok ? await petRes.json() : undefined;
  const symbolEquipment = symbolRes.ok ? await symbolRes.json() : undefined;
  const setEffect = setRes.ok ? await setRes.json() : undefined;
  const vMatrix = vmatrixRes.ok ? await vmatrixRes.json() : undefined;
  const hexaMatrix = hexaRes.ok ? await hexaRes.json() : undefined;
  const dojo = dojoRes.ok ? await dojoRes.json() : undefined;
  const skill5 = skill5Res.ok ? await skill5Res.json() : undefined;
  const skill6 = skill6Res.ok ? await skill6Res.json() : undefined;
  const skill0 = skill0Res?.ok ? await skill0Res.json() : undefined;
  const skill1 = skill1Res?.ok ? await skill1Res.json() : undefined;
  const skill2 = skill2Res?.ok ? await skill2Res.json() : undefined;
  const skill3 = skill3Res?.ok ? await skill3Res.json() : undefined;
  const skill4 = skill4Res?.ok ? await skill4Res.json() : undefined;
  const basic7Days = basic7DaysRes?.ok ? await basic7DaysRes.json() : undefined;
  const hexaMatrixStat = hexaStatRes?.ok ? await hexaStatRes.json() : undefined;
  
  // Popularity
  if (popularityRes?.ok) {
      const popData = await popularityRes.json();
      stat.pop = typeof popData.popularity === 'string' ? parseInt(popData.popularity, 10) : popData.popularity;
  } else {
      // Fallback to old method if API fails
      const popStat = stat.final_stat.find(s => s.stat_name === 'Popularity' || s.stat_name === '名聲' || s.stat_name === 'pop');
      if (popStat) {
          stat.pop = parseInt(popStat.stat_value);
      }
  }

  // Create a timestamp for "Last Updated"
  // If the API returns a 'date' field, we can use that, otherwise use current time
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
    lastUpdated
  };
};
