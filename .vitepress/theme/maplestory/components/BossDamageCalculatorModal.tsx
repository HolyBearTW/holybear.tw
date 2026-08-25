import React from 'react';
import { createPortal } from 'react-dom';
import { Calculator, Plus, RefreshCcw, Save, Trash2, Users, X } from 'lucide-react';
import {
  BOSS_HEALTH_DATA,
  BOSS_NAMES,
  BossDifficulty,
  bossDamageStorageRoot,
  calculateBossDamage,
  createBossPlayerContext,
  formatBossHp,
  formatBossNumber,
  formatBossTime,
  getEligibleBosses,
  getBossCombatMultiplier,
} from '../calculator/bossDamageCalculator';
import type { DashboardData } from '../types';

interface BossDamageCalculatorModalProps {
  data: DashboardData;
  onClose: () => void;
}

interface TimeValue { min: string; sec: string }

interface StoredBossCalculator {
  bossName: string;
  difficulty: BossDifficulty;
  total: TimeValue;
  remaining: TimeValue;
  normalLimit: TimeValue;
  blackMageMinutes: string;
  selfAuto: boolean;
  selfDamage: string;
  teammates: string[];
  measurementConfirmed: boolean;
  savedAt?: number;
}

const DEFAULT_TOTAL = { min: '30', sec: '00' };
const DEFAULT_REMAINING = { min: '', sec: '' };
const DEFAULT_NORMAL_LIMIT = { min: '30', sec: '00' };
const DEFAULT_BOSS_NAME = '尤比太';
const DEFAULT_DIFFICULTY: BossDifficulty = '普通';

const DIFFICULTY_STYLE: Record<string, string> = {
  簡單: 'border-white/30 bg-gradient-to-b from-[#b3b3b3] to-[#5f5f5f] text-white',
  一般: 'border-cyan-100/40 bg-gradient-to-b from-[#44d7ee] to-[#1c93b0] text-white',
  普通: 'border-cyan-100/40 bg-gradient-to-b from-[#44d7ee] to-[#1c93b0] text-white',
  困難: 'border-rose-200/45 bg-gradient-to-b from-[#e73556] to-[#a91334] text-white',
  混沌: 'border-amber-100/30 bg-gradient-to-b from-[#7d6e61] to-[#41352c] text-[#ffe7bf]',
  極限: 'border-rose-500/60 bg-gradient-to-b from-[#181818] to-[#030303] text-[#ff405c] shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_0_8px_rgba(255,35,65,.18)]',
};

const DIFFICULTY_TEXT_STYLE: React.CSSProperties = {
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
  fontWeight: 1000,
  textShadow: '0 1px 1px rgba(0, 0, 0, .72)',
  WebkitTextStroke: '0.18px currentColor',
};

function difficultyTextTone(difficulty: BossDifficulty): string {
  if (difficulty === '混沌') return 'maple-boss-difficulty-text-chaos';
  if (difficulty === '極限') return 'maple-boss-difficulty-text-extreme';
  return 'maple-boss-difficulty-text-light';
}

function combatMultiplierText(combat: ReturnType<typeof getBossCombatMultiplier>): string {
  const level = `等級 ${formatBossNumber(combat.levelMultiplier * 100)}%`;
  if (!combat.forceType) return `${level} × 無 ARC／AUT = ${formatBossNumber(combat.combinedMultiplier * 100)}%`;
  if (!combat.forceRequirementKnown) return `${level} × ${combat.forceType.toUpperCase()} 需求未公開`;
  return `${level} × ${combat.forceType.toUpperCase()} ${formatBossNumber(combat.forceMultiplier * 100)}% = ${formatBossNumber(combat.combinedMultiplier * 100)}%`;
}

const FIELD_CLASS = 'maple-boss-calculator-field h-11 w-full rounded-lg border border-slate-700 bg-[#0a0e17] px-3 text-sm font-bold text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10';

function secondsOf(value: TimeValue): number {
  const min = Math.max(0, Number.parseInt(value.min || '0', 10) || 0);
  const sec = Math.min(59, Math.max(0, Number.parseInt(value.sec || '0', 10) || 0));
  return min * 60 + sec;
}

