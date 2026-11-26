import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/feedback/ToastProvider';
import { useAuth } from '../hooks/useAuth';
import { customersService } from '../services/customers';
import {
  formatDateLabel,
  formatMoney,
  type TechnicianCustomerDetail,
  type TechnicianCustomerSummary,
} from '../services/technicianData';
import { ListItemSkeleton } from '../components/Skeleton';

const DEFAULT_TABS = ['全部', '常客', '新客', '高频'];

export const CustomersPage: React.FC = () => {
  const { technician } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [customers, setCustomers] = useState<TechnicianCustomerSummary[]>([]);
  const [distinctTags, setDistinctTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 右侧详情抽屉
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TechnicianCustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const [listData, tagsData] = await Promise.all([
        customersService.list({
          technicianId: technician?.id,
          search: searchQuery.trim() || undefined,
        }),
        customersService.getDistinctTags(),
      ]);
      setCustomers(listData);
      setDistinctTags(tagsData);
    } catch {
      setCustomers([]);
      toast.error('客户数据加载失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, technician?.id, toast]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    customersService
      .getById(selectedId)
      .then((res) => {
        if (!cancelled) {
          setDetail(res);
          setNameDraft(res?.name || '');
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const filterTabs = useMemo(() => {
    const merged = [...DEFAULT_TABS];
    for (const tag of distinctTags) {
      if (tag && !merged.includes(tag)) merged.push(tag);
    }
    return merged.slice(0, 10);
  }, [distinctTags]);

  const visibleCustomers = useMemo(() => {
    return customers.filter((customer) => {
      if (activeTab === '全部') return true;
      return customer.tags.includes(activeTab);
    });
  }, [customers, activeTab]);

  const handleInvite = async () => {
    if (!(technician?.homeService || technician?.shopService)) {
      toast.warning('请先开启上门或到店服务，才能邀请客户');
      return;
    }
    const invitationCode = technician?.invitationCode;
    if (!invitationCode) {
      toast.warning('暂未生成邀请码，请稍后重试');
      return;
    }
    const clientBaseUrl = import.meta.env.VITE_CLIENT_BASE_URL || 'https://m.lunails.cn';
    const inviteLink = `${clientBaseUrl}/invite?invite_code=${encodeURIComponent(invitationCode)}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('客户绑定邀请链接已复制到剪贴板');
    } catch {
      toast.error('复制失败，请稍后重试');
    }
  };

  const handleSaveName = async () => {
    if (!detail || !nameDraft.trim()) {
      toast.warning('客户名称不能为空');
      return;
    }
    try {
      await customersService.updateName(detail.id, nameDraft.trim());
      setDetail({ ...detail, name: nameDraft.trim() });
      setCustomers((prev) =>
        prev.map((c) => (c.id === detail.id ? { ...c, name: nameDraft.trim() } : c)),
      );
      setEditingName(false);
      toast.success('客户名称已更新');
    } catch {
      toast.error('更新名称失败');
    }
  };

  const handleUpdateTags = async (nextTags: string[]) => {
    if (!detail) return;
    try {
      await customersService.updateTags(detail.id, nextTags.join(','));
      setDetail({ ...detail, tags: nextTags });
      setCustomers((prev) =>
        prev.map((c) => (c.id === detail.id ? { ...c, tags: nextTags } : c)),
      );
      toast.success('标签已更新');
    } catch {
      toast.error('标签更新失败');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* 左侧客户宽屏列表 */}
      <div className={`space-y-4 ${selectedId ? 'xl:col-span-7' : 'xl:col-span-12'}`}>
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-2">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`min-h-[36px] rounded-xl px-3.5 text-xs font-medium transition ${
                  activeTab === tab
                    ? 'bg-[var(--nb-action)] text-[var(--nb-inverse)]'
                    : 'bg-[var(--nb-page)] text-[var(--nb-secondary)] hover:text-[var(--nb-ink)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索客户昵称或手机号..."
              className="min-h-[40px] w-56 rounded-xl border border-[var(--nb-line)] bg-[var(--nb-page)] px-3 text-sm text-[var(--nb-ink)] placeholder:text-[var(--nb-muted)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleInvite()}
              className="min-h-[40px] shrink-0 rounded-xl bg-[var(--nb-action)] px-4 text-sm font-medium text-[var(--nb-inverse)]"
            >
              复制邀请链接
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)]">
          {isLoading ? (
            <div className="space-y-3 p-4">
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
            </div>
          ) : visibleCustomers.length === 0 ? (
            <div className="py-16 text-center text-sm text-[var(--nb-muted)]">
              暂无符合条件的客户档案
            </div>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[var(--nb-line)] bg-[var(--nb-page)] text-xs text-[var(--nb-muted)]">
                <tr>
                  <th className="px-4 py-3">客户</th>
                  <th className="px-4 py-3">标签</th>
                  <th className="px-4 py-3">累计服务</th>
                  <th className="px-4 py-3">备注摘要</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--nb-line)]">
                {visibleCustomers.map((customer) => {
                  const active = selectedId === customer.id;
                  return (
                    <tr
                      key={customer.id}
                      onClick={() => setSelectedId(customer.id)}
                      className={`cursor-pointer transition ${
                        active ? 'bg-[var(--nb-active-surface)]' : 'hover:bg-[var(--nb-page)]/60'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--nb-ink)]">{customer.name}</div>
                        <div className="text-xs text-[var(--nb-muted)]">{customer.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {customer.tags.length > 0 ? (
                            customer.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md bg-[var(--nb-page)] px-2 py-0.5 text-[11px] text-[var(--nb-secondary)]"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-[var(--nb-muted)]">--</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--nb-secondary)]">
                        {customer.totalOrders} 次
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-xs text-[var(--nb-muted)]">
                        {customer.note}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${customer.id}`);
                          }}
                          className="text-xs font-medium text-[var(--nb-link)] hover:underline"
                        >
                          完整档案
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 右侧全景详情分栏 */}
      {selectedId && (
        <div className="xl:col-span-5">
          <div className="sticky top-20 space-y-5 rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5">
            {detailLoading || !detail ? (
              <div className="py-12 text-center text-sm text-[var(--nb-muted)]">
                正在加载客户档案...
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 border-b border-[var(--nb-line)] pb-4">
                  <div>
                    {editingName ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={nameDraft}
                          onChange={(e) => setNameDraft(e.target.value)}
                          className="min-h-[34px] rounded-lg border border-[var(--nb-line)] px-2.5 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSaveName()}
                          className="min-h-[34px] rounded-lg bg-[var(--nb-action)] px-3 text-xs text-[var(--nb-inverse)]"
                        >
                          保存
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-[var(--nb-ink)]">{detail.name}</h3>
                        <button
                          type="button"
                          onClick={() => setEditingName(true)}
                          className="text-xs text-[var(--nb-link)] hover:underline"
                        >
                          改备注名
                        </button>
                      </div>
                    )}
                    <div className="mt-1 text-xs text-[var(--nb-muted)]">
                      {detail.phone} · 累计 {detail.totalOrders} 单 · 消费 {formatMoney(detail.totalSpent)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="rounded-lg border border-[var(--nb-line)] px-2.5 py-1 text-xs text-[var(--nb-muted)] hover:text-[var(--nb-ink)]"
                  >
                    关闭
                  </button>
                </div>

                {/* 甲型偏好与避坑提醒 */}
                <div className="space-y-2 rounded-xl border border-[var(--nb-line)] bg-[var(--nb-page)] p-3.5 text-xs">
                  <div className="font-semibold text-[var(--nb-ink)]">甲型偏好与禁忌提醒</div>
                  <div className="text-[var(--nb-secondary)]">
                    偏好风格：{detail.preferenceStyle} · 色系：{detail.preferenceColor}
                  </div>
                  <div className="text-[var(--nb-secondary)]">过敏/禁忌：{detail.allergyNote}</div>
                  <div className="text-[var(--nb-muted)]">备注：{detail.note}</div>
                </div>

                {/* 快捷标签维护 */}
                <div>
                  <div className="mb-2 text-xs font-semibold text-[var(--nb-ink)]">客户标签</div>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--nb-page)] px-2.5 py-1 text-xs text-[var(--nb-ink)]"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => void handleUpdateTags(detail.tags.filter((t) => t !== tag))}
                          className="text-[var(--nb-muted)] hover:text-[var(--nb-ink)]"
                          aria-label={`移除标签 ${tag}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = newTagInput.trim();
                          if (val && !detail.tags.includes(val)) {
                            void handleUpdateTags([...detail.tags, val]);
                          }
                          setNewTagInput('');
                        }
                      }}
                      placeholder="输入新标签后回车"
                      className="min-h-[36px] flex-1 rounded-xl border border-[var(--nb-line)] px-3 text-xs"
                    />
                  </div>
                </div>

                {/* 历史服务时间轴 */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--nb-ink)]">历史服务记录</span>
                    <button
                      type="button"
                      onClick={() => navigate(`/customers/${detail.id}`)}
                      className="text-xs text-[var(--nb-link)] hover:underline"
                    >
                      进入完整详情页 →
                    </button>
                  </div>
                  {detail.history.length === 0 ? (
                    <p className="text-xs text-[var(--nb-muted)]">暂无历史服务记录</p>
                  ) : (
                    <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                      {detail.history.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl border border-[var(--nb-line)] px-3 py-2 text-xs"
                        >
                          <div>
                            <div className="font-medium text-[var(--nb-ink)]">{item.label}</div>
                            <div className="text-[var(--nb-muted)]">{formatDateLabel(item.date)}</div>
                          </div>
                          <div className="text-right font-medium text-[var(--nb-ink)]">
                            {formatMoney(item.price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
