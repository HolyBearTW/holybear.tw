import React, { useState } from 'react';
import { X, Copy, Check, QrCode } from 'lucide-react';

interface ShareModalProps {
  characterName: string;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ characterName, onClose }) => {
  const [copied, setCopied] = useState(false);
  
  // Construct URL
  const url = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}#${characterName}`
    : `https://holybear.tw/maplestory#${characterName}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Using QR Server API (reliable public API)
  // bgcolor=1e293b matches slate-800, color=ffffff is white
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&bgcolor=1e293b&color=ffffff&margin=10&format=svg`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <QrCode className="w-6 h-6 text-indigo-400" /> 分享角色分析
        </h2>

        <div className="flex flex-col items-center gap-6">
          {/* QR Code */}
          <div className="p-2 bg-slate-800 rounded-xl border border-slate-700 shadow-inner group relative overflow-hidden">
            <img 
              src={qrUrl} 
              alt={`QR Code for ${characterName}`}
              className="w-48 h-48 rounded-lg"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="text-white text-xs font-bold">掃描查看分析</span>
            </div>
          </div>

          {/* Link Section */}
          <div className="w-full">
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">分享連結</label>
            <div className="flex gap-2">
              <input 
                readOnly
                value={url}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
                onClick={(e) => e.currentTarget.select()}
              />
              <button 
                onClick={handleCopy}
                className={`px-3 py-2 rounded-lg border transition-all flex items-center justify-center min-w-[44px] ${
                  copied 
                    ? 'bg-green-900/30 border-green-500/50 text-green-400' 
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-600'
                }`}
                title="複製連結"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
