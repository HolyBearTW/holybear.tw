import React from 'react';
import { createPortal } from 'react-dom';
import { Calculator, Database, Flame, Sparkles } from 'lucide-react';

export type GrowthTrackingState = 'loading' | 'tracked' | 'untracked' | 'unavailable';

type TourStepId = 'growth-profile' | 'boss-damage-calculator' | 'ai-check' | 'combat-calculator';

interface TourTargetRef {
  current: HTMLButtonElement | null;
}

interface MapleFeatureTourProps {
  characterKey: string;
  growthTrackingState: GrowthTrackingState;
  growthTargetRef: TourTargetRef;
  aiTargetRef: TourTargetRef;
  calculatorTargetRef: TourTargetRef;
  bossCalculatorTargetRef: TourTargetRef;
}

interface TourStep {
  id: TourStepId;
  title: string;
  description: string;
  targetRef: TourTargetRef;
  icon: React.ReactNode;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TOUR_STORAGE_PREFIX = 'maple-feature-tour-v1';

const storageKey = (id: TourStepId) => `${TOUR_STORAGE_PREFIX}:${id}`;

const hasSeenStep = (id: TourStepId) => {
  try {
    return window.localStorage.getItem(storageKey(id)) === '1';
  } catch {
    return false;
  }
};

const rememberStep = (id: TourStepId) => {
  try {
    window.localStorage.setItem(storageKey(id), '1');
  } catch {
    // 儲存空間不可用時仍允許關閉，僅無法跨頁記住導覽進度。
  }
};

const MapleFeatureTour: React.FC<MapleFeatureTourProps> = ({
  characterKey,
  growthTrackingState,
  growthTargetRef,
  aiTargetRef,
  calculatorTargetRef,
  bossCalculatorTargetRef,
}) => {
  const [currentStepId, setCurrentStepId] = React.useState<TourStepId | null>(null);
  const [spotlightRect, setSpotlightRect] = React.useState<SpotlightRect | null>(null);
  const initializedCharacterRef = React.useRef('');

  const steps = React.useMemo<TourStep[]>(() => {
    const availableSteps: TourStep[] = [];

    if (growthTrackingState === 'untracked') {
      availableSteps.push({
        id: 'growth-profile',
        title: '先建立角色的成長檔案',
        description: '建立後會開始累積角色紀錄，之後就能查看年度成長日曆、角色大事記與近期排行榜。',
        targetRef: growthTargetRef,
        icon: <Database className="h-5 w-5" />,
      });
    }

    availableSteps.push(
      {
        id: 'ai-check',
        title: '讓 AI 幫角色做一次健檢',
        description: 'AI 會整理目前裝備與養成方向；BOSS 攻略能力只會採用已保存的實測輸出，不再用面板戰力猜測。',
        targetRef: aiTargetRef,
        icon: <Sparkles className="h-5 w-5" />,
      },
      {
        id: 'combat-calculator',
        title: '想換裝時先來算算看',
        description: '戰力計算機可自動帶入角色資料，協助比較裝備、Buff 與不同情境的預估變化。',
        targetRef: calculatorTargetRef,
        icon: <Calculator className="h-5 w-5" />,
      },
      {
        id: 'boss-damage-calculator',
        title: '用實戰時間估算打王能力',
        description: '選擇實際擊破的 BOSS，填入總時間與剩餘時間；系統會反推平均輸出，這份結果也會提供給 AI 健檢使用。',
        targetRef: bossCalculatorTargetRef,
        icon: <Flame className="h-5 w-5" />,
      },
    );

    return availableSteps;
  }, [aiTargetRef, bossCalculatorTargetRef, calculatorTargetRef, growthTargetRef, growthTrackingState]);

  React.useEffect(() => {
    if (!characterKey || growthTrackingState === 'loading') return;
    if (initializedCharacterRef.current === characterKey) return;

    initializedCharacterRef.current = characterKey;
    const firstUnseenStep = steps.find((step) => !hasSeenStep(step.id));
    setCurrentStepId(firstUnseenStep?.id ?? null);
  }, [characterKey, growthTrackingState, steps]);

  const currentStep = steps.find((step) => step.id === currentStepId) ?? null;

  React.useEffect(() => {
    if (!currentStep) {
      setSpotlightRect(null);
      return;
    }

    const updateSpotlight = () => {
      const target = currentStep.targetRef.current;
      if (!target) {
        setSpotlightRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      const padding = 6;
      setSpotlightRect({
        top: Math.max(6, rect.top - padding),
        left: Math.max(6, rect.left - padding),
        width: Math.min(window.innerWidth - 12, rect.width + padding * 2),
        height: rect.height + padding * 2,
      });
    };

    currentStep.targetRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
    updateSpotlight();

    const animationFrame = window.requestAnimationFrame(updateSpotlight);
    const retryTimer = window.setInterval(updateSpotlight, 150);
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearInterval(retryTimer);
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [currentStep]);

  const handleAcknowledge = () => {
    if (!currentStep) return;

    rememberStep(currentStep.id);
    const currentIndex = steps.findIndex((step) => step.id === currentStep.id);
    // 只在導覽開始時判斷「是否看過」。一旦開始，就依序走完後續功能，
    // 避免舊版或先前測試留下的單一步驟紀錄讓導覽在中途直接結束。
    const nextStep = steps[currentIndex + 1];
    setCurrentStepId(nextStep?.id ?? null);
  };

  if (!currentStep || !spotlightRect || typeof document === 'undefined') return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const cardWidth = Math.min(360, viewportWidth - 24);
  const cardLeft = Math.max(12, Math.min(
    viewportWidth - cardWidth - 12,
    spotlightRect.left + spotlightRect.width / 2 - cardWidth / 2,
  ));
  const estimatedCardHeight = 190;
  const hasRoomBelow = spotlightRect.top + spotlightRect.height + 16 + estimatedCardHeight <= viewportHeight;
  const cardTop = hasRoomBelow
    ? spotlightRect.top + spotlightRect.height + 16
    : Math.max(12, spotlightRect.top - estimatedCardHeight - 16);
  const visibleStepIndex = steps.findIndex((step) => step.id === currentStep.id) + 1;
  const hasNextStep = visibleStepIndex < steps.length;

  return createPortal(
    <div className="fixed inset-0 z-[2147483000]" role="dialog" aria-modal="true" aria-labelledby="maple-feature-tour-title">
      <div
        className="pointer-events-none fixed rounded-xl border-2 border-emerald-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.82),0_0_28px_rgba(52,211,153,0.8)]"
        style={spotlightRect}
        aria-hidden="true"
      />
      <div
        className="fixed rounded-2xl border border-emerald-400/40 bg-[#111820] p-4 text-slate-100 shadow-2xl shadow-black/70"
        style={{ left: cardLeft, top: cardTop, width: cardWidth }}
      >
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
            {currentStep.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-3">
              <h2 id="maple-feature-tour-title" className="text-base font-bold text-white">{currentStep.title}</h2>
              <span className="shrink-0 text-xs font-semibold text-slate-400">{visibleStepIndex} / {steps.length}</span>
            </div>
            <p className="text-sm leading-6 text-slate-300">{currentStep.description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAcknowledge}
          autoFocus
          className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
        >
          {hasNextStep ? '下一步' : '我瞭解了'}
        </button>
      </div>
    </div>,
    document.body,
  );
};

export default MapleFeatureTour;
