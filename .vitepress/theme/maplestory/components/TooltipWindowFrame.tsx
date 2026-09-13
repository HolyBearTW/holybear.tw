import React, { useLayoutEffect, useRef } from 'react';
import { mapleAsset } from '../assets';

export const windowAsset = (name: string) => mapleAsset(`window/${name}`);

export const windowBg = (name: string) => ({ backgroundImage: `url('${windowAsset(name)}')` });

const FRAME_ASSETS = [
  'window_nw.png', 'window_n.png', 'window_ne.png',
  'window_w.png', 'window_c.png', 'window_e.png',
  'window_sw.png', 'window_s.png', 'window_se.png',
] as const;

const imageCache = new Map<string, Promise<HTMLImageElement>>();

const loadImage = (name: string) => {
  const src = windowAsset(name);
  const cached = imageCache.get(src);
  if (cached) return cached;

  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
  imageCache.set(src, pending);
  return pending;
};

/** Draws all nine frame slices into one device-pixel-snapped bitmap. */
export const TooltipWindowFrame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let images: HTMLImageElement[] | null = null;

    const paint = () => {
      if (!images || disposed) return;

      const rect = canvas.getBoundingClientRect();
      const layoutWidth = canvas.offsetWidth;
      const layoutHeight = canvas.offsetHeight;
      if (rect.width <= 0 || rect.height <= 0 || layoutWidth <= 0 || layoutHeight <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.max(1, Math.round(rect.width * dpr));
      const pixelHeight = Math.max(1, Math.round(rect.height * dpr));
      const scaleX = rect.width / layoutWidth;
      const scaleY = rect.height / layoutHeight;
      const left = Math.round(14 * scaleX * dpr);
      const right = Math.round(15 * scaleX * dpr);
      const top = Math.round(14 * scaleY * dpr);
      const bottom = Math.round(15 * scaleY * dpr);
      const centerWidth = Math.max(0, pixelWidth - left - right);
      const centerHeight = Math.max(0, pixelHeight - top - bottom);

      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

      const context = canvas.getContext('2d');
      if (!context) return;
      context.clearRect(0, 0, pixelWidth, pixelHeight);
      context.imageSmoothingEnabled = false;

      const widths = [left, centerWidth, right];
      const heights = [top, centerHeight, bottom];
      let index = 0;
      let y = 0;
      for (let row = 0; row < 3; row += 1) {
        let x = 0;
        for (let column = 0; column < 3; column += 1) {
          context.drawImage(images[index], x, y, widths[column], heights[row]);
          x += widths[column];
          index += 1;
        }
        y += heights[row];
      }
    };

    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    Promise.all(FRAME_ASSETS.map(loadImage)).then((loaded) => {
      images = loaded;
      paint();
    }).catch(() => {
      images = null;
    });

    window.addEventListener('resize', paint);
    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('resize', paint);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
};
