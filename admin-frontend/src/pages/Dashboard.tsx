import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Spin, Typography } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  CrownOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { dashboardService } from '../services/dashboard';
import type { DashboardOverview } from '../services/dashboard';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardOverview | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await dashboardService.getOverview();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  const bookingColumns = [
    { title: '预约编号', dataIndex: 'bookingNo', key: 'bookingNo' },
    { title: '美甲师', dataIndex: ['technician', 'name'], key: 'technician' },
    { title: '客户', dataIndex: ['customer', 'name'], key: 'customer' },
    { 
      title: '预约时间', 
      dataIndex: 'startTime', 
      key: 'startTime',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, string> = {
          pending_confirm: '待确认',
          confirmed: '已确认',
          completed: '已完成',
          cancelled: '已取消',
        };
        return statusMap[status] || status;
      },
    },
  ];

  const revenueColumns = [
    { title: '收入编号', dataIndex: 'revenueNo', key: 'revenueNo' },
    { title: '美甲师', dataIndex: ['technician', 'name'], key: 'technician' },
    { title: '客户', dataIndex: ['customer', 'name'], key: 'customer' },
    { 
      title: '金额', 
      dataIndex: 'amount', 
      key: 'amount',
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    { 
      title: '确认时间', 
      dataIndex: 'recognizedAt', 
      key: 'recognizedAt',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
  ];

  const subscriptionOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      labelLine: { show: false },
      data: data.subscriptionStats.byPlan.map(item => ({
        value: item.count,
        name: item.planName,
      })),
    }],
  };

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>数据概览</Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="美甲师总数"
              value={data.technicianStats.total}
              prefix={<TeamOutlined />}
              suffix={<span style={{ fontSize: 14, color: '#999' }}>活跃: {data.technicianStats.active}</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="客户总数"
              value={data.customerStats.total}
              prefix={<UserOutlined />}
              styles={{ content: { color: '#3f8600' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="预约总数"
              value={data.bookingStats.total}
              prefix={<CalendarOutlined />}
              suffix={<span style={{ fontSize: 14, color: '#999' }}>待确认: {data.bookingStats.pending}</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总收入"
              value={data.revenueStats.total}
              prefix={<DollarOutlined />}
              precision={2}
              styles={{ content: { color: '#cf1322' } }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="近30天新增美甲师"
              value={data.technicianStats.newLast30Days}
              prefix={<RiseOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="近30天新增客户"
              value={data.customerStats.newLast30Days}
              prefix={<RiseOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已完成预约"
              value={data.bookingStats.completed}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="近30天收入"
              value={data.revenueStats.last30Days}
              prefix={<DollarOutlined />}
              precision={2}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="订阅分布" extra={<CrownOutlined />}>
            <ReactECharts option={subscriptionOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最近预约">
            <Table
              columns={bookingColumns}
              dataSource={data.recentBookings}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="最近收入">
            <Table
              columns={revenueColumns}
              dataSource={data.recentRevenues}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
