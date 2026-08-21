import React, { useEffect, useMemo, useState } from 'react';
import { Grid3X3, Shield } from 'lucide-react';
import {
  CharacterUnion,
  CharacterUnionRaider,
  UnionBlock,
  UnionRaiderPreset,
} from '../types';

interface UnionRaiderSectionProps {
  union?: CharacterUnion;
  unionRaider?: CharacterUnionRaider;
}

const BOARD_MIN_X = -11;
const BOARD_MAX_X = 10;
const BOARD_MIN_Y = -9;
const BOARD_MAX_Y = 10;
const BOARD_COLUMNS = BOARD_MAX_X - BOARD_MIN_X + 1;

const classColors: Record<string, string> = {
  劍士: 'border-rose-400/60 bg-rose-950 text-rose-200',
  法師: 'border-sky-400/60 bg-sky-950 text-sky-200',
  弓箭手: 'border-emerald-400/60 bg-emerald-950 text-emerald-200',
  盜賊: 'border-violet-400/60 bg-violet-950 text-violet-200',
  海盜: 'border-amber-400/60 bg-amber-950 text-amber-200',
  hybrid: 'border-indigo-400/60 bg-indigo-950 text-indigo-200',
};

const blockColors: Record<string, string> = {
  劍士: 'bg-rose-500/75',
  法師: 'bg-sky-500/75',
  弓箭手: 'bg-emerald-500/75',
  盜賊: 'bg-violet-500/75',
  海盜: 'bg-amber-400/80',
  hybrid: 'bg-indigo-500/75',
};

const classPortraits: Record<string, string> = {
  艾瑞爾: 'erellight.png',
  'Erel Light': 'erellight.png',
  阿戴爾: 'adele.jpg',
  天使破壞者: 'angelicbuster.jpg',
  狂狼勇士: 'aran.jpg',
  亞克: 'ark.jpg',
  煉獄巫師: 'battlemage.jpg',
  主教: 'bishop.jpg',
  爆拳槍神: 'blaster.jpg',
  神射手: 'bowmaster.jpg',
  拳霸: 'buccaneer.jpg',
  卡蒂娜: 'cadena.jpg',
  重砲指揮官: 'cannonmaster.jpg',
  槍神: 'corsair.jpg',
  黑騎士: 'darkknight.jpg',
  聖魂劍士: 'dawnwarrior.jpg',
  惡魔復仇者: 'demonavenger.jpg',
  惡魔殺手: 'demonslayer.jpg',
  影武者: 'dualblade.jpg',
  龍魔導士: 'evan.jpg',
  '大魔導士(火、毒)': 'firepoison.jpg',
  烈焰巫師: 'flamewizard.jpg',
  劍豪: 'hayato.jpg',
  英雄: 'hero.jpg',
  虎影: 'hoyoung.jpg',
  '大魔導士(冰、雷)': 'icelightning.jpg',
  伊利恩: 'illium.jpg',
  凱殷: 'kaine.jpg',
  凱撒: 'kaiser.jpg',
  陰陽師: 'kanna.jpg',
  卡莉: 'khali.jpg',
  凱內西斯: 'kinesis.jpg',
  菈菈: 'lara.jpg',
  夜光: 'luminous.jpg',
  琳恩: 'lynn.jpg',
  箭神: 'marksman.jpg',
  機甲戰神: 'mechanic.jpg',
  精靈遊俠: 'mercedes.jpg',
  米哈逸: 'mihile.jpg',
  墨玄: 'moxuan.jpg',
  夜使者: 'nightlord.jpg',
  暗夜行者: 'nightwalker.jpg',
  聖騎士: 'paladin.jpg',
  開拓者: 'pathfinder.jpg',
  幻影俠盜: 'phantom.jpg',
  蓮: 'ren.jpg',
  隱月: 'shade.jpg',
  暗影神偷: 'shadower.jpg',
  施亞阿斯特: 'sia.jpg',
  閃雷悍將: 'thunderbreaker.jpg',
  狂豹獵人: 'wildhunter.jpg',
  破風使者: 'windarcher.jpg',
  傑諾: 'xenon.jpg',
  神之子: 'zero.jpg',
};

const normalizeClassName = (value: string) => value.toLocaleLowerCase().replace(/[\s().（）、，,_\-/]/g, '');
const normalizedClassPortraits = new Map(
  Object.entries(classPortraits).map(([name, file]) => [normalizeClassName(name), file]),
);
const getClassPortrait = (className?: string | null) => {
  const file = className ? normalizedClassPortraits.get(normalizeClassName(className)) : null;
  return `/image/theme/maplestory_class/${file || 'all.jpg'}`;
};

