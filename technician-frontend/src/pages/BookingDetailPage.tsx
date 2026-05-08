import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { Button } from '../components/base/Button';
import { bookingsService } from '../services/bookings';
import { customersService } from '../services/customers';
import { messageService } from '../services/message';
import {
  bookingStatusLabels,
  bookingStatusClasses,
  formatDateLabel,
  formatMoney,
  formatTimeRange,
  getDurationMinutes,
  type BookingStatus,
  type TechnicianBooking,
} from '../services/technicianData';
import type { TechnicianCustomerSummary } from '../services/technicianData';

const serviceTypeLabels: Record<string, string> = {
  home: '上门美甲',
  shop: '到店美甲',
};

const BookingDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { technician } = useAuth();
  const toast = useToast();

  const [booking, setBooking] = useState<TechnicianBooking | null>(null);
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

  // 加载预约详情
  useEffect(() => {
    if (!id) return;

    const loadBooking = async () => {
      setIsLoading(true);
      try {
        const bookingData = await bookingsService.getById(Number(id));
        if (bookingData) {
          setBooking(bookingData);
          // 加载客户信息
          const customers = await customersService.list({ technicianId: technician?.id });
          const matchedCustomer = customers.find(c => c.id === bookingData.customerId);
          if (matchedCustomer) {
            setCustomer(matchedCustomer);
          }
          // 初始化编辑表单
          setEditForm({
            serviceType: bookingData.serviceType || 'home',
            shopId: bookingData.shopId?.toString() || '',
            startTime: bookingData.startTime,
            endTime: bookingData.endTime,
            basePrice: bookingData.priceBreakdown?.basePrice || bookingData.price,
            homeServiceFee: bookingData.priceBreakdown?.homeServiceFee || 0,
            nightFee: bookingData.priceBreakdown?.nightFee || 0,
            holidayFee: bookingData.priceBreakdown?.holidayFee || 0,
            otherFees: bookingData.priceBreakdown?.otherFees || 0,
            note: bookingData.note || '',
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

    loadBooking();
  }, [id, technician?.id, navigate, toast]);

  // 计算总价
  const totalPrice = editForm.basePrice + editForm.homeServiceFee + editForm.nightFee + editForm.holidayFee + editForm.otherFees;

  // 处理状态变更
  const handleStatusChange = async (newStatus: BookingStatus) => {
    if (!booking) return;

    setIsSubmitting(true);
    try {
      await bookingsService.transition(booking.id, newStatus);

      // 发送消息通知客户
      const statusMessages: Record<BookingStatus, string> = {
        pending_confirm: '预约待确认',
        confirmed: '预约已确认',
        in_progress: '服务进行中',
        completed: '服务已完成',
        cancelled: '预约已取消',
      };

      await messageService.sendMessage({
        clientId: booking.customerId,
        messageType: 'system',
        content: `【预约状态更新】您的预约(${booking.bookingNo})状态已更新为：${statusMessages[newStatus]}`,
      });

      toast.success('状态更新成功，已通知客户');

      // 刷新数据
      const updatedBooking = await bookingsService.getById(booking.id);
      if (updatedBooking) {
        setBooking(updatedBooking);
      }
    } catch {
      toast.error('状态更新失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!booking) return;

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
      await bookingsService.update(booking.id, updateData);

      // 发送消息通知客户
      await messageService.sendMessage({
        clientId: booking.customerId,
        messageType: 'system',
        content: `【预约信息更新】您的预约(${booking.bookingNo})信息已更新，请查看最新详情。`,
      });

      toast.success('预约信息已更新，已通知客户');
      setIsEditing(false);

      // 刷新数据
      const updatedBooking = await bookingsService.getById(booking.id);
      if (updatedBooking) {
        setBooking(updatedBooking);
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取可操作的状态列表
  const getAllowedActions = (status: BookingStatus): BookingStatus[] => {
    const actions: Record<BookingStatus, BookingStatus[]> = {
      pending_confirm: ['confirmed', 'cancelled'],
      confirmed: ['in_progress', 'cancelled'],
      in_progress: ['completed'],
      completed: [],
      cancelled: [],
    };
    return actions[status] || [];
  };

  if (isLoading) {
    return (
      <div className="min-h-full bg-[#fff9f8] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-full bg-[#fff9f8] flex items-center justify-center">
        <p className="text-gray-500">预约不存在</p>
      </div>
    );
  }

  const allowedActions = getAllowedActions(booking.status);

  return (
    <div className="min-h-full bg-[#fff9f8] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[#f4e9ec] bg-[#fff9f8]/90 px-5 pb-4 pt-12 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white text-gray-700 shadow-[0_6px_18px_rgba(29,35,53,0.06)]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-gray-900">预约详情</h1>
            <p className="mt-1 text-[13px] text-gray-400">{booking.bookingNo}</p>
          </div>
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
              <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-medium ${bookingStatusClasses[booking.status]}`}>
                {bookingStatusLabels[booking.status]}
              </span>
            </div>
            {booking.serviceType && (
              <div className="text-right">
                <p className="mb-2 text-[12px] text-gray-400">服务类型</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  booking.serviceType === 'home' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {serviceTypeLabels[booking.serviceType]}
                </span>
              </div>
            )}
          </div>

          {/* 状态操作按钮 */}
          {!isEditing && allowedActions.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#f4ebee] pt-4">
              {allowedActions.includes('confirmed') && (
                <Button
                  variant="primary"
                  onClick={() => handleStatusChange('confirmed')}
                  disabled={isSubmitting}
                  className="h-12 rounded-[18px] bg-emerald-500 text-[15px] shadow-none disabled:opacity-50"
                >
                  {isSubmitting ? '处理中...' : '确认预约'}
                </Button>
              )}
              {allowedActions.includes('in_progress') && (
                <Button
                  variant="primary"
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={isSubmitting}
                  className="h-12 rounded-[18px] bg-sky-500 text-[15px] shadow-none disabled:opacity-50"
                >
                  {isSubmitting ? '处理中...' : '开始服务'}
                </Button>
              )}
              {allowedActions.includes('completed') && (
                <Button
                  variant="primary"
                  onClick={() => handleStatusChange('completed')}
                  disabled={isSubmitting}
                  className="h-12 rounded-[18px] text-[15px] shadow-none disabled:opacity-50"
                >
                  {isSubmitting ? '处理中...' : '完成服务'}
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
                  {isSubmitting ? '处理中...' : '取消预约'}
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
                {booking.customerName.charAt(0)}
              </div>
              <div>
                <p className="text-[16px] font-semibold text-gray-900">{booking.customerName}</p>
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
                  {editForm.serviceType === 'home' ? booking.address : (editForm.shopId || '请选择店铺')}
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
                <span className="max-w-[62%] text-right text-[15px] font-medium text-gray-900">{booking.serviceName}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-[14px] text-gray-400">预约时间</span>
                <span className="max-w-[62%] text-right text-[15px] font-medium text-gray-900">
                  {formatDateLabel(booking.startTime)} {formatTimeRange(booking.startTime, booking.endTime)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-[14px] text-gray-400">服务时长</span>
                <span className="text-[15px] font-medium text-gray-900">
                  {getDurationMinutes(booking.startTime, booking.endTime)} 分钟
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-[14px] text-gray-400">{booking.serviceType === 'shop' ? '服务店铺' : '服务地址'}</span>
                <span className="max-w-[62%] text-right text-[15px] font-medium leading-6 text-gray-900">
                  {booking.serviceType === 'shop' ? (booking.shopName || '到店服务') : booking.address}
                </span>
              </div>
              {booking.note && (
                <div className="border-t border-[#f4ebee] pt-3">
                  <span className="text-[14px] text-gray-400">备注</span>
                  <p className="mt-2 text-[14px] leading-6 text-gray-700">{booking.note}</p>
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
                  {formatMoney(booking.priceBreakdown?.basePrice || booking.price)}
                </span>
              </div>
              {booking.priceBreakdown?.homeServiceFee ? (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[14px] text-gray-400">上门费用</span>
                  <span className="text-[15px] font-medium text-gray-900">{formatMoney(booking.priceBreakdown.homeServiceFee)}</span>
                </div>
              ) : null}
              {booking.priceBreakdown?.nightFee ? (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[14px] text-gray-400">夜间服务费</span>
                  <span className="text-[15px] font-medium text-gray-900">{formatMoney(booking.priceBreakdown.nightFee)}</span>
                </div>
              ) : null}
              {booking.priceBreakdown?.holidayFee ? (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[14px] text-gray-400">节假日服务费</span>
                  <span className="text-[15px] font-medium text-gray-900">{formatMoney(booking.priceBreakdown.holidayFee)}</span>
                </div>
              ) : null}
              {booking.priceBreakdown?.otherFees ? (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[14px] text-gray-400">其他费用</span>
                  <span className="text-[15px] font-medium text-gray-900">{formatMoney(booking.priceBreakdown.otherFees)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-[#f4ebee] pt-4">
                <span className="text-[18px] font-semibold text-gray-900">总价</span>
                <span className="text-[32px] font-semibold tracking-[-0.03em] text-pink-500">{formatMoney(booking.price)}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-[14px] text-gray-400">定金状态</span>
                <span className={`text-[15px] font-medium ${booking.depositPaid ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {booking.depositPaid ? '已支付' : '未支付'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 服务作品 */}
        {booking.serviceItems && booking.serviceItems.length > 0 && (
          <div className="rounded-[24px] border border-[#f5e7ea] bg-white p-5 shadow-[0_8px_24px_rgba(29,35,53,0.04)]">
            <h2 className="mb-4 text-[18px] font-semibold text-gray-900">服务作品</h2>
            <div className="grid grid-cols-3 gap-3">
              {booking.serviceItems.map((item) => (
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

export default BookingDetailPage;
