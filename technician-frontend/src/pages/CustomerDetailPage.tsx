import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../components/feedback/ToastProvider';
import { useAuth } from '../hooks/useAuth';
import { customersService } from '../services/customers';
import { messageService, type Conversation } from '../services/message';
import {
  orderStatusClasses,
  orderStatusLabels,
  formatDateLabel,
  formatMoney,
  type TechnicianCustomerDetail,
} from '../services/technicianData';
import type { CustomTag } from '../contexts/authTypes';

const TAG_FALLBACK_COLORS: Record<string, { bg: string; text: string }> = {
  '常客': { bg: '#FFE9F0', text: '#FF5E93' },
  '新客': { bg: '#EBF4FF', text: '#3B82F6' },
  '高频': { bg: '#FFF1E5', text: '#C9792A' },
  '简约': { bg: '#EEF9F1', text: '#31B46C' },
  '裸色系': { bg: '#FFF8E6', text: '#C9860A' },
};

function getTagColor(tag: string, customTags: CustomTag[]): { bg: string; text: string } {
  const custom = customTags.find((t) => t.name === tag);
  if (custom) {
    const PRESET: Record<string, string> = {
      '#FF5E93': '#FFE9F0', '#C9792A': '#FFF1E5', '#31B46C': '#EEF9F1',
      '#3B82F6': '#EBF4FF', '#7C3AED': '#F5F0FF', '#C9860A': '#FFF8E6',
      '#6D6570': '#F2F0F3', '#E53E3E': '#FFE4E4',
    };
    return { bg: PRESET[custom.color] ?? '#F2F0F3', text: custom.color };
  }
  return TAG_FALLBACK_COLORS[tag] ?? { bg: '#F2F0F3', text: '#6D6570' };
}

