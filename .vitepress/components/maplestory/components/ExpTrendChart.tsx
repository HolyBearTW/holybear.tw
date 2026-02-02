import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface ExpTrendChartProps {
  historyData: any[];
  loading: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1a1d24] border border-slate-700 p-3 rounded-lg shadow-xl text-xs">
        <div className="text-slate-400 mb-1 flex items-center justify-between gap-4 border-b border-slate-700 pb-1">
            <span className="font-bold text-slate-200">{data.relativeLabel}</span>
            <span className="text-[10px] opacity-60 text-slate-500">{data.date}</span>
        </div>
        <p className="text-indigo-400 font-bold mb-1 mt-1">
          Lv.{data.level} ({data.expRate}%)
        </p>
        {data.growthLabel && data.growthLabel !== '無紀錄' && (
             <div className={`flex items-center gap-1 font-medium ${data.isGrowthPositive ? 'text-green-400' : 'text-red-400'}`}>
                <span>{data.isGrowthPositive ? '成長' : '變動'}:</span>
                <span>{data.growthLabel}</span>
             </div>
        )}
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
  
  // === 每日成長計算 (Pre-process) ===
  const processedData = React.useMemo(() => {
    if (!historyData) return [];
    const len = historyData.length;
    return historyData.map((curr, idx) => {
      let growthLabel = '無紀錄';
      let isGrowthPositive = true;
      
      // Relative Date Label Calculation
      const daysAgo = len - 1 - idx;
      const relativeLabel = daysAgo === 0 ? '最新' : `${daysAgo}日前`;
      
      if (idx > 0) {
        const prev = historyData[idx - 1];
        let levelDiff = curr.level - prev.level;
        let expDiff = curr.expRate - prev.expRate;
        
        // 防呆：等級沒變但經驗大幅減少 -> 可能是升級但資料尚未同步
        if (levelDiff === 0 && expDiff < -40) {
             levelDiff = 1;
        }

        if (levelDiff > 0) {
           // 升級情況: 粗略估算 % (假設 100% 制)
           // 算法: (100 - 前日) + 當日 + (等級差-1)*100
           const gain = (100 - prev.expRate) + curr.expRate + (levelDiff - 1) * 100;
           growthLabel = `+${gain.toFixed(3)}% (升級)`;
           isGrowthPositive = true;
        } else if (levelDiff === 0) {
           // 同等級
           if (expDiff >= 0) {
              growthLabel = `+${expDiff.toFixed(3)}%`;
              isGrowthPositive = true;
           } else {
              growthLabel = `${expDiff.toFixed(3)}%`;
              isGrowthPositive = false;
           }
        } else {
           // 掉等?
           growthLabel = `${levelDiff} Lv`;
           isGrowthPositive = false;
        }
      } else {
          // 第一筆資料，無從比較，或是顯示當日數值? 
          // 通常顯示無紀錄或 -
          growthLabel = '無紀錄';
      }

      return { ...curr, growthLabel, isGrowthPositive, relativeLabel };
    });
  }, [historyData]);
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

      <div ref={containerRef} style={{ width: '100%', height: 150, minHeight: 150 }} className="outline-none [&_*]:outline-none [&_path]:outline-none [&_svg]:outline-none focus:outline-none [&:focus-visible]:outline-none">
        {chartWidth > 0 && (
          <BarChart 
            className="outline-none focus:outline-none"
            width={chartWidth} 
            height={150} 
            data={processedData} 
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
            <XAxis 
              dataKey="relativeLabel" 
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
            <Tooltip 
                cursor={{ fill: '#334155', opacity: 0.2 }} 
                content={<CustomTooltip />} 
                isAnimationActive={false}
            />
            <Bar 
                dataKey="expRate" 
                radius={[4, 4, 0, 0]} 
                barSize={40}
                isAnimationActive={true}
                activeBar={false}
            >
              {processedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index === processedData.length - 1 ? '#2dd4bf' : '#2dd4bf'} 
                  opacity={index === processedData.length - 1 ? 1 : 0.6}
                  strokeWidth={0}
                  className="outline-none focus:outline-none"
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