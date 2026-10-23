import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { StatBreakdown } from '../services/statCalculator';
import './statTooltip.css';

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
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const [arrowLeft, setArrowLeft] = useState(160);

  // 處理點擊外部關閉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node) && !tooltipRef.current?.contains(event.target as Node)) {
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

  useLayoutEffect(() => {
    if (!showTooltip) return;
    const updatePosition = () => {
      const trigger = containerRef.current;
      const tooltip = tooltipRef.current;
      if (!trigger || !tooltip) return;

      const padding = 10;
      const gap = 8;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(320, window.innerWidth - padding * 2);
      const height = tooltip.offsetHeight;
      const center = rect.left + rect.width / 2;
      const left = Math.max(padding, Math.min(center - width / 2, window.innerWidth - width - padding));
      const above = rect.top - height - gap;
      const fitsBelow = rect.bottom + gap + height <= window.innerHeight - padding;
      const nextPlacement = above >= padding || !fitsBelow ? 'top' : 'bottom';
      const top = nextPlacement === 'top' ? above : rect.bottom + gap;

      setPlacement(nextPlacement);
      setArrowLeft(Math.max(12, Math.min(center - left, width - 12)));
      setTooltipStyle({
        top: Math.max(padding, Math.min(top, window.innerHeight - height - padding)),
        left,
        width,
        visibility: 'visible',
      });
    };

    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    if (tooltipRef.current) observer.observe(tooltipRef.current);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showTooltip]);
  
  const tooltipContent = showTooltip && (
    <div ref={tooltipRef} style={tooltipStyle} role="tooltip" onClick={(event) => event.stopPropagation()} className={`maple-stat-tooltip fixed w-80 font-sans border border-slate-700/80 rounded-lg shadow-2xl p-3 z-[20000] text-[11px] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'} animate-in fade-in duration-150`}>
       <div style={{ left: arrowLeft }} className={`maple-stat-tooltip-arrow absolute ${placement === 'top' ? '-bottom-1 border-r border-b' : '-top-1 border-l border-t'} -translate-x-1/2 w-2 h-2 border-slate-700/80 rotate-45`}></div>
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

  // Escape card and layout stacking contexts, including seasonal decorations.
  // The popup stylesheet preserves its light/dark palette outside the tool root.
  const tooltipPortal = tooltipContent && typeof document !== 'undefined'
    ? createPortal(tooltipContent, document.body)
    : null;

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
                {tooltipPortal}
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
        {tooltipPortal}
    </div>
  );
};

export default StatTooltip;
