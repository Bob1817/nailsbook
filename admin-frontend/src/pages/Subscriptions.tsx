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
  DatePicker,
  Divider,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  PlusOutlined,
  DollarOutlined,
  CrownOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { subscriptionService } from '../services/subscription';
import type {
  PlanTemplate,
  SubscriptionMetrics,
  SubscriptionPayment,
  SubscriptionPaymentResponse,
  SubscriptionPlan,
  SubscriptionPlanInput,
  TechnicianSubscription,
} from '../services/subscription';
import { useAuth } from '../contexts/AuthContext';
import AdminPageHeader from '../components/AdminPageHeader';
import ManageSubscriptionModal, {
  type ManageSubscriptionTarget,
} from '../components/ManageSubscriptionModal';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const BILLING_CYCLE_LABELS: Record<string, string> = {
  free: '免费',
  monthly: '按月（30天）',
  quarterly: '按季度（90天）',
  yearly: '按年（365天）',
  permanent: '永久有效',
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  paid: { label: '已支付', color: 'success' },
  pending: { label: '支付中', color: 'processing' },
  created: { label: '待支付', color: 'processing' },
  cancelled: { label: '已取消', color: 'default' },
  closed: { label: '已关闭', color: 'default' },
  failed: { label: '支付失败', color: 'error' },
  refunded: { label: '已退款', color: 'warning' },
};

