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
  Badge,
  Typography,
  Alert,
  Tabs,
  Collapse,
  Grid,
  Spin,
  Empty,
  Pagination,
} from 'antd';
import {
  BugOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  CopyOutlined,
  DownloadOutlined,
  UserOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminPageHeader from '../components/AdminPageHeader';
import { colors } from '../colors.generated';
import { systemErrorService } from '../services/systemError';
import type {
  ErrorCategory,
  ErrorPriority,
  SystemErrorGroup,
  SystemErrorLog,
  SystemErrorStats,
} from '../services/systemError';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const SOURCE_CODEBASE_HINT: Record<string, string> = {
  mini_program: 'client-wxapp/ (微信小程序前端)',
  backend: 'backend/ (NestJS 服务端 API)',
  admin: 'admin-frontend/ (React 超管后台)',
};

const parseDeviceJson = (infoStr?: string): Record<string, unknown> | null => {
  if (!infoStr) return null;
  try {
    const parsed = JSON.parse(infoStr);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const buildDiagnosticLogContent = (records: SystemErrorLog[]): string => {
  const exportedAt = new Date().toISOString();
  const lines: string[] = [
    '================================================================================',
    'ONLYNAIL SYSTEM ERROR DIAGNOSTIC LOG',
    '================================================================================',
    `Exported At (ISO):   ${exportedAt}`,
    `Exported At (Local): ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
    `Total Records:       ${records.length}`,
    `Repository Mapping:  mini_program -> client-wxapp/ | backend -> backend/ | admin -> admin-frontend/`,
    '================================================================================',
    '',
  ];

  records.forEach((rec, idx) => {
    const deviceObj = parseDeviceJson(rec.deviceInfo);
    lines.push(`--- [ERROR #${idx + 1} / ID: ${rec.id}] -------------------------------------------`);
    lines.push(`Error ID:        ${rec.id}`);
    lines.push(`Occurred At:     ${rec.createdAt} (${dayjs(rec.createdAt).format('YYYY-MM-DD HH:mm:ss')})`);
    lines.push(`Source:          ${rec.source} -> ${SOURCE_CODEBASE_HINT[rec.source] || 'unknown'}`);
    lines.push(`Category / Prio: ${rec.categoryLabel || rec.category || 'N/A'} / ${rec.priorityLabel || rec.priority || 'N/A'}`);
    lines.push(`Fix Action:      ${rec.fixAction || 'N/A'}`);
    lines.push(`Error Type:      ${rec.errorType}`);
    lines.push(`Route / Path:    ${rec.route || 'N/A'}`);
    lines.push(`HTTP Status:     ${rec.statusCode ?? 'N/A'}`);
    lines.push(`User Role / ID:  ${rec.userRole || 'guest'} / ${rec.userId ?? 'N/A'}`);
    lines.push(`Network / IP:    ${rec.networkType || 'N/A'} / ${rec.ip || 'N/A'}`);
    lines.push(
      `Resolved Status: ${rec.resolved ? 'RESOLVED' : 'UNRESOLVED'}${
        rec.resolvedAt ? ` (at ${dayjs(rec.resolvedAt).format('YYYY-MM-DD HH:mm:ss')})` : ''
      }`,
    );
    if (rec.resolvedNote) lines.push(`Resolved Note:   ${rec.resolvedNote}`);
    if (deviceObj) lines.push(`Device Info:     ${JSON.stringify(deviceObj)}`);
    else if (rec.deviceInfo) lines.push(`Device Info:     ${rec.deviceInfo}`);
    lines.push('');
    lines.push('[Error Message]');
    lines.push(rec.message || '(empty)');
    lines.push('');
    lines.push('[Stack Trace]');
    lines.push(rec.stack || '(no stack trace captured)');
    lines.push('');
  });

  return lines.join('\n');
};

const triggerLogFileDownload = (records: SystemErrorLog[], label = 'diagnostic') => {
  if (!records.length) {
    message.warning('当前没有可导出的错误日志');
    return;
  }
  const content = buildDiagnosticLogContent(records);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `onlynail-error-${label}-${dayjs().format('YYYYMMDD-HHmmss')}.log`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  message.success(`已导出 ${records.length} 条诊断日志`);
};

const PRIORITY_STYLE: Record<ErrorPriority, { bg: string; color: string; border: string }> = {
  P0: { bg: 'var(--nb-danger-surface)', color: 'var(--nb-danger)', border: 'var(--nb-danger)' },
  P1: { bg: 'var(--nb-danger-surface)', color: 'var(--nb-money)', border: 'var(--nb-line)' },
  P2: { bg: 'var(--nb-soft-surface)', color: 'var(--nb-text-link)', border: 'var(--nb-line)' },
  P3: { bg: colors.page, color: colors.muted, border: colors.line },
};

const CATEGORY_STYLE: Record<ErrorCategory, { bg: string; color: string }> = {
  database: { bg: 'var(--nb-danger-surface)', color: 'var(--nb-danger)' },
  server: { bg: colors.action, color: colors.inverse },
  backend: { bg: 'var(--nb-soft-surface)', color: 'var(--nb-text-link)' },
  frontend: { bg: colors.page, color: colors.ink },
  other: { bg: colors.page, color: colors.muted },
};

const SystemErrors: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<SystemErrorGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [stats, setStats] = useState<SystemErrorStats | null>(null);
  const [prioritySummary, setPrioritySummary] = useState({
    p0Count: 0,
    p1Count: 0,
    p2Count: 0,
    p3Count: 0,
  });

  // Tab: false = 待修复（默认），true = 已完成
  const [resolvedTab, setResolvedTab] = useState<'pending' | 'done'>('pending');
  const [sourceFilter, setSourceFilter] = useState<string | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>(undefined);
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // 合并组详情弹窗
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<SystemErrorGroup | null>(null);

  // 标记已修复弹窗
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [resolveTargetGroup, setResolveTargetGroup] = useState<SystemErrorGroup | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const data = await systemErrorService.getStats();
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await systemErrorService.getGroups({
        page,
        pageSize,
        resolved: resolvedTab === 'done',
        source: sourceFilter,
        category: categoryFilter,
        priority: priorityFilter,
        keyword: keyword.trim() || undefined,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      });
      setGroups(res.items || []);
      setTotal(res.total || 0);
      if (res.summary) setPrioritySummary(res.summary);
    } catch (err) {
      message.error('加载系统错误监控失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    resolvedTab,
    sourceFilter,
    categoryFilter,
    priorityFilter,
    keyword,
    dateRange,
  ]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleResolveGroup = async (group: SystemErrorGroup, note?: string) => {
    setResolving(true);
    try {
      await systemErrorService.batchResolve(
        group.ids,
        note?.trim() || `已完成【${group.fixAction}】（合并 ${group.occurrenceCount} 次）`,
      );
      message.success(`已将同类型 ${group.occurrenceCount} 条错误标记为已完成`);
      setResolveModalVisible(false);
      setDetailVisible(false);
      fetchGroups();
      fetchStats();
    } catch {
      message.error('操作失败，请重试');
    } finally {
      setResolving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => message.success('已复制到剪贴板'),
      () => message.error('复制失败，请手动选中复制'),
    );
  };

  const renderPriorityTag = (priority: ErrorPriority, label: string) => {
    const st = PRIORITY_STYLE[priority] || PRIORITY_STYLE.P2;
    return (
      <Tag
        style={{
          margin: 0,
          background: st.bg,
          color: st.color,
          borderColor: st.border,
          fontWeight: 600,
        }}
      >
        {label}
      </Tag>
    );
  };

  const renderCategoryTag = (category: ErrorCategory, label: string) => {
    const st = CATEGORY_STYLE[category] || CATEGORY_STYLE.other;
    return (
      <Tag
        bordered={false}
        style={{
          margin: 0,
          background: st.bg,
          color: st.color,
          fontWeight: 600,
        }}
      >
        {label}
      </Tag>
    );
  };

  const sourceLabel = (source: string) => {
    if (source === 'mini_program') return '小程序';
    if (source === 'backend') return '后端服务';
    if (source === 'admin') return '超管后台';
    return source;
  };

  const columns = [
    {
      title: '优先级',
      key: 'priority',
      width: 155,
      render: (_: unknown, g: SystemErrorGroup) => (
        <Space direction="vertical" size={2}>
          {renderPriorityTag(g.priority, g.priorityLabel)}
          <Text type="secondary" style={{ fontSize: 11 }}>
            {g.priority === 'P0'
              ? '影响核心使用 · 立即修'
              : g.priority === 'P1'
                ? '影响主要功能 · 尽快修'
                : g.priority === 'P2'
                  ? '局部异常 · 排期修'
                  : '兼容提示 · 可观察'}
          </Text>
        </Space>
      ),
    },
    {
      title: '归因分类与修复动作',
      key: 'category',
      width: 220,
      render: (_: unknown, g: SystemErrorGroup) => (
        <Space direction="vertical" size={4}>
          {renderCategoryTag(g.category, g.categoryLabel)}
          <Text style={{ fontSize: 12, fontWeight: 500, color: colors.ink }}>
            <ToolOutlined style={{ marginRight: 4, color: colors.muted }} />
            {g.fixAction}
          </Text>
        </Space>
      ),
    },
    {
      title: '合并错误详情',
      key: 'message',
      ellipsis: true,
      render: (_: unknown, g: SystemErrorGroup) => (
        <div
          style={{ cursor: 'pointer' }}
          onClick={() => {
            setCurrentGroup(g);
            setDetailVisible(true);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Tag color="default" style={{ margin: 0, fontSize: 11 }}>
              {sourceLabel(g.latestError.source)}
            </Tag>
            {g.latestError.route && (
              <Text code style={{ fontSize: 12 }} ellipsis>
                {g.latestError.route}
              </Text>
            )}
          </div>
          <Text
            style={{
              fontSize: 13,
              color: g.priority === 'P0' ? 'var(--nb-danger)' : colors.ink,
              fontWeight: 500,
            }}
            ellipsis={{ tooltip: g.latestError.message }}
          >
            {g.latestError.message}
          </Text>
        </div>
      ),
    },
    {
      title: '合并次数',
      key: 'occurrenceCount',
      width: 120,
      render: (_: unknown, g: SystemErrorGroup) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0, fontWeight: 600 }}
          onClick={() => {
            setCurrentGroup(g);
            setDetailVisible(true);
          }}
        >
          共 {g.occurrenceCount} 次
          {g.impactedUsersCount > 0 ? ` (${g.impactedUsersCount}人)` : ''}
        </Button>
      ),
    },
    {
      title: '最近发生',
      dataIndex: 'latestOccurredAt',
      width: 160,
      render: (val: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(val).format('MM-DD HH:mm:ss')}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 170,
      fixed: 'right' as const,
      render: (_: unknown, g: SystemErrorGroup) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setCurrentGroup(g);
              setDetailVisible(true);
            }}
          >
            明细
          </Button>
          {!g.resolved && (
            <Button
              type="link"
              size="small"
              onClick={() => {
                setResolveTargetGroup(g);
                setResolveNote('');
                setResolveModalVisible(true);
              }}
            >
              标为已完成
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? '12px' : '24px' }}>
      <AdminPageHeader
        title="系统错误监控"
        description="按归因分类、影响优先级与同类型聚合展示，默认优先处理待修复异常"
        extra={
          <Space wrap>
            <Button
              icon={<DownloadOutlined />}
              onClick={() =>
                triggerLogFileDownload(
                  groups.flatMap((g) => g.occurrences),
                  resolvedTab,
                )
              }
            >
              导出当前页日志
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchGroups();
                fetchStats();
              }}
            >
              刷新
            </Button>
          </Space>
        }
      />

      {/* 顶部指标卡 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="待修复原记录"
              value={stats?.unresolvedCount ?? 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{
                color: (stats?.unresolvedCount ?? 0) > 0 ? 'var(--nb-danger)' : 'var(--nb-success)',
              }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="P0 致命（立即修）"
              value={prioritySummary.p0Count}
              prefix={<WarningOutlined />}
              valueStyle={{
                color: prioritySummary.p0Count > 0 ? 'var(--nb-danger)' : colors.ink,
              }}
              suffix="类"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="今日新增异常"
              value={stats?.todayCount ?? 0}
              prefix={<BugOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="今日受影响用户"
              value={stats?.impactedUsersToday ?? 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        {/* 待修复 / 已完成 Tab 切换 */}
        <Tabs
          activeKey={resolvedTab}
          onChange={(key) => {
            setResolvedTab(key as 'pending' | 'done');
            setPage(1);
          }}
          items={[
            {
              key: 'pending',
              label: (
                <Space size={6}>
                  <span>待修复</span>
                  <Badge count={stats?.unresolvedCount ?? 0} showZero color="red" />
                </Space>
              ),
            },
            {
              key: 'done',
              label: (
                <Space size={6}>
                  <span>已完成</span>
                  <Badge count={stats?.resolvedCount ?? 0} showZero color="green" />
                </Space>
              ),
            },
          ]}
        />

        {/* 筛选栏 */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="搜索错误信息、接口路径或堆栈"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="归因分类"
              allowClear
              style={{ width: '100%' }}
              value={categoryFilter}
              onChange={(val) => {
                setCategoryFilter(val);
                setPage(1);
              }}
              options={[
                { label: '数据库错误', value: 'database' },
                { label: '服务器/网关错误', value: 'server' },
                { label: '后台错误', value: 'backend' },
                { label: '前端错误', value: 'frontend' },
                { label: '系统环境提示', value: 'other' },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="优先级"
              allowClear
              style={{ width: '100%' }}
              value={priorityFilter}
              onChange={(val) => {
                setPriorityFilter(val);
                setPage(1);
              }}
              options={[
                { label: 'P0 · 必须马上修复', value: 'P0' },
                { label: 'P1 · 紧急修复', value: 'P1' },
                { label: 'P2 · 排期修复', value: 'P2' },
                { label: 'P3 · 低优先级观察', value: 'P3' },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="错误来源端"
              allowClear
              style={{ width: '100%' }}
              value={sourceFilter}
              onChange={(val) => {
                setSourceFilter(val);
                setPage(1);
              }}
              options={[
                { label: '小程序前端', value: 'mini_program' },
                { label: '后端服务', value: 'backend' },
                { label: '超管后台', value: 'admin' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null);
                setPage(1);
              }}
            />
          </Col>
        </Row>

        {isMobile ? (
          <Spin spinning={loading}>
            {groups.length === 0 ? (
              <Empty description={resolvedTab === 'pending' ? '太棒了，当前没有待修复异常' : '暂无已完成记录'} />
            ) : (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {groups.map((g) => (
                  <Card
                    key={g.groupKey}
                    size="small"
                    style={{ borderColor: g.priority === 'P0' ? 'var(--nb-danger)' : undefined }}
                    onClick={() => {
                      setCurrentGroup(g);
                      setDetailVisible(true);
                    }}
                  >
                    <Space wrap size={6} style={{ marginBottom: 8 }}>
                      {renderPriorityTag(g.priority, g.priorityLabel)}
                      {renderCategoryTag(g.category, g.categoryLabel)}
                      <Tag color="default">共 {g.occurrenceCount} 次</Tag>
                    </Space>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, wordBreak: 'break-all' }}>
                      {g.latestError.message}
                    </div>
                    <div style={{ fontSize: 12, color: colors.secondary, marginBottom: 8 }}>
                      <ToolOutlined style={{ marginRight: 4 }} />
                      建议动作：{g.fixAction}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        最近 {dayjs(g.latestOccurredAt).format('MM-DD HH:mm')}
                      </Text>
                      {!g.resolved && (
                        <Button
                          size="small"
                          type="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setResolveTargetGroup(g);
                            setResolveNote('');
                            setResolveModalVisible(true);
                          }}
                        >
                          标为已完成
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <Pagination
                    simple
                    current={page}
                    pageSize={pageSize}
                    total={total}
                    onChange={(p) => setPage(p)}
                  />
                </div>
              </Space>
            )}
          </Spin>
        ) : (
          <Table
            rowKey="groupKey"
            loading={loading}
            columns={columns}
            dataSource={groups}
            scroll={{ x: 1000 }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (t) => `共 ${t} 类错误`,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
          />
        )}
      </Card>

      {/* 合并错误详情弹窗（展示每次发生明细） */}
      <Modal
        title={
          currentGroup ? (
            <Space wrap>
              <span>同类型错误聚合详情</span>
              {renderPriorityTag(currentGroup.priority, currentGroup.priorityLabel)}
              <Tag>共发生 {currentGroup.occurrenceCount} 次</Tag>
            </Space>
          ) : (
            '错误详情'
          )
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={isMobile ? '96%' : 860}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
          currentGroup && (
            <Button
              key="export"
              icon={<DownloadOutlined />}
              onClick={() =>
                triggerLogFileDownload(
                  currentGroup.occurrences,
                  `${currentGroup.category}-${currentGroup.priority}`,
                )
              }
            >
              导出本组 {currentGroup.occurrences.length} 条日志
            </Button>
          ),
          currentGroup && !currentGroup.resolved && (
            <Button
              key="resolve"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => {
                setResolveTargetGroup(currentGroup);
                setResolveNote('');
                setResolveModalVisible(true);
              }}
            >
              全部标为已完成 ({currentGroup.occurrenceCount} 次)
            </Button>
          ),
        ]}
      >
        {currentGroup && (
          <div>
            <Descriptions bordered size="small" column={isMobile ? 1 : 2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="归因分类">
                {renderCategoryTag(currentGroup.category, currentGroup.categoryLabel)}
              </Descriptions.Item>
              <Descriptions.Item label="影响与优先级">
                <Space direction="vertical" size={2}>
                  {renderPriorityTag(currentGroup.priority, currentGroup.priorityLabel)}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {currentGroup.urgencyNote}
                  </Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="建议修复动作" span={isMobile ? 1 : 2}>
                <Space direction="vertical" size={2}>
                  <Text strong>
                    <ToolOutlined style={{ marginRight: 6 }} />
                    {currentGroup.fixAction}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {currentGroup.fixHint}
                  </Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="合并统计">
                共发生 <b>{currentGroup.occurrenceCount}</b> 次 · 影响{' '}
                <b>{currentGroup.impactedUsersCount}</b> 名已登录用户
              </Descriptions.Item>
              <Descriptions.Item label="时间跨度">
                {dayjs(currentGroup.firstOccurredAt).format('MM-DD HH:mm')} ~{' '}
                {dayjs(currentGroup.latestOccurredAt).format('MM-DD HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            <Alert
              type={currentGroup.priority === 'P0' ? 'error' : 'warning'}
              showIcon
              message={currentGroup.latestError.message}
              style={{ marginBottom: 16, wordBreak: 'break-all' }}
              action={
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(currentGroup.latestError.message)}
                >
                  复制
                </Button>
              }
            />

            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              历次发生明细（按时间倒序，共 {currentGroup.occurrences.length} 条）
            </Text>
            <Collapse
              defaultActiveKey={
                currentGroup.occurrences[0] ? [String(currentGroup.occurrences[0].id)] : []
              }
              items={currentGroup.occurrences.map((occ, idx) => {
                const d = parseDeviceJson(occ.deviceInfo);
                return {
                  key: String(occ.id),
                  label: (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <Space size={8}>
                        <Tag style={{ margin: 0 }}>#{occ.id}</Tag>
                        <Text strong>{dayjs(occ.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
                        {idx === 0 && <Tag color="blue">最新</Tag>}
                      </Space>
                      <Space size={8}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {occ.userRole ? `${occ.userRole}:${occ.userId || '-'}` : '访客'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {occ.ip || '—'}
                        </Text>
                      </Space>
                    </div>
                  ),
                  children: (
                    <div>
                      <Descriptions
                        size="small"
                        bordered
                        column={isMobile ? 1 : 2}
                        style={{ marginBottom: 10 }}
                      >
                        <Descriptions.Item label="页面/接口" span={isMobile ? 1 : 2}>
                          <Text code style={{ wordBreak: 'break-all' }}>
                            {occ.route || '—'}
                          </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="机型与系统">
                          {d ? `${d.brand || d.model || '—'} · ${d.system || '—'}` : '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="微信与基础库">
                          {d ? `${d.version || '—'} / 基础库 ${d.SDKVersion || '—'}` : '—'}
                        </Descriptions.Item>
                      </Descriptions>
                      <pre
                        style={{
                          background: colors.action,
                          color: colors.inverse,
                          padding: '10px 12px',
                          borderRadius: 6,
                          maxHeight: 200,
                          overflow: 'auto',
                          fontSize: 12,
                          margin: 0,
                          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        }}
                      >
                        {occ.stack || '无可用堆栈信息'}
                      </pre>
                    </div>
                  ),
                };
              })}
            />
          </div>
        )}
      </Modal>

      {/* 标记已完成确认弹窗 */}
      <Modal
        title="标记同类型错误为已完成"
        open={resolveModalVisible}
        confirmLoading={resolving}
        onCancel={() => setResolveModalVisible(false)}
        onOk={() => {
          if (resolveTargetGroup) {
            handleResolveGroup(resolveTargetGroup, resolveNote);
          }
        }}
      >
        {resolveTargetGroup && (
          <div style={{ padding: '4px 0' }}>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={`将把【${resolveTargetGroup.categoryLabel}】下的共 ${resolveTargetGroup.occurrenceCount} 条同类型异常全部移入「已完成」Tab`}
            />
            <Text style={{ display: 'block', marginBottom: 8 }}>
              修复动作与排查备忘（选填）：
            </Text>
            <Input.TextArea
              rows={3}
              placeholder={`例如：已完成【${resolveTargetGroup.fixAction}】，问题已解决`}
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SystemErrors;
