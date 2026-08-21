import React, { useState } from 'react';
import { useToast } from '../components/ToastProvider';
import SubHeader from '../components/SubHeader';
import { authService } from '../services/auth';

const pwInputClass =
  'h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 focus:border-[#FF6B8A] focus:bg-white focus:outline-none';
const cardClass = 'rounded-[24px] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5';

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
    <div className="flex h-[100dvh] flex-col bg-[linear-gradient(180deg,#FFFDFD_0%,#F7F3F6_48%,#F2F6FB_100%)]">
      <SubHeader title="修改密码" />
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-28">
        <section className={cardClass}>
          <p className="text-xs text-gray-400">密码至少 8 位，需同时包含字母和数字</p>
          <div className="mt-4 space-y-3">
            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="当前密码" autoComplete="current-password" className={pwInputClass} />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="新密码" autoComplete="new-password" className={pwInputClass} />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="确认新密码" autoComplete="new-password" className={pwInputClass} />
          </div>
          <button type="button" onClick={handleChangePassword} disabled={submitting}
            className="mt-4 min-h-[48px] w-full rounded-2xl bg-[#FF6B8A] text-sm font-semibold text-white transition-colors active:bg-[#e85b7d] disabled:opacity-50">
            {submitting ? '提交中…' : '确认修改'}
          </button>
        </section>
      </div>
    </div>
  );
};
export default ChangePassword;
