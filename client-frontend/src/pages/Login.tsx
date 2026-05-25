import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService, type Technician } from '../services/auth';
import nailLoginBg from '../assets/nail-login-bg.png';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, registerByInvite, isAuthenticated } = useAuth();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [foundTechnician, setFoundTechnician] = useState<Technician | null>(null);
  const [checkingInviteCode, setCheckingInviteCode] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const inviteLookupRequestId = useRef(0);

  const techId = searchParams.get('tech_id');
  const inviteCode = searchParams.get('invite_code');
  const inviteCodeFromUrl = inviteCode?.trim() ?? '';
  const isInviteMode = inviteCodeFromUrl.length > 0;

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }

    try {
      setError('');

      if (isInviteMode) {
        await authService.requestRegisterCode(phone, inviteCodeFromUrl);
      } else if (isNewUser) {
        const normalizedInviteCode = inviteCodeInput.trim();
        if (!normalizedInviteCode) {
          setError('请输入美甲师邀请码');
          return;
        }
        await authService.requestRegisterCode(phone, normalizedInviteCode);
      } else {
        await authService.requestLoginCode(phone);
      }

      setCountdown(60);
    } catch {
      setError('获取验证码失败，请稍后重试');
    }
  };

  const handleInviteCodeChange = async (value: string) => {
    setInviteCodeInput(value);
    const requestId = ++inviteLookupRequestId.current;

    if (value.length >= 4) {
      setCheckingInviteCode(true);
      try {
        const tech = await authService.findTechnicianByInviteCode(value);
        if (inviteLookupRequestId.current === requestId) {
          setFoundTechnician(tech);
        }
      } catch {
        if (inviteLookupRequestId.current === requestId) {
          setFoundTechnician(null);
        }
      } finally {
        if (inviteLookupRequestId.current === requestId) {
          setCheckingInviteCode(false);
        }
      }
    } else {
      setCheckingInviteCode(false);
      setFoundTechnician(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }
    if (!code || code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }
    if (!agreed) {
      setError('请阅读并同意用户协议');
      return;
    }

    setLoading(true);
    try {
      if (isInviteMode) {
        // Invite link registration
        await registerByInvite(phone, code, Number(techId ?? '0'), inviteCodeFromUrl);
      } else if (isNewUser) {
        // New user registration - need invite code
        const normalizedInviteCode = inviteCodeInput.trim();
        if (!normalizedInviteCode) {
          setError('请输入美甲师邀请码');
          setLoading(false);
          return;
        }
        if (!foundTechnician) {
          setError('该邀请码无效，请跟您的美甲师确认后再注册');
          setLoading(false);
          return;
        }
        await registerByInvite(phone, code, foundTechnician.id, normalizedInviteCode);
      } else {
        // Existing user login
        await login(phone, code);
      }
      navigate('/home', { replace: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '登录失败，请重试';
      setError(message);
      // If user not found, switch to registration mode
      if (message.includes('尚未绑定') || message.includes('不存在') || message.includes('未注册')) {
        setIsNewUser(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-gradient-to-br from-[#FFF0F3] via-[#FFF8FA] to-white">
      <div
        className="pointer-events-none absolute inset-y-0 right-[-28%] w-[95%] bg-contain bg-right-bottom bg-no-repeat opacity-90"
        style={{ backgroundImage: `url(${nailLoginBg})` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,248,250,0.98)_0%,rgba(255,248,250,0.96)_34%,rgba(255,248,250,0.84)_58%,rgba(255,248,250,0.35)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,247,249,0.95)_0%,rgba(255,247,249,0.82)_24%,rgba(255,247,249,0.7)_52%,rgba(255,247,249,0.92)_82%,rgba(255,247,249,1)_100%)]" />
      <section className="h-full flex flex-col">
        {/* Header */}
        <div className="relative z-10 px-6 pt-[max(1.5rem,env(safe-area-inset-top)+0.75rem)] pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6B8A] to-[#FF8FA3] flex items-center justify-center shadow-lg shadow-pink-200">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <div>
              <h1 className="text-heading-3 text-[var(--color-text)]">NailArt：您的专属美甲师</h1>
              <p className="text-caption text-[var(--color-text-muted)] mt-0.5">更专业的服务，更高效的管理</p>
            </div>
          </div>
        </div>

        {/* Hero + Form */}
        <div className="relative z-10 flex-1 flex items-center px-6 py-2 min-h-0">
          <div className="w-full max-w-none">
            <div className="mb-5">
              <h2 className="text-display text-[var(--color-text)]">
                {isInviteMode ? '接受邀请' : isNewUser ? '注册账号' : '欢迎回来'}
              </h2>
              <p className="text-body text-[var(--color-text-secondary)] mt-2">
                {isInviteMode
                  ? '您正在接受美甲师的邀请，注册后即可享受服务'
                  : isNewUser
                  ? '请输入邀请码完成注册'
                  : '登录后，继续预约你的美甲服务'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
          {/* Phone Input */}
            <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden card-shadow">
              <div className="flex items-center px-4 py-4 border-b border-[var(--color-border-light)]">
                <svg className="w-5 h-5 text-[var(--color-text-muted)] mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="请输入手机号"
                  className="flex-1 outline-none text-body text-[var(--color-text)] placeholder:text-[var(--color-text-placeholder)]"
                  maxLength={11}
                />
              </div>
              <div className="flex items-center px-4 py-4">
                <svg className="w-5 h-5 text-[var(--color-text-muted)] mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="请输入验证码"
                  className="flex-1 outline-none text-body text-[var(--color-text)] placeholder:text-[var(--color-text-placeholder)]"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  className={`text-body-sm font-medium whitespace-nowrap transition-colors ${
                    countdown > 0 ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-primary)]'
                  }`}
                >
                  {countdown > 0 ? `${countdown}s后重试` : '获取验证码'}
                </button>
              </div>
            </div>

          {/* Invite Code Input - Show for new users without invite link */}
          {isNewUser && !isInviteMode && (
            <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden card-shadow">
              <div className="flex items-center px-4 py-4">
                <svg className="w-5 h-5 text-[var(--color-text-muted)] mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <input
                  type="text"
                  value={inviteCodeInput}
                  onChange={(e) => handleInviteCodeChange(e.target.value.trim())}
                  placeholder="请输入美甲师邀请码"
                  className="flex-1 outline-none text-body text-[var(--color-text)] placeholder:text-[var(--color-text-placeholder)]"
                />
                {checkingInviteCode && (
                  <div className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              {foundTechnician && (
                <div className="px-4 py-3 bg-[var(--color-primary-soft)] border-t border-[var(--color-border-light)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      {foundTechnician.avatarUrl ? (
                        <img src={foundTechnician.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-body-sm font-medium text-[var(--color-text)]">{foundTechnician.name}</p>
                      <p className="text-caption text-[var(--color-text-muted)]">邀请码有效</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Agreement */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAgreed(!agreed)}
              className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                agreed ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border border-[var(--color-border)]'
              }`}
            >
              {agreed && (
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span className="text-body-sm text-[var(--color-text-secondary)]">
              我已阅读并同意 <span className="text-[var(--color-primary)]">《用户协议》</span> 和 <span className="text-[var(--color-primary)]">《隐私政策》</span>
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-body-sm text-[var(--color-error)] text-center">{error}</div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] text-white rounded-full text-body font-medium shadow-lg shadow-pink-200 active:scale-[0.98] transition-transform disabled:opacity-70"
          >
            {loading ? '登录中...' : isNewUser ? '注册' : '登录'}
          </button>

          {/* Toggle Login/Register */}
          {!isInviteMode && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsNewUser(!isNewUser);
                  setError('');
                  setInviteCodeInput('');
                  setFoundTechnician(null);
                }}
                className="text-body-sm text-[var(--color-primary)]"
              >
                {isNewUser ? '已有账号？去登录' : '没有账号？去注册'}
              </button>
            </div>
          )}

          {!isInviteMode && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <span className="text-body-sm text-[var(--color-text-muted)]">我是美甲师？</span>
              <button
                type="button"
                onClick={() => window.location.href = (import.meta.env.VITE_TECHNICIAN_LOGIN_URL || '/login')}
                className="flex h-11 items-center rounded-full px-3 text-body-sm font-medium text-[var(--color-primary)] transition-colors active:bg-[var(--color-primary-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              >
                切换到美甲师登录
              </button>
            </div>
          )}
            </form>

            {/* WeChat Login */}
            <div className="mt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-px bg-[var(--color-border)]"></div>
                <span className="text-caption text-[var(--color-text-muted)]">其他登录方式</span>
                <div className="flex-1 h-px bg-[var(--color-border)]"></div>
              </div>
              <div className="flex justify-center">
                <button className="w-12 h-12 rounded-full bg-[#07C160] flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                  </svg>
                </button>
              </div>
              <p className="text-center text-caption text-[var(--color-text-muted)] mt-2">微信登录</p>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="px-6 pb-[max(1.25rem,env(safe-area-inset-bottom)+0.5rem)] pt-2 shrink-0">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-[var(--color-primary-soft)] flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-caption font-medium text-[var(--color-text)]">专属美甲师服务</p>
              <p className="text-caption text-[var(--color-text-muted)] mt-0.5">绑定信任的美甲师更安心</p>
            </div>
            <div>
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-[var(--color-primary-soft)] flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h8m-8 4h5m5 7l-3.405-3.405A2.032 2.032 0 0114 16.158V13a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L-2 21h20z" />
                </svg>
              </div>
              <p className="text-caption font-medium text-[var(--color-text)]">一对一高效沟通</p>
              <p className="text-caption text-[var(--color-text-muted)] mt-0.5">款式、时间、报价随时确认</p>
            </div>
            <div>
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-[var(--color-primary-soft)] flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16l3-3 2 2 5-6m-2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-caption font-medium text-[var(--color-text)]">定制化美甲设计</p>
              <p className="text-caption text-[var(--color-text-muted)] mt-0.5">上传参考图打造专属款式</p>
            </div>
          </div>
          <p className="text-center text-caption text-[var(--color-text-muted)] mt-4">
            登录遇到问题？<span className="text-[var(--color-primary)]">联系客服</span>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Login;
