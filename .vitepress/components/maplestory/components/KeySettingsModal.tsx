import React from 'react';
import { Settings, X } from 'lucide-react';

interface KeySettingsModalProps {
  show: boolean;
  onClose: () => void;
  geminiKey: string | null;
  setGeminiKey: (key: string | null) => void;
  geminiModel: string;
  setGeminiModel: (model: string) => void;
}

const KeySettingsModal: React.FC<KeySettingsModalProps> = ({
  show,
  onClose,
  geminiKey,
  setGeminiKey,
  geminiModel,
  setGeminiModel
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-500 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" /> 設定 AI Key
        </h2>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">API Key</label>
            <input
              type="password"
              value={geminiKey || ''}
              placeholder="貼上您的 Gemini API Key..."
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-indigo-500 outline-none"
              onChange={(e) => {
                const val = e.target.value.trim();
                setGeminiKey(val || null);
                if (val) localStorage.setItem('gemini_api_key', val);
                else localStorage.removeItem('gemini_api_key');
              }}
            />
          </div>
          <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">AI 模型</label>
            <select
              value={geminiModel}
              onChange={(e) => {
                setGeminiModel(e.target.value);
                localStorage.setItem('gemini_model', e.target.value);
              }}
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-indigo-500 outline-none appearance-none"
            >
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (最新旗艦 / 需付費)</option>
              <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash-Lite (最新預設 / 免費極速)</option>
              <option value="gemini-3-flash-preview">Gemini 3.0 Flash (舊版預設 / 極速)</option>
              <option value="gemini-3-pro-preview">Gemini 3.0 Pro (高階模型 / 需付費)</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (穩定首選)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (舊版高階 / 需付費)</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeySettingsModal;
