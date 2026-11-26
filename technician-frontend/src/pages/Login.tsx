import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/auth';
import { ServiceTypeSetupModal } from '../components/ServiceTypeSetupModal';
import type { ServiceTypeSettings } from '../contexts/authTypes';

type Step = 'phone' | 'login' | 'register';
type LoginMode = 'qr' | 'password';

export const Login: React.FC = () => {
  const [loginMode, setLoginMode] = useState<LoginMode>('password');
  const [qrSceneToken, setQrSceneToken] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<'loading' | 'pending' | 'scanned' | 'expired' | 'unavailable' | 'error'>('loading');
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
  const { login, loginWithToken, register, updateServiceType } = useAuth();
  const navigate = useNavigate();

  const refreshQrCode = useCallback(async () => {
    setQrStatus('loading');
    try {
      const session = await authService.createQrSession();
      if (!session.available || !session.qrImageUrl) {
        setQrSceneToken('');
        setQrImageUrl(null);
        setQrStatus('unavailable');
        return;
      }
      setQrSceneToken(session.sceneToken);
      setQrImageUrl(session.qrImageUrl);
      setQrStatus('pending');
    } catch {
      setQrStatus('error');
    }
  }, []);

  useEffect(() => {
    if (loginMode !== 'qr') return;
    void refreshQrCode();
  }, [loginMode, refreshQrCode]);

  useEffect(() => {
    if (loginMode !== 'qr' || !qrSceneToken) return;
    if (qrStatus !== 'pending' && qrStatus !== 'scanned') return;

    const timer = window.setInterval(async () => {
      try {
        const res = await authService.getQrSessionStatus(qrSceneToken);
        if (res.status === 'scanned') {
          setQrStatus('scanned');
        } else if (res.status === 'expired') {
          setQrStatus('expired');
        } else if (res.status === 'confirmed' && res.accessToken && res.technician) {
          window.clearInterval(timer);
          loginWithToken(res.accessToken, res.technician);
          navigate('/');
        }
      } catch {
        // 轮询偶发网络抖动不中断，等待下次轮询
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [loginMode, qrSceneToken, qrStatus, loginWithToken, navigate]);

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
              {loginMode === 'qr'
                ? '使用微信「扫一扫」授权登录美甲师管理后台'
                : step === 'phone'
                  ? '输入手机号以登录或注册美甲师账号'
                  : step === 'login'
                    ? '该手机号已注册，请输入密码登录'
                    : '使用邀请密钥完成账号创建'}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-xl border border-[var(--nb-line)] bg-[var(--nb-page)] p-1">
            <button
              type="button"
              onClick={() => setLoginMode('password')}
              className={`min-h-[40px] rounded-lg text-sm font-medium transition ${
                loginMode === 'password'
                  ? 'bg-[var(--nb-surface)] text-[var(--nb-ink)] shadow-sm'
                  : 'text-[var(--nb-muted)] hover:text-[var(--nb-ink)]'
              }`}
            >
              账号密码登录
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('qr')}
              className={`min-h-[40px] rounded-lg text-sm font-medium transition ${
                loginMode === 'qr'
                  ? 'bg-[var(--nb-surface)] text-[var(--nb-ink)] shadow-sm'
                  : 'text-[var(--nb-muted)] hover:text-[var(--nb-ink)]'
              }`}
            >
              微信扫码登录
            </button>
          </div>

          {loginMode === 'qr' && (
            <div className="mt-6 flex flex-col items-center rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-6">
              {qrStatus === 'unavailable' ? (
                <div className="space-y-3 py-6 text-center">
                  <p className="text-sm font-medium text-[var(--nb-ink)]">微信扫码登录暂未启用</p>
                  <p className="text-xs text-[var(--nb-muted)]">请直接使用手机号和密码登录创作者中心</p>
                  <button
                    type="button"
                    onClick={() => setLoginMode('password')}
                    className="min-h-[40px] rounded-xl bg-[var(--nb-action)] px-5 text-xs font-medium text-[var(--nb-inverse)]"
                  >
                    切回账号密码登录
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative flex h-[204px] w-[204px] items-center justify-center rounded-xl border border-[var(--nb-line)] bg-white p-2.5">
                    {qrStatus === 'loading' && (
                      <span className="text-sm text-[var(--nb-muted)]">正在生成二维码...</span>
                    )}
                    {qrStatus === 'error' && (
                      <button
                        type="button"
                        onClick={() => void refreshQrCode()}
                        className="rounded-lg bg-[var(--nb-action)] px-4 py-2 text-xs font-medium text-[var(--nb-inverse)]"
                      >
                        加载失败，点击重试
                      </button>
                    )}
                    {(qrStatus === 'pending' || qrStatus === 'scanned' || qrStatus === 'expired') && qrImageUrl && (
                      <img src={qrImageUrl} alt="微信扫码登录" className="h-[180px] w-[180px] object-contain" />
                    )}
                    {qrStatus === 'expired' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/95">
                        <span className="text-sm font-medium text-[var(--nb-ink)]">二维码已过期</span>
                        <button
                          type="button"
                          onClick={() => void refreshQrCode()}
                          className="min-h-[36px] rounded-lg bg-[var(--nb-action)] px-4 text-xs font-medium text-[var(--nb-inverse)]"
                        >
                          点击刷新
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="mt-4 text-center text-sm font-medium text-[var(--nb-ink)]">
                    {qrStatus === 'scanned'
                      ? '已扫码，正在完成授权登录...'
                      : '打开微信右上角「扫一扫」直接扫码登录'}
                  </p>
                  <button
                    type="button"
                    onClick={() => void refreshQrCode()}
                    className="mt-2 text-xs text-[var(--nb-link)] underline-offset-2 hover:underline"
                  >
                    刷新二维码
                  </button>
                </>
              )}
            </div>
          )}

          {loginMode === 'password' && (
            <>
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
                className={`h-14 w-full rounded-2xl border bg-[var(--nb-surface)] px-4 text-base text-[var(--nb-ink)] placeholder:text-[var(--nb-muted)] focus:outline-none focus:ring-2 ${
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
                className="h-14 w-full rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] px-4 text-base text-[var(--nb-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--nb-control)]/30"
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
                className="h-14 w-full rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] px-4 text-base text-[var(--nb-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--nb-control)]/30"
              />
              <input
                type="password"
                placeholder="设置密码（至少 8 位，含字母和数字）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 w-full rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] px-4 text-base text-[var(--nb-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--nb-control)]/30"
              />
              <input
                type="password"
                placeholder="确认密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-14 w-full rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] px-4 text-base text-[var(--nb-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--nb-control)]/30"
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
            </>
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
  <label className="flex cursor-pointer items-center gap-2 pt-1">
    <input
      type="checkbox"
      checked={agreed}
      onChange={(e) => setAgreed(e.target.checked)}
      className="h-4 w-4 shrink-0 rounded accent-[var(--nb-action)]"
    />
    <span className="text-xs leading-relaxed text-[var(--nb-muted)]">
      我已阅读并同意
      <span className="text-[var(--nb-ink)]">《用户协议》</span>和
      <span className="text-[var(--nb-ink)]">《隐私政策》</span>
    </span>
  </label>
);
