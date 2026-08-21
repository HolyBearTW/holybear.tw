import React from 'react';
import { ExternalLink, Settings, X } from 'lucide-react';
import { AI_MODEL_OPTIONS } from '../data/aiModels';

interface KeySettingsModalProps {
  show: boolean;
  onClose: () => void;
  geminiKey: string | null;
  setGeminiKey: (key: string | null) => void;
  openAiKey: string | null;
  setOpenAiKey: (key: string | null) => void;
  geminiModel: string;
  setGeminiModel: (model: string) => void;
}

const KeySettingsModal: React.FC<KeySettingsModalProps> = ({
  show,
  onClose,
  geminiKey,
  setGeminiKey,
  openAiKey,
  setOpenAiKey,
  geminiModel,
  setGeminiModel
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
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
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Google Gemini API Key</label>
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
            <p className="mt-1.5 text-xs text-slate-500">
              還沒有金鑰？前往{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline">
                Google AI Studio 建立 Gemini API Key <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">OpenAI API Key（GPT 模型）</label>
            <input
              type="password"
              value={openAiKey || ''}
              placeholder="貼上您的 OpenAI API Key..."
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-indigo-500 outline-none"
              onChange={(e) => {
                const val = e.target.value.trim();
                setOpenAiKey(val || null);
                if (val) localStorage.setItem('openai_api_key', val);
                else localStorage.removeItem('openai_api_key');
              }}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              GPT 模型使用 OpenAI API Key（不是 ChatGPT 登入密碼）。前往{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline">
                OpenAI Platform 建立 OpenAI API Key <ExternalLink className="w-3 h-3" />
              </a>
              ；是否產生費用依帳戶現有試用、贈送或預付額度為準。
            </p>
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
              <optgroup label="Google Gemini">
                {AI_MODEL_OPTIONS.filter(option => option.provider === 'google').map(option => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </optgroup>
              <optgroup label="OpenAI GPT（依 API 額度計費）">
                {AI_MODEL_OPTIONS.filter(option => option.provider === 'openai').map(option => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-slate-500">
          API Key 只會儲存在目前瀏覽器的本機儲存空間；請勿在公用裝置輸入或將金鑰分享給他人。
        </p>
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
