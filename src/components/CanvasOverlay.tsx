import React, { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';

interface CanvasOverlayProps {
  imageUrl: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
  styleId: string;
  showText?: boolean;
  fontFamily?: string;
}

export default function CanvasOverlay({
  imageUrl,
  title,
  author,
  dynasty,
  content,
  styleId,
  showText = true,
  fontFamily = '"Zhi Mang Xing", cursive'
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

      // Calculate background brightness before drawing text
      let isDarkBackground = false;
      try {
        // Sample a region where text is drawn (right side)
        const sampleWidth = Math.min(canvas.width / 3, 600 * s);
        const sampleX = canvas.width - sampleWidth;
        const imageData = ctx.getImageData(sampleX, 100 * s, sampleWidth, 600 * s);

        let rSum = 0, gSum = 0, bSum = 0;
        let count = 0;
        // Sample every 4th pixel to save processing time
        for (let i = 0; i < imageData.data.length; i += 16) {
          rSum += imageData.data[i];
          gSum += imageData.data[i + 1];
          bSum += imageData.data[i + 2];
          count++;
        }

        const avgR = rSum / count;
        const avgG = gSum / count;
        const avgB = bSum / count;

        // standard relative luminance (W3C)
        const luminance = (0.299 * avgR + 0.587 * avgG + 0.114 * avgB);
        isDarkBackground = luminance < 128;
      } catch (e) {
        // Fallback if cross-origin policy blocks getImageData
        isDarkBackground = false;
      }

      // Automatically adjust color based on background
      const textColor = isDarkBackground ? 'rgba(255, 255, 255, 0.95)' : 'rgba(20, 20, 20, 0.9)';
      const shadowColor = isDarkBackground ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.6)';

      ctx.save();
      ctx.globalAlpha = textOpacity;
      ctx.fillStyle = textColor;

      // Ensure good contrast with a responsive shadow
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 10 * s;
      ctx.shadowOffsetX = 1 * s;
      ctx.shadowOffsetY = 1 * s;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // 1. Draw Title
      ctx.font = `bold ${72 * s}px ${fontFamily}`;
      let titleX = canvas.width - (120 * s); // App.tsx: 93.75% of 1920 = 1800 -> 1920 - 120
      let titleY = 120 * s; // App.tsx: 11.11% of 1080 = 120
      for (let i = 0; i < title.length; i++) {
        ctx.fillText(title[i], titleX, titleY);
        titleY += 90 * s; // App.tsx: 8.33% of 1080 = 90
      }

      // 2. Draw Author & Dynasty
      ctx.font = `${32 * s}px ${fontFamily}`;
      let authorText = `${dynasty} ${author}`;
      let authorX = canvas.width - (220 * s); // App.tsx: 88.54% of 1920 = 1700 -> 1920 - 220
      let authorY = 120 * s;
      for (let i = 0; i < authorText.length; i++) {
        ctx.fillText(authorText[i], authorX, authorY);
        authorY += 45 * s; // App.tsx: 4.16% of 1080 = 45
      }

      // 3. Draw Content
      ctx.font = `${48 * s}px ${fontFamily}`;
      let lines = content.split(/[，。！？、,.!?\s]+/).filter(l => l.trim().length > 0);
      let contentX = canvas.width - (320 * s); // App.tsx: 83.33% of 1920 = 1600 -> 1920 - 320

      for (let line of lines) {
        let contentY = 120 * s; // App.tsx: 11.11% of 1080 = 120
        for (let i = 0; i < line.length; i++) {
          ctx.fillText(line[i], contentX, contentY);
          contentY += 60 * s; // App.tsx: 5.55% of 1080 = 60
        }
        contentX -= 80 * s; // App.tsx: 4.16% of 1920 = 80
      }

      // 4. Draw Author Seal
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(201, 42, 42, 0.9)';

      const sealCharSize = 24 * s;
      const sealPaddingX = 8 * s;
      const sealPaddingY = 10 * s;
      const sealWidth = sealCharSize + sealPaddingX * 2;
      const sealHeight = (author.length * sealCharSize) + sealPaddingY * 2;

      const sealCenterX = contentX + 80 * s;
      const lastLineLength = lines[lines.length - 1]?.length || 0;
      const sealTopY = (140 * s) + (lastLineLength * 60 * s);

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
    img.crossOrigin = "anonymous";
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
    link.click();
  };

  return (
    <div className="relative group aspect-video max-w-full max-h-full bg-black/5 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover block"
        style={{ display: imageUrl ? 'block' : 'none' }}
      />

      {isReady && (
        <div className="absolute top-6 right-6 z-50 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
          <button
            onClick={handleDownload}
            className="p-4 bg-white/80 backdrop-blur-md text-black rounded-full hover:bg-white transition-all shadow-xl border border-white/20 group/btn"
            title="下载意境图"
          >
            <Download size={24} className="group-hover/btn:scale-110 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
}
