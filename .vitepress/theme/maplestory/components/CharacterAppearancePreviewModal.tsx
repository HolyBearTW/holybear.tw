import React from 'react';
import { createPortal } from 'react-dom';
import { Eye, Info, RotateCcw, X } from 'lucide-react';

interface CharacterAppearancePreviewModalProps {
  characterImage: string;
  onClose: () => void;
}

const ACTION_OPTIONS = [
  ['A00', '站立 1（預設）'], ['A01', '站立 2'], ['A02', '行走 1'], ['A03', '行走 2'],
  ['A04', '趴下'], ['A05', '飛行'], ['A06', '跳躍'], ['A07', '坐下'],
  ['A08', '攀爬梯子'], ['A09', '攀爬繩索'], ['A10', '回復'], ['A11', '警戒'],
  ['A12', '趴下攻擊'], ['A13', '單手揮砍 1'], ['A14', '單手揮砍 2'], ['A15', '單手揮砍 3'],
  ['A16', '單手揮砍終結'], ['A17', '長柄揮砍 1'], ['A18', '長柄揮砍 2'], ['A19', '長柄揮砍終結'],
  ['A20', '雙手揮砍 1'], ['A21', '雙手揮砍 2'], ['A22', '雙手揮砍 3'], ['A23', '雙手揮砍終結'],
  ['A24', '單手刺擊 1'], ['A25', '單手刺擊 2'], ['A26', '單手刺擊終結'],
  ['A27', '雙手刺擊 1'], ['A28', '雙手刺擊 2'], ['A29', '雙手刺擊終結'],
  ['A30', '射擊 1'], ['A31', '射擊 2'], ['A32', '射擊終結'], ['A33', '倒下'],
  ['A34', '幽靈行走'], ['A35', '幽靈站立'], ['A36', '幽靈跳躍'], ['A37', '幽靈趴下攻擊'],
  ['A38', '幽靈攀梯'], ['A39', '幽靈攀繩'], ['A40', '幽靈飛行'], ['A41', '幽靈坐下'],
] as const;

const EMOTION_OPTIONS = [
  ['E00', '一般（預設）'], ['E01', '眨眼'], ['E02', '微笑'], ['E03', '哭泣'], ['E04', '生氣'],
  ['E05', '困惑'], ['E06', '閉眼'], ['E07', '燃燒'], ['E08', '鞠躬'], ['E09', '歡呼'],
  ['E10', '親吻'], ['E11', '不滿'], ['E12', '絕望'], ['E13', '閃亮'], ['E14', '受擊'],
  ['E15', '炎熱'], ['E16', '哼歌'], ['E17', '愛心'], ['E18', '驚訝'], ['E19', '痛苦'],
  ['E20', '煩惱'], ['E21', '憂鬱'], ['E22', '發光'], ['E23', '暈眩'], ['E24', '嘔吐'],
] as const;

const WEAPON_MOTION_OPTIONS = [
  ['W00', '預設動作'],
  ['W01', '單手武器'],
  ['W02', '雙手武器'],
  ['W03', '槍械武器'],
  ['W04', '隱藏武器'],
] as const;

const PreviewSelect = ({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
}) => (
  <label htmlFor={id} className="block">
    <span className="mb-1.5 block text-sm font-bold text-slate-200">{label}</span>
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="maple-appearance-preview-field w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
    >
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>{optionLabel}</option>
      ))}
    </select>
  </label>
);

const CharacterAppearancePreviewModal: React.FC<CharacterAppearancePreviewModalProps> = ({
  characterImage,
  onClose,
}) => {
  const [action, setAction] = React.useState('A00');
  const [emotion, setEmotion] = React.useState('E00');
  const [weaponMotion, setWeaponMotion] = React.useState('W00');
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const previewUrl = React.useMemo(() => {
    try {
      const url = new URL(characterImage);
      url.searchParams.set('action', action);
      url.searchParams.set('emotion', emotion);
      url.searchParams.set('wmotion', weaponMotion);
      return url.toString();
    } catch {
      return characterImage;
    }
  }, [action, characterImage, emotion, weaponMotion]);

  React.useEffect(() => setImageError(false), [previewUrl]);

  const resetPreview = () => {
    setAction('A00');
    setEmotion('E00');
    setWeaponMotion('W00');
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-appearance-preview-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="maple-calculator-panel maple-appearance-preview-panel flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#111722] shadow-2xl shadow-black/70">
        <header className="maple-calculator-titlebar flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 bg-[#111722] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 rounded-xl bg-cyan-500/15 p-2.5 text-cyan-300"><Eye className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <h2 id="character-appearance-preview-title" className="text-lg font-black text-white">外型預覽</h2>
              <p className="mt-0.5 text-xs text-slate-400">使用 NEXON Open API 即時產生角色外型</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={onClose}
              className="maple-appearance-preview-close rounded-lg border border-slate-700 bg-slate-800/60 p-2 text-slate-400 transition hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              aria-label="關閉外型預覽"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="maple-appearance-preview-content flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="relative flex min-h-48 items-center justify-center rounded-xl border border-slate-800 bg-[#0d1117]/55">
          {!imageError ? (
            <img
              key={previewUrl}
              src={previewUrl}
              alt="角色外型預覽"
              className="h-48 w-48 object-contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <p className="px-4 text-center text-sm text-slate-400">目前的動作組合無法顯示，請嘗試其他選項。</p>
          )}
          <button
            type="button"
            onClick={resetPreview}
            className="absolute right-2 top-2 rounded-lg border border-slate-700 bg-slate-800/60 p-2 text-slate-400 transition hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            aria-label="重設外型預覽"
            title="重設"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <PreviewSelect id="appearance-action" label="動作" value={action} options={ACTION_OPTIONS} onChange={setAction} />
          <PreviewSelect id="appearance-emotion" label="表情" value={emotion} options={EMOTION_OPTIONS} onChange={setEmotion} />
          <PreviewSelect id="appearance-weapon-motion" label="武器動作" value={weaponMotion} options={WEAPON_MOTION_OPTIONS} onChange={setWeaponMotion} />
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-700/60 bg-slate-800/70 px-3 py-2 text-xs leading-relaxed text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>圖像由 NEXON Open API 產生，部分動作或裝備組合可能無法正常顯示。</span>
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CharacterAppearancePreviewModal;
