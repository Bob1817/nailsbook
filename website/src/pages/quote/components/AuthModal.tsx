import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';
import type { TechnicianProfile } from '../quoteTypes';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: TechnicianProfile) => void;
  currentProfile: TechnicianProfile;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentProfile,
}) => {
  const [phone, setPhone] = useState(currentProfile.phone || '');
  const [code, setCode] = useState('');
  const [shopName, setShopName] = useState(currentProfile.shopName || '');
  const [technicianName, setTechnicianName] = useState(
    currentProfile.name === '专业美甲师' ? '' : currentProfile.name,
  );
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendCode = () => {
    setErrorMessage(null);
    if (!phone || phone.length !== 11) {
      setErrorMessage('请输入正确的 11 位手机号码');
      return;
    }
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!phone || phone.length !== 11) {
      setErrorMessage('请输入正确的 11 位手机号码');
      return;
    }
    setLoading(true);

    // 模拟注册/登录成功并保存资料
    setTimeout(() => {
      setLoading(false);
      const updatedProfile: TechnicianProfile = {
        ...currentProfile,
        phone,
        name: technicianName.trim() || '美甲主理人',
        shopName: shopName.trim() || '专属美甲工作室',
        isRegistered: true,
      };
      onSuccess(updatedProfile);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-sm bg-surface rounded-3xl shadow-2xl p-6 border border-line animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-pressed active:scale-[0.98] transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-activeSurface flex items-center justify-center text-ink border border-line">
            <Sparkles size={16} />
          </div>
          <h3 className="font-semibold text-base text-ink tracking-tight [text-wrap:balance]">
            保存为专属价目表
          </h3>
        </div>

        <p className="text-xs text-muted mb-4 leading-relaxed [text-wrap:pretty]">
          绑定手机号后，价格体系永久云端保存；客户点击报价单可直接预约并同步至微信小程序。
        </p>

        {errorMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-page border border-line text-xs text-ink font-medium animate-in fade-in duration-200">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              美甲师称呼 / 艺名
            </label>
            <input
              type="text"
              placeholder="如：Mona、小七"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-page text-xs text-ink focus:outline-hidden focus:border-ink transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              工作室 / 门头名称
            </label>
            <input
              type="text"
              placeholder="如：Mona Nail Art Studio"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-page text-xs text-ink focus:outline-hidden focus:border-ink transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              手机号码（同步微信小程序账号）
            </label>
            <input
              type="tel"
              maxLength={11}
              placeholder="请输入 11 位手机号码"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-page text-xs text-ink focus:outline-hidden focus:border-ink transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              短信验证码
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                placeholder="6 位验证码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 h-11 px-3.5 rounded-xl border border-line bg-page text-xs text-ink focus:outline-hidden focus:border-ink transition-colors"
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={countdown > 0}
                className="min-w-[96px] h-11 px-3 rounded-xl border border-line text-xs font-semibold text-ink hover:bg-pressed active:scale-[0.98] disabled:opacity-50 transition-all duration-200"
              >
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[46px] rounded-xl bg-action text-inverse font-semibold text-xs hover:bg-actionPressed active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 shadow-xs"
            >
              <CheckCircle2 size={16} />
              {loading ? '正在保存...' : '确认并保存专属主页'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
