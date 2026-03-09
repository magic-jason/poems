import React, { useEffect, useRef, useState } from 'react';
import { Download, BookOpen, Loader2 } from 'lucide-react';

interface CanvasOverlayProps {
  imageUrl: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
  styleId: string;
  showText?: boolean;
  fontFamily?: string;
  layoutInfo?: {
    anchorX: number;
    anchorY: number;
    textColor: string;
    shadowColor: string;
  };
  onExportCard?: () => void;
  isExporting?: boolean;
}

export default function CanvasOverlay({
  imageUrl,
  title,
  author,
  dynasty,
  content,
  styleId,
  showText = true,
  fontFamily = '"Zhi Mang Xing", cursive',
  layoutInfo,
  onExportCard,
  isExporting
}: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!imageUrl) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = (imgEl: HTMLImageElement, textOpacity: number) => {
      // Clear and draw base image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgEl, 0, 0);

      if (!showText || textOpacity <= 0) {
        setIsReady(true);
        return;
      }

      // Scale factor assuming base width of 1920 for 16:9
      const s = canvas.width / 1920;

      // Calculate layout starting points based on intelligent layout data
      const textColor = layoutInfo?.textColor || 'rgba(20, 20, 20, 0.9)';
      const shadowColor = layoutInfo?.shadowColor || 'rgba(255,255,255,0.6)';

      ctx.save();
      ctx.globalAlpha = textOpacity;
      ctx.fillStyle = textColor;

      // Ensure good contrast with a responsive shadow
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 18 * s; // Inreased to 18 for high contrast
      ctx.shadowOffsetX = 2 * s;
      ctx.shadowOffsetY = 2 * s;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      let currentX_px = layoutInfo ? layoutInfo.anchorX : 1920 * 0.88;
      let anchorY_px = layoutInfo ? layoutInfo.anchorY : 1080 * 0.15;

      // 1. Draw Content (Body)
      ctx.font = `${48 * s}px ${fontFamily}`;
      let lines = content.split(/[，。！？、,.!?\s]+/).filter(l => l.trim().length > 0);

      for (let line of lines) {
        let currentY_px = anchorY_px;
        for (let i = 0; i < line.length; i++) {
          ctx.fillText(line[i], currentX_px * s, currentY_px * s);
          currentY_px += 60; // 60px line height for body
        }
        currentX_px -= 55; // 缩小列间距 (原80)
      }

      // 2. Draw Title
      currentX_px -= 15; // Extra padding between body and title
      let titleY_px = anchorY_px + 80; // Title starts slightly lower
      ctx.font = `bold ${32 * s}px ${fontFamily}`;
      for (let i = 0; i < title.length; i++) {
        ctx.fillText(title[i], currentX_px * s, titleY_px * s);
        titleY_px += 45; // Use same line height as author
      }

      // 3. Draw Author & Dynasty
      currentX_px -= 55; // Padding to author
      let authorY_px = anchorY_px + 160; // Author starts even lower
      ctx.font = `${32 * s}px ${fontFamily}`;
      let authorText = `${dynasty} ${author}`;
      for (let i = 0; i < authorText.length; i++) {
        ctx.fillText(authorText[i], currentX_px * s, authorY_px * s);
        authorY_px += 45; // Tighter line height for smaller font
      }

      // 4. Draw Author Seal
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(201, 42, 42, 0.9)';

      const sealCharSize = 24 * s;
      const sealPaddingX = 8 * s;
      const sealPaddingY = 10 * s;
      const sealWidth = sealCharSize + sealPaddingX * 2;
      const sealHeight = (author.length * sealCharSize) + sealPaddingY * 2;

      const sealCenterX = currentX_px * s;
      const sealTopY = (authorY_px + 20) * s;

      const sealX = sealCenterX - sealWidth / 2;
      const sealY = sealTopY;

      // Draw rounded rectangle for seal
      const radius = 6 * s;
      ctx.beginPath();
      ctx.moveTo(sealX + radius, sealY);
      ctx.lineTo(sealX + sealWidth - radius, sealY);
      ctx.quadraticCurveTo(sealX + sealWidth, sealY, sealX + sealWidth, sealY + radius);
      ctx.lineTo(sealX + sealWidth, sealY + sealHeight - radius);
      ctx.quadraticCurveTo(sealX + sealWidth, sealY + sealHeight, sealX + sealWidth - radius, sealY + sealHeight);
      ctx.lineTo(sealX + radius, sealY + sealHeight);
      ctx.quadraticCurveTo(sealX, sealY + sealHeight, sealX, sealY + sealHeight - radius);
      ctx.lineTo(sealX, sealY + radius);
      ctx.quadraticCurveTo(sealX, sealY, sealX + radius, sealY);
      ctx.closePath();
      ctx.fill();

      // Inner border for traditional stamp look
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = Math.max(1, 1 * s);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.font = `${sealCharSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      for (let i = 0; i < author.length; i++) {
        ctx.fillText(author[i], sealCenterX, sealTopY + sealPaddingY + (i * sealCharSize));
      }

      ctx.restore();
      setIsReady(true);
    };

    const img = new Image();
    if (imageUrl && !imageUrl.startsWith('data:')) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      if (showText) {
        // Draw instantly at opacity 1 to do a seamless handoff from the CSS animation
        draw(img, 1);
      } else {
        draw(img, 0);
      }
    };
    img.src = imageUrl;

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [imageUrl, title, author, dynasty, content, styleId, showText, fontFamily]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `shihua-${title}-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative group aspect-video max-w-full max-h-full bg-black/5 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover block"
        style={{ display: imageUrl ? 'block' : 'none' }}
      />

      {isReady && (
        <div className="absolute top-6 right-8 z-50 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-2 group-hover:translate-y-0 flex items-center gap-4">
          {onExportCard && (
            <button
              onClick={onExportCard}
              disabled={isExporting}
              className="px-6 py-2.5 bg-white/80 hover:bg-white backdrop-blur-xl text-stone-700 hover:text-red-800 rounded-full transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:shadow-[0_8px_30px_rgba(201,42,42,0.15)] border border-white/50 font-serif tracking-widest flex items-center gap-2.5 group/btn disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
              title="一键生成学霸导学卡"
            >
              {isExporting ? (
                <Loader2 className="animate-spin text-red-800" size={16} strokeWidth={1.5} />
              ) : (
                <BookOpen size={16} strokeWidth={1.5} className="group-hover/btn:scale-110 transition-transform duration-500" />
              )}
              <span className="text-sm">导 出</span>
            </button>
          )}
          <button
            onClick={handleDownload}
            className="px-6 py-2.5 bg-white/80 hover:bg-white backdrop-blur-xl text-stone-700 hover:text-red-800 rounded-full transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:shadow-[0_8px_30px_rgba(201,42,42,0.15)] border border-white/50 font-serif tracking-widest flex items-center gap-2.5 group/btn hover:-translate-y-0.5"
            title="下载意境图"
          >
            <Download size={16} strokeWidth={1.5} className="group-hover/btn:scale-110 transition-transform duration-500" />
            <span className="text-sm">保 存</span>
          </button>
        </div>
      )}
    </div>
  );
}
