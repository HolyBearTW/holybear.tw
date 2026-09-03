import { useLayoutEffect, useRef, useState } from 'react';

export const EQUIPMENT_LAYOUT_WIDTH = 384;
const EQUIPMENT_LAYOUT_SIDE_GUTTER = 7;

export function useEquipmentLayoutScale() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [layoutScale, setLayoutScale] = useState(1);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const updateScale = () => {
      const safeWidth = Math.max(0, card.clientWidth - EQUIPMENT_LAYOUT_SIDE_GUTTER * 2);
      setLayoutScale(Math.min(1, safeWidth / EQUIPMENT_LAYOUT_WIDTH));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return { cardRef, layoutScale };
}
