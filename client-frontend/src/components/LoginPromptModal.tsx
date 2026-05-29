import React from 'react';

interface LoginPromptModalProps {
  open: boolean;
  message?: string;
  onLogin: () => void;
  onClose: () => void;
}

const LoginPromptModal: React.FC<LoginPromptModalProps> = ({
  open,
  message = '登录后即可点赞、收藏、评论与预约',
  onLogin,
  onClose,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-8" onClick={onClose}>
      <div
        className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-pink-50 text-2xl">💅</div>
        <p className="text-base font-semibold text-[var(--color-text,#1f2230)]">登录后体验更多</p>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted,#8d8590)]">{message}</p>
        <button
          onClick={onLogin}
          className="mt-5 w-full rounded-full bg-[var(--color-primary)] py-3 text-sm font-semibold text-white active:opacity-90"
        >
          去登录 / 注册
        </button>
        <button
          onClick={onClose}
          className="mt-2 w-full rounded-full py-2.5 text-sm font-medium text-[var(--color-text-muted,#8d8590)]"
        >
          稍后再说
        </button>
      </div>
    </div>
  );
};

export default LoginPromptModal;
