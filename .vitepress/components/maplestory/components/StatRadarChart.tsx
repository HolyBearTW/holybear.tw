import React from 'react';
import { DashboardData } from '../types';

interface StatRadarChartProps {
  data: DashboardData;
}

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
  
  let mainStatLabel = 'STR';
  let mainStatVal = str;
  
  // Simple heuristic for main stat (highest value)
  // Demon Avenger uses HP, Xenon uses STR/DEX/LUK, but for chart simplicity we pick the highest
  if (dex > mainStatVal) { mainStatLabel = 'DEX'; mainStatVal = dex; }
  if (int > mainStatVal) { mainStatLabel = 'INT'; mainStatVal = int; }
  if (luk > mainStatVal) { mainStatLabel = 'LUK'; mainStatVal = luk; }
  // Special case for HP classes if HP is significantly higher relative to normal stats (scaled down)
  // But usually we just show the highest primary stat. 
  
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

  // 4. Scaling (Dynamic Max values)
  // Instead of fixed max values, we use a dynamic scale based on the user's stats.
  // We set the "100%" mark to be slightly higher than the user's current value (e.g., 1.2x),
  // but with a minimum floor to prevent small stats from looking huge.
  
  const getDynamicMax = (val: number, floor: number) => {
     return Math.max(val * 1.2, floor);
  };

  const normalize = (val: number, max: number) => {
    if (max <= 0) return 0;
    return Math.min(val / max, 1);
  };

  const stats = [
    { label: mainStatLabel, value: mainStatVal, max: getDynamicMax(mainStatVal, 5000) }, 
    { label: attackLabel, value: attackVal, max: getDynamicMax(attackVal, 1000) },      
    { label: '最終傷害', value: finalDmg, max: getDynamicMax(finalDmg, 100) },           
    { label: 'BOSS傷害', value: boss, max: getDynamicMax(boss, 300) },               
    { label: '爆擊傷害', value: critDmg, max: getDynamicMax(critDmg, 50) },            
    { label: '無視防禦', value: ied, max: 100 }, // IED is always max 100% effectively, but let's keep it simple or cap at 100
  ];

  // SVG Config
  const size = 200;
  const center = size / 2;
  const radius = 70;
  const sides = 6;
  
  // Calculate points
  const getPoint = (index: number, value: number, max: number) => {
    const angle = (Math.PI * 2 * index) / sides - Math.PI / 2;
    const normalized = normalize(value, max);
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
    // 動畫進場時，value 由 0~實際值
    return getPoint(i, s.value * progress, s.max);
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

          {/* Data Points & Tooltips */}
          {dataPoints.map((p, i) => (
            <g key={i} 
               onMouseEnter={() => setHoveredIndex(i)}
               onMouseLeave={() => setHoveredIndex(null)}
               style={{ cursor: 'pointer' }}
            >
              {/* Hit area */}
              <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
              {/* Visible point */}
              <circle cx={p.x} cy={p.y} r={hoveredIndex === i ? 4 : 2} fill={hoveredIndex === i ? "#fff" : "#818cf8"} />
              
              {/* Tooltip */}
              {hoveredIndex === i && (
                <g pointerEvents="none" style={{ zIndex: 50 }}>
                  <rect 
                    x={p.x - 35} 
                    y={p.y - 30} 
                    width="70" 
                    height="24" 
                    rx="4" 
                    fill="rgba(15, 23, 42, 0.95)" 
                    stroke="#64748b" 
                    strokeWidth="1" 
                  />
                  <text 
                    x={p.x} 
                    y={p.y - 18} 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    fill="#fff" 
                    fontSize="11" 
                    fontWeight="bold"
                  >
                    {stats[i].value.toLocaleString()}
                    {['最終傷害', 'BOSS傷害', '爆擊傷害', '無視防禦'].includes(stats[i].label) ? '%' : ''}
                  </text>
                </g>
              )}
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
        </svg>
      </div>
    </div>
  );
};

export default StatRadarChart;
