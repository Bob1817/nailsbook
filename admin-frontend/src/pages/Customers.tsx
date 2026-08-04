import React, { useCallback, useEffect, useState } from 'react';
import { Table, Button, Space, Input, Select, Tag, message, Card, Modal, Descriptions, Typography } from 'antd';
import { KeyOutlined, SearchOutlined } from '@ant-design/icons';
import { customerService } from '../services/customer';
import type { Customer } from '../services/customer';
import type { PaginatedResponse } from '../services/technician';
import { technicianService } from '../services/technician';
import type { Technician } from '../services/technician';
import { useAuth } from '../contexts/AuthContext';

const { Text } = Typography;

const Customers: React.FC = () => {
  const { hasPermission } = useAuth();
  const canResetPassword = hasPermission('account:reset-password');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResponse<Customer> | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [filters, setFilters] = useState({ page: 1, limit: 10, technicianId: undefined as number | undefined, search: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await customerService.getAll({
        page: filters.page,
        limit: filters.limit,
        technicianId: filters.technicianId,
        search: filters.search || undefined,
      });
      setData(result);
    } catch {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchTechnicians = async () => {
    try {
      const result = await technicianService.getAll({ limit: 1000 });
      setTechnicians(result.data);
    } catch {
      console.error('Failed to fetch technicians');
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResetPassword = (customer: Customer) => {
    Modal.confirm({
      title: `确认重置 ${customer.name} 的登录密码？`,
      content: '重置后原密码和当前登录状态立即失效，系统将生成一个随机临时密码。',
      okText: '确认重置',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        try {
          const result = await customerService.resetPassword(customer.id);
          Modal.success({
            title: '密码重置成功',
            content: (
              <div>
                <p>
                  临时密码：
                  <Text code copyable={{ text: result.tempPassword }} style={{ fontSize: 16, letterSpacing: 1 }}>
                    {result.tempPassword}
                  </Text>
                </p>
                <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
                  临时密码仅在本次显示，请复制后安全发送给客户。
                </p>
              </div>
            ),
          });
          fetchData();
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } };
          message.error(err.response?.data?.message || '重置失败');
          throw error;
        }
      },
    });
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '手机号', dataIndex: 'phone', key: 'phone' },
    { title: '性别', dataIndex: 'gender', key: 'gender' },
    { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string) => tags ? tags.split(',').map((tag, i) => <Tag key={i}>{tag}</Tag>) : '-',
    },
    { title: '所属美甲师', dataIndex: ['technician', 'name'], key: 'technician' },
    {
      title: '账号密码',
      dataIndex: 'account',
      key: 'account',
      render: (account: Customer['account']) => {
        if (!account?.linked) return <Tag>未关联账号</Tag>;
        return account.passwordConfigured
          ? <Tag color="green">已设置（不可查看）</Tag>
          : <Tag color="orange">未设置</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Customer) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setSelectedCustomer(record); setDetailVisible(true); }}>
            详情
          </Button>
          {canResetPassword && record.account?.linked && record.account.status === 'active' && (
            <Button type="link" icon={<KeyOutlined />} style={{ minHeight: 44 }} onClick={() => handleResetPassword(record)}>
              重置密码
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space>
            <Input
              placeholder="搜索姓名/手机号"
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, page: 1, search: e.target.value })}
              style={{ width: 200 }}
            />
            <Select
              placeholder="选择美甲师"
              allowClear
              value={filters.technicianId}
              onChange={(value) => setFilters({ ...filters, page: 1, technicianId: value })}
              style={{ width: 150 }}
              options={technicians.map(t => ({ value: t.id, label: t.name }))}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={loading}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: data?.meta.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => setFilters({ ...filters, page, limit: pageSize }),
          }}
        />
      </Card>

      <Modal
        title="客户详情"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setSelectedCustomer(null); }}
        footer={null}
        width={700}
      >
        {selectedCustomer && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="ID">{selectedCustomer.id}</Descriptions.Item>
            <Descriptions.Item label="姓名">{selectedCustomer.name}</Descriptions.Item>
            <Descriptions.Item label="手机号">{selectedCustomer.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="性别">{selectedCustomer.gender || '-'}</Descriptions.Item>
            <Descriptions.Item label="生日">{selectedCustomer.birthday ? new Date(selectedCustomer.birthday).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
            <Descriptions.Item label="地址">{selectedCustomer.address || '-'}</Descriptions.Item>
            <Descriptions.Item label="标签">{selectedCustomer.tags || '-'}</Descriptions.Item>
            <Descriptions.Item label="备注">{selectedCustomer.notes || '-'}</Descriptions.Item>
            <Descriptions.Item label="所属美甲师">{selectedCustomer.technician?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="账号密码">
              {!selectedCustomer.account?.linked
                ? '未关联登录账号'
                : selectedCustomer.account.passwordConfigured
                  ? '已设置（原密码不可查看）'
                  : '未设置'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(selectedCustomer.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
          </Descriptions>
        )}
        {canResetPassword && selectedCustomer?.account?.linked && selectedCustomer.account.status === 'active' && (
          <Button
            danger
            icon={<KeyOutlined />}
            style={{ marginTop: 16, minHeight: 44 }}
            onClick={() => handleResetPassword(selectedCustomer)}
          >
            重置并生成可复制的临时密码
          </Button>
        )}
      </Modal>
    </div>
  );
};

export default Customers;
