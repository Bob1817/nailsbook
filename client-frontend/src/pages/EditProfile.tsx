import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { uploadService } from '../services/upload';

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();

  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadService.uploadImage(file);
      setAvatarUrl(result.url);
    } catch (err) {
      console.error('Upload failed', err);
      alert('头像上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      alert('请输入昵称');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        nickname: nickname.trim(),
        avatarUrl: avatarUrl || undefined,
      });
      navigate(-1);
    } catch (err) {
      console.error('Update failed', err);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[linear-gradient(180deg,#FFFDFD_0%,#F7F3F6_48%,#F2F6FB_100%)]">
      {/* Header */}
      <div className="shrink-0 border-b border-white/60 bg-white/82 px-5 app-header-safe pb-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">编辑个人资料</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-24">
        {/* Avatar card */}
        <div className="rounded-[28px] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-gradient-to-br from-pink-200 to-pink-100 ring-2 ring-white shadow-md">
              {avatarUrl ? (
                <img src={avatarUrl} alt="头像" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[28px] font-semibold text-[#FF6B8A]">
                  {(nickname || user?.phone || '我').slice(0, 1)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-gray-900">头像</p>
              <p className="mt-1 text-xs text-gray-400">建议使用清晰的人像照片</p>
              <label className="mt-3 inline-flex cursor-pointer items-center rounded-full bg-[#fff0f5] px-4 py-2 text-[13px] font-medium text-[#FF6B8A]">
                {uploading ? '上传中...' : '更换头像'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="mt-4 rounded-[28px] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5 space-y-5">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-gray-700">
              昵称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="给自己起一个昵称"
              maxLength={20}
              className="w-full rounded-2xl bg-gray-50 px-4 py-3 text-[15px] text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#FF6B8A]/20"
            />
            <p className="mt-1 text-xs text-gray-400">{nickname.length}/20</p>
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-medium text-gray-700">手机号</label>
            <input
              type="tel"
              value={user?.phone || ''}
              disabled
              className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-[15px] text-gray-400"
            />
            <p className="mt-1 text-xs text-gray-400">如需修改手机号请联系客服</p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/60 bg-white/92 px-5 py-4 backdrop-blur-xl safe-area-bottom">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-full bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] py-3.5 text-base font-semibold text-white shadow-md disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
};

export default EditProfile;
