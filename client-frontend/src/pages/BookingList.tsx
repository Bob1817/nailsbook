import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService, type Booking } from '../services/booking';
import dayjs from 'dayjs';

const BookingList: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const data = await bookingService.getBookings();
      setBookings(data);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
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
      'pending_quote': 'text-amber-600 bg-amber-50',
      'quoted': 'text-blue-600 bg-blue-50',
      'pending_deposit': 'text-purple-600 bg-purple-50',
      'deposit_paid': 'text-emerald-600 bg-emerald-50',
      'confirmed': 'text-emerald-600 bg-emerald-50',
      'in_service': 'text-blue-600 bg-blue-50',
      'completed': 'text-slate-600 bg-slate-100',
      'cancelled': 'text-slate-400 bg-slate-100',
    };
    return colorMap[status] || 'text-slate-600 bg-slate-100';
  };

  const filteredBookings = bookings.filter((booking) => {
    if (activeTab === 'upcoming') {
      return ['pending_quote', 'quoted', 'pending_deposit', 'deposit_paid', 'confirmed', 'in_service'].includes(booking.status);
    } else if (activeTab === 'completed') {
      return booking.status === 'completed';
    } else {
      return booking.status === 'cancelled';
    }
  });

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#fff8fa_0%,#f8f9fc_24%,#f5f6f8_100%)]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/82 px-5 app-header-safe pb-4 backdrop-blur-md">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Bookings</p>
            <h1 className="mt-0.5 text-[1.75rem] font-bold tracking-[-0.03em] text-[var(--color-text)]">预约</h1>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)] shadow-sm ring-1 ring-black/5">
            {bookings.length} 条记录
          </span>
        </div>
      </div>

      {/* Create Booking Card */}
      <div className="px-5 mt-4">
        <div
          onClick={() => navigate('/bookings/create')}
          className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FF6B8A] via-[#FF7C98] to-[#FF8FA3] p-6 shadow-[0_18px_48px_rgba(255,107,138,0.28)] cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.14),transparent_28%)]" />
          <div className="absolute -top-10 -right-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute right-8 top-10 h-20 w-20 rounded-full bg-white/12" />

          <div className="relative flex items-center justify-between">
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-white/18 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md ring-1 ring-white/20">
                服务入口
              </span>
              <h2 className="mt-3 text-[1.75rem] font-bold tracking-[-0.03em] text-white">发起预约</h2>
              <p className="mt-2 max-w-[14rem] text-sm leading-6 text-white/82">
                选择时间、服务与地址，快速安排你的下一次上门美甲
              </p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/18 backdrop-blur-sm ring-1 ring-white/18">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Records Section */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-heading-3 text-[var(--color-text)]">预约记录</h2>
            <p className="mt-1 text-caption text-[var(--color-text-muted)]">查看你当前与历史的预约进度</p>
          </div>
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-[var(--color-text-secondary)] ring-1 ring-black/5 backdrop-blur">
            共 {bookings.length} 条
          </span>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { key: 'upcoming', label: '进行中' },
            { key: 'completed', label: '已完成' },
            { key: 'cancelled', label: '已取消' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`shrink-0 rounded-full px-4 py-2 text-body-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'bg-white text-[var(--color-text-secondary)] ring-1 ring-black/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Booking List */}
        <div className="space-y-3 pb-6">
          {filteredBookings.length > 0 ? (
            filteredBookings.map((booking) => (
              <div
                key={booking.id}
                onClick={() => navigate(`/bookings/${booking.id}`)}
                className="rounded-[28px] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5 cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-[var(--color-primary)]">
                      约
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-[var(--color-primary)]">预约动态</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">最近状态更新</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-caption font-medium ${getStatusColor(booking.status)}`}>
                    {getStatusText(booking.status)}
                  </span>
                </div>

                <div className="flex items-start gap-4">
                  {/* Date Badge */}
                  <div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#fff5f7_0%,#ffe8ee_100%)]">
                    <span className="text-caption text-[var(--color-primary)] font-medium">
                      {dayjs(booking.startTime).format('MM月')}
                    </span>
                    <span className="text-heading-1 text-[var(--color-primary)]">
                      {dayjs(booking.startTime).format('D')}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-[1.125rem] font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                        {booking.serviceType || '美甲服务'}
                      </span>
                    </div>

                    <div className="mb-1.5 flex items-center gap-2 text-body-sm text-[var(--color-text-secondary)]">
                      <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {dayjs(booking.startTime).format('HH:mm')} - {dayjs(booking.endTime).format('HH:mm')}
                    </div>

                    <div className="flex items-center gap-2 text-body-sm text-[var(--color-text-secondary)]">
                      <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{booking.address || '地址待确认'}</span>
                    </div>

                    {booking.quotePrice ? (
                      <div className="mt-3 inline-flex rounded-full bg-[#fff2f6] px-3 py-1.5 text-body-sm font-medium text-[var(--color-primary)]">
                        报价 ¥{booking.quotePrice}
                      </div>
                    ) : (
                      <div className="mt-3 text-[11px] text-[var(--color-text-muted)]">
                        等待美甲师确认服务细节
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {(booking.status === 'quoted' || booking.status === 'pending_deposit') && (
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-[var(--color-border-light)] pt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/chat');
                      }}
                      className="rounded-full bg-slate-100 px-4 py-2 text-caption text-[var(--color-text-secondary)] active:scale-95 transition-transform"
                    >
                      联系美甲师
                    </button>
                    {booking.status === 'quoted' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/bookings/${booking.id}`);
                        }}
                        className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-caption text-white active:scale-95 transition-transform"
                      >
                        确认预约
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-[28px] bg-white px-6 py-12 text-center shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-body text-[var(--color-text-muted)] mb-2">
                暂无{activeTab === 'upcoming' ? '进行中' : activeTab === 'completed' ? '已完成' : '已取消'}的预约
              </p>
              {activeTab === 'upcoming' && (
                <button
                  onClick={() => navigate('/bookings/create')}
                  className="mt-4 px-6 py-2.5 bg-[var(--color-primary)] text-white text-body-sm font-medium rounded-full active:scale-95 transition-transform"
                >
                  立即预约
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingList;
