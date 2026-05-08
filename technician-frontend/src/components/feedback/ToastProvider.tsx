import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastTone = 'success' | 'warning' | 'error';

type ToastItem = {
  id: number;
  tone: ToastTone;
  message: string;
};

type ToastContextValue = {
  showToast: (tone: ToastTone, message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClasses: Record<ToastTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  warning: 'bg-orange-50 text-orange-600 ring-orange-100',
  error: 'bg-red-50 text-red-600 ring-red-100',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, number>>(new Map());

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (tone: ToastTone, message: string) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { id, tone, message }].slice(-3));
      const timer = window.setTimeout(() => removeToast(id), 2400);
      timersRef.current.set(id, timer);
    },
    [removeToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message) => showToast('success', message),
      warning: (message) => showToast('warning', message),
      error: (message) => showToast('error', message),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[max(16px,env(safe-area-inset-top))]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex min-h-[44px] w-full max-w-sm items-center justify-between rounded-[18px] px-4 py-3 text-sm shadow-[0_8px_24px_rgba(29,35,53,0.08)] ring-1 backdrop-blur ${toneClasses[toast.tone]}`}
          >
            <span className="pr-3">{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-current/60 active:bg-black/5"
              aria-label="关闭提示"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
