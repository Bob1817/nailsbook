import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  ConfigProvider,
  Drawer,
  Empty,
  Grid,
  Input,
  Pagination,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  UserOutlined,
  WechatOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminPageHeader from '../components/AdminPageHeader';
import SubscribeTemplatesForm from '../components/SubscribeTemplatesForm';
import { useAuth } from '../contexts/AuthContext';
import { bookingNotifications } from '../services/bookingNotifications';
import type {
  BookingNotification,
  NotificationDelivery,
  NotificationHealth,
} from '../services/bookingNotifications';
import type { SubscribeTemplateConfig } from '../services/wechatConfig';

const { Text } = Typography;

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: '等待发送', color: 'processing' },
  sending: { label: '处理中', color: 'processing' },
  delivered: { label: '发送成功', color: 'success' },
  sent: { label: '发送成功', color: 'success' },
  failed: { label: '未发送成功', color: 'error' },
  skipped: { label: '已跳过', color: 'default' },
  unknown: { label: '结果待核查', color: 'warning' },
  obsolete: { label: '已停止过期通知', color: 'default' },
  invalid_snapshot: { label: '记录不完整', color: 'warning' },
};

const EVENTS: Record<string, string> = {
  'booking.client_success': '预约成功通知',
  'booking.technician_new': '新预约提醒',
  'booking.day_before': '次日预约提醒',
  'booking.hour_before': '一小时前提醒',
};

const REASONS: Record<string, string> = {
  authorization_unavailable: '没有可用订阅次数，需用户在小程序内主动点击授权（微信规则不支持后台代授权）',
  '43101': '微信未认可本次订阅授权，需用户在小程序重新点击订阅授权',
  template_not_configured: '对应事件的微信订阅消息模板 ID 未配置，请立即配置模板',
  recipient_missing: '预约未关联接收账号',
  wechat_identity_missing: '账号尚未绑定微信授权登录（缺少 openId）',
  delivery_outcome_unknown: '无法确定微信是否收到，为防重复打扰禁止自动重发',
  network_error: '网络响应不明确，需核查是否已经发送',
  event_obsolete: '预约已变化或消息已过期',
  snapshot_incomplete: '历史记录不支持安全补发',
  '40001': '微信 AccessToken 无效或 AppSecret 异常，请重新校验微信能力配置',
  '40014': '微信 AccessToken 无效，请检查微信能力配置',
  '42001': '微信 AccessToken 过期，可重试发送',
  '45009': '微信接口调用超过频率限制，请稍后重试',
};

const AUTH_SKIP_CODES = new Set(['authorization_unavailable', '43101']);
const CREDENTIAL_ERROR_CODES = new Set(['40001', '40014', '42001']);

function resolveTemplateFieldForEvent(
  eventType: string,
  recipientRole: string,
): keyof Omit<SubscribeTemplateConfig, 'updatedAt'> | undefined {
  if (eventType === 'booking.client_success') return 'bookingClientSuccessTemplateId';
  if (eventType === 'booking.technician_new') return 'bookingTechnicianNewTemplateId';
  if (eventType === 'booking.day_before') return 'bookingDayBeforeTemplateId';
  if (eventType === 'booking.hour_before') return 'bookingHourBeforeTemplateId';
  if (eventType.startsWith('booking.status.')) {
    return recipientRole === 'client'
      ? 'bookingClientStatusTemplateId'
      : 'bookingTechnicianStatusTemplateId';
  }
  return undefined;
}

