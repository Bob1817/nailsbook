import { neutralTagColors } from '../styles/tagColors';
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/base/Card';
import { useToast } from '../components/feedback/ToastProvider';
import { useAuth } from '../hooks/useAuth';
import { customersService } from '../services/customers';
import {
  formatDateLabel,
  formatMoney,
  type TechnicianCustomerSummary,
} from '../services/technicianData';
import { ListItemSkeleton } from '../components/Skeleton';
import type { CustomTag } from '../contexts/authTypes';

const customerTabs = ['全部', '常客', '新客', '高频'];

const TAG_FALLBACK_COLORS: Record<string, { bg: string; text: string }> = {
  '常客': { bg: 'var(--nb-page)', text: 'var(--nb-action)' },
  '新客': { bg: 'var(--nb-page)', text: 'var(--nb-action)' },
  '高频': { bg: 'var(--nb-page)', text: 'var(--nb-action)' },
  '简约': { bg: 'var(--nb-page)', text: 'var(--nb-action)' },
  '裸色系': { bg: 'var(--nb-page)', text: 'var(--nb-action)' },
};

function getTagColor(tag: string, customTags: CustomTag[]): { bg: string; text: string } {
  const custom = customTags.find((t) => t.name === tag);
  if (custom) {
    return neutralTagColors(custom.color);
  }
  return TAG_FALLBACK_COLORS[tag] ?? { bg: 'var(--nb-page)', text: 'var(--nb-muted)' };
}

function getCustomerAvatar(name: string) {
  return name.slice(0, 1).toUpperCase();
}

/** 判断 name 是否只是手机号（说明客户未设置昵称） */
function isPhoneNumberAsName(name: string): boolean {
  return /^1\d{10}$/.test(name);
}

