import React, { useCallback, useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Tag, message, Popconfirm, Card, Typography } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, KeyOutlined, CopyOutlined } from '@ant-design/icons';
import { technicianService } from '../services/technician';
import type { Technician, PaginatedResponse } from '../services/technician';

const { Text } = Typography;

const Technicians: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResponse<Technician> | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [filters, setFilters] = useState({ page: 1, limit: 10, status: '', search: '' });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyGenerating, setKeyGenerating] = useState(false);
  const [resetPwd, setResetPwd] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await technicianService.getAll({
        page: filters.page,
        limit: filters.limit,
        status: filters.status || undefined,
        search: filters.search || undefined,
      });
      setData(result);
    } catch {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const openEdit = (technician: Technician) => {
    setSelectedTechnician(technician);
    setGeneratedKey(null);
    setResetPwd(null);
    editForm.setFieldsValue({
      name: technician.name,
      phone: technician.phone,
      city: technician.city || '',
      serviceArea: technician.serviceArea || '',
      status: technician.status,
    });
    setEditVisible(true);
  };

  const handleUpdate = async (values: { name: string; phone: string; city?: string; serviceArea?: string; status?: string }) => {
    if (!selectedTechnician) return;
    try {
      await technicianService.update(selectedTechnician.id, values);
      message.success('保存成功');
      setEditVisible(false);
      setSelectedTechnician(null);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '保存失败');
    }
  };

  const handleGenerateKey = async () => {
    if (!selectedTechnician) return;
    setKeyGenerating(true);
    try {
      const result = await technicianService.generateInviteKey(selectedTechnician.id);
      setGeneratedKey(result.key);
      message.success('密钥生成成功');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '生成失败');
    } finally {
      setKeyGenerating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedTechnician) return;
    setResetting(true);
    try {
      const result = await technicianService.resetPassword(selectedTechnician.id);
      setResetPwd(result.tempPassword);
      message.success('密码已重置');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '重置失败');
    } finally {
      setResetting(false);
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
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
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

      <Modal
        title="编辑美甲师"
        open={editVisible}
        onCancel={() => { setEditVisible(false); setSelectedTechnician(null); setGeneratedKey(null); }}
        onOk={() => editForm.submit()}
        okText="保存"
        cancelText="取消"
        width={560}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
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
          <Form.Item name="status" label="状态">
            <Select
              options={[
                { value: 'active', label: '活跃' },
                { value: 'inactive', label: '未激活' },
                { value: 'suspended', label: '已禁用' },
              ]}
            />
          </Form.Item>
        </Form>

        {selectedTechnician && selectedTechnician.status === 'inactive' && (
          <div style={{ marginTop: 16, padding: 16, background: '#fff7e6', borderRadius: 8 }}>
            <div style={{ marginBottom: 8, color: '#fa8c16', fontSize: 13 }}>
              该账号未激活，可生成专属邀请密钥，美甲师在 App 上使用此密钥+手机号即可激活
            </div>
            {generatedKey ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Text code style={{ fontSize: 14, letterSpacing: 1 }}>{generatedKey}</Text>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(generatedKey);
                      message.success('已复制');
                    }}
                  >
                    复制
                  </Button>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  请把这个密钥和手机号 ({selectedTechnician.phone}) 一并发送给美甲师
                </Text>
              </Space>
            ) : (
              <Button
                icon={<KeyOutlined />}
                loading={keyGenerating}
                onClick={handleGenerateKey}
              >
                生成专属激活密钥
              </Button>
            )}
          </div>
        )}

        {selectedTechnician && selectedTechnician.status !== 'inactive' && (
          <div style={{ marginTop: 16, padding: 16, background: '#fff1f0', borderRadius: 8 }}>
            <div style={{ marginBottom: 8, color: '#cf1322', fontSize: 13 }}>
              美甲师忘记密码时，可在此重置。系统将生成一个一次性临时密码，请转交给美甲师并提醒其登录后尽快修改。
            </div>
            {resetPwd ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Text code style={{ fontSize: 16, letterSpacing: 1 }}>{resetPwd}</Text>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(resetPwd);
                      message.success('已复制');
                    }}
                  >
                    复制
                  </Button>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  临时密码仅显示这一次，请把它和手机号 ({selectedTechnician.phone}) 一并发送给美甲师
                </Text>
              </Space>
            ) : (
              <Popconfirm
                title="确认重置该美甲师的登录密码？"
                description="重置后原密码立即失效，将生成一次性临时密码。"
                okText="确认重置"
                cancelText="取消"
                onConfirm={handleResetPassword}
              >
                <Button danger icon={<KeyOutlined />} loading={resetting}>
                  重置登录密码
                </Button>
              </Popconfirm>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Technicians;