function getEventDisplayStatus(event: BookingNotification): {
  label: string;
  color: string;
  accent: string;
  category: 'success' | 'auth_skip' | 'system_error' | 'warning' | 'pending' | 'neutral';
} {
  const latest = event.deliveries[event.deliveries.length - 1];
  if (event.status === 'delivered' || latest?.status === 'sent') {
    return {
      label: '发送成功',
      color: 'success',
      accent: '#287A4B',
      category: 'success',
    };
  }
  if (latest?.status === 'unknown') {
    return {
      label: '结果待核查',
      color: 'warning',
      accent: '#D4A017',
      category: 'warning',
    };
  }
  if (latest?.providerCode && AUTH_SKIP_CODES.has(latest.providerCode)) {
    return {
      label: '用户未授权（已跳过）',
      color: 'orange',
      accent: '#D4A017',
      category: 'auth_skip',
    };
  }
  if (latest?.providerCode === 'template_not_configured') {
    return {
      label: '模板未配置（失败）',
      color: 'error',
      accent: '#B42332',
      category: 'system_error',
    };
  }
  if (event.status === 'failed' || latest?.status === 'failed') {
    return {
      label: '系统/接口失败',
      color: 'error',
      accent: '#B42332',
      category: 'system_error',
    };
  }
  if (event.status === 'pending' || event.status === 'sending') {
    return {
      label: STATUS_META[event.status]?.label || '等待发送',
      color: 'processing',
      accent: '#245EA8',
      category: 'pending',
    };
  }
  return {
    label: STATUS_META[event.status]?.label || event.status,
    color: 'default',
    accent: 'var(--nb-line)',
    category: 'neutral',
  };
}