const getUnionBlockName = (block: UnionBlock) => {
  const name = block.block_class || block.block_type || '(Unknown)';
  return name.trim().toLocaleLowerCase() === '(unknown)' ? '納希沙漠' : name;
};

type UnionEffectKind =
  | 'STR' | 'DEX' | 'INT' | 'LUK' | 'ALL_STAT'
  | 'CRIT_DAMAGE' | 'BOSS_DAMAGE' | 'IGNORE_DEF' | 'CRIT_RATE'
  | 'BUFF_DURATION' | 'SUMMON_DURATION' | 'COOLDOWN' | 'EXP' | 'MESO'
  | 'STATUS_DAMAGE' | 'WILD_HUNTER_DAMAGE' | 'FLAT_HP' | 'MAX_HP' | 'MAX_MP'
  | 'RECOVER_HP' | 'RECOVER_MP' | 'STATUS_RESISTANCE' | 'MOVEMENT_SPEED';

const unionEffectKinds = new Map<string, UnionEffectKind>();
const registerUnionEffect = (kind: UnionEffectKind, classNames: string[]) => {
  classNames.forEach((className) => unionEffectKinds.set(normalizeClassName(className), kind));
};

registerUnionEffect('STR', ['亞克', '阿戴爾', '拳霸', '重砲指揮官', '重砲', '英雄', '凱撒', '聖騎士', '閃雷悍將']);
registerUnionEffect('DEX', ['天使破壞者', '箭神', '凱殷', '開拓者', '破風使者']);
registerUnionEffect('INT', ['大魔導士(冰、雷)', '煉獄巫師', '主教', '烈焰巫師', '凱內西斯', '菈菈', '伊利恩', '夜光']);
registerUnionEffect('LUK', ['卡蒂娜', '影武者', '虎影', '卡莉', '暗夜行者', '暗影神偷']);
registerUnionEffect('ALL_STAT', ['傑諾']);
registerUnionEffect('CRIT_DAMAGE', ['劍豪', '隱月', '墨玄']);
registerUnionEffect('BOSS_DAMAGE', ['惡魔復仇者', '陰陽師', '葉里萊特', '艾瑞爾', 'Erel Light']);
registerUnionEffect('IGNORE_DEF', ['爆拳槍神', '琳恩', '幻獸師']);
registerUnionEffect('CRIT_RATE', ['神射手', '夜使者']);
registerUnionEffect('BUFF_DURATION', ['機甲戰神']);
registerUnionEffect('SUMMON_DURATION', ['槍神']);
registerUnionEffect('COOLDOWN', ['精靈遊俠']);
registerUnionEffect('EXP', ['神之子']);
registerUnionEffect('MESO', ['幻影俠盜']);
registerUnionEffect('STATUS_DAMAGE', ['施亞阿斯特']);
registerUnionEffect('WILD_HUNTER_DAMAGE', ['狂豹獵人']);
registerUnionEffect('FLAT_HP', ['聖魂劍士', '米哈逸']);
registerUnionEffect('MAX_HP', ['黑騎士']);
registerUnionEffect('MAX_MP', ['大魔導士(火、毒)']);
registerUnionEffect('RECOVER_HP', ['狂狼勇士']);
registerUnionEffect('RECOVER_MP', ['龍魔導士']);
registerUnionEffect('STATUS_RESISTANCE', ['惡魔殺手']);
registerUnionEffect('MOVEMENT_SPEED', ['蓮']);

const unionEffectValues: Record<UnionEffectKind, number[]> = {
  STR: [10, 20, 40, 80, 100],
  DEX: [10, 20, 40, 80, 100],
  INT: [10, 20, 40, 80, 100],
  LUK: [10, 20, 40, 80, 100],
  ALL_STAT: [5, 10, 20, 40, 50],
  CRIT_DAMAGE: [1, 2, 3, 5, 6],
  BOSS_DAMAGE: [1, 2, 3, 5, 6],
  IGNORE_DEF: [1, 2, 3, 5, 6],
  CRIT_RATE: [1, 2, 3, 4, 5],
  BUFF_DURATION: [5, 10, 15, 20, 25],
  SUMMON_DURATION: [4, 6, 8, 10, 12],
  COOLDOWN: [2, 3, 4, 5, 6],
  EXP: [4, 6, 8, 10, 12],
  MESO: [1, 2, 3, 4, 5],
  STATUS_DAMAGE: [1, 2, 3, 5, 6],
  WILD_HUNTER_DAMAGE: [4, 8, 12, 16, 20],
  FLAT_HP: [250, 500, 1000, 2000, 2500],
  MAX_HP: [2, 3, 4, 5, 6],
  MAX_MP: [2, 3, 4, 5, 6],
  RECOVER_HP: [2, 4, 6, 8, 10],
  RECOVER_MP: [2, 4, 6, 8, 10],
  STATUS_RESISTANCE: [1, 2, 3, 4, 5],
  MOVEMENT_SPEED: [2, 4, 6, 8, 10],
};

