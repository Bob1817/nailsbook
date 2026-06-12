import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService, type Order } from '../services/order';
import { ORDER_STATUS_LABEL as STATUS_LABELS, ORDER_STATUS_COLOR as STATUS_COLORS } from '../utils/orderStatus';
import OrderDetail from './OrderDetail';
import dayjs from 'dayjs';

const OrderList: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const ordersData = await orderService.getOrders();
      setOrders(ordersData);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDetailClose = () => {
    setDetailOrderId(null);
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#fff8fa_0%,#f8f9fc_24%,#f5f6f8_100%)]">
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/86 px-5 app-header-safe pb-2 backdrop-blur-md">
        <div className="flex min-h-11 items-center justify-between">
          <h1 className="text-[17px] font-semibold text-[var(--color-text)]">我的预约</h1>
          <button
            type="button"
            onClick={() => navigate('/orders/create')}
            aria-label="发起预约"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-sm ring-1 ring-black/5 active:scale-95"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-5 pt-4">
        <div className="space-y-3 pb-6">
          {orders.length > 0 ? (
            orders.map((order) => {
              const isCustom = !!order.customTitle;
              const title = isCustom ? order.customTitle : (order.serviceType || '美甲服务');
              return (
                <div
                  key={order.id}
                  onClick={() => setDetailOrderId(order.id)}
                  className="rounded-[28px] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5 cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-[var(--color-primary)]">
                        预
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-[var(--color-primary)]">预约</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">最近状态更新</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-caption font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#fff5f7_0%,#ffe8ee_100%)]">
                      <span className="text-caption text-[var(--color-primary)] font-medium">
                        {dayjs(order.startTime).format('MM月')}
                      </span>
                      <span className="text-heading-1 text-[var(--color-primary)]">
                        {dayjs(order.startTime).format('D')}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="text-[1.125rem] font-semibold tracking-[-0.02em] text-[var(--color-text)] truncate">
                          {title}
                        </span>
                      </div>

                      <div className="mb-1.5 flex items-center gap-2 text-body-sm text-[var(--color-text-secondary)]">
                        <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {dayjs(order.startTime).format('HH:mm')} - {dayjs(order.endTime).format('HH:mm')}
                      </div>

                      <div className="flex items-center gap-2 text-body-sm text-[var(--color-text-secondary)]">
                        <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{order.address || '地址待确认'}</span>
                      </div>

                      {order.quotePrice ? (
                        <div className="mt-3 inline-flex rounded-full bg-[#fff2f6] px-3 py-1.5 text-body-sm font-medium text-[var(--color-primary)]">
                          报价 ¥{order.quotePrice}
                        </div>
                      ) : (
                        <div className="mt-3 text-[11px] text-[var(--color-text-muted)]">
                          {order.status === 'pending_quote'
                            ? '等待美甲师报价'
                            : order.status === 'pending_confirm'
                              ? '等待美甲师确认'
                              : '查看预约详情'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[28px] bg-white px-6 py-12 text-center shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-body text-[var(--color-text-muted)] mb-2">暂无预约</p>
              <button
                onClick={() => navigate('/orders/create')}
                className="mt-4 px-6 py-2.5 bg-[var(--color-primary)] text-white text-body-sm font-medium rounded-full active:scale-95 transition-transform"
              >
                立即预约
              </button>
            </div>
          )}
        </div>
      </div>
      {detailOrderId !== null && (
        <OrderDetail
          isModal
          orderIdProp={detailOrderId}
          onClose={handleDetailClose}
        />
      )}
    </div>
  );
};

export default OrderList;
