import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { ordersService } from '../services/orders';
import { customersService } from '../services/customers';
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

const orderTabs: Array<{ label: string; value: 'all' | OrderStatus }> = [
  { label: '全部', value: 'all' },
  { label: '待报价', value: 'pending_quote' },
  { label: '待同意', value: 'pending_agree' },
  { label: '待确认', value: 'pending_confirm' },
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
    setSelectedOrder(
      preferredOrderId
        ? nextOrders.find((order) => order.id === preferredOrderId) ?? nextOrders[0] ?? null
        : nextOrders[0] ?? null
    );
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
          current ? nextOrders.find((order) => order.id === current.id) ?? current : nextOrders[0] ?? null
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
    if (customerId) {
      setSelectedCustomerId(customerId);
      setShowCreateSheet(true);
    }
    if (orderId) {
      const matchedOrder = orders.find((order) => String(order.id) === orderId);
      if (matchedOrder) {
        setSelectedOrder(matchedOrder);
      }
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
        toast.success('预约创建成功，已同步到订单、行程和客户记录。');
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
        await ordersService.confirm(selectedOrder.id);
      } else if (nextStatus === 'completed') {
        await ordersService.complete(selectedOrder.id);
      }
      await reloadPageData(selectedOrder.id);
      toast.success(
        nextStatus === 'pending_confirm'
          ? '已同意报价，等待客户确认。'
          : nextStatus === 'pending_home' || nextStatus === 'pending_shop'
            ? '订单已确认，行程和消息提醒已更新。'
            : nextStatus === 'completed'
              ? '服务已完成，订单状态已更新。'
              : '订单已取消，相关提醒已同步更新。'
      );
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

  async function handleReviewOrder() {
    if (!selectedOrder) {
      return;
    }

    const duration = Number(reviewDurationMinutes);
    const nextPrice = Number(reviewPrice);

    if (!reviewDate || !reviewStartClock || Number.isNaN(duration) || duration <= 0 || Number.isNaN(nextPrice) || nextPrice < 0) {
      setReviewError('请填写有效的预约日期、时间、预估时长和费用');
      return;
    }

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
      setShowReviewSheet(false);
      toast.success('预约信息已核实，已通知客户确认时间与费用。');
    } catch (error: any) {
      setReviewError(error?.response?.data?.message || '核实预约失败，请稍后重试');
    } finally {
      setIsReviewing(false);
    }
  }

  const allowedActions = selectedOrder ? ordersService.getAllowedActions(selectedOrder.status) : [];

  return (
    <div className="min-h-full bg-gray-50 pb-28">
      <div className="bg-white px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">订单</h1>
              <p className="text-sm text-gray-500">查看预约进度、客户信息和服务安排</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateSheet(true)}
            className="rounded-full bg-[#FF5A66] px-4 py-2 text-sm font-medium text-white min-h-[44px]"
          >
            新建订单
          </button>
        </div>
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

      <div className="px-5 py-4 space-y-3">
        {isLoading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">订单加载中...</div>
        ) : visibleOrders.length > 0 ? (
          visibleOrders.map((order) => (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className={`w-full rounded-2xl bg-white p-4 text-left shadow-sm transition min-h-[44px] ${
                selectedOrder?.id === order.id ? 'ring-2 ring-pink-200' : ''
              }`}
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
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">当前筛选下暂无订单</div>
        )}
      </div>

      {selectedOrder ? (
        <div className="mx-5 mb-4 rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-gray-900">{selectedOrder.customerName}</p>
                {selectedOrder.isLocalDraft ? (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] text-orange-500">待同步</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-gray-500">{selectedOrder.customerPhone || '未填写联系电话'}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${orderStatusClasses[selectedOrder.status]}`}>
              {orderStatusLabels[selectedOrder.status]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-[#ffe9f0] p-3">
              <p className="text-gray-500">预约时间</p>
              <p className="mt-1 font-medium text-gray-900">{formatTimeRange(selectedOrder.startTime, selectedOrder.endTime)}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3">
              <p className="text-gray-500">订单金额</p>
              <p className="mt-1 font-medium text-pink-500">{formatMoney(selectedOrder.price)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
            <p className="font-medium text-gray-900">服务信息</p>
            <p className="mt-2">{selectedOrder.serviceName}</p>
            <p className="mt-2">{selectedOrder.address}</p>
            {selectedOrder.note ? <p className="mt-2 text-gray-500">备注：{selectedOrder.note}</p> : null}
          </div>

          {!selectedOrder.isLocalDraft && allowedActions.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {allowedActions.includes('pending_agree') ? (
                <button
                  onClick={openReviewSheet}
                  disabled={isUpdatingStatus || isReviewing}
                  className="min-h-[44px] rounded-2xl bg-[#FF5A66] px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  提交报价
                </button>
              ) : null}
              {allowedActions.includes('pending_confirm') ? (
                <button
                  onClick={() => void handleStatusChange('pending_confirm')}
                  disabled={isUpdatingStatus}
                  className="min-h-[44px] rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isUpdatingStatus ? '处理中...' : '确认订单'}
                </button>
              ) : null}
              {(allowedActions.includes('pending_home') || allowedActions.includes('pending_shop')) ? (
                <button
                  onClick={() => {
                    const nextStatus: OrderStatus = selectedOrder.serviceType === 'home' ? 'pending_home' : 'pending_shop';
                    void handleStatusChange(nextStatus);
                  }}
                  disabled={isUpdatingStatus}
                  className="min-h-[44px] rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isUpdatingStatus ? '处理中...' : '确认订单'}
                </button>
              ) : null}
              {allowedActions.includes('completed') ? (
                <button
                  onClick={() => void handleStatusChange('completed')}
                  disabled={isUpdatingStatus}
                  className="min-h-[44px] rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isUpdatingStatus ? '处理中...' : '确认完成'}
                </button>
              ) : null}
              {allowedActions.includes('cancelled') ? (
                <button
                  onClick={() => void handleStatusChange('cancelled')}
                  disabled={isUpdatingStatus}
                  className={`min-h-[44px] rounded-2xl border border-red-100 px-4 py-3 text-sm font-medium text-red-500 disabled:opacity-60 ${
                    allowedActions.length === 1 ? 'col-span-2' : ''
                  }`}
                >
                  {isUpdatingStatus ? '处理中...' : '取消订单'}
                </button>
              ) : null}
            </div>
          ) : null}
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
                onClick={() => void handleReviewOrder()}
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
                <h2 className="text-lg font-bold text-gray-900">新建订单</h2>
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
    </div>
  );
};
