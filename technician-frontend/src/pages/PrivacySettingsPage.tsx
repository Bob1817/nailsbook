import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { SubPageHeader } from '../components/SubPageHeader';
import { ToggleRow } from '../components/ToggleRow';

interface PrivacyPrefs {
  showPhoneToClient: boolean;
  showOnlineStatus: boolean;
  worksVisibleDefault: boolean;
  allowComments: boolean;
}

const DEFAULT_PREFS: PrivacyPrefs = {
  showPhoneToClient: true,
  showOnlineStatus: true,
  worksVisibleDefault: true,
  allowComments: true,
};

const ITEMS: { key: keyof PrivacyPrefs; label: string; description: string }[] = [
  { key: 'showPhoneToClient', label: '向客户展示手机号', description: '关闭后客户仅能通过站内消息联系你' },
  { key: 'showOnlineStatus', label: '展示在线状态', description: '允许客户在聊天中看到你的在线/正在输入状态' },
  { key: 'worksVisibleDefault', label: '新作品默认公开', description: '新上传的作品默认对已绑定客户可见' },
  { key: 'allowComments', label: '允许客户评论作品', description: '关闭后客户将无法对你的作品发表评论' },
];

const PrivacySettingsPage: React.FC = () => {
  const { technician } = useAuth();
  const storageKey = `tech_privacy_prefs_${technician?.id ?? 'guest'}`;
  const [prefs, setPrefs] = useState<PrivacyPrefs>(DEFAULT_PREFS);

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

  const update = (key: keyof PrivacyPrefs, value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[#fff9f8]">
      <SubPageHeader title="隐私设置" />
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
          隐私偏好保存在本设备，用于控制你在客户端的展示方式。
        </p>
      </div>
    </div>
  );
};

export default PrivacySettingsPage;
