import React from 'react';
import { DashboardData } from '../types';
import { calculateDefenseMultiplier } from '../calculator/combatMath';

interface StatRadarChartProps {
  data: DashboardData;
}

const MAIN_STAT_SCALE = 8500;
// 惡魔復仇者的 HP 與一般主屬性量級不同；約 24 萬 HP 對應一般主屬性的雷達基準。
const DEMON_AVENGER_HP_SCALE = 240000;

const StatRadarChart: React.FC<StatRadarChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  // Helper to get stat value
  const getVal = (name: string) => {
    const found = data.stat.final_stat.find(s => s.stat_name === name);
    return found ? parseFloat(found.stat_value.replace(/,/g, '')) : 0;
  };

  // 1. Determine Main Stat
  const str = getVal('STR');
  const dex = getVal('DEX');
  const int = getVal('INT');
  const luk = getVal('LUK');
  const hp = getVal('HP');

  const characterClass = data.basic?.character_class || data.stat?.character_class || '';
  const isDemonAvenger = characterClass.includes('惡魔復仇者');

  let mainStatLabel = isDemonAvenger ? 'HP' : 'STR';
  let mainStatVal = isDemonAvenger ? hp : str;
  const mainStatScale = isDemonAvenger ? DEMON_AVENGER_HP_SCALE : MAIN_STAT_SCALE;

  // 非惡魔復仇者才使用四大屬性的最高值推定，避免單純因 HP 很高而誤判職業。
  if (!isDemonAvenger) {
    if (dex > mainStatVal) { mainStatLabel = 'DEX'; mainStatVal = dex; }
    if (int > mainStatVal) { mainStatLabel = 'INT'; mainStatVal = int; }
    if (luk > mainStatVal) { mainStatLabel = 'LUK'; mainStatVal = luk; }
  }
  
  // 2. Determine Attack Type
  const att = getVal('攻擊力');
  const magic = getVal('魔法攻擊力');
  const isMagic = int > str && int > dex && int > luk; // Simple check
  const attackLabel = isMagic ? '魔法攻擊' : '攻擊力';
  const attackVal = isMagic ? magic : att;

  // 3. Other Stats
  const finalDmg = getVal('最終傷害');
  const boss = getVal('BOSS怪物傷害');
  const critDmg = getVal('爆擊傷害');
  const ied = getVal('無視防禦率');

  // 4. Scaling
  // 使用固定曲線基準，避免「每一項都約落在 83%」導致強勢屬性不明顯。
  const clamp01 = (v: number) => Math.max(0, Math.min(v, 1));
  const curveNormalize = (value: number, scale: number, power = 1) => {
    if (scale <= 0) return 0;
    const curved = 1 - Math.exp(-Math.max(value, 0) / scale);
    return clamp01(Math.pow(curved, power));
  };
  // 與實戰計算機共用 380% BOSS 防禦公式；以實際保留的輸出比例作為雷達半徑。
  const normalizeIed = (value: number) => clamp01(calculateDefenseMultiplier(value));

  const stats = [
    { label: mainStatLabel, value: mainStatVal, normalized: curveNormalize(mainStatVal, mainStatScale) },
    { label: attackLabel, value: attackVal, normalized: curveNormalize(attackVal, 1800) },
    { label: '最終傷害', value: finalDmg, normalized: curveNormalize(finalDmg, 75) },
    { label: 'BOSS傷害', value: boss, normalized: curveNormalize(boss, 220) },
    { label: '爆擊傷害', value: critDmg, normalized: curveNormalize(critDmg, 55, 0.9) },
    { label: '無視防禦', value: ied, normalized: normalizeIed(ied) },
  ];

  // SVG Config
  const size = 200;
  const center = size / 2;
  const radius = 70;
  const sides = 6;
  
  // Calculate points
  const getPoint = (index: number, normalized: number) => {
    const angle = (Math.PI * 2 * index) / sides - Math.PI / 2;
    // Minimum 10% display for visibility
    const r = radius * (normalized < 0.1 ? 0.1 : normalized);
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const getLabelPoint = (index: number) => {
    const angle = (Math.PI * 2 * index) / sides - Math.PI / 2;
    const r = radius + 25; // Label offset
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Animation: 進場時由中心展開
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const duration = 700; // ms
    function animate(ts: number) {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / duration, 1);
      setProgress(t);
      if (t < 1) frame = requestAnimationFrame(animate);
    }
    setProgress(0);
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const dataPoints = stats.map((s, i) => {
    // 動畫進場時，normalized 由 0~實際值
    return getPoint(i, s.normalized * progress);
  });
  const polyPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  // Grid levels
  const levels = [0.2, 0.4, 0.6, 0.8, 1];

  return (
    <div className="w-full">
      <h4 className="text-xs font-bold text-yellow-300 mb-4 uppercase tracking-widest text-center">能力雷達圖</h4>
      <div className="relative w-[200px] h-[200px]">
        <svg width={size} height={size} className="overflow-visible">
          {/* Grid Lines */}
          {levels.map((level, idx) => (
            <polygon
              key={idx}
              points={Array.from({ length: sides }).map((_, i) => {
                const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
                const r = radius * level;
                return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
              }).join(' ')}
              fill="none"
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray={level === 1 ? "0" : "2 2"}
            />
          ))}

          {/* Axes */}
          {Array.from({ length: sides }).map((_, i) => {
            const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={center + radius * Math.cos(angle)}
                y2={center + radius * Math.sin(angle)}
                stroke="#334155"
                strokeWidth="1"
              />
            );
          })}

          {/* Data Polygon */}
          <polygon
            points={polyPoints}
            fill="rgba(99, 102, 241, 0.3)" // Indigo-500 with opacity
            stroke="#818cf8" // Indigo-400
            strokeWidth="2"
          />

          {/* Data Points */}
          {dataPoints.map((p, i) => (
            <g key={i}
               data-radar-index={i}
               onMouseEnter={() => setHoveredIndex(i)}
               onMouseLeave={() => setHoveredIndex(null)}
               style={{ cursor: 'pointer' }}
            >
              {/* Hit area */}
              <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
              {/* Visible point */}
              <circle cx={p.x} cy={p.y} r={hoveredIndex === i ? 4 : 2} fill={hoveredIndex === i ? "#fff" : "#818cf8"} />
            </g>
          ))}

          {/* Labels */}
          {stats.map((s, i) => {
            const p = getLabelPoint(i);
            return (
              <text
                key={i}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] fill-slate-400 font-medium"
              >
                {s.label}
              </text>
            );
          })}

          {/* SVG 不會套用一般 CSS z-index；最後繪製才能確保 Tooltip 蓋在屬性名稱上方。 */}
          {hoveredIndex !== null && (() => {
            const point = dataPoints[hoveredIndex];
            const stat = stats[hoveredIndex];
            return (
              <g pointerEvents="none">
                <rect
                  x={point.x - 35}
                  y={point.y - 30}
                  width="70"
                  height="24"
                  rx="4"
                  fill="rgba(15, 23, 42, 0.95)"
                  stroke="#64748b"
                  strokeWidth="1"
                />
                <text
                  x={point.x}
                  y={point.y - 18}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {stat.value.toLocaleString()}
                  {['最終傷害', 'BOSS傷害', '爆擊傷害', '無視防禦'].includes(stat.label) ? '%' : ''}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
};

export default StatRadarChart;
