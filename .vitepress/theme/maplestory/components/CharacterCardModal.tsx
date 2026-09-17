import React from 'react';
import { Check, Download, Image as ImageIcon, Loader2, QrCode, X } from 'lucide-react';
import CharacterShareCard, { type CharacterCardResourceState } from './CharacterShareCard';
import { fetchHolyBearCharacterRank, type HolyBearCharacterRank } from '../services/holyBearService';
import {
  buildCharacterShareUrl,
  CHARACTER_CARD_EXPORT_SCALE,
  CHARACTER_CARD_HEIGHT,
  CHARACTER_CARD_WIDTH,
  sanitizeCharacterCardFilename,
} from '../services/shareCard';
import type { DashboardData } from '../types';

interface CharacterCardModalProps {
  data: DashboardData;
  characterImage: string;
  onClose: () => void;
}

const waitForCardAssets = async (node: HTMLElement) => {
  if (typeof document !== 'undefined' && document.fonts) await document.fonts.ready;
  const images = Array.from(node.querySelectorAll('img'));
  await Promise.all(images.map(async (image) => {
    if (!image.complete) await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        image.removeEventListener('load', finish);
        image.removeEventListener('error', finish);
        resolve();
      };
      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', finish, { once: true });
      // A cached response may complete between the initial check and listener
      // registration. Re-check immediately so export cannot wait forever.
      if (image.complete) finish();
    });
    if (image.complete && image.naturalWidth > 0 && typeof image.decode === 'function') {
      await image.decode().catch(() => undefined);
    }
  }));
};

const CharacterCardModal: React.FC<CharacterCardModalProps> = ({ data, characterImage, onClose }) => {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = React.useState(0.5);
  const [showQrCode, setShowQrCode] = React.useState(false);
  const [rank, setRank] = React.useState<HolyBearCharacterRank | null>(null);
  const [resourceState, setResourceState] = React.useState<CharacterCardResourceState>('loading');
  const [exporting, setExporting] = React.useState(false);
  const [downloaded, setDownloaded] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const characterName = data.basic.character_name;
  const shareUrl = React.useMemo(() => buildCharacterShareUrl(characterName), [characterName]);

  React.useEffect(() => {
    let active = true;
    setRank(null);
    fetchHolyBearCharacterRank(characterName)
      .then((result) => {
        if (active) setRank(result);
      })
      .catch(() => {
        if (active) setRank(null);
      });
    return () => {
      active = false;
    };
  }, [characterName]);

  React.useEffect(() => {
    const updateScale = () => {
      const width = previewRef.current?.clientWidth || 0;
      if (width > 0) setPreviewScale(Math.min(1, width / CHARACTER_CARD_WIDTH));
    };
    updateScale();
    const observer = typeof ResizeObserver !== 'undefined' && previewRef.current
      ? new ResizeObserver(updateScale)
      : null;
    if (previewRef.current) observer?.observe(previewRef.current);
    window.addEventListener('resize', updateScale);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  React.useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  React.useEffect(() => {
    setDownloaded(false);
    setExportError(null);
  }, [characterName, showQrCode]);

  const handleDownload = async () => {
    const card = cardRef.current;
    if (!card || resourceState !== 'ready' || exporting) return;
    setExporting(true);
    setDownloaded(false);
    setExportError(null);
    try {
      await waitForCardAssets(card);
      const { domToPng } = await import('modern-screenshot');
      const png = await domToPng(card, {
        width: CHARACTER_CARD_WIDTH,
        height: CHARACTER_CARD_HEIGHT,
        scale: CHARACTER_CARD_EXPORT_SCALE,
        backgroundColor: null,
        timeout: 30_000,
        fetch: { requestInit: { cache: 'force-cache', mode: 'cors' } },
      });
      const link = document.createElement('a');
      link.download = sanitizeCharacterCardFilename(characterName);
      link.href = png;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloaded(true);
    } catch (error) {
      console.error('[CharacterCard] PNG export failed', error);
      setExportError('圖卡匯出失敗，請確認圖片已載入後再試一次。');
    } finally {
      setExporting(false);
    }
  };

  const preparing = resourceState === 'loading';
  const backgroundMissing = resourceState === 'background-missing';

  return (
    <div
      className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-card-modal-title"
        className="maple-character-card-modal flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#111820] shadow-2xl"
      >
        <header className="maple-character-card-modal-header flex shrink-0 items-center justify-between gap-4 border-b border-slate-800 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 id="character-card-modal-title" className="maple-character-card-modal-title flex items-center gap-2 text-base font-black text-white sm:text-lg">
              <ImageIcon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              生成角色圖卡
            </h2>
            <p className="maple-character-card-modal-subtitle mt-0.5 truncate text-xs text-slate-500">{characterName} · 1440 × 1080 PNG</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="關閉角色圖卡視窗"
            className="maple-character-card-modal-close rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="maple-character-card-modal-body min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          <div ref={previewRef} className="maple-character-card-preview mx-auto w-full overflow-hidden rounded-xl bg-[#071323] shadow-2xl ring-1 ring-slate-700/80">
            <div style={{ width: CHARACTER_CARD_WIDTH * previewScale, height: CHARACTER_CARD_HEIGHT * previewScale }}>
              <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
                <CharacterShareCard
                  key={characterName}
                  ref={cardRef}
                  data={data}
                  characterImage={characterImage}
                  shareUrl={shareUrl}
                  showQrCode={showQrCode}
                  rank={rank}
                  onResourceStateChange={setResourceState}
                />
              </div>
            </div>
          </div>

          {backgroundMissing && (
            <div className="mx-auto mt-3 max-w-2xl rounded-lg border border-amber-500/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-200" role="alert">
              找不到故事書背景檔：<code className="ml-1 font-mono text-amber-100">/public/maplestory/share-card/night-storybook.png</code>
            </div>
          )}
          {exportError && (
            <div className="mx-auto mt-3 max-w-2xl rounded-lg border border-rose-500/40 bg-rose-950/25 px-4 py-3 text-sm text-rose-200" role="alert">
              {exportError}
            </div>
          )}
        </div>

        <footer className="maple-character-card-modal-footer flex shrink-0 flex-col gap-3 border-t border-slate-800 bg-[#0d131a] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <button
            type="button"
            role="switch"
            aria-checked={showQrCode}
            aria-label="在角色圖卡上顯示 QR Code"
            onClick={() => setShowQrCode((current) => !current)}
            className={`maple-character-card-qr-toggle inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${showQrCode ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'}`}
          >
            {showQrCode ? <Check className="h-4 w-4" aria-hidden="true" /> : <QrCode className="h-4 w-4" aria-hidden="true" />}
            顯示 QR Code
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={preparing || backgroundMissing || exporting}
            aria-label={`下載 ${characterName} 角色圖卡 PNG`}
            className="maple-character-card-download inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {exporting || preparing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : downloaded ? <Check className="h-4 w-4" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            {backgroundMissing ? '背景圖尚未就緒' : exporting ? '正在生成 PNG…' : preparing ? '圖卡準備中…' : downloaded ? '已下載，可再次下載' : '下載 PNG'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default CharacterCardModal;
