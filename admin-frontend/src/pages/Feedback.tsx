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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { adminFeedbackService, SOURCE_MAP } from '../services/adminFeedback';
import type { AdminFeedback } from '../services/adminFeedback';

const { Text, Paragraph } = Typography;

const Feedback: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'pending' | 'resolved'>('pending');
  const [sourceType, setSourceType] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

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

  const handleResolve = async (id: number) => {
    try {
      await adminFeedbackService.resolve(id);
      message.success('已标记为处理完成');
      load();
    } catch {
      message.error('操作失败');
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
        if (record.status === 'resolved')
          return <Tag color="green">已处理</Tag>;
        return (
          <Space>
            <Button
              type="primary"
              size="small"
              onClick={() => handleResolve(record.id)}
            >
              标记已处理
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
            setStatus(key as 'pending' | 'resolved');
            setPage(1);
          }}
          items={[
            { key: 'pending', label: '待处理' },
            { key: 'resolved', label: '已处理' },
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
    </div>
  );
};

export default Feedback;
