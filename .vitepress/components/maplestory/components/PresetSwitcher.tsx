import React from 'react';
import { Info } from 'lucide-react';

interface PresetSwitcherProps {
  currentPreset: number;
  onPresetChange: (p: number) => void;
  activePresetNo?: number | string;
  label?: string;
  showBase?: boolean; // 新增控制開關：是否顯示 0
  extraControls?: React.ReactNode;
  className?: string;
}

const PresetSwitcher: React.FC<PresetSwitcherProps> = ({ 
  currentPreset, 
  onPresetChange, 
  activePresetNo,
  label = "預設",
  showBase = false, // 預設不顯示 0，只有時裝才開啟
  extraControls,
  className = ''
}) => {
  const activeNum = activePresetNo ? parseInt(String(activePresetNo)) : 0;
  
  // 根據 showBase 決定按鈕列表
  const buttons = showBase ? [0, 1, 2, 3] : [1, 2, 3];

  return (
    <div className={`flex flex-col gap-2 mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 ${className}`}>
      <div className="flex justify-between items-center gap-1">
        
        {/* Left Side: Label and Badge/Extra */}
        <div className="flex items-center gap-2 min-w-0">
            {/* Label */}
            <span className="text-sm font-bold text-slate-300 whitespace-nowrap">{label}切換</span>
            
            {/* Column: Badge + Extra */}
            <div className="flex flex-col gap-1 items-start min-w-0">
               {/* Badge Row */}
               <div className="flex items-center">
                  {activeNum > 0 ? (
                    <span className="text-[10px] leading-none bg-green-900/40 text-green-400 px-2 py-0.5 rounded border border-green-800 flex items-center gap-1 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                        <span>生效中: 預設 {activeNum}</span>
                    </span>
                  ) : null}
               </div>

               {/* Extra Controls */}
               {extraControls && <div>{extraControls}</div>}
            </div>
        </div>

        {/* Right Side: Buttons */}
        <div className="flex gap-1 shrink-0 ml-auto pl-1">
            {buttons.map((num) => (
              <button
                key={num}
                onClick={() => onPresetChange(num)}
                className={`
                  w-8 h-8 rounded-md text-sm font-bold transition-all flex items-center justify-center relative flex-shrink-0
                  ${currentPreset === num 
                    ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.4)] border border-indigo-400' 
                    : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300 border border-slate-700'}
                `}
                title={num === 0 ? "當前實際穿戴 (Base)" : `預設 ${num}`}
              >
                {num === 0 ? "0" : num}
                {/* 綠點邏輯：
                    1. 如果 activeNum 存在且等於 num -> 亮燈
                    2. 如果是時裝(0)且沒有 activeNum -> 視為 0 生效 -> 亮燈
                */}
                {((activeNum === num) || (num === 0 && !activeNum && showBase)) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 border-2 border-slate-900 rounded-full"></span>
                )}
              </button>
            ))}
        </div>
      </div>
      
      {/* 提示警語 */}
      {(currentPreset !== activeNum && !(currentPreset === 0 && !activeNum)) && (
        <div className="flex items-start gap-2 text-[11px] text-yellow-500/80 bg-yellow-900/10 p-2 rounded border border-yellow-900/20 leading-relaxed animate-in fade-in slide-in-from-top-1">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p>您正在查看非生效中的預設，僅供參考。</p>
        </div>
      )}
    </div>
  );
};

export default PresetSwitcher;