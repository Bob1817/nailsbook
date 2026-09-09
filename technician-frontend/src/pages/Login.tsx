import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/auth';
import { ServiceTypeSetupModal } from '../components/ServiceTypeSetupModal';
import type { ServiceTypeSettings } from '../contexts/authTypes';

type Step = 'phone' | 'login' | 'register';

export const Login: React.FC = () => {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteKey, setInviteKey] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
  const [showWorkTimePrompt, setShowWorkTimePrompt] = useState(false);
  const { login, register, updateServiceType } = useAuth();
  const navigate = useNavigate();

  const getErrorMessage = (unknownError: unknown, fallback: string) => {
    if (axios.isAxiosError(unknownError)) {
      const message = unknownError.response?.data?.message;
      if (typeof message === 'string' && message) return message;
      if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
    }
    return fallback;
  };

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return '密码至少 8 位';
    if (!/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return '密码需同时包含字母和数字';
    return null;
  };

  const handlePhoneNext = async () => {
    setError('');
    setPhoneError('');
    // （1）是否为有效手机号码
    if (!/^1\d{10}$/.test(phone)) {
      setPhoneError('请输入有效手机号码');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.checkPhone(phone);
      if (!res.exists) {
        // （2）未注册 → 跳转注册
        setStep('register');
      } else if (!res.activated) {
        // （3）已注册但未设置登录密码 → 跳转设置密码（设置后自动登录）
        navigate('/set-password', { state: { phone } });
      } else {
        // （4）已设置登录密码 → 进入密码登录
        setStep('login');
      }
    } catch (e) {
      setPhoneError(getErrorMessage(e, '检查失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agreed) {
      setError('请阅读并同意用户协议和隐私政策');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }
    setLoading(true);
    try {
      const result = await login(phone, password);
      if (result.mustChangePassword) {
        navigate('/set-password', { state: { phone } });
        return;
      }
      const storedTechnician = localStorage.getItem('technician_info');
      if (storedTechnician) {
        const technician = JSON.parse(storedTechnician);
        if (technician.homeService === undefined && technician.shopService === undefined) {
          setShowServiceTypeModal(true);
          return;
        }
      }
      navigate('/');
    } catch (e) {
      setError(getErrorMessage(e, '登录失败，请检查手机号和密码'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agreed) {
      setError('请阅读并同意用户协议和隐私政策');
      return;
    }
    if (!/^[A-Z0-9]{16}$/.test(inviteKey)) {
      setError('邀请密钥格式为 16 位大写字母+数字');
      return;
    }
    if (!name.trim()) {
      setError('请输入姓名');
      return;
    }
    const pwdErr = validatePassword(password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    if (password !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }
    setLoading(true);
    try {
      await register({ inviteKey, name: name.trim(), phone, password });
      setShowServiceTypeModal(true);
    } catch (err) {
      setError(getErrorMessage(err, '注册失败，请检查邀请密钥'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--nb-page)]">
      <div className="relative min-h-screen overflow-hidden">

        <div className="relative z-10 mx-auto flex max-w-[420px] flex-col px-5 pb-12 pt-12">
          {/* Brand */}
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
            <h2 className="text-3xl font-extrabold text-[var(--nb-ink)]">
              {step === 'phone' && '欢迎使用'}
              {step === 'login' && '欢迎回来'}
              {step === 'register' && '完成注册'}
            </h2>
            <p className="mt-2 text-sm text-[var(--nb-secondary)]">
              {step === 'phone' && '输入手机号开始'}
              {step === 'login' && '该手机号已注册，请输入密码登录'}
              {step === 'register' && '使用邀请密钥完成账号创建'}
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div id="login-error" role="alert" className="mt-6 rounded-xl border border-[var(--nb-line)] bg-[var(--nb-page)] px-4 py-3 text-sm text-[var(--nb-secondary)]">
              {error}
            </div>
          )}

          {/* Step 1: phone */}
          {step === 'phone' && (
            <div className="mt-8 space-y-4">
              <input
                type="tel"
                aria-label="手机号"
                aria-invalid={Boolean(phoneError)}
                aria-describedby={phoneError ? 'phone-error' : undefined}
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 11));
                  if (phoneError) setPhoneError('');
                }}
                maxLength={11}
                className={`h-14 w-full rounded-2xl border bg-white px-4 text-base text-[var(--nb-ink)] placeholder:text-[var(--nb-muted)] focus:outline-none focus:ring-2 ${
                  phoneError
                    ? 'border-[var(--nb-ink)] focus:ring-[var(--nb-line)]'
                    : 'border-[var(--nb-line)] focus:ring-[var(--nb-control)]/30'
                }`}
              />
              <button
                onClick={handlePhoneNext}
                disabled={loading}
                className="h-14 w-full rounded-2xl bg-[var(--nb-action)] text-base font-semibold text-white shadow-lg active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? '检查中...' : '下一步'}
              </button>
              {phoneError && (
                <p id="phone-error" role="alert" className="text-center text-sm font-medium text-[var(--nb-secondary)]">{phoneError}</p>
              )}
            </div>
          )}

          {/* Step 2: login */}
          {step === 'login' && (
            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              <div className="rounded-2xl bg-[var(--nb-page)] px-4 py-4 text-sm text-[var(--nb-secondary)]">
                手机号：{phone}
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="float-right text-[var(--nb-ink)]"
                >
                  换个号
                </button>
              </div>
              <input
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 w-full rounded-2xl border border-[var(--nb-line)] bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-[var(--nb-control)]/30"
              />
              <AgreementCheckbox agreed={agreed} setAgreed={setAgreed} />
              <button
                type="submit"
                disabled={loading}
                className="h-14 w-full rounded-2xl bg-[var(--nb-action)] text-base font-semibold text-white shadow-lg active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? '登录中...' : '登录'}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-[var(--nb-ink)]"
                >
                  忘记密码？
                </button>
              </div>
            </form>
          )}

          {/* Step 3: register */}
          {step === 'register' && (
            <form onSubmit={handleRegister} className="mt-8 space-y-4">
              <div className="rounded-xl bg-[var(--nb-page)] px-4 py-3 text-sm text-[var(--nb-ink)]">
                该手机号未注册，请使用邀请密钥完成注册
              </div>
              <div className="rounded-2xl bg-[var(--nb-page)] px-4 py-4 text-sm text-[var(--nb-secondary)]">
                手机号：{phone}
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="float-right text-[var(--nb-ink)]"
                >
                  换个号
                </button>
              </div>
              <input
                type="text"
                placeholder="邀请密钥（16 位大写字母+数字）"
                value={inviteKey}
                onChange={(e) =>
                  setInviteKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16))
                }
                maxLength={16}
                className="h-14 w-full rounded-2xl border border-[var(--nb-line)] bg-white px-4 text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--nb-control)]/30"
              />
              <input
                type="text"
                placeholder="姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 w-full rounded-2xl border border-[var(--nb-line)] bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-[var(--nb-control)]/30"
              />
              <input
                type="password"
                placeholder="设置密码（至少 8 位，含字母和数字）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 w-full rounded-2xl border border-[var(--nb-line)] bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-[var(--nb-control)]/30"
              />
              <input
                type="password"
                placeholder="确认密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-14 w-full rounded-2xl border border-[var(--nb-line)] bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-[var(--nb-control)]/30"
              />
              <AgreementCheckbox agreed={agreed} setAgreed={setAgreed} />
              <button
                type="submit"
                disabled={loading}
                className="h-14 w-full rounded-2xl bg-[var(--nb-action)] text-base font-semibold text-white shadow-lg active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? '注册中...' : '注册并登录'}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-[var(--nb-muted)]">
            登录遇到问题？<span className="text-[var(--nb-ink)]">联系客服</span>
          </p>
        </div>
      </div>

      <ServiceTypeSetupModal
        isOpen={showServiceTypeModal}
        isForceSetup={false}
        onClose={() => navigate('/')}
        onSubmit={async (settings: ServiceTypeSettings) => {
          await updateServiceType(settings);
          setShowServiceTypeModal(false);
          setShowWorkTimePrompt(true);
        }}
      />

      {/* Step 2: Work Time Prompt */}
      {showWorkTimePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="mb-3 text-lg font-bold text-[var(--nb-ink)]">设置工作时间</h3>
            <p className="mb-6 text-sm text-[var(--nb-secondary)]">
              服务类型已设置。建议现在设置工作时间，方便客户预约。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex-1 min-h-[44px] rounded-2xl border border-[var(--nb-line)] bg-white px-4 py-3 text-sm font-medium text-[var(--nb-secondary)] hover:bg-[var(--nb-page)] active:bg-[var(--nb-page)]"
              >
                暂不设置
              </button>
              <button
                onClick={() => navigate('/me?setup=worktime')}
                className="flex-1 min-h-[44px] rounded-2xl bg-[var(--nb-action)] px-4 py-3 text-sm font-semibold text-white shadow-lg active:scale-[0.99]"
              >
                去设置工作时间
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AgreementCheckbox: React.FC<{
  agreed: boolean;
  setAgreed: (v: boolean) => void;
}> = ({ agreed, setAgreed }) => (
  <div className="flex items-start gap-2 pt-1">
    <button
      type="button"
      onClick={() => setAgreed(!agreed)}
      className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
        agreed ? 'border-[var(--nb-control)] bg-[var(--nb-action)]' : 'border-[var(--nb-line)] bg-white'
      }`}
    >
      {agreed && (
        <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
    <span className="text-xs text-[var(--nb-muted)]">
      我已阅读并同意
      <span className="text-[var(--nb-ink)]">《用户协议》</span>和
      <span className="text-[var(--nb-ink)]">《隐私政策》</span>
    </span>
  </div>
);
