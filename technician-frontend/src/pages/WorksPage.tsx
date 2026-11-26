import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { worksService, type Work } from '../services/works';
import { useToast } from '../components/feedback/ToastProvider';
import { GridSkeleton } from '../components/Skeleton';

type StatusTab = 'all' | 'visible' | 'hidden' | 'draft';
type ViewMode = 'grid' | 'table';

export const WorksPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const initialTab = (searchParams.get('tab') as StatusTab) || 'all';
  const [tab, setTab] = useState<StatusTab>(initialTab);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [keyword, setKeyword] = useState('');
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  // 批量操作弹窗状态
  const [batchModal, setBatchModal] = useState<'tags' | 'price' | null>(null);
  const [batchTagsInput, setBatchTagsInput] = useState('');
  const [batchPriceInput, setBatchPriceInput] = useState('');

  const loadWorks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await worksService.list();
      setWorks(data);
    } catch {
      showToast('error', '加载作品列表失败');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadWorks();
  }, [loadWorks]);

  const counts = useMemo(() => {
    return {
      all: works.length,
      visible: works.filter((w) => w.publicationStatus !== 'draft' && w.isVisible).length,
      hidden: works.filter((w) => w.publicationStatus !== 'draft' && !w.isVisible).length,
      draft: works.filter((w) => w.publicationStatus === 'draft').length,
    };
  }, [works]);

  const filteredWorks = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return works.filter((w) => {
      if (tab === 'visible' && (w.publicationStatus === 'draft' || !w.isVisible)) return false;
      if (tab === 'hidden' && (w.publicationStatus === 'draft' || w.isVisible)) return false;
      if (tab === 'draft' && w.publicationStatus !== 'draft') return false;
      if (!q) return true;
      const inTitle = (w.title || '').toLowerCase().includes(q);
      const inTags = (w.tags || []).some((t) => t.toLowerCase().includes(q));
      return inTitle || inTags;
    });
  }, [works, tab, keyword]);

  const handleTabChange = (nextTab: StatusTab) => {
    setTab(nextTab);
    setSelectedIds([]);
    if (nextTab === 'all') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', nextTab);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredWorks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredWorks.map((w) => w.id));
    }
  };

  const runBatchAction = async (
    action: 'show' | 'hide' | 'delete' | 'add_tags' | 'update_price',
    extra?: { tags?: string[]; price?: number },
  ) => {
    if (selectedIds.length === 0) return;
    if (action === 'delete' && !window.confirm(`确认删除选中的 ${selectedIds.length} 组作品吗？删除后无法恢复。`)) {
      return;
    }
    setBatchLoading(true);
    try {
      await worksService.batchAction({
        workIds: selectedIds,
        action,
        ...extra,
      });
      showToast('success', '批量操作已完成');
      setSelectedIds([]);
      setBatchModal(null);
      setBatchTagsInput('');
      setBatchPriceInput('');
      await loadWorks();
    } catch {
      showToast('error', '批量操作失败，请重试');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleSingleAction = async (work: Work, action: 'visible' | 'pinned' | 'featured' | 'delete') => {
    try {
      if (action === 'delete') {
        if (!window.confirm(`确认删除作品「${work.title || '未命名草稿'}」吗？`)) return;
        await worksService.delete(work.id);
        showToast('success', '已删除作品');
      } else if (action === 'visible') {
        await worksService.toggleVisible(work.id);
      } else if (action === 'pinned') {
        await worksService.togglePinned(work.id);
      } else if (action === 'featured') {
        await worksService.toggleFeatured(work.id);
      }
      await loadWorks();
    } catch {
      showToast('error', '操作失败');
    }
  };

  const moveWorkOrder = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= filteredWorks.length) return;
    const reordered = [...filteredWorks];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    try {
      await worksService.reorder(reordered.map((w) => w.id));
      await loadWorks();
    } catch {
      showToast('error', '排序保存失败');
    }
  };

  return (
    <div className="space-y-5">
      {/* 顶部工具栏 */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: 'all', label: `全部 (${counts.all})` },
              { key: 'visible', label: `已上架 (${counts.visible})` },
              { key: 'hidden', label: `已隐藏 (${counts.hidden})` },
              { key: 'draft', label: `草稿箱 (${counts.draft})` },
            ] as Array<{ key: StatusTab; label: string }>
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleTabChange(item.key)}
              className={`min-h-[38px] rounded-xl px-3.5 text-sm font-medium transition ${
                tab === item.key
                  ? 'bg-[var(--nb-action)] text-[var(--nb-inverse)]'
                  : 'bg-[var(--nb-page)] text-[var(--nb-secondary)] hover:text-[var(--nb-ink)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索作品标题或标签..."
            className="min-h-[40px] w-56 rounded-xl border border-[var(--nb-line)] bg-[var(--nb-page)] px-3 text-sm text-[var(--nb-ink)] placeholder:text-[var(--nb-muted)] focus:outline-none"
          />

          <div className="flex rounded-xl border border-[var(--nb-line)] bg-[var(--nb-page)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`min-h-[36px] rounded-lg px-3 text-xs font-medium ${
                viewMode === 'grid'
                  ? 'bg-[var(--nb-surface)] text-[var(--nb-ink)] shadow-sm'
                  : 'text-[var(--nb-muted)]'
              }`}
            >
              网格视图
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`min-h-[36px] rounded-lg px-3 text-xs font-medium ${
                viewMode === 'table'
                  ? 'bg-[var(--nb-surface)] text-[var(--nb-ink)] shadow-sm'
                  : 'text-[var(--nb-muted)]'
              }`}
            >
              表格视图
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/works/new')}
            className="min-h-[40px] rounded-xl bg-[var(--nb-action)] px-4 text-sm font-medium text-[var(--nb-inverse)]"
          >
            + 发布作品
          </button>
        </div>
      </div>

      {/* 批量操作条 */}
      {selectedIds.length > 0 && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--nb-ink)] bg-[var(--nb-surface)] px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-[var(--nb-ink)]">已选择 {selectedIds.length} 组作品</span>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs text-[var(--nb-link)] hover:underline"
            >
              {selectedIds.length === filteredWorks.length ? '取消全选' : '全选当前列表'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={batchLoading}
              onClick={() => void runBatchAction('show')}
              className="min-h-[36px] rounded-lg border border-[var(--nb-line)] px-3 text-xs font-medium text-[var(--nb-ink)] hover:bg-[var(--nb-page)]"
            >
              批量上架
            </button>
            <button
              type="button"
              disabled={batchLoading}
              onClick={() => void runBatchAction('hide')}
              className="min-h-[36px] rounded-lg border border-[var(--nb-line)] px-3 text-xs font-medium text-[var(--nb-ink)] hover:bg-[var(--nb-page)]"
            >
              批量隐藏
            </button>
            <button
              type="button"
              disabled={batchLoading}
              onClick={() => setBatchModal('tags')}
              className="min-h-[36px] rounded-lg border border-[var(--nb-line)] px-3 text-xs font-medium text-[var(--nb-ink)] hover:bg-[var(--nb-page)]"
            >
              批量加标签
            </button>
            <button
              type="button"
              disabled={batchLoading}
              onClick={() => setBatchModal('price')}
              className="min-h-[36px] rounded-lg border border-[var(--nb-line)] px-3 text-xs font-medium text-[var(--nb-ink)] hover:bg-[var(--nb-page)]"
            >
              批量改价
            </button>
            <button
              type="button"
              disabled={batchLoading}
              onClick={() => void runBatchAction('delete')}
              className="min-h-[36px] rounded-lg border border-[var(--nb-line)] px-3 text-xs font-medium text-[var(--nb-secondary)] hover:bg-[var(--nb-pressed)]"
            >
              批量删除
            </button>
          </div>
        </div>
      )}

      {/* 内容区 */}
      {loading ? (
        <GridSkeleton />
      ) : filteredWorks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] py-16 text-center">
          <p className="text-sm text-[var(--nb-muted)]">当前筛选下暂无作品</p>
          <button
            type="button"
            onClick={() => navigate('/works/new')}
            className="mt-4 min-h-[44px] rounded-xl bg-[var(--nb-action)] px-5 text-sm font-medium text-[var(--nb-inverse)]"
          >
            去发布第一组作品
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredWorks.map((work, idx) => {
            const checked = selectedIds.includes(work.id);
            return (
              <div
                key={work.id}
                className={`group flex flex-col overflow-hidden rounded-2xl border bg-[var(--nb-surface)] transition ${
                  checked ? 'border-[var(--nb-ink)] ring-1 ring-[var(--nb-ink)]' : 'border-[var(--nb-line)]'
                }`}
              >
                <div className="relative aspect-[4/5] bg-[var(--nb-page)]">
                  {work.coverUrl ? (
                    <img
                      src={work.coverUrl}
                      alt={work.title || '作品封面'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--nb-muted)]">
                      暂无封面图
                    </div>
                  )}

                  <label className="absolute left-3 top-3 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white/90 shadow-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(work.id)}
                      className="h-4 w-4 accent-[var(--nb-action)]"
                    />
                  </label>

                  <div className="absolute right-3 top-3 flex gap-1.5">
                    {work.isPinned && (
                      <span className="rounded-md bg-[var(--nb-action)] px-2 py-0.5 text-[11px] text-[var(--nb-inverse)]">
                        置顶
                      </span>
                    )}
                    {work.publicationStatus === 'draft' ? (
                      <span className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] text-[var(--nb-secondary)]">
                        草稿
                      </span>
                    ) : !work.isVisible ? (
                      <span className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] text-[var(--nb-muted)]">
                        已隐藏
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 text-sm font-semibold text-[var(--nb-ink)]">
                        {work.title || '未命名草稿'}
                      </h3>
                      <span className="shrink-0 text-sm font-semibold text-[var(--nb-ink)]">
                        {work.price != null ? `¥${work.price}` : '--'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(work.tags || []).slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-[var(--nb-page)] px-2 py-0.5 text-[11px] text-[var(--nb-secondary)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-[var(--nb-muted)]">
                      浏览 {work.viewCount ?? 0} · 点赞 {work.likeCount ?? 0} · 收藏 {work.favoriteCount ?? 0}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--nb-line)] pt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/works/${work.id}/edit`)}
                        className="font-medium text-[var(--nb-ink)] hover:underline"
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSingleAction(work, 'visible')}
                        className="text-[var(--nb-secondary)] hover:underline"
                      >
                        {work.isVisible ? '隐藏' : '上架'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSingleAction(work, 'pinned')}
                        className="text-[var(--nb-secondary)] hover:underline"
                      >
                        {work.isPinned ? '取消置顶' : '置顶'}
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => void moveWorkOrder(idx, -1)}
                        className="rounded border border-[var(--nb-line)] px-1.5 py-0.5 text-[var(--nb-muted)] disabled:opacity-30"
                        title="上移"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={idx === filteredWorks.length - 1}
                        onClick={() => void moveWorkOrder(idx, 1)}
                        className="rounded border border-[var(--nb-line)] px-1.5 py-0.5 text-[var(--nb-muted)] disabled:opacity-30"
                        title="下移"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSingleAction(work, 'delete')}
                        className="ml-1 text-[var(--nb-muted)] hover:text-[var(--nb-ink)]"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)]">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-[var(--nb-line)] bg-[var(--nb-page)] text-xs text-[var(--nb-muted)]">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredWorks.length && filteredWorks.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 accent-[var(--nb-action)]"
                  />
                </th>
                <th className="px-4 py-3">作品</th>
                <th className="px-4 py-3">标签</th>
                <th className="px-4 py-3">价格</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">数据（浏览/赞/藏）</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--nb-line)]">
              {filteredWorks.map((work) => (
                <tr key={work.id} className="hover:bg-[var(--nb-page)]/60">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(work.id)}
                      onChange={() => toggleSelect(work.id)}
                      className="h-4 w-4 accent-[var(--nb-action)]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {work.coverUrl ? (
                        <img
                          src={work.coverUrl}
                          alt={work.title || ''}
                          className="h-11 w-11 rounded-lg border border-[var(--nb-line)] object-cover"
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-lg bg-[var(--nb-page)]" />
                      )}
                      <div>
                        <div className="font-medium text-[var(--nb-ink)]">
                          {work.title || '未命名草稿'}
                        </div>
                        {work.isPinned && (
                          <span className="text-[11px] text-[var(--nb-link)]">已置顶</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--nb-secondary)]">
                    {(work.tags || []).join('、') || '--'}
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--nb-ink)]">
                    {work.price != null ? `¥${work.price}` : '--'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--nb-secondary)]">
                    {work.publicationStatus === 'draft'
                      ? '草稿'
                      : work.isVisible
                        ? '已上架'
                        : '已隐藏'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--nb-muted)]">
                    {work.viewCount ?? 0} / {work.likeCount ?? 0} / {work.favoriteCount ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    <button
                      type="button"
                      onClick={() => navigate(`/works/${work.id}/edit`)}
                      className="mr-3 font-medium text-[var(--nb-ink)] hover:underline"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSingleAction(work, 'visible')}
                      className="mr-3 text-[var(--nb-secondary)] hover:underline"
                    >
                      {work.isVisible ? '隐藏' : '上架'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSingleAction(work, 'delete')}
                      className="text-[var(--nb-muted)] hover:text-[var(--nb-ink)]"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 批量加标签 / 改价弹窗 */}
      {batchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-6 shadow-xl">
            <h3 className="text-base font-semibold text-[var(--nb-ink)]">
              {batchModal === 'tags' ? '批量添加标签' : '批量修改展示价格'}
            </h3>
            {batchModal === 'tags' ? (
              <div className="mt-4">
                <input
                  type="text"
                  value={batchTagsInput}
                  onChange={(e) => setBatchTagsInput(e.target.value)}
                  placeholder="多个标签用逗号分隔，如：法式,裸色,秋冬"
                  className="min-h-[44px] w-full rounded-xl border border-[var(--nb-line)] px-3 text-sm"
                />
              </div>
            ) : (
              <div className="mt-4">
                <input
                  type="number"
                  min={1}
                  value={batchPriceInput}
                  onChange={(e) => setBatchPriceInput(e.target.value)}
                  placeholder="输入新的展示价格（元）"
                  className="min-h-[44px] w-full rounded-xl border border-[var(--nb-line)] px-3 text-sm"
                />
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBatchModal(null)}
                className="min-h-[40px] rounded-xl border border-[var(--nb-line)] px-4 text-sm text-[var(--nb-secondary)]"
              >
                取消
              </button>
              <button
                type="button"
                disabled={batchLoading}
                onClick={() => {
                  if (batchModal === 'tags') {
                    const tags = batchTagsInput
                      .split(/[,，]/)
                      .map((t) => t.trim())
                      .filter(Boolean);
                    void runBatchAction('add_tags', { tags });
                  } else {
                    const price = Number(batchPriceInput);
                    if (!Number.isFinite(price) || price <= 0) {
                      showToast('error', '请输入有效价格');
                      return;
                    }
                    void runBatchAction('update_price', { price });
                  }
                }}
                className="min-h-[40px] rounded-xl bg-[var(--nb-action)] px-4 text-sm font-medium text-[var(--nb-inverse)]"
              >
                确认应用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorksPage;
