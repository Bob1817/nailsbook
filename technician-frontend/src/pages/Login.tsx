import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/auth';
import { ServiceTypeSetupModal } from '../components/ServiceTypeSetupModal';
import loginHero from '../assets/nail-login-bg.png';
import type { ServiceTypeSettings } from '../contexts/authTypes';

type LoginMode = 'password' | 'code';

export const Login: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loginMode, setLoginMode] = useState<LoginMode>('code');
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
  const { login, updateServiceType } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [countdown]);

  const getErrorMessage = (unknownError: unknown, fallback: string) => {
    if (axios.isAxiosError(unknownError)) {
      const message = unknownError.response?.data?.message;
      if (typeof message === 'string' && message) {
        return message;
      }
      if (Array.isArray(message) && typeof message[0] === 'string') {
        return message[0];
      }
    }

    return fallback;
  };

  const handleSendCode = async () => {
    setError('');

    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }

    setSendingCode(true);

    try {
      await authService.requestCode(phone);
      setCountdown(60);
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, '验证码发送失败，请稍后重试'));
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreed) {
      setError('请阅读并同意用户协议和隐私政策');
      return;
    }

    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }

    if (loginMode === 'code' && !code) {
      setError('请输入验证码');
      return;
    }

    if (loginMode === 'password' && !password) {
      setError('请输入密码');
      return;
    }

    setLoading(true);

    try {
      await login(phone, loginMode === 'password' ? password : code);
      // Check if service type is set, if not show setup modal
      const storedTechnician = localStorage.getItem('technician_info');
      if (storedTechnician) {
        const technician = JSON.parse(storedTechnician);
        if (technician.homeService === undefined && technician.shopService === undefined) {
          setShowServiceTypeModal(true);
          return;
        }
      }
      navigate('/');
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, '登录失败，请检查输入信息'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#fffaf9]">
      <div className="relative h-full overflow-hidden">
        <div
          className="absolute right-[-8%] top-0 h-[32rem] w-[78%] bg-contain bg-right-top bg-no-repeat"
          style={{
            backgroundImage: `url(${loginHero})`,
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,251,250,0.99)_0%,rgba(255,251,250,0.95)_28%,rgba(255,248,247,0.7)_54%,rgba(255,246,246,0.18)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,250,249,0.16)_0%,rgba(255,250,249,0.24)_18%,rgba(255,250,249,0.62)_46%,rgba(255,250,249,0.92)_68%,#fffaf9_100%)]" />
        <div className="absolute left-[-18%] top-[2.8rem] h-[14rem] w-[20rem] rounded-full bg-white/95 blur-[50px]" />
        <div className="absolute left-[-10%] top-[11rem] h-[12rem] w-[19rem] rounded-full bg-white/88 blur-[54px]" />
        <div className="absolute inset-x-[-8%] bottom-[-1.5rem] h-[13rem] rounded-[50%] bg-white/94 blur-[30px]" />

        <div className="relative z-10 mx-auto flex h-full max-w-[398px] flex-col px-5 pb-2 pt-8">
          <div className="flex items-center gap-3 pt-3">
            <div className="flex h-[3.15rem] w-[3.15rem] items-center justify-center rounded-[0.95rem] bg-gradient-to-br from-[#ff6889] to-[#f55684] shadow-[0_12px_22px_rgba(255,112,154,0.16)]">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-[1.42rem] font-extrabold leading-none tracking-[-0.055em] text-[#0f1422]">NailArt：美甲师专用工具</h1>
              <p className="mt-1 text-[0.74rem] leading-[1.4] text-[#838998]">更专业的服务，更高效的管理</p>
            </div>
          </div>

          <div className="pt-[3.8rem]">
            <div className="flex items-end gap-1.5">
              <h2 className="text-[2.55rem] font-extrabold leading-[0.92] tracking-[-0.078em] text-[#0f1422]">欢迎回来</h2>
              <span
                className="-translate-y-0.5 rotate-[-8deg] whitespace-nowrap text-[1.28rem] leading-none text-[#ff6298]"
                style={{ fontFamily: '"Brush Script MT", "Comic Sans MS", cursive' }}
              >
                Welcome back
              </span>
            </div>
            <p className="mt-2.5 text-[0.84rem] leading-6 text-[#5a6475]">登录后，继续管理你的美甲事业</p>
          </div>

          <div className="relative mt-[4.75rem]">
            {error ? (
              <div className="pointer-events-none absolute left-1/2 top-[-3.75rem] z-20 w-full max-w-[min(414px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-red-200 bg-red-50/96 px-4 py-3 text-sm text-red-600 shadow-[0_10px_24px_rgba(255,120,120,0.12)]">
                {error}
              </div>
            ) : null}

            <div className="mx-auto flex w-full max-w-[min(414px,calc(100vw-2rem))] items-center justify-center border-b border-[#ece7eb] pb-2.5">
              <button
                type="button"
                onClick={() => setLoginMode('code')}
                className={`relative w-[6.5rem] pb-2 text-[0.88rem] font-semibold leading-none transition-colors ${
                  loginMode === 'code' ? 'text-[#111522]' : 'text-[#a7aebb]'
                }`}
              >
                验证码登录
                {loginMode === 'code' ? (
                  <span className="absolute bottom-0 left-1/2 h-[3px] w-[2.9rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#ff6d73] to-[#ff5f98]" />
                ) : null}
              </button>
              <span className="px-3.5 pb-2 text-[#ddd8dd]">|</span>
              <button
                type="button"
                onClick={() => setLoginMode('password')}
                className={`relative w-[6.5rem] pb-2 text-[0.88rem] font-semibold leading-none transition-colors ${
                  loginMode === 'password' ? 'text-[#111522]' : 'text-[#a7aebb]'
                }`}
              >
                密码登录
                {loginMode === 'password' ? (
                  <span className="absolute bottom-0 left-1/2 h-[3px] w-[2.9rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#ff6d73] to-[#ff5f98]" />
                ) : null}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mx-auto mt-4 w-full max-w-[min(414px,calc(100vw-2rem))] space-y-3.5">
              <div className="relative">
                <div className="pointer-events-none absolute left-4 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#8f97a6]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="tel"
                  placeholder="请输入手机号"
                  className="h-[3.2rem] w-full rounded-[1.2rem] border border-[#ece8ec] bg-white/88 pl-12 pr-4 text-[0.9rem] text-[#111827] shadow-[0_8px_18px_rgba(255,222,228,0.1)] placeholder:text-[#b1b8c4] focus:outline-none focus:ring-2 focus:ring-[#ff7ea9]/30"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  maxLength={11}
                />
              </div>

              {loginMode === 'code' ? (
                <div className="relative">
                  <div className="pointer-events-none absolute left-4 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#8f97a6]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="请输入验证码"
                    className="h-[3.2rem] w-full rounded-[1.2rem] border border-[#ece8ec] bg-white/88 pl-12 pr-28 text-[0.9rem] text-[#111827] shadow-[0_8px_18px_rgba(255,222,228,0.1)] placeholder:text-[#b1b8c4] focus:outline-none focus:ring-2 focus:ring-[#ff7ea9]/30"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                  />
                  <span className="absolute right-[5.5rem] top-1/2 h-5 w-px -translate-y-1/2 bg-[#ebe7eb]" />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={countdown > 0 || sendingCode}
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-[0.82rem] font-medium ${
                      countdown > 0 || sendingCode ? 'text-[#b0b6c2]' : 'text-[#ff607b]'
                    }`}
                  >
                    {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="pointer-events-none absolute left-4 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#8f97a6]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    placeholder="请输入密码"
                    className="h-[3.2rem] w-full rounded-[1.2rem] border border-[#ece8ec] bg-white/88 pl-12 pr-4 text-[0.9rem] text-[#111827] shadow-[0_8px_18px_rgba(255,222,228,0.1)] placeholder:text-[#b1b8c4] focus:outline-none focus:ring-2 focus:ring-[#ff7ea9]/30"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}

              <div className="flex items-start gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setAgreed(!agreed)}
                  className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
                    agreed ? 'border-[#ff6c94] bg-[#ff6c94]' : 'border-[#c6ceda] bg-white/90'
                  }`}
                >
                  {agreed ? (
                    <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : null}
                </button>
                <span className="text-[0.8rem] leading-5 text-[#8f96a5]">
                  我已阅读并同意
                  <span className="text-[#ff607e]">《用户协议》</span>
                  和
                  <span className="text-[#ff607e]">《隐私政策》</span>
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-[3.35rem] w-full rounded-[1.2rem] bg-gradient-to-r from-[#ff636e] to-[#ff71aa] text-[1rem] font-semibold text-white shadow-[0_12px_22px_rgba(255,112,156,0.14)] transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? '登录中...' : '登录'}
              </button>

              <div className="flex items-center justify-center gap-3 pt-1">
                <span className="text-[0.8rem] text-[#8f96a5]">我是美甲客户？</span>
                <button
                  type="button"
                  onClick={() => window.location.href = (import.meta.env.VITE_CLIENT_LOGIN_URL || '/login')}
                  className="flex h-11 items-center rounded-full px-3 text-[0.8rem] font-medium text-[#ff617b] transition-colors active:bg-[#fff1f4] focus:outline-none focus:ring-2 focus:ring-[#ff7ea9]/30"
                >
                  切换到客户登录
                </button>
              </div>
            </form>

            <div className="mx-auto mt-5 w-full max-w-[min(414px,calc(100vw-2rem))]">
              <div className="mb-3.5 flex items-center gap-3.5">
                <div className="h-px flex-1 bg-[#ece8ec]/90" />
                <span className="text-[0.8rem] text-[#a4abb7]">其他登录方式</span>
                <div className="h-px flex-1 bg-[#ece8ec]/90" />
              </div>

              <div className="flex flex-col items-center">
                <button className="flex h-[3.6rem] w-[3.6rem] items-center justify-center rounded-full border border-[#e8edf1] bg-white/96 shadow-[0_8px_18px_rgba(116,210,120,0.1)] active:scale-95">
                  <svg className="h-7 w-7 text-[#21c452]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.555a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.406-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z" />
                  </svg>
                </button>
                <span className="mt-2 text-[0.88rem] text-[#303745]">微信登录</span>
              </div>
            </div>

            <div className="mx-auto mt-5 w-full max-w-[min(414px,calc(100vw-2rem))] rounded-[1.45rem] border border-white/75 bg-white/62 px-3 py-3 shadow-[0_14px_30px_rgba(255,218,225,0.08)] backdrop-blur-md">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="relative px-2">
                  <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#fff2f6]/90 text-[#ff638f]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-[0.8rem] font-semibold text-[#222838]">高效管理行程</p>
                  <p className="mt-1 text-[0.7rem] leading-4 text-[#9da4b2]">上门服务更轻松</p>
                </div>
                <div className="relative px-2 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-px before:bg-[#ebe7eb]">
                  <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#fff2f6]/90 text-[#ff638f]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-[0.8rem] font-semibold text-[#222838]">管理客户关系</p>
                  <p className="mt-1 text-[0.7rem] leading-4 text-[#9da4b2]">提升客户复购率</p>
                </div>
                <div className="relative px-2 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-px before:bg-[#ebe7eb]">
                  <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#fff2f6]/90 text-[#ff638f]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-[0.8rem] font-semibold text-[#222838]">记录服务收入</p>
                  <p className="mt-1 text-[0.7rem] leading-4 text-[#9da4b2]">了解你的成长</p>
                </div>
              </div>
            </div>

            <p className="mx-auto mt-4 w-full max-w-[min(414px,calc(100vw-2rem))] text-center text-[0.8rem] text-[#8f96a5]">
              登录遇到问题？
              <span className="text-[#ff617b]">联系客服</span>
            </p>

          </div>
        </div>
      </div>

      {/* Service Type Setup Modal */}
      <ServiceTypeSetupModal
        isOpen={showServiceTypeModal}
        isForceSetup={true}
        onSubmit={async (settings: ServiceTypeSettings) => {
          await updateServiceType(settings);
          setShowServiceTypeModal(false);
          navigate('/');
        }}
      />
    </div>
  );
};
