import React, { useState, useEffect, useRef } from 'react';
import { StatBreakdown } from '../services/statCalculator';

interface StatTooltipProps {
  label: string;
  value?: string;
  suffix?: string;
  breakdown?: StatBreakdown | null;
  children?: React.ReactNode;
}

const StatTooltip: React.FC<StatTooltipProps> = ({ label, value, suffix, breakdown, children }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 處理點擊外部關閉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const showTooltip = (isHovered || isOpen) && breakdown;
  
  const tooltipContent = showTooltip && (
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-80 bg-[#161b22] border border-slate-700/80 rounded-lg shadow-2xl p-3 z-[100] text-[11px] pointer-events-none animate-in fade-in zoom-in-95 duration-150">
       <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#161b22] border-r border-b border-slate-700/80 rotate-45"></div>
       <h4 className="font-bold text-white mb-2 pb-1 border-b border-slate-700/50 text-center flex items-center justify-center gap-2">
           {label}
           <div className="ml-auto text-[10px] text-slate-500 font-normal px-1.5 py-0.5 border border-slate-800 rounded bg-slate-900/50">來源分析</div>
       </h4>
       <div className="space-y-4">
          {breakdown!.sections.map((section, idx) => (
              <div key={idx}>
                  {section.title && <div className="font-bold text-yellow-500 mb-1.5 flex items-center gap-1">
                       <span className="w-1 h-3 bg-yellow-500 rounded-full inline-block"></span>
                       {section.title}
                  </div>}
                  <div className="space-y-1 pl-1">
                      {section.items.map((item, i) => (
                          <div key={i} className="flex justify-between items-center">
                              <span className="text-slate-400">{item.label}</span>
                              <span className="font-mono text-slate-200">{item.value}</span>
                          </div>
                      ))}
                  </div>
                  {section.summary && (
                      <div className="mt-1 pt-1 border-t border-slate-800 text-right text-yellow-500/80 italic text-[10px] whitespace-pre-wrap">
                          {section.summary}
                      </div>
                  )}
              </div>
          ))}
       </div>
    </div>
  );

  const triggerClass = breakdown 
    ? "cursor-help decoration-slate-500 decoration-dashed underline underline-offset-4" 
    : "";

  if (children) {
      if (breakdown) {
        return (
            <div 
                ref={containerRef}
                className="relative inline-block"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={triggerClass}>{children}</span>
                {tooltipContent}
            </div>
          );
      }
      return <>{children}</>;
  }

  // If no breakdown, render simple row without handlers
  if (!breakdown) {
      return (
        <div className="flex justify-between items-center text-xs border-b border-slate-800/30 pb-1 last:border-0 px-1 -mx-1">
            <span className="text-slate-500">{label}</span>
            <span className="text-slate-300 font-mono">
                {value}{suffix || ''}
            </span>
        </div>
      );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative flex justify-between items-center text-xs border-b border-slate-800/30 pb-1 last:border-0 hover:bg-white/5 transition-colors px-1 -mx-1 rounded group cursor-pointer ${isOpen ? 'bg-white/5' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsOpen(!isOpen)}
    >
        <span className="text-slate-500 decoration-slate-500 decoration-dashed underline underline-offset-4 cursor-help">{label}</span>
        <span className="text-slate-300 font-mono group-hover:text-white transition-colors">
            {value}{suffix || ''}
        </span>
        {tooltipContent}
    </div>
  );
};

export default StatTooltip;
