import { useState } from 'react';
import { Settings, X, Crown } from 'lucide-react';
import { mapleAsset } from '../assets';

interface HeroHeaderProps {
  apiKey: string | null;
  onShowKeySettings: () => void;
  onClearApiKey: () => void;
}

export default function HeroHeader({ apiKey, onShowKeySettings, onClearApiKey }: HeroHeaderProps) {
  return (
    <>
      <div className="absolute top-8 right-6">
        <button 
          onClick={onShowKeySettings}
          className="maple-settings-button p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors flex items-center gap-2"
          title="AI 與 API 設定"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <a href="/maplestory" className="maple-hero-brand flex items-center gap-3 rounded-lg transition-opacity hover:opacity-85" aria-label="返回新楓之谷戰力分析首頁" title="返回分析首頁">
        <div className="w-12 h-12 flex items-center justify-center">
          <img
            src={mapleAsset('Maple_Icon.webp')}
            alt="MapleStory Icon"
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <h1 className="maple-hero-title font-bold text-2xl text-white">新楓之谷戰力分析</h1>
      </a>
      <p className="maple-hero-subtitle text-slate-400 text-sm">輸入角色名稱，查看詳細戰力與裝備分析</p>
    </>
  );
}
