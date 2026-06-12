import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  work: {
    id: number;
    title: string | null;
    description?: string | null;
    price?: number | null;
    coverUrl?: string | null;
    imageUrls: string[];
    tags: string[];
    technicianName?: string;
  };
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    warning: (msg: string) => void;
  };
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  work,
  toast,
}) => {
  const { technician } = useAuth();
  const [view, setView] = useState<'options' | 'poster' | 'xiaohongshu'>('options');
  const [posterUrl, setPosterUrl] = useState<string>('');
  const [generatingPoster, setGeneratingPoster] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const clientBaseUrl = import.meta.env.VITE_CLIENT_BASE_URL || 'https://m.lunails.cn';
  const invitationCode = technician?.invitationCode || '';
  const shareLink = `${clientBaseUrl}/w/${work.id}?inviteCode=${encodeURIComponent(invitationCode)}`;

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Copy Link Action
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('分享链接已复制，去微信发送给好友吧！');
      onClose();
    } catch {
      toast.error('链接复制失败，请重试');
    }
  };

  // Helper function to draw rounded images
  const drawRoundedImage = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  };

  // Helper function to draw text with word wrapping
  const drawWrappedText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number = 2
  ) => {
    const chars = text.split('');
    let line = '';
    let testY = y;
    let linesDrawn = 0;

    for (let n = 0; n < chars.length; n++) {
      const testLine = line + chars[n];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && n > 0) {
        linesDrawn++;
        if (linesDrawn === maxLines) {
          ctx.fillText(line.slice(0, -1) + '...', x, testY);
          return testY;
        }
        ctx.fillText(line, x, testY);
        line = chars[n];
        testY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, testY);
    return testY;
  };

  // 2. Generate Poster (Canvas)
  const handleGeneratePoster = async () => {
    setGeneratingPoster(true);
    setView('poster');
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas element not found');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get 2d context');

      // Canvas dimensions for high resolution (3:4 aspect ratio: 750 x 1000)
      const W = 750;
      const H = 1000;
      canvas.width = W;
      canvas.height = H;

      // Draw Background
      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(1, '#FFF5F7');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      // Draw Main Card Area
      ctx.shadowColor = 'rgba(255, 94, 147, 0.08)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 15;
      ctx.fillStyle = '#FFFFFF';
      drawRoundedImage(ctx, new Image(), 35, 35, W - 70, H - 70, 24); // just creates path clip
      ctx.fillRect(35, 35, W - 70, H - 70);

      // Reset Shadow for next items
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Load cover work image
      const coverUrl = work.coverUrl || work.imageUrls[0];
      if (coverUrl) {
        const workImg = new Image();
        workImg.crossOrigin = 'anonymous';
        // Add timestamp to bypass cache CORS issues
        workImg.src = coverUrl.includes('?') ? `${coverUrl}&t=${Date.now()}` : `${coverUrl}?t=${Date.now()}`;
        await new Promise((resolve) => {
          workImg.onload = resolve;
          workImg.onerror = () => {
            console.warn('Failed to load work image');
            resolve(null);
          };
        });

        if (workImg.complete && workImg.naturalWidth > 0) {
          // Draw image cropped nicely in a 680x560 box
          const boxX = 35;
          const boxY = 35;
          const boxW = W - 70;
          const boxH = 560;
          const r = 24;

          ctx.save();
          // Clip to round top corners only
          ctx.beginPath();
          ctx.moveTo(boxX + r, boxY);
          ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, r);
          ctx.lineTo(boxX + boxW, boxY + boxH);
          ctx.lineTo(boxX, boxY + boxH);
          ctx.arcTo(boxX, boxY, boxX + boxW, boxY, r);
          ctx.closePath();
          ctx.clip();

          // Cover crop calculation
          const imgRatio = workImg.width / workImg.height;
          const boxRatio = boxW / boxH;
          let sx = 0, sy = 0, sw = workImg.width, sh = workImg.height;
          if (imgRatio > boxRatio) {
            sw = workImg.height * boxRatio;
            sx = (workImg.width - sw) / 2;
          } else {
            sh = workImg.width / boxRatio;
            sy = (workImg.height - sh) / 2;
          }

          ctx.drawImage(workImg, sx, sy, sw, sh, boxX, boxY, boxW, boxH);
          ctx.restore();
        }
      }

      // Draw Title
      ctx.fillStyle = '#1f2230';
      ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textY = drawWrappedText(ctx, work.title || '款式设计', 60, 640, W - 120, 44, 2);

      // Draw Price Tag if available
      if (work.price && work.price > 0) {
        ctx.fillStyle = '#FF5E93';
        ctx.font = 'bold 36px monospace';
        ctx.fillText(`¥${work.price}`, 60, textY + 60);

        // draw tag badge
        ctx.fillStyle = '#FFE9F0';
        ctx.beginPath();
        ctx.roundRect(190, textY + 24, 100, 44, 8);
        ctx.fill();
        ctx.fillStyle = '#FF5E93';
        ctx.font = '20px sans-serif';
        ctx.fillText('专属价', 210, textY + 53);
      }

      // Draw Technician Avatar & Name
      const avatarUrl = technician?.avatar || '';
      const techName = work.technicianName || technician?.name || '美甲师';

      const drawTechSection = async () => {
        let hasAvatar = false;
        if (avatarUrl) {
          const avImg = new Image();
          avImg.crossOrigin = 'anonymous';
          avImg.src = avatarUrl.includes('?') ? `${avatarUrl}&t=${Date.now()}` : `${avatarUrl}?t=${Date.now()}`;
          await new Promise((resolve) => {
            avImg.onload = resolve;
            avImg.onerror = () => resolve(null);
          });
          if (avImg.complete && avImg.naturalWidth > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(100, 850, 40, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avImg, 60, 810, 80, 80);
            ctx.restore();
            hasAvatar = true;
          }
        }

        if (!hasAvatar) {
          // generic avatar circle
          ctx.fillStyle = '#FF5E93';
          ctx.beginPath();
          ctx.arc(100, 850, 40, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(techName.slice(0, 1), 100, 861);
        }

        // Draw tech name
        ctx.textAlign = 'left';
        ctx.fillStyle = '#1f2230';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText(techName, 160, 848);
        ctx.fillStyle = '#8f8691';
        ctx.font = '20px sans-serif';
        ctx.fillText('为您定制精美指甲设计', 160, 878);
      };
      await drawTechSection();

      // Draw QR Code from server API
      const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareLink)}`;
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.src = qrDataUrl;
      await new Promise((resolve) => {
        qrImg.onload = resolve;
        qrImg.onerror = () => resolve(null);
      });

      if (qrImg.complete && qrImg.naturalWidth > 0) {
        ctx.drawImage(qrImg, W - 200, 780, 140, 140);
        ctx.fillStyle = '#8f8691';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('长按识别预约', W - 130, 940);
      } else {
        // Fallback text QR Code representation
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(W - 200, 780, 140, 140);
        ctx.fillStyle = '#8f8691';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('二维码载入中', W - 130, 860);
      }

      // Output to base64 URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPosterUrl(dataUrl);
    } catch (err) {
      console.error(err);
      toast.error('海报生成失败，请重试');
    } finally {
      setGeneratingPoster(false);
    }
  };

  // 3. Download Poster directly (for H5 browsers supporting file download)
  const handleDownloadPoster = () => {
    if (!posterUrl) return;
    const a = document.createElement('a');
    a.href = posterUrl;
    a.download = `nail_work_${work.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('海报已开始下载！');
  };

  // 4. Xiaohongshu assistant triggers
  const handleXiaohongshuAssist = async () => {
    setView('xiaohongshu');
    // Copy text
    const textTags = work.tags.map(t => `#${t.trim()}`).join(' ');
    const copyText = `${work.title || '今日美甲分享'}\n${work.description || ''}\n\n${textTags} #美甲分享 #预约美甲`;
    try {
      await navigator.clipboard.writeText(copyText);
      toast.success('种草文案已复制！');
    } catch {
      toast.error('文案复制失败');
    }

    // Try downloading images
    const imagesToDownload = work.imageUrls.length > 0 ? work.imageUrls : [work.coverUrl].filter(Boolean) as string[];
    imagesToDownload.forEach((url, i) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `red_media_${work.id}_${i + 1}.jpg`;
      a.target = '_blank';
      document.body.appendChild(a);
      // stagger execution slightly to avoid popup blocking
      setTimeout(() => {
        a.click();
        document.body.removeChild(a);
      }, i * 300);
    });
    toast.success('款式图片已开始保存，请注意允许浏览器保存图片文件。');
  };

  const handleLaunchXiaohongshu = () => {
    window.location.href = 'xhs://';
  };

  return (
    <div className="fixed inset-0 z-[250] flex flex-col justify-end bg-black/60 backdrop-blur-sm">
      <div 
        className="fixed inset-0 -z-10" 
        onClick={onClose} 
      />

      <div 
        className="max-h-[85vh] w-full rounded-t-[24px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-lg font-bold text-gray-900">
            {view === 'options' && '款式推广与分享'}
            {view === 'poster' && '朋友圈宣传海报'}
            {view === 'xiaohongshu' && '小红书分发助手'}
          </h3>
          <button 
            onClick={onClose} 
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 min-h-[44px]"
          >
            ✕
          </button>
        </div>

        {/* View 1: Options Panel */}
        {view === 'options' && (
          <div className="grid grid-cols-3 gap-4 py-4 text-center">
            {/* Option A: WeChat Link */}
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-2 rounded-2xl bg-pink-50/50 p-4 transition active:bg-pink-100 min-h-[44px]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-2xl text-white">
                💬
              </div>
              <span className="text-xs font-semibold text-gray-700">发送到聊天</span>
              <span className="text-[10px] text-gray-400">复制裂变链接</span>
            </button>

            {/* Option B: WeChat Poster */}
            <button
              onClick={handleGeneratePoster}
              className="flex flex-col items-center gap-2 rounded-2xl bg-pink-50/50 p-4 transition active:bg-pink-100 min-h-[44px]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-500 text-2xl text-white">
                🖼️
              </div>
              <span className="text-xs font-semibold text-gray-700">朋友圈海报</span>
              <span className="text-[10px] text-gray-400">带码卡片宣传图</span>
            </button>

            {/* Option C: Xiaohongshu Sync */}
            <button
              onClick={handleXiaohongshuAssist}
              className="flex flex-col items-center gap-2 rounded-2xl bg-pink-50/50 p-4 transition active:bg-pink-100 min-h-[44px]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-2xl text-white">
                📕
              </div>
              <span className="text-xs font-semibold text-gray-700">同步小红书</span>
              <span className="text-[10px] text-gray-400">素材打包+文案</span>
            </button>
          </div>
        )}

        {/* View 2: WeChat Poster Generation View */}
        {view === 'poster' && (
          <div className="flex flex-col items-center gap-4">
            {generatingPoster ? (
              <div className="flex h-72 w-full flex-col items-center justify-center gap-3 rounded-2xl bg-gray-50 border border-dashed border-gray-200">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF5E93] border-t-transparent" />
                <p className="text-sm text-gray-500">正在生成精美海报图...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full">
                {/* Hidden canvas used for rendering */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Poster Preview */}
                {posterUrl && (
                  <div className="relative max-h-[45vh] overflow-y-auto rounded-2xl border border-gray-100 shadow-md">
                    <img src={posterUrl} alt="海报预览" className="w-64 object-contain" />
                  </div>
                )}

                <p className="mt-3 text-center text-xs text-gray-400">
                  💡 手机用户建议<strong>“长按图片保存”</strong>，或点击下方按钮下载海报
                </p>

                <div className="mt-4 flex w-full gap-3">
                  <button
                    onClick={() => setView('options')}
                    className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-600 min-h-[44px] active:bg-gray-200"
                  >
                    返回
                  </button>
                  <button
                    onClick={handleDownloadPoster}
                    disabled={!posterUrl}
                    className="flex-1 rounded-xl bg-[#FF5E93] py-3 text-sm font-semibold text-white min-h-[44px] shadow-sm active:bg-[#e54e82] disabled:opacity-50"
                  >
                    下载海报
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* View 3: Xiaohongshu assistant */}
        {view === 'xiaohongshu' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-red-50 p-4 border border-red-100 text-sm text-red-800 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-base">
                <span>📌</span> 素材提取指引：
              </p>
              <ol className="list-decimal pl-4 space-y-1.5 text-xs text-red-700">
                <li>本款式全部原图（无水印）已保存到您的本地相册中。</li>
                <li>小红书风格的推广文案（标题+话题标签）已自动复制到您的系统剪贴板。</li>
                <li>点击下方按钮跳转小红书发布，直接从相册选图并在输入框<b>“粘贴”</b>即可。</li>
              </ol>
            </div>

            <div className="rounded-2xl bg-gray-50 p-3.5 border border-gray-200 text-xs">
              <p className="font-bold text-gray-500 mb-1">复制的内容预览：</p>
              <div className="max-h-24 overflow-y-auto font-mono text-gray-700 whitespace-pre-wrap break-all p-2 bg-white rounded-lg">
                {work.title || '今日美甲分享'}{'\n'}
                {work.description || ''}{'\n'}
                {work.tags.map(t => `#${t.trim()}`).join(' ')} #美甲分享 #预约美甲
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setView('options')}
                className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-600 min-h-[44px] active:bg-gray-200"
              >
                返回
              </button>
              <button
                onClick={handleLaunchXiaohongshu}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white min-h-[44px] active:bg-red-700 shadow-md"
              >
                去小红书发帖
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