const getUnionRankIndex = (block: UnionBlock) => {
  const level = Number(block.block_level) || 0;
  const thresholds = normalizeClassName(block.block_class || '') === normalizeClassName('神之子')
    ? [130, 160, 180, 200, 250]
    : [60, 100, 140, 200, 250];
  let rankIndex = 0;
  thresholds.forEach((threshold, index) => {
    if (level >= threshold) rankIndex = index;
  });
  return rankIndex;
};

const getRank = (block: UnionBlock) => ['B', 'A', 'S', 'SS', 'SSS'][getUnionRankIndex(block)];

const normalizeUnionEffect = (effect: string) => effect.replace(/\s+/g, '').toLocaleUpperCase();

const matchesUnionEffect = (effect: string, kind: UnionEffectKind, value: number) => {
  const normalized = normalizeUnionEffect(effect);
  switch (kind) {
    case 'STR': return normalized.includes(`增加STR${value}`) && !normalized.includes('DEX');
    case 'DEX': return normalized.includes(`增加DEX${value}`) && !normalized.includes('STR');
    case 'INT': return normalized.includes(`增加INT${value}`);
    case 'LUK': return normalized.includes(`增加LUK${value}`) && !normalized.includes('STR');
    case 'ALL_STAT': return normalized.includes('STR') && normalized.includes('DEX') && normalized.includes('LUK') && normalized.endsWith(String(value));
    case 'CRIT_DAMAGE': return normalized.includes(`爆擊傷害${value}%`);
    case 'BOSS_DAMAGE': return normalized.includes(`BOSS傷害${value}%`);
    case 'IGNORE_DEF': return normalized.includes(`無視防禦率${value}%`);
    case 'CRIT_RATE': return normalized.includes(`爆擊機率${value}%`);
    case 'BUFF_DURATION': return normalized.includes(`加持有效時間${value}%`);
    case 'SUMMON_DURATION': return normalized.includes(`召喚獸持續時間${value}%`);
    case 'COOLDOWN': return normalized.includes(`技能冷卻時間降低${value}%`);
    case 'EXP': return normalized.includes(`經驗值獲得量${value}%`);
    case 'MESO': return normalized.includes(`楓幣獲得量${value}%`);
    case 'STATUS_DAMAGE': return normalized.includes('狀態異常') && normalized.includes(`傷害${value}%`);
    case 'WILD_HUNTER_DAMAGE': return normalized.includes('攻擊時以20%的機率') && normalized.includes(`${value}%的傷害值`);
    case 'FLAT_HP': return normalized.includes(`增加HP${value}`) || normalized.includes(`增加純HP${value}`);
    case 'MAX_HP': return normalized.includes(`最大HP${value}%`);
    case 'MAX_MP': return normalized.includes(`最大MP${value}%`);
    case 'RECOVER_HP': return normalized.includes(`恢復純HP的${value}%`);
    case 'RECOVER_MP': return normalized.includes(`恢復純MP的${value}%`);
    case 'STATUS_RESISTANCE': return normalized.includes(`狀態異常耐性${value}`);
    case 'MOVEMENT_SPEED': return normalized.includes(`移動速度與最大移動速度${value}`);
    default: return false;
  }
};

