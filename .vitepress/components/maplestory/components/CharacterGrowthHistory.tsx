import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, RefreshCw, TrendingUp } from 'lucide-react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardData } from '../types';
import {
  fetchMaplerHouseCharacterHistory,
  fetchMaplerHouseHistoryStatus,
  MaplerHouseCharacterHistory,
  MaplerHouseHistoryDay,
  MaplerHouseHistoryEvent,
} from '../services/maplerhouseService';
import { fetchWeeklyHistory } from '../services/nexonService';

interface CharacterGrowthHistoryProps {
  data: DashboardData;
  apiKey: string;
}

type TrendRange = 7 | 30 | 90;

const DAY_MS = 24 * 60 * 60 * 1000;
const HEAT_COLORS = [
  'is-heat-0 bg-slate-800/60',
  'is-heat-1 bg-emerald-950',
  'is-heat-2 bg-emerald-800',
  'is-heat-3 bg-emerald-600',
  'is-heat-4 bg-emerald-400',
];

const parseDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00Z`);
const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);
const getTaiwanDateKey = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const compactNumber = (value: string | number) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return new Intl.NumberFormat('zh-TW', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number.isFinite(parsed) ? parsed : 0);
};

const eventLabels: Record<string, string> = {
  level: '角色升級',
  name: '角色改名',
  class: '職業變更',
  world: '世界變更',
  guild: '公會變更',
  liberation: '解放狀態變更',
  dojang: '武陵紀錄變更',
};

const formatEventValue = (event: MaplerHouseHistoryEvent, value: string) => {
  if (!value) return '無';
  if (event.type !== 'liberation') return value;
  return ({ '0': '未解放', '1': '解放進行中', '2': '已解放' } as Record<string, string>)[value] || value;
};

const GrowthTooltip = ({ active, payload }: any) => {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="maple-growth-tooltip rounded-lg border border-slate-700 bg-[#11151b] px-3 py-2 text-xs shadow-xl">
      <div className="font-semibold text-slate-200">{point.date}</div>
      <div className="mt-1 text-emerald-400">Lv.{point.level} · {point.expRate}%</div>
      <div className="mt-0.5 text-slate-400">
        {point.expPending ? '當日增量等待 Nexon 歷史資料更新' : `當日增加 ${compactNumber(point.expGain)} EXP`}
      </div>
    </div>
  );
};

interface GrowthInsightPanelsProps {
  data: DashboardData;
  days: MaplerHouseHistoryDay[];
  trendRange: TrendRange;
  setTrendRange: (range: TrendRange) => void;
  allowRangeSelection: boolean;
}

const GrowthInsightPanels: React.FC<GrowthInsightPanelsProps> = ({
  data,
  days,
  trendRange,
  setTrendRange,
  allowRangeSelection,
}) => {
  const chartDays = useMemo(() => days.slice(-trendRange), [days, trendRange]);
  const eta = useMemo(() => {
    const sample = days.slice(-30);
    const gains = sample.slice(1).filter((day) => !day.expPending && Number.isFinite(Number(day.expGain)));
    const averageDailyExp = gains.reduce((total, day) => total + Math.max(0, Number(day.expGain) || 0), 0)
      / Math.max(1, gains.length);
    const currentLevel = data.basic.character_level;
    const currentExp = Number(data.basic.character_exp);
    const currentRate = Number(data.basic.character_exp_rate);
    if (currentLevel >= 300) return { maxLevel: true, averageDailyExp, sampleDays: gains.length, days: 0 };
    if (averageDailyExp <= 0 || currentExp <= 0 || currentRate <= 0) {
      return { maxLevel: false, averageDailyExp, sampleDays: gains.length, days: null };
    }
    const requiredExp = currentExp / (currentRate / 100);
    return {
      maxLevel: false,
      averageDailyExp,
      sampleDays: gains.length,
      days: Math.max(0, (requiredExp - currentExp) / averageDailyExp),
    };
  }, [data.basic.character_exp, data.basic.character_exp_rate, data.basic.character_level, days]);

  const formatProgressTick = (value: number) => {
    const rate = ((value % 1) + 1) % 1;
    return `${(rate * 100).toFixed(1)}%`;
  };

  const pointStyle = chartDays.length <= 14
    ? { r: 3, fill: '#34d399', strokeWidth: 0 }
    : chartDays.length <= 30
      ? { r: 2.25, fill: '#34d399', strokeWidth: 0 }
      : false;

  return (
    <div className="grid items-stretch gap-5 lg:grid-cols-2">
      <div className="maple-growth-panel flex min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-950/30 p-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-semibold text-slate-200">經驗趨勢</h3>
            <p className="mt-1 text-xs text-slate-500">每日等級與經驗進度變化</p>
          </div>
          {allowRangeSelection ? (
            <div className="flex gap-1 rounded-lg bg-slate-900 p-1">
              {([7, 30, 90] as TrendRange[]).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTrendRange(range)}
                  className={`maple-growth-range-button rounded-md px-3 py-1 text-xs transition ${trendRange === range ? 'is-current bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {range} 日
                </button>
              ))}
            </div>
          ) : (
            <span className="rounded-md bg-slate-900 px-3 py-1 text-xs text-slate-400">近 7 日</span>
          )}
        </div>
        <div className="maple-growth-chart h-56 w-full outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartDays.map((day) => ({
                ...day,
                progress: day.level + (Number(day.expRate) || 0) / 100,
              }))}
              margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
              accessibilityLayer={false}
              style={{ outline: 'none' }}
            >
              <XAxis
                dataKey="date"
                tickFormatter={(value) => value.slice(5)}
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                interval="preserveStartEnd"
                minTickGap={24}
                padding={{ left: 8, right: 8 }}
              />
              <YAxis
                width={42}
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatProgressTick}
                tickCount={5}
                domain={['dataMin - 0.01', 'dataMax + 0.01']}
              />
              <Tooltip content={<GrowthTooltip />} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
              <Line
                type="monotone"
                dataKey="progress"
                stroke="#34d399"
                strokeWidth={2.5}
                dot={pointStyle}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="maple-growth-panel flex min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-950/30 p-4">
        <div className="flex items-center justify-center gap-2 text-center">
          <Clock3 className="h-4 w-4 text-emerald-400" />
          <h3 className="font-semibold text-slate-200">升級預估時間</h3>
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">
          近 {eta.sampleDays || 0} 天平均每日 {compactNumber(eta.averageDailyExp || 0)} EXP
        </p>
        <div className="maple-growth-eta mt-4 flex flex-1 flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-5 text-center">
          {eta.maxLevel ? (
            <span className="text-sm text-slate-400">目前已達最高等級</span>
          ) : eta.days == null ? (
            <span className="text-sm text-slate-400">累積資料不足，暫時無法預估</span>
          ) : (
            <>
              <div className="text-sm font-semibold text-slate-200">Lv.{data.basic.character_level + 1}</div>
              <div className="mt-1 text-2xl font-bold text-emerald-400">約 {eta.days < 1 ? '1 天內' : `${eta.days.toFixed(1)} 天`}</div>
            </>
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-600">依目前 Nexon 經驗值與近期平均成長速度估算，實際時間可能因活動與練等狀況不同。</p>
      </div>
    </div>
  );
};

