import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const envPath = path.join(root, '.env');
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const apiKey = process.env.VITE_NEXON_API_KEY
  || env.match(/^VITE_NEXON_API_KEY=(.*)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '');
if (!apiKey) throw new Error('VITE_NEXON_API_KEY is missing');

const outputPath = path.join(root, '.vitepress/theme/maplestory/data/tmsRadarReference.json');
const apiBase = 'https://open.api.nexon.com/maplestorytw/v1';
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
    combatPower: Number(entry.combatPower || 0),
    main,
    attack: statNumber(stats, info.magic ? '魔法攻擊力' : '攻擊力'),
    attackPercent: equipmentAttackPercent(equipment, info.magic) + familiarAttackPercent(familiar, info.magic),
    bossTotal: statNumber(stats, '傷害') + statNumber(stats, 'BOSS怪物傷害'),
    criticalDamage: statNumber(stats, '爆擊傷害'),
    ignoreDefense: statNumber(stats, '無視防禦率'),
  };
}

const ranking = [];
for (let page = 1; page <= 9; page += 1) {
  const response = await getJson(`https://api.maplerhouse.cn/api/v1/tms/characters/history/tracked?page=${page}&page_size=100&sort=combat_power&sort_order=desc&min_level=260`);
  ranking.push(...(response.data?.items || []));
}

const records = [];
for (let start = 0; start < ranking.length; start += 8) {
  const settled = await Promise.allSettled(ranking.slice(start, start + 8).map(readCharacter));
  records.push(...settled.filter((item) => item.status === 'fulfilled').map((item) => item.value));
  if ((start + 8) % 40 === 0 || start + 8 >= ranking.length) {
    process.stdout.write(`Fetched ${Math.min(start + 8, ranking.length)}/${ranking.length}; usable ${records.length}\n`);
  }
}

const axes = ['effectiveMain', 'combatPower', 'main', 'attack', 'attackPercent', 'bossTotal', 'criticalDamage', 'ignoreDefense'];
const jobs = Object.fromEntries([...new Set(records.map((record) => record.job))].sort().map((job) => {
  const rows = records.filter((record) => record.job === job);
  return [job, Object.fromEntries([
    ['sampleSize', rows.length],
    ...axes.map((axis) => [axis, rows.map((row) => row[axis]).filter(Number.isFinite).sort((a, b) => a - b)]),
  ])];
}));
const allEffectiveMain = records.map((record) => record.effectiveMain).sort((a, b) => a - b);
const percentile = (values, p) => values[Math.min(values.length - 1, Math.max(0, Math.round((values.length - 1) * p)))] || 1;
const referenceMax = Math.ceil(percentile(allEffectiveMain, 0.99) / 5000) * 5000;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), sourceCount: records.length, referenceMax, jobs }, null, 2)}\n`);
process.stdout.write(`Wrote ${outputPath} with ${records.length} records; max ${referenceMax}\n`);
