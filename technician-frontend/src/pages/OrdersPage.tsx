import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { ordersService } from '../services/orders';
import { customersService } from '../services/customers';
import { ActionConfirmDialog } from '../components/ActionConfirmDialog';
import {
  orderStatusClasses,
  orderStatusLabels,
  detectOrderConflict,
  formatClock,
  formatDateLabel,
  formatMoney,
  formatTimeRange,
  type OrderStatus,
  type TechnicianOrder,
  type TechnicianCustomerSummary,
} from '../services/technicianData';
import { ListItemSkeleton } from '../components/Skeleton';

const orderTabs: Array<{ label: string; value: 'all' | OrderStatus }> = [
  { label: '全部', value: 'all' },
  { label: '待报价', value: 'pending_quote' },
  { label: '待用户确认', value: 'pending_agree' },
  { label: '待我确认', value: 'pending_confirm' },
  { label: '待上门', value: 'pending_home' },
  { label: '待到店', value: 'pending_shop' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
];

function buildEndTime(date: string, startTime: string, durationMinutes: number) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const start = new Date(`${date}T${startTime}:00`);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(start.getTime())) {
    return '';
  }

  const end = new Date(start.getTime() + durationMinutes * 60000);
  return end.toISOString();
}

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { technician } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<TechnicianOrder[]>([]);
  const [customers, setCustomers] = useState<TechnicianCustomerSummary[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | OrderStatus>('all');
  const [selectedOrder, setSelectedOrder] = useState<TechnicianOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [startClock, setStartClock] = useState('14:00');
  const [durationMinutes, setDurationMinutes] = useState('90');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showReviewSheet, setShowReviewSheet] = useState(false);
  const [reviewDate, setReviewDate] = useState('');
  const [reviewStartClock, setReviewStartClock] = useState('14:00');
  const [reviewDurationMinutes, setReviewDurationMinutes] = useState('90');
  const [reviewPrice, setReviewPrice] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const toast = useToast();

  async function reloadPageData(preferredOrderId?: number) {
    const [nextOrders, nextCustomers] = await Promise.all([
      ordersService.list({ technicianId: technician?.id }),
      customersService.list({ technicianId: technician?.id }),
    ]);

    setOrders(nextOrders);
    setCustomers(nextCustomers);
    if (preferredOrderId) {
      const matched = nextOrders.find((order) => order.id === preferredOrderId) ?? null;
      setSelectedOrder(matched);
      if (matched) setShowDetailSheet(true);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPageData() {
      setIsLoading(true);
      const [nextOrders, nextCustomers] = await Promise.all([
        ordersService.list({ technicianId: technician?.id }),
        customersService.list({ technicianId: technician?.id }),
      ]);

      if (!cancelled) {
        setOrders(nextOrders);
        setCustomers(nextCustomers);
        setSelectedOrder((current) =>
          current ? nextOrders.find((order) => order.id === current.id) ?? current : null
        );
        setIsLoading(false);
      }
    }

    void loadPageData();
    return () => {
      cancelled = true;
    };
  }, [technician?.id]);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    if (customerId) {
      setSelectedCustomerId(customerId);
      setShowCreateSheet(true);
    }
    if (orderId) {
      const matchedOrder = orders.find((order) => String(order.id) === orderId);
      if (matchedOrder) {
        setSelectedOrder(matchedOrder);
        setShowDetailSheet(true);
      }
    }
    if (status && orderTabs.some((t) => t.value === status)) {
      setActiveTab(status as 'all' | OrderStatus);
    }
  }, [orders, searchParams]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => String(customer.id) === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  useEffect(() => {
    if (!selectedCustomer) {
      return;
    }

    setAddress((current) => current || selectedCustomer.address);
  }, [selectedCustomer]);

  const visibleOrders = orders.filter((order) => activeTab === 'all' || order.status === activeTab);

  async function handleCreateDraft() {
    setFormError('');

    if (!selectedCustomer || !serviceName || !orderDate || !startClock || !address || !price) {
      setFormError('请填写客户、服务内容、时间、地址和价格');
      return;
    }

    const nextDurationMinutes = Number(durationMinutes);
    const nextPrice = Number(price);
    const startTime = new Date(`${orderDate}T${startClock}:00`).toISOString();
    const endTime = buildEndTime(orderDate, startClock, nextDurationMinutes);

    if (!endTime || Number.isNaN(nextDurationMinutes) || nextDurationMinutes <= 0 || Number.isNaN(nextPrice)) {
      setFormError('请检查服务时长和价格');
      return;
    }

    if (detectOrderConflict(startTime, endTime, orders)) {
      setFormError('该时间段已有预约，请调整开始时间或服务时长');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdOrder = await ordersService.createDraft({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        serviceName,
        address,
        startTime,
        endTime,
        price: nextPrice,
        note,
      });
      await reloadPageData(createdOrder.id);
      setShowCreateSheet(false);
      setSelectedCustomerId('');
      // 清掉 URL 里的 customerId 参数，避免再次进入页面时自动弹出新建预约
      if (searchParams.has('customerId')) {
        setSearchParams({}, { replace: true });
      }
      setServiceName('');
      setOrderDate('');
      setStartClock('14:00');
      setDurationMinutes('90');
      setAddress('');
      setPrice('');
      setNote('');
      if (createdOrder.isLocalDraft) {
        toast.warning('后端暂不可用，已先保存为本地草稿，稍后可继续同步。');
      } else {
        toast.success('预约创建成功，已同步到预约、行程和客户记录。');
      }
      searchParams.delete('customerId');
      setSearchParams(searchParams);
    } catch {
      setFormError('创建预约失败，请稍后重试');
      toast.error('创建预约失败，请检查网络或稍后再试。');
    } finally {
      setIsSubmitting(false);
    }
  }

  // 待确认的状态变更（弹窗后再执行）
  const [pendingStatusChange, setPendingStatusChange] = useState<OrderStatus | null>(null);

  function requestStatusChange(nextStatus: OrderStatus) {
    setPendingStatusChange(nextStatus);
  }

  async function handleStatusChange(nextStatus: OrderStatus) {
    if (!selectedOrder) {
      return;
    }

    setIsUpdatingStatus(true);
    try {
      if (nextStatus === 'cancelled') {
        await ordersService.cancel(selectedOrder.id);
      } else if (nextStatus === 'pending_confirm') {
        await ordersService.agree(selectedOrder.id);
      } else if (nextStatus === 'pending_home' || nextStatus === 'pending_shop') {
        await ordersService.confirm(selectedOrder.id, { depositConfirmed: true });
      } else if (nextStatus === 'completed') {
        await ordersService.complete(selectedOrder.id);
      }
      await reloadPageData(selectedOrder.id);
      if (nextStatus === 'completed' || nextStatus === 'cancelled') {
        setShowDetailSheet(false);
      }
      toast.success(
        nextStatus === 'pending_confirm'
          ? '已同意报价，等待客户确认。'
          : nextStatus === 'pending_home' || nextStatus === 'pending_shop'
            ? '预约已确认，行程和消息提醒已更新。'
            : nextStatus === 'completed'
              ? '服务已完成，预约状态已更新。'
              : '预约已取消，相关提醒已同步更新。'
      );

      // 确认预约后跳转到行程页，并定位到该预约当天
      if (nextStatus === 'pending_home' || nextStatus === 'pending_shop') {
        setShowDetailSheet(false);
        const orderDate = new Date(selectedOrder.startTime);
        const y = orderDate.getFullYear();
        const m = String(orderDate.getMonth() + 1).padStart(2, '0');
        const d = String(orderDate.getDate()).padStart(2, '0');
        navigate(`/schedule?date=${y}-${m}-${d}`);
      }
    } catch {
      toast.error('状态更新失败，请稍后重试。');
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function openReviewSheet() {
    if (!selectedOrder) {
      return;
    }

    const start = new Date(selectedOrder.startTime);
    const duration = Math.max(30, Math.round((new Date(selectedOrder.endTime).getTime() - start.getTime()) / 60000) || 90);
    setReviewDate(start.toISOString().slice(0, 10));
    setReviewStartClock(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`);
    setReviewDurationMinutes(String(duration));
    setReviewPrice(String(Math.round(selectedOrder.price || 0)));
    setReviewError('');
    setShowReviewSheet(true);
  }

  // 是否在显示报价二次确认弹窗
  const [showReviewConfirm, setShowReviewConfirm] = useState(false);

  function requestReviewSubmit() {
    if (!selectedOrder) return;
    const duration = Number(reviewDurationMinutes);
    const nextPrice = Number(reviewPrice);
    if (!reviewDate || !reviewStartClock || Number.isNaN(duration) || duration <= 0 || Number.isNaN(nextPrice) || nextPrice < 0) {
      setReviewError('请填写有效的预约日期、时间、预估时长和费用');
      return;
    }
    setReviewError('');
    setShowReviewConfirm(true);
  }

  async function handleReviewOrder() {
    if (!selectedOrder) {
      return;
    }

    const duration = Number(reviewDurationMinutes);
    const nextPrice = Number(reviewPrice);

    setIsReviewing(true);
    setReviewError('');
    try {
      const reviewed = await ordersService.review(selectedOrder.id, {
        serviceDate: reviewDate,
        startTime: reviewStartClock,
        durationMinutes: duration,
        price: nextPrice,
      });
      await reloadPageData(reviewed.id);
      setShowReviewConfirm(false);
      setShowReviewSheet(false);
      toast.success('报价已发送，等待客户确认。');
    } catch (error: any) {
      setReviewError(error?.response?.data?.message || '核实预约失败，请稍后重试');
    } finally {
      setIsReviewing(false);
    }
  }

  const allowedActions = selectedOrder ? ordersService.getAllowedActions(selectedOrder.status) : [];

  return (
    <div className="flex h-[100dvh] flex-col bg-gray-50">
      {/* Fixed header + tabs */}
      <div className="shrink-0">
        <div className="flex items-center justify-between bg-white/95 px-5 py-3.5 backdrop-blur border-b border-[#f2e6ec]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f3f5] transition-colors active:bg-[#eee5e9]"
            >
              <svg className="h-5 w-5 text-[#3c3440]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-[17px] font-semibold text-[#1f2230]">预约</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateSheet(true)}
            className="shrink-0 whitespace-nowrap rounded-full bg-[#FF5A66] px-4 py-2 text-[13px] font-semibold text-white min-h-[36px] active:scale-[0.97]"
          >
            新建预约
          </button>
        </div>

        <div className="bg-white px-5 py-3 border-b border-gray-100">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {orderTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium min-h-[44px] ${
                  activeTab === tab.value ? 'bg-[#FF5A66] text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable order list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 pb-28">
        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : visibleOrders.length > 0 ? (
          visibleOrders.map((order) => (
            <button
              key={order.id}
              onClick={() => { setSelectedOrder(order); setShowDetailSheet(true); }}
              className="w-full rounded-2xl bg-white p-4 text-left shadow-sm transition min-h-[44px]"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{order.customerName}</p>
                    {order.isLocalDraft ? (
                      <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] text-orange-500">本地草稿</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{order.orderNo}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${orderStatusClasses[order.status]}`}>
                  {orderStatusLabels[order.status]}
                </span>
              </div>
              <div className="space-y-1.5 text-sm text-gray-600">
                <p>{order.serviceName}</p>
                <p>{formatDateLabel(order.startTime)} · {formatClock(order.startTime)} - {formatClock(order.endTime)}</p>
                <p className="truncate">{order.address}</p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-400">{order.depositPaid ? '已确认定金' : '待确认定金'}</span>
                <span className="text-base font-bold text-pink-500">{formatMoney(order.price)}</span>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">当前筛选下暂无预约</div>
        )}
      </div>

      {showDetailSheet && selectedOrder ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowDetailSheet(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-[28px] bg-white px-5 pb-8 pt-5 shadow-[0_-12px_40px_rgba(0,0,0,0.12)] max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[17px] font-semibold text-[#1f2230]">预约详情</h3>
              <button
                type="button"
                onClick={() => setShowDetailSheet(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2f0f3] active:bg-[#e5e2e6]"
              >
                <svg className="h-4 w-4 text-[#6d6570]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[16px] font-bold text-gray-900">{selectedOrder.customerName}</p>
                  {selectedOrder.isLocalDraft ? (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] text-orange-500">待同步</span>
                  ) : null}
                </div>
                <p className="mt-1 text-[13px] text-gray-500">{selectedOrder.customerPhone || '未填写联系电话'}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[12px] font-medium ${orderStatusClasses[selectedOrder.status]}`}>
                {orderStatusLabels[selectedOrder.status]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="rounded-2xl bg-[#ffe9f0] p-3">
                <p className="text-[12px] text-gray-500">预约时间</p>
                <p className="mt-1 text-[14px] font-medium text-gray-900">{formatTimeRange(selectedOrder.startTime, selectedOrder.endTime)}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-3">
                <p className="text-[12px] text-gray-500">预约金额</p>
                <p className="mt-1 text-[14px] font-medium text-pink-500">{formatMoney(selectedOrder.price)}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700 mb-4">
              <p className="font-medium text-gray-900">服务信息</p>
              <p className="mt-2">{selectedOrder.serviceName}</p>
              <p className="mt-2">{selectedOrder.address}</p>
              {selectedOrder.note ? <p className="mt-2 text-gray-500">备注：{selectedOrder.note}</p> : null}
            </div>

            {!selectedOrder.isLocalDraft && (allowedActions.length > 0 || ['pending_agree', 'pending_home', 'pending_shop'].includes(selectedOrder.status)) ? (
              <div className="grid grid-cols-2 gap-3">
                {allowedActions.includes('pending_agree') ? (
                  <button
                    onClick={openReviewSheet}
                    disabled={isUpdatingStatus || isReviewing}
                    className="min-h-[44px] rounded-2xl bg-[#FF5A66] px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
                  >
                    提交报价
                  </button>
                ) : null}
                {selectedOrder.status === 'pending_agree' ? (
                  <button
                    disabled
                    className="min-h-[44px] rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-400 cursor-not-allowed"
                  >
                    待用户确认
                  </button>
                ) : null}
                {selectedOrder.status === 'pending_home' || selectedOrder.status === 'pending_shop' ? (
                  <button
                    disabled
                    className="min-h-[44px] rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-400 cursor-not-allowed"
                  >
                    {selectedOrder.status === 'pending_home' ? '待上门' : '待到店'}
                  </button>
                ) : null}
                {allowedActions.includes('pending_confirm') ? (
                  <button
                    onClick={() => requestStatusChange('pending_confirm')}
                    disabled={isUpdatingStatus}
                    className="min-h-[44px] rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {isUpdatingStatus ? '处理中...' : '确认预约'}
                  </button>
                ) : null}
                {(allowedActions.includes('pending_home') || allowedActions.includes('pending_shop')) ? (
                  <button
                    onClick={() => {
                      const nextStatus: OrderStatus = selectedOrder.serviceType === 'home' ? 'pending_home' : 'pending_shop';
                      requestStatusChange(nextStatus);
                    }}
                    disabled={isUpdatingStatus}
                    className="min-h-[44px] rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {isUpdatingStatus ? '处理中...' : '确认预约'}
                  </button>
                ) : null}
                {allowedActions.includes('completed') ? (
                  <button
                    onClick={() => requestStatusChange('completed')}
                    disabled={isUpdatingStatus}
                    className="min-h-[44px] rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {isUpdatingStatus ? '处理中...' : '确认完成'}
                  </button>
                ) : null}
                {allowedActions.includes('cancelled') ? (
                  <button
                    onClick={() => requestStatusChange('cancelled')}
                    disabled={isUpdatingStatus}
                    className={`min-h-[44px] rounded-2xl border border-red-100 px-4 py-3 text-sm font-medium text-red-500 disabled:opacity-60 ${
                      allowedActions.length === 1 ? 'col-span-2' : ''
                    }`}
                  >
                    {isUpdatingStatus ? '处理中...' : '取消预约'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showReviewSheet && selectedOrder ? (
        <div className="fixed inset-0 z-[110] bg-black/30">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white px-5 pb-8 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">核实预约</h2>
                <p className="text-xs text-gray-400">修改预约时间、费用和预估用时后，客户会收到确认提醒</p>
              </div>
              <button
                onClick={() => setShowReviewSheet(false)}
                className="rounded-full bg-gray-100 px-3 py-2 text-sm text-gray-600 min-h-[44px]"
              >
                关闭
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={reviewDate}
                  onChange={(event) => setReviewDate(event.target.value)}
                  className="h-12 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
                />
                <input
                  type="time"
                  value={reviewStartClock}
                  onChange={(event) => setReviewStartClock(event.target.value)}
                  className="h-12 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={reviewDurationMinutes}
                  onChange={(event) => setReviewDurationMinutes(event.target.value.replace(/\D/g, ''))}
                  placeholder="预估用时(分钟)"
                  className="h-12 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
                />
                <input
                  value={reviewPrice}
                  onChange={(event) => setReviewPrice(event.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="美甲费用"
                  className="h-12 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
                />
              </div>
              {reviewError ? <p className="text-sm text-red-500">{reviewError}</p> : null}
              <button
                onClick={requestReviewSubmit}
                disabled={isReviewing}
                className="w-full rounded-xl bg-[#FF5A66] py-3 text-sm font-medium text-white min-h-[48px] disabled:opacity-60"
              >
                {isReviewing ? '提交中...' : '提交核实结果'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCreateSheet ? (
        <div className="fixed inset-0 z-[100] bg-black/30">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white px-5 pb-8 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">新建预约</h2>
                <p className="text-xs text-gray-400">创建后会直接写入系统并同步到行程、首页和客户记录</p>
              </div>
              <button
                onClick={() => {
                  setShowCreateSheet(false);
                  searchParams.delete('customerId');
                  setSearchParams(searchParams);
                }}
                className="rounded-full bg-gray-100 px-3 py-2 text-sm text-gray-600 min-h-[44px]"
              >
                关闭
              </button>
            </div>

            <div className="space-y-3">
              <select
                value={selectedCustomerId}
                onChange={(event) => setSelectedCustomerId(event.target.value)}
                className="h-12 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
              >
                <option value="">选择客户</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>

              <input
                value={serviceName}
                onChange={(event) => setServiceName(event.target.value)}
                placeholder="服务内容"
                className="h-12 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={orderDate}
                  onChange={(event) => setOrderDate(event.target.value)}
                  className="h-12 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
                />
                <input
                  type="time"
                  value={startClock}
                  onChange={(event) => setStartClock(event.target.value)}
                  className="h-12 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value.replace(/\D/g, ''))}
                  placeholder="服务时长(分钟)"
                  className="h-12 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
                />
                <input
                  value={price}
                  onChange={(event) => setPrice(event.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="价格"
                  className="h-12 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
                />
              </div>

              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="服务地址"
                className="h-12 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
              />

              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="备注（可选）"
                className="min-h-[96px] w-full rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
              />

              {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

              <button
                onClick={() => void handleCreateDraft()}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#FF5A66] py-3 text-sm font-medium text-white min-h-[48px] disabled:opacity-60"
              >
                {isSubmitting ? '创建中...' : '创建预约'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 操作确认弹窗 */}
      <ActionConfirmDialog
        open={!!pendingStatusChange && !!selectedOrder}
        title={
          pendingStatusChange === 'pending_confirm'
            ? '同意客户报价？'
            : pendingStatusChange === 'pending_home' || pendingStatusChange === 'pending_shop'
              ? '确认该预约？'
              : pendingStatusChange === 'completed'
                ? '确认服务已完成？'
                : pendingStatusChange === 'cancelled'
                  ? '取消该预约？'
                  : '确认操作？'
        }
        description={
          pendingStatusChange === 'pending_confirm'
            ? '同意后客户将收到通知，请在客户确认前不要修改报价。'
            : pendingStatusChange === 'pending_home' || pendingStatusChange === 'pending_shop'
              ? '确认后预约将进入行程列表，开始时间前 1 小时与前一天 20:00 会自动提醒。'
              : pendingStatusChange === 'completed'
                ? '完成后将自动生成收入流水，无法撤销。'
                : pendingStatusChange === 'cancelled'
                  ? '取消后将通知客户，预约状态变更为已取消且无法恢复。'
                  : undefined
        }
        price={
          (pendingStatusChange === 'pending_home' ||
            pendingStatusChange === 'pending_shop' ||
            pendingStatusChange === 'pending_confirm') &&
          selectedOrder?.price
            ? selectedOrder.price
            : null
        }
        details={
          selectedOrder
            ? [
                { label: '客户', value: selectedOrder.customerName },
                {
                  label: '时间',
                  value: `${formatDateLabel(selectedOrder.startTime)} ${formatTimeRange(selectedOrder.startTime, selectedOrder.endTime)}`,
                },
                {
                  label: '类型',
                  value: selectedOrder.serviceType === 'home' ? '上门美甲' : '到店美甲',
                },
              ]
            : []
        }
        variant={pendingStatusChange === 'cancelled' ? 'danger' : 'primary'}
        confirmText={
          pendingStatusChange === 'cancelled' ? '取消预约' : '确认'
        }
        loading={isUpdatingStatus}
        onConfirm={async () => {
          if (!pendingStatusChange) return;
          await handleStatusChange(pendingStatusChange);
          setPendingStatusChange(null);
        }}
        onCancel={() => setPendingStatusChange(null)}
      />

      {/* 报价提交二次确认（核心：突出价格）*/}
      <ActionConfirmDialog
        open={showReviewConfirm}
        title="确认提交报价？"
        description="客户将收到该报价金额并自行决定是否同意。提交后无法直接修改，如需调整请取消预约后重建。"
        price={reviewPrice ? Number(reviewPrice) : null}
        details={selectedOrder ? [
          { label: '客户', value: selectedOrder.customerName },
          { label: '日期', value: reviewDate },
          { label: '开始时间', value: reviewStartClock },
          { label: '时长', value: `${reviewDurationMinutes} 分钟` },
        ] : []}
        confirmText="确认报价并发送"
        loading={isReviewing}
        onConfirm={() => void handleReviewOrder()}
        onCancel={() => setShowReviewConfirm(false)}
      />
    </div>
  );
};