const formatUnionEffectFallback = (kind: UnionEffectKind, value: number) => {
  const labels: Record<UnionEffectKind, string> = {
    STR: `增加STR ${value}`,
    DEX: `增加DEX ${value}`,
    INT: `增加INT ${value}`,
    LUK: `增加LUK ${value}`,
    ALL_STAT: `增加STR、DEX、LUK ${value}`,
    CRIT_DAMAGE: `增加爆擊傷害 ${value}%`,
    BOSS_DAMAGE: `增加攻擊BOSS傷害 ${value}%`,
    IGNORE_DEF: `增加無視防禦率 ${value}%`,
    CRIT_RATE: `增加爆擊機率 ${value}%`,
    BUFF_DURATION: `增加加持有效時間 ${value}%`,
    SUMMON_DURATION: `增加召喚獸持續時間 ${value}%`,
    COOLDOWN: `技能冷卻時間降低 ${value}%`,
    EXP: `增加經驗值獲得量 ${value}%`,
    MESO: `增加楓幣獲得量 ${value}%`,
    STATUS_DAMAGE: `攻擊異常狀態對象時傷害增加 ${value}%`,
    WILD_HUNTER_DAMAGE: `攻擊時有20%的機率增加 ${value}% 傷害`,
    FLAT_HP: `增加HP ${value}`,
    MAX_HP: `增加最大HP ${value}%`,
    MAX_MP: `增加最大MP ${value}%`,
    RECOVER_HP: `每當敵人攻擊時70%的機率恢復純HP的${value}%`,
    RECOVER_MP: `每當敵人攻擊時70%的機率恢復純MP的${value}%`,
    STATUS_RESISTANCE: `增加狀態異常耐性 ${value}`,
    MOVEMENT_SPEED: `增加移動速度與最大移動速度 ${value}`,
  };
  return labels[kind];
};

const resolveUnionMemberBonuses = (blocks: UnionBlock[], stats: string[]) => {
  // Nexon returns the placed blocks and member effects as separate arrays; their indexes are not related.
  // Match known jobs by effect type and card rank, then leave the remaining official effects to special blocks.
  const bonuses = new Array<string>(blocks.length);
  const usedStats = new Set<number>();
  const unresolvedBlockIndexes: number[] = [];

  blocks.forEach((block, blockIndex) => {
    const kind = unionEffectKinds.get(normalizeClassName(block.block_class || ''));
    if (!kind) {
      unresolvedBlockIndexes.push(blockIndex);
      return;
    }

    const value = unionEffectValues[kind][getUnionRankIndex(block)];
    const statIndex = stats.findIndex((stat, index) => !usedStats.has(index) && matchesUnionEffect(stat, kind, value));
    if (statIndex >= 0) {
      usedStats.add(statIndex);
      bonuses[blockIndex] = stats[statIndex].trim();
    } else {
      bonuses[blockIndex] = formatUnionEffectFallback(kind, value);
    }
  });

  const remainingStats = stats.filter((_, index) => !usedStats.has(index));
  unresolvedBlockIndexes.forEach((blockIndex, index) => {
    bonuses[blockIndex] = remainingStats[index]?.trim() || '暫無成員加成資料';
  });

  return bonuses;
};

const getPreset = (raider: CharacterUnionRaider, presetNo: number): UnionRaiderPreset => {
  const preset = raider[`union_raider_preset_${presetNo}` as keyof CharacterUnionRaider] as UnionRaiderPreset | undefined;
  if (preset) return preset;
  return {
    union_raider_stat: presetNo === Number(raider.use_preset_no || 1) ? raider.union_raider_stat : [],
    union_occupied_stat: presetNo === Number(raider.use_preset_no || 1) ? raider.union_occupied_stat : [],
    union_block: presetNo === Number(raider.use_preset_no || 1) ? raider.union_block : [],
    union_inner_stat: presetNo === Number(raider.use_preset_no || 1) ? raider.union_inner_stat : [],
  };
};

