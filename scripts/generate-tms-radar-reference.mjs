import fs from 'node:fs';
import path from 'node:path';
import { selectStratifiedRadarSamples } from './lib/tms-radar-sampling.mjs';

const root = path.resolve(import.meta.dirname, '..');
const envPath = path.join(root, '.env');
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const readEnvFileValue = (name) => env.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1]?.trim().replace(/^['"]|['"]$/g, '');
const apiKey = process.env.NEXON_API_KEY || process.env.VITE_NEXON_API_KEY
  || readEnvFileValue('NEXON_API_KEY') || readEnvFileValue('VITE_NEXON_API_KEY');
const radarAutomationKey = process.env.RADAR_AUTOMATION_KEY || readEnvFileValue('RADAR_AUTOMATION_KEY');
const bypassKey = process.env.HOLYBEAR_BYPASS_KEY || process.env.MAINTENANCE_BYPASS_KEY
  || readEnvFileValue('HOLYBEAR_BYPASS_KEY') || readEnvFileValue('MAINTENANCE_BYPASS_KEY');
if (!apiKey) throw new Error('NEXON_API_KEY is missing');

const boundedInteger = (value, fallback, minimum, maximum) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
};

const outputPath = path.join(root, '.vitepress/theme/maplestory/data/tmsRadarReference.json');
const cacheDir = path.join(root, '.cache/tms-radar');
const cachePath = path.join(cacheDir, 'records-v2.json');
const apiBase = 'https://open.api.nexon.com/maplestorytw/v1';
const holyBearApiBase = String(process.env.HOLYBEAR_API_BASE_URL || 'https://holybear.tw').replace(/\/+$/, '');
const nexonHeaders = { 'x-nxopen-api-key': apiKey };
const holyBearHeaders = radarAutomationKey
  ? { 'x-radar-automation-key': radarAutomationKey }
  : bypassKey ? { 'x-bypass-key': bypassKey } : undefined;
const rankingPageSize = 100;
const minimumLevel = 260;
const samplesPerJob = boundedInteger(process.env.RADAR_SAMPLES_PER_JOB, 100, 10, 500);
const concurrency = boundedInteger(process.env.RADAR_CONCURRENCY, 8, 1, 20);
const cacheTtlMs = boundedInteger(process.env.RADAR_CACHE_TTL_DAYS, 21, 1, 90) * 24 * 60 * 60 * 1000;
const runBudgetMs = boundedInteger(process.env.RADAR_RUN_BUDGET_MINUTES, 20, 5, 25) * 60 * 1000;
const runStartedAt = Date.now();

const groups = [
  [['英雄', '聖騎士', '黑騎士', '拳霸', '重砲指揮官', '聖魂劍士', '閃雷悍將', '米哈逸', '狂狼勇士', '隱月', '爆拳槍神', '惡魔殺手', '凱撒', '阿戴爾', '亞克', '蓮', '神之子', '劍豪'], 'STR', 'DEX'],
  [['大魔導士火毒', '大魔導士冰雷', '主教', '烈焰巫師', '龍魔導士', '夜光', '煉獄巫師', '伊利恩', '菈菈', '凱內西斯', '陰陽師', '琳恩'], 'INT', 'LUK'],
  [['箭神', '神射手', '開拓者', '槍神', '破風使者', '精靈遊俠', '狂豹獵人', '機甲戰神', '凱殷', '天使破壞者', '墨玄'], 'DEX', 'STR'],
  [['夜使者', '暗夜行者', '幻影俠盜', '卡莉', '虎影'], 'LUK', 'DEX'],
  [['暗影神偷', '影武者', '卡蒂娜'], 'LUK', 'STR', 'DEX'],
  [['惡魔復仇者'], 'HP', 'STR'],
  [['傑諾'], 'STR', 'DEX', 'LUK'],
];
const magicJobs = new Set(groups[1][0]);
const normalizeJob = (value) => String(value || '').replace(/[（）(),、\s]/g, '');
const jobInfo = (job) => {
  const normalized = normalizeJob(job);
  const found = groups.find(([names]) => names.includes(normalized)) || groups[0];
  return { normalized, main: found[1], sub: found[2], second: found[3], magic: magicJobs.has(normalized) };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function getJson(url, attempt = 0) {
  let response;
  try {
    response = await fetch(url, { headers: url.startsWith(apiBase) ? nexonHeaders : holyBearHeaders });
  } catch (error) {
    if (attempt >= 6) throw error;
    await sleep(500 * 2 ** attempt);
    return getJson(url, attempt + 1);
  }
  const body = await response.text();
  let data;
  try {
    data = body ? JSON.parse(body) : {};
  } catch {
    data = null;
  }
  if (response.status === 503 && data?.maintenance) {
    throw new Error('HolyBear ranking API rejected the maintenance bypass key');
  }
  if ((response.status === 429 || response.status >= 500) && attempt < 6) {
    await sleep(500 * 2 ** attempt);
    return getJson(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  if (data === null) throw new Error(`Invalid JSON from ${url}`);
  return data;
}

const statNumber = (stats, name) => Number(stats.find((item) => item.stat_name === name)?.stat_value || 0);
const potentialLines = (item) => [
  item.potential_option_1, item.potential_option_2, item.potential_option_3,
  item.additional_potential_option_1, item.additional_potential_option_2, item.additional_potential_option_3,
].filter(Boolean);

function equipmentAttackPercent(equipment, magic) {
  const preset = Number(equipment.preset_no || 0);
  const items = equipment[`item_equipment_preset_${preset}`] || equipment.item_equipment || [];
  const matcher = magic ? /魔法攻擊力\s*\+?(\d+(?:\.\d+)?)%/ : /物理攻擊力\s*\+?(\d+(?:\.\d+)?)%/;
  return items.flatMap(potentialLines).reduce((total, line) => total + Number(line.match(matcher)?.[1] || 0), 0);
}

function familiarAttackPercent(familiar, magic) {
  const activeSlots = new Set((familiar.familiar_link_slot || [])
    .filter((slot) => String(slot.active_flag).toLowerCase() === 'true')
    .map((slot) => String(slot.slot_id)));
  return (familiar.familiar_info || []).reduce((total, card) => {
    const summoned = String(card.summoned_flag).toLowerCase() === 'true';
    const bonded = !summoned && activeSlots.has(String(card.slot_id));
    if (!summoned && !bonded) return total;
    return total + (card.option || []).reduce((sum, option) => {
      const text = `${option.option_name || ''} ${option.option_value || ''}%`;
      const bothTypes = /攻擊力\s*(?:[／/]|及|和|與)\s*(?:魔法攻擊力|魔力)|物理.*魔法.*攻擊力/i.test(text);
      const magicOnly = /魔法攻擊力|魔力/i.test(text) && !bothTypes;
      const physicalOnly = /物理攻擊力|攻擊力/i.test(text) && !magicOnly && !bothTypes;
      if (!(bothTypes || (magic ? magicOnly : physicalOnly))) return sum;
      const rawValue = Number(option.option_value || 0);
      if (!bonded) return sum + rawValue;
      const legendary = /傳說|legend/i.test(String(card.familiar_grade || '')) || rawValue > 8;
      const special = String(card.familiar_special_flag).toLowerCase() === 'true';
      return sum + (legendary ? (special ? 5 : 4) : (special ? 3 : 2));
    }, 0);
  }, 0);
}

const cacheKeyFor = (entry) => entry.ocid ? `ocid:${entry.ocid}` : `name:${String(entry.name).normalize('NFC')}`;
const withCurrentRankingValues = (radar, entry) => ({
  ...radar,
  job: jobInfo(entry.job).normalized,
  combatPower: Number(entry.combatPower || radar.combatPower || 0),
});

async function readRadarRecord(entry) {
  const ocid = entry.ocid || (await getJson(`${apiBase}/id?character_name=${encodeURIComponent(entry.name)}`)).ocid;
  const query = `ocid=${encodeURIComponent(ocid)}`;
  const [stat, equipment, familiar] = await Promise.all([
    getJson(`${apiBase}/character/stat?${query}`),
    getJson(`${apiBase}/character/item-equipment?${query}`),
    getJson(`${apiBase}/character/familiar?${query}`),
  ]);
  const info = jobInfo(entry.job);
  const stats = stat.final_stat || [];
  const main = statNumber(stats, info.main);
  const sub = statNumber(stats, info.sub);
  const second = info.second ? statNumber(stats, info.second) : 0;
  const effectiveMain = info.normalized === '傑諾'
    ? main + sub + second
    : info.normalized === '惡魔復仇者'
      ? statNumber(stats, 'AP配點HP') / 3.5 + (main - statNumber(stats, 'AP配點HP')) / 3.5 * 0.8
      : (4 * main + sub + second) / 4;
  return {
    job: info.normalized,
    effectiveMain,
    combatPower: Number(entry.combatPower || statNumber(stats, '戰鬥力') || statNumber(stats, 'Combat Power') || 0),
    main,
    attack: statNumber(stats, info.magic ? '魔法攻擊力' : '攻擊力'),
    attackPercent: equipmentAttackPercent(equipment, info.magic) + familiarAttackPercent(familiar, info.magic),
    bossTotal: statNumber(stats, '傷害') + statNumber(stats, 'BOSS怪物傷害'),
    criticalDamage: statNumber(stats, '爆擊傷害'),
    ignoreDefense: statNumber(stats, '無視防禦率'),
  };
}

const loadCache = () => {
  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (parsed?.version === 2 && parsed.records && typeof parsed.records === 'object') return parsed;
  } catch (error) {
    if (error?.code !== 'ENOENT') console.warn(`Ignoring unreadable radar cache: ${error.message}`);
  }
  return { version: 2, records: {} };
};

const saveCache = (cache) => {
  fs.mkdirSync(cacheDir, { recursive: true });
  const temporaryPath = `${cachePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(cache)}\n`);
  try {
    fs.renameSync(temporaryPath, cachePath);
  } catch (error) {
    // Windows cannot atomically replace an existing destination with rename.
    if (!['EEXIST', 'EPERM'].includes(error?.code)) throw error;
    fs.rmSync(cachePath, { force: true });
    fs.renameSync(temporaryPath, cachePath);
  }
};

const ranking = [];
const normalizeRankingItems = (items = []) => items.map((item) => ({
  ocid: item.ocid,
  name: item.characterName,
  avatar: item.characterImage,
  world: item.worldName,
  job: item.jobName,
  level: Number(item.level || 0),
  combatPower: Number(item.combatPower || 0),
}));
for (let page = 1; ; page += 1) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(rankingPageSize), minLevel: String(minimumLevel) });
  const response = await getJson(`${holyBearApiBase}/api/rankings/combat-power?${params}`);
  if (response.degraded) {
    const snapshot = await getJson(`${holyBearApiBase}/maplestory/rankings/current.json`);
    const rawSnapshotItems = snapshot.items || [];
    const snapshotItems = normalizeRankingItems(rawSnapshotItems).filter((entry) => entry.level >= minimumLevel);
    const snapshotTotal = Number(snapshot.total);
    if (!snapshotItems.length || (Number.isFinite(snapshotTotal) && rawSnapshotItems.length < snapshotTotal)) {
      console.warn('HolyBear ranking is degraded and its static snapshot is incomplete; preserving the previous radar reference');
      process.exit(0);
    }
    console.warn(`HolyBear ranking is degraded; using the complete ${snapshotItems.length}-character static snapshot`);
    ranking.push(...snapshotItems);
    break;
  }
  const items = normalizeRankingItems(response.items || []);
  const total = Number(response.total);
  ranking.push(...items);
  if (items.length === 0 || items.length < rankingPageSize || (Number.isFinite(total) && ranking.length >= total)) break;
}

