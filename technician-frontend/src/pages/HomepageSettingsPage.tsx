import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { Button } from '../components/base/Button';
import { Card } from '../components/base/Card';
import { uploadService } from '../services/upload';

const STYLE_TAG_SUGGESTIONS = [
  '艺术彩绘', '简约日式', '法式优雅', '节日限定', '新娘美甲',
  '色彩专家', '细节控', '创意设计', '3D立体', '手绘艺术',
];

const HomepageSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { technician, updateTechnicianProfile } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [formData, setFormData] = useState({
    coverImageUrl: '',
    bio: '',
    servicePhilosophy: '',
    bookingNotes: '',
    styleTags: [] as string[],
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (technician) {
      setFormData({
        coverImageUrl: technician.coverImageUrl || '',
        bio: technician.bio || '',
        servicePhilosophy: technician.servicePhilosophy || '',
        bookingNotes: technician.bookingNotes || '',
        styleTags: technician.styleTags || [],
      });
    }
  }, [technician]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await updateTechnicianProfile({
        coverImageUrl: formData.coverImageUrl || null,
        bio: formData.bio,
        servicePhilosophy: formData.servicePhilosophy,
        bookingNotes: formData.bookingNotes,
        styleTags: formData.styleTags,
      });
      toast.success('主页设置已更新');
      navigate(-1);
    } catch {
      toast.error('保存失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setUploadingCover(true);
    try {
      const result = await uploadService.uploadImage(file);
      setFormData((prev) => ({ ...prev, coverImageUrl: result.url }));
      toast.success('封面图上传成功');
    } catch {
      toast.error('封面图上传失败，请重试');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (formData.styleTags.length >= 5) {
      toast.warning('最多添加5个风格标签');
      return;
    }
    if (formData.styleTags.includes(trimmed)) {
      toast.warning('该标签已存在');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      styleTags: [...prev.styleTags, trimmed],
    }));
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      styleTags: prev.styleTags.filter((t) => t !== tag),
    }));
  };

  const sectionTitleClassName = 'text-[18px] font-semibold text-[var(--nb-ink)]';
  const inputClassName =
    'w-full rounded-[16px] border border-[var(--nb-line)] bg-[var(--nb-surface)] px-4 py-3 text-[15px] text-[var(--nb-ink)] outline-none transition focus:border-[var(--nb-control)] focus:bg-white focus:ring-4 focus:ring-[var(--nb-line)]';

  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--nb-page)]">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 bg-white/95 px-5 py-3.5 backdrop-blur border-b border-[var(--nb-line)]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--nb-page)] transition-colors active:bg-[var(--nb-page)]"
        >
          <svg className="h-5 w-5 text-[var(--nb-ink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[17px] font-semibold text-[var(--nb-ink)]">主页设置</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="space-y-4 px-5 py-5">
          {/* Cover Image */}
          <Card className="p-5">
            <div className="mb-4">
              <h2 className={sectionTitleClassName}>封面图</h2>
              <p className="mt-1 text-xs text-[var(--nb-muted)]">展示您的审美风格，建议尺寸 750×400px</p>
            </div>
            <div className="relative overflow-hidden rounded-[18px] border border-[var(--nb-line)] bg-[var(--nb-ink)] aspect-[15/8]">
              {formData.coverImageUrl ? (
                <img src={formData.coverImageUrl} alt="封面图" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-white/50">暂未设置封面图</p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-3 right-3 flex gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-full bg-white/90 px-4 py-2 text-[13px] font-medium text-[var(--nb-ink)] shadow-sm transition hover:bg-white">
                  {uploadingCover ? '上传中...' : '更换封面'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                  />
                </label>
                {formData.coverImageUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, coverImageUrl: '' }))}
                    className="rounded-full bg-white/90 px-4 py-2 text-[13px] font-medium text-[var(--nb-secondary)] shadow-sm transition hover:bg-white"
                  >
                    移除
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* Bio */}
          <Card className="p-5">
            <div className="mb-4">
              <h2 className={sectionTitleClassName}>个人简介</h2>
              <p className="mt-1 text-xs text-[var(--nb-muted)]">介绍您的专业背景、擅长风格等</p>
            </div>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="介绍一下您的专业背景、艺术理念、擅长风格等..."
              maxLength={300}
              rows={4}
              className={inputClassName}
            />
            <p className="mt-1 text-right text-xs text-[var(--nb-muted)]">{formData.bio.length}/300字</p>
          </Card>

          {/* Service Philosophy */}
          <Card className="p-5">
            <div className="mb-4">
              <h2 className={sectionTitleClassName}>服务理念</h2>
              <p className="mt-1 text-xs text-[var(--nb-muted)]">您的服务理念是什么？</p>
            </div>
            <textarea
              value={formData.servicePhilosophy}
              onChange={(e) => setFormData({ ...formData, servicePhilosophy: e.target.value })}
              placeholder="如：每一件作品都是独一无二的艺术品..."
              maxLength={200}
              rows={3}
              className={inputClassName}
            />
            <p className="mt-1 text-right text-xs text-[var(--nb-muted)]">{formData.servicePhilosophy.length}/200字</p>
          </Card>

          {/* Booking Notes */}
          <Card className="p-5">
            <div className="mb-4">
              <h2 className={sectionTitleClassName}>预约说明</h2>
              <p className="mt-1 text-xs text-[var(--nb-muted)]">告知客户您的预约规则</p>
            </div>
            <textarea
              value={formData.bookingNotes}
              onChange={(e) => setFormData({ ...formData, bookingNotes: e.target.value })}
              placeholder="如：需提前3天预约，首次咨询免费..."
              maxLength={200}
              rows={3}
              className={inputClassName}
            />
            <p className="mt-1 text-right text-xs text-[var(--nb-muted)]">{formData.bookingNotes.length}/200字</p>
          </Card>

          {/* Style Tags */}
          <Card className="p-5">
            <div className="mb-4">
              <h2 className={sectionTitleClassName}>擅长风格</h2>
              <p className="mt-1 text-xs text-[var(--nb-muted)]">选择您擅长的美甲风格，最多5个</p>
            </div>

            {/* Current Tags */}
            <div className="mb-4 flex flex-wrap gap-2">
              {formData.styleTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--nb-page)] px-3 py-1.5 text-[13px] font-medium text-[var(--nb-ink)]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-[var(--nb-ink)]/60 hover:text-[var(--nb-ink)]"
                  >
                    ×
                  </button>
                </span>
              ))}
              {formData.styleTags.length === 0 && (
                <span className="text-[13px] text-[var(--nb-muted)]">暂未选择风格标签</span>
              )}
            </div>

            {/* Add Tag Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(newTag);
                  }
                }}
                placeholder="输入自定义标签"
                className="flex-1 rounded-[12px] border border-[var(--nb-line)] bg-[var(--nb-surface)] px-3 py-2 text-[14px] outline-none focus:border-[var(--nb-control)]"
              />
              <button
                type="button"
                onClick={() => handleAddTag(newTag)}
                className="rounded-[12px] bg-[var(--nb-page)] px-4 py-2 text-[13px] font-medium text-[var(--nb-ink)] active:bg-[var(--nb-page)]"
              >
                添加
              </button>
            </div>

            {/* Suggestions */}
            <div className="mt-4">
              <p className="mb-2 text-[12px] text-[var(--nb-muted)]">推荐标签</p>
              <div className="flex flex-wrap gap-2">
                {STYLE_TAG_SUGGESTIONS.filter((s) => !formData.styleTags.includes(s)).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    className="rounded-full border border-[var(--nb-line)] bg-white px-3 py-1 text-[12px] text-[var(--nb-secondary)] transition-colors active:bg-[var(--nb-page)]"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--nb-line)] bg-white/92 px-5 py-4 backdrop-blur-xl safe-area-bottom">
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
  );
};

export default HomepageSettingsPage;
