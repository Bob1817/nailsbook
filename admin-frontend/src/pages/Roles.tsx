import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, Tag, message, Popconfirm, Card, Tree,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { adminRoleService } from '../services/adminRole';
import type { AdminRole } from '../services/adminRole';
import { adminPermissionService } from '../services/adminPermission';
import type { GroupedPermissions } from '../services/adminPermission';

const Roles: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [groupedPerms, setGroupedPerms] = useState<GroupedPermissions>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<number[]>([]);
  const [form] = Form.useForm();

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminRoleService.getAll();
      setRoles(data);
    } catch {
      message.error('获取角色列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPermissions = useCallback(async () => {
    try {
      const data = await adminPermissionService.getGrouped();
      setGroupedPerms(data);
    } catch {
      message.error('获取权限列表失败');
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  const buildTreeData = (): DataNode[] => {
    return Object.entries(groupedPerms).map(([module, perms]) => ({
      key: `module:${module}`,
      title: module,
      children: perms.map((p) => ({
        key: p.id,
        title: p.name,
      })),
    }));
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setCheckedKeys([]);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = async (role: AdminRole) => {
    setEditingRole(role);
    form.setFieldsValue({
      name: role.name,
      code: role.code,
      description: role.description || '',
    });
    try {
      const detail = await adminRoleService.getById(role.id);
      const ids = (detail.permissions || []).map((rp) => rp.permission.id);
      setCheckedKeys(ids);
    } catch {
      setCheckedKeys([]);
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const permissionIds = checkedKeys.filter((k) => typeof k === 'number') as number[];
      if (editingRole) {
        await adminRoleService.update(editingRole.id, {
          name: values.name,
          description: values.description,
          permissionIds,
        });
        message.success('角色更新成功');
      } else {
        await adminRoleService.create({
          name: values.name,
          code: values.code,
          description: values.description,
          permissionIds,
        });
        message.success('角色创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      setCheckedKeys([]);
      fetchRoles();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      if (err.response?.data?.message) {
        message.error(err.response.data.message);
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminRoleService.remove(id);
      message.success('角色删除成功');
      fetchRoles();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '删除失败');
    }
  };

  const onCheck = (checked: React.Key[] | { checked: React.Key[] }) => {
    const keys = Array.isArray(checked) ? checked : checked.checked;
    setCheckedKeys(keys.filter((k) => typeof k === 'number') as number[]);
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '角色名称', dataIndex: 'name', key: 'name' },
    {
      title: '角色编码',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Tag>{code}</Tag>,
    },
    { title: '描述', dataIndex: 'description', key: 'description', render: (t: string | null) => t || '-' },
    {
      title: '用户数',
      key: 'userCount',
      render: (_: unknown, record: AdminRole) => record._count?.users ?? 0,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: AdminRole) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该角色吗？"
            onConfirm={() => handleDelete(record.id)}
            disabled={record.code === 'super_admin'}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={record.code === 'super_admin'}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>角色管理</span>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新增角色
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingRole ? '编辑角色' : '新增角色'}
        open={modalVisible}
        onCancel={() => { setModalVisible(false); form.resetFields(); setCheckedKeys([]); }}
        onOk={handleSubmit}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="请输入角色名称" />
          </Form.Item>
          <Form.Item
            name="code"
            label="角色编码"
            rules={[{ required: !editingRole, message: '请输入角色编码' }]}
          >
            <Input placeholder="请输入角色编码" disabled={!!editingRole} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="请输入角色描述" />
          </Form.Item>
          <Form.Item label="权限配置">
            {Object.keys(groupedPerms).length > 0 ? (
              <Tree
                checkable
                defaultExpandAll
                checkedKeys={checkedKeys}
                onCheck={onCheck}
                treeData={buildTreeData()}
                style={{ background: '#fafafa', padding: 8, borderRadius: 4, maxHeight: 320, overflow: 'auto' }}
              />
            ) : (
              <span style={{ color: '#999' }}>加载中...</span>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Roles;
