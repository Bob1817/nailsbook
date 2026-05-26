import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderService, type Order } from '../services/order';
import { addressService, type ClientAddress } from '../services/address';
import { ActionConfirmDialog } from '../components/ActionConfirmDialog';
import { ORDER_STATUS_LABEL as STATUS_LABELS, ORDER_STATUS_COLOR as STATUS_COLORS, clientWaitingLabel } from '../utils/orderStatus';
import dayjs from 'dayjs';

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<ClientAddress[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [agreeing, setAgreeing] = useState(false);
  const [showAgreeConfirm, setShowAgreeConfirm] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [editForm, setEditForm] = useState({
    serviceDate: '',
    startTime: '',
    addressId: 0,
  });

  const loadOrder = useCallback(async (orderId: number) => {
    try {
      const data = await orderService.getOrder(orderId);
      setOrder(data);
    } catch {
      console.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAddresses = useCallback(async () => {
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
    } catch {
      console.error('Failed to load addresses');
    }
  }, []);

  useEffect(() => {
    if (id) {
      loadOrder(parseInt(id));
    }
  }, [id, loadOrder]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleSaveEdit = async () => {
    if (!order) {
      return;
    }
    if (!editForm.serviceDate || !editForm.startTime || !editForm.addressId) {
      alert('请先选择预约时间和服务地址');
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await orderService.updateOrder(order.id, editForm);
      setOrder(updated);
      setShowEditModal(false);
    } catch {
      alert('修改预约失败');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAgreeQuote = async () => {
    if (!order) return;
    setAgreeing(true);
    try {
      const updated = await orderService.agreeQuote(order.id);
      setOrder(updated);
      setShowAgreeConfirm(false);
    } catch {
      alert('同意报价失败');
    } finally {
      setAgreeing(false);
    }
  };

  const handleRejectQuote = async () => {
    if (!order) return;
    setRejecting(true);
    try {
      const updated = await orderService.rejectQuote(order.id, rejectReason);
      setOrder(updated);
      setShowRejectModal(false);
      setRejectReason('');
    } catch {
      alert('拒绝报价失败');
    } finally {
      setRejecting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      const updated = await orderService.updateOrderStatus(order.id, { status: 'cancelled' });
      setOrder(updated);
      setShowCancelModal(false);
    } catch {
      alert('取消预约失败');
    } finally {
      setCancelling(false);
    }
  };

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00', '20:30',
  ];

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-[#FF6B8A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">预约不存在</p>
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 px-4 py-2 bg-[#FF6B8A] text-white rounded-full"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#FFFDFD_0%,#F7F3F6_48%,#F2F6FB_100%)]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/78 px-5 app-header-safe pb-5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/5"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Order Detail</p>
            <h1 className="mt-0.5 text-lg font-semibold text-gray-900">预约详情</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 px-5 pb-28 pt-6">
        {/* Status Card */}
        <div className="overflow-hidden rounded-[32px] bg-white/88 p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Order Status</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-gray-900">当前预约状态</h2>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>
          <div className="rounded-[24px] bg-[linear-gradient(135deg,#FFF0F5_0%,#F9FBFF_100%)] p-5">
            <div className="text-[2rem] font-semibold leading-none tracking-[-0.04em] text-gray-900">
              {order.quotePrice ? `¥${order.quotePrice}` : '待报价'}
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {order.quotePrice ? '当前报价金额' : '美甲师确认后会展示服务报价'}
            </p>
            {order.quoteRemark && (
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{order.quoteRemark}</p>
            )}
            <div className="mt-4 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span className="rounded-full bg-white/90 px-3 py-1 ring-1 ring-black/5">预约编号</span>
              <span>{order.orderNo}</span>
            </div>
          </div>
        </div>

        {/* Service Info */}
        <div className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">服务信息</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">查看预约服务类型、时间和备注说明</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50/80 px-4 py-3">
              <span className="text-sm text-gray-500">服务类型</span>
              <span className="text-sm font-medium text-gray-900">{order.serviceType || '美甲服务'}</span>
            </div>
            <div className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50/80 px-4 py-3">
              <span className="text-sm text-gray-500">预约时间</span>
              <span className="text-right text-sm font-medium text-gray-900">
                {dayjs(order.startTime).format('YYYY-MM-DD HH:mm')}
              </span>
            </div>
            {order.customTitle && (
              <div className="rounded-2xl bg-slate-50/80 px-4 py-3">
                <span className="text-sm text-gray-500">需求名称</span>
                <p className="mt-1 text-sm font-medium leading-6 text-gray-900">{order.customTitle}</p>
              </div>
            )}
            {order.customDescription && (
              <div className="rounded-2xl bg-slate-50/80 px-4 py-3">
                <span className="text-sm text-gray-500">需求描述</span>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-900">
                  {order.customDescription}
                </p>
              </div>
            )}
            {order.customImages && order.customImages.length > 0 && (
              <div className="rounded-2xl bg-slate-50/80 px-4 py-3">
                <span className="text-sm text-gray-500">参考图</span>
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
            {order.remark && (
              <div className="rounded-2xl bg-slate-50/80 px-4 py-3">
                <span className="text-sm text-gray-500">备注</span>
                <p className="mt-1 text-sm leading-6 text-gray-900">{order.remark}</p>
              </div>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">服务地址</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {order.serviceType === '到店美甲' ? '到店服务请前往以下门店地址' : '上门服务会按这个地址安排到访'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#FFF0F5_0%,#F4F7FB_100%)]">
              <svg className="w-4 h-4 text-[#FF6B8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm leading-6 text-gray-900">{order.address || '地址待确认'}</p>
              {order.clientAddress?.doorInfo && (
                <p className="mt-2 text-xs text-gray-500">{order.clientAddress.doorInfo}</p>
              )}
            </div>
          </div>
        </div>

        {/* Technician Info */}
        <div className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">服务美甲师</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">与你本次预约关联的专属美甲师</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#FFE0EA_0%,#F4F7FB_100%)]">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{order.technician?.name}</p>
              <p className="mt-1 text-xs text-gray-500">{order.technician?.phone}</p>
            </div>
          </div>
            {order.technician?.id && (
              <button
                onClick={() => navigate(`/chat/direct?tech_id=${order.technician?.id}`)}
                className="shrink-0 rounded-full bg-[var(--color-primary-soft)] px-4 py-2 text-sm font-medium text-[var(--color-primary)]"
              >
                发消息
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {(() => {
        // 已完成/已取消：不展示操作栏
        if (order.status === 'completed' || order.status === 'cancelled') {
          return null;
        }

        const isClientTurn = order.status === 'pending_agree';
        const cancellable = ['pending_quote', 'pending_agree', 'pending_confirm', 'pending_home', 'pending_shop'].includes(order.status);
        const waitingLabel = clientWaitingLabel(order.status);

        return (
          <div className="fixed bottom-0 left-0 right-0 border-t border-white/60 bg-white/88 px-5 py-4 safe-area-bottom backdrop-blur-xl">
            <div className="mx-auto max-w-md">
              {isClientTurn ? (
                // 用户该操作：同意 / 拒绝 / 修改 / 取消
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="rounded-full bg-slate-100 py-3 text-sm font-medium text-gray-700"
                  >
                    修改预约
                  </button>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="rounded-full bg-white py-3 text-sm font-medium text-red-500 ring-1 ring-red-200"
                  >
                    取消预约
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="rounded-full bg-white py-3 text-sm font-medium text-orange-500 ring-1 ring-orange-200"
                  >
                    拒绝报价
                  </button>
                  <button
                    onClick={() => setShowAgreeConfirm(true)}
                    disabled={agreeing}
                    className="rounded-full bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50"
                  >
                    {agreeing ? '处理中' : '同意'}
                  </button>
                </div>
              ) : (
                // 等待对方：禁用主按钮 + 取消预约
                <div className={`grid gap-3 ${cancellable ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <button
                    disabled
                    className="rounded-full bg-slate-100 py-3.5 font-medium text-slate-400 cursor-not-allowed"
                  >
                    {waitingLabel || '处理中'}
                  </button>
                  {cancellable && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="rounded-full bg-white py-3.5 font-medium text-red-500 ring-1 ring-red-200"
                    >
                      取消预约
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {showEditModal && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[32px] bg-white/95 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom)+1rem)] shadow-2xl ring-1 ring-black/5 backdrop-blur sm:rounded-[32px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">修改预约</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">仅支持调整预约时间和服务地址</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              >
                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] bg-slate-50/80 p-4">
                <label className="mb-3 block text-sm font-medium text-gray-700">预约日期</label>
                <input
                  type="date"
                  value={editForm.serviceDate}
                  min={dayjs().format('YYYY-MM-DD')}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, serviceDate: e.target.value }))}
                  className="w-full rounded-2xl bg-white px-4 py-3 text-gray-900 outline-none ring-1 ring-transparent focus:ring-[#FF6B8A]/20"
                />
              </div>

              <div className="rounded-[24px] bg-slate-50/80 p-4">
                <label className="mb-3 block text-sm font-medium text-gray-700">预约时间</label>
                <div className="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto scrollbar-hide">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, startTime: time }))}
                      className={`rounded-2xl py-2.5 text-sm font-medium transition ${
                        editForm.startTime === time
                          ? 'bg-[linear-gradient(135deg,#FF6B8A_0%,#FF8FA3_100%)] text-white shadow-lg shadow-pink-200/80'
                          : 'bg-white text-slate-600'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] bg-slate-50/80 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-gray-700">服务地址</label>
                  <button
                    type="button"
                    onClick={() => navigate('/profile/addresses')}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-primary)]"
                  >
                    管理地址
                  </button>
                </div>
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <button
                      key={address.id}
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, addressId: address.id }))}
                      className={`w-full rounded-[20px] p-4 text-left ring-1 transition ${
                        editForm.addressId === address.id
                          ? 'bg-[linear-gradient(135deg,#FFF0F5_0%,#FAFBFF_100%)] ring-[#FF6B8A]/25'
                          : 'bg-white ring-black/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          editForm.addressId === address.id ? 'border-[#FF6B8A] bg-[#FF6B8A]' : 'border-slate-300'
                        }`}>
                          {editForm.addressId === address.id && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{address.contactName || '未命名'}</span>
                            <span className="text-sm text-gray-500">{address.contactPhone}</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-gray-600">
                            {[address.province, address.city, address.district, address.detailAddress].filter(Boolean).join(' ')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="w-full rounded-full bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] py-4 font-medium text-white shadow-lg shadow-pink-200 disabled:opacity-50"
              >
                {savingEdit ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
          onClick={() => !rejecting && setShowRejectModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[32px] bg-white/95 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom)+1rem)] shadow-2xl ring-1 ring-black/5 backdrop-blur sm:rounded-[32px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">拒绝报价</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">请输入拒绝原因，方便美甲师了解你的想法</p>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={rejecting}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 disabled:opacity-50"
              >
                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="rounded-[24px] bg-slate-50/80 p-4 mb-5">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入拒绝原因（可选）"
                rows={3}
                className="w-full resize-none rounded-2xl bg-white px-4 py-3 text-gray-900 outline-none ring-1 ring-transparent focus:ring-[#FF6B8A]/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={rejecting}
                className="rounded-full bg-slate-100 py-3.5 font-medium text-gray-700 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleRejectQuote}
                disabled={rejecting}
                className="rounded-full bg-red-500 py-3.5 font-medium text-white disabled:opacity-50"
              >
                {rejecting ? '处理中...' : '确认拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
          onClick={() => !cancelling && setShowCancelModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[32px] bg-white/95 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom)+1rem)] shadow-2xl ring-1 ring-black/5 backdrop-blur sm:rounded-[32px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">取消预约</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">取消后预约将无法恢复，是否确认取消？</p>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 disabled:opacity-50"
              >
                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="rounded-full bg-slate-100 py-3.5 font-medium text-gray-700 disabled:opacity-50"
              >
                暂不取消
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="rounded-full bg-red-500 py-3.5 font-medium text-white disabled:opacity-50"
              >
                {cancelling ? '处理中...' : '确认取消'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 同意报价确认弹窗（突出价格）*/}
      <ActionConfirmDialog
        open={showAgreeConfirm}
        title="确认同意美甲师报价？"
        description="同意后将进入到美甲师确认环节。请确保你已知悉报价金额。"
        price={order?.quotePrice ?? null}
        details={order ? [
          { label: '服务', value: order.serviceType || '美甲服务' },
          { label: '日期', value: dayjs(order.startTime).format('YYYY-MM-DD') },
          { label: '时间', value: dayjs(order.startTime).format('HH:mm') },
          { label: '地址', value: order.address || '—' },
        ] : []}
        confirmText="确认同意"
        loading={agreeing}
        onConfirm={handleAgreeQuote}
        onCancel={() => setShowAgreeConfirm(false)}
      />
    </div>
  );
};

export default OrderDetail;
