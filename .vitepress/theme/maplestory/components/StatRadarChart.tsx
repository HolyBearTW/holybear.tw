import React from 'react';
import { DashboardData } from '../types';
import { createRadarEquivalentProfile } from '../calculator/mapleCombatCalculator';

interface StatRadarChartProps {
  data: DashboardData;
}

const formatScore = (value: number) => Math.round(value).toLocaleString('zh-TW');

const StatRadarChart: React.FC<StatRadarChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [overallHoverPoint, setOverallHoverPoint] = React.useState<{ x: number; y: number } | null>(null);
  const radar = React.useMemo(() => createRadarEquivalentProfile(data), [data]);
  const referenceDate = React.useMemo(() => new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: 'numeric', day: 'numeric',
  }).format(new Date(radar.referenceGeneratedAt)), [radar.referenceGeneratedAt]);
  const overallBaseline = Math.max(1, radar.overallEquivalentMain);
  const referenceMax = Math.max(1, radar.referenceMax);
  const stats = radar.axes.map((axis) => ({
    ...axis,
    normalized: Math.max(0, Math.min(1, axis.equivalentMain / referenceMax)),
    relativePercent: Math.max(0, axis.equivalentMain / overallBaseline * 100),
  }));

  const size = 240;
  const center = size / 2;
  const radius = 78;
  const sides = 6;
  const getPoint = (index: number, normalized: number) => {
    const angle = (Math.PI * 2 * index) / sides - Math.PI / 2;
    const r = radius * Math.max(0, Math.min(1, normalized));
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };
  const getLabelPoint = (index: number) => {
    const angle = (Math.PI * 2 * index) / sides - Math.PI / 2;
    const r = radius + 28;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const animate = (timestamp: number) => {
      if (start === null) start = timestamp;
      const next = Math.min((timestamp - start) / 700, 1);
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(animate);
    };
    setProgress(0);
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [data]);

  const dataPoints = stats.map((stat, index) => getPoint(index, stat.normalized * progress));
  const overallNormalized = Math.max(0, Math.min(1, radar.overallEquivalentMain / referenceMax));
  const overallPoints = stats.map((_, index) => getPoint(index, overallNormalized * progress));
  const polygon = (points: Array<{ x: number; y: number }>) => points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="w-full">
      <h4 className="mb-1 text-center text-xs font-bold uppercase tracking-widest text-yellow-300">能力雷達圖</h4>
      <div className="mb-2 text-center text-[11px] font-semibold text-slate-500">
        台版樣本曲線・同職業 {radar.referenceSampleSize} 名／全體 {radar.referenceTotalSize} 名・更新 {referenceDate}
      </div>
      <div className="relative mx-auto h-[240px] w-[240px]">
        <svg width={size} height={size} className="overflow-visible" aria-label="台版等價能力雷達圖">
          {[0.2, 0.4, 0.6, 0.8, 1].map((level) => (
            <polygon
              key={level}
              points={polygon(Array.from({ length: sides }, (_, index) => getPoint(index, level)))}
              fill="none"
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray={level === 1 ? '0' : '2 2'}
            />
          ))}
          {Array.from({ length: sides }, (_, index) => {
            const point = getPoint(index, 1);
            return <line key={index} x1={center} y1={center} x2={point.x} y2={point.y} stroke="#334155" strokeWidth="1" />;
          })}

          <polygon points={polygon(overallPoints)} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="5 4" />
          <polygon points={polygon(dataPoints)} fill="rgba(99, 102, 241, 0.30)" stroke="#818cf8" strokeWidth="2" />
          <polygon
            points={polygon(overallPoints)}
            fill="none"
            stroke="transparent"
            strokeWidth="12"
            pointerEvents="stroke"
            onMouseEnter={() => setHoveredIndex(null)}
            onMouseMove={(event) => {
              const svg = event.currentTarget.ownerSVGElement;
              if (!svg) return;
              const bounds = svg.getBoundingClientRect();
              setOverallHoverPoint({
                x: (event.clientX - bounds.left) * size / bounds.width,
                y: (event.clientY - bounds.top) * size / bounds.height,
              });
            }}
            onMouseLeave={() => setOverallHoverPoint(null)}
            style={{ cursor: 'help' }}
          />

          {dataPoints.map((point, index) => (
            <g
              key={stats[index].key}
              onMouseEnter={() => {
                setOverallHoverPoint(null);
                setHoveredIndex(index);
              }}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => setHoveredIndex((current) => current === index ? null : index)}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={point.x} cy={point.y} r="11" fill="transparent" />
              <circle cx={point.x} cy={point.y} r={hoveredIndex === index ? 4 : 2.5} fill={hoveredIndex === index ? '#fff' : '#818cf8'} />
            </g>
          ))}

          {stats.map((stat, index) => {
            const point = getLabelPoint(index);
            return <text key={stat.key} x={point.x} y={point.y} textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 text-xs font-semibold">{stat.label}</text>;
          })}

          {hoveredIndex !== null && (() => {
            const point = dataPoints[hoveredIndex];
            const stat = stats[hoveredIndex];
            const showsAttackSources = stat.key === 'attackPercent';
            const attackDetails = showsAttackSources ? stat.detail.split('｜') : [];
            const tooltipWidth = showsAttackSources ? 170 : 148;
            const tooltipHeight = showsAttackSources ? 80 + attackDetails.length * 14 : 78;
            const tooltipX = Math.max(tooltipWidth / 2, Math.min(size - tooltipWidth / 2, point.x));
            const tooltipY = point.y < center ? point.y + 16 : point.y - tooltipHeight;
            return (
              <g pointerEvents="none">
                <rect x={tooltipX - tooltipWidth / 2} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="6" fill="rgba(15, 23, 42, 0.97)" stroke="#64748b" strokeWidth="1" />
                <text x={tooltipX} y={tooltipY + 15} textAnchor="middle" fill="#cbd5e1" fontSize="11" fontWeight="600">
                  原始值 {stat.rawValue.toLocaleString('zh-TW')}{stat.rawUnit}
                </text>
                <text x={tooltipX} y={tooltipY + 32} textAnchor="middle" fill="#c7d2fe" fontSize="11" fontWeight="800">
                  {stat.label}換算 {formatScore(stat.equivalentMain)}
                </text>
                <text x={tooltipX} y={tooltipY + 49} textAnchor="middle" fill="#7dd3fc" fontSize="11" fontWeight="800">
                  整體等價 {formatScore(radar.overallEquivalentMain)}
                </text>
                {showsAttackSources && (
                  <>
                    {attackDetails.map((detail, detailIndex) => (
                      <text key={detail} x={tooltipX} y={tooltipY + 65 + detailIndex * 14} textAnchor="middle" fill="#cbd5e1" fontSize="9" fontWeight="600">
                        {detail}
                      </text>
                    ))}
                  </>
                )}
                <text x={tooltipX} y={tooltipY + (showsAttackSources ? 68 + attackDetails.length * 14 : 66)} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="700">
                  整體基準比 {stat.relativePercent.toFixed(1)}%
                </text>
              </g>
            );
          })()}

          {overallHoverPoint !== null && (() => {
            const tooltipWidth = 144;
            const tooltipHeight = 38;
            const tooltipX = Math.max(tooltipWidth / 2, Math.min(size - tooltipWidth / 2, overallHoverPoint.x));
            const tooltipY = overallHoverPoint.y < center
              ? overallHoverPoint.y + 12
              : overallHoverPoint.y - tooltipHeight - 12;
            return (
              <g pointerEvents="none">
                <rect x={tooltipX - tooltipWidth / 2} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="6" fill="rgba(15, 23, 42, 0.97)" stroke="#38bdf8" strokeWidth="1" />
                <text x={tooltipX} y={tooltipY + 23} textAnchor="middle" fill="#7dd3fc" fontSize="11" fontWeight="800">
                  整體等價 {formatScore(radar.overallEquivalentMain)}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
      <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1"><i className="h-0.5 w-3 bg-indigo-400" />各項換算</span>
        <span className="inline-flex items-center gap-1"><i className="w-3 border-t border-dashed border-sky-400" />整體等價 {formatScore(radar.overallEquivalentMain)}</span>
      </div>
      <p className="mt-1 text-center text-[10px] leading-4 text-slate-500">
        六軸依同職業台版分位換算；藍色虛線代表戰鬥力對應的整體等價主屬。
      </p>
    </div>
  );
};

export default StatRadarChart;
