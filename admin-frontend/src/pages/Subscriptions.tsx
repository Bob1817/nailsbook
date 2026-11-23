import React, { useCallback, useEffect, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  message,
  Card,
  Tabs,
  Row,
  Col,
  Statistic,
  Grid,
  Space,
  Empty,
  Spin,
  Pagination,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DollarOutlined,
  CrownOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { subscriptionService } from '../services/subscription';
import type {
  SubscriptionMetrics,
  SubscriptionPayment,
  SubscriptionPaymentResponse,
  SubscriptionPlan,
  SubscriptionPlanInput,
  TechnicianSubscription,
} from '../services/subscription';
import AdminPageHeader from '../components/AdminPageHeader';

const { Text } = Typography;

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  paid: { label: '已支付', color: 'success' },
  created: { label: '待支付', color: 'processing' },
  closed: { label: '已关闭', color: 'default' },
  failed: { label: '支付失败', color: 'error' },
  refunded: { label: '已退款', color: 'warning' },
};

const Subscriptions: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [technicianSubscriptions, setTechnicianSubscriptions] = useState<TechnicianSubscription[]>([]);
  const [paymentsRes, setPaymentsRes] = useState<SubscriptionPaymentResponse | null>(null);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [metrics, setMetrics] = useState<SubscriptionMetrics>({
    upgradeTriggers: [],
    subscriptionChanges: [],
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchPlans = async () => {
    try {
      const result = await subscriptionService.getPlans();
      setPlans(result);
    } catch {
      message.error('获取套餐数据失败');
    }
  };

  const fetchTechnicianSubscriptions = async () => {
    setLoading(true);
    try {
      const result = await subscriptionService.getTechnicianSubscriptions();
      setTechnicianSubscriptions(result);
    } catch {
      message.error('获取订阅数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const result = await subscriptionService.getPayments({
        page: paymentPage,
        limit: 15,
        status: paymentStatus,
      });
      setPaymentsRes(result);
    } catch {
      message.error('获取订阅支付流水失败');
    } finally {
      setPaymentsLoading(false);
    }
  }, [paymentPage, paymentStatus]);

  useEffect(() => {
    fetchPlans();
    fetchTechnicianSubscriptions();
    subscriptionService
      .getMetrics()
      .then(setMetrics)
      .catch(() => message.error('获取订阅指标失败'));
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleCreatePlan = async (values: SubscriptionPlanInput & { featuresText?: string }) => {
    try {
      const { featuresText, ...plan } = values;
      await subscriptionService.createPlan({
        ...plan,
        features: featuresText
          ? featuresText.split(',').map((item) => item.trim()).filter(Boolean)
          : [],
      });
      message.success('创建成功');
      setModalVisible(false);
      form.resetFields();
      fetchPlans();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '创建失败');
    }
  };

  const summary = paymentsRes?.summary || {
    totalRevenue: 0,
    last30DaysRevenue: 0,
    paidCount: 0,
    paidLast30DaysCount: 0,
    expiringIn7Days: 0,
  };

  const paidSubsCount = technicianSubscriptions.filter(
    (s) => s.status === 'active' && (s.plan?.price || 0) > 0,
  ).length;

  const paymentColumns = [
    { title: '支付单号', dataIndex: 'paymentNo', key: 'paymentNo' },
    {
      title: '美甲师',
      key: 'technician',
      render: (_: unknown, record: SubscriptionPayment) => (
        <div>
          <div>{record.technician?.name || `美甲师 #${record.technicianId || '-'}`}</div>
          {record.technician?.phone && (
            <div style={{ fontSize: 12, color: 'var(--nb-muted)' }}>{record.technician.phone}</div>
          )}
        </div>
      ),
    },
    {
      title: '订阅套餐',
      key: 'plan',
      render: (_: unknown, record: SubscriptionPayment) => record.plan?.name || '-',
    },
    {
      title: '实付金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => <Text strong>¥{Number(amount).toFixed(2)}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const cfg = PAYMENT_STATUS_MAP[status] || { label: status, color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '支付时间',
      dataIndex: 'paidAt',
      key: 'paidAt',
      render: (val?: string | null) =>
        val ? new Date(val).toLocaleString('zh-CN', { hour12: false }) : '—',
    },
  ];

  const planColumns = [
    { title: '套餐名称', dataIndex: 'name', key: 'name' },
    { title: '代码', dataIndex: 'code', key: 'code' },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `¥${price.toFixed(2)}`,
    },
    { title: '计费周期', dataIndex: 'billingCycle', key: 'billingCycle' },
    {
      title: '核心额度',
      key: 'limits',
      render: (_: unknown, plan: SubscriptionPlan) => (
        <div>
          <div>客户 {plan.maxCustomers ?? '不限'} · 预约 {plan.maxMonthlyBookings ?? '不限'}/月</div>
          <div>作品 {plan.maxWorks ?? '不限'} · 宣传 {plan.maxMarketingExports ?? '不限'}/月 · 短信 {plan.maxMonthlySms ?? '不限'}/月</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag>{status === 'active' ? '启用' : '禁用'}</Tag>,
    },
  ];

  const subscriptionColumns = [
    {
      title: '美甲师',
      key: 'technician',
      render: (_: unknown, record: TechnicianSubscription) => (
        <div>
          <div>{record.technician?.name || `美甲师 #${record.technicianId}`}</div>
          {record.technician?.phone && (
            <div style={{ fontSize: 12, color: 'var(--nb-muted)' }}>{record.technician.phone}</div>
          )}
        </div>
      ),
    },
    {
      title: '当前套餐',
      key: 'plan',
      render: (_: unknown, record: TechnicianSubscription) => (
        <Tag color={(record.plan?.price || 0) > 0 ? 'blue' : 'default'}>
          {record.plan?.name || '-'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const textMap: Record<string, string> = {
          active: '生效中',
          expired: '已过期',
          cancelled: '已取消',
        };
        return <Tag>{textMap[status] || status}</Tag>;
      },
    },
    {
      title: '开始时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (text: string) => new Date(text).toLocaleDateString('zh-CN'),
    },
    {
      title: '到期时间',
      dataIndex: 'expiredAt',
      key: 'expiredAt',
      render: (text?: string) => (text ? new Date(text).toLocaleDateString('zh-CN') : '永久'),
    },
  ];

  const tabItems = [
    {
      key: 'payments',
      label: '订阅支付流水',
      children: (
        <div>
          <Space style={{ marginBottom: 16, width: '100%' }} wrap>
            <Select
              allowClear
              placeholder="筛选支付状态"
              style={{ width: isMobile ? '100%' : 160 }}
              value={paymentStatus}
              onChange={(val) => {
                setPaymentStatus(val);
                setPaymentPage(1);
              }}
              options={[
                { value: 'paid', label: '已支付' },
                { value: 'created', label: '待支付' },
                { value: 'closed', label: '已关闭' },
                { value: 'refunded', label: '已退款' },
              ]}
            />
          </Space>

          {isMobile ? (
            paymentsLoading ? (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <Spin />
              </div>
            ) : !paymentsRes?.data?.length ? (
              <Empty description="暂无订阅支付流水" />
            ) : (
              <div>
                {paymentsRes.data.map((item) => {
                  const cfg = PAYMENT_STATUS_MAP[item.status] || {
                    label: item.status,
                    color: 'default',
                  };
                  return (
                    <div key={item.id} className="admin-app-card">
                      <div className="admin-app-card-head">
                        <span className="admin-app-card-title">
                          {item.technician?.name || `美甲师 #${item.technicianId}`}
                        </span>
                        <Tag color={cfg.color}>{cfg.label}</Tag>
                      </div>
                      <div className="admin-app-card-body">
                        <div className="admin-app-card-row">
                          <span className="admin-app-card-label">实付金额</span>
                          <span className="admin-app-card-value">
                            <Text strong>¥{Number(item.amount).toFixed(2)}</Text>
                          </span>
                        </div>
                        <div className="admin-app-card-row">
                          <span className="admin-app-card-label">套餐</span>
                          <span className="admin-app-card-value">{item.plan?.name || '—'}</span>
                        </div>
                        <div className="admin-app-card-row">
                          <span className="admin-app-card-label">单号</span>
                          <span className="admin-app-card-value" style={{ fontSize: 12 }}>
                            {item.paymentNo}
                          </span>
                        </div>
                        <div className="admin-app-card-row">
                          <span className="admin-app-card-label">支付时间</span>
                          <span className="admin-app-card-value" style={{ fontSize: 12 }}>
                            {item.paidAt
                              ? new Date(item.paidAt).toLocaleString('zh-CN', { hour12: false })
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Pagination
                  size="small"
                  current={paymentPage}
                  pageSize={15}
                  total={paymentsRes.meta.total}
                  onChange={(p) => setPaymentPage(p)}
                  style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}
                />
              </div>
            )
          ) : (
            <Table
              columns={paymentColumns}
              dataSource={paymentsRes?.data || []}
              rowKey="id"
              loading={paymentsLoading}
              scroll={{ x: 820 }}
              pagination={{
                current: paymentPage,
                pageSize: 15,
                total: paymentsRes?.meta.total || 0,
                showTotal: (t) => `共 ${t} 笔`,
                onChange: (p) => setPaymentPage(p),
              }}
            />
          )}
        </div>
      ),
    },
    {
      key: 'subscriptions',
      label: '美甲师订阅列表',
      children: isMobile ? (
        loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Spin />
          </div>
        ) : !technicianSubscriptions.length ? (
          <Empty description="暂无美甲师订阅记录" />
        ) : (
          <div>
            {technicianSubscriptions.map((sub) => (
              <div key={sub.id} className="admin-app-card">
                <div className="admin-app-card-head">
                  <span className="admin-app-card-title">
                    {sub.technician?.name || `美甲师 #${sub.technicianId}`}
                  </span>
                  <Tag color={(sub.plan?.price || 0) > 0 ? 'blue' : 'default'}>
                    {sub.plan?.name || '-'}
                  </Tag>
                </div>
                <div className="admin-app-card-body">
                  <div className="admin-app-card-row">
                    <span className="admin-app-card-label">手机号</span>
                    <span className="admin-app-card-value">{sub.technician?.phone || '—'}</span>
                  </div>
                  <div className="admin-app-card-row">
                    <span className="admin-app-card-label">到期时间</span>
                    <span className="admin-app-card-value">
                      {sub.expiredAt ? new Date(sub.expiredAt).toLocaleDateString('zh-CN') : '永久'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <Table
          columns={subscriptionColumns}
          dataSource={technicianSubscriptions}
          scroll={{ x: 760 }}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      ),
    },
    {
      key: 'plans',
      label: '套餐配置',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ minHeight: 44 }}
              onClick={() => setModalVisible(true)}
            >
              新增套餐
            </Button>
          </div>
          <Table
            columns={planColumns}
            dataSource={plans}
            rowKey="id"
            pagination={false}
            scroll={{ x: 860 }}
          />
        </div>
      ),
    },
    {
      key: 'metrics',
      label: '升级转化分析',
      children: (
        <div>
          <Table
            rowKey={(row) => `${row.source}-${row.planCode || 'unknown'}`}
            pagination={false}
            scroll={{ x: 560 }}
            dataSource={metrics.upgradeTriggers}
            columns={[
              { title: '触发场景', dataIndex: 'source', key: 'source' },
              {
                title: '当前套餐',
                dataIndex: 'planCode',
                key: 'planCode',
                render: (value?: string) => value || '未知',
              },
              { title: '触发次数', dataIndex: 'count', key: 'count' },
            ]}
          />
          <Table
            style={{ marginTop: 24 }}
            rowKey="reason"
            scroll={{ x: 520 }}
            pagination={false}
            dataSource={metrics.subscriptionChanges}
            columns={[
              { title: '套餐变更原因', dataIndex: 'reason', key: 'reason' },
              { title: '发生次数', dataIndex: 'count', key: 'count' },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="订阅与收入"
        description="查看平台 SaaS 订阅实收、微信支付流水、美甲师订阅状态与套餐配额配置。"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} lg={6}>
          <Card className="admin-metric-card">
            <Statistic
              title="累计订阅实收"
              value={summary.totalRevenue}
              prefix={<DollarOutlined />}
              precision={2}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              近30天 ¥{summary.last30DaysRevenue.toFixed(2)}
            </Text>
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="admin-metric-card">
            <Statistic
              title="有效付费美甲师"
              value={paidSubsCount}
              prefix={<CrownOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              总订阅记录 {technicianSubscriptions.length} 位
            </Text>
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="admin-metric-card">
            <Statistic
              title="已支付订阅单"
              value={summary.paidCount}
              prefix={<CheckCircleOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              近30天 {summary.paidLast30DaysCount} 笔
            </Text>
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="admin-metric-card">
            <Statistic
              title="7天内即将到期"
              value={summary.expiringIn7Days}
              prefix={<ClockCircleOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              付费套餐续费预警
            </Text>
          </Card>
        </Col>
      </Row>

      <Card className="admin-list-card">
        <Tabs items={tabItems} />
      </Card>

      <Modal
        title="新增套餐"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={isMobile ? '94vw' : 560}
      >
        <Form form={form} layout="vertical" onFinish={handleCreatePlan}>
          <Form.Item name="name" label="套餐名称" rules={[{ required: true, message: '请输入套餐名称' }]}>
            <Input placeholder="请输入套餐名称" />
          </Form.Item>
          <Form.Item name="code" label="套餐代码" rules={[{ required: true, message: '请输入套餐代码' }]}>
            <Input placeholder="请输入套餐代码" />
          </Form.Item>
          <Form.Item name="price" label="价格" rules={[{ required: true, message: '请输入价格' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="billingCycle" label="计费周期" rules={[{ required: true, message: '请选择计费周期' }]}>
            <Select
              options={[
                { value: 'free', label: '免费' },
                { value: 'monthly', label: '月付' },
                { value: 'yearly', label: '年付' },
              ]}
            />
          </Form.Item>
          <Form.Item name="maxCustomers" label="最大客户数">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示无限制" />
          </Form.Item>
          <Form.Item name="maxMonthlyBookings" label="最大月预约数">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示无限制" />
          </Form.Item>
          <Form.Item name="maxWorks" label="最大作品数">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示无限制" />
          </Form.Item>
          <Form.Item name="maxStorageBytes" label="最大存储字节数">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="例如 5368709120（5GB）" />
          </Form.Item>
          <Form.Item name="maxMarketingExports" label="每月宣传导出次数">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示无限制" />
          </Form.Item>
          <Form.Item name="maxMonthlySms" label="每月短信额度">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示无限制" />
          </Form.Item>
          <Form.Item name="maxEmployees" label="员工账号数">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="仅本人填写 1" />
          </Form.Item>
          <Form.Item name="maxBookingPages" label="预约页面数">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="留空表示无限制" />
          </Form.Item>
          <Form.Item name="targetStage" label="适用经营阶段">
            <Input placeholder="例如：稳定经营的个人美甲师" />
          </Form.Item>
          <Form.Item name="description" label="套餐说明">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="featuresText" label="功能代码">
            <Input.TextArea rows={2} placeholder="使用英文逗号分隔" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Subscriptions;
