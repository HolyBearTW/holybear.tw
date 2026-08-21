import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { updateLogs } from '../data/changelog';

const UPDATE_LOGS_PER_PAGE = 5;

export default function UpdateLogBoard() {
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const showImportantNotice = new Date() < new Date('2026-04-01T00:00:00');
  const totalPages = Math.max(1, Math.ceil(updateLogs.length / UPDATE_LOGS_PER_PAGE));
  const visibleLogs = updateLogs.slice(
    (page - 1) * UPDATE_LOGS_PER_PAGE,
    page * UPDATE_LOGS_PER_PAGE
  );

  const goToPage = (event: React.FormEvent) => {
    event.preventDefault();
    const requestedPage = Number.parseInt(pageInput, 10);
    const nextPage = Number.isFinite(requestedPage)
      ? Math.min(Math.max(requestedPage, 1), totalPages)
      : page;
    setPageInput(String(nextPage));
    setPage(nextPage);
  };

  const changePage = (nextPage: number) => {
    const normalizedPage = Math.min(Math.max(nextPage, 1), totalPages);
    setPage(normalizedPage);
    setPageInput(String(normalizedPage));
  };

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
            <p>為保障網站與使用者安全，<strong>本站不會內建或代管 Gemini／OpenAI API Key</strong>。</p>
            <p>若您需要使用「AI 戰力分析」功能，請點擊右上方的 <strong>「齒輪」</strong> 按鈕，填寫自己的 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline text-red-700 dark:text-red-300">Google Gemini API Key</a> 或 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline text-red-700 dark:text-red-300">OpenAI API Key</a>。</p>
          </div>
        </div>
      )}

      {/* 🔹 更新日誌區塊 */}
      <div className="vp-tip custom-vp-tip p-4 sm:p-6 rounded-lg border-l-4 border-indigo-400 bg-indigo-50/90 text-indigo-900 dark:bg-[#23263a] dark:text-indigo-200 dark:border-indigo-500 shadow-sm transition-all duration-300 w-full max-w-2xl">
        <div className="font-bold mb-1 text-indigo-700 dark:text-indigo-300 flex justify-between items-center">
          <span className="font-bold">更新日誌</span>
        </div>
        <ul className="list-disc pl-5 text-sm space-y-1 mt-3 animate-in fade-in slide-in-from-top-1">
          {visibleLogs.map((item, idx) => (
            <li key={`${item.date}-${(page - 1) * UPDATE_LOGS_PER_PAGE + idx}`}>
              <span className="font-mono text-xs text-indigo-700 dark:text-indigo-300">{item.date}</span> {item.content}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-indigo-300/30 pt-3 text-xs">
          <span>第 {page} / {totalPages} 頁</span>
          <form onSubmit={goToPage} className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => changePage(page - 1)}
              className="rounded border border-indigo-400/50 px-2 py-1 transition-colors hover:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一頁
            </button>
            <label htmlFor="update-log-page" className="sr-only">輸入更新日誌頁次</label>
            <input
              id="update-log-page"
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              className="w-16 rounded border border-indigo-400/50 bg-transparent px-2 py-1 text-center outline-none focus:border-indigo-300"
            />
            <button
              type="submit"
              className="rounded bg-indigo-600 px-2 py-1 font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              前往
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => changePage(page + 1)}
              className="rounded border border-indigo-400/50 px-2 py-1 transition-colors hover:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一頁
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
