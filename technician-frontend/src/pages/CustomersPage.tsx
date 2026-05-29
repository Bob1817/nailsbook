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

export const CustomersPage: React.FC = () => {
  const { technician } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [customers, setCustomers] = useState<TechnicianCustomerSummary[]>([]);
  const [activeTab, setActiveTab] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [avatarTagCustomerId, setAvatarTagCustomerId] = useState<number | null>(null);

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

  return (
    <div className="flex h-full flex-col bg-[#fff9f8]">
      {/* 固定头部：标题 + 搜索框 + 分类标签 */}
      <div className="shrink-0 px-5 pt-5 pb-3 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">客户</h1>
          <p className="mt-1 text-sm text-gray-400">管理客户档案、标签与服务记录</p>
        </div>

        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="搜索客户姓名或联系方式"
            className="h-11 w-full rounded-[16px] border border-[#efe6ea] bg-[#fcf8f9] pl-10 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
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
                  ? 'bg-pink-500 text-white'
                  : 'border border-[#efe6ea] bg-white text-gray-600 active:bg-[#f8edf1]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 可滚动内容：客户卡片列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6">
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
                <Card className="px-lg py-lg transition-colors active:bg-rose-50">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAvatarTagCustomerId(avatarTagCustomerId === customer.id ? null : customer.id);
                        }}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fdecef] text-sm font-semibold text-[#e86b8f] active:opacity-80"
                      >
                        {getCustomerAvatar(customer.name)}
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
                            <p className="truncate text-sm font-semibold text-gray-900">{customer.name}</p>
                            <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                          <p className="mt-1 break-all text-xs text-gray-500">{customer.phone}</p>
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

                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-[18px] bg-[#fcf7f8] p-3 min-[391px]:grid-cols-3">
                        <div className="min-w-0">
                          <p className="text-[11px] text-gray-400">最近服务</p>
                          <p className="mt-1 text-xs font-medium text-gray-700">
                            {customer.recentServiceAt ? formatDateLabel(customer.recentServiceAt) : '暂无记录'}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-gray-400">累计消费</p>
                          <p className="mt-1 text-xs font-semibold text-pink-500">{formatMoney(customer.totalSpent)}</p>
                        </div>
                        <div className="col-span-2 min-w-0 min-[391px]:col-span-1">
                          <p className="text-[11px] text-gray-400">服务次数</p>
                          <p className="mt-1 text-xs font-medium text-gray-700">{customer.totalOrders} 次</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-col gap-1 text-xs text-gray-400 min-[391px]:flex-row min-[391px]:items-center min-[391px]:justify-between min-[391px]:gap-3">
                        <span className="break-words">{customer.address}</span>
                        <span className="shrink-0">{customer.totalOrders} 次服务</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Card className="px-lg py-xl text-center text-sm text-gray-400">没有找到匹配的客户</Card>
        )}
      </div>
    </div>
  );
};
