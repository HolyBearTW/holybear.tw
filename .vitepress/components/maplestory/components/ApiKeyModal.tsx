import React, { useState } from 'react';
import { Key, Lock, ExternalLink, Sparkles } from 'lucide-react';

interface ApiKeyModalProps {
  onSave: (nexonKey: string, geminiKey: string) => void;
  onDemo: () => void;
  defaultNexonKey?: string;
  defaultGeminiKey?: string;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave, onDemo, defaultNexonKey = '', defaultGeminiKey = '' }) => {
  const [nexonKey, setNexonKey] = useState(defaultNexonKey);
  const [geminiKey, setGeminiKey] = useState(defaultGeminiKey);

  // Gemini Key 即時寫入 localStorage
  const handleGeminiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGeminiKey(e.target.value);
    localStorage.setItem('gemini_api_key', e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nexonKey.trim()) {
      onSave(nexonKey.trim(), geminiKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4 text-maple-400">
          <Key className="w-8 h-8" />
          <h2 className="text-2xl font-bold text-white">需要 API 金鑰</h2>
        </div>
        
        <p className="text-slate-300 mb-6 leading-relaxed">
          若要查看真實的楓之谷 TW 數據，您需要一組 <strong>Nexon Open API Key</strong>。
          <br />
          <span className="text-xs text-slate-500 block mt-2">
            此金鑰僅會儲存在您的瀏覽器記憶體中，並直接用於向 Nexon 伺服器請求數據。
          </span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Nexon Open API Key (必填)
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={nexonKey}
                onChange={(e) => setNexonKey(e.target.value)}
                placeholder="live_..."
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-maple-500 focus:border-transparent outline-none text-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Google Gemini API Key (選填)
            </label>
            <div className="relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500" />
              <input
                type="password"
                value={geminiKey}
                onChange={handleGeminiKeyChange}
                placeholder="用於 AI 角色分析功能..."
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none text-white transition-all"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              可從 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-maple-400 hover:underline">Google AI Studio</a> 免費獲取。
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={!nexonKey}
              className="w-full bg-maple-600 hover:bg-maple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              進入儀表板
            </button>
            
            <button
              type="button"
              onClick={onDemo}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-lg transition-colors"
            >
              試用演示模式
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center">
          <a 
            href="https://openapi.nexon.com/my-application/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-maple-400 hover:text-maple-300 transition-colors"
          >
            前往 Nexon Developers 獲取 API Key <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;