import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { insightsService, type InsightsOverview } from '../services/insights';
import { worksService, type Work } from '../services/works';
import { useAuth } from '../hooks/useAuth';

function formatMoney(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '¥0';
  return `¥${Math.round(amount).toLocaleString('zh-CN')}`;
}

function formatRate(numerator: number, denominator: number): string {
  if (!denominator) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { technician } = useAuth();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [overview, setOverview] = useState<InsightsOverview | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      insightsService.getOverview(month).catch(() => null),
      worksService.list().catch(() => []),
    ]).then(([overviewData, worksData]) => {
      if (cancelled) return;
      setOverview(overviewData);
      setWorks(worksData);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const draftCount = works.filter((w) => w.publicationStatus === 'draft').length;
  const visibleCount = works.filter((w) => w.isVisible && w.publicationStatus !== 'draft').length;
  const recentDaily = overview?.trends.daily.slice(-14) || [];
  const maxDailyRevenue = Math.max(1, ...recentDaily.map((d) => d.revenue));

  const handleDropFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) {
      navigate('/works/new', { state: { droppedFiles: files } });
    }
  };

  return (
    <div className="space-y-6">
      {/* 顶部快捷创作区 */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDropFiles}
        className={`flex flex-col justify-between gap-4 rounded-2xl border p-6 transition sm:flex-row sm:items-center ${
          isDragging
            ? 'border-[var(--nb-ink)] bg-[var(--nb-active-surface)]'
            : 'border-[var(--nb-line)] bg-[var(--nb-surface)]'
        }`}
      >
        <div>
          <h2 className="text-lg font-semibold text-[var(--nb-ink)]">
            你好，{technician?.name || '美甲主理人'}
          </h2>
          <p className="mt-1 text-sm text-[var(--nb-muted)]">
            将修好的美甲图片直接拖拽到此处，即可快速进入双栏作品发布器；当前已上架 {visibleCount} 组作品，草稿箱 {draftCount} 组。
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {draftCount > 0 && (
            <button
              type="button"
              onClick={() => navigate('/works?tab=draft')}
              className="min-h-[44px] rounded-xl border border-[var(--nb-line)] bg-[var(--nb-surface)] px-4 text-sm font-medium text-[var(--nb-ink)] transition hover:bg-[var(--nb-page)]"
            >
              继续编辑草稿 ({draftCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/works/new')}
            className="min-h-[44px] rounded-xl bg-[var(--nb-action)] px-5 text-sm font-medium text-[var(--nb-inverse)] transition active:bg-[var(--nb-action-pressed)]"
          >
            + 发布新作品
          </button>
        </div>
      </div>

      {/* 月份筛选 */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--nb-ink)]">核心经营与作品数据</h3>
        <label className="flex items-center gap-2 text-sm text-[var(--nb-secondary)]">
          <span>统计月份</span>
          <input
            type="month"
            value={month}
            max={new Date().toISOString().slice(0, 7)}
            onChange={(e) => setMonth(e.target.value)}
            className="min-h-[38px] rounded-lg border border-[var(--nb-line)] bg-[var(--nb-surface)] px-3 text-sm text-[var(--nb-ink)]"
          />
        </label>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5">
          <div className="text-xs font-medium text-[var(--nb-muted)]">本月确认营收</div>
          <div className="mt-2 text-2xl font-semibold text-[var(--nb-ink)]">
            {loading ? '--' : formatMoney(overview?.revenue.monthConfirmed)}
          </div>
          <div className="mt-2 text-xs text-[var(--nb-secondary)]">
            平均客单价 {loading ? '--' : formatMoney(overview?.revenue.averageTicket)}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5">
          <div className="text-xs font-medium text-[var(--nb-muted)]">老客复购率</div>
          <div className="mt-2 text-2xl font-semibold text-[var(--nb-ink)]">
            {loading
              ? '--'
              : overview?.customers.repeatRate != null
                ? `${Math.round(overview.customers.repeatRate * 100)}%`
                : '0%'}
          </div>
          <div className="mt-2 text-xs text-[var(--nb-secondary)]">
            累计客户 {overview?.customers.total ?? 0} 位 · 本月新增 {overview?.customers.newThisMonth ?? 0} 位
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5">
          <div className="text-xs font-medium text-[var(--nb-muted)]">作品浏览量（近 {overview?.conversion.periodDays ?? 30} 天）</div>
          <div className="mt-2 text-2xl font-semibold text-[var(--nb-ink)]">
            {loading ? '--' : overview?.conversion.works.views ?? 0}
          </div>
          <div className="mt-2 text-xs text-[var(--nb-secondary)]">
            分享意向 {overview?.conversion.works.shares ?? 0} 次 · 在架作品 {visibleCount} 组
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5">
          <div className="text-xs font-medium text-[var(--nb-muted)]">作品引流成交</div>
          <div className="mt-2 text-2xl font-semibold text-[var(--nb-ink)]">
            {loading ? '--' : overview?.conversion.works.orders ?? 0} 单
          </div>
          <div className="mt-2 text-xs text-[var(--nb-secondary)]">
            预约意向 {overview?.conversion.works.bookingIntents ?? 0} 次 · 浏览转预约{' '}
            {formatRate(overview?.conversion.works.bookingIntents ?? 0, overview?.conversion.works.views ?? 0)}
          </div>
        </div>
      </div>

      {/* 趋势图 + 转化漏斗 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--nb-ink)]">近期日营收趋势</h4>
            <span className="text-xs text-[var(--nb-muted)]">最近 {recentDaily.length} 个有记录日</span>
          </div>

          {recentDaily.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-[var(--nb-muted)]">
              所选月份暂无日级营收记录
            </div>
          ) : (
            <div className="mt-5 flex h-48 items-end gap-2 border-b border-[var(--nb-line)] pb-2">
              {recentDaily.map((item) => {
                const heightPct = Math.max(8, Math.round((item.revenue / maxDailyRevenue) * 100));
                return (
                  <div key={item.period} className="group flex flex-1 flex-col items-center gap-1.5">
                    <div className="text-[10px] text-[var(--nb-muted)] opacity-0 transition group-hover:opacity-100">
                      ¥{Math.round(item.revenue)}
                    </div>
                    <div
                      className="w-full max-w-[28px] rounded-t-md bg-[var(--nb-action)] transition-all group-hover:bg-[var(--nb-action-pressed)]"
                      style={{ height: `${heightPct}%` }}
                      title={`${item.period}: ¥${item.revenue} (${item.orders}单)`}
                    />
                    <span className="text-[10px] text-[var(--nb-muted)]">{item.period.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5">
          <h4 className="text-sm font-semibold text-[var(--nb-ink)]">作品获客转化漏斗</h4>
          <div className="mt-4 space-y-3">
            {[
              { label: '作品详情浏览', value: overview?.conversion.works.views ?? 0 },
              { label: '转发分享意向', value: overview?.conversion.works.shares ?? 0 },
              { label: '发起预约意向', value: overview?.conversion.works.bookingIntents ?? 0 },
              { label: '最终成交订单', value: overview?.conversion.works.orders ?? 0 },
            ].map((step, idx, arr) => {
              const base = arr[0].value || 1;
              const widthPct = step.value > 0 ? Math.max(10, Math.round((step.value / base) * 100)) : 4;
              return (
                <div key={step.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--nb-secondary)]">
                      {idx + 1}. {step.label}
                    </span>
                    <span className="font-medium text-[var(--nb-ink)]">{step.value}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--nb-page)]">
                    <div
                      className="h-full rounded-full bg-[var(--nb-action)]"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 客户回访提醒 */}
      <div className="rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[var(--nb-ink)]">待关注客户与经营提醒</h4>
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="text-xs font-medium text-[var(--nb-link)] hover:underline"
          >
            前往客户档案
          </button>
        </div>
        {overview?.reminders && overview.reminders.length > 0 ? (
          <div className="mt-3 divide-y divide-[var(--nb-line)]">
            {overview.reminders.slice(0, 6).map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-[var(--nb-ink)]">{item.customerName}</span>
                  <span className="ml-2 text-xs text-[var(--nb-muted)]">{item.reason}</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/customers/${item.customerId}`)}
                  className="min-h-[36px] rounded-lg border border-[var(--nb-line)] px-3 text-xs text-[var(--nb-secondary)] hover:bg-[var(--nb-page)]"
                >
                  查看档案
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--nb-muted)]">暂无待唤醒或高价值回访提醒</p>
        )}
      </div>
    </div>
  );
};
