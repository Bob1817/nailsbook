import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Col, Row, Spin, Statistic, Table, Tabs, Tag, Typography, message } from 'antd';
import {
  CalendarOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
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

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_quote: { label: '待报价', color: 'blue' },
  pending_agree: { label: '待客户同意', color: 'geekblue' },
  pending_confirm: { label: '待确认', color: 'processing' },
  pending_home: { label: '待上门', color: 'cyan' },
  pending_shop: { label: '待到店', color: 'purple' },
  in_progress: { label: '服务中', color: 'orange' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'default' },
  expired: { label: '已过期', color: 'default' },
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const revenueChartRef = useRef<HTMLDivElement | null>(null);
  const subscriptionChartRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [businessStats, setBusinessStats] = useState<BusinessStats | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const [overviewResult, businessResult] = await Promise.allSettled([
        dashboardService.getOverview(),
        dashboardService.getBusinessStats(),
      ]);
      if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value);
      else message.error('获取运营总览失败');
      if (businessResult.status === 'fulfilled') setBusinessStats(businessResult.value);
      setLoading(false);
    };
    fetchDashboardData();
  }, []);

  const revenueOption = useMemo(() => {
    const values = [...(businessStats?.dailyRevenue || [])].reverse();
    return {
      color: [colors.link],
      grid: { left: 54, right: 18, top: 24, bottom: 36 },
      tooltip: { trigger: 'axis', valueFormatter: (value: number) => `¥${Number(value).toFixed(2)}` },
      xAxis: { type: 'category', boundaryGap: false, data: values.map(item => item.date), axisLine: { lineStyle: { color: colors.line } }, axisLabel: { color: colors.muted } },
      yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: colors.line } }, axisLabel: { color: colors.muted } },
      series: [{ name: '确认收入', type: 'line', smooth: true, symbol: 'circle', symbolSize: 7, lineStyle: { width: 3 }, areaStyle: { color: 'rgba(82, 100, 119, 0.10)' }, data: values.map(item => Number(item.totalAmount)) }],
    };
  }, [businessStats]);

  const subscriptionOption = useMemo(() => ({
    color: [colors.ink, colors.link, colors.muted, colors.control],
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: colors.secondary } },
    series: [{
      type: 'pie',
      radius: ['48%', '70%'],
      center: ['50%', '43%'],
      label: { show: false },
      itemStyle: { borderRadius: 8, borderColor: colors.surface, borderWidth: 3 },
      data: (overview?.subscriptionStats.byPlan || []).map(item => ({ value: item.count, name: item.planName })),
    }],
  }), [overview]);

  useEffect(() => {
    const charts: echarts.ECharts[] = [];
    if (revenueChartRef.current && businessStats) {
      const chart = echarts.init(revenueChartRef.current);
      chart.setOption(revenueOption);
      charts.push(chart);
    }
    if (subscriptionChartRef.current && overview) {
      const chart = echarts.init(subscriptionChartRef.current);
      chart.setOption(subscriptionOption);
      charts.push(chart);
    }
    const resize = () => charts.forEach(chart => chart.resize());
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      charts.forEach(chart => chart.dispose());
    };
  }, [businessStats, overview, revenueOption, subscriptionOption]);

  if (loading || !overview) {
    return <div className="admin-loading"><Spin size="large" /></div>;
  }

  const orderColumns = [
    { title: '预约编号', dataIndex: 'orderNo', key: 'orderNo' },
    { title: '美甲师', dataIndex: ['technician', 'name'], key: 'technician' },
    { title: '客户', dataIndex: ['customer', 'name'], key: 'customer' },
    { title: '预约时间', dataIndex: 'startTime', key: 'startTime', render: (value: string) => new Date(value).toLocaleString('zh-CN') },
    { title: '状态', dataIndex: 'status', key: 'status', render: (status: string) => {
      const conf = ORDER_STATUS_CONFIG[status];
      return <Tag color={conf?.color || 'default'}>{conf?.label || status}</Tag>;
    } },
  ];
  const revenueColumns = [
    { title: '收入编号', dataIndex: 'revenueNo', key: 'revenueNo' },
    { title: '美甲师', dataIndex: ['technician', 'name'], key: 'technician' },
    { title: '客户', dataIndex: ['customer', 'name'], key: 'customer' },
    { title: '金额', dataIndex: 'amount', key: 'amount', render: (amount: number) => <Text strong>¥{Number(amount).toFixed(2)}</Text> },
    { title: '确认时间', dataIndex: 'recognizedAt', key: 'recognizedAt', render: (value: string) => new Date(value).toLocaleString('zh-CN') },
  ];

  const taskItems = [
    { label: '待美甲师确认', value: overview.orderStats.pending, status: 'pending_confirm', icon: <CalendarOutlined /> },
    { label: '待上门服务', value: overview.orderStats.pendingHome, status: 'pending_home', icon: <ShopOutlined /> },
    { label: '待客户到店', value: overview.orderStats.pendingShop, status: 'pending_shop', icon: <ShopOutlined /> },
  ];

  return (
    <div>
      <AdminPageHeader title="运营总览" description="查看平台经营状态，并优先处理影响履约的预约。" />

      <Row gutter={[16, 16]}>
        <Col xs={12} xl={6}>
          <Card className="admin-metric-card"><Statistic title="美甲师" value={overview.technicianStats.total} prefix={<TeamOutlined />} /><Text type="secondary">活跃 {overview.technicianStats.active} · 近30天新增 {overview.technicianStats.newLast30Days}</Text></Card>
        </Col>
        <Col xs={12} xl={6}>
          <Card className="admin-metric-card"><Statistic title="客户" value={overview.customerStats.total} prefix={<UserOutlined />} /><Text type="secondary">近30天新增 {overview.customerStats.newLast30Days}</Text></Card>
        </Col>
        <Col xs={12} xl={6}>
          <Card className="admin-metric-card"><Statistic title="预约" value={overview.orderStats.total} prefix={<CalendarOutlined />} /><Text type="secondary">已完成 {overview.orderStats.completed}</Text></Card>
        </Col>
        <Col xs={12} xl={6}>
          <Card className="admin-metric-card"><Statistic title="确认收入" value={overview.revenueStats.total} prefix="¥" precision={2} /><Text type="secondary">近30天 ¥{Number(overview.revenueStats.last30Days).toFixed(2)}</Text></Card>
        </Col>
      </Row>

      <section className="admin-section">
        <div className="admin-section-heading"><Title level={4}>预约待办</Title><Text type="secondary">点击后进入对应预约队列</Text></div>
        <div className="admin-task-grid">
          {taskItems.map(item => (
            <button key={item.status} type="button" className="admin-task-card" onClick={() => navigate(`/orders?status=${item.status}`)}>
              <span className="admin-task-card__icon">{item.icon}</span>
              <span><strong>{item.value}</strong><small>{item.label}</small></span>
              <span className="admin-task-card__arrow">›</span>
            </button>
          ))}
        </div>
      </section>

      <Row gutter={[16, 16]} className="admin-section">
        <Col xs={24} xl={16}>
          <Card title="近30天确认收入" className="admin-dashboard-card"><div ref={revenueChartRef} className="admin-chart" /></Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="有效订阅分布" extra={<Text type="secondary">{overview.subscriptionStats.active} 个</Text>} className="admin-dashboard-card"><div ref={subscriptionChartRef} className="admin-chart" /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="admin-section">
        <Col xs={24} xl={17}>
          <Card className="admin-dashboard-card">
            <Tabs items={[
              { key: 'orders', label: '最近预约', children: <Table columns={orderColumns} dataSource={overview.recentOrders} rowKey="id" pagination={false} size="small" scroll={{ x: 720 }} onRow={row => ({ onClick: () => navigate(`/orders?order=${row.id}`), className: 'admin-clickable-row' })} /> },
              { key: 'revenues', label: '最近收入', children: <Table columns={revenueColumns} dataSource={overview.recentRevenues} rowKey="id" pagination={false} size="small" scroll={{ x: 680 }} /> },
            ]} />
          </Card>
        </Col>
        <Col xs={24} xl={7}>
          <Card title="美甲师经营排行" className="admin-dashboard-card">
            <div className="admin-ranking-list">
              {(businessStats?.topTechnicians || []).slice(0, 5).map((item, index) => (
                <div className="admin-ranking-item" key={item.technicianId}>
                  <span className="admin-ranking-item__number">{index + 1}</span>
                  <span className="admin-ranking-item__name">{item.technicianName}</span>
                  <span className="admin-ranking-item__value">¥{Number(item.totalRevenue).toFixed(2)}<small>{item.orderCount} 单</small></span>
                </div>
              ))}
              {!businessStats?.topTechnicians.length && <Text type="secondary">暂无已确认收入</Text>}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
