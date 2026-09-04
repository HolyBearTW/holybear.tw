import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createAliasSignatureInputs } from '../.vitepress/theme/maplestory/services/aliasFingerprint.js';

const root = path.resolve(import.meta.dirname, '..');
const envPath = path.join(root, '.env');
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const apiKey = process.env.VITE_NEXON_API_KEY
  || env.match(/^VITE_NEXON_API_KEY=(.*)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '');
if (!apiKey) throw new Error('VITE_NEXON_API_KEY is missing');

const outputPath = path.join(root, '.vitepress/theme/maplestory/data/tmsRadarReference.json');
const aliasOutputDir = path.join(root, 'public/maplestory/aliases');
const aliasGroupOutputDir = path.join(aliasOutputDir, 'groups');
const aliasIndexOutputPath = path.join(aliasOutputDir, 'index.json');
const apiBase = 'https://open.api.nexon.com/maplestorytw/v1';
const holyBearApiBase = String(process.env.HOLYBEAR_API_BASE_URL || 'https://holybear.tw').replace(/\/+$/, '');
const headers = { 'x-nxopen-api-key': apiKey };

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
  const response = await fetch(url, { headers: url.startsWith(apiBase) ? headers : undefined });
  if ((response.status === 429 || response.status >= 500) && attempt < 6) {
    await sleep(500 * 2 ** attempt);
    return getJson(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function getOptionalJson(url) {
  try {
    return await getJson(url);
  } catch (error) {
    if (/^(400|404)\s/.test(String(error?.message || error))) return null;
    throw error;
  }
}

const hashSignature = (value) => crypto.createHash('sha256').update(value).digest('hex');

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
    const active = summoned || bonded;
    if (!active) return total;
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

async function readCharacter(entry) {
  const id = await getJson(`${apiBase}/id?character_name=${encodeURIComponent(entry.name)}`);
  const query = `ocid=${encodeURIComponent(id.ocid)}`;
  const radarEligible = entry.fromTrackedSource !== false;
  const [basic, stat, equipment, familiar, unionRaider, unionChampion] = await Promise.all([
    getJson(`${apiBase}/character/basic?${query}`),
    getJson(`${apiBase}/character/stat?${query}`),
    radarEligible ? getJson(`${apiBase}/character/item-equipment?${query}`) : Promise.resolve({}),
    radarEligible ? getJson(`${apiBase}/character/familiar?${query}`) : Promise.resolve({}),
    getOptionalJson(`${apiBase}/user/union-raider?${query}`),
    getOptionalJson(`${apiBase}/user/union-champion?${query}`),
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
  const combatPower = Number(entry.combatPower || statNumber(stats, '戰鬥力') || statNumber(stats, 'Combat Power') || 0);
  return {
    radarEligible,
    radar: {
      job: info.normalized,
      effectiveMain,
      combatPower,
      main,
      attack: statNumber(stats, info.magic ? '魔法攻擊力' : '攻擊力'),
      attackPercent: equipmentAttackPercent(equipment, info.magic) + familiarAttackPercent(familiar, info.magic),
      bossTotal: statNumber(stats, '傷害') + statNumber(stats, 'BOSS怪物傷害'),
      criticalDamage: statNumber(stats, '爆擊傷害'),
      ignoreDefense: statNumber(stats, '無視防禦率'),
    },
    alias: {
      characterName: String(basic.character_name || entry.name).normalize('NFC'),
      worldName: String(basic.world_name || entry.world || ''),
      characterClass: String(basic.character_class || entry.job || ''),
      characterLevel: Number(basic.character_level || entry.level || 0),
      characterImage: String(basic.character_image || entry.avatar || ''),
      characterPower: String(combatPower),
      maxCharacterPower: String(combatPower),
      combatPowerRank: Number(entry.combatPowerRank || 0) || null,
      characterGuildName: basic.character_guild_name || null,
      characterDateCreate: basic.character_date_create || null,
      signatures: createAliasSignatureInputs(unionRaider, unionChampion).map(hashSignature),
      championNames: (unionChampion?.union_champion || [])
        .map((champion) => String(champion?.champion_name || '').normalize('NFC'))
        .filter(Boolean),
    },
  };
}

const ranking = [];
const rankingPageSize = 100;
const normalizeRankingItems = (items = []) => items.map((item) => ({
  name: item.characterName,
  avatar: item.characterImage,
  world: item.worldName,
  job: item.jobName,
  level: item.level,
  combatPower: item.combatPower,
}));
for (let page = 1; ; page += 1) {
  const response = await getJson(`${holyBearApiBase}/api/rankings/combat-power?page=${page}&pageSize=${rankingPageSize}`);
  if (response.degraded) {
    const snapshot = await getJson(`${holyBearApiBase}/maplestory/rankings/current.json`);
    const snapshotItems = normalizeRankingItems(snapshot.items || []);
    const snapshotTotal = Number(snapshot.total);
    if (!snapshotItems.length || (Number.isFinite(snapshotTotal) && snapshotItems.length < snapshotTotal)) {
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
  if (!entry?.name) continue;
  const normalizedName = String(entry.name).normalize('NFC');
  // The source is already ordered by combat power, so the first duplicate is
  // the same row used by the site's recent-power ranking.
  if (!trackedByName.has(normalizedName)) trackedByName.set(normalizedName, entry);
}
const trackedCharacters = [...trackedByName.values()]
  .map((entry, index) => ({ ...entry, combatPowerRank: index + 1, fromTrackedSource: true }));

const records = [];
for (let start = 0; start < trackedCharacters.length; start += 8) {
  const settled = await Promise.allSettled(trackedCharacters.slice(start, start + 8).map(readCharacter));
  records.push(...settled.filter((item) => item.status === 'fulfilled').map((item) => item.value));
  if ((start + 8) % 40 === 0 || start + 8 >= trackedCharacters.length) {
    process.stdout.write(`Fetched ${Math.min(start + 8, trackedCharacters.length)}/${trackedCharacters.length}; usable ${records.length}\n`);
  }
}

const scannedNames = new Set(records.map((record) => record.alias.characterName.normalize('NFC')));
const championCandidates = [...new Set(records.flatMap((record) => record.alias.championNames))]
  .filter((name) => !scannedNames.has(name));
const championRecords = [];
for (let start = 0; start < championCandidates.length; start += 8) {
  const entries = championCandidates.slice(start, start + 8)
    .map((name) => ({ name, fromTrackedSource: false }));
  const settled = await Promise.allSettled(entries.map(readCharacter));
  championRecords.push(...settled.filter((item) => item.status === 'fulfilled').map((item) => item.value));
  if ((start + 8) % 40 === 0 || start + 8 >= championCandidates.length) {
    process.stdout.write(`Expanded champions ${Math.min(start + 8, championCandidates.length)}/${championCandidates.length}; usable ${championRecords.length}\n`);
  }
}
records.push(...championRecords);

const radarRecords = records
  .filter((record) => record.radarEligible && record.alias.characterLevel >= 260)
  .map((record) => record.radar);
const radarSourceCount = trackedCharacters.filter((entry) => Number(entry.level || 0) >= 260).length;
const axes = ['effectiveMain', 'combatPower', 'main', 'attack', 'attackPercent', 'bossTotal', 'criticalDamage', 'ignoreDefense'];
const jobs = Object.fromEntries([...new Set(radarRecords.map((record) => record.job))].sort().map((job) => {
  const rows = radarRecords.filter((record) => record.job === job);
  return [job, Object.fromEntries([
    ['sampleSize', rows.length],
    ...axes.map((axis) => [axis, rows.map((row) => row[axis]).filter(Number.isFinite).sort((a, b) => a - b)]),
  ])];
}));
const allEffectiveMain = radarRecords.map((record) => record.effectiveMain).sort((a, b) => a - b);
const percentile = (values, p) => values[Math.min(values.length - 1, Math.max(0, Math.round((values.length - 1) * p)))] || 1;
const referenceMax = Math.ceil(percentile(allEffectiveMain, 0.99) / 5000) * 5000;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const generatedAt = new Date().toISOString();
fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt, sourceCount: radarSourceCount, usableCount: radarRecords.length, referenceMax, jobs }, null, 2)}\n`);

const aliasProfiles = records.map((record) => record.alias).filter((profile) => profile.signatures.length > 0);
const parent = aliasProfiles.map((_, index) => index);
const find = (index) => {
  while (parent[index] !== index) {
    parent[index] = parent[parent[index]];
    index = parent[index];
  }
  return index;
};
const unite = (left, right) => {
  const leftRoot = find(left);
  const rightRoot = find(right);
  if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
};
const firstBySignature = new Map();
aliasProfiles.forEach((profile, index) => {
  for (const signature of profile.signatures) {
    const first = firstBySignature.get(signature);
    if (first === undefined) firstBySignature.set(signature, index);
    else unite(first, index);
  }
});

const connected = new Map();
aliasProfiles.forEach((profile, index) => {
  const rootIndex = find(index);
  if (!connected.has(rootIndex)) connected.set(rootIndex, []);
  connected.get(rootIndex).push(profile);
});
const aliasGroups = [...connected.values()]
  .filter((members) => members.length > 1)
  .map((members) => {
    const sortedMembers = [...members].sort((left, right) => left.characterName.localeCompare(right.characterName));
    return {
      id: hashSignature(sortedMembers.map((member) => member.characterName).join('\n')).slice(0, 16),
      signatures: [...new Set(sortedMembers.flatMap((member) => member.signatures))].sort(),
      members: sortedMembers.map(({ signatures, championNames, ...member }) => member),
    };
  })
  .sort((left, right) => left.id.localeCompare(right.id));

fs.rmSync(aliasOutputDir, { recursive: true, force: true });
fs.mkdirSync(aliasGroupOutputDir, { recursive: true });
const characterGroups = {};
const signatureGroups = {};
for (const group of aliasGroups) {
  for (const member of group.members) characterGroups[member.characterName] = group.id;
  for (const signature of group.signatures) signatureGroups[signature] = group.id;
  fs.writeFileSync(
    path.join(aliasGroupOutputDir, `${group.id}.json`),
    `${JSON.stringify({ id: group.id, members: group.members }, null, 2)}\n`,
  );
}
fs.writeFileSync(aliasIndexOutputPath, `${JSON.stringify({
  generatedAt,
  fingerprintVersion: 1,
  sourceCount: trackedCharacters.length,
  usableCount: aliasProfiles.length,
  championExpandedCount: championRecords.length,
  groupCount: aliasGroups.length,
  characterGroups,
  signatureGroups,
}, null, 2)}\n`);
process.stdout.write(`Wrote ${outputPath} with ${radarRecords.length} radar records from ${trackedCharacters.length} tracked characters; max ${referenceMax}\n`);
process.stdout.write(`Wrote ${aliasIndexOutputPath} and ${aliasGroups.length} group files from ${aliasProfiles.length} usable characters\n`);
