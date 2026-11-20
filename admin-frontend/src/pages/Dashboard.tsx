import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Drawer,
  List,
  Popconfirm,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CommentOutlined,
  FileTextOutlined,
  PictureOutlined,
  RightOutlined,
  ShopOutlined,
  TeamOutlined,
  UserDeleteOutlined,
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
import { artistApplicationService } from '../services/artistApplication';
import type { ArtistApplication } from '../services/artistApplication';

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

  // 快捷审批抽屉状态
  const [quickDrawerOpen, setQuickDrawerOpen] = useState(false);
  const [pendingApps, setPendingApps] = useState<ArtistApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const fetchPendingApps = async () => {
    setLoadingApps(true);
    try {
      const res = await artistApplicationService.getAll({ status: 'pending', page: 1, limit: 10 });
      setPendingApps(res.data || []);
    } catch {
      message.error('加载待审批申请失败');
    } finally {
      setLoadingApps(false);
    }
  };

  const openQuickApprovalDrawer = () => {
    setQuickDrawerOpen(true);
    fetchPendingApps();
  };

  const handleQuickApprove = async (id: number) => {
    setApprovingId(id);
    try {
      await artistApplicationService.approve(id);
      message.success('已审批通过并生成美甲师账号');
      setPendingApps((prev) => prev.filter((app) => app.id !== id));
      dashboardService.getOverview().then((res) => setOverview(res));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '审批操作失败');
    } finally {
      setApprovingId(null);
    }
  };

  const handleQuickReject = async (id: number) => {
    setApprovingId(id);
    try {
      await artistApplicationService.reject(id);
      message.success('已驳回该入驻申请');
      setPendingApps((prev) => prev.filter((app) => app.id !== id));
      dashboardService.getOverview().then((res) => setOverview(res));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '驳回操作失败');
    } finally {
      setApprovingId(null);
    }
  };

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

  const approvalStats = overview?.approvalStats;
  const totalPendingApprovals =
    (approvalStats?.pendingApplications ?? 0) +
    (approvalStats?.pendingWorks ?? 0) +
    (approvalStats?.pendingDeletions ?? 0) +
    (approvalStats?.pendingReports ?? 0) +
    (approvalStats?.pendingFeedbacks ?? 0);

  const approvalCards = [
    {
      key: 'applications',
      title: '美甲师入驻申请',
      count: approvalStats?.pendingApplications ?? 0,
      desc: '新美甲师实名及作品入驻审核',
      icon: <FileTextOutlined />,
      actionText: (approvalStats?.pendingApplications ?? 0) > 0 ? '快速审批 ›' : '查看列表 ›',
      onClick: () => {
        if ((approvalStats?.pendingApplications ?? 0) > 0) {
          openQuickApprovalDrawer();
        } else {
          navigate('/applications?status=pending');
        }
      },
    },
    {
      key: 'works',
      title: '作品上架审核',
      count: approvalStats?.pendingWorks ?? 0,
      desc: '美甲师发布作品与款式合规审核',
      icon: <PictureOutlined />,
      actionText: '进入作品队列 ›',
      onClick: () => navigate('/works?status=pending'),
    },
    {
      key: 'deletions',
      title: '账号注销申请',
      count: approvalStats?.pendingDeletions ?? 0,
      desc: '用户/美甲师账号注销人工复核',
      icon: <UserDeleteOutlined />,
      actionText: '复核注销 ›',
      onClick: () => navigate('/account-deletions'),
    },
    {
      key: 'reports',
      title: '违规侵权举报',
      count: approvalStats?.pendingReports ?? 0,
      desc: '作品/评价/服务违规举报处理',
      icon: <AlertOutlined />,
      actionText: '核查举报 ›',
      onClick: () => navigate('/reports?status=pending'),
    },
    {
      key: 'feedbacks',
      title: '用户体验反馈',
      count: approvalStats?.pendingFeedbacks ?? 0,
      desc: '用户与美甲师提交的建议与故障',
      icon: <CommentOutlined />,
      actionText: '跟进反馈 ›',
      onClick: () => navigate('/feedbacks'),
    },
  ];

  return (
    <div>
      <AdminPageHeader title="运营总览" description="查看平台经营状态，并优先处理影响履约的预约与审批。" />

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

      {/* 审批待办任务中心（移动端友好 + 首页直通审批） */}
      <section className="admin-section">
        <div className="admin-section-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Title level={4} style={{ margin: 0 }}>审批待办中心</Title>
            {totalPendingApprovals > 0 && (
              <Badge count={totalPendingApprovals} overflowCount={99} />
            )}
          </div>
          <Text type="secondary">支持首页一键快捷审批入驻，或直达对应事项审核队列</Text>
        </div>
        <div className="admin-approval-grid">
          {approvalCards.map(card => (
            <div
              key={card.key}
              className={`admin-approval-card ${card.count > 0 ? 'is-urgent' : ''}`}
              role="button"
              tabIndex={0}
              onClick={card.onClick}
              onKeyDown={(e) => { if (e.key === 'Enter') card.onClick(); }}
            >
              <div className="admin-approval-card__top">
                <span className="admin-approval-card__icon">{card.icon}</span>
                <Badge
                  count={card.count}
                  showZero
                  className={card.count > 0 ? 'badge-urgent' : 'badge-idle'}
                />
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

      {/* 首页快捷审批抽屉 */}
      <Drawer
        title="美甲师入驻快速审批"
        open={quickDrawerOpen}
        onClose={() => setQuickDrawerOpen(false)}
        width={480}
        extra={
          <Button
            type="link"
            onClick={() => {
              setQuickDrawerOpen(false);
              navigate('/applications?status=pending');
            }}
          >
            进入完整审批队列
          </Button>
        }
      >
        <List
          loading={loadingApps}
          dataSource={pendingApps}
          locale={{ emptyText: '当前没有待审批的美甲师申请' }}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              actions={[
                <Popconfirm
                  key="approve"
                  title="确认审批通过并开通专属美甲师账号？"
                  onConfirm={() => handleQuickApprove(item.id)}
                  okText="通过"
                  cancelText="取消"
                >
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    loading={approvingId === item.id}
                  >
                    通过
                  </Button>
                </Popconfirm>,
                <Popconfirm
                  key="reject"
                  title="确认驳回该入驻申请？"
                  onConfirm={() => handleQuickReject(item.id)}
                  okText="驳回"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    danger
                    size="small"
                    icon={<CloseCircleOutlined />}
                    loading={approvingId === item.id}
                  >
                    驳回
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space wrap>
                    <Text strong>{item.name}</Text>
                    <Tag>{item.city || '未知城市'}</Tag>
                    {item.experience && <Tag color="blue">{item.experience}</Tag>}
                  </Space>
                }
                description={
                  <div style={{ marginTop: 4 }}>
                    <div><Text type="secondary">手机号: </Text><Text copyable>{item.phone}</Text></div>
                    {item.wechat && <div><Text type="secondary">微信: </Text>{item.wechat}</div>}
                    {item.specialty && <div><Text type="secondary">擅长: </Text>{item.specialty}</div>}
                    {item.note && <div><Text type="secondary">申请备注: </Text>{item.note}</div>}
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--nb-muted)' }}>
                      申请时间: {new Date(item.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Drawer>
    </div>
  );
};

export default Dashboard;
