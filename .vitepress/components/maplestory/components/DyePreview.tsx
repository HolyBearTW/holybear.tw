import React, { useRef, useEffect } from 'react';

interface DyePreviewProps {
  imageUrl?: string;
  hue?: number;
  saturation?: number;
  value?: number;
  style?: React.CSSProperties;
}

function hsvToRgb(h: number, s: number, v: number) {
  h = h % 360;
  s = Math.max(0, Math.min(1, s));
  v = Math.max(0, Math.min(1, v));
  let c = v * s;
  let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  let m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

const DyePreview: React.FC<DyePreviewProps> = (props) => {
  const { imageUrl, hue = 0, saturation = 0, value = 0, style } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];
        // 轉 HSV
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let v0 = max / 255;
        let s0 = max === 0 ? 0 : (max - min) / max;
        let h0 = 0;
        if (max === min) h0 = 0;
        else if (max === r) h0 = 60 * ((g - b) / (max - min));
        else if (max === g) h0 = 60 * (2 + (b - r) / (max - min));
        else h0 = 60 * (4 + (r - g) / (max - min));
        if (h0 < 0) h0 += 360;
        // 套用染色
        let h = (h0 + hue) % 360;
        let s = Math.max(0, Math.min(1, s0 + saturation / 100));
        let v = Math.max(0, Math.min(1, v0 + value / 100));
        let [nr, ng, nb] = hsvToRgb(h, s, v);
        data[i] = nr;
        data[i + 1] = ng;
        data[i + 2] = nb;
      }
      ctx.putImageData(imageData, 0, 0);
    };
  }, [imageUrl, hue, saturation, value]);

  if (!imageUrl) return null;
  return (
    <canvas ref={canvasRef} style={style ? style : { width: 40, height: 40, borderRadius: 8, background: '#222', border: '1px solid #334' }} />
  );
};

export default DyePreview;