const UnionBoard: React.FC<{ blocks: UnionBlock[]; memberBonuses: string[] }> = ({ blocks, memberBonuses }) => {
  const [hoveredBlockIndex, setHoveredBlockIndex] = useState<number | null>(null);
  const blockCells = useMemo(() => {
    const cells = new Map<string, { block: UnionBlock; blockIndex: number; isControl: boolean }>();
    blocks.forEach((block, blockIndex) => {
      block.block_position.forEach((position) => {
        const isControl = position.x === block.block_control_point?.x && position.y === block.block_control_point?.y;
        cells.set(`${position.x},${position.y}`, { block, blockIndex, isControl });
      });
    });
    return cells;
  }, [blocks]);

  useEffect(() => setHoveredBlockIndex(null), [blocks]);

  const hoveredBlock = hoveredBlockIndex === null ? null : blocks[hoveredBlockIndex];

  const cells = [];
  for (let y = BOARD_MAX_Y; y >= BOARD_MIN_Y; y -= 1) {
    for (let x = BOARD_MIN_X; x <= BOARD_MAX_X; x += 1) {
      const occupied = blockCells.get(`${x},${y}`);
      const label = occupied ? getUnionBlockName(occupied.block) : '?';
      const memberBonus = occupied ? memberBonuses[occupied.blockIndex] || '暫無成員加成資料' : '';
      cells.push(
        <div
          key={`${x},${y}`}
          title={occupied ? `${label} · Lv.${occupied.block.block_level}\n${memberBonus}` : undefined}
          onMouseEnter={() => setHoveredBlockIndex(occupied?.blockIndex ?? null)}
          className={`maple-union-board-cell relative aspect-square border-b border-r border-slate-700/45 transition-[opacity,filter,box-shadow] duration-150 ${occupied ? blockColors[occupied.block.block_type] || 'bg-slate-500/70' : 'is-empty bg-slate-900/45'} ${hoveredBlockIndex !== null && occupied ? occupied.blockIndex === hoveredBlockIndex ? 'is-highlighted z-20 brightness-125 ring-1 ring-inset ring-white/90' : 'opacity-25 saturate-50' : ''}`}
        >
          {occupied?.isControl && (
            <span className="absolute inset-[-28%] z-10 overflow-hidden rounded-full border border-white/60 bg-slate-950 shadow-md" title={label}>
              <img src={getClassPortrait(occupied.block.block_class)} alt="" className="h-full w-full object-cover" loading="lazy" />
            </span>
          )}
        </div>,
      );
    }
  }

  return (
    <div onMouseLeave={() => setHoveredBlockIndex(null)}>
      <div className="mb-2 flex min-h-10 items-end justify-end text-[11px] text-slate-500">
        {hoveredBlock ? (
          <span className="maple-union-hover-label flex max-w-full items-center gap-2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-right text-slate-300">
            <strong>{getUnionBlockName(hoveredBlock)} · Lv.{hoveredBlock.block_level}</strong>
            <span className="text-[10px] text-slate-400">{memberBonuses[hoveredBlockIndex ?? -1] || '暫無成員加成資料'}</span>
          </span>
        ) : (
          <span>移到拼圖上查看完整範圍</span>
        )}
      </div>
      <div
        className="maple-union-board grid overflow-visible border-l border-t border-slate-700/45 bg-[#111722]"
        style={{ gridTemplateColumns: `repeat(${BOARD_COLUMNS}, minmax(0, 1fr))` }}
      >
        {cells}
      </div>
    </div>
  );
};

const StatList: React.FC<{ title: string; stats: string[]; columns?: boolean; wide?: boolean }> = ({ title, stats, columns = false, wide = false }) => (
  <div>
    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200">
      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />{title}
    </h4>
    {stats.length ? (
      <div className={wide ? 'grid gap-2 sm:grid-cols-2 xl:grid-cols-3' : columns ? 'grid gap-2 sm:grid-cols-2' : 'space-y-2'}>
        {stats.map((stat, index) => (
          <div key={`${stat}-${index}`} className="maple-union-stat rounded-lg border border-slate-800 bg-[#0d1117]/75 px-3 py-2 text-xs leading-5 text-slate-300">
            {stat}
          </div>
        ))}
      </div>
    ) : (
      <div className="rounded-lg border border-dashed border-slate-700 px-3 py-6 text-center text-xs text-slate-500">此預設尚未配置</div>
    )}
  </div>
);

