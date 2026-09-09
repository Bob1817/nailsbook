import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ToastProvider';
import SubHeader from '../components/SubHeader';
import { uploadService } from '../services/upload';

const cardClass = 'rounded-[24px] bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)] ring-1 ring-black/5';
const inputClass =
  'w-full rounded-2xl bg-[var(--nb-page)] px-4 py-3 text-[15px] text-[var(--nb-ink)] outline-none focus:bg-white focus:ring-2 focus:ring-[var(--nb-control)]/20';

const Settings: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  // ----- 资料 -----
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '');
      setAvatarUrl(user.avatarUrl || '');
      setCity(user.city || '');
      setBio(user.bio || '');
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
    } catch {
      toast.error('头像上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!nickname.trim()) {
      toast.warning('请输入昵称');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        nickname: nickname.trim(),
        avatarUrl: avatarUrl || undefined,
        city: city.trim() || null,
        bio: bio.trim() || null,
      });
      toast.success('资料已保存');
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--nb-page)]">
      <SubHeader title="资料编辑" />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 pb-28">
        {/* 头像 */}
        <section className={cardClass}>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-[var(--nb-page)] ring-2 ring-white shadow-md">
              {avatarUrl ? (
                <img src={avatarUrl} alt="头像" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[28px] font-semibold text-[var(--nb-ink)]">
                  {(nickname || user?.phone || '我').slice(0, 1)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-[var(--nb-ink)]">头像</p>
              <p className="mt-1 text-xs text-[var(--nb-muted)]">建议使用清晰的人像照片</p>
              <label className="mt-3 inline-flex cursor-pointer items-center rounded-full bg-[var(--nb-page)] px-4 py-2 text-[13px] font-medium text-[var(--nb-ink)]">
                {uploading ? '上传中...' : '更换头像'}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploading} />
              </label>
            </div>
          </div>
        </section>

        {/* 基本资料 */}
        <section className={`${cardClass} space-y-5`}>
          <div>
            <label className="mb-2 block text-[13px] font-medium text-[var(--nb-ink)]">
              昵称 <span className="text-[var(--nb-secondary)]">*</span>
            </label>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="给自己起一个昵称" maxLength={20} className={inputClass} />
            <p className="mt-1 text-xs text-[var(--nb-muted)]">{nickname.length}/20</p>
          </div>
          <div>
            <label className="mb-2 block text-[13px] font-medium text-[var(--nb-ink)]">手机号</label>
            <input type="tel" value={user?.phone || ''} disabled className="w-full rounded-2xl bg-[var(--nb-page)] px-4 py-3 text-[15px] text-[var(--nb-muted)]" />
            <p className="mt-1 text-xs text-[var(--nb-muted)]">如需修改手机号请联系客服</p>
          </div>
          <div>
            <label className="mb-2 block text-[13px] font-medium text-[var(--nb-ink)]">常驻城市</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="例如：上海" maxLength={20} className={inputClass} />
          </div>
          <div>
            <label className="mb-2 block text-[13px] font-medium text-[var(--nb-ink)]">个人简介</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="介绍一下你自己吧～" maxLength={100} rows={3} className={`${inputClass} resize-none`} />
            <p className="mt-1 text-xs text-[var(--nb-muted)]">{bio.length}/100</p>
          </div>
        </section>

        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="min-h-[48px] w-full rounded-full bg-[var(--nb-action)] text-base font-semibold text-white shadow-md transition-opacity disabled:opacity-50"
        >
          {savingProfile ? '保存中...' : '保存资料'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
