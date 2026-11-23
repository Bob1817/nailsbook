import React, { useCallback, useEffect, useState } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Button,
  Input,
  Select,
  DatePicker,
  Space,
  Modal,
  Descriptions,
  message,
  Popconfirm,
  Badge,
  Typography,
  Alert,
} from 'antd';
import {
  BugOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  CopyOutlined,
  MobileOutlined,
  CloudServerOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminPageHeader from '../components/AdminPageHeader';
import { colors } from '../colors.generated';
import { systemErrorService } from '../services/systemError';
import type { SystemErrorLog, SystemErrorStats } from '../services/systemError';

const { RangePicker } = DatePicker;
const { Paragraph, Text } = Typography;

const SystemErrors: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ items: SystemErrorLog[]; total: number }>({
    items: [],
    total: 0,
  });
  const [stats, setStats] = useState<SystemErrorStats>({
    todayCount: 0,
    unresolvedCount: 0,
    totalCount: 0,
    impactedUsersToday: 0,
  });

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 15,
    source: undefined as string | undefined,
    errorType: undefined as string | undefined,
    resolved: undefined as boolean | undefined,
    keyword: '',
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<SystemErrorLog | null>(null);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [resolveTargetId, setResolveTargetId] = useState<number | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  const fetchStats = async () => {
    try {
      const res = await systemErrorService.getStats();
      setStats(res);
    } catch {
      // ignore
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await systemErrorService.getAll({
        page: filters.page,
        pageSize: filters.pageSize,
        source: filters.source || undefined,
        errorType: filters.errorType || undefined,
        resolved: filters.resolved,
        keyword: filters.keyword ? filters.keyword.trim() : undefined,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      setData({ items: res.items, total: res.total });
    } catch {
      message.error('加载系统错误日志失败');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
    fetchData();
  }, [fetchData]);

  const handleResolve = async (id: number, note?: string) => {
    try {
      await systemErrorService.resolve(id, note);
      message.success('已标记为已排查');
      fetchData();
      fetchStats();
      if (currentRecord?.id === id) {
        setDetailVisible(false);
      }
    } catch {
      message.error('操作失败');
    }
  };

  const handleBatchResolve = async () => {
    if (!selectedRowKeys.length) return;
    try {
      await systemErrorService.batchResolve(selectedRowKeys as number[]);
      message.success(`已批量标记 ${selectedRowKeys.length} 项为已排查`);
      setSelectedRowKeys([]);
      fetchData();
      fetchStats();
    } catch {
      message.error('批量操作失败');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  const parseDevice = (infoStr?: string) => {
    if (!infoStr) return '—';
    try {
      const obj = JSON.parse(infoStr);
      const parts = [
        obj.brand || obj.model,
        obj.system,
        obj.version ? `微信${obj.version}` : null,
      ].filter(Boolean);
      return parts.length ? parts.join(' / ') : infoStr;
    } catch {
      return infoStr;
    }
  };

  const sourceTag = (source: string) => {
    if (source === 'mini_program') {
      return (
        <Tag icon={<MobileOutlined />} color="blue">
          小程序
        </Tag>
      );
    }
    if (source === 'backend') {
      return (
        <Tag icon={<CloudServerOutlined />} color="volcano">
          服务端
        </Tag>
      );
    }
    return <Tag color="default">{source}</Tag>;
  };

  const errorTypeTag = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
      js_error: { label: 'JS运行时异常', color: 'error' },
      unhandled_rejection: { label: '未捕获Promise', color: 'purple' },
      api_error: { label: '接口500异常', color: 'volcano' },
      http_500: { label: '后端500', color: 'red' },
      network_error: { label: '网络断连/超时', color: 'warning' },
    };
    const conf = map[type] || { label: type, color: 'default' };
    return <Tag color={conf.color}>{conf.label}</Tag>;
  };

  const userTag = (role?: string, id?: number) => {
    if (!role && !id) return <Text type="secondary">访客</Text>;
    const roleText =
      role === 'technician' ? '美甲师' : role === 'client' ? '客户' : role || '用户';
    return (
      <Space orientation="horizontal" size={4}>
        <UserOutlined />
        <span>
          {roleText}
          {id ? ` #${id}` : ''}
        </span>
      </Space>
    );
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
    },
    {
      title: '发生时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 90,
      render: (s: string) => sourceTag(s),
    },
    {
      title: '类型',
      dataIndex: 'errorType',
      key: 'errorType',
      width: 130,
      render: (t: string) => errorTypeTag(t),
    },
    {
      title: '发生页面 / 接口',
      dataIndex: 'route',
      key: 'route',
      width: 220,
      render: (r: string) => (
        <Text style={{ wordBreak: 'break-all', fontSize: 13 }} code={!!r}>
          {r || '—'}
        </Text>
      ),
    },
    {
      title: '报错信息摘要',
      dataIndex: 'message',
      key: 'message',
      render: (msg: string) => (
        <Paragraph
          type="danger"
          ellipsis={{ rows: 2, expandable: false }}
          style={{ marginBottom: 0, fontSize: 13 }}
        >
          {msg}
        </Paragraph>
      ),
    },
    {
      title: '终端环境',
      dataIndex: 'deviceInfo',
      key: 'deviceInfo',
      width: 170,
      render: (info: string) => (
        <Text style={{ fontSize: 12 }} type="secondary">
          {parseDevice(info)}
        </Text>
      ),
    },
    {
      title: '用户身份',
      key: 'user',
      width: 120,
      render: (_: any, r: SystemErrorLog) => userTag(r.userRole, r.userId),
    },
    {
      title: '状态',
      dataIndex: 'resolved',
      key: 'resolved',
      width: 90,
      render: (resolved: boolean) =>
        resolved ? (
          <Badge status="success" text="已排查" />
        ) : (
          <Badge status="error" text="待排查" />
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: SystemErrorLog) => (
        <Space size={8}>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setCurrentRecord(record);
              setDetailVisible(true);
            }}
          >
            详情与堆栈
          </Button>
          {!record.resolved && (
            <Popconfirm
              title="标记为已排查？"
              description="确认已修复或知晓该异常问题"
              onConfirm={() => handleResolve(record.id)}
            >
              <Button type="link" size="small">
                已解决
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 0 24px' }}>
      <AdminPageHeader
        title="系统错误监控与报告"
        description="实时捕捉真机小程序与服务端异常报错，提供即时预警通知与完整代码堆栈回溯"
      />

      {/* 顶部指标看板 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} hoverable>
            <Statistic
              title="今日捕获异常总量"
              value={stats.todayCount}
              prefix={<BugOutlined />}
              suffix="次"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} hoverable>
            <Statistic
              title="待排查未解决故障"
              value={stats.unresolvedCount}
              prefix={<ClockCircleOutlined />}
              suffix="项"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} hoverable>
            <Statistic
              title="今日受影响用户数"
              value={stats.impactedUsersToday}
              prefix={<UserOutlined />}
              suffix="人"
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选与操作区 */}
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Space wrap size={[12, 12]} style={{ width: '100%', marginBottom: 12 }}>
          <Input
            placeholder="搜索报错信息 / 路由 / 堆栈"
            prefix={<SearchOutlined />}
            value={filters.keyword}
            onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
            onPressEnter={() => setFilters((f) => ({ ...f, page: 1 }))}
            style={{ width: 260 }}
            allowClear
          />

          <Select
            placeholder="来源"
            allowClear
            value={filters.source}
            onChange={(v) => setFilters((f) => ({ ...f, source: v, page: 1 }))}
            style={{ width: 130 }}
            options={[
              { label: '📱 微信小程序', value: 'mini_program' },
              { label: '🖥️ 服务端', value: 'backend' },
              { label: '🌐 管理端', value: 'admin' },
            ]}
          />

          <Select
            placeholder="异常类型"
            allowClear
            value={filters.errorType}
            onChange={(v) => setFilters((f) => ({ ...f, errorType: v, page: 1 }))}
            style={{ width: 150 }}
            options={[
              { label: 'JS运行时报错', value: 'js_error' },
              { label: '未捕获Promise', value: 'unhandled_rejection' },
              { label: '接口500报错', value: 'api_error' },
              { label: '网络断连超时', value: 'network_error' },
            ]}
          />

          <Select
            placeholder="解决状态"
            allowClear
            value={filters.resolved}
            onChange={(v) => setFilters((f) => ({ ...f, resolved: v, page: 1 }))}
            style={{ width: 120 }}
            options={[
              { label: '待排查', value: false },
              { label: '已排查', value: true },
            ]}
          />

          <RangePicker
            onChange={(_dates, dateStrings) => {
              setFilters((f) => ({
                ...f,
                startDate: dateStrings[0] || undefined,
                endDate: dateStrings[1] || undefined,
                page: 1,
              }));
            }}
          />

          <Button type="primary" onClick={() => fetchData()}>
            查询
          </Button>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setFilters({
                page: 1,
                pageSize: 15,
                source: undefined,
                errorType: undefined,
                resolved: undefined,
                keyword: '',
                startDate: undefined,
                endDate: undefined,
              });
              fetchStats();
            }}
          >
            重置
          </Button>
        </Space>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button
              type="default"
              disabled={!selectedRowKeys.length}
              onClick={handleBatchResolve}
            >
              批量标记已排查 ({selectedRowKeys.length})
            </Button>
          </Space>
          <Text type="secondary">共 {data.total} 条异常记录</Text>
        </div>
      </Card>

      {/* 数据表格 */}
      <Card bordered={false}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data.items}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            current: filters.page,
            pageSize: filters.pageSize,
            total: data.total,
            showSizeChanger: true,
            pageSizeOptions: ['15', '30', '50'],
            onChange: (page, pageSize) => setFilters((f) => ({ ...f, page, pageSize })),
          }}
          scroll={{ x: 1300 }}
        />
      </Card>

      {/* 错误详情与完整堆栈弹窗 */}
      <Modal
        title={
          <Space>
            <BugOutlined />
            <span>错误详情与排查堆栈 #{currentRecord?.id}</span>
          </Space>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
          currentRecord && !currentRecord.resolved && (
            <Button
              key="resolve"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => {
                setResolveTargetId(currentRecord.id);
                setResolveNote('');
                setResolveModalVisible(true);
              }}
            >
              标记为已排查
            </Button>
          ),
        ]}
      >
        {currentRecord && (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="发生时间">
                {dayjs(currentRecord.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="来源与类型">
                <Space>
                  {sourceTag(currentRecord.source)}
                  {errorTypeTag(currentRecord.errorType)}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="发生页面/接口" span={2}>
                <Text code style={{ wordBreak: 'break-all' }}>
                  {currentRecord.route || '—'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="受影响用户">
                {userTag(currentRecord.userRole, currentRecord.userId)}
              </Descriptions.Item>
              <Descriptions.Item label="网络与IP">
                {currentRecord.networkType || '—'} {currentRecord.ip ? `(${currentRecord.ip})` : ''}
              </Descriptions.Item>
              <Descriptions.Item label="排查状态" span={2}>
                {currentRecord.resolved ? (
                  <Space>
                    <Badge status="success" text="已排查" />
                    {currentRecord.resolvedAt && (
                      <Text type="secondary">
                        ({dayjs(currentRecord.resolvedAt).format('YYYY-MM-DD HH:mm')})
                      </Text>
                    )}
                    {currentRecord.resolvedNote && (
                      <Text type="secondary">备忘：{currentRecord.resolvedNote}</Text>
                    )}
                  </Space>
                ) : (
                  <Badge status="error" text="待排查处理" />
                )}
              </Descriptions.Item>
            </Descriptions>

            {/* 终端设备信息 */}
            {currentRecord.deviceInfo && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>
                  📱 终端环境详细信息
                </Text>
                <div
                  style={{
                    background: '#fafafa',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #f0f0f0',
                    fontSize: 13,
                  }}
                >
                  {(() => {
                    try {
                      const d = JSON.parse(currentRecord.deviceInfo);
                      return (
                        <Row gutter={[12, 6]}>
                          <Col xs={24} sm={12}>机型品牌: <b>{d.brand || d.model || '—'}</b></Col>
                          <Col xs={24} sm={12}>操作系统: <b>{d.system || '—'}</b> ({d.platform || ''})</Col>
                          <Col xs={24} sm={12}>微信版本: <b>{d.version || '—'}</b></Col>
                          <Col xs={24} sm={12}>基础库版本: <b>{d.SDKVersion || '—'}</b></Col>
                        </Row>
                      );
                    } catch {
                      return currentRecord.deviceInfo;
                    }
                  })()}
                </div>
              </div>
            )}

            {/* 报错消息 */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <Text strong>⚠️ 报错信息 (Error Message)</Text>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(currentRecord.message)}
                >
                  复制信息
                </Button>
              </div>
              <Alert
                type="error"
                showIcon
                message={currentRecord.message}
                style={{ wordBreak: 'break-all', fontSize: 13 }}
              />
            </div>

            {/* 完整代码堆栈 */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <Text strong>🔍 完整代码堆栈 (Stack Trace)</Text>
                {currentRecord.stack && (
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(currentRecord.stack!)}
                  >
                    复制完整堆栈
                  </Button>
                )}
              </div>
              <pre
                style={{
                  background: colors.action,
                  color: colors.inverse,
                  padding: '12px 14px',
                  borderRadius: 6,
                  maxHeight: 280,
                  overflow: 'auto',
                  fontSize: 12,
                  lineHeight: 1.5,
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                }}
              >
                {currentRecord.stack || '无可用堆栈信息'}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      {/* 填写排查备注弹窗 */}
      <Modal
        title="标记错误为已排查"
        open={resolveModalVisible}
        onCancel={() => setResolveModalVisible(false)}
        onOk={() => {
          if (resolveTargetId) {
            handleResolve(resolveTargetId, resolveNote);
            setResolveModalVisible(false);
          }
        }}
      >
        <div style={{ padding: '8px 0' }}>
          <Text style={{ display: 'block', marginBottom: 8 }}>
            排查备忘与修复记录（选填）：
          </Text>
          <Input.TextArea
            rows={3}
            placeholder="例如：已在 commit 8a9f 中修复空指针异常，并发布小程序热更新补丁"
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default SystemErrors;