const UnionRaiderSection: React.FC<UnionRaiderSectionProps> = ({ union, unionRaider }) => {
  const activePreset = Math.max(1, Math.min(5, Number(unionRaider?.use_preset_no || 1)));
  const [selectedPreset, setSelectedPreset] = useState(activePreset);

  useEffect(() => setSelectedPreset(activePreset), [activePreset, unionRaider]);

  const presets = useMemo(
    () => unionRaider ? [1, 2, 3, 4, 5].map((number) => getPreset(unionRaider, number)) : [],
    [unionRaider],
  );

  if (!unionRaider) return null;

  const preset = presets[selectedPreset - 1];
  if (!preset) return null;
  const memberBonuses = resolveUnionMemberBonuses(preset.union_block, preset.union_raider_stat);
  const members = preset.union_block
    .map((member, index) => ({ member, bonus: memberBonuses[index] }))
    .sort((a, b) => Number(b.member.block_level) - Number(a.member.block_level));
  const occupiedCells = new Set(preset.union_block.flatMap((block) => block.block_position.map((position) => `${position.x},${position.y}`))).size;

  return (
    <section className="maple-union-raider w-full rounded-xl border border-slate-800 bg-[#161b22] p-5 shadow-inner sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-bold text-slate-200">聯盟攻擊隊</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-[11px] text-slate-500">預設</span>
          {presets.map((item, index) => {
            const presetNo = index + 1;
            const available = item.union_block.length > 0;
            return (
              <button
                key={presetNo}
                type="button"
                title={`預設 ${presetNo}`}
                disabled={!available}
                onClick={() => setSelectedPreset(presetNo)}
                className={`maple-union-preset relative flex h-7 w-7 items-center justify-center rounded text-xs font-bold transition-all ${selectedPreset === presetNo ? 'is-current bg-indigo-600 text-white shadow-sm' : available ? 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300' : 'cursor-not-allowed bg-slate-900/60 text-slate-700'}`}
              >
                {presetNo}
                {activePreset === presetNo && <span className="maple-union-live-dot absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-slate-900 bg-green-500" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['聯盟階級', union?.union_grade || '尚無資料'],
          ['聯盟等級', `Lv.${(union?.union_level || 0).toLocaleString()}`],
          ['攻擊隊員', `${members.length} 名`],
          ['佔領格數', `${occupiedCells} 格`],
        ].map(([label, value]) => (
          <div key={label} className="maple-union-summary rounded-lg border border-slate-800 bg-[#0d1117]/70 px-3 py-2.5">
            <div className="text-[10px] text-slate-500">{label}</div>
            <div className="mt-1 truncate text-sm font-bold text-slate-200" title={value}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.35fr)]">
        <div className="min-w-0 space-y-5">
          <div className="maple-union-panel rounded-xl border border-slate-800 bg-slate-900/35 p-4">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-200"><Grid3X3 className="h-4 w-4 text-indigo-400" />聯盟棋盤</h4>
            <div className="maple-union-board-frame mx-auto max-w-[520px] overflow-visible rounded-lg border border-slate-800 bg-[#0d1117] p-3">
              {preset.union_block.length ? <UnionBoard blocks={preset.union_block} memberBonuses={memberBonuses} /> : <div className="py-20 text-center text-xs text-slate-500">此預設尚未配置棋盤</div>}
            </div>
          </div>
          <div className="maple-union-panel rounded-xl border border-slate-800 bg-slate-900/35 p-4">
            <StatList title="佔領加成" stats={preset.union_occupied_stat} columns />
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <div className="maple-union-panel rounded-xl border border-slate-800 bg-slate-900/35 p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-200">攻擊隊員</h4>
              <span className="rounded bg-slate-800 px-2 py-1 text-[10px] text-indigo-300">預設 {selectedPreset}</span>
            </div>
            {members.length ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                {members.map(({ member, bonus }, index) => {
                  const level = Number(member.block_level) || 0;
                  const name = getUnionBlockName(member);
                  const color = classColors[member.block_type] || classColors.hybrid;
                  return (
                    <div key={`${name}-${level}-${index}`} className="maple-union-member group relative flex min-w-0 items-center gap-2.5 rounded-lg border border-slate-800/80 bg-[#0d1117]/65 p-2 transition-colors hover:border-indigo-500/40 hover:bg-slate-900">
                      <div className={`h-11 w-11 shrink-0 overflow-hidden rounded-lg border ${color}`}>
                        <img src={getClassPortrait(member.block_class)} alt={name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-slate-200" title={name}>{name}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">Lv.{level}</div>
                      </div>
                      <span className="maple-union-rank shrink-0 rounded bg-yellow-900/60 px-1.5 py-0.5 text-[9px] font-bold text-yellow-300">{getRank(member)}</span>
                      <div className="maple-union-member-tooltip pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-50 w-max max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border px-3 py-2 text-left opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                        <div className="text-[11px] font-bold">{name} · Lv.{level}</div>
                        <div className="mt-1 text-[11px] leading-4">{bonus}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-slate-500">此預設尚無攻擊隊員</div>
            )}
            <p className="mt-4 border-t border-slate-800 pt-3 text-[10px] leading-4 text-slate-600">Nexon API 未提供攻擊隊員角色名稱；列表依官方回傳的職業與等級顯示。</p>
          </div>
        </div>
      </div>

      <div className="maple-union-panel mt-5 rounded-xl border border-slate-800 bg-slate-900/35 p-4">
        <StatList title="成員加成" stats={preset.union_raider_stat} wide />
      </div>
    </section>
  );
};

export default UnionRaiderSection;
