import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { QuoteServiceItem } from '../quoteTypes';

interface EditPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: QuoteServiceItem[];
  onSave: (updatedItems: QuoteServiceItem[]) => void;
}

export const EditPriceModal: React.FC<EditPriceModalProps> = ({
  isOpen,
  onClose,
  items,
  onSave,
}) => {
  const [editingItems, setEditingItems] = useState<QuoteServiceItem[]>(items);

  if (!isOpen) return null;

  const handlePriceChange = (id: string, newPrice: number) => {
    setEditingItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, price: Math.max(0, newPrice) } : item,
      ),
    );
  };

  const handleConfirm = () => {
    onSave(editingItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-sm bg-surface rounded-3xl shadow-2xl p-6 border border-line flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <span className="font-semibold text-ink text-base tracking-tight [text-wrap:balance]">
            调整我的价格表
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-pressed active:scale-[0.98] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-muted py-3 [text-wrap:pretty]">
          根据您的实际收费微调默认单价，后续出单将以此标准自动计算：
        </p>

        <div className="flex-1 overflow-y-auto space-y-2.5 py-1 pr-1">
          {editingItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-page border border-line"
            >
              <div className="flex-1 pr-3">
                <div className="text-xs font-semibold text-ink [text-wrap:balance]">
                  {item.name}
                </div>
                <div className="text-xs text-muted mt-0.5">单位：{item.unit}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted">¥</span>
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) =>
                    handlePriceChange(item.id, Number(e.target.value))
                  }
                  className="w-20 h-9 px-2 text-right rounded-xl border border-line bg-surface text-sm font-semibold text-ink focus:outline-hidden focus:border-ink tabular-nums"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-line">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full min-h-[46px] rounded-xl bg-action text-inverse font-semibold text-xs hover:bg-actionPressed active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 shadow-xs"
          >
            <Check size={16} />
            保存我的单价设置
          </button>
        </div>
      </div>
    </div>
  );
};