export default function BookingNotifications() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const canConfig = hasPermission('feature_flag:update');

  const [search] = useSearchParams();
  const [orderId, setOrderId] = useState(search.get('orderId') || '');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [filters, setFilters] = useState({
    page: 1,
    orderId: search.get('orderId') || '',
    status: '',
    failureGroup: '',
  });
  const [rows, setRows] = useState<BookingNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [health, setHealth] = useState<NotificationHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState<number | null>(null);

  // 订阅消息模板配置抽屉
  const [templateDrawerOpen, setTemplateDrawerOpen] = useState(false);
  const [highlightTemplateField, setHighlightTemplateField] = useState<
    keyof Omit<SubscribeTemplateConfig, 'updatedAt'> | undefined
  >(undefined);

  const request = useRef(0);

  const load = useCallback(async () => {
    const version = ++request.current;
    setLoading(true);
    setError('');
    try {
      const [list, summary] = await Promise.all([
        bookingNotifications.list({
          page: filters.page,
          orderId: filters.orderId || undefined,
          status: filters.status || undefined,
          failureGroup: filters.failureGroup || undefined,
        }),
        bookingNotifications.health(),
      ]);
      if (version !== request.current) return;
      setRows(list.data);
      setTotal(list.total);
      setHealth(summary);
    } catch {
      if (version === request.current) setError('读取通知记录失败，请重试');
    } finally {
      if (version === request.current) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyQuickTab = (tabKey: string) => {
    setActiveTab(tabKey);
    if (tabKey === 'all') {
      setFilters((f) => ({ ...f, page: 1, status: '', failureGroup: '' }));
    } else if (tabKey === 'delivered') {
      setFilters((f) => ({ ...f, page: 1, status: 'delivered', failureGroup: '' }));
    } else if (tabKey === 'system_failed') {
      setFilters((f) => ({ ...f, page: 1, status: '', failureGroup: 'system_failed' }));
    } else if (tabKey === 'misconfigured') {
      setFilters((f) => ({ ...f, page: 1, status: '', failureGroup: 'misconfigured' }));
    } else if (tabKey === 'no_authorization') {
      setFilters((f) => ({ ...f, page: 1, status: '', failureGroup: 'no_authorization' }));
    } else if (tabKey === 'unknown') {
      setFilters((f) => ({ ...f, page: 1, status: '', failureGroup: 'unknown' }));
    } else if (tabKey === 'backlog') {
      setFilters((f) => ({ ...f, page: 1, status: '', failureGroup: 'backlog' }));
    }
  };

  async function retry(id: number) {
    if (retrying !== null) return;
    setRetrying(id);
    try {
      await bookingNotifications.retry(id);
      message.success('已加入发送队列，约一分钟后刷新查看');
      await load();
    } catch {
      message.error('未能重试，预约可能已变化或发送次数已用完，请刷新记录');
    } finally {
      setRetrying(null);
    }
  }

  const openTemplateConfig = (
    field?: keyof Omit<SubscribeTemplateConfig, 'updatedAt'>,
  ) => {
    setHighlightTemplateField(field);
    setTemplateDrawerOpen(true);
  };

  const renderDeliveryActions = (
    event: BookingNotification,
    delivery: NotificationDelivery,
  ) => {
    const code = delivery.providerCode || '';
    const actions: React.ReactNode[] = [];

    if (code === 'template_not_configured' && canConfig) {
      actions.push(
        <Button
          key="config-template"
          type="primary"
          size={isMobile ? 'middle' : 'small'}
          icon={<SettingOutlined />}
          style={{ minHeight: isMobile ? 44 : 34 }}
          onClick={() =>
            openTemplateConfig(
              resolveTemplateFieldForEvent(event.eventType, event.recipientRole),
            )
          }
        >
          立即配置模板 ID
        </Button>,
      );
    }

    if (CREDENTIAL_ERROR_CODES.has(code) && canConfig) {
      actions.push(
        <Button
          key="wechat-config"
          type="primary"
          size={isMobile ? 'middle' : 'small'}
          icon={<WechatOutlined />}
          style={{ minHeight: isMobile ? 44 : 34 }}
          onClick={() => navigate('/wechat-config')}
        >
          校验微信登录凭证
        </Button>,
      );
    }

    if (delivery.canRetry && canConfig) {
      actions.push(
        <Button
          key="retry"
          type={actions.length === 0 ? 'primary' : 'default'}
          size={isMobile ? 'middle' : 'small'}
          icon={<ReloadOutlined />}
          style={{ minHeight: isMobile ? 44 : 34 }}
          loading={retrying === delivery.id}
          disabled={retrying !== null}
          onClick={() => void retry(delivery.id)}
        >
          重试此通知
        </Button>,
      );
    }

    if (
      (AUTH_SKIP_CODES.has(code) || code === 'wechat_identity_missing') &&
      event.recipientRole === 'technician' &&
      event.recipientId
    ) {
      actions.push(
        <Button
          key="view-tech"
          size={isMobile ? 'middle' : 'small'}
          icon={<UserOutlined />}
          style={{ minHeight: isMobile ? 44 : 34 }}
          onClick={() => navigate(`/technicians?openId=${event.recipientId}`)}
        >
          查看美甲师详情
        </Button>,
      );
    }

    if (!actions.length) return null;
    return (
      <Space wrap size={8} style={{ marginTop: 10 }}>
        {actions}
      </Space>
    );
  };

  const healthCards = health
    ? [
        {
          key: 'misconfigured',
          label: '24h 模板缺失',
          value: health.misconfigured,
          urgent: health.misconfigured > 0,
          hint: '可立即配置修复',
        },
        {
          key: 'system_failed',
          label: '24h 重试耗尽',
          value: health.exhausted,
          urgent: health.exhausted > 0,
          hint: '需排查接口/凭证',
        },
        {
          key: 'unknown',
          label: '结果待核查',
          value: health.unknown,
          urgent: health.unknown > 0,
          hint: '网络超时禁止自动重发',
        },
        {
          key: 'backlog',
          label: '积压超 10 分钟',
          value: health.backlog,
          urgent: health.backlog > 0,
          hint: '队列堆积预警',
        },
        {
          key: 'no_authorization',
          label: '24h 用户未授权',
          value: health.noAuthorization,
          urgent: false,
          hint: '微信规则需用户端授权',
        },
      ]
    : [];

  return (
    <ConfigProvider theme={{ token: { controlHeight: 40 }, components: { Pagination: { itemSize: 40 } } }}>
      <AdminPageHeader
        title="消息推送与通知"
        description="核对微信订阅消息投递状态，快速区分系统/配置故障与用户未授权跳过，并直达模板与凭证配置修复。"
        extra={
          <Space wrap>
            {canConfig && (
              <Button
                type="primary"
                icon={<SettingOutlined />}
                style={{ minHeight: 44 }}
                onClick={() => openTemplateConfig(undefined)}
              >
                配置订阅模板
              </Button>
            )}
            <Button
              icon={<WechatOutlined />}
              style={{ minHeight: 44 }}
              onClick={() => navigate('/wechat-config')}
            >
              微信能力配置
            </Button>
            <Button
              style={{ minHeight: 44 }}
              onClick={() => navigate('/wechat-official')}
            >
              公众号配置
            </Button>
          </Space>
        }
      />

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* 异常监测可点击指标卡 */}
        {health && (
          <Card
            size="small"
            title="异常监测（点击指标直接筛选对应记录）"
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                更新于 {new Date(health.checkedAt).toLocaleString('zh-CN', { hour12: false })}
              </Text>
            }
          >
            <Row gutter={[12, 12]}>
              {healthCards.map((item) => {
                const isSelected = activeTab === item.key;
                return (
                  <Col key={item.key} xs={12} sm={8} lg={4} xl={4} style={{ flex: isMobile ? undefined : 1 }}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => applyQuickTab(item.key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          applyQuickTab(item.key);
                        }
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        background: isSelected ? 'var(--nb-active-surface)' : 'var(--nb-page)',
                        border: isSelected
                          ? '1px solid var(--nb-ink)'
                          : item.urgent
                            ? '1px solid #B42332'
                            : '1px solid var(--nb-line)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontSize: 12, color: 'var(--nb-secondary)' }}>{item.label}</div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          marginTop: 4,
                          color: item.urgent ? '#B42332' : 'var(--nb-ink)',
                        }}
                      >
                        {item.value}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--nb-muted)', marginTop: 2 }}>
                        {item.hint}
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Card>
        )}

        {/* 状态分类快筛 Tabs + 检索栏 */}
        <Card styles={{ body: { padding: isMobile ? '12px' : '12px 16px' } }}>
          <Tabs
            activeKey={activeTab}
            onChange={applyQuickTab}
            items={[
              { key: 'all', label: '全部推送' },
              { key: 'delivered', label: '发送成功' },
              { key: 'system_failed', label: '系统 / 接口失败' },
              { key: 'misconfigured', label: '模板未配置' },
              { key: 'no_authorization', label: '用户未授权（跳过）' },
              { key: 'unknown', label: '结果待核查' },
            ]}
          />

          <Space wrap style={{ width: '100%' }}>
            <Input
              aria-label="预约ID"
              placeholder="按预约 ID 查询"
              inputMode="numeric"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              style={{ width: isMobile ? '100%' : 180 }}
              allowClear
            />
            <Select
              aria-label="底层状态"
              value={filters.status}
              style={{ width: isMobile ? '100%' : 170 }}
              onChange={(status) => {
                setActiveTab(status === 'delivered' ? 'delivered' : 'all');
                setFilters((value) => ({ ...value, page: 1, status, failureGroup: '' }));
              }}
              options={[
                { value: '', label: '全部底层状态' },
                ...['pending', 'sending', 'delivered', 'failed', 'obsolete', 'invalid_snapshot'].map(
                  (value) => ({ value, label: STATUS_META[value]?.label || value }),
                ),
              ]}
            />
            <Button
              type="primary"
              style={{ minHeight: 40 }}
              onClick={() => {
                if (orderId && !/^[1-9]\d*$/.test(orderId)) {
                  return message.error('请输入有效的预约ID');
                }
                setFilters((value) => ({ ...value, orderId, page: 1 }));
              }}
            >
              查询
            </Button>
            <Button
              icon={<ReloadOutlined />}
              style={{ minHeight: 40 }}
              onClick={() => void load()}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        </Card>

        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={<Button onClick={() => void load()}>重试</Button>}
          />
        )}

        <Spin spinning={loading}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {!loading && !error && !rows.length && (
              <Card>
                <Empty description="没有符合条件的通知记录" />
              </Card>
            )}

            {!error &&
              rows.map((event) => {
                const display = getEventDisplayStatus(event);
                const statusIcon =
                  display.category === 'success' ? (
                    <CheckCircleOutlined />
                  ) : display.category === 'system_error' ? (
                    <CloseCircleOutlined />
                  ) : display.category === 'warning' || display.category === 'auth_skip' ? (
                    <ExclamationCircleOutlined />
                  ) : (
                    <ClockCircleOutlined />
                  );

                return (
                  <Card
                    key={event.id}
                    size="small"
                    style={{
                      borderRadius: 12,
                      borderLeft: `4px solid ${display.accent}`,
                    }}
                    title={
                      <Space wrap size={8}>
                        <span style={{ fontWeight: 600 }}>
                          {EVENTS[event.eventType] ||
                            event.eventType.replace('booking.status.', '预约状态：')}
                        </span>
                        <Tag icon={statusIcon} color={display.color}>
                          {display.label}
                        </Tag>
                      </Space>
                    }
                    extra={
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(event.createdAt).toLocaleString('zh-CN', { hour12: false })}
                      </Text>
                    }
                  >
                    <Space wrap size={12} style={{ marginBottom: 8, fontSize: 13 }}>
                      <Text type="secondary">预约 #{event.orderId || '—'}</Text>
                      <Text>
                        接收方：{event.recipientRole === 'client' ? '客户' : '美甲师'} #
                        {event.recipientId || '未关联'}
                      </Text>
                    </Space>

                    {!event.deliveries.length && (
                      <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
                        {event.status === 'obsolete'
                          ? '预约已变化，未发送过期消息'
                          : '尚未产生微信发送记录'}
                      </Text>
                    )}

                    {event.deliveries.map((delivery) => {
                      const dMeta = STATUS_META[delivery.status] || {
                        label: delivery.status,
                        color: 'default',
                      };
                      const reasonText =
                        REASONS[delivery.providerCode || ''] ||
                        delivery.providerMessage ||
                        (delivery.status === 'sent' ? '微信订阅消息接口已接收' : '');

                      return (
                        <div
                          key={delivery.id}
                          style={{
                            padding: '10px 12px',
                            marginTop: 8,
                            borderRadius: 8,
                            background: 'var(--nb-page)',
                            border: '1px solid var(--nb-line)',
                          }}
                        >
                          <Space wrap size={8} style={{ marginBottom: reasonText ? 6 : 0 }}>
                            <Tag color={dMeta.color}>{dMeta.label}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              已尝试 {delivery.attemptCount}/3 次
                            </Text>
                            {delivery.providerCode && (
                              <Text code style={{ fontSize: 11 }}>
                                {delivery.providerCode}
                              </Text>
                            )}
                          </Space>

                          {reasonText && (
                            <div
                              style={{
                                fontSize: 13,
                                color:
                                  delivery.status === 'failed'
                                    ? 'var(--nb-ink)'
                                    : 'var(--nb-secondary)',
                                overflowWrap: 'anywhere',
                              }}
                            >
                              {reasonText}
                            </div>
                          )}

                          {renderDeliveryActions(event, delivery)}
                        </div>
                      );
                    })}
                  </Card>
                );
              })}
          </Space>
        </Spin>

        <div style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-end' }}>
          <Pagination
            current={filters.page}
            pageSize={20}
            total={total}
            showSizeChanger={false}
            showTotal={(t) => `共 ${t} 条`}
            onChange={(page) => setFilters((value) => ({ ...value, page }))}
          />
        </div>
      </Space>

      {/* 订阅消息模板配置抽屉（本页直达修复模板缺失） */}
      <Drawer
        title="配置微信订阅消息模板"
        open={templateDrawerOpen}
        onClose={() => setTemplateDrawerOpen(false)}
        width={isMobile ? '100%' : 620}
        destroyOnClose
      >
        <SubscribeTemplatesForm
          highlightField={highlightTemplateField}
          onSaved={() => {
            setTemplateDrawerOpen(false);
            void load();
          }}
        />
      </Drawer>
    </ConfigProvider>
  );
}