const trackedByName = new Map();
for (const entry of ranking) {
  if (!entry?.name || entry.level < minimumLevel) continue;
  const normalizedName = String(entry.name).normalize('NFC');
  if (!trackedByName.has(normalizedName)) trackedByName.set(normalizedName, entry);
}
const trackedCharacters = [...trackedByName.values()];
const sampledCharacters = selectStratifiedRadarSamples(trackedCharacters, samplesPerJob, normalizeJob);
const cache = loadCache();
const recordsByKey = new Map();
const refreshEntries = [];
let freshCacheHits = 0;
let staleCacheFallbacks = 0;

for (const entry of sampledCharacters) {
  const key = cacheKeyFor(entry);
  const cached = cache.records[key];
  const cachedAt = Date.parse(cached?.fetchedAt || '');
  const compatible = cached?.radar && cached.job === normalizeJob(entry.job);
  if (compatible) {
    recordsByKey.set(key, withCurrentRankingValues(cached.radar, entry));
    if (Number.isFinite(cachedAt) && Date.now() - cachedAt <= cacheTtlMs) {
      freshCacheHits += 1;
      continue;
    }
    staleCacheFallbacks += 1;
  }
  refreshEntries.push(entry);
}

let refreshed = 0;
let failed = 0;
let stoppedEarly = false;
for (let start = 0; start < refreshEntries.length; start += concurrency) {
  if (Date.now() - runStartedAt >= runBudgetMs) {
    stoppedEarly = true;
    break;
  }
  const entries = refreshEntries.slice(start, start + concurrency);
  const settled = await Promise.allSettled(entries.map(readRadarRecord));
  settled.forEach((result, index) => {
    const entry = entries[index];
    const key = cacheKeyFor(entry);
    if (result.status === 'fulfilled') {
      recordsByKey.set(key, result.value);
      cache.records[key] = {
        fetchedAt: new Date().toISOString(),
        characterName: String(entry.name).normalize('NFC'),
        job: normalizeJob(entry.job),
        level: entry.level,
        radar: result.value,
      };
      refreshed += 1;
    } else {
      failed += 1;
      console.warn(`Unable to refresh ${entry.name}: ${result.reason?.message || result.reason}`);
    }
  });
  if ((start + concurrency) % 40 === 0 || start + concurrency >= refreshEntries.length) {
    saveCache(cache);
    process.stdout.write(`Refreshed ${Math.min(start + concurrency, refreshEntries.length)}/${refreshEntries.length}; failed ${failed}\n`);
  }
}
saveCache(cache);

