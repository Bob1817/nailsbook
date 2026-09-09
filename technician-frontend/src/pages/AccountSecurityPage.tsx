import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { SubPageHeader } from '../components/SubPageHeader';
import { authService } from '../services/auth';

const maskPhone = (phone?: string) => {
  if (!phone) return '未绑定';
  return phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(7)}` : phone;
};

const AccountSecurityPage: React.FC = () => {
  const { technician } = useAuth();
  const toast = useToast();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!oldPassword) {
      toast.warning('请输入当前密码');
      return;
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.warning('新密码至少 8 位，需同时包含字母和数字');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning('两次输入的新密码不一致');
      return;
    }
    setSubmitting(true);
    try {
      await authService.changePassword(oldPassword, newPassword);
      toast.success('密码修改成功');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message || '修改失败，请重试';
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClassName =
    'h-12 w-full rounded-[16px] border border-[var(--nb-line)] bg-[var(--nb-page)] px-4 text-sm text-[var(--nb-ink)] placeholder-[var(--nb-muted)] focus:border-[var(--nb-control)] focus:bg-white focus:outline-none';

  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--nb-page)]">
      <SubPageHeader title="账号与安全" />
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* 账号信息 */}
        <section className="rounded-[24px] bg-white p-5 shadow-[0_18px_36px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--nb-secondary)]">登录手机号</span>
            <span className="text-sm font-medium text-[var(--nb-ink)]">{maskPhone(technician?.phone)}</span>
          </div>
          <p className="mt-2 text-xs text-[var(--nb-muted)]">如需更换手机号，请联系平台客服处理。</p>
        </section>

        {/* 修改密码 */}
        <section className="mt-4 rounded-[24px] bg-white p-5 shadow-[0_18px_36px_rgba(0,0,0,0.05)]">
          <h2 className="text-[16px] font-semibold text-[var(--nb-ink)]">修改密码</h2>
          <p className="mt-1 text-xs text-[var(--nb-muted)]">密码至少 8 位，需同时包含字母和数字</p>
          <div className="mt-4 space-y-3">
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="当前密码"
              autoComplete="current-password"
              className={inputClassName}
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新密码"
              autoComplete="new-password"
              className={inputClassName}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="确认新密码"
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-5 min-h-[48px] w-full rounded-[16px] bg-[var(--nb-action)] text-sm font-semibold text-white transition-colors active:bg-[var(--nb-action-pressed)] disabled:opacity-50"
          >
            {submitting ? '提交中…' : '确认修改'}
          </button>
        </section>
      </div>
    </div>
  );
};

export default AccountSecurityPage;
