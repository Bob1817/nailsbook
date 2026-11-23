import React, { useCallback, useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  message,
  Popconfirm,
  Card,
  Typography,
  Drawer,
  Tabs,
  Descriptions,
  Progress,
  Grid,
  Spin,
  Empty,
  Pagination,
  Row,
  Col,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  KeyOutlined,
  CopyOutlined,
  EyeOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { technicianService } from '../services/technician';
import type { Technician, PaginatedResponse } from '../services/technician';
import { subscriptionService } from '../services/subscription';
import type { SubscriptionPlan, TechnicianSubscriptionDetail } from '../services/subscription';
import { customerService } from '../services/customer';
import type { Customer } from '../services/customer';
import { orderService } from '../services/order';
import type { AdminOrder } from '../services/order';
import { revenueService } from '../services/revenue';
import type { Revenue, RevenueStatistics } from '../services/revenue';
import { useAuth } from '../contexts/AuthContext';
import AdminPageHeader from '../components/AdminPageHeader';
import TableActions, { type TableActionItem } from '../components/TableActions';

const { Text } = Typography;

interface TechWorkItem {
  id: number;
  title?: string;
  coverUrl?: string;
  price?: number;
  publicationStatus: string;
  isVisible: boolean;
  createdAt: string;
}

const ORDER_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending_quote: { label: '待报价', color: 'blue' },
  pending_agree: { label: '待同意', color: 'geekblue' },
  pending_confirm: { label: '待确认', color: 'processing' },
  pending_home: { label: '待上门', color: 'cyan' },
  pending_shop: { label: '待到店', color: 'purple' },
  in_progress: { label: '服务中', color: 'orange' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'default' },
  expired: { label: '已过期', color: 'default' },
};

const WORK_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  approved: { label: '已上架', color: 'success' },
  pending: { label: '待审核', color: 'processing' },
  rejected: { label: '已驳回', color: 'error' },
  draft: { label: '草稿', color: 'default' },
};

