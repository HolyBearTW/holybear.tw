import { useState } from 'react';
import { AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { updateLogs } from '../data/changelog';

export default function UpdateLogBoard() {
  const [showUpdateLog, setShowUpdateLog] = useState(false);
  const showImportantNotice = new Date() < new Date('2026-04-01T00:00:00');

  return (
    <div className="my-8 flex flex-col items-center gap-4">
      {/* 🔴 緊急紅色公告 (顯示到 2026/03/31) */}
      {showImportantNotice && (
        <div className="vp-tip custom-vp-tip-danger p-4 sm:p-6 rounded-lg border-l-4 border-red-500 bg-red-50/90 text-red-900 dark:bg-red-950/30 dark:text-red-200 shadow-sm transition-all duration-300 w-full max-w-2xl">
          <div className="font-bold mb-2 text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            【重要】安全機制更新公告
          </div>
          <div className="text-sm space-y-2 opacity-90 leading-relaxed">
            <p>為保障網站與使用者安全，<strong>本站已移除內建的 Gemini API 金鑰</strong>。</p>
            <p>若您需要使用「AI 戰力分析」功能，請點擊右上方的 <strong> 「齒輪」</strong> 按鈕，填寫您自己申請的免費 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline text-red-700 dark:text-red-300">Google Gemini API 金鑰</a>。</p>
          </div>
        </div>
      )}

      {/* 🔹 更新日誌區塊 */}
      <div className="vp-tip custom-vp-tip p-4 sm:p-6 rounded-lg border-l-4 border-indigo-400 bg-indigo-50/90 text-indigo-900 dark:bg-[#23263a] dark:text-indigo-200 dark:border-indigo-500 shadow-sm transition-all duration-300 w-full max-w-2xl">
        <div 
          className="font-bold mb-1 text-indigo-700 dark:text-indigo-300 flex justify-between items-center cursor-pointer select-none"
          onClick={() => setShowUpdateLog(!showUpdateLog)}
        >
          <span className="font-bold">更新日誌 {showUpdateLog ? '' : '(近期)'}</span>
          {showUpdateLog ? <ChevronUp className="w-4 h-4 ml-2 opacity-70" /> : <ChevronDown className="w-4 h-4 ml-2 opacity-70" />}
        </div>
        <ul className="list-disc pl-5 text-sm space-y-1 mt-3 animate-in fade-in slide-in-from-top-1">
          {updateLogs
            .slice(0, showUpdateLog ? undefined : 5)
            .map((item, idx) => (
              <li key={idx}>
                <span className="font-mono text-xs text-indigo-700 dark:text-indigo-300">{item.date}</span> {item.content}
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}