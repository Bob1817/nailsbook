import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { Button } from '../components/base/Button';
import { ordersService } from '../services/orders';
import { customersService } from '../services/customers';
import { messageService } from '../services/message';
import {
  orderStatusLabels,
  orderStatusClasses,
  formatDateLabel,
  formatMoney,
  formatTimeRange,
  getDurationMinutes,
  type OrderStatus,
  type TechnicianOrder,
} from '../services/technicianData';
import type { TechnicianCustomerSummary } from '../services/technicianData';

const serviceTypeLabels: Record<string, string> = {
  home: '上门美甲',
  shop: '到店美甲',
};

const OrderDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { technician } = useAuth();
  const toast = useToast();

  const [order, setOrder] = useState<TechnicianOrder | null>(null);
  const [customer, setCustomer] = useState<TechnicianCustomerSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 编辑表单状态
  const [editForm, setEditForm] = useState({
    serviceType: 'home' as 'home' | 'shop',
    shopId: '',
    startTime: '',
    endTime: '',
    basePrice: 0,
    homeServiceFee: 0,
    nightFee: 0,
    holidayFee: 0,
    otherFees: 0,
    note: '',
  });

  // 加载订单详情
  useEffect(() => {
    if (!id) return;

    const loadOrder = async () => {
      setIsLoading(true);
      try {
        const orderData = await ordersService.getById(Number(id));
        if (orderData) {
          setOrder(orderData);
          // 加载客户信息
          const customers = await customersService.list({ technicianId: technician?.id });
          const matchedCustomer = customers.find(c => c.id === orderData.customerId);
          if (matchedCustomer) {
            setCustomer(matchedCustomer);
          }
          // 初始化编辑表单
          setEditForm({
            serviceType: orderData.serviceType || 'home',
            shopId: orderData.shopId?.toString() || '',
            startTime: orderData.startTime,
            endTime: orderData.endTime,
            basePrice: orderData.priceBreakdown?.basePrice || orderData.price,
            homeServiceFee: orderData.priceBreakdown?.homeServiceFee || 0,
            nightFee: orderData.priceBreakdown?.nightFee || 0,
            holidayFee: orderData.priceBreakdown?.holidayFee || 0,
            otherFees: orderData.priceBreakdown?.otherFees || 0,
            note: orderData.note || '',
          });
        } else {
          toast.error('订单不存在');
          navigate(-1);
        }
      } catch {
        toast.error('加载订单详情失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrder();
  }, [id, technician?.id, navigate, toast]);

  // 计算总价
  const totalPrice = editForm.basePrice + editForm.homeServiceFee + editForm.nightFee + editForm.holidayFee + editForm.otherFees;

  // 处理状态变更
  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;

    setIsSubmitting(true);
    try {
      if (newStatus === 'cancelled') {
        await ordersService.cancel(order.id);
      } else if (newStatus === 'pending_agree') {
        const dateStr = new Date(order.startTime).toISOString().slice(0, 10);
        const timeStr = new Date(order.startTime).toTimeString().slice(0, 5);
        const duration = getDurationMinutes(order.startTime, order.endTime);
        await ordersService.submitQuote(order.id, {
          serviceDate: dateStr,
          startTime: timeStr,
          durationMinutes: duration || 90,
          price: totalPrice,
        });
      } else if (newStatus === 'pending_confirm') {
        await ordersService.agree(order.id);
      } else if (newStatus === 'pending_home' || newStatus === 'pending_shop') {
        await ordersService.confirm(order.id, { depositConfirmed: true });
      } else if (newStatus === 'completed') {
        await ordersService.complete(order.id);
      }

      // 发送消息通知客户
      const statusMessages: Record<string, string> = {
        pending_agree: '待同意',
        pending_confirm: '待确认',
        pending_home: '待上门',
        pending_shop: '待到店',
        completed: '已完成',
        cancelled: '已取消',
      };

      await messageService.sendMessage({
        clientId: order.customerId,
        messageType: 'system',
        content: `【订单状态更新】您的订单(${order.orderNo})状态已更新为：${statusMessages[newStatus] || newStatus}`,
      });

      toast.success('状态更新成功，已通知客户');

      // 刷新数据
      const updatedOrder = await ordersService.getById(order.id);
      if (updatedOrder) {
        setOrder(updatedOrder);
      }

      // 确认订单后跳转到行程页并定位到订单当天
      if (newStatus === 'pending_home' || newStatus === 'pending_shop') {
        const orderDate = new Date(order.startTime);
        const y = orderDate.getFullYear();
        const m = String(orderDate.getMonth() + 1).padStart(2, '0');
        const d = String(orderDate.getDate()).padStart(2, '0');
        navigate(`/schedule?date=${y}-${m}-${d}`);
      }
    } catch {
      toast.error('状态更新失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!order) return;

    setIsSubmitting(true);
    try {
      // 构建更新数据
      const updateData = {
        serviceType: editForm.serviceType,
        shopId: editForm.shopId ? Number(editForm.shopId) : undefined,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        price: totalPrice,
        priceBreakdown: {
          basePrice: editForm.basePrice,
          homeServiceFee: editForm.homeServiceFee,
          nightFee: editForm.nightFee,
          holidayFee: editForm.holidayFee,
          otherFees: editForm.otherFees,
        },
        note: editForm.note,
      };

      // 调用更新API
      await ordersService.update(order.id, updateData);

      // 发送消息通知客户
      await messageService.sendMessage({
        clientId: order.customerId,
        messageType: 'system',
        content: `【订单信息更新】您的预约(${order.orderNo})信息已更新，请查看最新详情。`,
      });

      toast.success('订单信息已更新，已通知客户');
      setIsEditing(false);

      // 刷新数据
      const updatedOrder = await ordersService.getById(order.id);
      if (updatedOrder) {
        setOrder(updatedOrder);
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取可操作的状态列表
  const getAllowedActions = (status: OrderStatus): OrderStatus[] => {
    return ordersService.getAllowedActions(status);
  };

  if (isLoading) {
    return (
      <div className="min-h-full bg-[#fff9f8] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-full bg-[#fff9f8] flex items-center justify-center">
        <p className="text-gray-500">订单不存在</p>
      </div>
    );
  }

  const allowedActions = getAllowedActions(order.status);

  return (
    <div className="min-h-full bg-[#fff9f8] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 px-5 py-3.5 backdrop-blur border-b border-[#f2e6ec]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f3f5] transition-colors active:bg-[#eee5e9]"
          >
            <svg className="h-5 w-5 text-[#3c3440]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-[17px] font-semibold text-[#1f2230]">订单详情</h1>
            <p className="text-[12px] text-gray-400">{order.orderNo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button
              variant="primary"
              onClick={() => setIsEditing(true)}
              className="h-11 rounded-[18px] px-5 text-[14px] shadow-[0_10px_24px_rgba(255,90,102,0.18)]"
            >
              编辑
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-5 px-5 py-5">
        {/* 状态卡片 */}
        <div className="rounded-[24px] border border-[#f5e7ea] bg-white p-5 shadow-[0_8px_24px_rgba(29,35,53,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-2 text-[12px] text-gray-400">当前状态</p>
              <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-medium ${orderStatusClasses[order.status]}`}>
                {orderStatusLabels[order.status]}
              </span>
            </div>
            {order.serviceType && (
              <div className="text-right">
                <p className="mb-2 text-[12px] text-gray-400">服务类型</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  order.serviceType === 'home' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {serviceTypeLabels[order.serviceType]}
                </span>
              </div>
            )}
          </div>

          {/* 状态操作按钮 */}
          {!isEditing && allowedActions.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#f4ebee] pt-4">
              {allowedActions.includes('pending_agree') && (
                <Button
                  variant="primary"
                  onClick={() => handleStatusChange('pending_agree')}
                  disabled={isSubmitting}
                  className="h-12 rounded-[18px] bg-emerald-500 text-[15px] shadow-none disabled:opacity-50"
                >
                  {isSubmitting ? '处理中...' : '提交报价'}
                </Button>
              )}
              {allowedActions.includes('pending_confirm') && (
                <Button
                  variant="primary"
                  onClick={() => handleStatusChange('pending_confirm')}
                  disabled={isSubmitting}
                  className="h-12 rounded-[18px] bg-emerald-500 text-[15px] shadow-none disabled:opacity-50"
                >
                  {isSubmitting ? '处理中...' : '确认订单'}
                </Button>
              )}
              {(allowedActions.includes('pending_home') || allowedActions.includes('pending_shop')) && (
                <Button
                  variant="primary"
                  onClick={() => {
                    const nextStatus: OrderStatus = order.serviceType === 'home' ? 'pending_home' : 'pending_shop';
                    handleStatusChange(nextStatus);
                  }}
                  disabled={isSubmitting}
                  className="h-12 rounded-[18px] bg-emerald-500 text-[15px] shadow-none disabled:opacity-50"
                >
                  {isSubmitting ? '处理中...' : '确认订单'}
                </Button>
              )}
              {allowedActions.includes('completed') && (
                <Button
                  variant="primary"
                  onClick={() => handleStatusChange('completed')}
                  disabled={isSubmitting}
                  className="h-12 rounded-[18px] text-[15px] shadow-none disabled:opacity-50"
                >
                  {isSubmitting ? '处理中...' : '确认完成'}
                </Button>
              )}
              {allowedActions.includes('cancelled') && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={isSubmitting}
                  className={`h-12 rounded-[18px] border-[#f5ced4] text-[15px] text-[#ef5a71] disabled:opacity-50 ${
                    allowedActions.length === 1 ? 'col-span-2' : ''
                  }`}
                >
                  {isSubmitting ? '处理中...' : '取消订单'}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* 客户信息 */}
        <div className="rounded-[24px] border border-[#f5e7ea] bg-white p-5 shadow-[0_8px_24px_rgba(29,35,53,0.04)]">
          <h2 className="mb-4 text-[18px] font-semibold text-gray-900">客户信息</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ffe7ef] text-[22px] font-semibold text-pink-500">
                {order.customerName.charAt(0)}
              </div>
              <div>
                <p className="text-[16px] font-semibold text-gray-900">{order.customerName}</p>
                {customer && (
                  <p className="mt-1 text-[14px] text-gray-500">{customer.phone}</p>
                )}
              </div>
            </div>
            {customer && customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customer.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 服务信息 */}
        <div className="rounded-[24px] border border-[#f5e7ea] bg-white p-5 shadow-[0_8px_24px_rgba(29,35,53,0.04)]">
          <h2 className="mb-4 text-[18px] font-semibold text-gray-900">服务信息</h2>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">服务类型</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditForm({ ...editForm, serviceType: 'home' })}
                    className={`flex-1 py-3 rounded-xl border text-sm font-medium ${
                      editForm.serviceType === 'home'
                        ? 'border-pink-500 bg-pink-50 text-pink-500'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    上门美甲
                  </button>
                  <button
                    onClick={() => setEditForm({ ...editForm, serviceType: 'shop' })}
                    className={`flex-1 py-3 rounded-xl border text-sm font-medium ${
                      editForm.serviceType === 'shop'
                        ? 'border-pink-500 bg-pink-50 text-pink-500'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    到店美甲
                  </button>
                </div>
              </div>

              {editForm.serviceType === 'shop' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">选择店铺</label>
                  <select
                    value={editForm.shopId}
                    onChange={(e) => setEditForm({ ...editForm, shopId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none"
                  >
                    <option value="">请选择店铺</option>
                    {technician?.shopAddresses?.map((shop) => (
                      <option key={shop.name} value={shop.name}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
                  <input
                    type="datetime-local"
                    value={editForm.startTime.slice(0, 16)}
                    onChange={(e) => setEditForm({ ...editForm, startTime: new Date(e.target.value).toISOString() })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">结束时间</label>
                  <input
                    type="datetime-local"
                    value={editForm.endTime.slice(0, 16)}
                    onChange={(e) => setEditForm({ ...editForm, endTime: new Date(e.target.value).toISOString() })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">服务地址/店铺</label>
                <p className="px-4 py-3 rounded-xl bg-gray-50 text-gray-600">
                  {editForm.serviceType === 'home' ? order.address : (editForm.shopId || '请选择店铺')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
                <textarea
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  placeholder="添加备注信息..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none min-h-[80px]"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <span className="text-[14px] text-gray-400">服务内容</span>
                <span className="max-w-[62%] text-right text-[15px] font-medium text-gray-900">{order.serviceName}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-[14px] text-gray-400">预约时间</span>
                <span className="max-w-[62%] text-right text-[15px] font-medium text-gray-900">
                  {formatDateLabel(order.startTime)} {formatTimeRange(order.startTime, order.endTime)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-[14px] text-gray-400">服务时长</span>
                <span className="text-[15px] font-medium text-gray-900">
                  {getDurationMinutes(order.startTime, order.endTime)} 分钟
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-[14px] text-gray-400">{order.serviceType === 'shop' ? '服务店铺' : '服务地址'}</span>
                <span className="max-w-[62%] text-right text-[15px] font-medium leading-6 text-gray-900">
                  {order.serviceType === 'shop' ? (order.shopName || '到店服务') : order.address}
                </span>
              </div>
              {order.note && (
                <div className="border-t border-[#f4ebee] pt-3">
                  <span className="text-[14px] text-gray-400">备注</span>
                  <p className="mt-2 text-[14px] leading-6 text-gray-700">{order.note}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 价格明细 */}
        <div className="rounded-[24px] border border-[#f5e7ea] bg-white p-5 shadow-[0_8px_24px_rgba(29,35,53,0.04)]">
          <h2 className="mb-4 text-[18px] font-semibold text-gray-900">价格明细</h2>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">基础报价</label>
                <input
                  type="number"
                  value={editForm.basePrice}
                  onChange={(e) => setEditForm({ ...editForm, basePrice: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none"
                />
              </div>
              {editForm.serviceType === 'home' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">上门费用</label>
                  <input
                    type="number"
                    value={editForm.homeServiceFee}
                    onChange={(e) => setEditForm({ ...editForm, homeServiceFee: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">夜间服务费</label>
                <input
                  type="number"
                  value={editForm.nightFee}
                  onChange={(e) => setEditForm({ ...editForm, nightFee: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">节假日服务费</label>
                <input
                  type="number"
                  value={editForm.holidayFee}
                  onChange={(e) => setEditForm({ ...editForm, holidayFee: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">其他费用</label>
                <input
                  type="number"
                  value={editForm.otherFees}
                  onChange={(e) => setEditForm({ ...editForm, otherFees: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none"
                />
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">总价</span>
                  <span className="text-xl font-bold text-pink-500">{formatMoney(totalPrice)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <span className="text-[14px] text-gray-400">基础报价</span>
                <span className="text-[15px] font-medium text-gray-900">
                  {formatMoney(order.priceBreakdown?.basePrice || order.price)}
                </span>
              </div>
              {order.priceBreakdown?.homeServiceFee ? (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[14px] text-gray-400">上门费用</span>
                  <span className="text-[15px] font-medium text-gray-900">{formatMoney(order.priceBreakdown.homeServiceFee)}</span>
                </div>
              ) : null}
              {order.priceBreakdown?.nightFee ? (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[14px] text-gray-400">夜间服务费</span>
                  <span className="text-[15px] font-medium text-gray-900">{formatMoney(order.priceBreakdown.nightFee)}</span>
                </div>
              ) : null}
              {order.priceBreakdown?.holidayFee ? (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[14px] text-gray-400">节假日服务费</span>
                  <span className="text-[15px] font-medium text-gray-900">{formatMoney(order.priceBreakdown.holidayFee)}</span>
                </div>
              ) : null}
              {order.priceBreakdown?.otherFees ? (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[14px] text-gray-400">其他费用</span>
                  <span className="text-[15px] font-medium text-gray-900">{formatMoney(order.priceBreakdown.otherFees)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-[#f4ebee] pt-4">
                <span className="text-[18px] font-semibold text-gray-900">总价</span>
                <span className="text-[32px] font-semibold tracking-[-0.03em] text-pink-500">{formatMoney(order.price)}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-[14px] text-gray-400">定金状态</span>
                <span className={`text-[15px] font-medium ${order.depositPaid ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {order.depositPaid ? '已支付' : '未支付'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 服务作品 */}
        {order.serviceItems && order.serviceItems.length > 0 && (
          <div className="rounded-[24px] border border-[#f5e7ea] bg-white p-5 shadow-[0_8px_24px_rgba(29,35,53,0.04)]">
            <h2 className="mb-4 text-[18px] font-semibold text-gray-900">服务作品</h2>
            <div className="grid grid-cols-3 gap-3">
              {order.serviceItems.map((item) => (
                <div key={item.id} className="aspect-square rounded-xl bg-gray-100 overflow-hidden">
                  {item.images && item.images[0] ? (
                    <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      {item.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-[#f4ebee] bg-white/95 px-5 py-4 backdrop-blur-xl safe-area-bottom">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="flex-1 rounded-[18px] text-[15px]"
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveEdit}
              disabled={isSubmitting}
              className="flex-1 rounded-[18px] text-[15px] disabled:opacity-50"
            >
              {isSubmitting ? '保存中...' : '保存修改'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;
