import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, SendOutlined } from '@ant-design/icons';
import { colors } from '../colors.generated';
import {
  wechatOfficialService,
  type WechatOfficialMessageItem,
  type WechatOfficialThread,
} from '../services/wechatOfficial';

const { Title, Paragraph, Text } = Typography;

/** 后台列表自动刷新间隔：公众号咨询靠人工看，别让它悄悄堆积。 */
const REFRESH_INTERVAL_MS = 30_000;

const MSG_TYPE_LABELS: Record<string, string> = {
  text: '文字',
  image: '图片',
  voice: '语音',
  video: '视频',
  shortvideo: '短视频',
  location: '位置',
  link: '链接',
  event: '事件',
};

const STATUS_META: Record<
  string,
  { label: string; color: string; hint: string }
> = {
  pending: {
    label: '待人工处理',
    color: 'error',
    hint: '关键词未命中，只发出了兜底文案，建议人工跟进',
  },
  auto_replied: {
    label: '已自动回复',
    color: 'default',
    hint: '命中关键词规则，系统已自动回复',
  },
  handled: { label: '已处理', color: 'success', hint: '已人工处理' },
  note: { label: '仅记录', color: 'default', hint: '关注/取关等事件' },
};

function apiErrorMessage(error: unknown) {
  const value = error as {
    response?: { data?: { message?: string | string[] } };
  };
  const raw = value.response?.data?.message;
  if (Array.isArray(raw)) return raw.join('；');
  return raw;
}

function shortOpenId(openId: string) {
  if (openId.length <= 12) return openId;
  return `${openId.slice(0, 6)}…${openId.slice(-4)}`;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function StatusTag({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    color: 'default',
    hint: '',
  };
  return (
    <Tooltip title={meta.hint || undefined}>
      <Tag color={meta.color}>{meta.label}</Tag>
    </Tooltip>
  );
}

/** 会话气泡：in 靠左、out 靠右，与微信里看到的顺序一致。 */
function Bubble({ item }: { item: WechatOfficialMessageItem }) {
  const isOut = item.direction === 'out';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isOut ? 'flex-end' : 'flex-start',
        marginBottom: 12,
      }}
    >
      <div style={{ maxWidth: '78%' }}>
        <div
          style={{
            background: isOut ? colors.activeSurface : colors.surface,
            border: `1px solid ${colors.line}`,
            borderRadius: 10,
            padding: '8px 12px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: colors.ink,
          }}
        >
          {item.content || '（无文字内容）'}
        </div>
        <div
          style={{
            textAlign: isOut ? 'right' : 'left',
            marginTop: 4,
            color: colors.muted,
            fontSize: 12,
          }}
        >
          {formatTime(item.createdAt)}
          {isOut ? ` · ${item.repliedBy || '人工回复'}` : ''}
          {!isOut && item.msgType !== 'text' && item.msgType !== 'event'
            ? ` · ${MSG_TYPE_LABELS[item.msgType] ?? item.msgType}`
            : ''}
          {item.eventType ? ` · ${item.eventType}` : ''}
        </div>
      </div>
    </div>
  );
}

