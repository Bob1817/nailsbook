import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderService, type Order } from '../services/order';
import { addressService, type ClientAddress } from '../services/address';
import { messageService } from '../services/message';
import { ActionConfirmDialog } from '../components/ActionConfirmDialog';
import { ORDER_STATUS_LABEL as STATUS_LABELS, ORDER_STATUS_COLOR as STATUS_COLORS, clientWaitingLabel } from '../utils/orderStatus';
import dayjs from 'dayjs';

interface OrderDetailProps {
  /** 弹窗模式时通过 prop 传入订单 id；否则从 URL 取 */
  orderIdProp?: number;
  /** 弹窗模式时关闭回调；否则使用 navigate(-1) */
  onClose?: () => void;
  /** 是否处于弹窗模式（影响容器样式） */
  isModal?: boolean;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ orderIdProp, onClose, isModal }) => {
  const { id: idFromUrl } = useParams<{ id: string }>();
  const id = orderIdProp != null ? String(orderIdProp) : idFromUrl;
  const navigate = useNavigate();
  const handleBack = () => {
    if (onClose) onClose();
    else navigate(-1);
  };
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
  const [markingDeposit, setMarkingDeposit] = useState(false);
  const [showDepositConfirm, setShowDepositConfirm] = useState(false);
  const [sendingOrderCard, setSendingOrderCard] = useState(false);
  const [showReinitModal, setShowReinitModal] = useState(false);
  const [reinitiating, setReinitiating] = useState(false);
  const [reinitForm, setReinitForm] = useState({ serviceDate: '', startTime: '' });
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

  const handleMarkDepositPaid = async () => {
    if (!order) return;
    setMarkingDeposit(true);
    try {
      const updated = await orderService.markDepositPaid(order.id);
      setOrder(updated);
      setShowDepositConfirm(false);
    } catch {
      alert('确认定金失败');
    } finally {
      setMarkingDeposit(false);
    }
  };

  const handleReinitiate = async () => {
    if (!order) return;
    if (!reinitForm.serviceDate || !reinitForm.startTime) {
      alert('请先选择预约日期和时间');
      return;
    }
    setReinitiating(true);
    try {
      const updated = await orderService.reinitiate(order.id, reinitForm);
      setOrder(updated);
      setShowReinitModal(false);
      setReinitForm({ serviceDate: '', startTime: '' });
    } catch {
      alert('重新发起失败');
    } finally {
      setReinitiating(false);
    }
  };

  const handleSendOrderCard = async () => {
    if (!order || sendingOrderCard) return;
    setSendingOrderCard(true);
    try {
      const result = await messageService.sendOrderCard(order.id);
      if (onClose) onClose();
      if (result.conversationId) {
        navigate(`/chat/${result.conversationId}`);
      }
    } catch {
      alert('发送失败，请重试');
    } finally {
      setSendingOrderCard(false);
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
      <div className="min-h-full flex items-center justify-center bg-[var(--nb-page)]">
        <div className="w-8 h-8 border-2 border-[var(--nb-control)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[var(--nb-page)]">
        <div className="text-center">
          <p className="text-[var(--nb-secondary)]">预约不存在</p>
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 px-4 py-2 bg-[var(--nb-action)] text-white rounded-full"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  // 公共子弹窗（编辑/拒绝/取消/同意确认）—— 两种模式都用
  const commonModals = (
    <>
      {showEditModal && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] rounded-t-[32px] bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur sm:rounded-[32px] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 px-6 pt-6 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--nb-ink)]">修改预约</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">仅支持调整预约时间和服务地址</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--nb-page)]">
                <svg className="h-4 w-4 text-[var(--nb-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-4">
              <div className="rounded-[24px] bg-[var(--nb-page)]/80 p-4">
                <label className="mb-3 block text-sm font-medium text-[var(--nb-ink)]">预约日期</label>
                <input
                  type="date"
                  value={editForm.serviceDate}
                  min={dayjs().format('YYYY-MM-DD')}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, serviceDate: e.target.value }))}
                  className="w-full rounded-2xl bg-white px-4 py-3 text-[var(--nb-ink)] outline-none ring-1 ring-transparent focus:ring-[var(--nb-control)]/20"
                />
              </div>
              <div className="rounded-[24px] bg-[var(--nb-page)]/80 p-4">
                <label className="mb-3 block text-sm font-medium text-[var(--nb-ink)]">预约时间</label>
                <div className="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto scrollbar-hide">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, startTime: time }))}
                      className={`rounded-2xl py-2.5 text-sm font-medium transition ${
                        editForm.startTime === time
                          ? 'bg-[var(--nb-action)] text-white shadow-lg shadow-black/80'
                          : 'bg-white text-[var(--nb-secondary)]'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] bg-[var(--nb-page)]/80 p-4">
                <label className="mb-3 block text-sm font-medium text-[var(--nb-ink)]">服务地址</label>
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <button
                      key={address.id}
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, addressId: address.id }))}
                      className={`w-full rounded-[20px] p-4 text-left ring-1 transition ${
                        editForm.addressId === address.id
                          ? 'bg-[var(--nb-page)] ring-[var(--nb-control)]/25'
                          : 'bg-white ring-black/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          editForm.addressId === address.id ? 'border-[var(--nb-control)] bg-[var(--nb-action)]' : 'border-[var(--nb-control)]'
                        }`}>
                          {editForm.addressId === address.id && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-[var(--nb-ink)]">{address.contactName || '未命名'}</span>
                            <span className="text-sm text-[var(--nb-secondary)]">{address.contactPhone}</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[var(--nb-secondary)]">
                            {[address.province, address.city, address.district, address.detailAddress].filter(Boolean).join(' ')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="shrink-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom)+1rem)] pt-2">
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="w-full rounded-full bg-[var(--nb-action)] py-4 font-medium text-white shadow-lg shadow-black/5 disabled:opacity-50"
              >
                {savingEdit ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReinitModal && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
          onClick={() => !reinitiating && setShowReinitModal(false)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] rounded-t-[32px] bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur sm:rounded-[32px] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 px-6 pt-6 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--nb-ink)]">重新发起预约</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">仅需重新选择预约时间，其余信息将沿用原预约</p>
              </div>
              <button onClick={() => setShowReinitModal(false)} disabled={reinitiating} className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--nb-page)] disabled:opacity-50">
                <svg className="h-4 w-4 text-[var(--nb-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-4">
              <div className="rounded-[24px] bg-[var(--nb-page)]/80 p-4">
                <label className="mb-3 block text-sm font-medium text-[var(--nb-ink)]">预约日期</label>
                <input
                  type="date"
                  value={reinitForm.serviceDate}
                  min={dayjs().format('YYYY-MM-DD')}
                  onChange={(e) => setReinitForm((prev) => ({ ...prev, serviceDate: e.target.value }))}
                  className="w-full rounded-2xl bg-white px-4 py-3 text-[var(--nb-ink)] outline-none ring-1 ring-transparent focus:ring-[var(--nb-control)]/20"
                />
              </div>
              <div className="rounded-[24px] bg-[var(--nb-page)]/80 p-4">
                <label className="mb-3 block text-sm font-medium text-[var(--nb-ink)]">预约时间</label>
                <div className="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto scrollbar-hide">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setReinitForm((prev) => ({ ...prev, startTime: time }))}
                      className={`rounded-2xl py-2.5 text-sm font-medium transition ${
                        reinitForm.startTime === time
                          ? 'bg-[var(--nb-action)] text-white shadow-lg shadow-black/80'
                          : 'bg-white text-[var(--nb-secondary)]'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="shrink-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom)+1rem)] pt-2">
              <button
                onClick={handleReinitiate}
                disabled={reinitiating}
                className="w-full rounded-full bg-[var(--nb-action)] py-4 font-medium text-white shadow-lg shadow-black/5 disabled:opacity-50"
              >
                {reinitiating ? '提交中...' : '确认重新发起'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
          onClick={() => !rejecting && setShowRejectModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[32px] bg-white/95 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom)+1rem)] shadow-2xl ring-1 ring-black/5 backdrop-blur sm:rounded-[32px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--nb-ink)]">拒绝报价</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">告诉美甲师你为什么拒绝该报价</p>
              </div>
              <button onClick={() => setShowRejectModal(false)} disabled={rejecting} className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--nb-page)] disabled:opacity-50">
                <svg className="h-4 w-4 text-[var(--nb-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请输入拒绝原因（选填）"
              className="w-full rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-page)]/80 p-4 text-sm focus:border-[var(--nb-control)] focus:outline-none"
              rows={4}
            />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={() => setShowRejectModal(false)} disabled={rejecting} className="rounded-full bg-[var(--nb-page)] py-3.5 font-medium text-[var(--nb-ink)] disabled:opacity-50">
                暂不拒绝
              </button>
              <button onClick={handleRejectQuote} disabled={rejecting} className="rounded-full bg-[var(--nb-action)] py-3.5 font-medium text-white disabled:opacity-50">
                {rejecting ? '处理中...' : '确认拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
          onClick={() => !cancelling && setShowCancelModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[32px] bg-white/95 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom)+1rem)] shadow-2xl ring-1 ring-black/5 backdrop-blur sm:rounded-[32px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--nb-ink)]">取消预约</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">取消后预约将无法恢复，是否确认取消？</p>
              </div>
              <button onClick={() => setShowCancelModal(false)} disabled={cancelling} className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--nb-page)] disabled:opacity-50">
                <svg className="h-4 w-4 text-[var(--nb-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowCancelModal(false)} disabled={cancelling} className="rounded-full bg-[var(--nb-page)] py-3.5 font-medium text-[var(--nb-ink)] disabled:opacity-50">
                暂不取消
              </button>
              <button onClick={handleCancelOrder} disabled={cancelling} className="rounded-full bg-[var(--nb-action)] py-3.5 font-medium text-white disabled:opacity-50">
                {cancelling ? '处理中...' : '确认取消'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ActionConfirmDialog
        open={showAgreeConfirm}
        title="确认同意美甲师报价？"
        description="同意后将进入到美甲师确认环节。请确保你已知悉报价金额。"
        price={order?.quotePrice ?? null}
        details={[
          { label: '服务', value: order.serviceType || '美甲服务' },
          { label: '日期', value: dayjs(order.startTime).format('YYYY-MM-DD') },
          { label: '时间', value: dayjs(order.startTime).format('HH:mm') },
          { label: '地址', value: order.address || '—' },
        ]}
        confirmText="确认同意"
        loading={agreeing}
        onConfirm={handleAgreeQuote}
        onCancel={() => setShowAgreeConfirm(false)}
      />

      {/* Deposit confirm dialog */}
      {showDepositConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
          onClick={() => setShowDepositConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[32px] bg-white/95 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom)+1rem)] shadow-2xl ring-1 ring-black/5 backdrop-blur sm:rounded-[32px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-[var(--nb-ink)]">确认已支付定金</h3>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                请确认你已通过线下方式向美甲师支付了定金
              </p>
            </div>
            <div className="rounded-[24px] bg-[var(--nb-page)] p-4 mb-5">
              <p className="text-sm text-[var(--nb-secondary)]">定金金额</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--nb-ink)]">¥{order?.depositAmount || 0}</p>
              <p className="mt-2 text-xs text-[var(--nb-secondary)]">确认后将通知美甲师，美甲师确认收到后将接单</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowDepositConfirm(false)}
                className="rounded-full bg-[var(--nb-page)] py-3.5 font-medium text-[var(--nb-secondary)]"
              >
                取消
              </button>
              <button
                onClick={handleMarkDepositPaid}
                disabled={markingDeposit}
                className="rounded-full bg-[var(--nb-action)] py-3.5 font-semibold text-white shadow-md disabled:opacity-50"
              >
                {markingDeposit ? '处理中...' : '确认已付'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // 弹窗模式：底部 sheet 风格（与美甲师端一致）
  if (isModal) {
    const cancellable = ['pending_quote', 'pending_agree', 'pending_confirm', 'pending_home', 'pending_shop'].includes(order.status);
    const isClientTurn = order.status === 'pending_agree';
    const waiting = clientWaitingLabel(order.status);
    const canMarkDeposit = order.status === 'pending_confirm' && order.depositAmount > 0 && !order.isDepositPaid;

    return (
      <>
        <div
          className="fixed inset-0 z-[150] flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={handleBack}
        >
          <div
            className="w-full max-w-lg rounded-t-[28px] bg-white px-5 pt-5 shadow-[0_-12px_40px_rgba(0,0,0,0.12)] flex max-h-[88vh] flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            {/* Title row */}
            <div className="mb-4 flex items-center justify-between shrink-0">
              <h3 className="text-[17px] font-semibold text-[var(--nb-ink)]">预约详情</h3>
              <button
                type="button"
                onClick={handleBack}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--nb-page)] active:bg-[var(--nb-page)]"
              >
                <svg className="h-4 w-4 text-[var(--nb-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto pb-2">
              {/* Technician + status */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[16px] font-bold text-[var(--nb-ink)]">
                    {order.technician?.name || '美甲师'}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--nb-secondary)]">
                    {order.technician?.phone || '—'}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-medium ${STATUS_COLORS[order.status] || 'bg-[var(--nb-page)] text-[var(--nb-secondary)]'}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>

              {/* Time + Amount grid */}
              <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-[var(--nb-page)] p-3">
                  <p className="text-[12px] text-[var(--nb-secondary)]">预约时间</p>
                  <p className="mt-1 text-[14px] font-medium text-[var(--nb-ink)]">
                    {dayjs(order.startTime).format('HH:mm')} - {dayjs(order.endTime).format('HH:mm')}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--nb-muted)]">
                    {dayjs(order.startTime).format('YYYY-MM-DD')}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--nb-page)] p-3">
                  <p className="text-[12px] text-[var(--nb-secondary)]">预约金额</p>
                  <p className="mt-1 text-[14px] font-medium text-[var(--nb-secondary)]">
                    {order.quotePrice ? `¥${order.quotePrice}` : '待报价'}
                  </p>
                </div>
              </div>

              {/* Deposit info */}
              {order.depositAmount > 0 && (
                <div className="mb-4 rounded-2xl bg-[var(--nb-page)] p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] text-[var(--nb-secondary)]">定金（线下支付）</p>
                    <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${order.isDepositPaid ? 'bg-[var(--nb-page)] text-[var(--nb-secondary)]' : 'bg-[var(--nb-page)] text-[var(--nb-secondary)]'}`}>
                      {order.isDepositPaid ? '已确认' : '待支付'}
                    </span>
                  </div>
                  <p className="mt-1 text-[16px] font-semibold text-[var(--nb-ink)]">¥{order.depositAmount}</p>
                  <p className="mt-1 text-[11px] text-[var(--nb-secondary)]">
                    {order.isDepositPaid
                      ? '美甲师已确认收到定金'
                      : '请线下支付定金后，点击下方按钮确认'}
                  </p>
                </div>
              )}

              {/* Service info */}
              <div className="mb-4 rounded-2xl bg-[var(--nb-page)] p-4 text-sm text-[var(--nb-ink)]">
                <p className="font-medium text-[var(--nb-ink)]">服务信息</p>
                <p className="mt-2">
                  {order.customTitle || order.serviceType || '美甲服务'}
                </p>
                {order.serviceType && order.customTitle && (
                  <p className="mt-1 text-[12px] text-[var(--nb-secondary)]">{order.serviceType}</p>
                )}
                <p className="mt-2">{order.address || '地址待确认'}</p>
                {order.customDescription && (
                  <p className="mt-2 whitespace-pre-wrap text-[var(--nb-secondary)]">
                    需求描述：{order.customDescription}
                  </p>
                )}
                {order.customImages && order.customImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
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
                )}
                {order.remark && (
                  <p className="mt-2 text-[var(--nb-secondary)]">备注：{order.remark}</p>
                )}
                <p className="mt-3 text-[11px] text-[var(--nb-muted)]">预约编号：{order.orderNo}</p>
              </div>
            </div>

            {/* Send order card button */}
            {order.technician && (
              <div className="shrink-0 pt-3">
                <button
                  onClick={handleSendOrderCard}
                  disabled={sendingOrderCard}
                  className="w-full rounded-full bg-[var(--nb-action)] py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50"
                >
                  {sendingOrderCard ? '发送中...' : `发给 ${order.technician.name}`}
                </button>
              </div>
            )}

            {/* Bottom actions */}
            {(order.status !== 'completed' && order.status !== 'cancelled') && (
              <div className="shrink-0 pt-3">
                {order.status === 'expired' ? (
                  <button
                    onClick={() => setShowReinitModal(true)}
                    className="w-full rounded-full bg-[var(--nb-action)] py-3.5 text-sm font-semibold text-white shadow-md"
                  >
                    重新发起预约
                  </button>
                ) : isClientTurn ? (
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="rounded-full bg-[var(--nb-page)] py-3 text-sm font-medium text-[var(--nb-ink)]"
                    >
                      修改预约
                    </button>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="rounded-full bg-white py-3 text-sm font-medium text-[var(--nb-secondary)] ring-1 ring-[var(--nb-line)]"
                    >
                      取消预约
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="rounded-full bg-white py-3 text-sm font-medium text-[var(--nb-secondary)] ring-1 ring-[var(--nb-line)]"
                    >
                      拒绝报价
                    </button>
                    <button
                      onClick={() => setShowAgreeConfirm(true)}
                      disabled={agreeing}
                      className="rounded-full bg-[var(--nb-action)] py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50"
                    >
                      {agreeing ? '处理中' : '同意'}
                    </button>
                  </div>
                ) : canMarkDeposit ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowDepositConfirm(true)}
                      disabled={markingDeposit}
                      className="rounded-full bg-[var(--nb-action)] py-3.5 font-semibold text-white shadow-md disabled:opacity-50"
                    >
                      {markingDeposit ? '处理中...' : '已付定金'}
                    </button>
                    {cancellable && (
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="rounded-full bg-white py-3.5 font-medium text-[var(--nb-secondary)] ring-1 ring-[var(--nb-line)]"
                      >
                        取消预约
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={`grid gap-3 ${cancellable ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <button
                      disabled
                      className="rounded-full bg-[var(--nb-page)] py-3.5 font-medium text-[var(--nb-muted)] cursor-not-allowed"
                    >
                      {waiting || '处理中'}
                    </button>
                    {cancellable && (
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="rounded-full bg-white py-3.5 font-medium text-[var(--nb-secondary)] ring-1 ring-[var(--nb-line)]"
                      >
                        取消预约
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {commonModals}
      </>
    );
  }

  // 页面模式
  const containerClass = 'min-h-full bg-[var(--nb-page)]';

  return (
    <div className={containerClass}>
      {/* Header - 始终固定在顶部 */}
      <div className={`${isModal ? 'shrink-0' : 'sticky top-0'} z-10 border-b border-white/60 bg-white/78 px-5 ${isModal ? 'pt-5' : 'app-header-safe'} pb-5 backdrop-blur-xl`}>
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[var(--nb-ink)] shadow-[0_10px_24px_rgba(0,0,0,0.08)] ring-1 ring-black/5"
          >
            <svg className="w-5 h-5 text-[var(--nb-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Order Detail</p>
            <h1 className="mt-0.5 text-lg font-semibold text-[var(--nb-ink)]">预约详情</h1>
          </div>
        </div>
      </div>

      {/* Content - 弹窗模式下独立滚动 */}
      <div className={`space-y-4 px-5 pb-28 pt-6 ${isModal ? 'flex-1 overflow-y-auto' : ''}`}>
        {/* Status Card */}
        <div className="overflow-hidden rounded-[32px] bg-white/88 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Order Status</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--nb-ink)]">当前预约状态</h2>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-[var(--nb-page)] text-[var(--nb-secondary)]'}`}>
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>
          <div className="rounded-[24px] bg-[var(--nb-page)] p-5">
            <div className="text-[2rem] font-semibold leading-none tracking-[-0.04em] text-[var(--nb-ink)]">
              {order.quotePrice ? `¥${order.quotePrice}` : '待报价'}
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {order.quotePrice ? '当前报价金额' : '美甲师确认后会展示服务报价'}
            </p>
            {order.quoteRemark && (
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{order.quoteRemark}</p>
            )}
            {order.depositAmount > 0 && (
              <div className="mt-3 rounded-2xl bg-[var(--nb-page)] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--nb-secondary)]">定金（线下支付）</span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${order.isDepositPaid ? 'bg-[var(--nb-page)] text-[var(--nb-secondary)]' : 'bg-[var(--nb-page)] text-[var(--nb-secondary)]'}`}>
                    {order.isDepositPaid ? '已确认' : '待支付'}
                  </span>
                </div>
                <p className="mt-1 text-[15px] font-semibold text-[var(--nb-ink)]">¥{order.depositAmount}</p>
              </div>
            )}
            <div className="mt-4 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span className="rounded-full bg-white/90 px-3 py-1 ring-1 ring-black/5">预约编号</span>
              <span>{order.orderNo}</span>
            </div>
          </div>
        </div>

        {/* Service Info */}
        <div className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[var(--nb-ink)]">服务信息</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">查看预约服务类型、时间和备注说明</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3 rounded-2xl bg-[var(--nb-page)]/80 px-4 py-3">
              <span className="text-sm text-[var(--nb-secondary)]">服务类型</span>
              <span className="text-sm font-medium text-[var(--nb-ink)]">{order.serviceType || '美甲服务'}</span>
            </div>
            <div className="flex items-start justify-between gap-3 rounded-2xl bg-[var(--nb-page)]/80 px-4 py-3">
              <span className="text-sm text-[var(--nb-secondary)]">预约时间</span>
              <span className="text-right text-sm font-medium text-[var(--nb-ink)]">
                {dayjs(order.startTime).format('YYYY-MM-DD HH:mm')}
              </span>
            </div>
            {order.customTitle && (
              <div className="rounded-2xl bg-[var(--nb-page)]/80 px-4 py-3">
                <span className="text-sm text-[var(--nb-secondary)]">需求名称</span>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--nb-ink)]">{order.customTitle}</p>
              </div>
            )}
            {order.customDescription && (
              <div className="rounded-2xl bg-[var(--nb-page)]/80 px-4 py-3">
                <span className="text-sm text-[var(--nb-secondary)]">需求描述</span>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--nb-ink)]">
                  {order.customDescription}
                </p>
              </div>
            )}
            {order.customImages && order.customImages.length > 0 && (
              <div className="rounded-2xl bg-[var(--nb-page)]/80 px-4 py-3">
                <span className="text-sm text-[var(--nb-secondary)]">参考图</span>
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
              <div className="rounded-2xl bg-[var(--nb-page)]/80 px-4 py-3">
                <span className="text-sm text-[var(--nb-secondary)]">备注</span>
                <p className="mt-1 text-sm leading-6 text-[var(--nb-ink)]">{order.remark}</p>
              </div>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[var(--nb-ink)]">服务地址</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {order.serviceType === '到店美甲' ? '到店服务请前往以下门店地址' : '上门服务会按这个地址安排到访'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--nb-page)]">
              <svg className="w-4 h-4 text-[var(--nb-ink)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm leading-6 text-[var(--nb-ink)]">{order.address || '地址待确认'}</p>
              {order.clientAddress?.doorInfo && (
                <p className="mt-2 text-xs text-[var(--nb-secondary)]">{order.clientAddress.doorInfo}</p>
              )}
            </div>
          </div>
        </div>

        {/* Technician Info */}
        <div className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[var(--nb-ink)]">服务美甲师</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">与你本次预约关联的专属美甲师</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[var(--nb-page)]">
              <svg className="w-6 h-6 text-[var(--nb-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--nb-ink)]">{order.technician?.name}</p>
              <p className="mt-1 text-xs text-[var(--nb-secondary)]">{order.technician?.phone}</p>
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
        if (order.status === 'completed' || order.status === 'cancelled' || showEditModal) {
          return null;
        }

        const isClientTurn = order.status === 'pending_agree';
        const cancellable = ['pending_quote', 'pending_agree', 'pending_confirm', 'pending_home', 'pending_shop'].includes(order.status);
        const waitingLabel = clientWaitingLabel(order.status);
        const canMarkDeposit = order.status === 'pending_confirm' && order.depositAmount > 0 && !order.isDepositPaid;

        return (
          <div className="fixed bottom-0 left-0 right-0 border-t border-white/60 bg-white/88 px-5 py-4 safe-area-bottom backdrop-blur-xl">
            <div className="mx-auto max-w-md">
              {order.technician && (
                <button
                  onClick={handleSendOrderCard}
                  disabled={sendingOrderCard}
                  className="mb-3 w-full rounded-full bg-[var(--nb-action)] py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50"
                >
                  {sendingOrderCard ? '发送中...' : `发给 ${order.technician.name}`}
                </button>
              )}
              {order.status === 'expired' ? (
                // 已过期：仅展示「重新发起预约」
                <button
                  onClick={() => setShowReinitModal(true)}
                  className="w-full rounded-full bg-[var(--nb-action)] py-3.5 text-sm font-semibold text-white shadow-md"
                >
                  重新发起预约
                </button>
              ) : isClientTurn ? (
                // 用户该操作：同意 / 拒绝 / 修改 / 取消
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="rounded-full bg-[var(--nb-page)] py-3 text-sm font-medium text-[var(--nb-ink)]"
                  >
                    修改预约
                  </button>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="rounded-full bg-white py-3 text-sm font-medium text-[var(--nb-secondary)] ring-1 ring-[var(--nb-line)]"
                  >
                    取消预约
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="rounded-full bg-white py-3 text-sm font-medium text-[var(--nb-secondary)] ring-1 ring-[var(--nb-line)]"
                  >
                    拒绝报价
                  </button>
                  <button
                    onClick={() => setShowAgreeConfirm(true)}
                    disabled={agreeing}
                    className="rounded-full bg-[var(--nb-action)] py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50"
                  >
                    {agreeing ? '处理中' : '同意'}
                  </button>
                </div>
              ) : canMarkDeposit ? (
                // 需要确认定金
                <div className={`grid gap-3 ${cancellable ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <button
                    onClick={() => setShowDepositConfirm(true)}
                    disabled={markingDeposit}
                    className="rounded-full bg-[var(--nb-action)] py-3.5 font-semibold text-white shadow-md disabled:opacity-50"
                  >
                    {markingDeposit ? '处理中...' : '已付定金'}
                  </button>
                  {cancellable && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="rounded-full bg-white py-3.5 font-medium text-[var(--nb-secondary)] ring-1 ring-[var(--nb-line)]"
                    >
                      取消预约
                    </button>
                  )}
                </div>
              ) : (
                // 等待对方：禁用主按钮 + 取消预约
                <div className={`grid gap-3 ${cancellable ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <button
                    disabled
                    className="rounded-full bg-[var(--nb-page)] py-3.5 font-medium text-[var(--nb-muted)] cursor-not-allowed"
                  >
                    {waitingLabel || '处理中'}
                  </button>
                  {cancellable && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="rounded-full bg-white py-3.5 font-medium text-[var(--nb-secondary)] ring-1 ring-[var(--nb-line)]"
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
      {commonModals}
    </div>
  );
};

export default OrderDetail;
