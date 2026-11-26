import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { worksService } from '../services/works';
import { uploadService } from '../services/upload';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';

const PRESET_TAGS = ['法式', '猫眼', '渐变', '裸色', '显白', '腮红甲', '纯欲', '秋冬', '极简', '钻饰'];
const LAST_WORK_TEMPLATE_KEY = 'onlynail_creator_last_work_template';

interface UploadedImageItem {
  id: string;
  url: string;
  status: 'uploading' | 'done' | 'error';
  localPreview?: string;
}

export const WorkEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const { technician } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [outfitSuggestion, setOutfitSuggestion] = useState('');
  const [standardPrice, setStandardPrice] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [images, setImages] = useState<UploadedImageItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingWork, setLoadingWork] = useState(isEdit);

  const activeServices = (technician?.serviceItems || []).filter((s) => s.isActive);

  const uploadFiles = async (files: File[]) => {
    const validFiles = files.filter((f) => f.type.startsWith('image/')).slice(0, 20);
    if (!validFiles.length) return;

    const pendingItems: UploadedImageItem[] = validFiles.map((file, i) => ({
      id: `${Date.now()}-${i}-${file.name}`,
      url: '',
      status: 'uploading',
      localPreview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...pendingItems]);

    await Promise.all(
      validFiles.map(async (file, index) => {
        const itemId = pendingItems[index].id;
        try {
          const uploaded = await uploadService.uploadImage(file);
          setImages((prev) =>
            prev.map((item) =>
              item.id === itemId ? { ...item, url: uploaded.url, status: 'done' } : item,
            ),
          );
        } catch {
          setImages((prev) =>
            prev.map((item) => (item.id === itemId ? { ...item, status: 'error' } : item)),
          );
        }
      }),
    );
  };

  useEffect(() => {
    const state = location.state as { droppedFiles?: File[] } | null;
    if (state?.droppedFiles?.length) {
      void uploadFiles(state.droppedFiles);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!id) {
      if (activeServices.length > 0 && selectedServiceIds.length === 0) {
        setSelectedServiceIds([activeServices[0].id]);
      }
      return;
    }
    let cancelled = false;
    setLoadingWork(true);
    worksService
      .getById(Number(id))
      .then((work) => {
        if (cancelled) return;
        setTitle(work.title || '');
        setDescription(work.description || '');
        setStandardPrice(work.price != null ? String(work.price) : '');
        setTags(work.tags || []);
        setImages(
          (work.imageUrls || []).map((url, idx) => ({
            id: `existing-${idx}`,
            url,
            status: 'done',
          })),
        );
      })
      .catch(() => showToast('error', '加载作品详情失败'))
      .finally(() => {
        if (!cancelled) setLoadingWork(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleAddCustomTag = () => {
    const trimmed = customTag.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) setTags((prev) => [...prev, trimmed]);
    setCustomTag('');
  };

  const handleApplyLastTemplate = () => {
    const raw = localStorage.getItem(LAST_WORK_TEMPLATE_KEY);
    if (!raw) {
      showToast('warning', '暂无上一条作品参数可复用');
      return;
    }
    try {
      const tpl = JSON.parse(raw) as {
        tags?: string[];
        standardPrice?: string;
        selectedServiceIds?: string[];
      };
      if (tpl.tags?.length) setTags(tpl.tags);
      if (tpl.standardPrice) setStandardPrice(tpl.standardPrice);
      if (tpl.selectedServiceIds?.length) setSelectedServiceIds(tpl.selectedServiceIds);
      showToast('success', '已复用上一条作品的标签与价格');
    } catch {
      showToast('error', '模板读取失败');
    }
  };

  const readyImageUrls = images.filter((i) => i.status === 'done' && i.url).map((i) => i.url);

  const handleSubmit = async (mode: 'publish' | 'draft') => {
    if (images.some((i) => i.status === 'uploading')) {
      showToast('warning', '仍有图片正在上传，请稍候');
      return;
    }
    if (mode === 'publish') {
      if (!title.trim()) {
        showToast('error', '请填写作品标题');
        return;
      }
      if (readyImageUrls.length === 0) {
        showToast('error', '请至少上传一张作品图片');
        return;
      }
      const priceNum = Number(standardPrice);
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        showToast('error', '请填写有效标准报价');
        return;
      }
    }

    setSaving(true);
    try {
      const priceNum = Number(standardPrice) || undefined;
      const serviceIds =
        selectedServiceIds.length > 0
          ? selectedServiceIds
          : activeServices.length > 0
            ? [activeServices[0].id]
            : ['default'];

      if (mode === 'draft') {
        const payload = {
          title: title.trim() || undefined,
          coverUrl: readyImageUrls[0],
          images: readyImageUrls,
          description: description.trim() || undefined,
          outfitSuggestion: outfitSuggestion.trim() || undefined,
          tags,
          price: priceNum,
          standardPrice: priceNum,
          selectedServiceIds: serviceIds,
        };
        if (isEdit && id) {
          await worksService.saveDraft(Number(id), payload);
        } else {
          await worksService.createDraft(payload);
        }
        showToast('success', '已保存到草稿箱');
      } else {
        const payload = {
          title: title.trim(),
          coverUrl: readyImageUrls[0],
          images: readyImageUrls,
          description: description.trim() || undefined,
          outfitSuggestion: outfitSuggestion.trim() || undefined,
          tags,
          price: priceNum,
          standardPrice: priceNum!,
          selectedServiceIds: serviceIds,
          isVisible: true,
        };
        localStorage.setItem(
          LAST_WORK_TEMPLATE_KEY,
          JSON.stringify({ tags, standardPrice, selectedServiceIds: serviceIds }),
        );
        if (isEdit && id) {
          await worksService.update(Number(id), payload);
          await worksService.publish(Number(id));
          showToast('success', '作品已更新并发布');
        } else {
          const created = await worksService.create(payload);
          await worksService.publish(created.id);
          showToast('success', '作品发布成功');
        }
      }
      navigate('/works');
    } catch {
      showToast('error', '保存失败，请检查表单内容');
    } finally {
      setSaving(false);
    }
  };

  if (loadingWork) {
    return (
      <div className="rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-8 text-sm text-[var(--nb-muted)]">
        正在加载作品信息...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* 左侧编辑区 */}
      <div className="space-y-6 xl:col-span-8">
        <div className="flex items-center justify-between rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/works')}
              className="min-h-[36px] rounded-lg border border-[var(--nb-line)] px-3 text-xs text-[var(--nb-secondary)] hover:bg-[var(--nb-page)]"
            >
              ← 返回作品工坊
            </button>
            <h2 className="text-base font-semibold text-[var(--nb-ink)]">
              {isEdit ? '编辑作品' : '发布新作品'}
            </h2>
          </div>
          {!isEdit && (
            <button
              type="button"
              onClick={handleApplyLastTemplate}
              className="min-h-[36px] rounded-lg border border-[var(--nb-line)] px-3 text-xs font-medium text-[var(--nb-link)] hover:bg-[var(--nb-page)]"
            >
              复用上一条标签与价格
            </button>
          )}
        </div>

        {/* 图片拖拽上传区 */}
        <div className="rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--nb-ink)]">作品图片（首张默认为封面）</span>
            <span className="text-xs text-[var(--nb-muted)]">最多支持 20 张，支持拖拽排序或设为封面</span>
          </div>

          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void uploadFiles(Array.from(e.dataTransfer.files));
            }}
            className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--nb-control)] bg-[var(--nb-page)] p-4 text-center transition hover:border-[var(--nb-ink)]"
          >
            <span className="text-sm font-medium text-[var(--nb-ink)]">点击选择或拖拽多张图片到此处</span>
            <span className="mt-1 text-xs text-[var(--nb-muted)]">支持 JPG / PNG / WebP</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void uploadFiles(Array.from(e.target.files));
                e.target.value = '';
              }}
            />
          </label>

          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {images.map((item, idx) => (
                <div
                  key={item.id}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--nb-line)] bg-[var(--nb-page)]"
                >
                  <img
                    src={item.url || item.localPreview}
                    alt={`作品图 ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-[var(--nb-action)] px-1.5 py-0.5 text-[10px] text-[var(--nb-inverse)]">
                      封面
                    </span>
                  )}
                  {item.status === 'uploading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white">
                      上传中...
                    </div>
                  )}
                  {item.status === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-white">
                      失败
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 px-1.5 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                    {idx > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setImages((prev) => {
                            const next = [...prev];
                            const [picked] = next.splice(idx, 1);
                            return [picked, ...next];
                          });
                        }}
                      >
                        设为封面
                      </button>
                    ) : (
                      <span>主图</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((img) => img.id !== item.id))}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 基本信息与定价 */}
        <div className="space-y-4 rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--nb-ink)]">作品标题 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：秋冬焦糖琥珀猫眼"
              className="min-h-[44px] w-full rounded-xl border border-[var(--nb-line)] px-3.5 text-sm text-[var(--nb-ink)]"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--nb-ink)]">标准报价（元） *</label>
              <input
                type="number"
                min={1}
                value={standardPrice}
                onChange={(e) => setStandardPrice(e.target.value)}
                placeholder="例如：268"
                className="min-h-[44px] w-full rounded-xl border border-[var(--nb-line)] px-3.5 text-sm text-[var(--nb-ink)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--nb-ink)]">穿搭/肤色建议（选填）</label>
              <input
                type="text"
                maxLength={120}
                value={outfitSuggestion}
                onChange={(e) => setOutfitSuggestion(e.target.value)}
                placeholder="例如：搭配米色大衣超显手白"
                className="min-h-[44px] w-full rounded-xl border border-[var(--nb-line)] px-3.5 text-sm text-[var(--nb-ink)]"
              />
            </div>
          </div>

          {activeServices.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--nb-ink)]">关联基础服务项目</label>
              <div className="flex flex-wrap gap-2">
                {activeServices.map((svc) => {
                  const active = selectedServiceIds.includes(svc.id);
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() =>
                        setSelectedServiceIds((prev) =>
                          prev.includes(svc.id) ? prev.filter((s) => s !== svc.id) : [...prev, svc.id],
                        )
                      }
                      className={`min-h-[36px] rounded-xl border px-3 text-xs font-medium transition ${
                        active
                          ? 'border-[var(--nb-ink)] bg-[var(--nb-action)] text-[var(--nb-inverse)]'
                          : 'border-[var(--nb-line)] bg-[var(--nb-page)] text-[var(--nb-secondary)]'
                      }`}
                    >
                      {svc.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--nb-ink)]">款式标签</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`min-h-[34px] rounded-full border px-3 text-xs transition ${
                      active
                        ? 'border-[var(--nb-ink)] bg-[var(--nb-action)] text-[var(--nb-inverse)]'
                        : 'border-[var(--nb-line)] bg-[var(--nb-page)] text-[var(--nb-secondary)]'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <div className="mt-2.5 flex gap-2">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                placeholder="输入自定义标签后回车"
                className="min-h-[38px] flex-1 rounded-xl border border-[var(--nb-line)] px-3 text-xs"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="min-h-[38px] rounded-xl border border-[var(--nb-line)] px-4 text-xs font-medium text-[var(--nb-ink)]"
              >
                添加
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--nb-ink)]">款式说明</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="介绍款式灵感、适合甲型或注意事项..."
              className="w-full rounded-xl border border-[var(--nb-line)] p-3 text-sm text-[var(--nb-ink)]"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--nb-line)] pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSubmit('draft')}
              className="min-h-[44px] rounded-xl border border-[var(--nb-line)] px-5 text-sm font-medium text-[var(--nb-ink)] hover:bg-[var(--nb-page)]"
            >
              保存草稿
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSubmit('publish')}
              className="min-h-[44px] rounded-xl bg-[var(--nb-action)] px-6 text-sm font-medium text-[var(--nb-inverse)]"
            >
              {saving ? '提交中...' : '发布作品'}
            </button>
          </div>
        </div>
      </div>

      {/* 右侧：小程序效果实时预览 */}
      <div className="xl:col-span-4">
        <div className="sticky top-20 rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5">
          <div className="mb-3 text-xs font-medium text-[var(--nb-muted)]">小程序端展示预览</div>
          <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-page)]">
            <div className="aspect-[4/5] bg-[var(--nb-pressed)]">
              {images[0]?.url || images[0]?.localPreview ? (
                <img
                  src={images[0].url || images[0].localPreview}
                  alt="预览封面"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[var(--nb-muted)]">
                  上传封面图后在此预览
                </div>
              )}
            </div>
            <div className="space-y-2 bg-[var(--nb-surface)] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-[var(--nb-ink)]">
                  {title.trim() || '作品标题预览'}
                </div>
                <div className="shrink-0 text-sm font-semibold text-[var(--nb-ink)]">
                  {standardPrice ? `¥${standardPrice}` : '¥--'}
                </div>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-[var(--nb-page)] px-2 py-0.5 text-[11px] text-[var(--nb-secondary)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {outfitSuggestion && (
                <p className="rounded-lg bg-[var(--nb-page)] px-2.5 py-1.5 text-xs text-[var(--nb-secondary)]">
                  穿搭建议：{outfitSuggestion}
                </p>
              )}
              {description && (
                <p className="line-clamp-2 text-xs text-[var(--nb-muted)]">{description}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
