import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingService, type Booking } from '../services/booking';
import { addressService, type ClientAddress } from '../services/address';
import dayjs from 'dayjs';

const BookingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<ClientAddress[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmingBooking, setConfirmingBooking] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editForm, setEditForm] = useState({
    serviceDate: '',
    startTime: '',
    addressId: 0,
  });

  useEffect(() => {
    if (id) {
      loadBooking(parseInt(id));
    }
  }, [id]);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadBooking = async (bookingId: number) => {
    try {
      const data = await bookingService.getBooking(bookingId);
      setBooking(data);
    } catch (error) {
      console.error('Failed to load booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
    } catch (error) {
      console.error('Failed to load addresses:', error);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending_quote': '待报价',
      'quoted': '已报价',
      'pending_deposit': '待付定金',
      'deposit_paid': '已付定金',
      'confirmed': '已预约',
      'in_service': '服务中',
      'completed': '已完成',
      'cancelled': '已取消',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'pending_quote': 'text-orange-500',
      'quoted': 'text-blue-500',
      'pending_deposit': 'text-purple-500',
      'deposit_paid': 'text-green-500',
      'confirmed': 'text-green-500',
      'in_service': 'text-blue-500',
      'completed': 'text-gray-500',
      'cancelled': 'text-gray-400',
    };
    return colorMap[status] || 'text-gray-500';
  };

  const canEditBooking = booking ? ['pending_quote', 'quoted', 'confirmed'].includes(booking.status) : false;
  const canHandleExpiredStatus = booking
    ? booking.status === 'confirmed' && dayjs(booking.startTime).isBefore(dayjs())
    : false;
  const serviceContent = booking?.quote?.title || booking?.serviceType || '待确认';

  const openEditModal = () => {
    if (!booking) {
      return;
    }
    setEditForm({
      serviceDate: dayjs(booking.startTime).format('YYYY-MM-DD'),
      startTime: dayjs(booking.startTime).format('HH:mm'),
      addressId: booking.clientAddress?.id || 0,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!booking) {
      return;
    }
    if (!editForm.serviceDate || !editForm.startTime || !editForm.addressId) {
      alert('请先选择预约时间和服务地址');
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await bookingService.updateBooking(booking.id, editForm);
      setBooking(updated);
      setShowEditModal(false);
    } catch (error: any) {
      alert(error.response?.data?.message || '修改预约失败');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!booking) {
      return;
    }

    setConfirmingBooking(true);
    try {
      const updated = await bookingService.confirmBooking(booking.id);
      setBooking(updated);
      setShowConfirmModal(false);
      alert('预约已确认');
    } catch (error: any) {
      alert(error.response?.data?.message || '确认预约失败');
    } finally {
      setConfirmingBooking(false);
    }
  };

  const handleUpdateBookingStatus = async (status: 'completed' | 'cancelled') => {
    if (!booking) {
      return;
    }

    setUpdatingStatus(true);
    try {
      const updated = await bookingService.updateBookingStatus(booking.id, { status });
      setBooking(updated);
      setShowStatusModal(false);
      alert(status === 'completed' ? '预约已更新为已完成' : '预约已更新为已取消');
    } catch (error: any) {
      alert(error.response?.data?.message || '更新预约状态失败');
    } finally {
      setUpdatingStatus(false);
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

  if (!booking) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">预约不存在</p>
          <button
            onClick={() => navigate('/bookings')}
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
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Booking Detail</p>
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
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Booking Status</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-gray-900">当前预约状态</h2>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(booking.status)} bg-white shadow-sm ring-1 ring-black/5`}>
              {getStatusText(booking.status)}
            </span>
          </div>
          <div className="rounded-[24px] bg-[linear-gradient(135deg,#FFF0F5_0%,#F9FBFF_100%)] p-5">
            <div className="text-[2rem] font-semibold leading-none tracking-[-0.04em] text-gray-900">
              {booking.quotePrice ? `¥${booking.quotePrice}` : '待报价'}
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {booking.quotePrice ? '当前报价金额' : '美甲师确认后会展示服务报价'}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span className="rounded-full bg-white/90 px-3 py-1 ring-1 ring-black/5">预约编号</span>
              <span>{booking.bookingNo}</span>
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
              <span className="text-sm font-medium text-gray-900">{booking.serviceType || '美甲服务'}</span>
            </div>
            <div className="rounded-2xl bg-slate-50/80 px-4 py-3">
              <span className="text-sm text-gray-500">服务内容</span>
              <p className="mt-1 text-sm leading-6 font-medium text-gray-900">{serviceContent}</p>
            </div>
            <div className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50/80 px-4 py-3">
              <span className="text-sm text-gray-500">预约时间</span>
              <span className="text-right text-sm font-medium text-gray-900">
                {dayjs(booking.startTime).format('YYYY-MM-DD HH:mm')}
              </span>
            </div>
            {booking.remark && (
              <div className="rounded-2xl bg-slate-50/80 px-4 py-3">
                <span className="text-sm text-gray-500">备注</span>
                <p className="mt-1 text-sm leading-6 text-gray-900">{booking.remark}</p>
              </div>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">服务地址</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {booking.serviceType === '到店美甲' ? '到店服务请前往以下门店地址' : '上门服务会按这个地址安排到访'}
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
              <p className="text-sm leading-6 text-gray-900">{booking.address || '地址待确认'}</p>
              {booking.clientAddress?.doorInfo && (
                <p className="mt-2 text-xs text-gray-500">{booking.clientAddress.doorInfo}</p>
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
              <p className="text-sm font-medium text-gray-900">{booking.technician?.name}</p>
              <p className="mt-1 text-xs text-gray-500">{booking.technician?.phone}</p>
            </div>
          </div>
            {booking.technician?.id && (
              <button
                onClick={() => navigate(`/chat/direct?tech_id=${booking.technician?.id}`)}
                className="shrink-0 rounded-full bg-[var(--color-primary-soft)] px-4 py-2 text-sm font-medium text-[var(--color-primary)]"
              >
                发消息
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/60 bg-white/88 px-5 py-4 safe-area-bottom backdrop-blur-xl">
        <div
          className={`mx-auto grid max-w-md gap-3 ${
            booking.status === 'quoted'
              ? 'grid-cols-3'
              : canEditBooking && canHandleExpiredStatus
                ? 'grid-cols-3'
                : canEditBooking || canHandleExpiredStatus
                  ? 'grid-cols-2'
                  : 'grid-cols-1'
          }`}
        >
          <button
            onClick={() => navigate('/chat')}
            className="rounded-full bg-slate-100 py-3.5 font-medium text-gray-700"
          >
            联系美甲师
          </button>
          {canEditBooking && (
            <button
              onClick={openEditModal}
              className="rounded-full bg-white py-3.5 font-medium text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20"
            >
              修改预约
            </button>
          )}
          {canHandleExpiredStatus && (
            <button
              onClick={() => setShowStatusModal(true)}
              className="rounded-full bg-white py-3.5 font-medium text-slate-700 ring-1 ring-black/10"
            >
              处理状态
            </button>
          )}
          {booking.status === 'quoted' && (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="rounded-full bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] py-3.5 font-medium text-white shadow-lg shadow-pink-200"
            >
              确认预约
            </button>
          )}
        </div>
      </div>

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

      {showStatusModal && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
          onClick={() => setShowStatusModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[32px] bg-white/95 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom)+1rem)] shadow-2xl ring-1 ring-black/5 backdrop-blur sm:rounded-[32px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">处理预约状态</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">预约时间已过，若美甲师仍未更新状态，你可以手动处理本次预约</p>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              >
                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="rounded-[24px] bg-slate-50/80 p-4">
              <p className="text-sm text-slate-500">当前预约时间</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{dayjs(booking.startTime).format('YYYY-MM-DD HH:mm')}</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => void handleUpdateBookingStatus('cancelled')}
                disabled={updatingStatus}
                className="rounded-full bg-slate-100 py-3.5 font-medium text-slate-700 disabled:opacity-60"
              >
                {updatingStatus ? '处理中...' : '标记取消'}
              </button>
              <button
                onClick={() => void handleUpdateBookingStatus('completed')}
                disabled={updatingStatus}
                className="rounded-full bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] py-3.5 font-medium text-white shadow-lg shadow-pink-200 disabled:opacity-60"
              >
                {updatingStatus ? '处理中...' : '标记完成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
          onClick={() => !confirmingBooking && setShowConfirmModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[32px] bg-white/95 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom)+1rem)] shadow-2xl ring-1 ring-black/5 backdrop-blur sm:rounded-[32px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">确认预约</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">确认后将锁定当前预约时间，并进入已预约状态</p>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={confirmingBooking}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 disabled:opacity-50"
              >
                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="rounded-[24px] bg-slate-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">预约时间</p>
                  <p className="mt-2 text-sm font-medium text-gray-900">{dayjs(booking.startTime).format('YYYY-MM-DD HH:mm')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">服务地址</p>
                  <p className="mt-2 text-sm font-medium text-gray-900">{booking.address || '地址待确认'}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={confirmingBooking}
                className="rounded-full bg-slate-100 py-3.5 font-medium text-gray-700 disabled:opacity-50"
              >
                暂不确认
              </button>
              <button
                onClick={handleConfirmBooking}
                disabled={confirmingBooking}
                className="rounded-full bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] py-3.5 font-medium text-white shadow-lg shadow-pink-200 disabled:opacity-50"
              >
                {confirmingBooking ? '确认中...' : '确认预约'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetail;
