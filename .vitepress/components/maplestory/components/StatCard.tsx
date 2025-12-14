import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, icon, highlight }) => {
  return (
    <div className={`p-4 rounded-lg border ${highlight ? 'bg-maple-900/20 border-maple-500/50' : 'bg-slate-800/50 border-slate-700/50'} backdrop-blur-sm transition-all hover:border-maple-500/30`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">{label}</span>
        {icon && <span className="text-maple-400">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-xl font-bold ${highlight ? 'text-maple-100' : 'text-white'}`}>
          {value.toLocaleString()}
        </span>
        {subValue && (
          <span className="text-xs text-slate-500">{subValue}</span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
