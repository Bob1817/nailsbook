import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Segmented,
  Spin,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  AlertOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  CrownOutlined,
  DollarOutlined,
  PictureOutlined,
  RightOutlined,
  TeamOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import * as echarts from 'echarts/core';
import { LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { colors } from '../colors.generated';
import AdminPageHeader from '../components/AdminPageHeader';
import { dashboardService } from '../services/dashboard';
import type { BusinessStats, DashboardOverview } from '../services/dashboard';

const { Text, Title } = Typography;

echarts.use([LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const trendChartRef = useRef<HTMLDivElement | null>(null);
  const subscriptionChartRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [businessStats, setBusinessStats] = useState<BusinessStats | null>(null);
  const [trendMode, setTrendMode] = useState<'subscription' | 'technician'>('subscription');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const [overviewResult, businessResult] = await Promise.allSettled([
        dashboardService.getOverview(),
        dashboardService.getBusinessStats(),
      ]);
      if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value);
      else message.error('获取经营总览失败');
      if (businessResult.status === 'fulfilled') setBusinessStats(businessResult.value);
      setLoading(false);
    };
    fetchDashboardData();
  }, []);

  const subRevenueSeries = useMemo(() => {
    return (businessStats?.dailySubscriptionRevenue || []).filter(
      (item) => item && item.date && String(item.date).toLowerCase() !== 'null',
    );
  }, [businessStats]);

  const techGrowthSeries = useMemo(() => {
    return (businessStats?.dailyTechnicians || []).filter(
      (item) => item && item.date && String(item.date).toLowerCase() !== 'null',
    );
  }, [businessStats]);

  const activeSeriesLength =
    trendMode === 'subscription' ? subRevenueSeries.length : techGrowthSeries.length;

  const trendOption = useMemo(() => {
    if (trendMode === 'technician') {
      return {
        color: [colors.ink],
        grid: { left: 46, right: 18, top: 24, bottom: 36 },
        tooltip: { trigger: 'axis', valueFormatter: (value: number) => `${Number(value)} 位` },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: techGrowthSeries.map((item) => item.date),
          axisLine: { lineStyle: { color: colors.line } },
          axisLabel: { color: colors.muted },
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          axisLine: { show: false },
          splitLine: { lineStyle: { color: colors.line } },
          axisLabel: { color: colors.muted },
        },
        series: [
          {
            name: '新增美甲师',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 7,
            lineStyle: { width: 3 },
            areaStyle: { color: 'rgba(29, 29, 31, 0.08)' },
            data: techGrowthSeries.map((item) => Number(item.count)),
          },
        ],
      };
    }

    return {
      color: [colors.link],
      grid: { left: 54, right: 18, top: 24, bottom: 36 },
      tooltip: { trigger: 'axis', valueFormatter: (value: number) => `¥${Number(value).toFixed(2)}` },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: subRevenueSeries.map((item) => item.date),
        axisLine: { lineStyle: { color: colors.line } },
        axisLabel: { color: colors.muted },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: colors.line } },
        axisLabel: { color: colors.muted },
      },
      series: [
        {
          name: '订阅实收',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { width: 3 },
          areaStyle: { color: 'rgba(82, 100, 119, 0.10)' },
          data: subRevenueSeries.map((item) => Number(item.totalAmount)),
        },
      ],
    };
  }, [trendMode, subRevenueSeries, techGrowthSeries]);

  const subscriptionOption = useMemo(
    () => ({
      color: [colors.control, colors.link, colors.ink, colors.muted],
      tooltip: { trigger: 'item', formatter: '{b}: {c} 位 ({d}%)' },
      legend: { bottom: 0, textStyle: { color: colors.secondary } },
      series: [
        {
          type: 'pie',
          radius: ['48%', '70%'],
          center: ['50%', '43%'],
          label: { show: false },
          itemStyle: { borderRadius: 8, borderColor: colors.surface, borderWidth: 3 },
          data: (overview?.subscriptionStats.byPlan || []).map((item) => ({
            value: item.count,
            name: item.planName,
          })),
        },
      ],
    }),
    [overview],
  );

  useEffect(() => {
    const charts: echarts.ECharts[] = [];
    const observedNodes: HTMLDivElement[] = [];
    if (trendChartRef.current && activeSeriesLength > 0) {
      const chart = echarts.init(trendChartRef.current);
      chart.setOption(trendOption);
      charts.push(chart);
      observedNodes.push(trendChartRef.current);
    }
    if (subscriptionChartRef.current && overview) {
      const chart = echarts.init(subscriptionChartRef.current);
      chart.setOption(subscriptionOption);
      charts.push(chart);
      observedNodes.push(subscriptionChartRef.current);
    }
    const resize = () => charts.forEach((chart) => chart.resize());
    window.addEventListener('resize', resize);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && observedNodes.length > 0) {
      observer = new ResizeObserver(() => resize());
      observedNodes.forEach((node) => observer?.observe(node));
    }
    return () => {
      window.removeEventListener('resize', resize);
      observer?.disconnect();
      charts.forEach((chart) => chart.dispose());
    };
  }, [overview, trendOption, activeSeriesLength, subscriptionOption]);

  if (loading || !overview) {
    return (
      <div className="admin-loading">
        <Spin size="large" />
      </div>
    );
  }

  const subRev = overview.subscriptionRevenueStats || {
    total: 0,
    last30Days: 0,
    paidOrdersCount: 0,
    paidOrdersLast30Days: 0,
  };
  const paidActive = overview.subscriptionStats.paidActive ?? 0;
  const freeActive = overview.subscriptionStats.freeActive ?? 0;
  const paidRate = overview.subscriptionStats.paidConversionRate ?? 0;
  const expiringIn7Days = overview.subscriptionStats.expiringIn7Days ?? 0;
  const mrr = overview.subscriptionStats.mrr ?? 0;

  const approvalStats = overview.approvalStats;
  const governancePending =
    (approvalStats?.pendingWorks ?? 0) +
    (approvalStats?.pendingDeletions ?? 0) +
    (approvalStats?.pendingReports ?? 0) +
    (approvalStats?.pendingFeedbacks ?? 0);

  const governanceCards = [
    {
      key: 'works',
      title: '作品上架审核',
      count: approvalStats?.pendingWorks ?? 0,
      desc: '美甲师发布作品与款式合规审核',
      icon: <PictureOutlined />,
      actionText: '进入作品队列',
      onClick: () => navigate('/works?status=pending'),
    },
    {
      key: 'deletions',
      title: '账号注销复核',
      count: approvalStats?.pendingDeletions ?? 0,
      desc: '美甲师/客户账号注销人工复核',
      icon: <UserDeleteOutlined />,
      actionText: '复核注销',
      onClick: () => navigate('/account-deletions'),
    },
    {
      key: 'reports',
      title: '违规侵权举报',
      count: approvalStats?.pendingReports ?? 0,
      desc: '作品/评论违规举报核查处理',
      icon: <AlertOutlined />,
      actionText: '核查举报',
      onClick: () => navigate('/reports?status=pending'),
    },
    {
      key: 'feedbacks',
      title: '用户体验反馈',
      count: approvalStats?.pendingFeedbacks ?? 0,
      desc: '用户与美甲师提交的建议与故障',
      icon: <CommentOutlined />,
      actionText: '跟进反馈',
      onClick: () => navigate('/feedback'),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="经营总览"
        description="聚焦平台用户规模、订阅转化与订阅实收；美甲师私域业务明细可下钻至美甲师详情查看。"
      />

      {/* 第一层：核心 SaaS 经营 KPI */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={12} lg={6}>
          <Card
            className="admin-metric-card is-clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/technicians')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/technicians');
              }
            }}
          >
            <Statistic
              title={
                <div className="admin-metric-card__header">
                  <span>平台用户（美甲师）</span>
                  <span className="admin-metric-card__arrow">
                    <span>管理</span>
                    <RightOutlined style={{ fontSize: 10 }} />
                  </span>
                </div>
              }
              value={overview.technicianStats.total}
              prefix={<TeamOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              活跃 {overview.technicianStats.active} · 近30天 +{overview.technicianStats.newLast30Days} · C端客户 {overview.customerStats.total}
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card
            className="admin-metric-card is-clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/subscriptions')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/subscriptions');
              }
            }}
          >
            <Statistic
              title={
                <div className="admin-metric-card__header">
                  <span>有效付费订阅</span>
                  <span className="admin-metric-card__arrow">
                    <span>订阅</span>
                    <RightOutlined style={{ fontSize: 10 }} />
                  </span>
                </div>
              }
              value={paidActive}
              prefix={<CrownOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              付费转化 {paidRate}% · 免费版 {freeActive} 位
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card
            className="admin-metric-card is-clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/subscriptions')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/subscriptions');
              }
            }}
          >
            <Statistic
              title={
                <div className="admin-metric-card__header">
                  <span>平台订阅实收</span>
                  <span className="admin-metric-card__arrow">
                    <span>流水</span>
                    <RightOutlined style={{ fontSize: 10 }} />
                  </span>
                </div>
              }
              value={subRev.total}
              prefix={<DollarOutlined />}
              precision={2}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              近30天 ¥{subRev.last30Days.toFixed(2)} · 预估月经常性收入 ¥{mrr.toFixed(0)}
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card
            className="admin-metric-card is-clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/subscriptions')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/subscriptions');
              }
            }}
          >
            <Statistic
              title={
                <div className="admin-metric-card__header">
                  <span>7天内到期续费</span>
                  <span className="admin-metric-card__arrow">
                    <span>查看</span>
                    <RightOutlined style={{ fontSize: 10 }} />
                  </span>
                </div>
              }
              value={expiringIn7Days}
              prefix={<ClockCircleOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              累计付费单 {subRev.paidOrdersCount} 笔 · 待治理 {governancePending} 项
            </Text>
          </Card>
        </Col>
      </Row>

      {/* 第二层：订阅收入与用户增长趋势 + 版本分布 */}
      <Row gutter={[16, 16]} className="admin-section">
        <Col xs={24} lg={15} xl={16}>
          <Card
            title={trendMode === 'subscription' ? '近30天订阅实收趋势' : '近30天新增美甲师趋势'}
            extra={
              <Segmented
                size="small"
                value={trendMode}
                onChange={(val) => setTrendMode(val as 'subscription' | 'technician')}
                options={[
                  { label: '订阅收入', value: 'subscription' },
                  { label: '新增用户', value: 'technician' },
                ]}
              />
            }
            className="admin-dashboard-card"
          >
            {activeSeriesLength > 0 ? (
              <div ref={trendChartRef} className="admin-chart" />
            ) : (
              <div
                className="admin-chart"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Empty
                  description={
                    trendMode === 'subscription'
                      ? '近30天暂无付费订阅实收记录'
                      : '近30天暂无新增注册美甲师'
                  }
                />
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={9} xl={8}>
          <Card
            title="订阅版本分布"
            extra={
              <Button
                type="link"
                size="small"
                style={{ padding: 0 }}
                onClick={() => navigate('/subscriptions')}
              >
                共 {overview.subscriptionStats.active} 位 ›
              </Button>
            }
            className="admin-dashboard-card"
          >
            <div ref={subscriptionChartRef} className="admin-chart" />
          </Card>
        </Col>
      </Row>

      {/* 第三层：平台治理与待办（已移除入驻审批与预约履约待办） */}
      <section className="admin-section">
        <div className="admin-section-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Title level={4} style={{ margin: 0 }}>平台治理与待办</Title>
            {governancePending > 0 && <Badge count={governancePending} overflowCount={99} />}
          </div>
          <Text type="secondary">合规审核、注销复核与用户反馈处理队列</Text>
        </div>
        <div className="admin-approval-grid">
          {governanceCards.map((card) => (
            <div
              key={card.key}
              className={`admin-approval-card ${card.count > 0 ? 'is-urgent' : ''}`}
              role="button"
              tabIndex={0}
              onClick={card.onClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter') card.onClick();
              }}
            >
              <div className="admin-approval-card__top">
                <span className="admin-approval-card__icon">{card.icon}</span>
                <span className={`admin-approval-card__count ${card.count > 0 ? 'is-urgent' : ''}`}>
                  {card.count}
                </span>
              </div>
              <div className="admin-approval-card__main">
                <div className="admin-approval-card__title">{card.title}</div>
                <div className="admin-approval-card__desc">{card.desc}</div>
              </div>
              <div className="admin-approval-card__foot">
                <span className="admin-approval-card__action">{card.actionText}</span>
                <RightOutlined className="admin-approval-card__arrow" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 第四层（次要模块）：平台美甲师核心业务健康度（不触碰交易资金，仅反映工具活跃度） */}
      <section className="admin-section">
        <div className="admin-section-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Title level={4} style={{ margin: 0 }}>平台美甲师核心数据</Title>
            <Tag color="default">工具活跃参考 · 非平台交易资金</Tag>
          </div>
          <Text type="secondary">
            点击美甲师可进入详情查看其专属客户、预约、订单与流水明细
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14} xl={15}>
            <Card className="admin-dashboard-card" styles={{ body: { padding: 16 } }}>
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={8}>
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      background: 'var(--nb-page)',
                      border: '1px solid var(--nb-line)',
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>累计私域客户档案</Text>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--nb-ink)', marginTop: 4 }}>
                      {overview.customerStats.total}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      近30天新增 {overview.customerStats.newLast30Days} 位
                    </Text>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      background: 'var(--nb-page)',
                      border: '1px solid var(--nb-line)',
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>累计预约单量</Text>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--nb-ink)', marginTop: 4 }}>
                      {overview.orderStats.total}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      近30天 {overview.orderStats.last30Days ?? 0} 单 · 已完成 {overview.orderStats.completed}
                    </Text>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      background: 'var(--nb-page)',
                      border: '1px solid var(--nb-line)',
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>美甲师自营记账流水</Text>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--nb-ink)', marginTop: 4 }}>
                      ¥{Number(overview.revenueStats.total).toFixed(0)}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      近30天 ¥{Number(overview.revenueStats.last30Days).toFixed(0)}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={10} xl={9}>
            <Card
              title="活跃美甲师 Top 5"
              extra={
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0 }}
                  onClick={() => navigate('/technicians')}
                >
                  全部美甲师 ›
                </Button>
              }
              className="admin-dashboard-card"
            >
              <div className="admin-ranking-list">
                {(businessStats?.topTechnicians || []).slice(0, 5).map((item, index) => (
                  <div
                    className="admin-ranking-item"
                    key={item.technicianId}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/technicians?openId=${item.technicianId}`)}
                  >
                    <span className="admin-ranking-item__number">{index + 1}</span>
                    <span className="admin-ranking-item__name">{item.technicianName}</span>
                    <span className="admin-ranking-item__value">
                      ¥{Number(item.totalRevenue).toFixed(0)}
                      <small>{item.orderCount} 单</small>
                    </span>
                  </div>
                ))}
                {!businessStats?.topTechnicians?.length && (
                  <Text type="secondary">暂无活跃美甲师记账数据</Text>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </section>
    </div>
  );
};

export default Dashboard;
