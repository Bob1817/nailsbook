import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Tag, message, Popconfirm, Card } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { technicianService } from '../services/technician';
import type { Technician, PaginatedResponse } from '../services/technician';

const Technicians: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResponse<Technician> | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({ page: 1, limit: 10, status: '', search: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await technicianService.getAll({
        page: filters.page,
        limit: filters.limit,
        status: filters.status || undefined,
        search: filters.search || undefined,
      });
      setData(result);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleCreate = async (values: { name: string; phone: string; city?: string; serviceArea?: string }) => {
    try {
      await technicianService.create(values);
      message.success('创建成功');
      setModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '创建失败');
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await technicianService.updateStatus(id, status);
      message.success('状态更新成功');
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '状态更新失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    {
      title: '美甲师',
      dataIndex: 'name',
      key: 'name',
      render: (_: string, record: Technician) => (
        <Space>
          {record.avatarUrl ? (
            <img
              src={record.avatarUrl}
              alt={record.name}
              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#fde8ef',
                color: '#ec4899',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
              }}
            >
              {record.name.slice(0, 1)}
            </div>
          )}
          <div>
            <div>{record.name}</div>
            <div style={{ color: '#999', fontSize: 12 }}>{record.phone}</div>
          </div>
        </Space>
      ),
    },
    { title: '手机号', dataIndex: 'phone', key: 'phone' },
    { title: '城市', dataIndex: 'city', key: 'city' },
    { title: '服务区域', dataIndex: 'serviceArea', key: 'serviceArea' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'green',
          inactive: 'orange',
          suspended: 'red',
        };
        const textMap: Record<string, string> = {
          active: '活跃',
          inactive: '未激活',
          suspended: '已禁用',
        };
        return <Tag color={colorMap[status]}>{textMap[status] || status}</Tag>;
      },
    },
    { title: '邀请码', dataIndex: 'invitationCode', key: 'invitationCode' },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Technician) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setSelectedTechnician(record); setDetailVisible(true); }}>
            详情
          </Button>
          {record.status === 'active' && (
            <Popconfirm title="确定要禁用该美甲师吗？" onConfirm={() => handleStatusChange(record.id, 'suspended')}>
              <Button type="link" size="small" danger>禁用</Button>
            </Popconfirm>
          )}
          {record.status === 'suspended' && (
            <Popconfirm title="确定要启用该美甲师吗？" onConfirm={() => handleStatusChange(record.id, 'active')}>
              <Button type="link" size="small">启用</Button>
            </Popconfirm>
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
              placeholder="状态筛选"
              allowClear
              value={filters.status || undefined}
              onChange={(value) => setFilters({ ...filters, page: 1, status: value || '' })}
              style={{ width: 120 }}
              options={[
                { value: 'active', label: '活跃' },
                { value: 'inactive', label: '未激活' },
                { value: 'suspended', label: '已禁用' },
              ]}
            />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
            新增美甲师
          </Button>
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
        title="新增美甲师"
        open={modalVisible}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="city" label="城市">
            <Input placeholder="请输入城市" />
          </Form.Item>
          <Form.Item name="serviceArea" label="服务区域">
            <Input placeholder="请输入服务区域" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="美甲师详情"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setSelectedTechnician(null); }}
        footer={null}
        width={600}
      >
        {selectedTechnician && (
          <div>
            <p><strong>ID:</strong> {selectedTechnician.id}</p>
            <p><strong>姓名:</strong> {selectedTechnician.name}</p>
            <p><strong>手机号:</strong> {selectedTechnician.phone}</p>
            {selectedTechnician.avatarUrl ? (
              <p>
                <strong>头像:</strong><br />
                <img
                  src={selectedTechnician.avatarUrl}
                  alt={selectedTechnician.name}
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginTop: 8 }}
                />
              </p>
            ) : null}
            <p><strong>城市:</strong> {selectedTechnician.city || '-'}</p>
            <p><strong>服务区域:</strong> {selectedTechnician.serviceArea || '-'}</p>
            <p><strong>社交媒体:</strong></p>
            {selectedTechnician.socialMedia && Object.keys(selectedTechnician.socialMedia).length > 0 ? (
              <div style={{ marginBottom: 12 }}>
                {Object.entries(selectedTechnician.socialMedia).map(([key, value]) => (
                  <p key={key} style={{ marginBottom: 4 }}>
                    <strong>{key}:</strong> {value}
                  </p>
                ))}
              </div>
            ) : (
              <p>-</p>
            )}
            <p><strong>状态:</strong> {selectedTechnician.status}</p>
            <p><strong>邀请码:</strong> {selectedTechnician.invitationCode || '-'}</p>
            <p><strong>创建时间:</strong> {new Date(selectedTechnician.createdAt).toLocaleString('zh-CN')}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Technicians;
