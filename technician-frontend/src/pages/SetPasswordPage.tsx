import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import loginHero from '../assets/nail-login-bg.png';

export const SetPasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setPassword, setInitialPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const phone = (location.state as { phone?: string } | null)?.phone ?? '';
  const hasToken = !!localStorage.getItem('technician_token');

  // 进入条件：已登录（首次改密）或携带手机号（空密码首次设置）；都不满足则回登录页
  React.useEffect(() => {
    if (!hasToken && !phone) {
      navigate('/login', { replace: true });
    }
  }, [hasToken, phone, navigate]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return '密码至少 8 位';
    if (!/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return '密码需同时包含字母和数字';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pwdErr = validatePassword(newPassword);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }

    setLoading(true);
    try {
      if (hasToken) {
        // 首次登录改密（携带 token）
        await setPassword(newPassword);
      } else {
        // 空密码账户首次设置（凭手机号），设置后自动登录
        await setInitialPassword(phone, newPassword);
      }
      navigate('/');
    } catch {
      setError('密码设置失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--nb-page)]">
      <div className="relative min-h-screen overflow-hidden">
        <div
          className="absolute right-[-8%] top-0 h-[24rem] w-[78%] bg-contain bg-right-top bg-no-repeat opacity-80"
          style={{ backgroundImage: `url(${loginHero})` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0.85)_55%,var(--nb-page)_100%)]" />

        <div className="relative z-10 mx-auto flex max-w-[420px] flex-col px-5 pb-12 pt-12">
          {/* Brand —— 与登录/注册页保持一致 */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nb-action)] text-xl font-bold text-white shadow-lg">
              N
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[var(--nb-ink)]">NailArt 美甲师工具</h1>
              <p className="text-xs text-[var(--nb-muted)]">更专业的服务，更高效的管理</p>
            </div>
          </div>

          {/* Title */}
          <div className="mt-12">
            <h2 className="text-3xl font-extrabold text-[var(--nb-ink)]">设置登录密码</h2>
            <p className="mt-2 text-sm text-[var(--nb-secondary)]">
              首次登录请设置登录密码，密码至少 8 位，需包含字母和数字
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mt-6 rounded-xl border border-[var(--nb-line)] bg-[var(--nb-page)] px-4 py-3 text-sm text-[var(--nb-secondary)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {phone && (
              <div className="rounded-2xl bg-[var(--nb-page)] px-4 py-4 text-sm text-[var(--nb-secondary)]">
                手机号：{phone}
              </div>
            )}
            <input
              type="password"
              placeholder="设置新密码（至少 8 位，含字母和数字）"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-14 w-full rounded-2xl border border-[var(--nb-line)] bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-[var(--nb-control)]/30"
            />
            <input
              type="password"
              placeholder="确认新密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-14 w-full rounded-2xl border border-[var(--nb-line)] bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-[var(--nb-control)]/30"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-14 w-full rounded-2xl bg-[var(--nb-action)] text-base font-semibold text-white shadow-lg active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? '设置中...' : '确认设置并登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
