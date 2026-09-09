import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SubHeader from '../components/SubHeader';

interface NotifyPrefs { orderStatus: boolean; artistMessage: boolean; marketing: boolean; }
const DEFAULT_NOTIFY: NotifyPrefs = { orderStatus: true, artistMessage: true, marketing: false };
const NOTIFY_ITEMS: { key: keyof NotifyPrefs; label: string; desc: string }[] = [
  { key: 'orderStatus', label: '预约状态提醒', desc: '报价、确认、行程等状态变化通知' },
  { key: 'artistMessage', label: '美甲师消息', desc: '美甲师给你发来新消息时通知' },
  { key: 'marketing', label: '活动与优惠', desc: '美甲师活动、优惠等推广通知' },
];
const cardClass = 'rounded-[24px] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.06)] ring-1 ring-black/5 overflow-hidden';

const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const storageKey = `client_notify_prefs_${user?.id ?? 'guest'}`;
  const [prefs, setPrefs] = useState<NotifyPrefs>(DEFAULT_NOTIFY);
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) { try { setPrefs({ ...DEFAULT_NOTIFY, ...JSON.parse(stored) }); } catch { setPrefs(DEFAULT_NOTIFY); } }
    else setPrefs(DEFAULT_NOTIFY);
  }, [storageKey]);
  const toggleNotify = (key: keyof NotifyPrefs, value: boolean) => {
    setPrefs((prev) => { const next = { ...prev, [key]: value }; localStorage.setItem(storageKey, JSON.stringify(next)); return next; });
  };
  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--nb-page)]">
      <SubHeader title="通知设置" />
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-28">
        <section className={cardClass}>
          {NOTIFY_ITEMS.map((item, i) => (
            <div key={item.key} className={`flex items-center justify-between gap-4 px-5 py-4 ${i < NOTIFY_ITEMS.length - 1 ? 'border-b border-[var(--nb-line)]' : ''}`}>
              <div className="min-w-0">
                <p className="text-[15px] text-[var(--nb-ink)]">{item.label}</p>
                <p className="mt-0.5 text-xs leading-5 text-[var(--nb-muted)]">{item.desc}</p>
              </div>
              <button type="button" role="switch" aria-checked={prefs[item.key]} aria-label={item.label}
                onClick={() => toggleNotify(item.key, !prefs[item.key])}
                className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${prefs[item.key] ? 'bg-[var(--nb-action)]' : 'bg-[var(--nb-pressed)]'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${prefs[item.key] ? 'left-[1.15rem]' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </section>
        <p className="mt-3 px-1 text-xs leading-5 text-[var(--nb-muted)]">通知偏好保存在本设备。</p>
      </div>
    </div>
  );
};
export default NotificationSettings;
