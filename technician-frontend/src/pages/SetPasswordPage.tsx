import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const SetPasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setPassword } = useAuth();
  const navigate = useNavigate();

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
      await setPassword(newPassword);
      navigate('/');
    } catch {
      setError('密码设置失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffaf9] flex items-center justify-center px-5">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center gap-3 mb-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6889] to-[#f55684] text-xl font-bold text-white shadow-lg">
            N
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#0f1422]">NailArt 美甲师工具</h1>
            <p className="text-xs text-[#838998]">更专业的服务，更高效的管理</p>
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-[#0f1422]">设置登录密码</h2>
        <p className="mt-2 text-sm text-[#5a6475]">请设置您的登录密码，密码至少 8 位，需包含字母和数字</p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            type="password"
            placeholder="设置新密码（至少 8 位，含字母和数字）"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-14 w-full rounded-2xl border border-[#ece8ec] bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-[#ff7ea9]/30"
          />
          <input
            type="password"
            placeholder="确认新密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-14 w-full rounded-2xl border border-[#ece8ec] bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-[#ff7ea9]/30"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#ff636e] to-[#ff71aa] text-base font-semibold text-white shadow-lg active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? '设置中...' : '确认设置'}
          </button>
        </form>
      </div>
    </div>
  );
};
