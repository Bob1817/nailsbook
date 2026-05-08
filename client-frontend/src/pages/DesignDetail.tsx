import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { designService, type DesignRequest, type UpdateDesignDto, type ShopAddress } from '../services/design';
import { addressService, type ClientAddress } from '../services/address';
import { bookingService } from '../services/booking';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const getEnabledShopAddresses = (addresses?: ShopAddress[]) =>
  (addresses || []).filter((item) => item.enabled !== false);

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const getShopHoursForDate = (shopAddress: ShopAddress | null, serviceDate: string) => {
  if (!shopAddress?.businessHours || !serviceDate) {
    return null;
  }

  const weekday = new Date(`${serviceDate}T00:00:00`).getDay();
  return shopAddress.businessHours.find((item) => item.weekday === weekday) || null;
};

const DesignDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { technicians } = useAuth();
  const [design, setDesign] = useState<DesignRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [requestingQuote, setRequestingQuote] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Technician switch modal state
  const [showTechModal, setShowTechModal] = useState(false);
  const [switchingTech, setSwitchingTech] = useState(false);

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingStep, setBookingStep] = useState<'type' | 'datetime' | 'address'>('type');
  const [selectedServiceType, setSelectedServiceType] = useState<'home' | 'shop' | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedShopAddress, setSelectedShopAddress] = useState<ShopAddress | null>(null);
  const [selectedClientAddress, setSelectedClientAddress] = useState<ClientAddress | null>(null);
  const [clientAddresses, setClientAddresses] = useState<ClientAddress[]>([]);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const selectedShopHours = getShopHoursForDate(selectedShopAddress, selectedDate);

  useEffect(() => {
    if (id) {
      loadDesign(parseInt(id));
    }
  }, [id]);

  const loadDesign = async (designId: number) => {
    try {
      const data = await designService.getDesign(designId);
      setDesign(data);
      // Initialize edit form values
      setEditTitle(data.title || '');
      setEditDescription(data.description || '');
    } catch (error) {
      console.error('Failed to load design:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!id) return;
    setSavingEdit(true);
    try {
      const updateData: UpdateDesignDto = {
        title: editTitle.trim() || undefined,
        description: editDescription.trim() || undefined,
      };
      await designService.updateDesign(parseInt(id), updateData);
      setShowEditModal(false);
      navigate('/designs');
    } catch (error: any) {
      alert(error.response?.data?.message || '更新设计失败');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await designService.deleteDesign(parseInt(id));
      setShowDeleteModal(false);
      navigate('/designs');
    } catch (error: any) {
      alert(error.response?.data?.message || '删除设计失败');
      setDeleting(false);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending_quote': '待报价',
      'quoted': '已报价',
      'accepted': '已接受',
      'rejected': '已拒绝',
      'converted': '已转预约',
      'cancelled': '已取消',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'pending_quote': 'text-amber-600 bg-amber-50',
      'quoted': 'text-blue-600 bg-blue-50',
      'accepted': 'text-emerald-600 bg-emerald-50',
      'rejected': 'text-red-600 bg-red-50',
      'converted': 'text-purple-600 bg-purple-50',
      'cancelled': 'text-slate-400 bg-slate-100',
    };
    return colorMap[status] || 'text-slate-600 bg-slate-100';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_quote':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'quoted':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'accepted':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'converted':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const handleRequestQuote = async () => {
    if (!id) return;
    setRequestingQuote(true);
    try {
      await designService.requestQuote(parseInt(id));
      // 刷新设计详情
      await loadDesign(parseInt(id));
      setShowQuoteModal(false);
      alert('报价请求已发送给美甲师');
    } catch (error: any) {
      alert(error.response?.data?.message || '发送报价请求失败');
    } finally {
      setRequestingQuote(false);
    }
  };

  const handleAcceptQuote = async () => {
    if (!id || !design?.quotePrice) return;
    try {
      await designService.acceptQuote(parseInt(id));
      await loadDesign(parseInt(id));
      // Show booking modal after accepting quote
      setShowBookingModal(true);
      setBookingStep('type');
    } catch (error: any) {
      alert(error.response?.data?.message || '接受报价失败');
    }
  };

  const handleRejectQuote = async () => {
    if (!id) return;
    try {
      await designService.rejectQuote(parseInt(id));
      await loadDesign(parseInt(id));
      alert('报价已拒绝');
    } catch (error: any) {
      alert(error.response?.data?.message || '拒绝报价失败');
    }
  };

  // Booking handlers
  const handleOpenBooking = async () => {
    setShowBookingModal(true);
    setBookingStep('type');
    setSelectedServiceType(null);
    setSelectedDate('');
    setSelectedTime('');
    setSelectedShopAddress(null);
    setSelectedClientAddress(null);
    setBookingError('');

    // Load client addresses for home service
    try {
      const addresses = await addressService.getAddresses();
      setClientAddresses(addresses);
    } catch (error) {
      console.error('Failed to load addresses:', error);
    }
  };

  const handleCreateBooking = async () => {
    if (!id || !design?.technician) return;

    if (!selectedServiceType) {
      setBookingError('请选择服务类型');
      return;
    }

    if (!selectedDate || !selectedTime) {
      setBookingError('请选择预约时间');
      return;
    }

    if (selectedServiceType === 'shop' && !selectedShopAddress) {
      setBookingError('请选择店铺地址');
      return;
    }

    if (selectedServiceType === 'shop' && selectedShopHours) {
      if (selectedShopHours.closed) {
        setBookingError('所选日期为该店铺休息日，请改选其他日期');
        return;
      }

      const bookingMinutes = timeToMinutes(selectedTime);
      const startMinutes = timeToMinutes(selectedShopHours.start);
      const endMinutes = timeToMinutes(selectedShopHours.end);

      if (bookingMinutes < startMinutes || bookingMinutes >= endMinutes) {
        setBookingError('预约时间不在店铺营业时间内');
        return;
      }
    }

    if (selectedServiceType === 'home' && !selectedClientAddress) {
      setBookingError('请选择上门地址');
      return;
    }

    setCreatingBooking(true);
    setBookingError('');

    try {
      const addressId = selectedServiceType === 'home' ? selectedClientAddress!.id : 0;
      await bookingService.createBookingFromDesign({
        designId: parseInt(id),
        techId: design.technician.id,
        serviceDate: selectedDate,
        startTime: selectedTime,
        serviceType: selectedServiceType === 'home' ? '上门美甲' : '到店美甲',
        addressId,
        shopAddress: selectedServiceType === 'shop' ? (selectedShopAddress ?? undefined) : undefined,
      });

      setShowBookingModal(false);
      navigate('/bookings');
    } catch (error: any) {
      setBookingError(error.response?.data?.message || '创建预约失败');
    } finally {
      setCreatingBooking(false);
    }
  };

  const getAvailableServiceTypes = () => {
    const types: Array<{ type: 'home' | 'shop'; label: string; icon: string }> = [];
    if (design?.technician?.status === 'active' && design?.technician?.homeService) {
      types.push({ type: 'home', label: '上门美甲', icon: '🚗' });
    }
    if (design?.technician?.status === 'active' && design?.technician?.shopService && getEnabledShopAddresses(design?.technician?.shopAddresses).length > 0) {
      types.push({ type: 'shop', label: '到店美甲', icon: '🏪' });
    }
    return types;
  };

  const canCreateBooking = design?.status === 'accepted' && getAvailableServiceTypes().length > 0;

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!design) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <p className="text-[var(--color-text-muted)]">设计不存在</p>
          <button
            onClick={() => navigate('/designs')}
            className="mt-4 px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-full"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#fff8fa_0%,#f8f9fc_24%,#f5f6f8_100%)] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/82 px-5 app-header-safe pb-4 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white shadow-sm ring-1 ring-black/5 flex items-center justify-center active:scale-95 transition-transform"
            >
              <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Design Detail</p>
              <h1 className="mt-0.5 text-heading-2 text-[var(--color-text)]">设计详情</h1>
            </div>
          </div>

          {/* Edit & Delete Actions - Only show for pending_quote status */}
          {design.status === 'pending_quote' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="w-10 h-10 rounded-full bg-white shadow-sm ring-1 ring-black/5 flex items-center justify-center active:scale-95 transition-transform"
              >
                <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-10 h-10 rounded-full bg-white shadow-sm ring-1 ring-black/5 flex items-center justify-center active:scale-95 transition-transform"
              >
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Status Card */}
        <div className="bg-white rounded-[28px] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getStatusColor(design.status)}`}>
              {getStatusIcon(design.status)}
            </div>
            <div className="flex-1">
              <p className="text-caption text-[var(--color-text-muted)]">当前状态</p>
              <p className={`text-body font-medium ${getStatusColor(design.status).split(' ')[0]}`}>
                {getStatusText(design.status)}
              </p>
            </div>
            <span className="text-caption text-[var(--color-text-muted)]">
              {dayjs(design.createdAt).format('MM-DD HH:mm')}
            </span>
          </div>
        </div>

        {/* Images Gallery */}
        {design.imageUrls.length > 0 && (
          <div className="bg-white rounded-[28px] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
            <h3 className="text-body font-medium text-[var(--color-text)] mb-4">设计图片</h3>
            <div className="grid grid-cols-3 gap-2">
              {design.imageUrls.map((url, index) => (
                <div key={index} className="aspect-square rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={url}
                    alt={`设计图片${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technician Info */}
        {design.technician && (
          <div className="bg-white rounded-[28px] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-body font-medium text-[var(--color-text)]">服务美甲师</h3>
              {technicians && technicians.length > 1 && design.status === 'pending_quote' && (
                <button
                  onClick={() => setShowTechModal(true)}
                  className="text-caption text-[var(--color-primary)] flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  切换美甲师
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                {design.technician.avatarUrl ? (
                  <img src={design.technician.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-body font-medium text-[var(--color-text)]">{design.technician.name}</p>
                <p className="text-caption text-[var(--color-text-muted)]">专属美甲师</p>
              </div>
              <button
                onClick={() => navigate(`/chat?tech_id=${design.technician?.id}`)}
                className="ml-auto px-4 py-2 bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-body-sm font-medium rounded-full"
              >
                联系
              </button>
            </div>
          </div>
        )}

        {/* Quote Section */}
        {design.status === 'pending_quote' && (
          <div className="bg-white rounded-[28px] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-body font-medium text-[var(--color-text)]">等待报价</p>
                <p className="text-caption text-[var(--color-text-muted)]">向美甲师发起报价请求</p>
              </div>
            </div>
            <button
              onClick={() => setShowQuoteModal(true)}
              className="w-full py-3.5 bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] text-white text-body font-medium rounded-full active:scale-95 transition-transform shadow-lg shadow-pink-200"
            >
              发起报价
            </button>
          </div>
        )}

        {/* Quote Info - When quoted */}
        {design.quotePrice && (
          <div className="bg-white rounded-[28px] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
            <h3 className="text-body font-medium text-[var(--color-text)] mb-4">报价信息</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#FF6B8A]/10 to-[#FF8FA3]/10 rounded-xl">
                <span className="text-body text-[var(--color-text)]">报价金额</span>
                <span className="text-heading-1 text-[var(--color-primary)]">¥{design.quotePrice}</span>
              </div>
              {design.quoteRemark && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-caption text-[var(--color-text-muted)] mb-2">报价说明</p>
                  <p className="text-body-sm text-[var(--color-text)]">{design.quoteRemark}</p>
                </div>
              )}
            </div>

            {/* Action Buttons based on status */}
            {design.status === 'quoted' && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleRejectQuote}
                  className="flex-1 py-3 bg-slate-100 text-[var(--color-text)] text-body font-medium rounded-full active:scale-95 transition-transform"
                >
                  拒绝报价
                </button>
                <button
                  onClick={handleAcceptQuote}
                  className="flex-1 py-3 bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] text-white text-body font-medium rounded-full active:scale-95 transition-transform shadow-lg shadow-pink-200"
                >
                  接受报价
                </button>
              </div>
            )}

            {canCreateBooking && (
              <button
                onClick={handleOpenBooking}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-body font-medium rounded-full active:scale-95 transition-transform shadow-lg shadow-emerald-200"
              >
                立即预约
              </button>
            )}
            {design.status === 'accepted' && !canCreateBooking && (
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
                当前美甲师未开启可预约服务，暂时无法从该设计发起预约。
              </div>
            )}
          </div>
        )}

        {/* Converted Status */}
        {design.status === 'converted' && (
          <div className="bg-white rounded-[28px] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-body font-medium text-[var(--color-text)]">已转为预约</p>
                <p className="text-caption text-[var(--color-text-muted)]">此设计已生成预约订单</p>
              </div>
              <button
                onClick={() => navigate('/bookings')}
                className="px-4 py-2 bg-purple-50 text-purple-600 text-body-sm font-medium rounded-full"
              >
                查看预约
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quote Request Modal */}
      {showQuoteModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-5"
          onClick={() => setShowQuoteModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-body font-medium text-[var(--color-text)] mb-2">发起报价请求</h3>
              <p className="text-caption text-[var(--color-text-muted)]">
                将向美甲师发送报价请求，美甲师会根据您的设计需求给出报价
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuoteModal(false)}
                className="flex-1 py-3 bg-slate-100 text-[var(--color-text)] text-body font-medium rounded-full active:scale-95 transition-transform"
              >
                取消
              </button>
              <button
                onClick={handleRequestQuote}
                disabled={requestingQuote}
                className="flex-1 py-3 bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] text-white text-body font-medium rounded-full active:scale-95 transition-transform disabled:opacity-50"
              >
                {requestingQuote ? '发送中...' : '确认发送'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-5"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-body font-medium text-[var(--color-text)] mb-2">编辑设计</h3>
              <p className="text-caption text-[var(--color-text-muted)]">
                修改设计作品的标题和描述
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">标题</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="输入设计标题"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-primary)] focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">描述</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="输入设计描述"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-primary)] focus:outline-none text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 bg-slate-100 text-[var(--color-text)] text-body font-medium rounded-full active:scale-95 transition-transform"
              >
                取消
              </button>
              <button
                onClick={handleEdit}
                disabled={savingEdit}
                className="flex-1 py-3 bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] text-white text-body font-medium rounded-full active:scale-95 transition-transform disabled:opacity-50"
              >
                {savingEdit ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-5"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-body font-medium text-[var(--color-text)] mb-2">确认删除</h3>
              <p className="text-caption text-[var(--color-text-muted)]">
                删除后无法恢复，是否确认删除该设计？
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-slate-100 text-[var(--color-text)] text-body font-medium rounded-full active:scale-95 transition-transform"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-red-500 text-white text-body font-medium rounded-full active:scale-95 transition-transform disabled:opacity-50"
              >
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Technician Switch Modal */}
      {showTechModal && technicians && technicians.length > 1 && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-5"
          onClick={() => setShowTechModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-body font-medium text-[var(--color-text)] mb-2">切换美甲师</h3>
              <p className="text-caption text-[var(--color-text-muted)]">
                选择其他已绑定的美甲师为您服务
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {technicians.map((tech) => (
                <button
                  key={tech.id}
                  onClick={async () => {
                    if (!id || tech.id === design?.technician?.id) return;
                    setSwitchingTech(true);
                    try {
                      await designService.switchTechnician(parseInt(id), tech.id);
                      setShowTechModal(false);
                      navigate('/designs');
                    } catch (error: any) {
                      alert(error.response?.data?.message || '切换美甲师失败');
                    } finally {
                      setSwitchingTech(false);
                    }
                  }}
                  disabled={tech.id === design?.technician?.id || switchingTech}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    tech.id === design?.technician?.id
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  } ${switchingTech ? 'opacity-50' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                    {tech.avatarUrl ? (
                      <img src={tech.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-body font-medium text-[var(--color-text)]">{tech.name}</p>
                    <p className="text-caption text-[var(--color-text-muted)]">
                      {tech.isDefault ? '默认美甲师' : tech.bindSource === 'invite' ? '邀请绑定' : '手动绑定'}
                    </p>
                  </div>
                  {tech.id === design?.technician?.id && (
                    <span className="text-caption text-[var(--color-primary)]">当前</span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowTechModal(false)}
              className="w-full py-3 bg-slate-100 text-[var(--color-text)] text-body font-medium rounded-full active:scale-95 transition-transform"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && design?.technician && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">发起预约</h2>
                <p className="text-sm text-gray-500 mt-1">
                  为「{design.title || '设计作品'}」创建预约
                </p>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {bookingError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">
                  {bookingError}
                </div>
              )}

              {/* Step 1: Service Type */}
              {bookingStep === 'type' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">选择服务类型</h3>
                  <div className="space-y-3">
                    {getAvailableServiceTypes().map((type) => (
                      <button
                        key={type.type}
                        onClick={() => {
                          setSelectedServiceType(type.type);
                          setBookingStep('datetime');
                        }}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                          selectedServiceType === type.type
                            ? 'border-pink-500 bg-pink-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-3xl">{type.icon}</span>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900">{type.label}</p>
                          <p className="text-xs text-gray-500">
                            {type.type === 'home' ? '美甲师上门为您服务' : '到美甲师店铺接受服务'}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedServiceType === type.type ? 'border-pink-500 bg-pink-500' : 'border-gray-300'
                        }`}>
                          {selectedServiceType === type.type && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Date & Time */}
              {bookingStep === 'datetime' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">选择日期</h3>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={dayjs().format('YYYY-MM-DD')}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">选择时间</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedTime === time
                              ? 'bg-pink-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setBookingStep(selectedServiceType === 'shop' ? 'address' : 'address')}
                    disabled={!selectedDate || !selectedTime}
                    className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-xl disabled:opacity-50"
                  >
                    下一步
                  </button>
                </div>
              )}

              {/* Step 3: Address Selection */}
              {bookingStep === 'address' && (
                <div className="space-y-4">
                  {selectedServiceType === 'shop' ? (
                    <>
                      <h3 className="text-sm font-medium text-gray-700">选择店铺地址</h3>
                      <div className="space-y-3">
                        {getEnabledShopAddresses(design.technician?.shopAddresses).map((address, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedShopAddress(address)}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                              selectedShopAddress === address
                                ? 'border-pink-500 bg-pink-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-pink-500 text-sm">{index + 1}</span>
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{address.name}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {[address.province, address.city, address.district, address.detailAddress]
                                    .filter(Boolean)
                                    .join(' ')}
                                </p>
                                {address.phone && (
                                  <p className="text-xs text-gray-400 mt-1">{address.phone}</p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      {selectedShopAddress && selectedDate && selectedShopHours && (
                        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                          {selectedShopHours.closed
                            ? '所选日期为该店铺休息日，请改选其他日期'
                            : `店铺营业时间：${selectedShopHours.start} - ${selectedShopHours.end}`}
                        </div>
                      )}
                      {getEnabledShopAddresses(design.technician?.shopAddresses).length === 0 && (
                        <div className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-400">
                          该美甲师当前没有可预约的启用门店
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-700">选择上门地址</h3>
                        <button
                          onClick={() => navigate('/addresses')}
                          className="text-sm text-pink-500 font-medium"
                        >
                          管理地址
                        </button>
                      </div>
                      <div className="space-y-3">
                        {clientAddresses.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-gray-500 mb-4">暂无地址，请先添加地址</p>
                            <button
                              onClick={() => navigate('/addresses')}
                              className="px-6 py-2 bg-pink-500 text-white rounded-full text-sm"
                            >
                              去添加地址
                            </button>
                          </div>
                        ) : (
                          clientAddresses.map((address) => (
                            <button
                              key={address.id}
                              onClick={() => setSelectedClientAddress(address)}
                              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                selectedClientAddress?.id === address.id
                                  ? 'border-pink-500 bg-pink-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900">{address.contactName || '未命名地址'}</p>
                                    {address.isDefault && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded">默认</span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {[address.province, address.city, address.district, address.detailAddress]
                                      .filter(Boolean)
                                      .join(' ')}
                                  </p>
                                  {address.contactPhone && (
                                    <p className="text-xs text-gray-400 mt-1">{address.contactPhone}</p>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  <button
                    onClick={handleCreateBooking}
                    disabled={
                      creatingBooking ||
                      (selectedServiceType === 'shop' && !selectedShopAddress) ||
                      (selectedServiceType === 'home' && !selectedClientAddress)
                    }
                    className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-xl disabled:opacity-50 mt-6"
                  >
                    {creatingBooking ? '创建中...' : '确认预约'}
                  </button>
                </div>
              )}
            </div>

            {/* Progress Indicator */}
            <div className="px-6 py-4 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2">
                {['type', 'datetime', 'address'].map((step, index) => (
                  <React.Fragment key={step}>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        bookingStep === step
                          ? 'bg-pink-500 w-6'
                          : ['type', 'datetime', 'address'].indexOf(bookingStep) > index
                          ? 'bg-pink-300'
                          : 'bg-gray-200'
                      }`}
                    />
                  </React.Fragment>
                ))}
              </div>
              <p className="text-center text-xs text-gray-400 mt-2">
                步骤 {['type', 'datetime', 'address'].indexOf(bookingStep) + 1} / 3
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-border-light)] px-5 py-4 safe-area-bottom">
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/chat')}
            className="flex-1 py-3.5 bg-slate-100 text-[var(--color-text)] text-body font-medium rounded-full active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            联系美甲师
          </button>
          {design.status === 'pending_quote' && (
            <button
              onClick={() => setShowQuoteModal(true)}
              className="flex-1 py-3.5 bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] text-white text-body font-medium rounded-full active:scale-95 transition-transform shadow-lg shadow-pink-200"
            >
              发起报价
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignDetail;
