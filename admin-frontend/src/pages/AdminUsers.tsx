import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Form, Grid, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import { Link } from 'react-router-dom';
import { adminUserService, type AdminUser, type AdminUserInput } from '../services/adminUser';
import { adminRoleService, type AdminRole } from '../services/adminRole';

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form] = Form.useForm<AdminUserInput>();
  const screens = Grid.useBreakpoint();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accounts, allRoles] = await Promise.all([adminUserService.getAll(), adminRoleService.getAll()]);
      setUsers(accounts);
      setRoles(allRoles.filter(role => role.code !== 'super_admin'));
    } catch { message.error('获取账号列表失败，请重试'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const edit = (user: AdminUser | null) => {
    setEditing(user);
    form.resetFields();
    if (user) form.setFieldsValue({ realName: user.realName, roleId: user.roleId, status: user.status });
    setOpen(true);
  };
  const save = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSaving(true);
    try {
      const data = { ...values };
      if (!data.password) delete data.password;
      if (editing?.role.code === 'super_admin') { delete data.roleId; delete data.status; }
      if (editing) await adminUserService.update(editing.id, data);
      else await adminUserService.create(data);
      message.success('账号已保存');
      setOpen(false);
      await load();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const detail = err.response?.data?.message;
      message.error(Array.isArray(detail) ? detail.join('；') : detail || '保存失败，请重试');
    } finally { setSaving(false); }
  };
  return <div>
    <Space wrap style={{ marginBottom: 16 }}>
      <h2 style={{ margin: 0 }}>账号管理</h2>
      <Button type="primary" onClick={() => edit(null)}>新增子管理员</Button>
      <Link to="/roles" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>配置角色权限</Link>
      <Button onClick={load} loading={loading}>刷新</Button>
    </Space>
    <p>为子管理员分配角色，功能权限由角色统一控制。停用账号或重置密码后，原登录立即失效。</p>
    {screens.md ? <Table rowKey="id" loading={loading} dataSource={users} columns={[
      { title: '账号', dataIndex: 'username' },
      { title: '姓名', dataIndex: 'realName' },
      { title: '角色', render: (_, user) => user.role.name },
      { title: '状态', render: (_, user) => user.status === 'active' ? '启用' : '停用' },
      { title: '操作', render: (_, user) => <Button onClick={() => edit(user)}>编辑</Button> },
    ]} /> : <Space orientation="vertical" style={{ width: '100%' }}>
      {users.map(user => <Card key={user.id} title={user.username} extra={<Button onClick={() => edit(user)}>编辑</Button>}>
        <Space wrap><span>{user.realName}</span><Tag>{user.role.name}</Tag><span>{user.status === 'active' ? '启用' : '停用'}</span></Space>
      </Card>)}
      {!loading && users.length === 0 && <p>暂无账号</p>}
    </Space>}
    <Modal title={editing ? `编辑账号 · ${editing.username}` : '新增子管理员'} open={open}
      onCancel={() => setOpen(false)} onOk={save} confirmLoading={saving} okText="保存" cancelText="取消">
      <Form form={form} layout="vertical">
        {!editing && <Form.Item name="username" label="账号" rules={[{ required: true }, { pattern: /^[a-zA-Z0-9_]{3,32}$/, message: '使用 3–32 位字母、数字或下划线' }]}><Input autoComplete="off" /></Form.Item>}
        <Form.Item name="realName" label="姓名" rules={[{ required: true }, { max: 50 }]}><Input /></Form.Item>
        <Form.Item name="password" label={editing ? '重置密码（留空保持原密码）' : '密码'} rules={[{ required: !editing }, { min: 8, max: 72, message: '密码长度为 8–72 位' }]}><Input.Password autoComplete="new-password" /></Form.Item>
        {editing?.role.code !== 'super_admin' && <>
          <Form.Item name="roleId" label="角色" rules={[{ required: true, message: '请选择角色' }]} extra={roles.length === 0 ? '请先在角色管理中创建角色并配置权限' : '同一角色的账号共享功能权限'}>
            <Select options={roles.map(role => ({ value: role.id, label: role.name }))} />
          </Form.Item>
          {editing && <Form.Item name="status" label="状态"><Select options={[{ value: 'active', label: '启用' }, { value: 'inactive', label: '停用' }]} /></Form.Item>}
        </>}
      </Form>
    </Modal>
  </div>;
}
