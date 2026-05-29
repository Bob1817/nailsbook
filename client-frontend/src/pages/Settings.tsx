import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ToastProvider';
import SubHeader from '../components/SubHeader';
import { authService } from '../services/auth';

interface NotifyPrefs {
  orderStatus: boolean;
  artistMessage: boolean;
  marketing: boolean;
}
const DEFAULT_NOTIFY: NotifyPrefs = { orderStatus: true, artistMessage: true, marketing: false };

const NOTIFY_ITEMS: { key: keyof NotifyPrefs; label: string; desc: string }[] = [
  { key: 'orderStatus', label: '预约状态提醒', desc: '报价、确认、行程等状态变化通知' },
  { key: 'artistMessage', label: '美甲师消息', desc: '美甲师给你发来新消息时通知' },
  { key: 'marketing', label: '活动与优惠', desc: '美甲师活动、优惠等推广通知' },
];

const DOCS = [
  { key: 'terms', title: '用户协议', body: '使用本应用即表示你同意遵守相关法律法规与平台规则。平台仅提供预约与沟通工具，不参与线上支付与交易。' },
  { key: 'privacy', title: '隐私政策', body: '我们仅收集为提供服务所必需的信息（账号、预约与联系信息），用于预约管理与通知，不会向无关第三方出售你的个人信息。' },
];

const cardClass = 'rounded-[24px] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5';
const inputClass =
  'h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 focus:border-[#FF6B8A] focus:bg-white focus:outline-none';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const storageKey = `client_notify_prefs_${user?.id ?? 'guest'}`;
  const [prefs, setPrefs] = useState<NotifyPrefs>(DEFAULT_NOTIFY);
  const [openDoc, setOpenDoc] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setPrefs({ ...DEFAULT_NOTIFY, ...JSON.parse(stored) });
      } catch {
        setPrefs(DEFAULT_NOTIFY);
      }
    } else {
      setPrefs(DEFAULT_NOTIFY);
    }
  }, [storageKey]);

  const toggle = (key: keyof NotifyPrefs, value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const handleChangePassword = async () => {
    if (!oldPassword) {
      toast.warning('请输入当前密码');
      return;
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.warning('新密码至少 8 位，需含字母和数字');
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
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || '修改失败，请重试';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[linear-gradient(180deg,#FFFDFD_0%,#F7F3F6_48%,#F2F6FB_100%)]">
      <SubHeader title="设置" />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 pb-24">
        {/* 账号 */}
        <button
          type="button"
          onClick={() => navigate('/profile/edit')}
          className={`${cardClass} flex w-full items-center justify-between text-left active:bg-gray-50`}
        >
          <div>
            <p className="text-[15px] font-medium text-gray-900">个人资料</p>
            <p className="mt-0.5 text-xs text-gray-400">修改昵称与头像</p>
          </div>
          <svg className="h-5 w-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* 修改密码 */}
        <section className={cardClass}>
          <h2 className="text-[16px] font-semibold text-gray-900">修改密码</h2>
          <p className="mt-1 text-xs text-gray-400">密码至少 8 位，需同时包含字母和数字</p>
          <div className="mt-4 space-y-3">
            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="当前密码" autoComplete="current-password" className={inputClass} />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="新密码" autoComplete="new-password" className={inputClass} />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="确认新密码" autoComplete="new-password" className={inputClass} />
          </div>
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={submitting}
            className="mt-4 min-h-[48px] w-full rounded-2xl bg-[#FF6B8A] text-sm font-semibold text-white transition-colors active:bg-[#e85b7d] disabled:opacity-50"
          >
            {submitting ? '提交中…' : '确认修改'}
          </button>
        </section>

        {/* 通知设置 */}
        <section className={`${cardClass} !p-0 overflow-hidden`}>
          <h2 className="px-5 pt-5 text-[16px] font-semibold text-gray-900">通知设置</h2>
          <div className="mt-3">
            {NOTIFY_ITEMS.map((item, i) => (
              <div key={item.key} className={`flex items-center justify-between gap-4 px-5 py-4 ${i < NOTIFY_ITEMS.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="min-w-0">
                  <p className="text-[15px] text-gray-800">{item.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-gray-400">{item.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[item.key]}
                  aria-label={item.label}
                  onClick={() => toggle(item.key, !prefs[item.key])}
                  className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${prefs[item.key] ? 'bg-[#FF6B8A]' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${prefs[item.key] ? 'left-[1.15rem]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
          <p className="px-5 pb-4 pt-1 text-xs leading-5 text-gray-400">通知偏好保存在本设备。</p>
        </section>

        {/* 关于 */}
        <section className={`${cardClass} !p-0 overflow-hidden`}>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-[15px] text-gray-800">版本</span>
            <span className="text-sm text-gray-400">v1.0.0</span>
          </div>
          {DOCS.map((doc) => {
            const open = openDoc === doc.key;
            return (
              <div key={doc.key} className="border-t border-gray-50">
                <button type="button" onClick={() => setOpenDoc(open ? null : doc.key)} className="flex w-full items-center justify-between px-5 py-4 text-left active:bg-gray-50">
                  <span className="text-[15px] text-gray-800">{doc.title}</span>
                  <svg className={`h-4 w-4 text-gray-300 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {open && <p className="px-5 pb-4 text-sm leading-6 text-gray-500">{doc.body}</p>}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
};

export default Settings;