const radarRecords = sampledCharacters.map((entry) => recordsByKey.get(cacheKeyFor(entry))).filter(Boolean);
const minimumUsable = Math.max(1, Math.floor(sampledCharacters.length * 0.5));
if (radarRecords.length < minimumUsable) {
  console.warn(`Only ${radarRecords.length}/${sampledCharacters.length} sampled records are usable; preserving the previous radar reference`);
  process.exit(0);
}

const axes = ['effectiveMain', 'combatPower', 'main', 'attack', 'attackPercent', 'bossTotal', 'criticalDamage', 'ignoreDefense'];
const jobs = Object.fromEntries([...new Set(radarRecords.map((record) => record.job))].sort().map((job) => {
  const rows = radarRecords.filter((record) => record.job === job);
  return [job, Object.fromEntries([
    ['sampleSize', rows.length],
    ...axes.map((axis) => [axis, rows.map((row) => row[axis]).filter(Number.isFinite).sort((a, b) => a - b)]),
  ])];
}));
const allEffectiveMain = radarRecords.map((record) => record.effectiveMain).filter(Number.isFinite).sort((a, b) => a - b);
const percentile = (values, p) => values[Math.min(values.length - 1, Math.max(0, Math.round((values.length - 1) * p)))] || 1;
const referenceMax = Math.ceil(percentile(allEffectiveMain, 0.99) / 5000) * 5000;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const generatedAt = new Date().toISOString();
fs.writeFileSync(outputPath, `${JSON.stringify({
  generatedAt,
  sourceCount: trackedCharacters.length,
  sampledSourceCount: sampledCharacters.length,
  usableCount: radarRecords.length,
  samplesPerJob,
  referenceMax,
  jobs,
}, null, 2)}\n`);

process.stdout.write(`Wrote ${outputPath} with ${radarRecords.length}/${sampledCharacters.length} sampled records from ${trackedCharacters.length} eligible characters; max ${referenceMax}\n`);
process.stdout.write(`Cache: ${freshCacheHits} fresh hits, ${staleCacheFallbacks} stale fallbacks, ${refreshed} refreshed, ${failed} failed${stoppedEarly ? ', run budget reached' : ''}\n`);