const formatBytes = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${bytes}B`;
};

const Technicians: React.FC = () => {
  const { hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const canResetPassword = hasPermission('account:reset-password');
  const canUpdateSub = hasPermission('subscription:update');

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResponse<Technician> | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [filters, setFilters] = useState({ page: 1, limit: 10, status: '', search: '' });
  const [resetPwd, setResetPwd] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, string>>({});

  // 详情抽屉多 Tab 状态
  const [detailTab, setDetailTab] = useState('overview');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subDetail, setSubDetail] = useState<TechnicianSubscriptionDetail | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>(undefined);
  const [updatingPlan, setUpdatingPlan] = useState(false);

  const [techCustomers, setTechCustomers] = useState<PaginatedResponse<Customer> | null>(null);
  const [custPage, setCustPage] = useState(1);
  const [custLoading, setCustLoading] = useState(false);

  const [techOrders, setTechOrders] = useState<PaginatedResponse<AdminOrder> | null>(null);
  const [orderPage, setOrderPage] = useState(1);
  const [orderLoading, setOrderLoading] = useState(false);

  const [techRevenues, setTechRevenues] = useState<PaginatedResponse<Revenue> | null>(null);
  const [techRevStats, setTechRevStats] = useState<RevenueStatistics | null>(null);
  const [revPage, setRevPage] = useState(1);
  const [revLoading, setRevLoading] = useState(false);

  const [techWorks, setTechWorks] = useState<{ items: TechWorkItem[]; total: number }>({
    items: [],
    total: 0,
  });
  const [workPage, setWorkPage] = useState(1);
  const [workLoading, setWorkLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await technicianService.getAll({
        page: filters.page,
        limit: filters.limit,
        status: filters.status || undefined,
        search: filters.search || undefined,
      });
      setData(result);
    } catch {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    subscriptionService.getPlans().then(setPlans).catch(() => {});
  }, []);

  const openDetailDrawer = useCallback((tech: Technician) => {
    setSelectedTechnician(tech);
    setDetailTab('overview');
    setCustPage(1);
    setOrderPage(1);
    setRevPage(1);
    setWorkPage(1);
    setSubDetail(null);
    setTechCustomers(null);
    setTechOrders(null);
    setTechRevenues(null);
    setTechRevStats(null);
    setTechWorks({ items: [], total: 0 });
    setDetailVisible(true);
  }, []);

  // 支持从数据看板点击 Top 5 美甲师直接打开详情抽屉
  useEffect(() => {
    const openId = searchParams.get('openId');
    if (!openId) return;
    const idNum = Number(openId);
    if (!Number.isFinite(idNum) || idNum <= 0) return;
    technicianService
      .getById(idNum)
      .then((tech) => {
        openDetailDrawer(tech);
        searchParams.delete('openId');
        setSearchParams(searchParams, { replace: true });
      })
      .catch(() => {});
  }, [searchParams, setSearchParams, openDetailDrawer]);

  // 按需加载详情抽屉各 Tab 数据
  useEffect(() => {
    if (!detailVisible || !selectedTechnician) return;
    const techId = selectedTechnician.id;

    if (detailTab === 'overview') {
      setSubLoading(true);
      subscriptionService
        .getTechnicianDetail(techId)
        .then((res) => {
          setSubDetail(res);
          setSelectedPlanId(res.plan?.id);
        })
        .catch(() => setSubDetail(null))
        .finally(() => setSubLoading(false));
    } else if (detailTab === 'customers') {
      setCustLoading(true);
      customerService
        .getAll({ technicianId: techId, page: custPage, limit: 10 })
        .then(setTechCustomers)
        .catch(() => message.error('加载客户列表失败'))
        .finally(() => setCustLoading(false));
    } else if (detailTab === 'orders') {
      setOrderLoading(true);
      orderService
        .getAll({ technicianId: techId, page: orderPage, limit: 10 })
        .then(setTechOrders)
        .catch(() => message.error('加载预约记录失败'))
        .finally(() => setOrderLoading(false));
    } else if (detailTab === 'revenues') {
      setRevLoading(true);
      Promise.all([
        revenueService.getAll({ technicianId: techId, page: revPage, limit: 10 }),
        revenueService.getStatistics({ technicianId: techId }),
      ])
        .then(([list, stats]) => {
          setTechRevenues(list);
          setTechRevStats(stats);
        })
        .catch(() => message.error('加载美甲师流水失败'))
        .finally(() => setRevLoading(false));
    } else if (detailTab === 'works') {
      setWorkLoading(true);
      api
        .get('/works', { params: { technicianId: techId, page: workPage, pageSize: 10 } })
        .then((res) => {
          const payload = res.data;
          setTechWorks({
            items: payload?.data || payload?.items || [],
            total: payload?.meta?.total ?? payload?.total ?? 0,
          });
        })
        .catch(() => message.error('加载作品集失败'))
        .finally(() => setWorkLoading(false));
    }
  }, [detailVisible, selectedTechnician, detailTab, custPage, orderPage, revPage, workPage]);

  const handleUpdateTechPlan = async () => {
    if (!selectedTechnician || !selectedPlanId) return;
    setUpdatingPlan(true);
    try {
      await subscriptionService.updateTechnicianSubscription(selectedTechnician.id, selectedPlanId);
      message.success('美甲师订阅套餐已更新');
      const updated = await subscriptionService.getTechnicianDetail(selectedTechnician.id);
      setSubDetail(updated);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '套餐更新失败');
    } finally {
      setUpdatingPlan(false);
    }
  };

  const handleCreate = async (values: {
    name: string;
    phone: string;
    city?: string;
    serviceArea?: string;
  }) => {
    try {
      await technicianService.create(values);
      message.success('创建成功');
      setModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '创建失败');
    }
  };

  const openEdit = (technician: Technician) => {
    setSelectedTechnician(technician);
    setResetPwd(null);
    editForm.setFieldsValue({
      name: technician.name,
      phone: technician.phone,
      city: technician.city || '',
      serviceArea: technician.serviceArea || '',
      status: technician.status,
    });
    setEditVisible(true);
  };

  const handleUpdate = async (values: {
    name: string;
    phone: string;
    city?: string;
    serviceArea?: string;
    status?: string;
  }) => {
    if (!selectedTechnician) return;
    try {
      await technicianService.update(selectedTechnician.id, values);
      message.success('保存成功');
      setEditVisible(false);
      setSelectedTechnician(null);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '保存失败');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedTechnician) return;
    setResetting(true);
    try {
      const result = await technicianService.resetPassword(selectedTechnician.id);
      setResetPwd(result.tempPassword);
      message.success('密码已重置');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '重置失败');
    } finally {
      setResetting(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await technicianService.updateStatus(id, status);
      message.success('状态更新成功');
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '状态更新失败');
    }
  };

  const handleDisable = async (id: number) => {
    try {
      await technicianService.disableTechnician(id);
      message.success('禁用成功');
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '禁用失败');
    }
  };

  const handleResetFromList = async (id: number) => {
    try {
      const result = await technicianService.resetPassword(id);
      setVisiblePasswords((current) => ({ ...current, [id]: result.tempPassword }));
      Modal.success({
        title: '密码重置成功',
        content: (
          <div>
            <p>
              临时密码：
              <Text code copyable={{ text: result.tempPassword }} style={{ fontSize: 16, letterSpacing: 1 }}>
                {result.tempPassword}
              </Text>
            </p>
            <p style={{ color: 'var(--nb-muted)', fontSize: 12, marginTop: 8 }}>
              请将此密码发送给美甲师，美甲师下次登录时需重新设置密码。
            </p>
          </div>
        ),
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '重置失败');
    }
  };

  const revealPassword = async (id: number) => {
    try {
      const result = await technicianService.getManagedPassword(id);
      setVisiblePasswords((current) => ({ ...current, [id]: result.password }));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '密码读取失败');
    }
  };

  const renderStatusTag = (status: string) => {
    const colorMap: Record<string, string> = {
      active: 'success',
      inactive: 'default',
      suspended: 'error',
      deleted: 'default',
    };
    const textMap: Record<string, string> = {
      active: '活跃',
      inactive: '未激活',
      suspended: '已禁用',
      deleted: '已删除',
    };
    return <Tag color={colorMap[status]}>{textMap[status] || status}</Tag>;
  };

  const columns = [
    {
      title: '美甲师',
      dataIndex: 'name',
      key: 'name',
      render: (_: string, record: Technician) => (
        <Space>
          {record.avatarUrl ? (
            <img
              src={record.avatarUrl}
              alt={record.name}
              style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'var(--nb-page)',
                color: 'var(--nb-ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
              }}
            >
              {record.name.slice(0, 1)}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{record.name}</div>
            <div style={{ color: 'var(--nb-muted)', fontSize: 12 }}>{record.phone}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '订阅版本',
      key: 'plan',
      render: (_: unknown, record: Technician) => {
        const plan = record.subscription?.plan;
        const isPaid = Boolean(plan && plan.price > 0);
        return (
          <div>
            <Tag color={isPaid ? 'blue' : 'default'}>{plan?.name || '免费版'}</Tag>
            {record.subscription?.expiredAt && (
              <div style={{ fontSize: 11, color: 'var(--nb-muted)', marginTop: 2 }}>
                至 {new Date(record.subscription.expiredAt).toLocaleDateString('zh-CN')}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '客户 / 预约 / 作品',
      key: 'counts',
      render: (_: unknown, record: Technician) => (
        <Text style={{ fontSize: 12 }}>
          {record._count?.customers ?? 0} 客 · {record._count?.orders ?? 0} 单 ·{' '}
          {record._count?.nailWorks ?? 0} 作品
        </Text>
      ),
    },
    { title: '城市', dataIndex: 'city', key: 'city', render: (v?: string) => v || '—' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => renderStatusTag(status),
    },
    {
      title: '账号密码',
      dataIndex: 'passwordConfigured',
      key: 'passwordConfigured',
      render: (_: boolean, record: Technician) => {
        if (!record.passwordConfigured) return <Tag>未设置</Tag>;
        if (!record.managedPasswordAvailable) return <Tag color="default">用户自设</Tag>;
        if (!canResetPassword) return <Text code>••••••••</Text>;
        const password = visiblePasswords[record.id];
        return (
          <Space>
            <Text code>{password || '••••••••'}</Text>
            {password ? (
              <Button
                type="text"
                icon={<CopyOutlined />}
                style={{ minHeight: 44 }}
                onClick={() =>
                  navigator.clipboard.writeText(password).then(() => message.success('已复制'))
                }
              >
                复制
              </Button>
            ) : (
              <Button
                type="text"
                icon={<EyeOutlined />}
                style={{ minHeight: 44 }}
                onClick={() => revealPassword(record.id)}
              >
                查看
              </Button>
            )}
          </Space>
        );
      },
    },
    {
      title: '最近登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 155,
      render: (text?: string | null) =>
        text ? (
          new Date(text).toLocaleString('zh-CN', { hour12: false })
        ) : (
          <Text type="secondary">从未登录</Text>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: Technician) => {
        const actionItems: TableActionItem[] = [
          {
            key: 'detail',
            label: '详情',
            onClick: () => openDetailDrawer(record),
          },
        ];
        if (record.status !== 'deleted') {
          actionItems.push({
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => openEdit(record),
          });
        }
        if (record.status === 'active') {
          actionItems.push({
            key: 'disable',
            label: '禁用',
            danger: true,
            popconfirm: {
              title: '确定要禁用该美甲师吗？',
              description: '禁用后该账号将无法登录。',
              onConfirm: () => handleDisable(record.id),
            },
          });
          if (canResetPassword) {
            actionItems.push({
              key: 'resetPassword',
              label: '重置密码',
              popconfirm: {
                title: '确定要重置该美甲师的密码？',
                description: '重置后原密码立即失效，并强制当前登录状态失效。',
                onConfirm: () => handleResetFromList(record.id),
              },
            });
          }
        }
        if (record.status === 'suspended') {
          actionItems.push({
            key: 'enable',
            label: '启用',
            popconfirm: {
              title: '确定要启用该美甲师吗？',
              onConfirm: () => handleStatusChange(record.id, 'active'),
            },
          });
        }
        return <TableActions items={actionItems} maxInline={1} />;
      },
    },
  ];

  const renderEntitlementRow = (
    label: string,
    used: number,
    limit: number | null,
    isBytes = false,
  ) => {
    const usedText = isBytes ? formatBytes(used) : String(used);
    const limitText = limit == null ? '不限' : isBytes ? formatBytes(limit) : String(limit);
    const percent =
      limit == null ? 0 : limit === 0 ? (used > 0 ? 100 : 0) : Math.min(100, Math.round((used / limit) * 100));
    return (
      <div
        key={label}
        style={{
          padding: 12,
          borderRadius: 10,
          background: 'var(--nb-page)',
          border: '1px solid var(--nb-line)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 13 }}>{label}</Text>
          <Text strong style={{ fontSize: 13 }}>
            {usedText} / {limitText}
          </Text>
        </div>
        <Progress
          percent={percent}
          showInfo={false}
          size="small"
          status={limit != null && percent >= 100 ? 'exception' : 'normal'}
        />
      </div>
    );
  };

  return (
    <div>
      <AdminPageHeader
        title="美甲师管理"
        description="管理平台注册美甲师账号与订阅配额；点击「详情」可查看其专属客户、预约、订单、流水与作品。"
        extra={
          hasPermission('technician:create') ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ minHeight: 44 }}
              onClick={() => setModalVisible(true)}
            >
              新增美甲师
            </Button>
          ) : null
        }
      />

      <Card className="admin-list-card">
        <Space
          wrap
          style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
        >
          <Space wrap style={{ width: isMobile ? '100%' : 'auto' }}>
            <Input
              placeholder="搜索姓名/手机号"
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, page: 1, search: e.target.value })}
              style={{ width: isMobile ? '100%' : 220, minHeight: 40 }}
            />
            <Select
              placeholder="状态筛选"
              allowClear
              value={filters.status || undefined}
              onChange={(value) => setFilters({ ...filters, page: 1, status: value || '' })}
              style={{ width: isMobile ? '100%' : 130 }}
              options={[
                { value: 'active', label: '活跃' },
                { value: 'inactive', label: '未激活' },
                { value: 'suspended', label: '已禁用' },
                { value: 'deleted', label: '已删除' },
              ]}
            />
          </Space>
        </Space>

        {isMobile ? (
          loading ? (
            <div style={{ textAlign: 'center', padding: 36 }}>
              <Spin />
            </div>
          ) : !data?.data?.length ? (
            <Empty description="暂无美甲师数据" />
          ) : (
            <div>
              {data.data.map((record) => {
                const plan = record.subscription?.plan;
                return (
                  <div key={record.id} className="admin-app-card">
                    <div className="admin-app-card-head">
                      <Space size={6}>
                        <span className="admin-app-card-title">{record.name}</span>
                        <Tag color={plan && plan.price > 0 ? 'blue' : 'default'}>
                          {plan?.name || '免费版'}
                        </Tag>
                      </Space>
                      {renderStatusTag(record.status)}
                    </div>
                    <div className="admin-app-card-body">
                      <div className="admin-app-card-row">
                        <span className="admin-app-card-label">手机号</span>
                        <span className="admin-app-card-value">
                          <a href={`tel:${record.phone}`} style={{ color: 'var(--nb-link)' }}>
                            {record.phone}
                          </a>
                        </span>
                      </div>
                      <div className="admin-app-card-row">
                        <span className="admin-app-card-label">城市</span>
                        <span className="admin-app-card-value">{record.city || '—'}</span>
                      </div>
                      <div className="admin-app-card-row">
                        <span className="admin-app-card-label">业务概览</span>
                        <span className="admin-app-card-value">
                          {record._count?.customers ?? 0} 客 · {record._count?.orders ?? 0} 单 ·{' '}
                          {record._count?.nailWorks ?? 0} 作品
                        </span>
                      </div>
                    </div>
                    <div className="admin-app-card-actions">
                      <Button
                        type="primary"
                        icon={<EyeOutlined />}
                        style={{ minHeight: 44 }}
                        onClick={() => openDetailDrawer(record)}
                      >
                        详情与业务
                      </Button>
                      {record.status !== 'deleted' && (
                        <Button
                          icon={<EditOutlined />}
                          style={{ minHeight: 44 }}
                          onClick={() => openEdit(record)}
                        >
                          编辑
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              <Pagination
                size="small"
                current={filters.page}
                pageSize={filters.limit}
                total={data?.meta.total || 0}
                onChange={(page, pageSize) => setFilters({ ...filters, page, limit: pageSize })}
                style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}
              />
            </div>
          )
        ) : (
          <Table
            columns={columns}
            dataSource={data?.data || []}
            rowKey="id"
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={{
              current: filters.page,
              pageSize: filters.limit,
              total: data?.meta.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => setFilters({ ...filters, page, limit: pageSize }),
            }}
          />
        )}
      </Card>

      {/* 美甲师多 Tab 详情抽屉（承接客户、预约、订单、流水、作品下钻） */}
      <Drawer
        title={
          selectedTechnician ? (
            <Space>
              <span>{selectedTechnician.name}</span>
              {renderStatusTag(selectedTechnician.status)}
            </Space>
          ) : (
            '美甲师详情'
          )
        }
        open={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setSelectedTechnician(null);
        }}
        width={isMobile ? '100%' : 860}
        destroyOnClose
      >
        {selectedTechnician && (
          <Tabs
            activeKey={detailTab}
            onChange={setDetailTab}
            items={[
              {
                key: 'overview',
                label: '概览与订阅配额',
                children: (
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <Descriptions
                      bordered
                      size="small"
                      column={isMobile ? 1 : 2}
                    >
                      <Descriptions.Item label="ID">{selectedTechnician.id}</Descriptions.Item>
                      <Descriptions.Item label="手机号">
                        <Text copyable>{selectedTechnician.phone}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="城市">
                        {selectedTechnician.city || '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="服务区域">
                        {selectedTechnician.serviceArea || '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="最近登录">
                        {selectedTechnician.lastLoginAt
                          ? new Date(selectedTechnician.lastLoginAt).toLocaleString('zh-CN', {
                              hour12: false,
                            })
                          : '从未登录'}
                      </Descriptions.Item>
                      <Descriptions.Item label="注册时间">
                        {new Date(selectedTechnician.createdAt).toLocaleString('zh-CN', {
                          hour12: false,
                        })}
                      </Descriptions.Item>
                    </Descriptions>

                    <Card
                      size="small"
                      title={
                        <Space>
                          <CrownOutlined />
                          <span>当前订阅与实时配额用量</span>
                        </Space>
                      }
                    >
                      {subLoading ? (
                        <div style={{ textAlign: 'center', padding: 24 }}>
                          <Spin />
                        </div>
                      ) : subDetail ? (
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 12,
                              marginBottom: 16,
                            }}
                          >
                            <Space wrap>
                              <Tag color={subDetail.plan.price > 0 ? 'blue' : 'default'}>
                                {subDetail.plan.name}（¥{subDetail.plan.price}/月）
                              </Tag>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                到期时间：
                                {subDetail.expiredAt
                                  ? new Date(subDetail.expiredAt).toLocaleDateString('zh-CN')
                                  : '永久有效'}
                              </Text>
                            </Space>

                            {canUpdateSub && plans.length > 0 && (
                              <Space wrap>
                                <Select
                                  value={selectedPlanId}
                                  onChange={setSelectedPlanId}
                                  style={{ width: 160 }}
                                  options={plans.map((p) => ({
                                    value: p.id,
                                    label: `${p.name} (¥${p.price})`,
                                  }))}
                                />
                                <Button
                                  type="primary"
                                  loading={updatingPlan}
                                  disabled={selectedPlanId === subDetail.plan.id}
                                  onClick={handleUpdateTechPlan}
                                >
                                  调整套餐
                                </Button>
                              </Space>
                            )}
                          </div>

                          <Row gutter={[12, 12]}>
                            <Col xs={24} sm={12}>
                              {renderEntitlementRow(
                                '活跃客户',
                                subDetail.entitlements.customers.used,
                                subDetail.entitlements.customers.limit,
                              )}
                            </Col>
                            <Col xs={24} sm={12}>
                              {renderEntitlementRow(
                                '本月预约',
                                subDetail.entitlements.monthlyBookings.used,
                                subDetail.entitlements.monthlyBookings.limit,
                              )}
                            </Col>
                            <Col xs={24} sm={12}>
                              {renderEntitlementRow(
                                '作品上限',
                                subDetail.entitlements.works.used,
                                subDetail.entitlements.works.limit,
                              )}
                            </Col>
                            <Col xs={24} sm={12}>
                              {renderEntitlementRow(
                                '高清存储空间',
                                subDetail.entitlements.storage.used,
                                subDetail.entitlements.storage.limit,
                                true,
                              )}
                            </Col>
                            <Col xs={24} sm={12}>
                              {renderEntitlementRow(
                                '本月宣传导出',
                                subDetail.entitlements.marketingExports.used,
                                subDetail.entitlements.marketingExports.limit,
                              )}
                            </Col>
                            <Col xs={24} sm={12}>
                              {renderEntitlementRow(
                                '本月短信提醒',
                                subDetail.entitlements.monthlySms.used,
                                subDetail.entitlements.monthlySms.limit,
                              )}
                            </Col>
                          </Row>
                        </div>
                      ) : (
                        <Empty description="暂无订阅配额数据" />
                      )}
                    </Card>
                  </Space>
                ),
              },
              {
                key: 'customers',
                label: `客户档案 (${selectedTechnician._count?.customers ?? techCustomers?.meta.total ?? 0})`,
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    loading={custLoading}
                    scroll={{ x: 560 }}
                    dataSource={techCustomers?.data || []}
                    columns={[
                      { title: '客户姓名', dataIndex: 'name', key: 'name' },
                      {
                        title: '手机号',
                        dataIndex: 'phone',
                        key: 'phone',
                        render: (v?: string) => v || '—',
                      },
                      {
                        title: '备注',
                        dataIndex: 'notes',
                        key: 'notes',
                        ellipsis: true,
                        render: (v?: string) => v || '—',
                      },
                      {
                        title: '建档时间',
                        dataIndex: 'createdAt',
                        key: 'createdAt',
                        render: (v: string) => new Date(v).toLocaleDateString('zh-CN'),
                      },
                    ]}
                    pagination={{
                      current: custPage,
                      pageSize: 10,
                      total: techCustomers?.meta.total || 0,
                      onChange: setCustPage,
                    }}
                  />
                ),
              },
              {
                key: 'orders',
                label: `预约与订单 (${selectedTechnician._count?.orders ?? techOrders?.meta.total ?? 0})`,
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    loading={orderLoading}
                    scroll={{ x: 640 }}
                    dataSource={techOrders?.data || []}
                    columns={[
                      { title: '预约编号', dataIndex: 'orderNo', key: 'orderNo' },
                      {
                        title: '客户',
                        key: 'customer',
                        render: (_: unknown, row: AdminOrder) => row.customer?.name || '—',
                      },
                      {
                        title: '预约时间',
                        dataIndex: 'startTime',
                        key: 'startTime',
                        render: (v: string) =>
                          new Date(v).toLocaleString('zh-CN', { hour12: false }),
                      },
                      {
                        title: '报价/金额',
                        key: 'amount',
                        render: (_: unknown, row: AdminOrder) =>
                          row.finalPriceFen != null
                            ? `¥${(row.finalPriceFen / 100).toFixed(2)}`
                            : row.quotePrice != null
                              ? `¥${Number(row.quotePrice).toFixed(2)}`
                              : '—',
                      },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status: string) => {
                          const cfg = ORDER_STATUS_LABEL[status] || {
                            label: status,
                            color: 'default',
                          };
                          return <Tag color={cfg.color}>{cfg.label}</Tag>;
                        },
                      },
                    ]}
                    pagination={{
                      current: orderPage,
                      pageSize: 10,
                      total: techOrders?.meta.total || 0,
                      onChange: setOrderPage,
                    }}
                  />
                ),
              },
              {
                key: 'revenues',
                label: '美甲师流水',
                children: (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Alert
                      type="info"
                      showIcon
                      message="以下为美甲师在工具中自主记录的线下/私域服务收入，平台不触碰该笔交易资金。"
                    />
                    {techRevStats && (
                      <Row gutter={[12, 12]}>
                        <Col xs={12} sm={8}>
                          <Card size="small">
                            <Text type="secondary" style={{ fontSize: 12 }}>累计记账流水</Text>
                            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                              ¥{Number(techRevStats.totalRevenue || 0).toFixed(2)}
                            </div>
                          </Card>
                        </Col>
                        <Col xs={12} sm={8}>
                          <Card size="small">
                            <Text type="secondary" style={{ fontSize: 12 }}>确认笔数</Text>
                            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                              {techRevStats.count || 0} 笔
                            </div>
                          </Card>
                        </Col>
                        <Col xs={24} sm={8}>
                          <Card size="small">
                            <Text type="secondary" style={{ fontSize: 12 }}>客单均价</Text>
                            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                              ¥{Number(techRevStats.avgAmount || 0).toFixed(2)}
                            </div>
                          </Card>
                        </Col>
                      </Row>
                    )}
                    <Table
                      size="small"
                      rowKey="id"
                      loading={revLoading}
                      scroll={{ x: 580 }}
                      dataSource={techRevenues?.data || []}
                      columns={[
                        { title: '流水编号', dataIndex: 'revenueNo', key: 'revenueNo' },
                        {
                          title: '客户',
                          key: 'customer',
                          render: (_: unknown, row: Revenue) => row.customer?.name || '—',
                        },
                        {
                          title: '金额',
                          dataIndex: 'amount',
                          key: 'amount',
                          render: (val: number) => <Text strong>¥{Number(val).toFixed(2)}</Text>,
                        },
                        {
                          title: '确认时间',
                          dataIndex: 'recognizedAt',
                          key: 'recognizedAt',
                          render: (v: string) =>
                            new Date(v).toLocaleString('zh-CN', { hour12: false }),
                        },
                      ]}
                      pagination={{
                        current: revPage,
                        pageSize: 10,
                        total: techRevenues?.meta.total || 0,
                        onChange: setRevPage,
                      }}
                    />
                  </Space>
                ),
              },
              {
                key: 'works',
                label: `作品集 (${selectedTechnician._count?.nailWorks ?? techWorks.total})`,
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    loading={workLoading}
                    scroll={{ x: 560 }}
                    dataSource={techWorks.items}
                    columns={[
                      {
                        title: '作品',
                        key: 'title',
                        render: (_: unknown, row: TechWorkItem) => (
                          <Space>
                            {row.coverUrl ? (
                              <img
                                src={row.coverUrl}
                                alt={row.title || '作品'}
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 6,
                                  objectFit: 'cover',
                                }}
                              />
                            ) : null}
                            <span>{row.title || `作品 #${row.id}`}</span>
                          </Space>
                        ),
                      },
                      {
                        title: '参考价',
                        dataIndex: 'price',
                        key: 'price',
                        render: (v?: number) => (v != null ? `¥${Number(v).toFixed(0)}` : '—'),
                      },
                      {
                        title: '审核状态',
                        dataIndex: 'publicationStatus',
                        key: 'publicationStatus',
                        render: (st: string) => {
                          const cfg = WORK_STATUS_LABEL[st] || { label: st, color: 'default' };
                          return <Tag color={cfg.color}>{cfg.label}</Tag>;
                        },
                      },
                      {
                        title: '发布时间',
                        dataIndex: 'createdAt',
                        key: 'createdAt',
                        render: (v: string) => new Date(v).toLocaleDateString('zh-CN'),
                      },
                    ]}
                    pagination={{
                      current: workPage,
                      pageSize: 10,
                      total: techWorks.total,
                      onChange: setWorkPage,
                    }}
                  />
                ),
              },
            ]}
          />
        )}
      </Drawer>

      <Modal
        title="新增美甲师"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={isMobile ? '94vw' : 520}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="city" label="城市">
            <Input placeholder="请输入城市" />
          </Form.Item>
          <Form.Item name="serviceArea" label="服务区域">
            <Input placeholder="请输入服务区域" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑美甲师"
        open={editVisible}
        onCancel={() => {
          setEditVisible(false);
          setSelectedTechnician(null);
        }}
        onOk={() => editForm.submit()}
        okText="保存"
        cancelText="取消"
        width={isMobile ? '94vw' : 560}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="city" label="城市">
            <Input placeholder="请输入城市" />
          </Form.Item>
          <Form.Item name="serviceArea" label="服务区域">
            <Input placeholder="请输入服务区域" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={[
                { value: 'active', label: '活跃' },
                { value: 'inactive', label: '未激活' },
                { value: 'suspended', label: '已禁用' },
              ]}
            />
          </Form.Item>
        </Form>

        {canResetPassword && selectedTechnician && selectedTechnician.status !== 'deleted' && (
          <div style={{ marginTop: 16, padding: 16, background: 'var(--nb-page)', borderRadius: 8 }}>
            <div style={{ marginBottom: 8, color: 'var(--nb-ink)', fontSize: 13 }}>
              美甲师忘记密码时，可在此重置。系统将生成一个一次性临时密码，请转交给美甲师并提醒其登录后尽快修改。
            </div>
            {resetPwd ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Text code style={{ fontSize: 16, letterSpacing: 1 }}>
                    {resetPwd}
                  </Text>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(resetPwd);
                      message.success('已复制');
                    }}
                  >
                    复制
                  </Button>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  临时密码仅显示这一次，请把它和手机号 ({selectedTechnician.phone}) 一并发送给美甲师
                </Text>
              </Space>
            ) : (
              <Popconfirm
                title="确认重置该美甲师的登录密码？"
                description="重置后原密码立即失效，将生成一次性临时密码。"
                okText="确认重置"
                cancelText="取消"
                onConfirm={handleResetPassword}
              >
                <Button danger icon={<KeyOutlined />} loading={resetting} style={{ minHeight: 44 }}>
                  重置登录密码
                </Button>
              </Popconfirm>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Technicians;
