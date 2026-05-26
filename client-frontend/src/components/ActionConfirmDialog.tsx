import React from 'react';

export interface ActionConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  /** 突出显示价格 */
  price?: number | null;
  /** 二级信息条目 */
  details?: Array<{ label: string; value: React.ReactNode }>;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ActionConfirmDialog: React.FC<ActionConfirmDialogProps> = ({
  open,
  title,
  description,
  price,
  details,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const confirmBg =
    variant === 'danger'
      ? 'bg-red-500 active:bg-red-600'
      : 'bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3]';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <h2 className="text-[18px] font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>
        )}

        {price != null && (
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#FF6B8A] to-[#FF8FA3] px-5 py-5 text-white shadow-md">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/72">
              报价金额
            </p>
            <p className="mt-1 text-[2rem] font-bold leading-none">¥{price}</p>
          </div>
        )}

        {details && details.length > 0 && (
          <div className="mt-4 space-y-2 rounded-2xl bg-gray-50 p-4">
            {details.map((d, i) => (
              <div key={i} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-gray-500">{d.label}</span>
                <span className="text-right font-medium text-gray-900">{d.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-full bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 active:scale-[0.98] disabled:opacity-60"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-md active:scale-[0.98] disabled:opacity-60 ${confirmBg}`}
          >
            {loading ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
