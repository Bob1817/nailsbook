import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { Button } from '../components/base/Button';
import { Card } from '../components/base/Card';
import type { SocialMediaAccounts } from '../contexts/authTypes';
import { uploadService } from '../services/upload';

const SOCIAL_MEDIA_CONFIG = [
  { key: 'weibo', label: '微博', icon: '🔴', placeholder: 'https://weibo.com/u/xxxxx', prefix: 'weibo.com' },
  { key: 'xiaohongshu', label: '小红书', icon: '📕', placeholder: 'https://www.xiaohongshu.com/user/xxxxx', prefix: 'xiaohongshu.com' },
  { key: 'douyin', label: '抖音', icon: '🎵', placeholder: 'https://www.douyin.com/user/xxxxx', prefix: 'douyin.com' },
  { key: 'kuaishou', label: '快手', icon: '📱', placeholder: 'https://www.kuaishou.com/u/xxxxx', prefix: 'kuaishou.com' },
  { key: 'wechat', label: '微信', icon: '💬', placeholder: '微信号或企业微信链接', prefix: '' },
];

const ProfileSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { technician, updateTechnicianProfile } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    avatar: '',
    name: '',
    phone: '',
    city: '',
    serviceArea: '',
    socialMedia: {} as SocialMediaAccounts,
  });

  useEffect(() => {
    if (technician) {
      setFormData({
        avatar: technician.avatar || '',
        name: technician.name || '',
        phone: technician.phone || '',
        city: technician.city || '',
        serviceArea: technician.serviceArea || '',
        socialMedia: technician.socialMedia || {},
      });
    }
  }, [technician]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入美甲师名称');
      return;
    }

    setLoading(true);
    try {
      // 调用API更新个人信息
      await updateTechnicianProfile({
        avatar: formData.avatar,
        name: formData.name,
        city: formData.city,
        serviceArea: formData.serviceArea,
        socialMedia: formData.socialMedia,
      });
      toast.success('个人信息已更新');
      navigate(-1);
    } catch {
      toast.error('保存失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialMediaChange = (key: keyof SocialMediaAccounts, value: string) => {
    setFormData({
      ...formData,
      socialMedia: {
        ...formData.socialMedia,
        [key]: value,
      },
    });
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setUploadingAvatar(true);
    try {
      const result = await uploadService.uploadImage(file);
      setFormData((prev) => ({
        ...prev,
        avatar: result.url,
      }));
      toast.success('头像上传成功');
    } catch {
      toast.error('头像上传失败，请重试');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const sectionTitleClassName = 'text-[18px] font-semibold text-gray-900';
  const labelClassName = 'mb-2 block text-[13px] font-medium text-gray-700';
  const inputClassName =
    'w-full rounded-[16px] border border-[#f1e7e8] bg-[#fffdfd] px-4 py-3 text-[15px] text-gray-900 outline-none transition focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-50';

  return (
    <div className="flex h-[100dvh] flex-col bg-[#fff9f8]">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 bg-white/95 px-5 py-3.5 backdrop-blur border-b border-[#f2e6ec]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f3f5] transition-colors active:bg-[#eee5e9]"
        >
          <svg className="h-5 w-5 text-[#3c3440]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[17px] font-semibold text-[#1f2230]">个人设置</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
      <div className="space-y-4 px-5 py-5">
        {/* Basic Info */}
        <Card className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className={sectionTitleClassName}>基本信息</h2>
              <p className="mt-1 text-xs text-gray-400">用于展示您的服务身份与基础服务范围</p>
            </div>
          </div>
          <div className="mb-5 flex items-center gap-4 rounded-[18px] border border-[#f6ebec] bg-[#fffdfd] p-4">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-[#f2e5e7] bg-[#fde8ef] shadow-[0_10px_24px_rgba(244,114,182,0.08)]">
              {formData.avatar ? (
                <img src={formData.avatar} alt="头像" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[32px] font-semibold text-[#ec4899]">
                  {formData.name.trim().slice(0, 1) || '美'}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-gray-900">头像</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">建议使用清晰的人像或品牌头像，便于客户识别</p>
              <label className="mt-3 inline-flex cursor-pointer items-center rounded-full bg-[#fff0f5] px-4 py-2 text-[13px] font-medium text-[#ec4899] transition hover:bg-[#ffe7f0]">
                {uploadingAvatar ? '上传中...' : '更换头像'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelClassName}>
                美甲师名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入您的名称"
                className={inputClassName}
              />
            </div>

            <div>
              <label className={labelClassName}>
                联系方式
              </label>
              <input
                type="tel"
                value={formData.phone}
                disabled
                className="w-full rounded-[16px] border border-[#f1e7e8] bg-[#faf7f7] px-4 py-3 text-[15px] text-gray-400"
              />
              <p className="text-xs text-gray-400 mt-1">如需修改手机号请联系客服</p>
            </div>

            <div>
              <label className={labelClassName}>
                所在城市
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="如：北京市"
                className={inputClassName}
              />
            </div>

            <div>
              <label className={labelClassName}>
                服务区域
              </label>
              <input
                type="text"
                value={formData.serviceArea}
                onChange={(e) => setFormData({ ...formData, serviceArea: e.target.value })}
                placeholder="如：朝阳区、海淀区"
                className={inputClassName}
              />
            </div>
          </div>
        </Card>

        {/* Social Media */}
        <Card className="p-5">
          <div className="mb-4">
            <h2 className={sectionTitleClassName}>社交媒体账号</h2>
            <p className="mt-1 text-[13px] text-gray-500">填写您的社交媒体主页链接，方便客户关注您</p>
          </div>
          <div className="space-y-4">
            {SOCIAL_MEDIA_CONFIG.map((config) => (
              <div key={config.key}>
                <label className={labelClassName}>
                  <span className="mr-2">{config.icon}</span>
                  {config.label}
                </label>
                <input
                  type="text"
                  value={formData.socialMedia[config.key as keyof SocialMediaAccounts] || ''}
                  onChange={(e) => handleSocialMediaChange(config.key as keyof SocialMediaAccounts, e.target.value)}
                  placeholder={config.placeholder}
                  className={inputClassName}
                />
                {config.prefix && (
                  <p className="text-xs text-gray-400 mt-1">格式：{config.prefix}/...</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#f5ecec] bg-white/92 px-5 py-4 backdrop-blur-xl safe-area-bottom">
        <div className="mx-auto max-w-md">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;