function normalizeTime(value: TimeValue): TimeValue {
  return {
    min: String(Math.max(0, Number.parseInt(value.min || '0', 10) || 0)),
    sec: String(Math.min(59, Math.max(0, Number.parseInt(value.sec || '0', 10) || 0))).padStart(2, '0'),
  };
}

function cleanDigits(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

function TimeInput({ value, onChange, label }: { value: TimeValue; onChange: (value: TimeValue) => void; label: string }) {
  return (
    <div className="flex items-center gap-2" aria-label={label}>
      <input
        className={`${FIELD_CLASS} min-w-0 flex-1 px-2 text-center font-mono`}
        value={value.min}
        onChange={(event) => onChange({ ...value, min: cleanDigits(event.target.value, 3) })}
        onBlur={() => onChange(normalizeTime(value))}
        inputMode="numeric"
        placeholder="分"
        aria-label={`${label}分鐘`}
      />
      <span className="text-xl font-black text-slate-300">:</span>
      <input
        className={`${FIELD_CLASS} min-w-0 flex-1 px-2 text-center font-mono`}
        value={value.sec}
        onChange={(event) => {
          const cleaned = cleanDigits(event.target.value, 2);
          onChange({ ...value, sec: cleaned === '' ? '' : String(Math.min(59, Number(cleaned))) });
        }}
        onBlur={() => onChange(normalizeTime(value))}
        inputMode="numeric"
        placeholder="秒"
        aria-label={`${label}秒數`}
      />
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: BossDifficulty }) {
  return (
    <span style={DIFFICULTY_TEXT_STYLE} className={`maple-boss-difficulty-label ${difficultyTextTone(difficulty)} inline-flex min-w-[72px] items-center justify-center rounded-full border px-3 py-1 text-[11px] leading-none ${DIFFICULTY_STYLE[difficulty] || DIFFICULTY_STYLE.普通}`}>
      {difficulty}
    </span>
  );
}

function StatCard({ label, value, unit, tone = 'text-white', children }: { label: string; value: string; unit: string; tone?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0d1117]/80 p-3.5">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className={`mt-1.5 break-words font-mono text-xl font-black sm:text-2xl ${tone}`}>{value}</div>
      <div className="mt-1 text-[11px] text-slate-500">{unit}</div>
      {children}
    </div>
  );
}

