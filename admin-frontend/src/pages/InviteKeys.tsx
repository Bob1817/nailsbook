import { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  message,
  Typography,
  Popconfirm,
  Tooltip,
} from 'antd';
import { CopyOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { inviteKeyService } from '../services/inviteKey';
import type { TechnicianInviteKey } from '../services/inviteKey';

const { Title, Text } = Typography;

export default function InviteKeys() {
  const [items, setItems] = useState<TechnicianInviteKey[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [usedFilter, setUsedFilter] = useState<'all' | 'true' | 'false'>('all');
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [createdResult, setCreatedResult] = useState<TechnicianInviteKey[] | null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await inviteKeyService.list({
        used: usedFilter === 'all' ? undefined : usedFilter,
        page,
        pageSize,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, usedFilter]);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const created = await inviteKeyService.create({
        note: values.note?.trim() || undefined,
        count: values.count || 1,
      });
      message.success(`已生成 ${created.length} 个邀请密钥`);
      setCreatedResult(created);
      createForm.resetFields();
      setCreateOpen(false);
      fetchList();
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) {
        return; // form validation error
      }
      message.error('生成失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await inviteKeyService.remove(id);
      message.success('已删除');
      fetchList();
    } catch (e) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? // @ts-expect-error narrow axios error
            e.response?.data?.message
          : null;
      message.error(msg || '删除失败');
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    message.success('已复制');
  };

  const columns = [
    {
      title: '邀请密钥',
      dataIndex: 'key',
      key: 'key',
      render: (key: string) => (
        <Space>
          <Text code copyable={false} style={{ fontSize: 13, letterSpacing: 1 }}>
            {key}
          </Text>
          <Tooltip title="复制">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(key)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: unknown, record: TechnicianInviteKey) =>
        record.usedByTechnicianId ? (
          <Tag color="default">已使用</Tag>
        ) : (
          <Tag color="green">未使用</Tag>
        ),
    },
    {
      title: '使用者',
      key: 'technician',
      render: (_: unknown, record: TechnicianInviteKey) =>
        record.technician ? (
          <Space direction="vertical" size={0}>
            <Text>{record.technician.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.technician.phone}
            </Text>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      render: (note: string | null) => note || <Text type="secondary">—</Text>,
    },
    {
      title: '生成时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '使用时间',
      dataIndex: 'usedAt',
      key: 'usedAt',
      width: 170,
      render: (t: string | null) =>
        t ? dayjs(t).format('YYYY-MM-DD HH:mm') : <Text type="secondary">—</Text>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: TechnicianInviteKey) =>
        record.usedByTechnicianId ? (
          <Text type="secondary">—</Text>
        ) : (
          <Popconfirm
            title="确认删除该密钥？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger size="small">
              删除
            </Button>
          </Popconfirm>
        ),
    },
  ];

  return (
    <div>
      <Card>
        <Space
          style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}
        >
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              美甲师邀请密钥
            </Title>
            <Text type="secondary">
              生成密钥发送给已付款的美甲师，用于注册账号（一次性）
            </Text>
          </Space>
          <Space>
            <Select
              value={usedFilter}
              onChange={(v) => {
                setUsedFilter(v);
                setPage(1);
              }}
              style={{ width: 120 }}
              options={[
                { label: '全部', value: 'all' },
                { label: '未使用', value: 'false' },
                { label: '已使用', value: 'true' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchList}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
            >
              生成密钥
            </Button>
          </Space>
        </Space>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, s) => {
              setPage(p);
              setPageSize(s);
            },
          }}
        />
      </Card>

      {/* 生成密钥 Modal */}
      <Modal
        title="生成邀请密钥"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        okText="生成"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical" initialValues={{ count: 1 }}>
          <Form.Item
            name="count"
            label="生成数量"
            rules={[{ required: true, message: '请输入数量' }]}
          >
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="备注（选填）">
            <Input.TextArea
              rows={3}
              placeholder="例：张三 - 1月份订阅"
              maxLength={100}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 显示新生成的密钥 */}
      <Modal
        title={`已生成 ${createdResult?.length || 0} 个密钥`}
        open={!!createdResult}
        onCancel={() => setCreatedResult(null)}
        footer={[
          <Button
            key="copy-all"
            onClick={() => {
              const text = (createdResult || [])
                .map((k) => k.key)
                .join('\n');
              navigator.clipboard.writeText(text);
              message.success('已复制全部');
            }}
          >
            复制全部
          </Button>,
          <Button
            key="close"
            type="primary"
            onClick={() => setCreatedResult(null)}
          >
            完成
          </Button>,
        ]}
      >
        <Text type="warning" style={{ display: 'block', marginBottom: 12 }}>
          请妥善保管，密钥仅用于美甲师注册一次
        </Text>
        <Space direction="vertical" style={{ width: '100%' }}>
          {(createdResult || []).map((k) => (
            <Space key={k.id}>
              <Text code style={{ fontSize: 14, letterSpacing: 1 }}>
                {k.key}
              </Text>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(k.key)}
              />
            </Space>
          ))}
        </Space>
      </Modal>
    </div>
  );
}
