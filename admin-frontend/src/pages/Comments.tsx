import React, { useCallback, useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Input, Select, Tag, message, Card, Typography } from 'antd';
import { DeleteOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminCommentService } from '../services/adminComment';
import type { AdminComment } from '../services/adminComment';

const { Text } = Typography;

const Comments: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AdminComment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'normal' | 'hidden' | undefined>(undefined);
  const [authorType, setAuthorType] = useState<'client' | 'technician' | undefined>(undefined);

  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminCommentService.getAll({
        page,
        pageSize,
        keyword: keyword || undefined,
        status,
        authorType,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch {
      message.error('获取评论失败');
    } finally {
      setLoading(false);
    }
  }, [page, keyword, status, authorType]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleHide = async (id: number) => {
    try {
      await adminCommentService.toggleHide(id);
      load();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除评论',
      content: '超管强制删除，此操作不可恢复',
      okButtonProps: { danger: true },
      onOk: async () => {
        await adminCommentService.remove(id);
        message.success('已删除');
        load();
      },
    });
  };

  const columns: ColumnsType<AdminComment> = [
    {
      title: '评论内容',
      dataIndex: 'content',
      key: 'content',
      render: (content: string, record) => {
        const text = content.length > 60 ? `${content.slice(0, 60)}…` : content;
        return <Text style={record.isHidden ? { color: 'var(--nb-muted)' } : undefined}>{text}</Text>;
      },
    },
    {
      title: '作者',
      key: 'author',
      render: (_, record) => (
        <Space size={4}>
          <Tag color={record.authorType === 'technician' ? 'default' : 'default'}>
            {record.authorType === 'technician' ? '美甲师' : '客户'}
          </Tag>
          {record.authorName}
        </Space>
      ),
    },
    {
      title: '所属作品',
      key: 'work',
      render: (_, record) =>
        record.work ? (
          <div>
            <div style={{ fontSize: 12 }}>{record.work.title ?? '无标题'}</div>
            <div style={{ fontSize: 11, color: 'var(--nb-muted)' }}>{record.work.technicianName}</div>
          </div>
        ) : (
          '—'
        ),
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) =>
        record.isHidden ? <Tag color="default">已隐藏</Tag> : <Tag color="default">正常</Tag>,
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={record.isHidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            onClick={() => handleToggleHide(record.id)}
          >
            {record.isHidden ? '恢复' : '隐藏'}
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Input.Search
              placeholder="搜索评论内容"
              allowClear
              style={{ width: 220 }}
              onSearch={(value) => {
                setKeyword(value);
                setPage(1);
              }}
            />
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 120 }}
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={[
                { value: 'normal', label: '正常' },
                { value: 'hidden', label: '已隐藏' },
              ]}
            />
            <Select
              placeholder="作者类型"
              allowClear
              style={{ width: 120 }}
              value={authorType}
              onChange={(value) => {
                setAuthorType(value);
                setPage(1);
              }}
              options={[
                { value: 'client', label: '客户' },
                { value: 'technician', label: '美甲师' },
              ]}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p) => setPage(p),
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Card>
    </div>
  );
};

export default Comments;
