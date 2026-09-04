import React, { useCallback, useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Tabs,
  Select,
  Typography,
  message,
  Modal,
  Input,
  Descriptions,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { adminFeedbackService, SOURCE_MAP } from '../services/adminFeedback';
import type { AdminFeedback } from '../services/adminFeedback';

const { Text, Paragraph } = Typography;

const resolveAttachmentUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase =
    import.meta.env.VITE_API_URL || 'http://localhost:3000/api/admin';
  return `${apiBase.replace(/\/api\/admin\/?$/, '')}${url}`;
};

const Feedback: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'pending' | 'processing' | 'resolved'>('pending');
  const [sourceType, setSourceType] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AdminFeedback | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyStatus, setReplyStatus] = useState<AdminFeedback['status']>('processing');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminFeedbackService.getAll({
        page,
        pageSize: 20,
        status,
        sourceType,
      });
      setItems(result.list);
      setTotal(result.total);
    } catch {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [page, status, sourceType]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (record: AdminFeedback) => {
    setDetail(record);
    setReplyContent(record.replyContent || '');
    setReplyStatus(record.status === 'pending' ? 'processing' : record.status);
    try {
      const result = await adminFeedbackService.getById(record.id);
      setDetail(result);
      setReplyContent(result.replyContent || '');
      setReplyStatus(result.status === 'pending' ? 'processing' : result.status);
    } catch {
      message.error('获取反馈详情失败');
    }
  };

  const saveReply = async () => {
    if (!detail) return;
    if (replyStatus === 'resolved' && !replyContent.trim()) {
      message.warning('标记已回复前请填写回复内容');
      return;
    }
    setSaving(true);
    try {
      await adminFeedbackService.reply(detail.id, { status: replyStatus, replyContent: replyContent.trim() });
      message.success('反馈进度已更新');
      setDetail(null);
      load();
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<AdminFeedback> = [
    {
      title: '来源',
      dataIndex: 'sourceType',
      key: 'sourceType',
      width: 90,
      render: (s: string) => (
        <Tag color={s === 'technician' ? 'default' : 'default'}>
          {SOURCE_MAP[s] ?? s}
        </Tag>
      ),
    },
    {
      title: '提交人',
      key: 'submitter',
      width: 160,
      render: (_, record) => (
        <div>
          <div>{record.sourceName || '—'}</div>
          {record.sourcePhone && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.sourcePhone}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (t: string) => <Tag>{t}</Tag>,
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      render: (content: string) => (
        <Paragraph
          style={{ marginBottom: 0, maxWidth: 420 }}
          ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
        >
          {content}
        </Paragraph>
      ),
    },
    {
      title: '附件',
      dataIndex: 'attachmentUrls',
      key: 'attachmentUrls',
      width: 120,
      render: (urls: string[] = []) => {
        if (!urls.length) return <Text type="secondary">—</Text>;
        return (
          <Space wrap size={4}>
            {urls.map((url, index) => (
              <Button
                key={`${url}-${index}`}
                type="link"
                size="small"
                href={resolveAttachmentUrl(url)}
                target="_blank"
              >
                附件{index + 1}
              </Button>
            ))}
          </Space>
        );
      },
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => {
        if (record.type === '账号注销申请') return <Text type="secondary">历史注销反馈，请引导用户从账号注销入口提交；此记录不执行注销。</Text>;
        return (
          <Space>
            <Button type={record.status === 'resolved' ? 'default' : 'primary'} size="small" onClick={() => openDetail(record)}>
              {record.status === 'resolved' ? '查看回复' : '处理反馈'}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Tabs
          activeKey={status}
          onChange={(key) => {
            setStatus(key as 'pending' | 'processing' | 'resolved');
            setPage(1);
          }}
          items={[
            { key: 'pending', label: '待处理' },
            { key: 'processing', label: '处理中' },
            { key: 'resolved', label: '已回复' },
          ]}
        />
        <Select
          allowClear
          placeholder="来源筛选"
          style={{ width: 140 }}
          value={sourceType}
          onChange={(v) => {
            setSourceType(v);
            setPage(1);
          }}
          options={[
            { value: 'client', label: '用户' },
            { value: 'technician', label: '美甲师' },
          ]}
        />
      </div>
      <Table
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p) => setPage(p),
        }}
      />
      <Modal title="反馈详情与回复" open={!!detail} onCancel={() => !saving && setDetail(null)}
        onOk={saveReply} okText="保存并回传" cancelText="取消" confirmLoading={saving} width={720}>
        {detail && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="提交人">{detail.sourceName || '—'} {detail.sourcePhone || ''}</Descriptions.Item>
              <Descriptions.Item label="来源">{SOURCE_MAP[detail.sourceType]}</Descriptions.Item>
              <Descriptions.Item label="类型">{detail.type}</Descriptions.Item>
              <Descriptions.Item label="提交时间">{new Date(detail.createdAt).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="标题" span={2}>{detail.title}</Descriptions.Item>
              <Descriptions.Item label="问题内容" span={2}><Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{detail.content}</Paragraph></Descriptions.Item>
            </Descriptions>
            <div>
              <Text strong>处理状态</Text>
              <Select value={replyStatus} onChange={setReplyStatus} style={{ width: '100%', marginTop: 8 }}
                options={[
                  { value: 'pending', label: '待处理' },
                  { value: 'processing', label: '处理中' },
                  { value: 'resolved', label: '已回复' },
                ]} />
            </div>
            <div>
              <Text strong>回复用户</Text>
              <Input.TextArea value={replyContent} onChange={(event) => setReplyContent(event.target.value)}
                maxLength={1000} showCount rows={5}
                placeholder="填写处理结果或需要用户补充的信息，保存后会显示在用户的反馈记录中"
                style={{ marginTop: 8 }} />
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default Feedback;