const BossDamageCalculatorModal: React.FC<BossDamageCalculatorModalProps> = ({ data, onClose }) => {
  const characterName = data.basic.character_name || '';
  const [bossName, setBossName] = React.useState(DEFAULT_BOSS_NAME);
  const [difficulty, setDifficulty] = React.useState<BossDifficulty>(DEFAULT_DIFFICULTY);
  const [total, setTotal] = React.useState<TimeValue>(DEFAULT_TOTAL);
  const [remaining, setRemaining] = React.useState<TimeValue>(DEFAULT_REMAINING);
  const [normalLimit, setNormalLimit] = React.useState<TimeValue>(DEFAULT_NORMAL_LIMIT);
  const [blackMageMinutes, setBlackMageMinutes] = React.useState('60');
  const [selfAuto, setSelfAuto] = React.useState(true);
  const [selfDamage, setSelfDamage] = React.useState('');
  const [teammates, setTeammates] = React.useState<string[]>([]);
  const [measurementConfirmed, setMeasurementConfirmed] = React.useState(false);
  const [slot, setSlot] = React.useState(1);
  const [saveNotice, setSaveNotice] = React.useState('');
  const [hydrated, setHydrated] = React.useState(false);

  const storageRoot = React.useMemo(() => bossDamageStorageRoot(characterName), [characterName]);
  const difficulties = React.useMemo(
    () => BOSS_HEALTH_DATA.filter((row) => row.name === bossName).map((row) => row.difficulty),
    [bossName],
  );
  const row = React.useMemo(
    () => BOSS_HEALTH_DATA.find((item) => item.name === bossName && item.difficulty === difficulty) || BOSS_HEALTH_DATA[0],
    [bossName, difficulty],
  );
  const player = React.useMemo(() => createBossPlayerContext(data), [data]);
  const sourceCombat = React.useMemo(() => getBossCombatMultiplier(row, player), [player, row]);
  const totalSeconds = secondsOf(total);
  const remainingSeconds = secondsOf(remaining);
  const hasCompleteMeasuredTime = total.min !== '' && total.sec !== '' && remaining.min !== '' && remaining.sec !== '';
  const normalLimitSeconds = secondsOf(normalLimit) || 1800;
  const blackMageLimitSeconds = Math.max(1, Number.parseInt(blackMageMinutes || '60', 10) || 60) * 60;
  const result = hasCompleteMeasuredTime ? calculateBossDamage(row, totalSeconds, remainingSeconds) : null;
  const automaticDamage = result?.projectedDamageTrillion || 0;
  const personalDamage = selfAuto ? automaticDamage : Math.max(0, Number(selfDamage) || 0);
  const teamDamage = personalDamage + teammates.reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  const eligibleBosses = getEligibleBosses(teamDamage, totalSeconds, normalLimitSeconds, blackMageLimitSeconds, row, player);

  const payload = React.useCallback((): StoredBossCalculator => ({
    bossName, difficulty, total, remaining, normalLimit, blackMageMinutes,
    selfAuto, selfDamage, teammates, measurementConfirmed, savedAt: Date.now(),
  }), [bossName, difficulty, total, remaining, normalLimit, blackMageMinutes, selfAuto, selfDamage, teammates, measurementConfirmed]);

  const applyStored = React.useCallback((stored: Partial<StoredBossCalculator>) => {
    const confirmedMeasurement = stored.measurementConfirmed === true;
    if (confirmedMeasurement && stored.bossName && BOSS_NAMES.includes(stored.bossName)) {
      setBossName(stored.bossName);
      const validDifficulties = BOSS_HEALTH_DATA.filter((item) => item.name === stored.bossName).map((item) => item.difficulty);
      setDifficulty(validDifficulties.includes(stored.difficulty as BossDifficulty) ? stored.difficulty as BossDifficulty : validDifficulties[0]);
    } else {
      setBossName(DEFAULT_BOSS_NAME);
      setDifficulty(DEFAULT_DIFFICULTY);
    }
    if (confirmedMeasurement && stored.total) setTotal(normalizeTime(stored.total));
    else setTotal(DEFAULT_TOTAL);
    if (confirmedMeasurement && stored.remaining) setRemaining(normalizeTime(stored.remaining));
    else setRemaining(DEFAULT_REMAINING);
    if (stored.normalLimit) setNormalLimit(normalizeTime(stored.normalLimit));
    if (stored.blackMageMinutes) setBlackMageMinutes(cleanDigits(stored.blackMageMinutes, 3) || '60');
    setSelfAuto(stored.selfAuto !== false);
    setSelfDamage(String(stored.selfDamage || ''));
    setTeammates(Array.isArray(stored.teammates) ? stored.teammates.slice(0, 5).map(String) : []);
    setMeasurementConfirmed(confirmedMeasurement);
  }, []);

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    try {
      const raw = localStorage.getItem(`${storageRoot}_auto`);
      if (raw) applyStored(JSON.parse(raw));
    } catch { /* 保留預設值 */ }
    setHydrated(true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [applyStored, onClose, storageRoot]);

  React.useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(`${storageRoot}_auto`, JSON.stringify(payload())); } catch { /* 儲存空間不可用時仍可計算 */ }
  }, [hydrated, payload, storageRoot]);

  const changeBoss = (nextBoss: string) => {
    setBossName(nextBoss);
    const available = BOSS_HEALTH_DATA.filter((item) => item.name === nextBoss).map((item) => item.difficulty);
    setDifficulty(available.includes(difficulty) ? difficulty : available[0] || '普通');
  };

  const saveSlot = () => {
    if (!result) {
      setSaveNotice('請先填完有效的一場總時間與結束時剩餘時間');
      return;
    }
    try {
      localStorage.setItem(`${storageRoot}_slot_${slot}`, JSON.stringify({ ...payload(), measurementConfirmed: true }));
      setMeasurementConfirmed(true);
      setSaveNotice(`已儲存到存檔 ${slot}`);
    } catch { setSaveNotice('儲存失敗'); }
  };

  const loadSlot = () => {
    try {
      const raw = localStorage.getItem(`${storageRoot}_slot_${slot}`);
      if (!raw) { setSaveNotice(`存檔 ${slot} 是空白的`); return; }
      applyStored(JSON.parse(raw));
      setSaveNotice(`已載入存檔 ${slot}`);
    } catch { setSaveNotice('載入失敗'); }
  };

  const reset = () => {
    setBossName(DEFAULT_BOSS_NAME); setDifficulty(DEFAULT_DIFFICULTY);
    setTotal(DEFAULT_TOTAL); setRemaining(DEFAULT_REMAINING); setNormalLimit(DEFAULT_NORMAL_LIMIT);
    setBlackMageMinutes('60'); setSelfAuto(true); setSelfDamage(''); setTeammates([]);
    setMeasurementConfirmed(false);
    setSaveNotice('已重置目前計算；存檔不受影響');
  };

  const editBlackMageLimit = () => {
    const currentMinutes = Math.max(1, Number.parseInt(blackMageMinutes || '60', 10) || 60);
    const raw = window.prompt('黑魔法師時限（可輸入分鐘，例如 60、20；或 20:00）', String(currentMinutes));
    if (raw === null) return;
    const normalized = raw.trim().replace(/：/g, ':');
    let minutes = Number.NaN;
    if (/^\d+(?:\.\d+)?$/.test(normalized)) {
      minutes = Math.floor(Number(normalized));
    } else if (/^\d+:\d{1,2}$/.test(normalized)) {
      const [min, sec] = normalized.split(':').map(Number);
      if (sec < 60) minutes = Math.max(1, Math.round((min * 60 + sec) / 60));
    }
    if (!Number.isFinite(minutes) || minutes <= 0) {
      window.alert('請輸入有效時間，例如 60、20 或 20:00');
      return;
    }
    setBlackMageMinutes(String(minutes));
  };

  return createPortal((
    <div
      className="maple-calculator-backdrop fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="boss-damage-calculator-title"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="maple-calculator-panel maple-boss-calculator-panel flex max-h-[94vh] w-full max-w-[1240px] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#111722] shadow-2xl shadow-black/70">
        <header className="maple-calculator-titlebar flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 bg-[#111722] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 rounded-xl bg-rose-500/15 p-2.5 text-rose-300"><Calculator className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h2 id="boss-damage-calculator-title" className="truncate text-lg font-black text-white">BOSS 傷害計算機</h2>
              <p className="mt-0.5 text-xs text-slate-400">{characterName ? `${characterName}・` : ''}依實際擊殺時間反推平均輸出，估算目前能擊破的 BOSS</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="maple-boss-calculator-close rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white" aria-label="關閉 BOSS 傷害計算機"><X className="h-5 w-5" /></button>
        </header>

        <div className="maple-calculator-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">BOSS</span><select className={FIELD_CLASS} value={bossName} onChange={(event) => changeBoss(event.target.value)}>{BOSS_NAMES.map((name) => <option key={name}>{name}</option>)}</select></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">難度</span><select style={DIFFICULTY_TEXT_STYLE} className={`${FIELD_CLASS} maple-boss-difficulty-select ${difficultyTextTone(difficulty)} ${DIFFICULTY_STYLE[difficulty]}`} value={difficulty} onChange={(event) => setDifficulty(event.target.value as BossDifficulty)}>{difficulties.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">一場總時間</span><TimeInput value={total} onChange={(value) => { setTotal(value); setMeasurementConfirmed(true); }} label="一場總時間" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">結束時剩餘時間</span><TimeInput value={remaining} onChange={(value) => { setRemaining(value); setMeasurementConfirmed(true); }} label="結束時剩餘時間" /></label>
          </section>

          {!hasCompleteMeasuredTime ? (
            <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-950/15 px-3 py-2 text-xs font-bold text-cyan-200">請填寫實際通關後顯示的剩餘分鐘與秒數，完成後才會開始計算。</div>
          ) : !result ? (
            <div role="alert" className="mt-3 rounded-lg border border-rose-400/25 bg-rose-950/20 px-3 py-2 text-xs font-bold text-rose-200">剩餘時間必須小於一場總時間，且時間不可為負數。</div>
          ) : null}

          <section className="mt-3 rounded-xl border border-slate-800 bg-[#0d1117]/65 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm font-black text-white"><span>{row.name}</span><DifficultyBadge difficulty={row.difficulty} /><span className="text-slate-300">總血量 {formatBossHp(row.hpTrillion)}</span></div>
            <div className="mt-1.5 text-xs text-slate-500">血量計算：{row.formula}</div>
            {row.crystalRewardHundredMillion !== undefined && <div className="mt-1 text-xs text-slate-500">結晶獎勵：{formatBossNumber(row.crystalRewardHundredMillion)} 億</div>}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-cyan-300">
              <span>API：Lv.{player.level}・ARC {formatBossNumber(player.arc)}・AUT {formatBossNumber(player.aut)}</span>
              <span>來源倍率：{combatMultiplierText(sourceCombat)}</span>
            </div>
          </section>

          <section className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-[#0d1117]/65 p-3 text-xs">
            <span className="font-black text-slate-300">數據存檔</span>
            <select className="h-9 min-w-36 flex-1 rounded-lg border border-slate-700 bg-[#0a0e17] px-3 font-bold text-slate-200 sm:flex-none" value={slot} onChange={(event) => { setSlot(Number(event.target.value)); setSaveNotice(''); }}>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>存檔 {index + 1}</option>)}</select>
            <button type="button" onClick={saveSlot} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 font-bold text-emerald-200"><Save className="h-3.5 w-3.5" />儲存</button>
            <button type="button" onClick={loadSlot} className="h-9 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 font-bold text-cyan-200">載入</button>
            <button type="button" onClick={reset} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 font-bold text-amber-200"><RefreshCcw className="h-3.5 w-3.5" />重置</button>
            {saveNotice && <span role="status" className="basis-full text-[11px] font-bold text-slate-400">{saveNotice}</span>}
          </section>

          <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="實際戰鬥時間" value={result ? formatBossTime(result.elapsedSeconds) : '—'} unit="總時間 − 剩餘時間" />
            <StatCard label="每秒平均傷害" value={result ? formatBossNumber(result.dpsTrillion) : '—'} unit="兆 / 秒" tone="text-emerald-300" />
            <StatCard label="每分鐘平均傷害" value={result ? formatBossNumber(result.dpmTrillion) : '—'} unit="兆 / 分鐘" tone="text-emerald-300" />
            <StatCard label={`${totalSeconds % 60 === 0 ? `${totalSeconds / 60} 分鐘` : formatBossTime(totalSeconds)}傷害量`} value={result ? formatBossNumber(teamDamage) : '—'} unit={teammates.length ? `兆（隊伍 ${teammates.length + 1} 人合計）` : '兆（個人）'} tone="text-amber-300">
              <button type="button" disabled={teammates.length >= 5} onClick={() => setTeammates((current) => [...current, ''])} className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-2 text-[11px] font-black text-amber-200 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-3.5 w-3.5" />{teammates.length >= 5 ? '隊伍已滿（6人）' : '增加隊友傷害量'}</button>
            </StatCard>
          </section>

          {teammates.length > 0 && (
            <section className="mt-3 rounded-xl border border-amber-400/20 bg-amber-950/10 p-3.5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 font-black text-white"><Users className="h-4 w-4 text-amber-300" />隊伍傷害量 <span className="text-[11px] font-bold text-slate-500">自己＋最多 5 位隊友</span></div><span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">總計 {formatBossNumber(teamDamage)} 兆</span></div>
              <div className="space-y-2">
                <div className="grid grid-cols-[58px_minmax(0,1fr)_30px_auto] items-center gap-2"><span className="text-xs font-black text-slate-300">自己</span><input className={FIELD_CLASS} type="number" min="0" value={selfAuto ? (result ? String(Number(automaticDamage.toFixed(6))) : '') : selfDamage} onChange={(event) => { setSelfAuto(false); setSelfDamage(event.target.value); }} /><span className="text-xs font-bold text-slate-500">兆</span><button type="button" onClick={() => setSelfAuto(true)} className="h-9 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-2 text-[10px] font-black text-cyan-200">帶入計算值</button></div>
                {teammates.map((value, index) => (
                  <div key={index} className="grid grid-cols-[58px_minmax(0,1fr)_30px_auto] items-center gap-2"><span className="text-xs font-black text-slate-300">隊友 {index + 1}</span><input className={FIELD_CLASS} type="number" min="0" placeholder="輸入傷害量" value={value} onChange={(event) => setTeammates((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /><span className="text-xs font-bold text-slate-500">兆</span><button type="button" onClick={() => setTeammates((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex h-9 items-center gap-1 rounded-lg border border-rose-400/25 bg-rose-500/10 px-2 text-[10px] font-black text-rose-200"><Trash2 className="h-3 w-3" />移除</button></div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-5">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
              <div><div className="font-black text-white">依目前輸出可擊破的 BOSS <span className="ml-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300">{eligibleBosses.length} 個</span></div><div className="mt-1 text-[11px] text-slate-500">先扣除來源 BOSS 已含的等級／力量倍率，再依 API 數值套用各目標 BOSS 倍率與時限。</div></div>
              <div className="flex flex-wrap items-end gap-3">
                <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-500">一般 BOSS 時限</span><div className="w-36"><TimeInput value={normalLimit} onChange={setNormalLimit} label="一般 BOSS 時限" /></div></label>
              </div>
            </div>
            <div className="max-h-[460px] overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[850px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#161d29] text-[11px] text-slate-500"><tr><th className="p-3">BOSS</th><th className="p-3">難度</th><th className="p-3 text-right">總血量</th><th className="p-3 text-right">API 增傷修正</th><th className="p-3 text-right">預估所需時間</th><th className="p-3 text-right">時限輸出餘裕</th></tr></thead>
                <tbody>{eligibleBosses.map((item) => (
                  <tr key={`${item.name}-${item.difficulty}`} className="border-t border-slate-800/80 text-slate-300 transition hover:bg-slate-800/35"><td className="p-3 font-bold text-white">{item.name}</td><td className="p-3"><DifficultyBadge difficulty={item.difficulty} /></td><td className={`p-3 text-right font-mono ${item.hpTrillion / item.capacityTrillion > 0.8 ? 'font-bold text-amber-300' : ''}`}>{formatBossHp(item.hpTrillion)}</td><td className="p-3 text-right font-mono"><span className={item.adjustmentRatio >= 1 ? 'text-emerald-300' : 'text-amber-300'}>×{formatBossNumber(item.adjustmentRatio)}</span><div className="mt-1 text-[10px] text-slate-500">{item.combat.requirementKnown ? `Lv.${item.combat.bossLevel}・${combatMultiplierText(item.combat)}` : combatMultiplierText(item.combat)}</div></td><td className="p-3 text-right font-mono">{formatBossTime(item.estimatedSeconds)}{item.name === '黑魔法師' && <><span className="ml-1 text-[10px] text-slate-500">/ 時限 {formatBossTime(item.timeLimitSeconds)}</span><button type="button" onClick={editBlackMageLimit} className="ml-1.5 inline-flex h-[22px] items-center rounded-md border border-amber-400/35 bg-amber-500/10 px-2 text-[10px] font-black text-amber-200 transition hover:border-amber-300/60 hover:bg-amber-500/20">更改</button></>}</td><td className="p-3 text-right font-mono font-black text-emerald-300">+{formatBossNumber(item.marginPercent)}%</td></tr>
                ))}</tbody>
              </table>
              {eligibleBosses.length === 0 && <div className="px-4 py-10 text-center text-sm text-slate-500">輸入有效擊殺時間後，這裡會列出可擊破的 BOSS。</div>}
            </div>
          </section>

          <div className="mt-4 rounded-xl border border-indigo-400/20 bg-indigo-950/20 p-3 text-xs leading-relaxed text-slate-400">
            血量會把同一難度列出的所有階段全部相加；需要 ARC／AUT 的 BOSS 會依目前角色 API 自動修正，多階段採最高力量需求。沒有 ARC／AUT 場地需求的 BOSS 不額外套用力量倍率。隊伍模式只能以目前查詢角色的倍率近似全隊；實際通關仍會受到防禦率、機制、無敵時間、死亡與輸出空窗影響。
            <a href="https://script.google.com/macros/s/AKfycbxohYZ7oByYB6K7ffQj_GMgidn8c10DvTxATeuSeFiBlX3ogtkmM02IFfm0e2jvH-Uf/exec" target="_blank" rel="noreferrer" className="ml-1 font-semibold text-indigo-300 hover:text-indigo-200 hover:underline">公式與血量資料來源</a>
          </div>
        </div>
      </div>
    </div>
  ), document.body);
};

export default BossDamageCalculatorModal;
