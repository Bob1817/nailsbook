import { useEffect, useState } from 'react';
import { Table, Card, Switch, Tag, Button, Modal, Form, Input, message, Typography } from 'antd';
import { featureFlagService, FeatureFlag } from '../services/featureFlag';

const { Title } = Typography;

export default function FeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; flag: FeatureFlag | null }>({ open: false, flag: null });
  const [form] = Form.useForm();

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const data = await featureFlagService.getAll();
      setFlags(data);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFlags(); }, []);

  const handleToggle = async (record: FeatureFlag) => {
    try {
      await featureFlagService.toggle(record.id);
      message.success(`${record.featureName} 已${record.enabled ? '关闭' : '开启'}`);
      fetchFlags();
    } catch {
      message.error('操作失败');
    }
  };

  const handleEdit = (record: FeatureFlag) => {
    setEditModal({ open: true, flag: record });
    form.setFieldsValue({
      enabledPlans: record.enabledPlans ? JSON.parse(record.enabledPlans).join(', ') : '',
      description: record.description || '',
    });
  };

  const handleSave = async () => {
    if (!editModal.flag) return;
    try {
      const values = await form.validateFields();
      const enabledPlans = values.enabledPlans
        ? JSON.stringify(values.enabledPlans.split(',').map((s: string) => s.trim()).filter(Boolean))
        : null;
      await featureFlagService.update(editModal.flag.id, {
        enabledPlans,
        description: values.description || null,
      });
      message.success('更新成功');
      setEditModal({ open: false, flag: null });
      fetchFlags();
    } catch {
      message.error('更新失败');
    }
  };

  const columns = [
    { title: '功能编码', dataIndex: 'featureCode', key: 'featureCode', width: 200 },
    { title: '功能名称', dataIndex: 'featureName', key: 'featureName', width: 180 },
    {
      title: '状态', key: 'enabled', width: 100, align: 'center' as const,
      render: (_: unknown, record: FeatureFlag) => (
        <Switch checked={record.enabled} onChange={() => handleToggle(record)} size="small" />
      ),
    },
    {
      title: '可用套餐', key: 'enabledPlans', width: 200,
      render: (_: unknown, record: FeatureFlag) => {
        if (!record.enabledPlans) return <Tag>全部</Tag>;
        try {
          const plans: string[] = JSON.parse(record.enabledPlans);
          return plans.map((p) => <Tag key={p}>{p}</Tag>);
        } catch { return '-'; }
      },
    },
    { title: '说明', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '操作', key: 'action', width: 100,
      render: (_: unknown, record: FeatureFlag) => (
        <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>功能开关管理</Title>
      <Card>
        <Table
          columns={columns}
          dataSource={flags}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
        />
      </Card>

      <Modal
        title="编辑功能开关"
        open={editModal.open}
        onOk={handleSave}
        onCancel={() => setEditModal({ open: false, flag: null })}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="可用套餐（逗号分隔，留空表示全部）" name="enabledPlans">
            <Input placeholder="pro, enterprise" />
          </Form.Item>
          <Form.Item label="说明" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