const Subscriptions: React.FC = () => {
  const { hasPermission } = useAuth();
  const canUpdateSub = hasPermission('subscription:update');
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planTemplates, setPlanTemplates] = useState<PlanTemplate[]>([]);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
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
  const [manageTarget, setManageTarget] = useState<ManageSubscriptionTarget | null>(null);
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
    subscriptionService
      .getPlanTemplates()
      .then(setPlanTemplates)
      .catch(() => {});
    fetchTechnicianSubscriptions();
    subscriptionService
      .getMetrics()
      .then(setMetrics)
      .catch(() => message.error('获取订阅指标失败'));
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const applyTemplate = (templateCode: string) => {
    const tpl = planTemplates.find((t) => t.templateCode === templateCode);
    if (!tpl) return;
    form.setFieldsValue({
      templateCode: tpl.templateCode,
      name: tpl.name,
      price: tpl.price,
      billingCycle: tpl.billingCycle,
      maxCustomers: tpl.maxCustomers ?? undefined,
      maxMonthlyBookings: tpl.maxMonthlyBookings ?? undefined,
      maxWorks: tpl.maxWorks ?? undefined,
      maxStorageBytes: tpl.maxStorageBytes ?? undefined,
      maxMarketingExports: tpl.maxMarketingExports ?? undefined,
      maxMonthlySms: tpl.maxMonthlySms ?? undefined,
      maxEmployees: tpl.maxEmployees ?? undefined,
      maxBookingPages: tpl.maxBookingPages ?? undefined,
      targetStage: tpl.targetStage,
      description: tpl.description,
      featuresText: (tpl.features || []).join(', '),
    });
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active', sortOrder: 0, billingCycle: 'monthly' });
    setModalVisible(true);
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    const featuresArr = Array.isArray(plan.features)
      ? plan.features
      : typeof plan.features === 'string'
        ? (() => {
            try {
              const p = JSON.parse(plan.features);
              return Array.isArray(p) ? p : [];
            } catch {
              return [];
            }
          })()
        : [];
    form.setFieldsValue({
      ...plan,
      discountPrice: plan.discountPrice ?? undefined,
      effectiveRange:
        plan.effectiveStartAt || plan.effectiveEndAt
          ? [
              plan.effectiveStartAt ? dayjs(plan.effectiveStartAt) : null,
              plan.effectiveEndAt ? dayjs(plan.effectiveEndAt) : null,
            ]
          : undefined,
      discountRange:
        plan.discountStartAt || plan.discountEndAt
          ? [
              plan.discountStartAt ? dayjs(plan.discountStartAt) : null,
              plan.discountEndAt ? dayjs(plan.discountEndAt) : null,
            ]
          : undefined,
      featuresText: featuresArr.join(', '),
    });
    setModalVisible(true);
  };

  const handleSavePlan = async (
    values: SubscriptionPlanInput & {
      featuresText?: string;
      effectiveRange?: [Dayjs | null, Dayjs | null];
      discountRange?: [Dayjs | null, Dayjs | null];
    },
  ) => {
    try {
      const { featuresText, effectiveRange, discountRange, ...plan } = values;
      const payload: SubscriptionPlanInput = {
        ...plan,
        discountPrice: plan.discountPrice ?? null,
        effectiveStartAt: effectiveRange?.[0] ? effectiveRange[0].toISOString() : null,
        effectiveEndAt: effectiveRange?.[1] ? effectiveRange[1].toISOString() : null,
        discountStartAt: discountRange?.[0] ? discountRange[0].toISOString() : null,
        discountEndAt: discountRange?.[1] ? discountRange[1].toISOString() : null,
        features: featuresText
          ? featuresText.split(',').map((item) => item.trim()).filter(Boolean)
          : [],
      };
      if (editingPlan) {
        await subscriptionService.updatePlan(editingPlan.id, payload);
        message.success('套餐已更新');
      } else {
        await subscriptionService.createPlan(payload);
        message.success('创建成功');
      }
      setModalVisible(false);
      setEditingPlan(null);
      form.resetFields();
      fetchPlans();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || (editingPlan ? '更新失败' : '创建失败'));
    }
  };

  const handleTogglePlanStatus = async (plan: SubscriptionPlan) => {
    const nextStatus = plan.status === 'active' ? 'inactive' : 'active';
    try {
      await subscriptionService.updatePlan(plan.id, { status: nextStatus });
      message.success(nextStatus === 'active' ? '已启用套餐' : '已停用套餐');
      fetchPlans();
    } catch {
      message.error('操作失败');
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
      title: '目标套餐',
      key: 'plan',
      render: (_: unknown, record: SubscriptionPayment) => record.plan?.name || '—',
    },
    {
      title: '应付金额',
      key: 'payableAmount',
      render: (_: unknown, record: SubscriptionPayment) => (
        <Text>¥{Number(record.payableAmount ?? record.amount ?? 0).toFixed(2)}</Text>
      ),
    },
    {
      title: '实付金额',
      key: 'paidAmount',
      render: (_: unknown, record: SubscriptionPayment) =>
        record.status === 'paid' && record.paidAmount != null ? (
          <Text strong>¥{Number(record.paidAmount).toFixed(2)}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: SubscriptionPayment) => {
        const cfg = PAYMENT_STATUS_MAP[status] || { label: status, color: 'default' };
        return (
          <div>
            <Tag color={cfg.color}>{cfg.label}</Tag>
            {record.failureReason && status !== 'paid' && (
              <div style={{ fontSize: 12, color: 'var(--nb-muted)', marginTop: 2 }}>
                {record.failureReason}
              </div>
            )}
          </div>
        );
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
    {
      title: '套餐名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, plan: SubscriptionPlan) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 12, color: 'var(--nb-muted)' }}>
            {plan.code}
            {plan.templateCode ? ` · 模板:${plan.templateCode}` : ''}
          </div>
        </div>
      ),
    },
    {
      title: '价格（原价/折扣）',
      key: 'price',
      render: (_: unknown, plan: SubscriptionPlan) => (
        <div>
          {plan.discountPrice != null && plan.discountPrice < plan.price ? (
            <div>
              <Text strong style={{ color: 'var(--nb-money)' }}>
                ¥{Number(plan.discountPrice).toFixed(2)}
              </Text>{' '}
              <Text delete type="secondary" style={{ fontSize: 12 }}>
                ¥{Number(plan.price).toFixed(2)}
              </Text>
              <div>
                <Tag color={plan.discountActive ? 'green' : 'default'} style={{ marginTop: 2 }}>
                  {plan.discountActive ? '折扣生效中' : '折扣未生效'}
                </Tag>
              </div>
            </div>
          ) : (
            <Text strong>¥{Number(plan.price).toFixed(2)}</Text>
          )}
        </div>
      ),
    },
    {
      title: '计费周期',
      dataIndex: 'billingCycle',
      key: 'billingCycle',
      render: (cycle: string) => BILLING_CYCLE_LABELS[cycle] || cycle,
    },
    {
      title: '生效时间',
      key: 'effectiveWindow',
      render: (_: unknown, plan: SubscriptionPlan) => (
        <div style={{ fontSize: 12 }}>
          <div>
            套餐：
            {plan.effectiveStartAt || plan.effectiveEndAt
              ? `${plan.effectiveStartAt ? dayjs(plan.effectiveStartAt).format('MM-DD HH:mm') : '即日'} ~ ${plan.effectiveEndAt ? dayjs(plan.effectiveEndAt).format('MM-DD HH:mm') : '长期'}`
              : '长期有效'}
          </div>
          {plan.discountPrice != null && (
            <div style={{ color: 'var(--nb-muted)' }}>
              折扣：
              {plan.discountStartAt || plan.discountEndAt
                ? `${plan.discountStartAt ? dayjs(plan.discountStartAt).format('MM-DD HH:mm') : '即日'} ~ ${plan.discountEndAt ? dayjs(plan.discountEndAt).format('MM-DD HH:mm') : '长期'}`
                : '随套餐生效'}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '核心额度',
      key: 'limits',
      render: (_: unknown, plan: SubscriptionPlan) => (
        <div style={{ fontSize: 12 }}>
          <div>客户 {plan.maxCustomers ?? '不限'} · 预约 {plan.maxMonthlyBookings ?? '不限'}/月</div>
          <div>作品 {plan.maxWorks ?? '不限'} · 宣传 {plan.maxMarketingExports ?? '不限'}/月 · 短信 {plan.maxMonthlySms ?? '不限'}/月</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, plan: SubscriptionPlan) => {
        if (status !== 'active') return <Tag color="default">已停用</Tag>;
        if (plan.isCurrentlyEffective === false) {
          const now = Date.now();
          if (plan.effectiveStartAt && new Date(plan.effectiveStartAt).getTime() > now) {
            return <Tag color="processing">未到生效时间</Tag>;
          }
          return <Tag color="warning">已过期失效</Tag>;
        }
        return <Tag color="success">生效中</Tag>;
      },
    },
    ...(canUpdateSub
      ? [
          {
            title: '操作',
            key: 'action',
            width: 140,
            render: (_: unknown, plan: SubscriptionPlan) => (
              <Space size={4}>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  style={{ padding: 0 }}
                  onClick={() => openEditModal(plan)}
                >
                  编辑
                </Button>
                <Button
                  type="link"
                  size="small"
                  danger={plan.status === 'active'}
                  style={{ padding: 0 }}
                  onClick={() => handleTogglePlanStatus(plan)}
                >
                  {plan.status === 'active' ? '停用' : '启用'}
                </Button>
              </Space>
            ),
          },
        ]
      : []),
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
    ...(canUpdateSub
      ? [
          {
            title: '操作',
            key: 'action',
            width: 120,
            render: (_: unknown, record: TechnicianSubscription) => (
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                style={{ padding: 0 }}
                onClick={() =>
                  setManageTarget({
                    technicianId: record.technicianId,
                    technicianName: record.technician?.name || `美甲师 #${record.technicianId}`,
                    technicianPhone: record.technician?.phone,
                    currentPlanId: record.planId,
                    currentPlanName: record.plan?.name,
                    currentExpiredAt: record.expiredAt || null,
                  })
                }
              >
                调整订阅
              </Button>
            ),
          },
        ]
      : []),
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
                { value: 'pending', label: '支付中' },
                { value: 'cancelled', label: '已取消' },
                { value: 'failed', label: '支付失败' },
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
                          <span className="admin-app-card-label">应付金额</span>
                          <span className="admin-app-card-value">
                            ¥{Number(item.payableAmount ?? item.amount ?? 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="admin-app-card-row">
                          <span className="admin-app-card-label">实付金额</span>
                          <span className="admin-app-card-value">
                            {item.status === 'paid' && item.paidAmount != null ? (
                              <Text strong>¥{Number(item.paidAmount).toFixed(2)}</Text>
                            ) : (
                              <Text type="secondary">—</Text>
                            )}
                          </span>
                        </div>
                        <div className="admin-app-card-row">
                          <span className="admin-app-card-label">目标套餐</span>
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
                {canUpdateSub && (
                  <div className="admin-app-card-actions">
                    <Button
                      type="primary"
                      icon={<EditOutlined />}
                      onClick={() =>
                        setManageTarget({
                          technicianId: sub.technicianId,
                          technicianName: sub.technician?.name || `美甲师 #${sub.technicianId}`,
                          technicianPhone: sub.technician?.phone,
                          currentPlanId: sub.planId,
                          currentPlanName: sub.plan?.name,
                          currentExpiredAt: sub.expiredAt || null,
                        })
                      }
                    >
                      调整套餐与到期时间
                    </Button>
                  </div>
                )}
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
              onClick={openCreateModal}
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
        title={editingPlan ? `编辑套餐 · ${editingPlan.name}` : '新增套餐（基于管理模板）'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingPlan(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={isMobile ? '94vw' : 640}
      >
        <Form form={form} layout="vertical" onFinish={handleSavePlan}>
          {!editingPlan && planTemplates.length > 0 && (
            <Form.Item label="选择套餐管理模板（快速填充配额与功能）" name="templateCode">
              <Select
                allowClear
                placeholder="请选择标准模板或留空自定义"
                onChange={(val) => val && applyTemplate(val)}
                options={[
                  ...planTemplates.map((t) => ({
                    value: t.templateCode,
                    label: `${t.name}模板（¥${t.price}/${BILLING_CYCLE_LABELS[t.billingCycle] || t.billingCycle}）`,
                  })),
                ]}
              />
            </Form.Item>
          )}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="name" label="套餐名称" rules={[{ required: true, message: '请输入套餐名称' }]}>
                <Input placeholder="例如：高阶季度版" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="code" label="套餐代码" rules={[{ required: true, message: '请输入套餐代码' }]}>
                <Input disabled={Boolean(editingPlan)} placeholder="例如：advanced_q" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="billingCycle" label="计费周期" rules={[{ required: true, message: '请选择计费周期' }]}>
                <Select
                  options={[
                    { value: 'free', label: '免费' },
                    { value: 'monthly', label: '按月（30天）' },
                    { value: 'quarterly', label: '按季度（90天）' },
                    { value: 'yearly', label: '按年（365天）' },
                    { value: 'permanent', label: '永久有效' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="status" label="状态" initialValue="active">
                <Select
                  options={[
                    { value: 'active', label: '启用' },
                    { value: 'inactive', label: '停用' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="sortOrder" label="排序权重" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '8px 0 16px' }}>价格与生效时间配置</Divider>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="price" label="套餐原价（元）" rules={[{ required: true, message: '请输入原价' }]}>
                <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="原价" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="discountPrice" label="折扣价（元，选填）">
                <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="不打折留空；生效时原价划线" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="effectiveRange" label="套餐生效时间段（留空表示长期生效；未到/过期小程序自动隐藏）">
            <RangePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="discountRange" label="价格折扣生效时间段（留空表示随套餐时间同步生效）">
            <RangePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>

          <Divider style={{ margin: '8px 0 16px' }}>配额与权益模板</Divider>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="maxCustomers" label="最大客户数">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示无限制" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxMonthlyBookings" label="最大月预约数">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示无限制" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxWorks" label="最大作品数">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示无限制" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxStorageBytes" label="最大存储字节数">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="例如 5368709120（5GB）" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxMarketingExports" label="每月宣传导出次数">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示无限制" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxMonthlySms" label="每月短信额度">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示无限制" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxEmployees" label="员工账号数">
                <InputNumber min={1} style={{ width: '100%' }} placeholder="仅本人填写 1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxBookingPages" label="预约页面数">
                <InputNumber min={1} style={{ width: '100%' }} placeholder="留空表示无限制" />
              </Form.Item>
            </Col>
          </Row>
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

      <ManageSubscriptionModal
        open={Boolean(manageTarget)}
        target={manageTarget}
        plans={plans}
        onClose={() => setManageTarget(null)}
        onSuccess={() => {
          fetchTechnicianSubscriptions();
          fetchPayments();
        }}
      />
    </div>
  );
};

export default Subscriptions;
