import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, ConfigProvider, Empty, Input, Pagination, Select, Space, Spin, Tag, Typography, message } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import AdminPageHeader from '../components/AdminPageHeader';
import { useAuth } from '../contexts/AuthContext';
import { bookingNotifications } from '../services/bookingNotifications';
import type { BookingNotification, NotificationHealth } from '../services/bookingNotifications';

const statuses: Record<string, string> = { pending: '等待发送', sending: '处理中', delivered: '微信接口已接受', failed: '未发送成功', obsolete: '已停止过期通知', invalid_snapshot: '记录不完整', sent: '微信接口已接受', skipped: '已跳过', unknown: '结果待核查' };
const events: Record<string, string> = { 'booking.client_success': '预约成功', 'booking.technician_new': '新预约', 'booking.day_before': '次日提醒', 'booking.hour_before': '一小时前提醒' };
const reasons: Record<string, string> = { authorization_unavailable: '没有可用订阅次数，请用户在小程序主动补充授权', '43101': '微信未认可本次订阅授权，请用户重新授权', template_not_configured: '模板未配置，请检查微信能力配置', recipient_missing: '预约未关联接收账号', wechat_identity_missing: '账号尚未关联微信身份', delivery_outcome_unknown: '无法确定微信是否收到，禁止自动重发', network_error: '网络响应不明确，需核查是否已经发送', event_obsolete: '预约已变化或消息已过期', snapshot_incomplete: '历史记录不支持安全补发' };

export default function BookingNotifications() {
  const { hasPermission } = useAuth();
  const [search] = useSearchParams();
  const [orderId, setOrderId] = useState(search.get('orderId') || '');
  const [filters, setFilters] = useState({ page: 1, orderId: search.get('orderId') || '', status: '' });
  const [rows, setRows] = useState<BookingNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [health, setHealth] = useState<NotificationHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState<number | null>(null);
  const request = useRef(0);
  const load = useCallback(async () => {
    const version = ++request.current;
    setLoading(true); setError('');
    try {
      const [list, summary] = await Promise.all([bookingNotifications.list({ page: filters.page, orderId: filters.orderId || undefined, status: filters.status || undefined }), bookingNotifications.health()]);
      if (version !== request.current) return;
      setRows(list.data); setTotal(list.total); setHealth(summary);
    } catch { if (version === request.current) setError('读取通知记录失败，请重试'); }
    finally { if (version === request.current) setLoading(false); }
  }, [filters]);
  useEffect(() => { void load(); }, [load]);
  async function retry(id: number) {
    if (retrying !== null) return;
    setRetrying(id);
    try { await bookingNotifications.retry(id); message.success('已加入发送队列，约一分钟后刷新查看'); await load(); }
    catch { message.error('未能重试，预约可能已变化或发送次数已用完，请刷新记录'); }
    finally { setRetrying(null); }
  }
  return <ConfigProvider theme={{ token: { controlHeight: 44 }, components: { Pagination: { itemSize: 44 } } }}>
    <AdminPageHeader title="预约通知" description="核对微信通知结果。微信接口接受不代表用户已阅读；结果未知的消息不自动重发。" />
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      {health && <Card title="异常监测"><Space wrap size={16}>
        <Typography.Text>积压超过 10 分钟：{health.backlog}</Typography.Text>
        <Typography.Text>结果待核查：{health.unknown}</Typography.Text>
        <Typography.Text>24 小时重试耗尽：{health.exhausted}</Typography.Text>
        <Typography.Text>24 小时模板缺失：{health.misconfigured}</Typography.Text>
        <Typography.Text>24 小时授权不足：{health.noAuthorization}</Typography.Text>
      </Space><p>更新于 {new Date(health.checkedAt).toLocaleString('zh-CN')}</p></Card>}
      <Card><Space wrap>
        <Input aria-label="预约ID" placeholder="预约ID" inputMode="numeric" value={orderId} onChange={e => setOrderId(e.target.value)} style={{ width: 180 }} />
        <Select aria-label="通知状态" value={filters.status} style={{ width: 180 }} onChange={status => setFilters(value => ({ ...value, page: 1, status }))}
          options={[{ value: '', label: '全部状态' }, ...['pending', 'sending', 'delivered', 'failed', 'obsolete', 'invalid_snapshot'].map(value => ({ value, label: statuses[value] }))]} />
        <Button onClick={() => { if (orderId && !/^[1-9]\d*$/.test(orderId)) return message.error('请输入有效的预约ID'); setFilters(value => ({ ...value, orderId, page: 1 })); }}>查询</Button>
        <Button onClick={() => void load()} loading={loading}>刷新</Button>
      </Space></Card>
      {error && <Card><Typography.Text>{error}</Typography.Text><Button onClick={() => void load()}>重试</Button></Card>}
      <Spin spinning={loading}><Space orientation="vertical" size={12} style={{ width: '100%' }}>
        {!loading && !error && !rows.length && <Empty description="没有符合条件的通知记录" />}
        {!error && rows.map(event => <Card key={event.id} title={<Space wrap><span>{events[event.eventType] || event.eventType.replace('booking.status.', '预约状态：')}</span><Tag>{statuses[event.status] || event.status}</Tag></Space>}>
          <Space wrap><Link to={`/orders?order=${event.orderId}`} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>预约 #{event.orderId}</Link><span>{event.recipientRole === 'client' ? '客户' : '美甲师'} #{event.recipientId || '未关联'}</span><span>{new Date(event.createdAt).toLocaleString('zh-CN')}</span></Space>
          {!event.deliveries.length && <p>{event.status === 'obsolete' ? '预约已变化，未发送过期消息' : '尚未产生微信发送记录'}</p>}
          {event.deliveries.map(delivery => <div key={delivery.id}>
            <p>{statuses[delivery.status] || delivery.status} · 已尝试 {delivery.attemptCount}/3 次</p>
            {(delivery.providerCode || delivery.providerMessage) && <p style={{ overflowWrap: 'anywhere' }}>{reasons[delivery.providerCode || ''] || delivery.providerMessage || '请核查微信返回结果'}{delivery.providerCode ? `（${delivery.providerCode}）` : ''}</p>}
            {delivery.canRetry && hasPermission('feature_flag:update') && <Button loading={retrying === delivery.id} disabled={retrying !== null} onClick={() => void retry(delivery.id)}>重试此通知</Button>}
          </div>)}
        </Card>)}
      </Space></Spin>
      <Pagination current={filters.page} pageSize={20} total={total} showSizeChanger={false} onChange={page => setFilters(value => ({ ...value, page }))} />
    </Space>
  </ConfigProvider>;
}
