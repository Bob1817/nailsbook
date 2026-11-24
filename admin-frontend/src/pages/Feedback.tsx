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
  Card,
  Image,
  Grid,
  Empty,
  Pagination,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { adminFeedbackService, SOURCE_MAP } from '../services/adminFeedback';
import type { AdminFeedback } from '../services/adminFeedback';
import AdminPageHeader from '../components/AdminPageHeader';

const { Text, Paragraph } = Typography;

const resolveAttachmentUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase =
    import.meta.env.VITE_API_URL || 'http://localhost:3000/api/admin';
  return `${apiBase.replace(/\/api\/admin\/?$/, '')}${url}`;
};

const Feedback: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'pending' | 'processing' | 'resolved'>('pending');
  const [sourceType, setSourceType] = useState<string | undefined>(undefined);
  const [categoryType, setCategoryType] = useState<string | undefined>(undefined);
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AdminFeedback | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyStatus, setReplyStatus] = useState<AdminFeedback['status']>('resolved');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminFeedbackService.getAll({
        page,
        pageSize: 20,
        status,
        sourceType,
        type: categoryType,
        keyword: keyword.trim() || undefined,
      });
      setItems(result.list);
      setTotal(result.total);
    } catch {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [page, status, sourceType, categoryType, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (record: AdminFeedback) => {
    setDetail(record);
    setReplyContent(record.replyContent || '');
    setReplyStatus(record.status === 'pending' ? 'resolved' : record.status);
    try {
      const result = await adminFeedbackService.getById(record.id);
      setDetail(result);
      setReplyContent(result.replyContent || '');
      setReplyStatus(result.status === 'pending' ? 'resolved' : result.status);
    } catch {
      message.error('获取详情失败');
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
      message.success('回复已保存并同步给用户');
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
        <Tag color={s === 'technician' ? 'purple' : 'blue'}>
          {SOURCE_MAP[s] ?? s}
        </Tag>
      ),
    },
    {
      title: '分类',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (t: string) => (
        <Tag color={t === '客服咨询' ? 'geekblue' : 'default'}>{t}</Tag>
      ),
    },
    {
      title: '提交人',
      key: 'submitter',
      width: 150,
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
      title: '标题与内容',
      key: 'content',
      render: (_, record) => (
        <div style={{ maxWidth: 400 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{record.title}</div>
          <Paragraph
            style={{ marginBottom: 0 }}
            type="secondary"
            ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
          >
            {record.content}
          </Paragraph>
        </div>
      ),
    },
    {
      title: '问题截图',
      dataIndex: 'attachmentUrls',
      key: 'attachmentUrls',
      width: 150,
      render: (urls: string[] = []) => {
        if (!urls.length) return <Text type="secondary">无截图</Text>;
        return (
          <Image.PreviewGroup>
            <Space wrap size={6}>
              {urls.slice(0, 3).map((url, index) => (
                <Image
                  key={`${url}-${index}`}
                  src={resolveAttachmentUrl(url)}
                  width={44}
                  height={44}
                  style={{ objectFit: 'cover', borderRadius: 6 }}
                />
              ))}
              {urls.length > 3 && (
                <Text type="secondary" style={{ fontSize: 12 }}>+{urls.length - 3}</Text>
              )}
            </Space>
          </Image.PreviewGroup>
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
        if (record.type === '账号注销申请') return <Text type="secondary">请走账号注销队列</Text>;
        return (
          <Button type={record.status === 'resolved' ? 'default' : 'primary'} size="small" onClick={() => openDetail(record)}>
            {record.status === 'resolved' ? '查看回复' : '回答处理'}
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="客服与反馈"
        description="统一接收美甲师端与客户端的在线客服问询及截图问题反馈；每条提交都会同步通过微信公众号与钉钉机器人通知管理员。"
      />
      <Card className="admin-list-card">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Tabs
            style={{ marginBottom: 0 }}
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
          <Space wrap size={8}>
            <Select
              allowClear
              placeholder="身份筛选"
              style={{ width: 120 }}
              value={sourceType}
              onChange={(v) => {
                setSourceType(v);
                setPage(1);
              }}
              options={[
                { value: 'technician', label: '美甲师' },
                { value: 'client', label: '客户' },
              ]}
            />
            <Select
              allowClear
              placeholder="业务分类"
              style={{ width: 130 }}
              value={categoryType}
              onChange={(v) => {
                setCategoryType(v);
                setPage(1);
              }}
              options={[
                { value: '客服咨询', label: '客服咨询' },
                { value: '__feedback_only__', label: '问题反馈' },
              ]}
            />
            <Input.Search
              allowClear
              placeholder="搜姓名/手机号/内容"
              style={{ width: isMobile ? '100%' : 200 }}
              onSearch={(val) => {
                setKeyword(val);
                setPage(1);
              }}
            />
          </Space>
        </div>

        {isMobile ? (
          <Spin spinning={loading}>
            {!items.length ? (
              <Empty description="暂无记录" />
            ) : (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {items.map((record) => (
                  <Card key={record.id} size="small" style={{ borderRadius: 10 }}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <Space size={6} wrap>
                          <Tag color={record.sourceType === 'technician' ? 'purple' : 'blue'}>
                            {SOURCE_MAP[record.sourceType] ?? record.sourceType}
                          </Tag>
                          <Tag color={record.type === '客服咨询' ? 'geekblue' : 'default'}>{record.type}</Tag>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(record.createdAt).toLocaleString()}
                        </Text>
                      </div>
                      <Text strong>{record.title}</Text>
                      <Paragraph style={{ marginBottom: 0 }} type="secondary" ellipsis={{ rows: 3 }}>
                        {record.content}
                      </Paragraph>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        提交人：{record.sourceName || '—'} {record.sourcePhone || ''}
                      </Text>
                      {record.attachmentUrls?.length > 0 && (
                        <Image.PreviewGroup>
                          <Space wrap size={6}>
                            {record.attachmentUrls.map((url, idx) => (
                              <Image
                                key={`${url}-${idx}`}
                                src={resolveAttachmentUrl(url)}
                                width={56}
                                height={56}
                                style={{ objectFit: 'cover', borderRadius: 6 }}
                              />
                            ))}
                          </Space>
                        </Image.PreviewGroup>
                      )}
                      {record.type !== '账号注销申请' && (
                        <Button
                          block
                          type={record.status === 'resolved' ? 'default' : 'primary'}
                          style={{ minHeight: 44 }}
                          onClick={() => openDetail(record)}
                        >
                          {record.status === 'resolved' ? '查看回复' : '回答处理'}
                        </Button>
                      )}
                    </Space>
                  </Card>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Pagination
                    size="small"
                    current={page}
                    pageSize={20}
                    total={total}
                    onChange={(p) => setPage(p)}
                  />
                </div>
              </Space>
            )}
          </Spin>
        ) : (
          <Table
            columns={columns}
            dataSource={items}
            scroll={{ x: 960 }}
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
        )}
      </Card>

      <Modal
        title="问询与反馈详情处理"
        open={!!detail}
        onCancel={() => !saving && setDetail(null)}
        onOk={saveReply}
        okText="保存并回传给用户"
        cancelText="取消"
        confirmLoading={saving}
        width={isMobile ? '94vw' : 720}
      >
        {detail && (
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={isMobile ? 1 : 2}>
              <Descriptions.Item label="提交人">{detail.sourceName || '—'} {detail.sourcePhone || ''}</Descriptions.Item>
              <Descriptions.Item label="来源身份">{SOURCE_MAP[detail.sourceType] ?? detail.sourceType}</Descriptions.Item>
              <Descriptions.Item label="业务分类">{detail.type}</Descriptions.Item>
              <Descriptions.Item label="提交时间">{new Date(detail.createdAt).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="标题" span={isMobile ? 1 : 2}>{detail.title}</Descriptions.Item>
              <Descriptions.Item label="详细内容" span={isMobile ? 1 : 2}>
                <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{detail.content}</Paragraph>
              </Descriptions.Item>
              {detail.attachmentUrls?.length > 0 && (
                <Descriptions.Item label={`问题截图 (${detail.attachmentUrls.length}张)`} span={isMobile ? 1 : 2}>
                  <Image.PreviewGroup>
                    <Space wrap size={8}>
                      {detail.attachmentUrls.map((url, idx) => (
                        <Image
                          key={`${url}-${idx}`}
                          src={resolveAttachmentUrl(url)}
                          width={88}
                          height={88}
                          style={{ objectFit: 'cover', borderRadius: 8 }}
                        />
                      ))}
                    </Space>
                  </Image.PreviewGroup>
                </Descriptions.Item>
              )}
            </Descriptions>
            <div>
              <Text strong>处理状态</Text>
              <Select
                value={replyStatus}
                onChange={setReplyStatus}
                style={{ width: '100%', marginTop: 8 }}
                options={[
                  { value: 'pending', label: '待处理' },
                  { value: 'processing', label: '处理中' },
                  { value: 'resolved', label: '已回复' },
                ]}
              />
            </div>
            <div>
              <Text strong>回复用户</Text>
              <Input.TextArea
                value={replyContent}
                onChange={(event) => setReplyContent(event.target.value)}
                maxLength={1000}
                showCount
                rows={5}
                placeholder="填写处理结果或需要用户补充的信息，保存后会同步展示在美甲师/客户小程序的反馈记录中"
                style={{ marginTop: 8 }}
              />
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default Feedback;