export default function WechatMessages() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [items, setItems] = useState<WechatOfficialMessageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [thread, setThread] = useState<WechatOfficialThread | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoading(true);
      try {
        const data = await wechatOfficialService.listMessages({
          status,
          page,
          pageSize,
        });
        setItems(data.items);
        setTotal(data.total);
        setPendingCount(data.pendingCount);
      } catch (error: unknown) {
        if (!options?.silent) {
          message.error(apiErrorMessage(error) || '加载消息失败');
        }
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [status, page, pageSize],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // 静默轮询：新咨询能自己冒出来，不用手动刷新。
  useEffect(() => {
    const timer = window.setInterval(() => {
      void load({ silent: true });
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const openThread = useCallback(async (openId: string) => {
    setThreadOpen(true);
    setThread(null);
    try {
      const data = await wechatOfficialService.getThread(openId);
      setThread(data);
      window.setTimeout(() => {
        threadRef.current?.scrollTo({
          top: threadRef.current.scrollHeight,
        });
      }, 50);
    } catch (error: unknown) {
      message.error(apiErrorMessage(error) || '加载会话失败');
    }
  }, []);

  const sendReply = useCallback(async () => {
    const content = reply.trim();
    if (!content) {
      message.warning('请先输入回复内容');
      return;
    }
    setSending(true);
    try {
      await wechatOfficialService.replyMessage({
        openId: thread?.openId ?? '',
        content,
      });
      setReply('');
      message.success('已发送');
      if (thread) await openThread(thread.openId);
      await load({ silent: true });
    } catch (error: unknown) {
      message.error(apiErrorMessage(error) || '发送失败');
    } finally {
      setSending(false);
    }
  }, [reply, thread, openThread, load]);

  const markHandled = useCallback(
    async (id: number) => {
      try {
        await wechatOfficialService.markMessageHandled(id);
        message.success('已标记为处理完成');
        await load({ silent: true });
      } catch (error: unknown) {
        message.error(apiErrorMessage(error) || '操作失败');
      }
    },
    [load],
  );

  const columns: ColumnsType<WechatOfficialMessageItem> = useMemo(
    () => [
      {
        title: '时间',
        dataIndex: 'createdAt',
        width: 170,
        render: (value: string) => formatTime(value),
      },
      {
        title: '用户',
        dataIndex: 'openId',
        width: 140,
        render: (value: string) => (
          <Tooltip title={value}>
            <Text code>{shortOpenId(value)}</Text>
          </Tooltip>
        ),
      },
      {
        title: '类型',
        dataIndex: 'msgType',
        width: 90,
        render: (value: string, row) =>
          row.eventType ? `事件·${row.eventType}` : MSG_TYPE_LABELS[value] ?? value,
      },
      {
        title: '内容',
        dataIndex: 'content',
        render: (value: string, row) => (
          <Space direction="vertical" size={0}>
            <span style={{ color: colors.ink }}>{value || '（无文字内容）'}</span>
            {row.direction === 'out' ? (
              <Text type="secondary">我方回复</Text>
            ) : null}
          </Space>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 130,
        render: (value: string) => <StatusTag status={value} />,
      },
      {
        title: '操作',
        key: 'action',
        width: 190,
        render: (_, row) => (
          <Space size="small">
            <Button size="small" onClick={() => void openThread(row.openId)}>
              查看会话
            </Button>
            {row.status === 'pending' ? (
              <Button
                size="small"
                type="primary"
                onClick={() => void markHandled(row.id)}
              >
                标记已处理
              </Button>
            ) : null}
          </Space>
        ),
      },
    ],
    [openThread, markHandled],
  );

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space
          align="center"
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <Space align="center" size="middle">
            <Title level={4} style={{ margin: 0 }}>
              公众号消息
            </Title>
            <Badge
              count={pendingCount}
              overflowCount={99}
              showZero={false}
              color={colors.action}
            />
            <Text type="secondary">
              {pendingCount > 0
                ? `${pendingCount} 条待人工处理`
                : '暂无待处理消息'}
            </Text>
          </Space>
          <Space>
            <Segmented
              value={status}
              onChange={(value) => {
                setStatus(String(value));
                setPage(1);
              }}
              options={[
                { label: '待处理', value: 'pending' },
                { label: '已自动回复', value: 'auto_replied' },
                { label: '已处理', value: 'handled' },
                { label: '仅记录', value: 'note' },
                { label: '全部', value: 'all' },
              ]}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void load()}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        </Space>

        <Alert
          type="info"
          showIcon
          message="用户消息已全部留痕；人工回复走微信客服消息接口，受「用户最后一次互动后 48 小时」限制。"
          description="命中关键词的消息由系统自动回复（状态为「已自动回复」）；未命中的只发出兜底文案，会进入「待处理」，建议人工跟进。"
        />

        <Card styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={items}
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage);
                setPageSize(nextPageSize);
              },
            }}
          />
        </Card>
      </Space>

      <Drawer
        title={thread ? `会话 · ${shortOpenId(thread.openId)}` : '会话'}
        width={520}
        open={threadOpen}
        onClose={() => setThreadOpen(false)}
        styles={{ body: { display: 'flex', flexDirection: 'column' } }}
      >
        {thread ? (
          <>
            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
              {thread.linkedToMiniProgram
                ? '该用户已与小程序的账号关联（有 UnionID）'
                : '未关联小程序账号（无 UnionID），无法定位到具体客户'}
            </Paragraph>
            <div
              ref={threadRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {thread.items.length ? (
                thread.items.map((item) => (
                  <Bubble key={`${item.direction}-${item.id}`} item={item} />
                ))
              ) : (
                <Empty description="暂无消息" />
              )}
            </div>
            <Space.Compact style={{ marginTop: 12, width: '100%' }}>
              <Input.TextArea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="输入回复内容，发送后用户会在公众号里收到"
                autoSize={{ minRows: 2, maxRows: 4 }}
                maxLength={600}
                showCount
              />
            </Space.Compact>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sending}
              onClick={() => void sendReply()}
              style={{ marginTop: 8 }}
              block
            >
              发送回复
            </Button>
          </>
        ) : (
          <Empty description="加载中" />
        )}
      </Drawer>
    </div>
  );
}
