import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/base/Card';
import { AppPage } from '../components/layout/AppPage';
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
  type TechnicianCustomerSummary,
} from '../services/technicianData';

const customerTabs = ['全部', '常客', '新客', '高频'];

function getCustomerAvatar(name: string) {
  return name.slice(0, 1).toUpperCase();
}

export const CustomersPage: React.FC = () => {
  const { technician } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [customers, setCustomers] = useState<TechnicianCustomerSummary[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<TechnicianCustomerDetail | null>(null);
  const [activeTab, setActiveTab] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      setIsLoading(true);
      try {
        const [nextCustomers, nextConversations] = await Promise.all([
          customersService.list({
            technicianId: technician?.id,
            search: searchQuery.trim() || undefined,
          }),
          messageService.getConversations().catch(() => []),
        ]);

        if (!cancelled) {
          setCustomers(nextCustomers);
          setConversations(nextConversations);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setCustomers([]);
          setConversations([]);
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

  async function handleSelectCustomer(customerId: number) {
    try {
      const detail = await customersService.getById(customerId);
      setSelectedCustomer(detail);
    } catch {
      toast.error('客户详情加载失败，请稍后重试。');
    }
  }

  function handleOpenOrders(customerId: number) {
    toast.success('正在打开该客户的订单记录。');
    navigate(`/orders?customerId=${customerId}`);
  }

  function handleCreateOrder(customerId: number) {
    toast.success('正在为该客户打开新建预约。');
    navigate(`/orders?customerId=${customerId}`);
  }

  function handleStartChat(customerId: number) {
    const existingConversation = conversations.find((conversation) => conversation.client.id === customerId);
    if (existingConversation) {
      navigate(`/chat?conversation_id=${existingConversation.id}`);
      return;
    }

    navigate(`/chat?client_id=${customerId}`);
  }

  const visibleCustomers = customers.filter((customer) => {
    if (activeTab === '全部') {
      return true;
    }
    return customer.tags.includes(activeTab);
  });

  if (selectedCustomer) {
    return (
      <AppPage
        title="客户详情"
        subtitle="查看客户资料、偏好与历史服务记录"
        actions={(
          <button
            onClick={() => setSelectedCustomer(null)}
            className="flex min-h-[44px] items-center gap-2 rounded-full border border-[#efe4e8] bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors active:bg-[#f8edf1]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回列表
          </button>
        )}
      >
        <Card className="px-lg py-lg">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#fdecef] text-lg font-semibold text-[#e86b8f]">
              {getCustomerAvatar(selectedCustomer.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 min-[391px]:flex-row min-[391px]:items-start min-[391px]:justify-between">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-gray-900">{selectedCustomer.name}</p>
                  <p className="mt-1 break-all text-sm text-gray-500">{selectedCustomer.phone}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCustomer.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-medium text-pink-500">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-[18px] bg-[#fcf7f8] p-3 min-[391px]:grid-cols-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400">累计消费</p>
                  <p className="mt-1 text-sm font-semibold text-pink-500">{formatMoney(selectedCustomer.totalSpent)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400">服务次数</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{selectedCustomer.totalOrders} 次</p>
                </div>
                <div className="col-span-2 min-w-0 min-[391px]:col-span-1">
                  <p className="text-[11px] text-gray-400">最近到店</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {selectedCustomer.recentServiceAt ? formatDateLabel(selectedCustomer.recentServiceAt) : '暂无记录'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="px-lg py-lg">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">基础信息</h2>
            <p className="mt-1 text-xs text-gray-400">客户资料与最近沟通备注</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex flex-col gap-2 min-[391px]:flex-row min-[391px]:items-start min-[391px]:justify-between">
              <span className="shrink-0 text-gray-500">地址</span>
              <div className="flex min-w-0 flex-col items-start gap-2 min-[391px]:items-end">
                <span className="w-full break-words text-left text-gray-900 min-[391px]:text-right">{selectedCustomer.address}</span>
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
                {selectedCustomer.note}
              </span>
            </div>
          </div>
        </Card>

        <Card className="px-lg py-lg">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">偏好信息</h2>
            <p className="mt-1 text-xs text-gray-400">风格、颜色与风险提醒</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex flex-col gap-2 min-[391px]:flex-row min-[391px]:items-start min-[391px]:justify-between">
              <span className="shrink-0 text-gray-500">喜好款式</span>
              <span className="min-w-0 break-words text-left text-gray-900 min-[391px]:max-w-[70%] min-[391px]:text-right">
                {selectedCustomer.preferenceStyle}
              </span>
            </div>
            <div className="flex flex-col gap-2 min-[391px]:flex-row min-[391px]:items-start min-[391px]:justify-between">
              <span className="shrink-0 text-gray-500">颜色偏好</span>
              <span className="min-w-0 break-words text-left text-gray-900 min-[391px]:max-w-[70%] min-[391px]:text-right">
                {selectedCustomer.preferenceColor}
              </span>
            </div>
            <div className="flex flex-col gap-2 min-[391px]:flex-row min-[391px]:items-start min-[391px]:justify-between">
              <span className="shrink-0 text-gray-500">过敏信息</span>
              <span className="min-w-0 break-words text-left text-red-500 min-[391px]:max-w-[70%] min-[391px]:text-right">
                {selectedCustomer.allergyNote}
              </span>
            </div>
          </div>
        </Card>

        <Card className="px-lg py-lg">
          <div className="mb-3 flex flex-col gap-3 min-[391px]:flex-row min-[391px]:items-center min-[391px]:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">历史记录</h2>
              <p className="mt-1 text-xs text-gray-400">按时间查看服务、状态与金额</p>
            </div>
            <button
              onClick={() => handleOpenOrders(selectedCustomer.id)}
              className="min-h-[44px] rounded-full border border-[#ebe3e6] bg-white px-4 py-2 text-xs font-medium text-gray-600 transition-colors active:bg-[#f7f2f4]"
            >
              查看订单
            </button>
          </div>
          <div className="space-y-3">
            {selectedCustomer.history.length > 0 ? (
              selectedCustomer.history.map((item) => (
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
        </Card>

        <div className="grid grid-cols-1 gap-3 pb-2">
          <button
            onClick={() => handleCreateOrder(selectedCustomer.id)}
            className="min-h-[48px] w-full rounded-[18px] bg-pink-500 px-4 py-3 text-sm font-medium text-white shadow-[0_8px_18px_rgba(236,72,153,0.16)] transition-colors active:bg-pink-600"
          >
            为该客户新建预约
          </button>

          <button
            onClick={() => handleStartChat(selectedCustomer.id)}
            className="min-h-[48px] w-full rounded-[18px] border border-pink-200 bg-white px-4 py-3 text-sm font-medium text-pink-500 transition-colors active:bg-pink-50"
          >
            发起对话
          </button>
        </div>
      </AppPage>
    );
  }

  return (
    <AppPage title="客户" subtitle="查看客户资料、偏好与近期服务状态">
      <Card className="px-lg py-lg">
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

        <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide">
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
      </Card>

      {isLoading ? (
        <Card className="px-lg py-xl text-center text-sm text-gray-400">客户加载中...</Card>
      ) : visibleCustomers.length > 0 ? (
        <div className="space-y-3">
          {visibleCustomers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => void handleSelectCustomer(customer.id)}
              className="w-full text-left"
            >
              <Card className="px-lg py-lg transition-colors active:bg-rose-50">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fdecef] text-sm font-semibold text-[#e86b8f]">
                    {getCustomerAvatar(customer.name)}
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
                        {customer.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-medium text-pink-500">
                            {tag}
                          </span>
                        ))}
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
            </button>
          ))}
        </div>
      ) : (
        <Card className="px-lg py-xl text-center text-sm text-gray-400">没有找到匹配的客户</Card>
      )}
    </AppPage>
  );
};
