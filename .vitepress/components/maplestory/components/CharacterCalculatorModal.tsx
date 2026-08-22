import React from 'react';
import { createPortal } from 'react-dom';
import {
  Calculator,
  BookOpen,
  ChevronDown,
  Download,
  Gauge,
  Info,
  Layers3,
  PanelsTopLeft,
  RotateCcw,
  RefreshCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Sword,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { DashboardData } from '../types';
import FullMapleCombatEmbed from './FullMapleCombatEmbed';
import type { FullMapleCombatEmbedHandle, MapleCombatSectionResult } from './FullMapleCombatEmbed';
import {
  calculateProjection,
  CALCULATOR_FORMULA_META,
  createCalculatorProfile,
  EMPTY_ADJUSTMENT,
  type CalculatorAdjustment,
} from '../calculator/mapleCombatCalculator';

interface CharacterCalculatorModalProps {
  data: DashboardData;
  onClose: () => void;
}

type CalculatorTab =
  | 'character'
  | 'buffs'
  | 'weighted'
  | 'guide'
  | 'adjust'
  | 'equipment'
  | 'efficiency';

interface SavedScenario {
  id: string;
  name: string;
  adjustment: CalculatorAdjustment;
  projectedPower: number;
}

const formatPower = (value: number) => Math.round(value || 0).toLocaleString();
const formatSigned = (value: number) => `${value >= 0 ? '+' : ''}${Math.round(value).toLocaleString()}`;

const NumberInput = ({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) => (
  <label className="maple-calculator-input flex min-w-0 flex-col gap-2 rounded-lg border border-slate-700/70 bg-[#0d1117]/75 p-3 transition">
    <span className="text-xs font-semibold text-slate-400">{label}</span>
    <span className="maple-calculator-input-control flex min-w-0 items-center gap-2 rounded-md border border-slate-600/80 bg-[#080d14] px-2.5 py-2 transition">
      <input
        type="number"
        inputMode="decimal"
        aria-label={`${label}差值`}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-sm font-bold text-white outline-none"
      />
      {suffix && <span className="text-xs font-bold text-emerald-400">{suffix}</span>}
    </span>
  </label>
);

const ResultSummary = ({
  currentPower,
  projectedPower,
  difference,
  percentChange,
  actualPercentChange,
  projectedLabel = '模擬後戰力',
}: ReturnType<typeof calculateProjection> & { actualPercentChange?: number | null; projectedLabel?: string }) => {
  const positive = difference >= 0;
  return (
    <div className="maple-calculator-result grid grid-cols-2 gap-2 rounded-xl border border-emerald-400/25 bg-emerald-950/20 p-2.5 sm:grid-cols-4 sm:gap-3 sm:p-3">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-slate-500">目前官方戰力</div>
        <div className="mt-1 truncate font-mono text-xs font-bold text-slate-200 min-[420px]:text-sm sm:text-lg">{formatPower(currentPower)}</div>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-slate-500">{projectedLabel}</div>
        <div className="mt-1 truncate font-mono text-xs font-bold text-emerald-300 min-[420px]:text-sm sm:text-lg">{formatPower(projectedPower)}</div>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-slate-500">預估變化</div>
        <div className={`mt-1 truncate font-mono text-xs font-bold min-[420px]:text-sm sm:text-lg ${positive ? 'text-cyan-300' : 'text-rose-300'}`}>
          {formatSigned(difference)} <span className="text-[10px] sm:text-sm">({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(3)}%)</span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-slate-500">實際增幅</div>
        <div className="mt-1 truncate font-mono text-xs font-bold text-emerald-300 min-[420px]:text-sm sm:text-lg">
          {actualPercentChange === null || actualPercentChange === undefined
            ? '—'
            : `${actualPercentChange >= 0 ? '+' : ''}${actualPercentChange.toFixed(3)}%`}
        </div>
      </div>
    </div>
  );
};

const adjustmentKeys: Array<{
  key: keyof CalculatorAdjustment;
  label: (main: string, sub: string, second?: string, magic?: boolean) => string;
  suffix?: string;
}> = [
  { key: 'mainFlat', label: (main) => `${main} 固定值` },
  { key: 'mainPercent', label: (main) => `${main} 百分比`, suffix: '%' },
  { key: 'subFlat', label: (_, sub) => `${sub} 固定值` },
  { key: 'subPercent', label: (_, sub) => `${sub} 百分比`, suffix: '%' },
  { key: 'secondSubFlat', label: (_, __, second) => `${second || '第二副屬'} 固定值` },
  { key: 'secondSubPercent', label: (_, __, second) => `${second || '第二副屬'} 百分比`, suffix: '%' },
  { key: 'attackFlat', label: (_, __, ___, magic) => magic ? '魔法攻擊力' : '攻擊力' },
  { key: 'attackPercent', label: (_, __, ___, magic) => magic ? '魔法攻擊力 %' : '攻擊力 %', suffix: '%' },
  { key: 'damage', label: () => '傷害', suffix: '%' },
  { key: 'bossDamage', label: () => 'BOSS 傷害', suffix: '%' },
  { key: 'criticalDamage', label: () => '爆擊傷害', suffix: '%' },
  { key: 'familiarFinalDamage', label: () => '萌獸終傷加算差值', suffix: '%' },
  { key: 'finalDamage', label: () => '新增獨立終傷倍率', suffix: '%' },
];

const CharacterCalculatorModal: React.FC<CharacterCalculatorModalProps> = ({ data, onClose }) => {
  const fullCalculatorRef = React.useRef<FullMapleCombatEmbedHandle>(null);
  const dataMenuRef = React.useRef<HTMLDivElement>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const [fullCalculatorReady, setFullCalculatorReady] = React.useState(false);
  const [dataMenuOpen, setDataMenuOpen] = React.useState(false);
  const profile = React.useMemo(() => createCalculatorProfile(data), [data]);
  const draftKey = `maple_calculator_draft_${profile.characterName}`;
  const [tab, setTab] = React.useState<CalculatorTab>('character');
  const [adjustment, setAdjustment] = React.useState<CalculatorAdjustment>(() => {
    if (typeof window === 'undefined') return { ...EMPTY_ADJUSTMENT };
    try {
      return { ...EMPTY_ADJUSTMENT, ...JSON.parse(localStorage.getItem(draftKey) || '{}') };
    } catch {
      return { ...EMPTY_ADJUSTMENT };
    }
  });
  const [fullCalculatorDirty, setFullCalculatorDirty] = React.useState(false);
  const [fullResult, setFullResult] = React.useState<MapleCombatSectionResult | null>(null);
  const handleFullDirtyChange = React.useCallback((dirty: boolean) => setFullCalculatorDirty(dirty), []);
  const handleFullResultChange = React.useCallback((next: MapleCombatSectionResult) => setFullResult(next), []);
  const storageKey = `maple_calculator_scenarios_${profile.characterName}`;
  const [savedScenarios, setSavedScenarios] = React.useState<SavedScenario[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(adjustment));
  }, [adjustment, draftKey]);

  const requestClose = React.useCallback(() => {
    const hasQuickDraft = Object.values(adjustment).some((value) => Math.abs(Number(value) || 0) > 0);
    if (fullCalculatorDirty || hasQuickDraft) {
      const confirmed = window.confirm(
        '目前輸入已自動保存，下次打開會接著使用。確定要關閉戰力計算機嗎？',
      );
      if (!confirmed) return;
    }
    onClose();
  }, [adjustment, fullCalculatorDirty, onClose]);

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [requestClose]);

  React.useEffect(() => {
    if (!dataMenuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (!dataMenuRef.current?.contains(event.target as Node)) setDataMenuOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, [dataMenuOpen]);

  const handleExportBackup = async () => {
    setDataMenuOpen(false);
    try {
      await fullCalculatorRef.current?.exportBackup();
    } catch (error) {
      window.alert(`匯出失敗：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      await fullCalculatorRef.current?.importBackup(file);
      window.alert('備份資料已匯入。');
    } catch (error) {
      window.alert(`匯入失敗：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const result = React.useMemo(
    () => calculateProjection(profile, adjustment),
    [profile, adjustment],
  );

  const embeddedSection = tab === 'character'
    ? 'character'
    : tab === 'buffs'
      ? 'buffs'
      : tab === 'weighted'
        ? 'weighted'
        : tab === 'equipment'
          ? 'equipment'
          : tab === 'efficiency'
            ? 'efficiency'
            : null;

  const sectionLabels: Partial<Record<CalculatorTab, string>> = {
    character: '公式估算戰力',
    buffs: '套用 Buff 後戰力',
    weighted: '加權後戰力',
    equipment: '換裝後戰力',
    efficiency: '目前公式戰力',
  };

  const displayedResult = React.useMemo(() => {
    if (!embeddedSection || fullResult?.section !== embeddedSection || fullResult.baselinePower <= 0) {
      return { ...result, actualPercentChange: null };
    }
    const projectedPower = Math.max(
      0,
      Math.round(profile.currentCombatPower * (fullResult.projectedPower / fullResult.baselinePower)),
    );
    const difference = projectedPower - profile.currentCombatPower;
    return {
      currentPower: profile.currentCombatPower,
      projectedPower,
      difference,
      percentChange: profile.currentCombatPower > 0
        ? (difference / profile.currentCombatPower) * 100
        : 0,
      actualPercentChange: fullResult.actualPercentChange,
    };
  }, [embeddedSection, fullResult, profile.currentCombatPower, result]);

  const updateAdjustment = (key: keyof CalculatorAdjustment, value: number) => {
    setAdjustment((current) => ({ ...current, [key]: value }));
  };

  const saveScenario = () => {
    const next: SavedScenario = {
      id: `${Date.now()}`,
      name: `方案 ${savedScenarios.length + 1}`,
      adjustment: { ...adjustment },
      projectedPower: calculateProjection(profile, adjustment).projectedPower,
    };
    const updated = [next, ...savedScenarios].slice(0, 6);
    setSavedScenarios(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const removeScenario = (id: string) => {
    const updated = savedScenarios.filter((scenario) => scenario.id !== id);
    setSavedScenarios(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  return createPortal((
    <div
      className="maple-calculator-backdrop fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="maple-calculator-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="maple-calculator-panel flex max-h-[94vh] w-full max-w-[1240px] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#111722] shadow-2xl shadow-black/70">
        <div className="maple-calculator-sticky-head shrink-0 border-b border-slate-800 bg-[#111722]">
          <header className="maple-calculator-titlebar flex items-start justify-between gap-3 px-4 pb-2 pt-3 sm:gap-4 sm:px-6 sm:pt-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 rounded-xl bg-emerald-500/15 p-2.5 text-emerald-300"><Calculator className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h2 id="maple-calculator-title" className="truncate text-lg font-black text-white">角色戰力計算機</h2>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>{profile.characterName}・{profile.jobName}・已自動讀取目前裝備與面板資料</span>
                  <span
                    className="maple-calculator-version rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-300"
                    title={`已對照 ${CALCULATOR_FORMULA_META.source} ${CALCULATOR_FORMULA_META.sourceVersion}（上游更新 ${CALCULATOR_FORMULA_META.sourceUpdatedAt}，commit ${CALCULATOR_FORMULA_META.sourceCommit.slice(0, 7)}）`}
                  >
                    <span className="hidden sm:inline">公式核對 {CALCULATOR_FORMULA_META.verifiedAt.replace(/-/g, '/')}・v{CALCULATOR_FORMULA_META.sourceVersion}</span>
                    <span className="sm:hidden">公式 {CALCULATOR_FORMULA_META.verifiedAt.slice(5).replace('-', '/')}・v{CALCULATOR_FORMULA_META.sourceVersion}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => fullCalculatorRef.current?.clearAll()}
                disabled={!fullCalculatorReady}
                aria-label="清空計算機輸入"
                title="清空計算機輸入"
                className="maple-calculator-clear-input inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200 transition hover:border-rose-300/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">清空輸入</span>
              </button>
              <div ref={dataMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDataMenuOpen((open) => !open)}
                  disabled={!fullCalculatorReady}
                  aria-expanded={dataMenuOpen}
                  aria-haspopup="menu"
                  title="匯入或匯出計算機備份"
                  className="maple-calculator-data-menu-trigger inline-flex items-center gap-1.5 rounded-lg border border-slate-600/70 bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" /> <span className="hidden sm:inline">資料管理</span><ChevronDown className={`h-3.5 w-3.5 transition-transform ${dataMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {dataMenuOpen && (
                  <div role="menu" className="maple-calculator-data-menu absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-slate-700 bg-[#111722] p-1.5 shadow-2xl shadow-black/50">
                    <button type="button" role="menuitem" onClick={handleExportBackup} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-slate-200 transition hover:bg-emerald-500/15 hover:text-emerald-200">
                      <Download className="h-4 w-4" /> 匯出備份
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setDataMenuOpen(false); importInputRef.current?.click(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-slate-200 transition hover:bg-emerald-500/15 hover:text-emerald-200">
                      <Upload className="h-4 w-4" /> 匯入備份
                    </button>
                  </div>
                )}
                <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportBackup} />
              </div>
              <button
                type="button"
                onClick={() => fullCalculatorRef.current?.resetFromCharacter()}
                disabled={!fullCalculatorReady}
                aria-label="重新帶入角色資料"
                title="重新帶入角色資料"
                className="maple-calculator-reset-autofill inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">重新帶入角色資料</span>
              </button>
              <button type="button" onClick={requestClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white" aria-label="關閉計算機">
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="px-3 pb-3 sm:px-6 sm:pb-4">
          <ResultSummary
            {...displayedResult}
            projectedLabel={sectionLabels[tab] || '模擬後戰力'}
          />
          <div className="mt-2 flex gap-1 overflow-x-auto rounded-xl bg-[#0d1117] p-1">
            {([
              ['character', PanelsTopLeft, '角色資料'],
              ['buffs', Sparkles, 'Buff 與情境'],
              ['weighted', Layers3, '加權比較'],
              ['adjust', SlidersHorizontal, '數值模擬'],
              ['equipment', Sword, '裝備替換'],
              ['efficiency', Gauge, '效率與戒指'],
              ['guide', BookOpen, '使用教學'],
            ] as const).map(([key, Icon, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`maple-calculator-tab flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${tab === key ? 'is-active bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-950/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          </div>
        </div>

        <div className="maple-calculator-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">

          {!embeddedSection && <div className="maple-calculator-autofill mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-800 bg-[#0d1117]/65 px-4 py-3 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-emerald-300"><Sparkles className="h-3.5 w-3.5" /> 已自動帶入</span>
            <span className="text-slate-400">官方面板戰力、{profile.mainStat}/{profile.subStat}、{profile.usesMagic ? '魔攻' : '攻擊'}、裝備與潛能</span>
            <span className="text-slate-400">
              召喚中／啟用插槽萌獸終傷：{profile.familiarFinalDamageSources.length > 0
                ? `${profile.familiarFinalDamageSources.map((value) => `${value}%`).join(' + ')}（加總 ${profile.familiarFinalDamageEquivalent.toFixed(2)}%）`
                : '無終傷詞條'}
            </span>
          </div>}

          <div className={embeddedSection ? 'block' : 'hidden'}>
            <FullMapleCombatEmbed
              ref={fullCalculatorRef}
              data={data}
              section={embeddedSection || 'character'}
              onDirtyChange={handleFullDirtyChange}
              onResultChange={handleFullResultChange}
              onReadyChange={setFullCalculatorReady}
            />
          </div>

          {tab === 'guide' && (
            <section className="mt-5 space-y-4">
              <div className="maple-calculator-guide-hero rounded-xl border border-emerald-400/20 bg-emerald-950/20 p-4">
                <h3 className="flex items-center gap-2 font-black text-white"><BookOpen className="h-4 w-4 text-emerald-300" /> 先確認資料，再挑你要比較的功能</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  計算機開啟時會自動合併官方戰力、面板、裝備、潛能、新版靈魂武器屬性，以及召喚中或已啟用插槽的萌獸。API 無法判斷的當下 Buff 與實戰情境仍保留給你確認；所有輸入都會自動保存在這隻角色名下。
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  本教學依 MapleCombat 作者的使用說明整理，並調整為本站「查詢後自動帶入」的操作流程。
                  <a className="ml-1 font-bold text-emerald-300 transition hover:text-emerald-200 hover:underline" href="https://forum.gamer.com.tw/C.php?bsn=7650&snA=1037207" target="_blank" rel="noreferrer">查看巴哈完整原文</a>
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[
                  {
                    step: '1',
                    title: '角色資料',
                    body: '先核對自動帶入的面板、裝備與武器資料。初始公式會用官方戰力校準，因此兩者相等不代表 API 能看見所有狀態；仍要檢查技能／消耗、活動 Buff 與職業特殊項目。',
                  },
                  {
                    step: '2',
                    title: 'Buff 與情境',
                    body: '只勾實戰確定會使用的技能、藥水與傳授；數值若已含某個 Buff 就不要重複勾選。武公與規範不在一般預設內，可另存成爆發情境。',
                  },
                  {
                    step: '3',
                    title: '加權比較',
                    body: '最多保存 5 種實戰情境，可重新命名或複製。填入各情境輸出占比，把常駐、武公與規範等狀態合併；占比加總應為 100%。',
                  },
                  {
                    step: '4',
                    title: '數值模擬',
                    body: '只想快速試一條屬性時，在這裡填「相對目前的差值」。例如 BOSS 傷害 380% 變 410% 填 +30，拔掉 20% 就填 -20。',
                  },
                  {
                    step: '5',
                    title: '裝備替換',
                    body: '選擇身上的部位，再填新裝備的完整總屬性；舊裝備會自動扣除。戰力變化與實際增幅可能方向相反，請一起比較，並切換常駐或爆發情境確認。',
                  },
                  {
                    step: '6',
                    title: '效率與戒指',
                    body: '查看屬性換算、規範與永續戒指效益。攻擊力%會被武公、規範大幅稀釋，最好依實際情境做加權；規範平均效益要填測試週期內未開戒指的爆發占比。',
                  },
                ].map((item) => (
                  <div key={item.step} className="maple-calculator-guide-card rounded-xl border border-slate-800 bg-[#0d1117]/70 p-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-xs font-black text-emerald-300">{item.step}</span>
                    <h4 className="mt-3 text-sm font-black text-slate-200">{item.title}</h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{item.body}</p>
                  </div>
                ))}
              </div>

              <details className="maple-calculator-guide-details rounded-xl border border-cyan-400/20 bg-cyan-950/10 p-4">
                <summary className="cursor-pointer select-none text-base font-black text-white">作者特別提醒：戰力增幅不等於實際增傷</summary>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {[
                    ['含 Buff 戰力怎麼看', '共通 Buff 納入公式後，倍率常會明顯高於原始戰力，但那不是傷害直接乘上同樣倍率。倍率較低通常代表角色原有能力受到共通 Buff 的稀釋較大。'],
                    ['為什麼要做情境加權', '武公、規範與爆發 Buff 會改變攻擊力%等屬性的價值；只看單一常駐或全開狀態容易高估，因此應按實際輸出時間分配占比。原文以 5 分 40 秒、3 次爆發中未開規範的 20 秒輸出占比作為填寫範例。'],
                    ['換裝結果方向不同', '例如攻擊力%換成 BOSS 傷害時，可能出現官方戰力上升、實際效益反而下降。這不是計算錯誤，而是原始戰力對不同屬性的權重與實戰不同。'],
                  ].map(([title, body]) => (
                    <div key={title} className="rounded-lg border border-slate-800/80 bg-[#0d1117]/55 p-3">
                      <div className="text-sm font-bold text-cyan-300">{title}</div>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{body}</p>
                    </div>
                  ))}
                </div>
              </details>

              <details className="maple-calculator-guide-details rounded-xl border border-indigo-400/20 bg-indigo-950/10 p-4">
                <summary className="cursor-pointer select-none text-base font-black text-white">進階觀念：為什麼同戰力不一定同輸出？</summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {[
                    ['原始戰力的用途', '公式會排除部分技能與消耗來源，主要反映裝備與後天培養；它適合比較養成方案，但沒有完整涵蓋傳授、會技、無視、塔戒、六轉進度與玩家操作。'],
                    ['能力組成會造成稀釋', '相同戰力若 B／總傷、攻擊力%、爆傷、屬性與萌獸終傷的比例不同，套用同一組 Buff 後仍會有差距，不能只用原始戰力直接判定誰的實戰輸出較高。'],
                    ['作者觀察到的傾向', '原文整理的常見虛高傾向大致由 B／總傷、攻擊力%與爆傷開始，但排序會隨機體改變。最可靠的方式仍是在裝備替換中換成實際效益相近的數值測試。'],
                    ['跨職業比較要更保守', '惡復與傑諾的係數可能隨戰力區間變化；不同職業還有武器校正與海外職業例外。本站保留公式校正資訊，結果應視為方案估算，不是跨職業排行榜。'],
                  ].map(([title, body]) => (
                    <div key={title} className="rounded-lg border border-slate-800/80 bg-[#0d1117]/55 p-3">
                      <div className="text-sm font-bold text-indigo-300">{title}</div>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{body}</p>
                    </div>
                  ))}
                </div>
              </details>

              <div className="maple-calculator-guide-api rounded-xl border border-amber-400/20 bg-amber-950/10 p-4">
                <h4 className="text-base font-black text-white">哪些資料仍需要你手動確認？</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  Nexon API 能判斷的資料都會自動帶入；下面四類會隨遊戲內狀態改變，請以角色當下的面板與實際設定為準。
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    ['技能・消耗', '把面板中兩項合計填入；飛鏢、箭矢與彈丸不列入消耗數值。'],
                    ['活動與挑戰 Buff', '活動 Buff、挑戰者 Buff、結界與師徒數值會隨狀態改變，需要自行確認。'],
                    ['實戰資料', '先在遊戲內切到要比較的常駐或爆發狀態，再依面板填入對應情境。'],
                    ['萌獸與新版靈魂', '萌獸以召喚中／啟用插槽為準；新版靈魂武器屬性已合併到面板基準，不會再硬性要求舊制滿魂 Buff。'],
                  ].map(([title, body], index) => (
                    <div key={title} className="flex gap-3 rounded-lg border border-slate-800/80 bg-[#0d1117]/55 p-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-400/10 text-xs font-black text-amber-300">{index + 1}</span>
                      <div>
                        <div className="text-sm font-bold text-slate-200">{title}</div>
                        <p className="mt-1 text-sm leading-relaxed text-slate-400">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <details className="maple-calculator-guide-details rounded-xl border border-amber-400/20 bg-amber-950/10 p-4">
                <summary className="cursor-pointer select-none text-base font-black text-white">容易漏掉的面板與職業例外</summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  下列是作者文章列出的常見誤差來源。本站能從 API 明確判斷時會自動處理；公式仍對不上官方戰力時，再依遊戲面板逐項核對。
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {[
                    ['技能／消耗', '兩欄都填面板明細中的合計值；飛鏢、箭矢與彈丸雖出現在消耗明細，但不用併入要扣除的消耗數值。'],
                    ['阿戴爾「貴族」', '組隊人數增加的傷害可能不會出現在技能傷害明細；使用這項傳授或角色本身是阿戴爾時，需把額外傷害補進技能／消耗傷害。單人時為額外 2%，初始 BOSS 傷害不必重複補。'],
                    ['萌獸純攻擊力', '純攻擊力應視為「% 未套用攻擊力」。若面板把它放進基本數值，需從基本數值扣除，再把同額數值移到未套用欄。'],
                    ['投入屬性型內潛', '「依投入某屬性的比例增加另一屬性」屬於 % 未套用數值；若面板歸在基本數值，也要移到對應的未套用欄。'],
                    ['神之子武器', '依當下持有的琉或璃填攻擊；武器基礎 B／總傷只填白字加星火，不含潛能，而且只需填一把武器。'],
                    ['惡復與傑諾', '惡復基本 HP 指 AP 血量；星力轉換欄要填被動實際增加的 HP／屬性，不是星力顆數。傑諾通常會是裝備星力換算後的三屬增量。'],
                    ['惡復內襯 HP', '若內襯 HP 沒被面板裝備明細納入，需將每件內襯 HP 除以 2 後無條件捨去，再逐件補回。'],
                    ['萌獸終傷微小誤差', '多條終傷會按來源逐條累加；總和輸入仍有極小差距時，打開齒輪改成逐條輸入來源。'],
                  ].map(([title, body]) => (
                    <div key={title} className="rounded-lg border border-slate-800/80 bg-[#0d1117]/55 p-3">
                      <div className="text-sm font-bold text-amber-300">{title}</div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">{body}</p>
                    </div>
                  ))}
                </div>
              </details>

              <div className="maple-calculator-guide-examples rounded-xl border border-slate-800 bg-[#0d1117]/65 p-4">
                <h4 className="text-sm font-black text-white">填寫與保存規則</h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-800/80 p-3">
                    <div className="text-xs font-bold text-cyan-300">只補 API 無法判斷的狀態</div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                      API 能讀的內容已經帶入；只需要補當下技能、消耗、活動 Buff 與實戰情境。若數值明顯超出合理範圍，計算機會顯示防呆提醒。
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800/80 p-3">
                    <div className="text-xs font-bold text-cyan-300">差值與總值不要混用</div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                      「數值模擬」填增加或減少的差值；「裝備替換」則填新裝備完整總值，系統會自行計算新舊差異。
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800/80 p-3">
                    <div className="text-xs font-bold text-cyan-300">萌獸與獨立終傷分開</div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                      萌獸各條終傷依 MapleCombat 的加算規則處理；技能或裝備提供的獨立終傷則依乘算處理，請填在對應欄位。
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800/80 p-3">
                    <div className="text-xs font-bold text-cyan-300">自動保存與匯入</div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                      關閉前會提醒，但輸入內容早已自動保存在瀏覽器。再次開啟同一角色會接續上次進度，也能從右上角「資料管理」匯出或匯入備份。
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800/80 p-3 sm:col-span-2">
                    <div className="text-xs font-bold text-cyan-300">巴哈原文與目前版本的差異</div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                      原文的無魂／滿魂操作屬於先前靈魂寶珠流程；官方系統改版後，本站會讀取新版靈魂武器屬性，不再要求為了使用計算機硬性切成舊制滿魂狀態。
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => setTab('character')} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500">
                  先檢查角色資料
                </button>
              </div>
            </section>
          )}

          {tab === 'adjust' && (
            <section className="mt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white">想增加或減少什麼？</h3>
                  <p className="mt-1 text-xs text-slate-500">輸入相對目前角色的差值；基準數值都已由查詢結果帶入。</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAdjustment({ ...EMPTY_ADJUSTMENT })} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-slate-500 hover:text-white">
                    <RotateCcw className="h-3.5 w-3.5" /> 清除
                  </button>
                  <button type="button" onClick={saveScenario} className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-400">
                    <Save className="h-3.5 w-3.5" /> 儲存方案
                  </button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {adjustmentKeys
                  .filter((field) => !field.key.startsWith('secondSub') || profile.secondSubStat)
                  .map((field) => (
                    <NumberInput
                      key={field.key}
                      label={field.label(profile.mainStat, profile.subStat, profile.secondSubStat, profile.usesMagic)}
                      value={adjustment[field.key]}
                      suffix={field.suffix}
                      onChange={(value) => updateAdjustment(field.key, value)}
                    />
                  ))}
              </div>

              {savedScenarios.length > 0 && (
                <div className="mt-5">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">已儲存的比較方案</h4>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {savedScenarios.map((scenario) => (
                      <div key={scenario.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0d1117]/65 p-3">
                        <button type="button" onClick={() => setAdjustment({ ...scenario.adjustment })} className="min-w-0 flex-1 text-left">
                          <div className="truncate text-xs font-bold text-slate-300">{scenario.name}</div>
                          <div className="mt-1 font-mono text-sm font-bold text-emerald-300">{formatPower(scenario.projectedPower)}</div>
                        </button>
                        <button type="button" onClick={() => removeScenario(scenario.id)} className="rounded p-1.5 text-slate-600 hover:bg-rose-950/40 hover:text-rose-300" aria-label={`刪除${scenario.name}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          <div className="maple-calculator-note mt-5 flex gap-2 rounded-xl border border-indigo-400/20 bg-indigo-950/20 p-3 text-xs leading-relaxed text-slate-400">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
            <p>
              初始戰力以 Nexon Open API 的官方面板值校準；裝備、潛能、角色屬性，以及召喚中或啟用插槽萌獸的終傷詞條都會自動讀取。活動 Buff、技能施放狀態等 API 無法可靠判斷的內容，請用「數值模擬」補上。結果適合比較方案，不代表實際打王秒數。
              <a className="ml-1 font-semibold text-indigo-300 hover:text-indigo-200 hover:underline" href="https://github.com/centre173/MapleCombat" target="_blank" rel="noreferrer">公式參考 MapleCombat</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  ), document.body);
};

export default CharacterCalculatorModal;
