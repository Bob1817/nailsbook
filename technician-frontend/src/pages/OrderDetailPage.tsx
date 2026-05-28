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

interface OrderDetailPageProps {
  orderIdProp?: number;
  onClose?: () => void;
  isModal?: boolean;
}

const OrderDetailPage: React.FC<OrderDetailPageProps> = ({ orderIdProp, onClose, isModal }) => {
  const navigate = useNavigate();
  const { id: idFromUrl } = useParams<{ id: string }>();
  const id = orderIdProp != null ? String(orderIdProp) : idFromUrl;
  const handleBack = () => { if (onClose) onClose(); else navigate(-1); };
  const { technician } = useAuth();
  const toast = useToast();

  const [order, setOrder] = useState<TechnicianOrder | null>(null);
  const [customer, setCustomer] = useState<TechnicianCustomerSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

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
    depositAmount: 0,
  });

  // 加载预约详情
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
            depositAmount: orderData.depositAmount || 0,
          });
        } else {
          toast.error('预约不存在');
          navigate(-1);
        }
      } catch {
        toast.error('加载预约详情失败');
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
          depositAmount: editForm.depositAmount || undefined,
        });
      } else if (newStatus === 'pending_confirm') {
        await ordersService.agree(order.id);
      } else if (newStatus === 'pending_home' || newStatus === 'pending_shop') {
        await ordersService.confirm(order.id, {
          depositConfirmed: order.depositAmount > 0 ? order.depositPaid : true,
        });
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
        content: `【预约状态更新】您的预约(${order.orderNo})状态已更新为：${statusMessages[newStatus] || newStatus}`,
      });

      toast.success('状态更新成功，已通知客户');

      // 刷新数据
      const updatedOrder = await ordersService.getById(order.id);
      if (updatedOrder) {
        setOrder(updatedOrder);
      }

      // 确认预约后跳转到行程页并定位到预约当天
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
        depositAmount: editForm.depositAmount || 0,
      };

      // 调用更新API
      await ordersService.update(order.id, updateData);

      // 发送消息通知客户
      await messageService.sendMessage({
        clientId: order.customerId,
        messageType: 'system',
        content: `【预约信息更新】您的预约(${order.orderNo})信息已更新，请查看最新详情。`,
      });

      toast.success('预约信息已更新，已通知客户');
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
        <p className="text-gray-500">预约不存在</p>
      </div>
    );
  }

  const allowedActions = getAllowedActions(order.status);

  const content = (
    <div className={isModal ? 'flex flex-col h-full bg-[#fff9f8]' : 'min-h-full bg-[#fff9f8] pb-28'}>
      {/* Header */}
      <div className={isModal
        ? 'shrink-0 z-10 flex items-center justify-between bg-white/95 px-5 py-3.5 backdrop-blur border-b border-[#f2e6ec]'
        : 'sticky top-0 z-10 flex items-center justify-between bg-white/95 px-5 py-3.5 backdrop-blur border-b border-[#f2e6ec]'
      }>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f3f5] transition-colors active:bg-[#eee5e9]"
          >
            <svg className="h-5 w-5 text-[#3c3440]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-[17px] font-semibold text-[#1f2230]">预约详情</h1>
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

      <div className={isModal ? 'flex-1 min-h-0 overflow-y-auto space-y-5 px-5 py-5' : 'space-y-5 px-5 py-5'}>
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
              {order.customDescription && (
                <div className="border-t border-[#f4ebee] pt-3">
                  <span className="text-[14px] text-gray-400">需求描述</span>
                  <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-gray-700">
                    {order.customDescription}
                  </p>
                </div>
              )}
              {order.customImages && order.customImages.length > 0 && (
                <div className="border-t border-[#f4ebee] pt-3">
                  <span className="text-[14px] text-gray-400">参考图</span>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {order.customImages.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`参考图${i + 1}`}
                        className="aspect-square w-full cursor-pointer rounded-xl object-cover"
                        onClick={() => window.open(url, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}
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
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-gray-900">总价</span>
                  <span className="text-xl font-bold text-pink-500">{formatMoney(totalPrice)}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">定金金额（线下收取）</label>
                  <input
                    type="number"
                    value={editForm.depositAmount || ''}
                    onChange={(e) => setEditForm({ ...editForm, depositAmount: Number(e.target.value) })}
                    placeholder="0 表示不收定金"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none"
                  />
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
                <span className="text-[14px] text-gray-400">定金</span>
                <span className={`text-[15px] font-medium ${order.depositPaid ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {order.depositAmount > 0
                    ? `${formatMoney(order.depositAmount)} · ${order.depositPaid ? '已支付' : '未支付'}`
                    : '未设置'}
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
      <div className={isModal
        ? 'shrink-0 border-t border-[#f4ebee] bg-white/95 px-5 py-4 backdrop-blur-xl'
        : 'fixed bottom-0 left-0 right-0 border-t border-[#f4ebee] bg-white/95 px-5 py-4 backdrop-blur-xl'
      } style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        {isEditing ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex-1 h-12 rounded-[18px] border border-gray-200 bg-white text-[15px] font-medium text-gray-700 active:opacity-80"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-[18px] bg-[#FF5A66] text-[15px] font-medium text-white shadow-none disabled:opacity-50 active:opacity-80"
            >
              {isSubmitting ? '保存中...' : '保存修改'}
            </button>
          </div>
        ) : (
          (() => {
            const statusBtns: React.ReactNode[] = [];
            if (allowedActions.includes('pending_agree')) {
              statusBtns.push(
                <button key="pa" type="button" onClick={() => handleStatusChange('pending_agree')} disabled={isSubmitting}
                  className="flex-1 min-w-0 h-12 rounded-[18px] bg-emerald-500 text-[15px] font-medium text-white shadow-none disabled:opacity-50 active:opacity-80">
                  {isSubmitting ? '处理中...' : '提交报价'}
                </button>
              );
            }
            if (order.status === 'pending_agree') {
              statusBtns.push(
                <button key="wait" type="button" disabled
                  className="flex-1 min-w-0 h-12 rounded-[18px] bg-gray-100 text-[15px] font-medium text-gray-400 cursor-not-allowed">
                  待用户确认
                </button>
              );
            }
            if (order.status === 'pending_home' || order.status === 'pending_shop') {
              statusBtns.push(
                <button key="wait" type="button" disabled
                  className="flex-1 min-w-0 h-12 rounded-[18px] bg-gray-100 text-[15px] font-medium text-gray-400 cursor-not-allowed">
                  {order.status === 'pending_home' ? '待上门' : '待到店'}
                </button>
              );
            }
            if (allowedActions.includes('pending_confirm')) {
              statusBtns.push(
                <button key="pc" type="button" onClick={() => handleStatusChange('pending_confirm')} disabled={isSubmitting}
                  className="flex-1 min-w-0 h-12 rounded-[18px] bg-emerald-500 text-[15px] font-medium text-white shadow-none disabled:opacity-50 active:opacity-80">
                  {isSubmitting ? '处理中...' : '确认预约'}
                </button>
              );
            }
            if (allowedActions.includes('pending_home') || allowedActions.includes('pending_shop')) {
              const needsDeposit = order.depositAmount > 0 && !order.depositPaid;
              statusBtns.push(
                <button key="conf" type="button"
                  onClick={() => { const ns: OrderStatus = order.serviceType === 'home' ? 'pending_home' : 'pending_shop'; handleStatusChange(ns); }}
                  disabled={isSubmitting || needsDeposit}
                  title={needsDeposit ? '客户尚未确认支付定金' : undefined}
                  className="flex-1 min-w-0 h-12 rounded-[18px] bg-emerald-500 text-[15px] font-medium text-white shadow-none disabled:opacity-50 active:opacity-80">
                  {isSubmitting ? '处理中...' : needsDeposit ? '等待客户付定金' : '确认预约'}
                </button>
              );
            }
            if (allowedActions.includes('completed')) {
              statusBtns.push(
                <button key="comp" type="button" onClick={() => handleStatusChange('completed')} disabled={isSubmitting}
                  className="flex-1 min-w-0 h-12 rounded-[18px] bg-emerald-500 text-[15px] font-medium text-white shadow-none disabled:opacity-50 active:opacity-80">
                  {isSubmitting ? '处理中...' : '确认完成'}
                </button>
              );
            }
            if (allowedActions.includes('cancelled')) {
              statusBtns.push(
                <button key="cancel" type="button" onClick={() => handleStatusChange('cancelled')} disabled={isSubmitting}
                  className="flex-1 min-w-0 h-12 rounded-[18px] border border-red-100 bg-white text-[15px] font-medium text-red-500 disabled:opacity-50 active:opacity-80">
                  {isSubmitting ? '处理中...' : '取消预约'}
                </button>
              );
            }
            const sendBtn = (
              <button key="send" type="button"
                onClick={async () => {
                  try {
                    const result = await messageService.sendOrderCard(order.id);
                    toast.success('已发送给客户');
                    if (result.conversationId) { if (onClose) onClose(); navigate(`/chat?conversation_id=${result.conversationId}`); }
                  } catch (err: any) { toast.error(err?.response?.data?.message || '发送失败，请重试'); }
                }}
                className="flex-1 min-w-0 h-12 rounded-[18px] bg-slate-800 text-[15px] font-semibold text-white shadow-none active:opacity-80">
                发给 {order.customerName}
              </button>
            );
            const allBtns = [...statusBtns, sendBtn];
            if (allBtns.length <= 3) {
              return <div className="flex gap-2">{allBtns}</div>;
            }
            return (
              <div>
                <div className="flex gap-2">
                  {allBtns[0]}{allBtns[1]}
                  <button type="button" onClick={() => setShowMoreActions(!showMoreActions)}
                    className="flex-1 min-w-0 h-12 rounded-[18px] border border-gray-200 bg-white text-[15px] font-medium text-gray-600 active:opacity-80">
                    {showMoreActions ? '收起操作 ↑' : '更多操作 ↓'}
                  </button>
                </div>
                {showMoreActions && <div className="flex gap-2 mt-2">{allBtns.slice(2)}</div>}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );

  if (!isModal) return content;

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md h-[92vh] rounded-t-3xl bg-white overflow-hidden shadow-[0_-20px_50px_rgba(15,23,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
      >
        {content}
      </div>
    </div>
  );
};

export default OrderDetailPage;
