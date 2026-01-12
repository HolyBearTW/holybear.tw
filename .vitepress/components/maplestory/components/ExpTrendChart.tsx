import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface ExpTrendChartProps {
  historyData: any[];
  loading: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1d24] border border-slate-700 p-3 rounded-lg shadow-xl text-xs">
        <p className="text-slate-400 mb-1">{label}</p>
        <p className="text-indigo-400 font-bold">
          Lv.{payload[0].payload.level} ({payload[0].value}%)
        </p>
      </div>
    );
  }
  return null;
};

const ExpTrendChart: React.FC<ExpTrendChartProps> = ({ historyData, loading }) => {
  const [chartWidth, setChartWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // === 成長率計算 ===
  const growthStr = calculateWeeklyGrowth(historyData);
  let isPositive = true;
  if (growthStr.startsWith('+')) isPositive = true;
  if (growthStr.startsWith('-')) isPositive = false;
  // =================

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        setChartWidth(w > 0 ? w : 300);
      }
    };

    updateWidth();
    setTimeout(updateWidth, 100);
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  if (loading) {
    return (
      <div className="h-[150px] w-full flex items-center justify-center">
        <span className="text-slate-500 text-xs animate-pulse">載入歷史數據中...</span>
      </div>
    );
  }

  if (!historyData || historyData.length === 0) {
    return (
      <div className="h-[150px] flex flex-col items-center justify-center gap-2">
        <span className="text-slate-500 text-xs">暫無歷史數據</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 1. 移除外層 Card 樣式，改為透明 */}
      {/* 2. 移除大標題，只保留成長率數據，並縮小放在右上角或上方 */}
      <div className="flex items-center justify-end mb-2 gap-2">
        <span className="text-xs text-slate-400 whitespace-nowrap">近 7 日成長</span>
        <span className={`font-bold text-right w-20 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>{growthStr}</span>
      </div>

      <div ref={containerRef} style={{ width: '100%', height: 150, minHeight: 150 }} className="outline-none [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none focus:outline-none [&:focus-visible]:outline-none">
        {chartWidth > 0 && (
          <BarChart 
            className="outline-none focus:outline-none"
            width={chartWidth} 
            height={150} 
            data={historyData} 
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#64748b', fontSize: 10 }} 
              axisLine={false} 
              tickLine={false}
              dy={10}
            />
            <YAxis 
              tick={{ fill: '#64748b', fontSize: 10 }} 
              axisLine={false} 
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]} 
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip cursor={{ fill: '#334155', opacity: 0.2 }} content={<CustomTooltip />} />
            <Bar dataKey="expRate" radius={[4, 4, 0, 0]} barSize={40}>
              {historyData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index === historyData.length - 1 ? '#2dd4bf' : '#2dd4bf'} 
                  opacity={index === historyData.length - 1 ? 1 : 0.6} 
                />
              ))}
            </Bar>
          </BarChart>
        )}
      </div>
    </div>
  );
};

/**
 * 統一七日成長計算邏輯
 * @param historyData 由 fetchWeeklyHistory 取得的陣列
 * @returns 七日成長字串（+Lv 或 +%）
 */
export function calculateWeeklyGrowth(historyData: any[]): string {
  if (!historyData || historyData.length < 2) return '- %';
  const start = historyData[0];
  const end = historyData[historyData.length - 1];
  let levelDiff = end.level - start.level;
  // 防呆：等級沒變但經驗掉很多 -> 視為升級
  if (levelDiff === 0 && (end.expRate - start.expRate) < -40) {
    levelDiff = 1;
  }
  let rawGrowth = 0;
  if (levelDiff > 0) {
    rawGrowth = (levelDiff * 100) + end.expRate - start.expRate;
    return `+${levelDiff} Lv`;
  } else {
    rawGrowth = end.expRate - start.expRate;
    return `${rawGrowth >= 0 ? '+' : ''}${rawGrowth.toFixed(3)}%`;
  }
}

export default ExpTrendChart;