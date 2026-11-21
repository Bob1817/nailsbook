import React, { useEffect, useRef, useState } from 'react';
import type { QuoteDraft } from '../quoteTypes';
import { X, Download, Copy, Check } from 'lucide-react';
import { colors } from '../../../colors.generated';

interface PosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: QuoteDraft;
}

export const PosterModal: React.FC<PosterModalProps> = ({
  isOpen,
  onClose,
  draft,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const selectedItems = draft.items.filter((item) => item.count > 0);
  const totalPrice = selectedItems.reduce(
    (sum, item) => sum + item.price * item.count,
    0,
  );
  const totalDuration = selectedItems.reduce(
    (sum, item) => sum + item.durationMinutes * item.count,
    0,
  );

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 750;
    const padding = 64;
    const contentWidth = width - padding * 2;
    const itemHeight = 100;
    const height = 960 + Math.max(0, selectedItems.length - 1) * itemHeight;

    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = colors.surface;
    ctx.fillRect(0, 0, width, height);

    const drawEllipsis = (text: string, x: number, y: number, maxWidth: number) => {
      if (ctx.measureText(text).width <= maxWidth) {
        ctx.fillText(text, x, y);
        return;
      }
      let shortened = text;
      while (shortened.length > 1 && ctx.measureText(`${shortened}…`).width > maxWidth) {
        shortened = shortened.slice(0, -1);
      }
      ctx.fillText(`${shortened}…`, x, y);
    };

    const drawDivider = (y: number) => {
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    };

    ctx.textAlign = 'left';
    ctx.fillStyle = colors.muted;
    ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('NAILBOOK  ·  PRIVATE QUOTE', padding, 72);

    ctx.fillStyle = colors.ink;
    ctx.font = '600 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('专属美甲报价', padding, 142);

    ctx.font = '500 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    drawEllipsis(draft.technician.shopName || '私人美甲工作室', padding, 194, contentWidth);

    ctx.fillStyle = colors.muted;
    ctx.font = '400 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    drawEllipsis(
      `美甲师 ${draft.technician.name || '私人订制美甲师'} · 一对一专属服务`,
      padding,
      234,
      contentWidth,
    );

    drawDivider(282);

    ctx.fillStyle = colors.ink;
    ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('服务明细', padding, 332);
    ctx.textAlign = 'right';
    ctx.fillStyle = colors.muted;
    ctx.font = '400 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(`共 ${selectedItems.length} 项`, width - padding, 332);

    selectedItems.forEach((item, index) => {
      const itemY = 394 + index * itemHeight;

      ctx.textAlign = 'left';
      ctx.fillStyle = colors.ink;
      ctx.font = '500 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      drawEllipsis(item.name, padding, itemY, 410);

      ctx.textAlign = 'right';
      ctx.font = '600 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(`¥${item.price * item.count}`, width - padding, itemY);

      ctx.textAlign = 'left';
      ctx.fillStyle = colors.muted;
      ctx.font = '400 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const quantity = item.count > 1 ? ` · ¥${item.price} × ${item.count} ${item.unit}` : '';
      ctx.fillText(`约 ${item.durationMinutes * item.count} 分钟${quantity}`, padding, itemY + 34);
    });

    const summaryLineY = 472 + Math.max(0, selectedItems.length - 1) * itemHeight;
    drawDivider(summaryLineY);

    ctx.textAlign = 'left';
    ctx.fillStyle = colors.muted;
    ctx.font = '400 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('预估总计', padding, summaryLineY + 62);

    ctx.fillStyle = colors.ink;
    ctx.font = '600 58px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(`¥${totalPrice}`, padding, summaryLineY + 126);

    ctx.textAlign = 'right';
    ctx.fillStyle = colors.muted;
    ctx.font = '400 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('预计耗时', width - padding, summaryLineY + 62);
    ctx.fillStyle = colors.secondary;
    ctx.font = '500 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(`约 ${totalDuration} 分钟`, width - padding, summaryLineY + 116);

    const notesLineY = summaryLineY + 182;
    drawDivider(notesLineY);

    ctx.textAlign = 'left';
    ctx.fillStyle = colors.ink;
    ctx.font = '500 21px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('服务说明', padding, notesLineY + 54);
    ctx.fillStyle = colors.muted;
    ctx.font = '400 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('采用纯植物健康树脂胶，温和环保', padding, notesLineY + 96);
    ctx.fillText('工具一客一消毒 · 7 天内非人为免费修补', padding, notesLineY + 132);

    ctx.fillStyle = colors.muted;
    ctx.font = '400 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    drawEllipsis(`NO. ${draft.id || 'DRAFT'}`, padding, height - 62, 330);
    ctx.textAlign = 'right';
    ctx.fillText('报价 2 小时内有效', width - padding, height - 62);

    setImageUrl(canvas.toDataURL('image/png'));
  }, [isOpen, draft, selectedItems, totalPrice, totalDuration]);

  if (!isOpen) return null;

  const handleCopyText = () => {
    const lines = selectedItems.map(
      (item) => `• ${item.name}${item.count > 1 ? ` × ${item.count} ${item.unit}` : ''}: ¥${item.price * item.count}`,
    );
    const text = [
      `💅【${draft.technician.shopName || 'Mona Nail Studio'} 报价明细】`,
      ...lines,
      `⏱️ 预估耗时：约 ${totalDuration} 分钟`,
      `💰 预估总额：¥${totalPrice}`,
      `✨ 承诺：工具一客一消毒 · 7天内非人为免费修补`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 overflow-y-auto">
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative w-full max-w-sm bg-surface rounded-2xl shadow-xl overflow-hidden flex flex-col my-auto border border-line animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <span className="font-medium text-ink text-sm tracking-tight">报价单预览</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-muted hover:bg-pressed active:scale-[0.98] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-3 bg-page flex flex-col items-center max-h-[68vh] overflow-y-auto">
          {imageUrl ? (
            <div className="flex flex-col items-center">
              <img
                src={imageUrl}
                alt="报价海报"
                className="w-full rounded-xl border border-line"
              />
              <p className="text-xs text-muted mt-3 mb-1 text-center">长按海报保存，或转发给客户</p>
            </div>
          ) : (
            <div className="py-20 text-xs text-muted">海报渲染中...</div>
          )}
        </div>

        <div className="p-4 bg-surface border-t border-line flex gap-3">
          <button
            type="button"
            onClick={handleCopyText}
            className="flex-1 min-h-[48px] flex items-center justify-center gap-2 rounded-lg border border-line font-medium text-xs text-ink hover:bg-pressed active:scale-[0.98] transition-all duration-200"
          >
            {copied ? <Check size={16} className="text-ink" /> : <Copy size={16} />}
            {copied ? '已复制明细' : '复制文字账单'}
          </button>

          {imageUrl && (
            <a
              href={imageUrl}
              download={`报价单_${draft.technician.shopName || '美甲'}.png`}
              className="flex-1 min-h-[48px] flex items-center justify-center gap-2 rounded-lg bg-action text-inverse font-medium text-xs hover:bg-actionPressed active:scale-[0.98] transition-all duration-200"
            >
              <Download size={16} />
              保存到手机
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
