import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { insightsService, type InsightsOverview } from '../services/insights';

function formatMoney(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '¥0';
  return `¥${Math.round(amount).toLocaleString('zh-CN')}`;
}

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [overview, setOverview] = useState<InsightsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    insightsService
      .getOverview(month)
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch(() => {
        if (!cancelled) setOverview(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const workItems = overview?.conversion.works.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold text-[var(--nb-ink)]">作品与经营数据中心</h2>
          <p className="mt-1 text-xs text-[var(--nb-muted)]">
            分析各款式浏览、分享、预约转化表现，辅助调整主打款式与阶梯定价
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--nb-secondary)]">
          <span>统计月份</span>
          <input
            type="month"
            value={month}
            max={new Date().toISOString().slice(0, 7)}
            onChange={(e) => setMonth(e.target.value)}
            className="min-h-[38px] rounded-lg border border-[var(--nb-line)] bg-[var(--nb-page)] px-3 text-sm text-[var(--nb-ink)]"
          />
        </label>
      </div>

      {/* 个人主页 vs 作品详情转化对比 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--nb-ink)]">个人主页流量转化</h3>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-[var(--nb-page)] p-3">
              <div className="text-xs text-[var(--nb-muted)]">主页访问</div>
              <div className="mt-1 text-lg font-semibold text-[var(--nb-ink)]">
                {loading ? '--' : overview?.conversion.homepage.views ?? 0}
              </div>
            </div>
            <div className="rounded-xl bg-[var(--nb-page)] p-3">
              <div className="text-xs text-[var(--nb-muted)]">新增关注</div>
              <div className="mt-1 text-lg font-semibold text-[var(--nb-ink)]">
                {loading ? '--' : overview?.conversion.homepage.follows ?? 0}
              </div>
            </div>
            <div className="rounded-xl bg-[var(--nb-page)] p-3">
              <div className="text-xs text-[var(--nb-muted)]">主页成单</div>
              <div className="mt-1 text-lg font-semibold text-[var(--nb-ink)]">
                {loading ? '--' : overview?.conversion.homepage.orders ?? 0}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--nb-ink)]">客户资产概览</h3>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-[var(--nb-page)] p-3">
              <div className="text-xs text-[var(--nb-muted)]">累计客户</div>
              <div className="mt-1 text-lg font-semibold text-[var(--nb-ink)]">
                {loading ? '--' : overview?.customers.total ?? 0}
              </div>
            </div>
            <div className="rounded-xl bg-[var(--nb-page)] p-3">
              <div className="text-xs text-[var(--nb-muted)]">老客复购</div>
              <div className="mt-1 text-lg font-semibold text-[var(--nb-ink)]">
                {loading ? '--' : overview?.customers.repeat ?? 0}
              </div>
            </div>
            <div className="rounded-xl bg-[var(--nb-page)] p-3">
              <div className="text-xs text-[var(--nb-muted)]">待唤醒</div>
              <div className="mt-1 text-lg font-semibold text-[var(--nb-ink)]">
                {loading ? '--' : overview?.customers.dueForRepurchase ?? 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 作品表现排行榜 */}
      <div className="rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--nb-ink)]">热门作品转化排行</h3>
          <button
            type="button"
            onClick={() => navigate('/works')}
            className="text-xs font-medium text-[var(--nb-link)] hover:underline"
          >
            管理全部作品
          </button>
        </div>
        {workItems.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--nb-muted)]">
            当前周期暂无单作品访问转化明细
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-[var(--nb-line)] bg-[var(--nb-page)] text-xs text-[var(--nb-muted)]">
                <tr>
                  <th className="px-4 py-2.5">作品标题</th>
                  <th className="px-4 py-2.5">浏览量</th>
                  <th className="px-4 py-2.5">分享意向</th>
                  <th className="px-4 py-2.5">预约意向</th>
                  <th className="px-4 py-2.5">成交订单</th>
                  <th className="px-4 py-2.5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--nb-line)]">
                {workItems.map((item) => (
                  <tr key={item.workId}>
                    <td className="px-4 py-3 font-medium text-[var(--nb-ink)]">{item.title}</td>
                    <td className="px-4 py-3 text-[var(--nb-secondary)]">{item.views}</td>
                    <td className="px-4 py-3 text-[var(--nb-secondary)]">{item.shares}</td>
                    <td className="px-4 py-3 text-[var(--nb-secondary)]">{item.bookingIntents}</td>
                    <td className="px-4 py-3 font-medium text-[var(--nb-ink)]">{item.orders}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/works/${item.workId}/edit`)}
                        className="text-xs font-medium text-[var(--nb-link)] hover:underline"
                      >
                        编辑作品
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 服务项目与时段营收分布 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--nb-ink)]">服务项目营收贡献</h3>
          {overview?.performance.sufficientData ? (
            <div className="mt-3 divide-y divide-[var(--nb-line)]">
              {overview.performance.services.map((svc) => (
                <div key={svc.name} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-[var(--nb-ink)]">{svc.name}</span>
                  <span className="text-xs text-[var(--nb-secondary)]">
                    {svc.orders} 单 · {formatMoney(svc.revenue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-[var(--nb-muted)]">
              样本订单不足 {overview?.performance.minimumSampleSize ?? 5} 单时暂不展示服务分布
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--nb-line)] bg-[var(--nb-surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--nb-ink)]">预约时段营收分布</h3>
          {overview?.performance.sufficientData ? (
            <div className="mt-3 divide-y divide-[var(--nb-line)]">
              {overview.performance.timeSlots.map((slot) => (
                <div key={slot.name} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-[var(--nb-ink)]">{slot.name}</span>
                  <span className="text-xs text-[var(--nb-secondary)]">
                    {slot.orders} 单 · {formatMoney(slot.revenue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-[var(--nb-muted)]">
              样本订单不足 {overview?.performance.minimumSampleSize ?? 5} 单时暂不展示时段分布
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
