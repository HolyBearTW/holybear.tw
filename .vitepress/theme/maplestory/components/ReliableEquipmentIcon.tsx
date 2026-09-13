import React, { useEffect, useRef, useState } from 'react';

const RETRY_DELAYS = [400, 1200];

interface ReliableEquipmentIconProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string;
}

/**
 * Equipment icons are tiny remote PNGs that can finish decoding while the
 * responsive equipment grid is changing its zoom. Reveal them through React
 * after load so Chromium invalidates the slot paint, and retry transient
 * first-load failures without changing the stable CDN URL.
 */
const ReliableEquipmentIcon: React.FC<ReliableEquipmentIconProps> = ({ src, className = '', ...props }) => {
  const normalizedSrc = src || '';
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const retryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setRetryAttempt(0);
    return () => {
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    };
  }, [src]);

  const handleLoad = () => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setLoadedSrc(normalizedSrc);
  };

  const handleError = () => {
    setLoadedSrc((current) => current === normalizedSrc ? null : current);
    if (retryAttempt >= RETRY_DELAYS.length || retryTimerRef.current !== null) return;

    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      setRetryAttempt((attempt) => attempt + 1);
    }, RETRY_DELAYS[retryAttempt]);
  };

  const isLoaded = loadedSrc === normalizedSrc;

  if (!normalizedSrc) return null;

  return (
    <img
      {...props}
      key={`${normalizedSrc}:${retryAttempt}`}
      src={normalizedSrc}
      data-reliable-equipment-icon=""
      loading="eager"
      decoding="sync"
      onLoad={handleLoad}
      onError={handleError}
      className={`${className} ${isLoaded ? 'visible' : 'invisible'}`.trim()}
    />
  );
};

export default ReliableEquipmentIcon;
