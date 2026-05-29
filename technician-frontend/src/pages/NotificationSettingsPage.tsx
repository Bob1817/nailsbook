import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { SubPageHeader } from '../components/SubPageHeader';
import { ToggleRow } from '../components/ToggleRow';

interface NotificationPrefs {
  newOrder: boolean;
  quoteConfirm: boolean;
  tripReminder: boolean;
  clientMessage: boolean;
  marketing: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  newOrder: true,
  quoteConfirm: true,
  tripReminder: true,
  clientMessage: true,
  marketing: false,
};

const ITEMS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: 'newOrder', label: '新预约提醒', description: '有客户发起新的预约时通知我' },
  { key: 'quoteConfirm', label: '报价与确认提醒', description: '客户确认报价或预约状态变化时通知我' },
  { key: 'tripReminder', label: '行程提醒', description: '上门/到店服务前的出行与时间提醒' },
  { key: 'clientMessage', label: '客户消息', description: '客户发来新消息时通知我' },
  { key: 'marketing', label: '营销与活动通知', description: '平台活动、功能更新等通知' },
];

const NotificationSettingsPage: React.FC = () => {
  const { technician } = useAuth();
  const storageKey = `tech_notification_prefs_${technician?.id ?? 'guest'}`;
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
      } catch {
        setPrefs(DEFAULT_PREFS);
      }
    } else {
      setPrefs(DEFAULT_PREFS);
    }
  }, [storageKey]);

  const update = (key: keyof NotificationPrefs, value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[#fff9f8]">
      <SubPageHeader title="通知设置" />
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <section className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_36px_rgba(36,27,41,0.05)]">
          {ITEMS.map((item, index) => (
            <ToggleRow
              key={item.key}
              label={item.label}
              description={item.description}
              checked={prefs[item.key]}
              onChange={(next) => update(item.key, next)}
              last={index === ITEMS.length - 1}
            />
          ))}
        </section>
        <p className="mt-3 px-1 text-xs leading-5 text-[#a89ba3]">
          通知偏好保存在本设备。消息推送能力上线后将按此设置生效。
        </p>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