const CharacterGrowthHistory: React.FC<CharacterGrowthHistoryProps> = ({ data, apiKey }) => {
  const [history, setHistory] = useState<MaplerHouseCharacterHistory | null>(null);
  const [weeklyHistory, setWeeklyHistory] = useState<any[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendRange, setTrendRange] = useState<TrendRange>(30);

  useEffect(() => {
    let active = true;
    setWeeklyHistory([]);
    setWeeklyLoading(true);
    fetchWeeklyHistory(data.basic.character_name, apiKey)
      .then((result) => {
        if (active) setWeeklyHistory(result || []);
      })
      .catch(() => {
        if (active) setWeeklyHistory([]);
      })
      .finally(() => {
        if (active) setWeeklyLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiKey, data.basic.character_name]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        setError(null);
        const status = await fetchMaplerHouseHistoryStatus(data.ocid);
        if (cancelled) return;

        const jobStatus = status.job?.status;
        if (!status.tracked || jobStatus === 'pending' || jobStatus === 'running') {
          setHistory(null);
          setLoading(false);
          if (status.tracked || jobStatus === 'pending' || jobStatus === 'running') {
            pollTimer = setTimeout(load, 5000);
          }
          return;
        }

        const endDate = status.availableEndDate || status.lastSyncedDate;
        if (!endDate) {
          setLoading(false);
          return;
        }

        const calendarStart = formatDate(addDays(parseDate(endDate), -364));
        const requestStart = status.historyStartDate && status.historyStartDate > calendarStart
          ? status.historyStartDate
          : calendarStart;
        const result = await fetchMaplerHouseCharacterHistory(data.ocid, requestStart, endDate);
        if (!cancelled) {
          setHistory(result);
          setLoading(false);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : '成長紀錄讀取失敗');
          setLoading(false);
        }
      }
    };

    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ ocid?: string }>;
      if (!customEvent.detail?.ocid || customEvent.detail.ocid === data.ocid) {
        if (pollTimer) clearTimeout(pollTimer);
        setLoading(true);
        load();
      }
    };

    load();
    window.addEventListener('maple-growth-profile-updated', handleProfileUpdate);
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      window.removeEventListener('maple-growth-profile-updated', handleProfileUpdate);
    };
  }, [data.ocid]);

  // Building the chart, 365 calendar cells and event timeline is intentionally
  // deferred so the ranking and primary dashboard remain responsive when the
  // history request completes at nearly the same time.
  const deferredHistory = React.useDeferredValue(history);
  const historyRenderPending = history !== deferredHistory;
  const weeklyDays = useMemo<MaplerHouseHistoryDay[]>(() => weeklyHistory.map((day, index) => {
    const previous = weeklyHistory[index - 1];
    const currentExp = Number(day.exp);
    const currentExpAvailable = day.exp !== null && day.exp !== undefined && day.exp !== '' && Number.isFinite(currentExp);
    const previousExp = Number(previous?.exp);
    const previousExpAvailable = Boolean(previous)
      && previous.exp !== null
      && previous.exp !== undefined
      && previous.exp !== ''
      && Number.isFinite(previousExp);
    const expPending = Boolean(day.expPending || previous?.expPending || !previous || !currentExpAvailable || !previousExpAvailable);
    let expGain = 0;
    if (!expPending && previous) {
      const levelDiff = Number(day.level) - Number(previous.level);
      if (levelDiff === 0) {
        expGain = Math.max(0, currentExp - previousExp);
      } else if (levelDiff === 1 && Number(previous.expRate) > 0) {
        const previousRequiredExp = previousExp / (Number(previous.expRate) / 100);
        expGain = Math.max(0, previousRequiredExp - previousExp + currentExp);
      }
    }
    return {
      date: day.fullDate || day.date,
      level: Number(day.level) || 0,
      exp: currentExpAvailable ? String(currentExp) : '',
      expRate: String(Number(day.expRate) || 0),
      expGain: String(Math.round(expGain)),
      expPending,
      growthBucket: 0,
      active: !expPending && expGain > 0,
    };
  }), [weeklyHistory]);
  const historyDays = useMemo<MaplerHouseHistoryDay[] | null>(() => {
    if (!deferredHistory) return null;
    const today = getTaiwanDateKey();
    return deferredHistory.days.map((day) => day.date.slice(0, 10) === today
      ? {
          ...day,
          expGain: '0',
          expPending: true,
          growthBucket: 0,
          active: false,
        }
      : day);
  }, [deferredHistory]);
  const insightDays = historyDays ?? weeklyDays;

  const calendar = useMemo(() => {
    if (!deferredHistory || !historyDays) return null;
    const end = parseDate(deferredHistory.availableEndDate || deferredHistory.end);
    const start = addDays(end, -364);
    const dayMap = new Map(historyDays.map((day) => [day.date, day]));
    const leading = start.getUTCDay();
    const cells: Array<{ key: string; day: MaplerHouseHistoryDay | null; empty?: boolean }> = [];
    for (let index = 0; index < leading; index += 1) {
      cells.push({ key: `empty-${index}`, day: null, empty: true });
    }
    for (let index = 0; index < 365; index += 1) {
      const date = formatDate(addDays(start, index));
      cells.push({ key: date, day: dayMap.get(date) || null });
    }
    const monthLabels: Array<{ key: string; label: string; week: number }> = [];
    let previousMonth = -1;
    for (let index = 0; index < 365; index += 1) {
      const date = addDays(start, index);
      const month = date.getUTCMonth();
      if (index === 0 || month !== previousMonth) {
        monthLabels.push({
          key: `${date.getUTCFullYear()}-${month}`,
          label: `${month + 1}月`,
          week: Math.floor((leading + index) / 7),
        });
      }
      previousMonth = month;
    }
    return {
      start: formatDate(start),
      end: formatDate(end),
      cells,
      monthLabels,
      weekCount: Math.ceil(cells.length / 7),
    };
  }, [deferredHistory, historyDays]);

  if ((loading || historyRenderPending || weeklyLoading) && !deferredHistory && !weeklyDays.length) {
    return (
      <div className="maple-growth-state mt-6 flex min-h-28 items-center justify-center rounded-xl border border-slate-800 bg-[#161b22] text-sm text-slate-500">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />讀取成長紀錄中...
      </div>
    );
  }

  if (error && !weeklyDays.length) {
    return (
      <div className="maple-growth-state is-error mt-6 rounded-xl border border-rose-900/50 bg-rose-950/20 px-5 py-4 text-sm text-rose-300">
        {error}
      </div>
    );
  }

  if (!deferredHistory && weeklyDays.length) {
    return (
      <section className="maple-growth-history mt-6 space-y-5 rounded-xl border border-slate-800 bg-[#161b22] p-5 shadow-xl">
        <header>
          <div className="flex items-center gap-2 text-lg font-bold text-slate-100">
            <TrendingUp className="h-5 w-5 text-emerald-400" />經驗成長資訊
          </div>
          <p className="mt-1 text-xs text-slate-500">直接使用 Nexon 近 7 日資料；生成成長檔案後可再查看年度日曆與角色大事記。</p>
        </header>
        <GrowthInsightPanels
          data={data}
          days={weeklyDays}
          trendRange={7}
          setTrendRange={setTrendRange}
          allowRangeSelection={false}
        />
      </section>
    );
  }

  if (!deferredHistory || !historyDays || !calendar) return null;

  const bestDay = historyDays.reduce<{ date: string; expGain: string } | null>((best, day) => {
    if (day.expPending || Number(day.expGain) <= 0) return best;
    return !best || Number(day.expGain) > Number(best.expGain)
      ? { date: day.date, expGain: day.expGain }
      : best;
  }, null);
  const sortedEvents = [...deferredHistory.events].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="maple-growth-history mt-6 space-y-5 rounded-xl border border-slate-800 bg-[#161b22] p-5 shadow-xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold text-slate-100">
            <TrendingUp className="h-5 w-5 text-emerald-400" />近一年成長紀錄
          </div>
          <p className="mt-1 text-xs text-slate-500">資料更新至 {deferredHistory.lastSyncedDate || deferredHistory.end}</p>
        </div>
      </header>

      <GrowthInsightPanels
        data={data}
        days={insightDays}
        trendRange={trendRange}
        setTrendRange={setTrendRange}
        allowRangeSelection
      />

      <div className="maple-growth-panel space-y-4 rounded-xl border border-slate-800 bg-slate-950/30 p-4">
        <div>
          <h3 className="font-semibold text-slate-200">近一年成長概覽</h3>
          <p className="mt-1 text-xs text-slate-500">{deferredHistory.start} 至 {deferredHistory.end}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['活躍天數', `${deferredHistory.stats.activeDays} 天`],
            ['最長連續', `${deferredHistory.stats.longestStreak} 天`],
            ['等級成長', `+${deferredHistory.stats.levelGain} Lv`],
            ['單日最高', bestDay ? compactNumber(bestDay.expGain) : '尚無資料', bestDay?.date],
          ].map(([label, value, note]) => (
            <div key={label} className="maple-growth-summary-card rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="mt-1 text-lg font-bold text-slate-200">{value}</div>
              {note && <div className="mt-0.5 text-[11px] text-slate-600">{note}</div>}
            </div>
          ))}
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-400" />
            <div>
              <h4 className="text-sm font-semibold text-slate-200">年度成長日曆</h4>
              <p className="mt-0.5 text-xs text-slate-500">顯示近一年；角色建立前或可查詢範圍外的日期會顯示為無資料。</p>
            </div>
          </div>
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[890px]">
              <div className="ml-10 grid h-5 gap-1 text-[11px] text-slate-500" style={{ gridTemplateColumns: `repeat(${calendar.weekCount}, minmax(0, 1fr))` }}>
                {calendar.monthLabels.map((month) => (
                  <span key={month.key} className="whitespace-nowrap" style={{ gridColumnStart: month.week + 1, gridRow: 1 }}>
                    {month.label}
                  </span>
                ))}
              </div>
              <div className="flex items-start">
                <div className="mr-2 grid w-8 shrink-0 grid-rows-7 gap-1 text-[10px] leading-3 text-slate-500" aria-hidden="true">
                  <span />
                  <span>週一</span>
                  <span />
                  <span>週三</span>
                  <span />
                  <span>週五</span>
                  <span />
                </div>
                <div className="grid min-w-0 flex-1 grid-flow-col grid-rows-7 gap-1" style={{ gridTemplateColumns: `repeat(${calendar.weekCount}, minmax(0, 1fr))` }}>
                  {calendar.cells.map((cell) => {
                    if (cell.empty) return <span key={cell.key} className="h-3 w-3 justify-self-center" />;
                    const bucket = Math.max(0, Math.min(4, cell.day?.growthBucket || 0));
                    const label = cell.day
                      ? `${cell.key} · Lv.${cell.day.level} · ${cell.day.expRate}% · +${compactNumber(cell.day.expGain)} EXP`
                      : `${cell.key} · 無資料`;
                    return (
                      <span
                        key={cell.key}
                        title={label}
                        className={`maple-growth-calendar-cell h-3 w-3 justify-self-center rounded-[3px] ring-1 ring-slate-700/40 ${cell.day ? HEAT_COLORS[bucket] : 'is-unavailable bg-slate-900/40 opacity-50'}`}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-1 text-[11px] text-slate-500">
                <span>較少</span>{HEAT_COLORS.map((color) => <span key={color} className={`maple-growth-calendar-cell h-3 w-3 rounded-[3px] ${color}`} />)}<span>較多</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-200">角色成長大事記</h4>
          <p className="mt-1 text-xs text-slate-500">記錄升級、改名、職業、世界、公會、解放狀態和武陵變化。</p>
          {sortedEvents.length ? (
            <div className="relative mt-5">
              <span className="maple-growth-timeline-line absolute bottom-5 left-[11px] top-3 w-px bg-gradient-to-b from-emerald-400 via-emerald-700 to-slate-800" aria-hidden="true" />
              {sortedEvents.map((event, index) => {
                const from = formatEventValue(event, event.from);
                const to = formatEventValue(event, event.to);
                return (
                  <div key={`${event.date}-${event.type}-${index}`} className={`relative flex gap-4 ${index < sortedEvents.length - 1 ? 'pb-5' : ''}`}>
                    <div className="relative z-10 flex w-6 shrink-0 justify-center pt-4">
                      <span className={`maple-growth-timeline-node h-3 w-3 rounded-full border-[3px] bg-[#161b22] shadow-[0_0_0_4px_rgba(22,27,34,1)] ${index === 0 ? 'is-latest border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.55)]' : 'border-emerald-600'}`} />
                    </div>
                    <span className="maple-growth-timeline-connector absolute left-5 top-[21px] h-px w-4 bg-emerald-800" aria-hidden="true" />
                    <article className="maple-growth-event-card min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-900/55 p-4 transition-colors hover:border-emerald-800/70">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-slate-200">{eventLabels[event.type] || event.title || event.type}</h5>
                          {index === 0 && <span className="maple-growth-latest-badge rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300">最新</span>}
                        </div>
                        <time className="maple-growth-event-date rounded-md bg-slate-950/70 px-2 py-1 font-mono text-[11px] text-slate-500">{event.date}</time>
                      </div>
                      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-xs">
                        <span className="maple-growth-event-before max-w-full break-words rounded-md border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 text-slate-400">{from}</span>
                        <span className="font-bold text-emerald-500" aria-label="變更為">→</span>
                        <span className="maple-growth-event-after max-w-full break-words rounded-md border border-emerald-900/70 bg-emerald-950/30 px-2.5 py-1.5 font-semibold text-emerald-300">{to}</span>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">近一年尚無角色重大變化</div>
          )}
        </div>
      </div>
    </section>
  );
};

export default React.memo(CharacterGrowthHistory);
