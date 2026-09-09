import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import type { Message } from '../services/message';
import { orderService } from '../services/order';
import { ORDER_STATUS_LABEL } from '../utils/orderStatus';

interface CardData {
  orderNo?: string;
  serviceType?: string | null;
  startTime?: string;
  status?: string;
  price?: number | null;
}

interface OrderCardMessageProps {
  message: Message;
  isClient: boolean;
  onViewDetail: (orderId: number) => void;
}

const serviceLabelOf = (serviceType?: string | null): string | null => {
  if (serviceType === 'home') return '上门美甲';
  if (serviceType === 'shop') return '到店美甲';
  return serviceType || null;
};

/**
 * Booking card shown in chat. Prefers structured JSON in message.content;
 * if that's missing (legacy/preview-text cards), falls back to fetching the
 * referenced order so time/service/price/status are always shown — matching
 * the technician end.
 */
const OrderCardMessage: React.FC<OrderCardMessageProps> = ({ message, isClient, onViewDetail }) => {
  const parsed: CardData = (() => {
    try {
      return JSON.parse(message.content || '{}');
    } catch {
      return {};
    }
  })();

  const [card, setCard] = useState<CardData>(parsed);
  const [loading, setLoading] = useState(false);

  const hasData = Boolean(card.orderNo);

  useEffect(() => {
    if (hasData || !message.relatedId) return;
    let active = true;
    setLoading(true);
    orderService
      .getOrder(message.relatedId)
      .then((order) => {
        if (!active) return;
        setCard({
          orderNo: order.orderNo,
          serviceType: order.serviceType,
          startTime: order.startTime,
          status: order.status,
          price: order.quotePrice,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.relatedId]);

  const muted = isClient ? 'text-[var(--nb-inverse)]' : 'text-[var(--nb-muted)]';
  const serviceLabel = serviceLabelOf(card.serviceType);
  const resolved = Boolean(card.orderNo);

  return (
    <div className="min-w-[190px]">
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        预约卡片
      </div>

      {resolved ? (
        <div className="mt-2 space-y-1 text-[13px]">
          <div className="flex justify-between gap-4">
            <span className={muted}>时间</span>
            <span>{card.startTime ? dayjs(card.startTime).format('MM-DD HH:mm') : '待定'}</span>
          </div>
          {serviceLabel && (
            <div className="flex justify-between gap-4">
              <span className={muted}>服务</span>
              <span>{serviceLabel}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className={muted}>价格</span>
            <span>{card.price != null ? `¥${card.price}` : '待报价'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className={muted}>状态</span>
            <span>{ORDER_STATUS_LABEL[card.status || ''] || card.status || '—'}</span>
          </div>
        </div>
      ) : loading ? (
        <div className="mt-2 flex items-center gap-2 text-[13px]">
          <div className={`h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent ${isClient ? 'border-[var(--nb-line)]' : 'border-[var(--nb-control)]'}`} />
          <span className={muted}>加载预约信息...</span>
        </div>
      ) : (
        <p className="mt-1 text-sm leading-6">{message.content}</p>
      )}

      {message.relatedId && (
        <button
          type="button"
          onClick={() => onViewDetail(message.relatedId!)}
          className={`mt-2.5 w-full rounded-lg py-1.5 text-xs font-medium active:opacity-80 ${isClient ? 'bg-white/20 text-white' : 'bg-[var(--nb-page)] text-[var(--nb-ink)]'}`}
        >
          查看预约详情 →
        </button>
      )}
    </div>
  );
};

export default OrderCardMessage;
