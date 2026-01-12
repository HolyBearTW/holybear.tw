import React, { useRef, useEffect } from 'react';

interface DyePreviewProps {
  imageUrl?: string;
  hue?: number;        // 0 ~ 360
  saturation?: number; // -100 ~ 100
  value?: number;      // -100 ~ 100
  style?: React.CSSProperties;
  className?: string;
  colorRange?: string;
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, v = max;
  let d = max - min;
  s = max === 0 ? 0 : d / max;
  
  if (max === min) {
    h = 0; 
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, v];
}

function hsvToRgb(h: number, s: number, v: number) {
  let r, g, b;
  let i = Math.floor(h / 60);
  let f = h / 60 - i;
  let p = v * (1 - s);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [Math.round(r! * 255), Math.round(g! * 255), Math.round(b! * 255)];
}

const COLOR_RANGES: Record<string, [number, number][]> = {
  'RED': [[0, 15], [345, 360]], 
  'ORANGE': [[15, 45]],
  'YELLOW': [[45, 75]],
  'GREEN': [[75, 165]],
  'BLUE': [[165, 255]],
  'PURPLE': [[255, 315]],
  'MAGENTA': [[315, 345]],
  'BLACK': [[0, 360]], 
  'WHITE': [[0, 360]], 
};

function checkInColorRange(h: number, rangeKey?: string): boolean {
  if (!rangeKey || rangeKey === '' || rangeKey === 'NONE' || rangeKey === '全部' || rangeKey === '整體色系') {
      return true;
  }
  let key = rangeKey.toUpperCase();
  if (rangeKey.includes('紅')) key = 'RED';
  else if (rangeKey.includes('橙')) key = 'ORANGE';
  else if (rangeKey.includes('黃')) key = 'YELLOW';
  else if (rangeKey.includes('綠')) key = 'GREEN';
  else if (rangeKey.includes('藍')) key = 'BLUE';
  else if (rangeKey.includes('紫')) key = 'PURPLE';
  else if (rangeKey.includes('黑')) key = 'BLACK';
  else if (rangeKey.includes('白')) key = 'WHITE';
  
  const ranges = COLOR_RANGES[key];
  if (!ranges) return true; 
  return ranges.some(([min, max]) => h >= min && h <= max);
}

const DyePreview: React.FC<DyePreviewProps> = (props) => {
  const { 
    imageUrl, 
    hue = 0,        
    saturation = 0, 
    value = 0,      
    style, 
    className,
    colorRange = "整體色系"
  } = props;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;
    
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      if (hue === 0 && saturation === 0 && value === 0) return;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const uSaturation = saturation / 100; // -1.0 ~ 1.0
      const uValue = value / 100;           // -1.0 ~ 1.0

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;

        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 1. 轉 HSV
        let [h0, s0, v0] = rgbToHsv(r, g, b);
        let origin_v = v0; 

        // 2. 範圍檢查
        if (!checkInColorRange(h0, colorRange)) continue;

        // --- 核心運算 ---

        // A. Hue (色相): 旋轉 (Rotation)
        let h = (h0 + hue) % 360;
        if (h < 0) h += 360;

        // B. Saturation (飽和度): 乘法 (Multiplicative)
        // MapleStory 的飽和度調整通常是乘法運算
        // +100 (uSaturation=1) => 2x 飽和度
        // -100 (uSaturation=-1) => 0x 飽和度 (黑白)
        let s = s0 * (1 + uSaturation);
        s = Math.max(0, Math.min(1, s));

        // C. Value (亮度): 加法 (Additive)
        // 使用加法可以同時調整暗部與亮部，這符合遊戲內 "亮度" 選項的行為 (可以把黑變灰)
        // 但要注意避免過度曝光，通常這部分會直接截斷 (Clamp)
        let v = v0 + uValue; 
        v = Math.max(0, Math.min(1, v));

        // [防死黑機制] - 如果需要可以保留，但標準算法通常不包含此步驟
        /*
        if (uSaturation > 0) {
            let floor = uSaturation * 0.15;
            v = Math.max(v, floor);
        }
        */

        // 4. 轉回 RGB
        let [nr, ng, nb] = hsvToRgb(h, s, v);
        
        data[i] = nr;
        data[i + 1] = ng;
        data[i + 2] = nb;
      }

      ctx.putImageData(imageData, 0, 0);
    };
  }, [imageUrl, hue, saturation, value, colorRange]);

  if (!imageUrl) return null;

  return (
    <canvas ref={canvasRef} className={className} style={style} />
  );
};

export default DyePreview;