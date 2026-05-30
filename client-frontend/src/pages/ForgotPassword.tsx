import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

const inputClass =
  'h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-base focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSend = async () => {
    setError('');
    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    setSending(true);
    try {
      const res = await authService.sendResetCode(phone);
      setDevCode(res.devCode);
      setCountdown(60);
    } catch {
      setError('发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^1\d{10}$/.test(phone)) return setError('请输入正确的手机号');
    if (!code.trim()) return setError('请输入验证码');
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return setError('新密码至少 8 位，需含字母和数字');
    }
    if (newPassword !== confirm) return setError('两次输入的新密码不一致');
    setSubmitting(true);
    try {
      await authService.resetPassword(phone, code.trim(), newPassword);
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '重置失败，请重试';
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#FFF7FA_0%,#FDF2F8_100%)] px-6 pt-[max(3rem,env(safe-area-inset-top)+1rem)]">
      <button onClick={() => navigate(-1)} className="mb-6 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5" aria-label="返回">
        <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <h1 className="text-2xl font-bold text-gray-900">找回密码</h1>
      <p className="mt-2 text-sm text-gray-400">通过注册手机号验证后重置登录密码</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input type="tel" inputMode="numeric" placeholder="请输入手机号" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={11} className={inputClass} />
        <div className="flex gap-3">
          <input type="text" inputMode="numeric" placeholder="验证码" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} className={`${inputClass} flex-1`} />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || countdown > 0}
            className="h-12 shrink-0 rounded-xl bg-pink-50 px-4 text-sm font-semibold text-pink-500 disabled:opacity-50"
          >
            {countdown > 0 ? `${countdown}s` : sending ? '发送中' : '发送验证码'}
          </button>
        </div>
        {devCode && <p className="text-xs text-gray-400">开发环境验证码：{devCode}</p>}
        <input type="password" placeholder="新密码（至少 8 位，含字母和数字）" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" className={inputClass} />
        <input type="password" placeholder="确认新密码" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={inputClass} />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 font-semibold text-white shadow-md active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? '提交中...' : '重置密码'}
        </button>
      </form>
    </div>
  );
};

export default ForgotPassword;
