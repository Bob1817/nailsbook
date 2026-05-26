import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customServiceRequestService, type CustomServiceRequest } from '../services/customServiceRequest';
import dayjs from 'dayjs';

const STATUS_LABELS: Record<string, string> = {
  pending_quote: '待报价',
  quoted: '已报价',
  accepted: '已接受',
  rejected: '已拒绝',
  cancelled: '已取消',
};

const STATUS_COLORS: Record<string, string> = {
  pending_quote: 'bg-amber-100 text-amber-700',
  quoted: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  cancelled: 'bg-gray-100 text-gray-600',
};

const CustomRequestDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<CustomServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    customServiceRequestService
      .getRequest(Number(id))
      .then(setRequest)
      .catch((err) => console.error('Failed to load custom request', err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAccept = async () => {
    if (!request) return;
    setSubmitting(true);
    try {
      const updated = await customServiceRequestService.acceptQuote(request.id);
      setRequest(updated);
    } catch (err) {
      console.error(err);
      alert('接受报价失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;
    if (!window.confirm('确定拒绝该报价？')) return;
    setSubmitting(true);
    try {
      const updated = await customServiceRequestService.rejectQuote(request.id);
      setRequest(updated);
    } catch (err) {
      console.error(err);
      alert('拒绝报价失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!request) return;
    if (!window.confirm('确定取消该预约需求？')) return;
    setSubmitting(true);
    try {
      const updated = await customServiceRequestService.cancel(request.id);
      setRequest(updated);
    } catch (err) {
      console.error(err);
      alert('取消失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-full flex items-center justify-center text-[var(--color-text-muted)]">
        预约不存在
      </div>
    );
  }

  const addressText = request.clientAddress
    ? [
        request.clientAddress.province,
        request.clientAddress.city,
        request.clientAddress.district,
        request.clientAddress.detailAddress,
        request.clientAddress.doorInfo,
      ].filter(Boolean).join(' ')
    : request.shopAddress
      ? `${request.shopAddress.name || ''} ${request.shopAddress.detailAddress || ''}`.trim()
      : '';

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#fff8fa_0%,#f8f9fc_24%,#f5f6f8_100%)] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/82 px-5 app-header-safe pb-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5"
          >
            <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-heading-3 text-[var(--color-text)]">预约详情</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Status & Quote */}
      <div className="px-5 mt-4 space-y-4">
        <div className="rounded-[28px] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">单号</p>
              <p className="mt-0.5 text-body-sm font-medium text-[var(--color-text)]">{request.requestNo}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-caption font-medium ${STATUS_COLORS[request.status] || 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABELS[request.status] || request.status}
            </span>
          </div>

          {request.quotePrice && (
            <div className="rounded-2xl bg-gradient-to-br from-[#FF6B8A] to-[#FF8FA3] p-5">
              <p className="text-[11px] text-white/68">美甲师报价</p>
              <p className="mt-1 text-[2rem] font-bold leading-none text-white">¥{request.quotePrice}</p>
              {request.quoteRemark && (
                <p className="mt-3 text-body-sm text-white/86">{request.quoteRemark}</p>
              )}
              {request.quotedAt && (
                <p className="mt-2 text-[11px] text-white/52">
                  {dayjs(request.quotedAt).format('YYYY-MM-DD HH:mm')} 报价
                </p>
              )}
            </div>
          )}
        </div>

        {/* Request Content */}
        <div className="rounded-[28px] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
          <h3 className="text-body font-semibold text-[var(--color-text)] mb-3">需求内容</h3>
          {request.title && (
            <p className="text-body font-medium text-[var(--color-text)] mb-2">{request.title}</p>
          )}
          {request.description && (
            <p className="text-body-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
              {request.description}
            </p>
          )}
          {request.images && request.images.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {request.images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`参考图${i + 1}`}
                  className="aspect-square w-full rounded-xl object-cover cursor-pointer"
                  onClick={() => window.open(url, '_blank')}
                />
              ))}
            </div>
          )}
        </div>

        {/* Service Info */}
        <div className="rounded-[28px] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
          <h3 className="text-body font-semibold text-[var(--color-text)] mb-3">预约信息</h3>
          <div className="space-y-2 text-body-sm">
            {request.technician && (
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">美甲师</span>
                <span className="text-[var(--color-text)]">{request.technician.name}</span>
              </div>
            )}
            {request.serviceType && (
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">服务方式</span>
                <span className="text-[var(--color-text)]">{request.serviceType}</span>
              </div>
            )}
            {request.serviceDate && (
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">期望日期</span>
                <span className="text-[var(--color-text)]">{request.serviceDate}</span>
              </div>
            )}
            {request.startTime && (
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">期望时间</span>
                <span className="text-[var(--color-text)]">{request.startTime}</span>
              </div>
            )}
            {addressText && (
              <div className="flex justify-between gap-3">
                <span className="text-[var(--color-text-muted)] shrink-0">地址</span>
                <span className="text-[var(--color-text)] text-right">{addressText}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">提交时间</span>
              <span className="text-[var(--color-text)]">{dayjs(request.createdAt).format('YYYY-MM-DD HH:mm')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      {(request.status === 'pending_quote' || request.status === 'quoted') && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/60 bg-white/88 px-5 py-4 safe-area-bottom backdrop-blur-xl">
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/chat')}
              className="flex-1 rounded-full bg-slate-100 px-5 py-3 text-body-sm font-medium text-[var(--color-text-secondary)] active:scale-[0.97]"
            >
              联系美甲师
            </button>
            {request.status === 'pending_quote' && (
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="flex-1 rounded-full bg-red-50 px-5 py-3 text-body-sm font-medium text-red-600 active:scale-[0.97] disabled:opacity-50"
              >
                取消需求
              </button>
            )}
            {request.status === 'quoted' && (
              <>
                <button
                  onClick={handleReject}
                  disabled={submitting}
                  className="flex-1 rounded-full bg-slate-100 px-5 py-3 text-body-sm font-medium text-[var(--color-text-secondary)] active:scale-[0.97] disabled:opacity-50"
                >
                  拒绝
                </button>
                <button
                  onClick={handleAccept}
                  disabled={submitting}
                  className="flex-1 rounded-full bg-[var(--color-primary)] px-5 py-3 text-body-sm font-semibold text-white shadow-md active:scale-[0.97] disabled:opacity-50"
                >
                  接受报价
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomRequestDetail;