export const CustomersPage: React.FC = () => {
  const { technician } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [customers, setCustomers] = useState<TechnicianCustomerSummary[]>([]);
  const [activeTab, setActiveTab] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [avatarTagCustomerId, setAvatarTagCustomerId] = useState<number | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const customTags = useMemo(() => technician?.customTags ?? [], [technician?.customTags]);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      setIsLoading(true);
      try {
        const nextCustomers = await customersService.list({
          technicianId: technician?.id,
          search: searchQuery.trim() || undefined,
        });

        if (!cancelled) {
          setCustomers(nextCustomers);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setCustomers([]);
          setIsLoading(false);
          toast.error('客户数据加载失败，请稍后重试。');
        }
      }
    }

    void loadCustomers();
    return () => {
      cancelled = true;
    };
  }, [searchQuery, technician?.id, toast]);

  const visibleCustomers = customers.filter((customer) => {
    if (activeTab === '全部') {
      return true;
    }
    return customer.tags.includes(activeTab);
  });

  const handleInvite = async () => {
    // 接单就绪：至少开启一种服务类型；未就绪则锁定邀请码/邀请链接
    if (!(technician?.homeService || technician?.shopService)) {
      toast.warning('请先开启上门或到店服务，才能邀请客户。');
      return;
    }
    const invitationCode = technician?.invitationCode;
    if (!invitationCode) {
      toast.warning('暂未生成邀请码，请稍后重试。');
      return;
    }
    const clientBaseUrl = import.meta.env.VITE_CLIENT_BASE_URL || 'https://m.lunails.cn';
    const inviteLink = `${clientBaseUrl}/invite?invite_code=${encodeURIComponent(invitationCode)}`;
    const shareText = `${technician?.name || '美甲师'}邀请你预约美甲服务，点击链接完成绑定：`;
    try {
      if (navigator.share) {
        await navigator.share({ title: '邀请你预约美甲', text: shareText, url: inviteLink });
      } else {
        await navigator.clipboard.writeText(inviteLink);
        toast.success('当前环境不支持分享，邀请链接已复制');
      }
    } catch (error) {
      // 用户主动取消分享不算错误
      if ((error as { name?: string })?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(inviteLink);
        toast.success('邀请链接已复制');
      } catch {
        toast.error('分享失败，请重试');
      }
    }
  };

  const handleUpdateName = async (customerId: number) => {
    if (!editingName.trim()) {
      toast.warning('客户名称不能为空');
      return;
    }
    try {
      await customersService.updateName(customerId, editingName.trim());
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, name: editingName.trim() } : c)),
      );
      toast.success('客户名称已更新');
      setEditingCustomerId(null);
      setEditingName('');
    } catch {
      toast.error('更新失败，请重试');
    }
  };

  return (
    <div className="flex h-full flex-col bg-[var(--nb-page)]">
      {/* 固定头部：标题 + 搜索框 + 分类标签 */}
      <div className="shrink-0 px-5 pt-5 pb-3 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[var(--nb-ink)]">客户</h1>
            <p className="mt-1 text-sm text-[var(--nb-muted)]">管理客户档案、标签与服务记录</p>
          </div>
          <button
            type="button"
            onClick={handleInvite}
            className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-[var(--nb-page)] px-4 py-2 text-sm font-medium text-[var(--nb-secondary)] transition-colors active:bg-[var(--nb-page)]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 8.25h7.5a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5h-7.5a1.5 1.5 0 01-1.5-1.5v-7.5a1.5 1.5 0 011.5-1.5zm2.25-3h7.5m-3.75 0V3m0 2.25v3" />
            </svg>
            邀请客户
          </button>
        </div>

        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nb-muted)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="搜索客户姓名或联系方式"
            className="h-11 w-full rounded-[16px] border border-[var(--nb-line)] bg-[var(--nb-page)] pl-10 pr-4 text-[var(--nb-ink)] placeholder-[var(--nb-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--nb-ink)]"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {customerTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`min-h-[44px] flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-[var(--nb-action)] text-white'
                  : 'border border-[var(--nb-line)] bg-white text-[var(--nb-secondary)] active:bg-[var(--nb-page)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 可滚动内容：客户卡片列表（底部留出 TabBar 高度 + 安全区，避免最后一条被遮挡） */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-[calc(3.5rem+env(safe-area-inset-bottom)+1.5rem)]">
        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : visibleCustomers.length > 0 ? (
          <div className="space-y-3">
            {visibleCustomers.map((customer) => (
              <div
                key={customer.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/customers/${customer.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/customers/${customer.id}`);
                  }
                }}
                className="w-full text-left cursor-pointer"
              >
                <Card className="px-lg py-lg transition-colors active:bg-[var(--nb-page)]">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAvatarTagCustomerId(avatarTagCustomerId === customer.id ? null : customer.id);
                        }}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--nb-page)] text-sm font-semibold text-[var(--nb-ink)] active:opacity-80"
                      >
                        {isPhoneNumberAsName(customer.name) ? (
                          <svg className="h-6 w-6 text-[var(--nb-ink)]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                          </svg>
                        ) : (
                          <span className="text-sm font-semibold text-[var(--nb-ink)]">{getCustomerAvatar(customer.name)}</span>
                        )}
                      </button>
                      {avatarTagCustomerId === customer.id && customer.tags.length > 0 && (
                        <div
                          className="absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 rounded-[14px] bg-white px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04]"
                          style={{ minWidth: 100 }}
                        >
                          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 bg-white ring-1 ring-black/[0.04]" />
                          <div className="flex flex-wrap gap-1.5">
                            {customer.tags.map((tag) => {
                              const tc = getTagColor(tag, customTags);
                              return (
                                <span key={tag} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: tc.bg, color: tc.text }}>
                                  {tag}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 min-[391px]:flex-row min-[391px]:items-start min-[391px]:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {editingCustomerId === customer.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdateName(customer.id);
                                    if (e.key === 'Escape') { setEditingCustomerId(null); setEditingName(''); }
                                  }}
                                  className="w-28 rounded-lg border border-[var(--nb-control)] px-2 py-1 text-sm focus:border-[var(--nb-ink)] focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateName(customer.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--nb-action)] text-white active:bg-[var(--nb-action-pressed)]"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => { setEditingCustomerId(null); setEditingName(''); }}
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--nb-pressed)] text-[var(--nb-secondary)] active:bg-[var(--nb-pressed)]"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <>
                                <p className="truncate text-sm font-semibold text-[var(--nb-ink)]">
                                  {isPhoneNumberAsName(customer.name) ? '未设置名称' : customer.name}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCustomerId(customer.id);
                                    setEditingName(isPhoneNumberAsName(customer.name) ? '' : customer.name);
                                  }}
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--nb-muted)] hover:text-[var(--nb-secondary)] active:text-[var(--nb-secondary)]"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <svg className="h-4 w-4 shrink-0 text-[var(--nb-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </>
                            )}
                          </div>
                          {customer.address ? (
                            <p className="mt-1 truncate text-xs text-[var(--nb-secondary)]">{customer.address}</p>
                          ) : (
                            <p className="mt-1 text-xs text-[var(--nb-muted)]">暂无地址</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {customer.tags.map((tag) => {
                            const tc = getTagColor(tag, customTags);
                            return (
                              <span key={tag} className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: tc.bg, color: tc.text }}>
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-[18px] bg-[var(--nb-page)] p-3 min-[391px]:grid-cols-3">
                        <div className="min-w-0">
                          <p className="text-[11px] text-[var(--nb-muted)]">最近服务</p>
                          <p className="mt-1 text-xs font-medium text-[var(--nb-ink)]">
                            {customer.recentServiceAt ? formatDateLabel(customer.recentServiceAt) : '暂无记录'}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-[var(--nb-muted)]">累计消费</p>
                          <p className="mt-1 text-xs font-semibold text-[var(--nb-secondary)]">{formatMoney(customer.totalSpent)}</p>
                        </div>
                        <div className="col-span-2 min-w-0 min-[391px]:col-span-1">
                          <p className="text-[11px] text-[var(--nb-muted)]">服务次数</p>
                          <p className="mt-1 text-xs font-medium text-[var(--nb-ink)]">{customer.totalOrders} 次</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Card className="px-lg py-xl text-center text-sm text-[var(--nb-muted)]">没有找到匹配的客户</Card>
        )}
      </div>
    </div>
  );
};
