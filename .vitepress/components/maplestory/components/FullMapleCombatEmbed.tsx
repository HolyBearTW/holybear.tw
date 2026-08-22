import React from 'react';
import { LoaderCircle } from 'lucide-react';
import type { DashboardData } from '../types';
import type { MapleCombatController } from '../maplecombat-full/mount';

export type MapleCombatSection = 'character' | 'buffs' | 'weighted' | 'equipment' | 'efficiency';

export interface MapleCombatSectionResult {
  section: MapleCombatSection;
  baselinePower: number;
  projectedPower: number;
  actualPercentChange: number | null;
}

interface FullMapleCombatEmbedProps {
  data: DashboardData;
  section: MapleCombatSection;
  onDirtyChange: (dirty: boolean) => void;
  onResultChange: (result: MapleCombatSectionResult) => void;
  onReadyChange?: (ready: boolean) => void;
}

export interface FullMapleCombatEmbedHandle {
  resetFromCharacter: () => void;
  clearAll: () => void;
}

const FullMapleCombatEmbed = React.forwardRef<FullMapleCombatEmbedHandle, FullMapleCombatEmbedProps>(({
  data,
  section,
  onDirtyChange,
  onResultChange,
  onReadyChange,
}, ref) => {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const controllerRef = React.useRef<MapleCombatController | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let disposed = false;
    const host = hostRef.current;
    if (!host) return;
    setLoading(true);
    setError('');
    onReadyChange?.(false);

    const currentTheme = () => document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const observer = new MutationObserver(() => controllerRef.current?.setTheme(currentTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    import('../maplecombat-full/mount')
      .then(({ mountMapleCombat }) => mountMapleCombat(host, {
        data,
        theme: currentTheme(),
        section,
        onDirtyChange,
        onResultChange,
      }))
      .then((controller) => {
        if (disposed) {
          controller.unmount();
          return;
        }
        controllerRef.current = controller;
        setLoading(false);
        onReadyChange?.(true);
      })
      .catch((reason) => {
        if (disposed) return;
        console.error('[MapleCombat] 完整計算機載入失敗', reason);
        setError(reason instanceof Error ? reason.message : '完整計算機載入失敗');
        setLoading(false);
        onReadyChange?.(false);
      });

    return () => {
      disposed = true;
      observer.disconnect();
      controllerRef.current?.unmount();
      controllerRef.current = null;
      onDirtyChange(false);
      onReadyChange?.(false);
    };
  }, [data, onDirtyChange, onReadyChange, onResultChange]);

  React.useEffect(() => {
    controllerRef.current?.setSection(section);
  }, [section]);

  const resetFromCharacter = () => {
    if (!controllerRef.current) return;
    const confirmed = window.confirm(
      '要重新讀取這次查詢到的角色資料嗎？目前手動修改的欄位會被角色資料覆蓋，但先前內容仍可先用右上角「儲存」匯出。',
    );
    if (confirmed) controllerRef.current.resetFromCharacter();
  };

  const clearAll = () => {
    if (!controllerRef.current) return;
    const confirmed = window.confirm(
      '要清空這隻角色的計算機輸入與所有 Buff 情境嗎？清空後可按「重新帶入角色資料」恢復 API 基準。',
    );
    if (confirmed) controllerRef.current.clearAll();
  };

  React.useImperativeHandle(ref, () => ({ resetFromCharacter, clearAll }), []);

  return (
    <section className="mt-4">
      {loading && (
        <div className="maple-calculator-full-loading flex min-h-80 items-center justify-center rounded-xl border border-slate-800 bg-[#0d1117]/65">
          <div className="flex flex-col items-center gap-3 text-sm font-bold text-emerald-300">
            <LoaderCircle className="h-7 w-7 animate-spin" />
            正在載入完整公式、Buff 與五狀態資料…
          </div>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-400/35 bg-rose-950/30 p-4 text-sm text-rose-200">
          完整計算機載入失敗：{error}
        </div>
      )}
      <div ref={hostRef} className={loading || error ? 'hidden' : 'block'} />
    </section>
  );
});

FullMapleCombatEmbed.displayName = 'FullMapleCombatEmbed';

export default FullMapleCombatEmbed;
