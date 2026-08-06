import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Tag, message, Card, Tabs } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { subscriptionService } from '../services/subscription';
import type { SubscriptionMetrics, SubscriptionPlan, SubscriptionPlanInput, TechnicianSubscription } from '../services/subscription';
import { technicianService } from '../services/technician';
import type { Technician } from '../services/technician';

const Subscriptions: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [technicianSubscriptions, setTechnicianSubscriptions] = useState<TechnicianSubscription[]>([]);
  const [, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<SubscriptionMetrics>({ upgradeTriggers: [], subscriptionChanges: [] });
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchPlans = async () => {
    try {
      const result = await subscriptionService.getPlans();
      setPlans(result);
    } catch {
      message.error('获取套餐数据失败');
    }
  };

  const fetchTechnicianSubscriptions = async () => {
    setLoading(true);
    try {
      const result = await subscriptionService.getTechnicianSubscriptions();
      setTechnicianSubscriptions(result);
    } catch {
      message.error('获取订阅数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const result = await technicianService.getAll({ limit: 1000 });
      setTechnicians(result.data);
    } catch {
      console.error('Failed to fetch technicians');
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchTechnicianSubscriptions();
    fetchTechnicians();
    subscriptionService.getMetrics().then(setMetrics).catch(() => message.error('获取订阅指标失败'));
  }, []);

  const handleCreatePlan = async (values: SubscriptionPlanInput & { featuresText?: string }) => {
    try {
      const { featuresText, ...plan } = values;
      await subscriptionService.createPlan({
        ...plan,
        features: featuresText
          ? featuresText.split(',').map((item) => item.trim()).filter(Boolean)
          : [],
      });
      message.success('创建成功');
      setModalVisible(false);
      form.resetFields();
      fetchPlans();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '创建失败');
    }
  };

  const planColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '套餐名称', dataIndex: 'name', key: 'name' },
    { title: '套餐代码', dataIndex: 'code', key: 'code' },
    { 
      title: '价格', 
      dataIndex: 'price', 
      key: 'price',
      render: (price: number) => `¥${price.toFixed(2)}`,
    },
    { title: '计费周期', dataIndex: 'billingCycle', key: 'billingCycle' },
    {
      title: '核心额度',
      key: 'limits',
      render: (_: unknown, plan: SubscriptionPlan) => (
        <div>
          <div>客户 {plan.maxCustomers ?? '不限'} · 预约 {plan.maxMonthlyBookings ?? '不限'}/月</div>
          <div>作品 {plan.maxWorks ?? '不限'} · 宣传 {plan.maxMarketingExports ?? '不限'}/月</div>
          <div>短信 {plan.maxMonthlySms ?? '不限'}/月 · 员工 {plan.maxEmployees ?? '不限'}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={status === 'active' ? 'green' : 'red'}>{status === 'active' ? '启用' : '禁用'}</Tag>,
    },
  ];

  const subscriptionColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '美甲师', dataIndex: ['technician', 'name'], key: 'technician' },
    { title: '套餐', dataIndex: ['plan', 'name'], key: 'plan' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = { active: 'green', expired: 'red', cancelled: 'gray' };
        const textMap: Record<string, string> = { active: '生效中', expired: '已过期', cancelled: '已取消' };
        return <Tag color={colorMap[status]}>{textMap[status] || status}</Tag>;
      },
    },
    {
      title: '开始时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '到期时间',
      dataIndex: 'expiredAt',
      key: 'expiredAt',
      render: (text: string) => text ? new Date(text).toLocaleString('zh-CN') : '永久',
    },
  ];

  const tabItems = [
    {
      key: 'plans',
      label: '套餐管理',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
              新增套餐
            </Button>
          </div>
          <Table columns={planColumns} dataSource={plans} rowKey="id" pagination={false} />
        </div>
      ),
    },
    {
      key: 'subscriptions',
      label: '美甲师订阅',
      children: (
        <Table
          columns={subscriptionColumns}
          dataSource={technicianSubscriptions}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      ),
    },
    {
      key: 'metrics',
      label: '升级触发与变更',
      children: (
        <div>
          <Table
            rowKey={(row) => `${row.source}-${row.planCode || 'unknown'}`}
            pagination={false}
            dataSource={metrics.upgradeTriggers}
            columns={[
              { title: '触发场景', dataIndex: 'source', key: 'source' },
              { title: '当前套餐', dataIndex: 'planCode', key: 'planCode', render: (value?: string) => value || '未知' },
              { title: '触发次数', dataIndex: 'count', key: 'count' },
            ]}
          />
          <Table
            style={{ marginTop: 24 }}
            rowKey="reason"
            pagination={false}
            dataSource={metrics.subscriptionChanges}
            columns={[
              { title: '套餐变更原因', dataIndex: 'reason', key: 'reason' },
              { title: '发生次数', dataIndex: 'count', key: 'count' },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Tabs items={tabItems} />
      </Card>

      <Modal
        title="新增套餐"
        open={modalVisible}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreatePlan}>
          <Form.Item name="name" label="套餐名称" rules={[{ required: true, message: '请输入套餐名称' }]}>
            <Input placeholder="请输入套餐名称" />
          </Form.Item>
          <Form.Item name="code" label="套餐代码" rules={[{ required: true, message: '请输入套餐代码' }]}>
            <Input placeholder="请输入套餐代码" />
          </Form.Item>
          <Form.Item name="price" label="价格" rules={[{ required: true, message: '请输入价格' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="billingCycle" label="计费周期" rules={[{ required: true, message: '请选择计费周期' }]}>
            <Select options={[
              { value: 'free', label: '免费' },
              { value: 'monthly', label: '月付' },
              { value: 'yearly', label: '年付' },
            ]} />
          </Form.Item>
          <Form.Item name="maxCustomers" label="最大客户数">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示无限制" />
          </Form.Item>
          <Form.Item name="maxMonthlyBookings" label="最大月预约数">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示无限制" />
          </Form.Item>
          <Form.Item name="maxWorks" label="最大作品数">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示无限制" />
          </Form.Item>
          <Form.Item name="maxStorageBytes" label="最大存储字节数">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="例如 5368709120（5GB）" />
          </Form.Item>
          <Form.Item name="maxMarketingExports" label="每月宣传导出次数">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示无限制" />
          </Form.Item>
          <Form.Item name="maxMonthlySms" label="每月短信额度">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示无限制" />
          </Form.Item>
          <Form.Item name="maxEmployees" label="员工账号数">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="仅本人填写 1" />
          </Form.Item>
          <Form.Item name="maxBookingPages" label="预约页面数">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="留空表示无限制" />
          </Form.Item>
          <Form.Item name="targetStage" label="适用经营阶段">
            <Input placeholder="例如：稳定经营的个人美甲师" />
          </Form.Item>
          <Form.Item name="description" label="套餐说明">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="featuresText" label="功能代码">
            <Input.TextArea rows={2} placeholder="使用英文逗号分隔" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Subscriptions;
