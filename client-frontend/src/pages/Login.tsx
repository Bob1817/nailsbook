import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import nailLoginBg from '../assets/nail-login-bg.png';

type Step = 'phone' | 'login' | 'register';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, registerByInvite, isAuthenticated } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(searchParams.get('invite_code') || '');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const getErrorMessage = (e: unknown, fallback: string) => {
    if (axios.isAxiosError(e)) {
      const m = e.response?.data?.message;
      if (typeof m === 'string') return m;
      if (Array.isArray(m) && typeof m[0] === 'string') return m[0];
    }
    return fallback;
  };

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return '密码至少 8 位';
    if (!/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return '密码需同时包含字母和数字';
    return null;
  };

  const handlePhoneNext = async () => {
    setError('');
    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.checkPhone(phone);
      setStep(res.exists ? 'login' : 'register');
    } catch (e) {
      setError(getErrorMessage(e, '请求失败'));
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
      await login(phone, password);
      navigate('/home', { replace: true });
    } catch (e) {
      setError(getErrorMessage(e, '登录失败'));
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
    if (!inviteCode.trim()) {
      setError('请输入美甲师邀请码');
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
      await registerByInvite(phone, password, inviteCode.trim());
      navigate('/home', { replace: true });
    } catch (e) {
      setError(getErrorMessage(e, '注册失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${nailLoginBg})` }}
    >
      <div className="min-h-screen bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md flex-col px-6 pt-16 pb-12">
          <div className="mb-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-400 text-2xl font-bold text-white shadow-lg">
              N
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">NailBook</h1>
            <p className="mt-1 text-sm text-gray-500">美甲预约，让美丽更简单</p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            {step === 'phone' && '欢迎使用'}
            {step === 'login' && '欢迎回来'}
            {step === 'register' && '完成注册'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {step === 'phone' && '输入手机号开始'}
            {step === 'login' && '请输入密码登录'}
            {step === 'register' && '使用美甲师邀请码完成注册'}
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {step === 'phone' && (
            <div className="mt-6 space-y-4">
              <input
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                maxLength={11}
                className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-base placeholder:text-gray-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
              <button
                onClick={handlePhoneNext}
                disabled={loading}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 font-semibold text-white shadow-md active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? '检查中...' : '下一步'}
              </button>
            </div>
          )}

          {step === 'login' && (
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
                <span>手机号：{phone}</span>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-pink-500"
                >
                  换个号
                </button>
              </div>
              <input
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-base focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
              <AgreementCheckbox agreed={agreed} setAgreed={setAgreed} />
              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 font-semibold text-white shadow-md active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <div className="rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-600">
                该手机号未注册，请使用美甲师邀请码完成注册
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
                <span>手机号：{phone}</span>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-pink-500"
                >
                  换个号
                </button>
              </div>
              <input
                type="text"
                placeholder="美甲师邀请码"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-base focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
              <input
                type="password"
                placeholder="设置密码（至少 8 位，含字母和数字）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-base focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
              <input
                type="password"
                placeholder="确认密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-base focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
              <AgreementCheckbox agreed={agreed} setAgreed={setAgreed} />
              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 font-semibold text-white shadow-md active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? '注册中...' : '注册并登录'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const AgreementCheckbox: React.FC<{ agreed: boolean; setAgreed: (v: boolean) => void }> = ({
  agreed,
  setAgreed,
}) => (
  <div className="flex items-start gap-2 pt-1">
    <button
      type="button"
      onClick={() => setAgreed(!agreed)}
      className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${
        agreed ? 'border-pink-500 bg-pink-500' : 'border-gray-300 bg-white'
      }`}
    >
      {agreed && (
        <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
    <span className="text-xs text-gray-500">
      我已阅读并同意<span className="text-pink-500">《用户协议》</span>和
      <span className="text-pink-500">《隐私政策》</span>
    </span>
  </div>
);

export default Login;
