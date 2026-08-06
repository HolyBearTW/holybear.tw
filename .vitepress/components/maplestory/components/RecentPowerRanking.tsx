import React from 'react';
import { Crown } from 'lucide-react';
import { SERVER_ICONS } from '../constants';
import { fetchMaplerHousePowerRanking } from '../services/maplerhouseService';

interface RecentPowerRankingEntry {
  characterName: string;
  worldName: string;
  jobName: string;
  level: number;
  characterImage: string;
  combatPower: number;
}

interface RecentPowerRankingProps {
  onSelectCharacter: (name: string) => void;
}

const RecentPowerRanking: React.FC<RecentPowerRankingProps> = ({ onSelectCharacter }) => {
  const [items, setItems] = React.useState<RecentPowerRankingEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchMaplerHousePowerRanking()
      .then((ranking) => {
        if (!active) return;
        setItems(ranking);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : '讀取排行榜失敗';
        setError(message);
        setItems([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto mt-6 bg-[#161b22] border border-slate-800 rounded-xl shadow-lg p-4 text-sm text-slate-400">
        正在載入近期戰力排名...
      </div>
    );
  }

  if (error || items.length === 0) {
    return null;
  }

  return (
    <div className="max-w-xl mx-auto mt-6 bg-[#161b22] border border-slate-800 rounded-xl shadow-lg p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-200">
        <Crown className="w-4 h-4 text-yellow-400" />
        近期戰力排名
      </h3>
      <div className="space-y-1">
        {items.map((item, idx) => (
          <button
            key={item.characterName}
            type="button"
            onClick={() => onSelectCharacter(item.characterName)}
            className="w-full text-left flex items-center gap-3 py-1.5 px-2 rounded hover:bg-slate-800/70 transition-colors"
          >
            <span className={`text-xs font-mono w-5 text-center shrink-0 ${idx < 3 ? 'text-indigo-300 font-bold' : 'text-slate-500'}`}>
              {idx + 1}
            </span>
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-800 shrink-0">
              <img
                alt={item.characterName}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-cover"
                src={item.characterImage}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                {SERVER_ICONS[item.worldName] ? (
                  <img alt={item.worldName} width={14} height={14} className="shrink-0" src={SERVER_ICONS[item.worldName]} />
                ) : null}
                <p className="text-xs font-semibold truncate text-slate-200">{item.characterName}</p>
              </div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">{item.worldName}・Lv.{item.level}・{item.jobName}</div>
              <div className="text-xs text-slate-400 mt-0.5">{item.combatPower.toLocaleString()}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentPowerRanking;
