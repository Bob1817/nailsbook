import React, { useCallback, useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Tabs, Badge, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { adminReportService, REASON_MAP } from '../services/adminReport';
import type { AdminReport } from '../services/adminReport';

const { Text } = Typography;

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'pending' | 'dismissed'>('pending');
  const [items, setItems] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminReportService.getAll({ page, pageSize: 20, status });
      setItems(result.items);
      setTotal(result.total);
      setPendingCount(result.pendingCount);
    } catch {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const handleResolve = async (id: number) => {
    try {
      await adminReportService.resolve(id);
      message.success('已删除评论');
      load();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDismiss = async (id: number) => {
    try {
      await adminReportService.dismiss(id);
      message.success('已驳回举报');
      load();
    } catch {
      message.error('操作失败');
    }
  };

  const columns: ColumnsType<AdminReport> = [
    {
      title: '被举报评论',
      key: 'content',
      render: (_, record) => {
        if (!record.comment) return <Text type="secondary">评论已删除</Text>;
        const content = record.comment.content;
        const text = content.length > 60 ? `${content.slice(0, 60)}…` : content;
        return <Text>{text}</Text>;
      },
    },
    {
      title: '所属作品',
      key: 'work',
      render: (_, record) => record.comment?.work?.title ?? '—',
    },
    {
      title: '举报原因',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string) => <Tag color="default">{REASON_MAP[reason] ?? reason}</Tag>,
    },
    {
      title: '举报时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        if (record.status !== 'pending') return null;
        return (
          <Space>
            <Button danger size="small" onClick={() => handleResolve(record.id)}>
              删除评论
            </Button>
            <Button size="small" onClick={() => handleDismiss(record.id)}>
              驳回
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={status}
        onChange={(key) => {
          setStatus(key as 'pending' | 'dismissed');
          setPage(1);
        }}
        items={[
          {
            key: 'pending',
            label: (
              <Badge count={pendingCount} offset={[8, 0]}>
                待处理
              </Badge>
            ),
          },
          {
            key: 'dismissed',
            label: '已驳回',
          },
        ]}
      />
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

export default Reports;
