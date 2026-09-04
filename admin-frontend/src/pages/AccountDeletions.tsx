import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Card, Checkbox, Input, Modal, Pagination, Space, Spin, Typography, message } from 'antd';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface DeletionRequest { id: number; accountId: number; accountType: string; status: string; reason: string; decision?: string; requestedAt: string; events: string }
interface Detail { request: DeletionRequest; account: { nickname?: string; name?: string; phone: string; status: string } | null; blockers: string[] }
const labels: Record<string, string> = { pending: '待审核', completed: '已注销', rejected: '已驳回', cancelled: '已撤回', submitted: '提交申请', complete: '执行注销', reject: '驳回' };
const AccountDeletions: React.FC = () => {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<DeletionRequest[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [note, setNote] = useState('');
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const errorText = (error: unknown) => {
    if (!axios.isAxiosError<{ message?: string }>(error)) return '请求失败，请重试';
    return error.response?.data?.message || '请求失败，请重试';
  };
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const { data } = await api.get('/account-deletions', { params: { page } }); setRows(data.list); setTotal(data.total); }
    catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);
  const open = async (id: number) => {
    setBusy(true);
    try { const { data } = await api.get('/account-deletions/' + id); setDetail(data); setNote(''); setVerified(false); }
    catch (e) { message.error(errorText(e)); }
    finally { setBusy(false); }
  };
  const review = async (action: 'complete' | 'reject') => {
    if (!detail || busy || !note.trim()) return;
    setBusy(true);
    try {
      await api.post(`/account-deletions/${detail.request.id}/review`, { action, note: note.trim(), identityVerified: verified });
      setDetail(null); message.success(action === 'complete' ? '账号已注销' : '已驳回申请'); await load();
    } catch (e) { message.error(errorText(e)); }
    finally { setBusy(false); }
  };
  return <>
    <Typography.Title level={3}>账号注销申请</Typography.Title>
    <Alert message="仅处理本人提交的申请。执行前请通过运营核验流程确认申请人身份，并处理未完成预约和资金事项。普通反馈的“已处理”不代表账号注销。" type="info" />
    {error && <Alert style={{ marginTop: 16 }} message={error} action={<Button onClick={load}>重试</Button>} />}
    <Spin spinning={loading}>
      <Space direction="vertical" style={{ width: '100%', margin: '16px 0' }}>
        {rows.map(row => <Card key={row.id} size="small" title={`申请 #${row.id} · ${labels[row.status] || row.status}`}>
          <Typography.Paragraph>{row.accountType === 'client' ? '客户' : '美甲师'} #{row.accountId} · {new Date(row.requestedAt).toLocaleString()}</Typography.Paragraph>
          <Typography.Paragraph style={{ overflowWrap: 'anywhere' }}>{row.reason}</Typography.Paragraph>
          <Button disabled={busy} onClick={() => open(row.id)}>查看与处理</Button>
        </Card>)}
        {!loading && !error && !rows.length && <Typography.Text>暂无注销申请</Typography.Text>}
      </Space>
    </Spin>
    <Pagination current={page} total={total} pageSize={20} showSizeChanger={false} onChange={setPage} />
    <Modal title="注销申请详情" open={!!detail} onCancel={() => !busy && setDetail(null)} footer={null} closable={!busy} maskClosable={!busy}>
      {detail && <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Text>{detail.account?.name || detail.account?.nickname || '已无账号资料'} · {detail.account?.phone}</Typography.Text>
        <Typography.Text>身份：{detail.request.accountType === 'client' ? '客户' : '美甲师'} · {labels[detail.request.status]}</Typography.Text>
        <Typography.Paragraph>申请原因：{detail.request.reason}</Typography.Paragraph>
        {detail.request.decision && <Typography.Paragraph>处理说明：{detail.request.decision}</Typography.Paragraph>}
        {detail.blockers.length > 0 && <Alert type="warning" message="暂不可执行注销" description={detail.blockers.join('；')} />}
        <Typography.Text strong>处理记录</Typography.Text>
        {(JSON.parse(detail.request.events) as Array<{ action: string; at: string; note: string; actor: string }>).map((event, i) => <Typography.Paragraph key={i}>{new Date(event.at).toLocaleString()} · {labels[event.action] || event.action} · {event.actor}<br />{event.note}</Typography.Paragraph>)}
        {detail.request.status === 'pending' && hasPermission('account-deletion:manage') && <>
          <Input.TextArea aria-label="审核说明" placeholder="填写核验结果或驳回原因（必填，最多500字）" maxLength={500} rows={3} value={note} onChange={e => setNote(e.target.value)} disabled={busy} />
          <Checkbox style={{ minHeight: 44, display: 'flex', alignItems: 'center' }} checked={verified} onChange={e => setVerified(e.target.checked)} disabled={busy}>已人工核验申请人身份，并告知注销影响</Checkbox>
          <Alert message="执行后不可恢复账号。主要资料匿名化、微信解绑、登录失效；保留交易与审核记录，不删除另一身份。" type="warning" />
          <Space wrap>
            <Button disabled={busy || !note.trim()} onClick={() => review('reject')}>驳回申请</Button>
            <Button type="primary" disabled={busy || !note.trim() || !verified || !!detail.blockers.length} onClick={() => Modal.confirm({ title: '确认执行注销？', content: '此操作不可撤销，历史账号不会恢复。', okText: '确认注销', cancelText: '取消', onOk: () => review('complete') })}>执行注销</Button>
          </Space>
        </>}
      </Space>}
    </Modal>
  </>;
};
export default AccountDeletions;