function getCustomerAvatar(name: string) {
  return name.slice(0, 1).toUpperCase();
}

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { technician } = useAuth();
  const [customer, setCustomer] = useState<TechnicianCustomerDetail | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  const customTags = useMemo(() => technician?.customTags ?? [], [technician?.customTags]);
  const allTagNames = useMemo(() => {
    const names = new Set<string>();
    customTags.forEach((t) => names.add(t.name));
    if (customer) customer.tags.forEach((t) => names.add(t));
    return [...names];
  }, [customTags, customer]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [detail, convos] = await Promise.all([
          customersService.getById(Number(id)),
          messageService.getConversations().catch(() => []),
        ]);
        if (!cancelled) {
          setCustomer(detail);
          setConversations(convos);
        }
      } catch {
        if (!cancelled) toast.error('客户详情加载失败');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id, toast]);

  function handleViewActiveOrders() {
    if (!customer) return;
    navigate(`/orders?customerName=${encodeURIComponent(customer.name)}&activeStatus=1`);
  }

  function handleViewAllOrders() {
    if (!customer) return;
    navigate(`/orders?customerName=${encodeURIComponent(customer.name)}`);
  }

  function handleCreateOrder() {
    if (!customer) return;
    navigate(`/orders?customerId=${customer.id}`);
  }

  function handleStartChat() {
    if (!customer) return;
    const existing = conversations.find((c) => c.client.id === customer.id);
    if (existing) {
      navigate(`/chat?conversation_id=${existing.id}`);
    } else {
      navigate(`/chat?client_id=${customer.id}`);
    }
  }

  function handleOpenTagEditor() {
    if (!customer) return;
    setEditingTags([...customer.tags]);
    setShowTagEditor(true);
  }

  async function handleSaveTags() {
    if (!customer) return;
    setSavingTags(true);
    try {
      const tagString = editingTags.join(',');
      await customersService.updateTags(customer.id, tagString);
      setCustomer({ ...customer, tags: [...editingTags] });
      setShowTagEditor(false);
      toast.success('标签已更新');
    } catch {
      toast.error('保存标签失败');
    } finally {
      setSavingTags(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col bg-[#fff9f8]">
        <div className="shrink-0 flex items-center gap-3 px-5 pt-5 pb-3">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80">
            <svg className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">客户详情</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="rounded-full bg-white px-4 py-2 text-sm text-gray-500 shadow-sm">加载中...</div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex h-full flex-col bg-[#fff9f8]">
        <div className="shrink-0 flex items-center gap-3 px-5 pt-5 pb-3">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80">
            <svg className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">客户详情</h1>
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">未找到该客户</div>
      </div>
    );
  }

  const actionBtns: React.ReactNode[] = [
    <button key="order" type="button" onClick={handleCreateOrder}
      className="flex-1 min-w-0 h-12 rounded-[18px] bg-pink-500 text-[15px] font-medium text-white shadow-[0_8px_18px_rgba(236,72,153,0.16)] active:bg-pink-600">
      新建预约
    </button>,
    <button key="active" type="button" onClick={handleViewActiveOrders}
      className="flex-1 min-w-0 h-12 rounded-[18px] border border-pink-200 bg-white text-[15px] font-medium text-pink-500 active:bg-pink-50">
      查看预约
    </button>,
    <button key="history" type="button" onClick={handleViewAllOrders}
      className="flex-1 min-w-0 h-12 rounded-[18px] border border-gray-200 bg-white text-[15px] font-medium text-gray-600 active:bg-gray-50">
      历史预约
    </button>,
  ];

  return (
    <div className="flex h-full flex-col bg-[#fff9f8]">
      {/* 固定头部 */}
      <div className="shrink-0 flex items-center gap-3 px-5 pt-5 pb-3">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80">
          <svg className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-900">客户详情</h1>
      </div>

      {/* 可滚动内容 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-24 space-y-5">
        {/* 客户基本信息卡片 */}
        <div className="rounded-[24px] border border-[#f5e7ea] bg-white p-5 shadow-[0_8px_24px_rgba(29,35,53,0.04)]">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#fdecef] text-lg font-semibold text-[#e86b8f]">
              {getCustomerAvatar(customer.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 min-[391px]:flex-row min-[391px]:items-start min-[391px]:justify-between">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-gray-900">{customer.name}</p>
                  <p className="mt-1 break-all text-sm text-gray-500">{customer.phone}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customer.tags.map((tag) => {
                    const tc = getTagColor(tag, customTags);
                    return (
                      <span key={tag} className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: tc.bg, color: tc.text }}>
                        {tag}
                      </span>
                    );
                  })}
                  <button
                    type="button"
                    onClick={handleOpenTagEditor}
                    className="rounded-full border border-dashed border-[#e5e2e6] px-2.5 py-1 text-xs font-medium text-[#8d8590] active:bg-[#f7f3f5]"
                  >
                    {customer.tags.length > 0 ? '编辑' : '+ 添加标签'}
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-[18px] bg-[#fcf7f8] p-3 min-[391px]:grid-cols-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400">累计消费</p>
                  <p className="mt-1 text-sm font-semibold text-pink-500">{formatMoney(customer.totalSpent)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400">服务次数</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{customer.totalOrders} 次</p>
                </div>
                <div className="col-span-2 min-w-0 min-[391px]:col-span-1">
                  <p className="text-[11px] text-gray-400">最近到店</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {customer.recentServiceAt ? formatDateLabel(customer.recentServiceAt) : '暂无记录'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 基础信息 */}
        <div className="rounded-[24px] border border-[#f5e7ea] bg-white p-5 shadow-[0_8px_24px_rgba(29,35,53,0.04)]">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">基础信息</h2>
            <p className="mt-1 text-xs text-gray-400">客户资料与最近沟通备注</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex flex-col gap-2 min-[391px]:flex-row min-[391px]:items-start min-[391px]:justify-between">
              <span className="shrink-0 text-gray-500">地址</span>
              <div className="flex min-w-0 flex-col items-start gap-2 min-[391px]:items-end">
                <span className="w-full break-words text-left text-gray-900 min-[391px]:text-right">{customer.address}</span>
                <button
                  onClick={() => toast.success('请打开本机安装的导航软件进行导航')}
                  className="flex min-h-[44px] items-center gap-1 rounded-full bg-[#f5f7ff] px-3 py-2 text-xs font-medium text-[#5870c6] transition-colors active:bg-[#e9edff]"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  导航
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2 min-[391px]:flex-row min-[391px]:items-start min-[391px]:justify-between">
              <span className="shrink-0 text-gray-500">备注</span>
              <span className="min-w-0 break-words text-left text-gray-900 min-[391px]:max-w-[70%] min-[391px]:text-right">
                {customer.note}
              </span>
            </div>
          </div>
        </div>

        {/* 偏好信息 */}
        <div className="rounded-[24px] border border-[#f5e7ea] bg-white p-5 shadow-[0_8px_24px_rgba(29,35,53,0.04)]">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">偏好信息</h2>
            <p className="mt-1 text-xs text-gray-400">风格、颜色与风险提醒</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex flex-col gap-2 min-[391px]:flex-row min-[391px]:items-start min-[391px]:justify-between">
              <span className="shrink-0 text-gray-500">喜好款式</span>
              <span className="min-w-0 break-words text-left text-gray-900 min-[391px]:max-w-[70%] min-[391px]:text-right">
                {customer.preferenceStyle}
              </span>
            </div>
            <div className="flex flex-col gap-2 min-[391px]:flex-row min-[391px]:items-start min-[391px]:justify-between">
              <span className="shrink-0 text-gray-500">颜色偏好</span>
              <span className="min-w-0 break-words text-left text-gray-900 min-[391px]:max-w-[70%] min-[391px]:text-right">
                {customer.preferenceColor}
              </span>
            </div>
            <div className="flex flex-col gap-2 min-[391px]:flex-row min-[391px]:items-start min-[391px]:justify-between">
              <span className="shrink-0 text-gray-500">过敏信息</span>
              <span className="min-w-0 break-words text-left text-red-500 min-[391px]:max-w-[70%] min-[391px]:text-right">
                {customer.allergyNote}
              </span>
            </div>
          </div>
        </div>

        {/* 历史记录 */}
        <div className="rounded-[24px] border border-[#f5e7ea] bg-white p-5 shadow-[0_8px_24px_rgba(29,35,53,0.04)]">
          <div className="mb-3 flex flex-col gap-3 min-[391px]:flex-row min-[391px]:items-center min-[391px]:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">历史记录</h2>
              <p className="mt-1 text-xs text-gray-400">按时间查看服务、状态与金额</p>
            </div>
            <button
              onClick={handleViewAllOrders}
              className="min-h-[44px] rounded-full border border-[#ebe3e6] bg-white px-4 py-2 text-xs font-medium text-gray-600 transition-colors active:bg-[#f7f2f4]"
            >
              查看预约
            </button>
          </div>
          <div className="space-y-3">
            {customer.history.length > 0 ? (
              customer.history.map((item) => (
                <div key={item.id} className="rounded-[18px] bg-[#fcf7f8] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-gray-900">{item.label}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${orderStatusClasses[item.status as keyof typeof orderStatusClasses] ?? 'bg-gray-100 text-gray-600'}`}>
                          {orderStatusLabels[item.status as keyof typeof orderStatusLabels] ?? item.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">{formatDateLabel(item.date)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-semibold text-pink-500">{formatMoney(item.price)}</span>
                      <p className={`mt-1 text-[11px] ${item.depositPaid ? 'text-emerald-500' : 'text-orange-500'}`}>
                        {item.depositPaid ? '定金已收' : '定金待收'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">暂无历史服务记录</p>
            )}
          </div>
        </div>
      </div>

      {/* 固定底部操作栏 */}
      <div className="shrink-0 border-t border-[#f4ebee] bg-white/95 px-5 py-4 backdrop-blur-xl" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        {actionBtns.length <= 3 ? (
          <div className="flex gap-2">{actionBtns}</div>
        ) : (
          <div>
            <div className="flex gap-2">
              {actionBtns[0]}{actionBtns[1]}
              <button type="button" onClick={() => setShowMoreActions(!showMoreActions)}
                className="flex-1 min-w-0 h-12 rounded-[18px] border border-gray-200 bg-white text-[15px] font-medium text-gray-600 active:opacity-80">
                {showMoreActions ? '收起操作 ↑' : '更多操作 ↓'}
              </button>
            </div>
            {showMoreActions && <div className="flex gap-2 mt-2">{actionBtns.slice(2)}</div>}
          </div>
        )}
      </div>

      {/* 标签编辑弹窗 */}
      {showTagEditor && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowTagEditor(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-[28px] bg-white px-6 pb-8 pt-5 shadow-[0_-12px_40px_rgba(0,0,0,0.12)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[17px] font-semibold text-[#1f2230]">编辑标签</h3>
              <button
                type="button"
                onClick={() => setShowTagEditor(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2f0f3]"
              >
                <svg className="h-4 w-4 text-[#6d6570]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-[12px] text-[#7f7681] mb-2">当前标签（点击移除）</p>
              <div className="flex flex-wrap gap-2">
                {editingTags.length > 0 ? editingTags.map((tag) => {
                  const tc = getTagColor(tag, customTags);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setEditingTags(editingTags.filter((t) => t !== tag))}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium active:opacity-70"
                      style={{ backgroundColor: tc.bg, color: tc.text }}
                    >
                      {tag}
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  );
                }) : (
                  <span className="text-[12px] text-[#b0aab4]">暂无标签</span>
                )}
              </div>
            </div>

            <div className="mb-5">
              <p className="text-[12px] text-[#7f7681] mb-2">可选标签（点击添加）</p>
              <div className="flex flex-wrap gap-2">
                {allTagNames.filter((t) => !editingTags.includes(t)).map((tag) => {
                  const tc = getTagColor(tag, customTags);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setEditingTags([...editingTags, tag])}
                      className="rounded-full px-3 py-1.5 text-[12px] font-medium ring-1 ring-[#e5e2e6] active:opacity-70"
                      style={{ backgroundColor: tc.bg, color: tc.text }}
                    >
                      + {tag}
                    </button>
                  );
                })}
                {allTagNames.filter((t) => !editingTags.includes(t)).length === 0 && (
                  <span className="text-[12px] text-[#b0aab4]">所有标签已添加</span>
                )}
              </div>
            </div>

            <div className="flex gap-2 mb-5">
              <input
                type="text"
                placeholder="输入新标签名称"
                maxLength={10}
                className="flex-1 rounded-[12px] border border-[#e5e2e6] bg-white px-3.5 py-2 text-[13px] text-[#1f2230] placeholder:text-[#b0aab4] min-h-[40px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.currentTarget;
                    const val = input.value.trim();
                    if (val && !editingTags.includes(val)) {
                      setEditingTags([...editingTags, val]);
                      input.value = '';
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                  const val = input?.value?.trim();
                  if (val && !editingTags.includes(val)) {
                    setEditingTags([...editingTags, val]);
                    input.value = '';
                  }
                }}
                className="shrink-0 min-h-[40px] rounded-[12px] bg-[#FF5E93] px-4 text-[13px] font-semibold text-white active:bg-[#e54e82]"
              >
                添加
              </button>
            </div>

            <button
              type="button"
              disabled={savingTags}
              onClick={handleSaveTags}
              className="w-full min-h-[48px] rounded-[16px] bg-[#FF5E93] text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(255,94,147,0.25)] active:bg-[#e54e82] disabled:opacity-60"
            >
              {savingTags ? '保存中...' : '保存标签'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetailPage;
