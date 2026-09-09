import React, { useState } from 'react';
import { useToast } from '../components/ToastProvider';
import SubHeader from '../components/SubHeader';
import { authService } from '../services/auth';

const pwInputClass =
  'h-12 w-full rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-page)] px-4 text-sm text-[var(--nb-ink)] focus:border-[var(--nb-control)] focus:bg-white focus:outline-none';
const cardClass = 'rounded-[24px] bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)] ring-1 ring-black/5';

const ChangePassword: React.FC = () => {
  const toast = useToast();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChangePassword = async () => {
    if (!oldPassword) { toast.warning('请输入当前密码'); return; }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.warning('新密码至少 8 位，需含字母和数字'); return;
    }
    if (newPassword !== confirmPassword) { toast.warning('两次输入的新密码不一致'); return; }
    setSubmitting(true);
    try {
      await authService.changePassword(oldPassword, newPassword);
      toast.success('密码修改成功');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || '修改失败，请重试';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--nb-page)]">
      <SubHeader title="修改密码" />
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-28">
        <section className={cardClass}>
          <p className="text-xs text-[var(--nb-muted)]">密码至少 8 位，需同时包含字母和数字</p>
          <div className="mt-4 space-y-3">
            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="当前密码" autoComplete="current-password" className={pwInputClass} />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="新密码" autoComplete="new-password" className={pwInputClass} />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="确认新密码" autoComplete="new-password" className={pwInputClass} />
          </div>
          <button type="button" onClick={handleChangePassword} disabled={submitting}
            className="mt-4 min-h-[48px] w-full rounded-2xl bg-[var(--nb-action)] text-sm font-semibold text-white transition-colors active:bg-[var(--nb-action-pressed)] disabled:opacity-50">
            {submitting ? '提交中…' : '确认修改'}
          </button>
        </section>
      </div>
    </div>
  );
};
export default ChangePassword;
