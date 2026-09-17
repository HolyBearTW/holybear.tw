import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ImageOff, UserRound } from 'lucide-react';
import { SERVER_ICONS } from '../constants';
import { resolveJobArtworkUrl } from '../jobArtwork';
import type { HolyBearCharacterRank } from '../services/holyBearService';
import {
  CHARACTER_CARD_BACKGROUND,
  CHARACTER_CARD_BRAND_LOGO,
  CHARACTER_CARD_HEIGHT,
  CHARACTER_CARD_WIDTH,
  createCharacterShareCardViewModel,
} from '../services/shareCard';
import type { DashboardData } from '../types';

export type CharacterCardResourceState = 'loading' | 'ready' | 'background-missing';

interface CharacterShareCardProps {
  data: DashboardData;
  characterImage: string;
  shareUrl: string;
  showQrCode: boolean;
  rank: HolyBearCharacterRank | null;
  onResourceStateChange?: (state: CharacterCardResourceState) => void;
}

const CharacterShareCard = React.forwardRef<HTMLDivElement, CharacterShareCardProps>(({
  data,
  characterImage,
  shareUrl,
  showQrCode,
  rank,
  onResourceStateChange,
}, ref) => {
  const view = React.useMemo(() => createCharacterShareCardViewModel(data), [data]);
  const jobArtworkUrl = React.useMemo(() => resolveJobArtworkUrl(
    data.basic.character_class,
    data.basic.character_gender,
    data.ocid || data.basic.character_name,
  ), [data.basic.character_class, data.basic.character_gender, data.basic.character_name, data.ocid]);
  const [backgroundState, setBackgroundState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [characterState, setCharacterState] = React.useState<'loading' | 'ready' | 'error'>(
    characterImage ? 'loading' : 'error',
  );
  const [jobArtworkState, setJobArtworkState] = React.useState<'loading' | 'ready' | 'error'>(
    jobArtworkUrl ? 'loading' : 'error',
  );
  const [brandLogoState, setBrandLogoState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const backgroundImageRef = React.useRef<HTMLImageElement>(null);
  const characterImageRef = React.useRef<HTMLImageElement>(null);
  const jobArtworkImageRef = React.useRef<HTMLImageElement>(null);
  const brandLogoImageRef = React.useRef<HTMLImageElement>(null);
  const resourceKey = `${view.characterName}\u0000${characterImage}\u0000${jobArtworkUrl}`;
  const previousResourceKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const isFirstRender = previousResourceKeyRef.current === null;
    previousResourceKeyRef.current = resourceKey;

    // Do not reset state on an unrelated parent render. When the actual image
    // source changes, reset first and then reconcile already-cached images so
    // a fast cache hit cannot leave the card stuck in "preparing" forever.
    if (!isFirstRender) {
      setBackgroundState('loading');
      setCharacterState(characterImage ? 'loading' : 'error');
      setJobArtworkState(jobArtworkUrl ? 'loading' : 'error');
      setBrandLogoState('loading');
    }

    const syncLoadedImages = () => {
      const backgroundImage = backgroundImageRef.current;
      if (backgroundImage?.complete) {
        setBackgroundState(backgroundImage.naturalWidth > 0 ? 'ready' : 'error');
      }

      const characterImageElement = characterImageRef.current;
      if (!characterImage) {
        setCharacterState('error');
      } else if (characterImageElement?.complete) {
        setCharacterState(characterImageElement.naturalWidth > 0 ? 'ready' : 'error');
      }

      const jobArtworkImage = jobArtworkImageRef.current;
      if (!jobArtworkUrl) {
        setJobArtworkState('error');
      } else if (jobArtworkImage?.complete) {
        setJobArtworkState(jobArtworkImage.naturalWidth > 0 ? 'ready' : 'error');
      }

      const brandLogoImage = brandLogoImageRef.current;
      if (brandLogoImage?.complete) {
        setBrandLogoState(brandLogoImage.naturalWidth > 0 ? 'ready' : 'error');
      }
    };

    syncLoadedImages();
    const frame = window.requestAnimationFrame(syncLoadedImages);
    return () => window.cancelAnimationFrame(frame);
  }, [characterImage, jobArtworkUrl, resourceKey]);

  React.useEffect(() => {
    let cancelled = false;
    if (backgroundState === 'error') {
      onResourceStateChange?.('background-missing');
      return;
    }
    if (backgroundState !== 'ready' || brandLogoState === 'loading' || characterState === 'loading' || jobArtworkState === 'loading') {
      onResourceStateChange?.('loading');
      return;
    }

    const fontsReady = typeof document !== 'undefined' && document.fonts
      ? document.fonts.ready
      : Promise.resolve();
    fontsReady.then(() => {
      if (!cancelled) onResourceStateChange?.('ready');
    });
    return () => {
      cancelled = true;
    };
  }, [backgroundState, brandLogoState, characterState, jobArtworkState, onResourceStateChange, showQrCode]);

  const worldIcon = view.worldName ? SERVER_ICONS[view.worldName] : undefined;
  const validRank = rank && Number.isFinite(rank.rank) && rank.rank > 0 ? rank : null;

  return (
    <div
      ref={ref}
      className="maple-character-share-card relative isolate overflow-hidden font-sans text-white"
      style={{ width: CHARACTER_CARD_WIDTH, height: CHARACTER_CARD_HEIGHT, backgroundColor: 'transparent' }}
      data-character-share-card
      aria-label={`${view.characterName} 角色圖卡`}
    >
      <img
        ref={backgroundImageRef}
        src={CHARACTER_CARD_BACKGROUND}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 z-0 h-full w-full object-contain"
        onLoad={(event) => {
          void event.currentTarget.decode?.().catch(() => undefined);
          setBackgroundState('ready');
        }}
        onError={() => setBackgroundState('error')}
      />

      {backgroundState === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#071323] text-slate-300">
          <ImageOff className="mb-4 h-16 w-16 text-slate-500" aria-hidden="true" />
          <div className="text-2xl font-bold">圖卡背景尚未放入</div>
          <div className="mt-2 font-mono text-sm text-slate-500">{CHARACTER_CARD_BACKGROUND}</div>
        </div>
      )}

      {jobArtworkUrl && jobArtworkState !== 'error' && (
        <img
          ref={jobArtworkImageRef}
          src={jobArtworkUrl}
          alt={`${view.characterClass || '角色'}職業立繪`}
          className="absolute left-[796px] top-[432px] z-10 h-[300px] w-[300px] object-contain object-bottom [filter:drop-shadow(0_7px_5px_rgba(2,10,22,0.72))]"
          onLoad={(event) => {
            void event.currentTarget.decode?.().catch(() => undefined);
            setJobArtworkState('ready');
          }}
          onError={() => setJobArtworkState('error')}
        />
      )}

      <div className="absolute left-[480px] top-[220px] z-20 flex h-[258px] w-[230px] items-center justify-center">
        <div className="absolute bottom-[10px] h-[54px] w-[178px] rounded-full bg-cyan-300/15 blur-xl" aria-hidden="true" />
        {characterImage && characterState !== 'error' ? (
          <img
            ref={characterImageRef}
            src={characterImage}
            alt={`${view.characterName} 角色造型`}
            className="relative z-10 h-full w-full object-contain [filter:drop-shadow(0_5px_1px_rgba(4,12,24,0.65))_drop-shadow(0_0_8px_rgba(186,230,253,0.35))]"
            style={{ imageRendering: 'pixelated' }}
            onLoad={(event) => {
              void event.currentTarget.decode?.().catch(() => undefined);
              setCharacterState('ready');
            }}
            onError={() => setCharacterState('error')}
          />
        ) : (
          <div className="relative z-10 flex h-32 w-32 items-center justify-center rounded-full border border-white/25 bg-slate-950/65 text-cyan-100 shadow-xl">
            <UserRound className="h-16 w-16" aria-hidden="true" />
          </div>
        )}
      </div>

      <section className="absolute left-[458px] top-[460px] z-30 w-[286px] px-2 py-2 text-center [text-shadow:0_2px_3px_rgba(3,15,28,0.92)]">
        <h1
          className="maple-share-card-name truncate text-[38px] font-black leading-tight tracking-wide"
        >
          {view.characterName}
        </h1>
        <div
          className="maple-share-card-identity mt-2 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[17px] font-black"
        >
          {view.worldName && (
            <span className="inline-flex items-center gap-1.5">
              {worldIcon && <img src={worldIcon} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />}
              {view.worldName}
            </span>
          )}
          {view.worldName && view.characterClass && <span aria-hidden="true">·</span>}
          {view.characterClass && <span>{view.characterClass}</span>}
          {view.level != null && <span className="maple-share-card-level">Lv.{view.level}</span>}
        </div>
      </section>

      <section className="absolute left-[712px] top-[242px] z-30 w-[338px] px-2 py-3 [text-shadow:0_2px_3px_rgba(3,15,28,0.92)]">
        <div className="maple-share-card-power-title text-[18px] font-black uppercase tracking-[0.14em]">角色戰鬥力</div>
        {view.combatPowerLabel ? (
          <div
            className="maple-share-card-power mt-1 whitespace-nowrap font-mono text-[42px] font-black leading-tight tracking-[-0.05em]"
          >
            {view.combatPowerLabel}
          </div>
        ) : (
          <div className="maple-share-card-bright-text mt-2 text-[25px] font-bold">暫無有效戰鬥力</div>
        )}

        {validRank && (
          <div className="maple-share-card-rank mt-3 inline-flex rounded-full border border-amber-100/45 bg-[#071526]/55 px-3 py-1.5 text-[15px] font-bold shadow-sm">
            站內近期戰力排名 #{validRank.rank.toLocaleString('zh-TW')}
          </div>
        )}

        {view.combatStats.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-1.5 border-t border-cyan-100/30 pt-3">
            {view.combatStats.map((stat) => (
              <div key={stat.label} className="px-1 py-1 text-center">
                <div className="maple-share-card-stat-label whitespace-nowrap text-[14px] font-black">{stat.label}</div>
                <div className="maple-share-card-stat-value mt-1 whitespace-nowrap font-mono text-[21px] font-black">{stat.value}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {view.hexaProgress != null && (
        <section className="maple-share-card-hexa absolute left-[458px] top-[568px] z-30 w-[330px] [text-shadow:0_2px_3px_rgba(3,15,28,0.92)]">
          <div className="flex items-center justify-between gap-3 text-[17px] font-black">
            <span className="maple-share-card-hexa-title">HEXA 六轉進度</span>
            <span className="maple-share-card-hexa-value font-mono">{view.hexaProgress.toFixed(1)}%</span>
          </div>
          <div
            className="maple-share-card-hexa-track mt-2 h-3.5 overflow-hidden rounded-full border border-cyan-100/25 bg-[#071526]/45 p-0.5"
            role="progressbar"
            aria-label={`HEXA 六轉進度 ${view.hexaProgress.toFixed(1)}%`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Number(view.hexaProgress.toFixed(1))}
          >
            <div
              className="maple-share-card-hexa-fill h-full rounded-full"
              style={{ width: `${view.hexaProgress}%` }}
              aria-hidden="true"
            />
          </div>
        </section>
      )}

      <footer className="absolute bottom-[188px] left-[488px] z-30 w-[215px] px-2 pt-2 text-center [text-shadow:0_2px_3px_rgba(3,15,28,0.92)]">
        <div className="min-w-0">
          <div className="flex items-center justify-center gap-2">
            <img
              ref={brandLogoImageRef}
              src={CHARACTER_CARD_BRAND_LOGO}
              alt="聖小熊 Logo"
              className="h-6 w-6 shrink-0 object-contain [filter:drop-shadow(0_2px_3px_rgba(3,15,28,0.75))]"
              onLoad={(event) => {
                void event.currentTarget.decode?.().catch(() => undefined);
                setBrandLogoState('ready');
              }}
              onError={() => setBrandLogoState('error')}
            />
            <div className="maple-share-card-brand whitespace-nowrap text-[15px] font-black">聖小熊的秘密基地</div>
          </div>
          <div className="maple-share-card-url mt-1 whitespace-nowrap text-[10px] font-bold leading-snug tracking-tight">{shareUrl}</div>
          {view.dataDate && <div className="maple-share-card-date mt-1 text-[12px] font-bold">資料日期 {view.dataDate.replace(/-/g, '/')}</div>}
        </div>
      </footer>

      {showQrCode && (
        <div
          className="absolute bottom-[180px] left-[350px] z-30 rounded-lg bg-white p-1.5 shadow-md"
          data-character-card-qr
        >
          <QRCodeSVG
            value={shareUrl}
            size={84}
            level="M"
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#071526"
            title={`${view.characterName} 角色查詢網址`}
          />
        </div>
      )}
    </div>
  );
});

CharacterShareCard.displayName = 'CharacterShareCard';

export default CharacterShareCard;
