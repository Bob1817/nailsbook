import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Descriptions, Form, Input, Row, Select, Space, Tag, Typography, message } from 'antd';
import { technicianService, type Technician } from '../services/technician';
import { wechatConfigService, type LaunchConfig as LaunchConfigData, type UpdateLaunchConfig } from '../services/wechatConfig';

const { Title, Paragraph, Text } = Typography;

const CHECK_LABELS: Record<string, string> = {
  operatorName: '运营主体', storeName: '门店主体', storeAddress: '门店地址',
  storePhone: '门店电话', privacyContact: '隐私联系方式', filingNumber: '备案编号',
  launchTechnician: '唯一美甲师仅到店', bookingReminderTemplateId: '预约提醒模板',
  wechatLogin: '微信登录已校验', paymentDisabled: '微信支付已关闭',
};

function apiErrorMessage(error: unknown) {
  const value = error as { response?: { data?: { message?: string } }; errorFields?: unknown };
  return value.response?.data?.message;
}

export default function LaunchConfig() {
  const [form] = Form.useForm<UpdateLaunchConfig>();
  const [config, setConfig] = useState<LaunchConfigData | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [next, technicianResult] = await Promise.all([
        wechatConfigService.getLaunch(),
        technicianService.getAll({ page: 1, limit: 100, status: 'active' }),
      ]);
      setConfig(next);
      setTechnicians(technicianResult.data);
      form.setFieldsValue({
        operatorName: next.operatorName, storeName: next.storeName, storeAddress: next.storeAddress,
        storePhone: next.storePhone, privacyContact: next.privacyContact, filingNumber: next.filingNumber,
        launchTechnicianId: next.launchTechnicianId || undefined,
        bookingReminderTemplateId: next.bookingReminderTemplateId,
      });
    } catch {
      message.error('首期上线配置加载失败');
    } finally { setLoading(false); }
  }, [form]);

  useEffect(() => { void load(); }, [load]);

  const options = useMemo(() => technicians.map((item) => ({
    value: item.id,
    label: `${item.name} / ${item.phone} (#${item.id})`,
  })), [technicians]);

  const save = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const next = await wechatConfigService.updateLaunch(values);
      setConfig(next);
      message.success('首期上线配置已保存');
    } catch (error: unknown) {
      const validationError = error as { errorFields?: unknown };
      if (!validationError.errorFields) message.error(apiErrorMessage(error) || '保存失败');
    } finally { setSaving(false); }
  };

  return <div>
    <Title level={4}>首期上线配置</Title>
    <Alert showIcon type={config?.launchModeLocked ? 'info' : 'error'}
      message={config?.launchModeLocked ? '服务器已锁定首期合规模式' : '服务器未启用首期合规模式，禁止保存'}
      description="此页不能开启支付、上门服务或多商户。AppSecret 仍在“微信能力配置”中加密管理。"
      style={{ marginBottom: 16 }} />
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={16}>
        <Card loading={loading} title="主体、门店与提醒配置">
          <Form form={form} layout="vertical" requiredMark="optional">
            <Row gutter={16}>
              <Col xs={24} md={12}><Form.Item name="operatorName" label="小程序运营企业全称" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="storeName" label="美甲店个体工商户全称" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col xs={24}><Form.Item name="storeAddress" label="门店地址" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="storePhone" label="门店联系电话" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="privacyContact" label="隐私事务联系方式" rules={[{ required: true }]}><Input placeholder="手机号或邮箱" /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="filingNumber" label="小程序备案编号" extra="开发版可留空，提审前必须填写"><Input /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="launchTechnicianId" label="首期唯一美甲师" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={options} /></Form.Item></Col>
              <Col xs={24}><Form.Item name="bookingReminderTemplateId" label="预约提醒订阅消息模板 ID" extra="未申请模板时可留空，预约主流程仍可真机测试"><Input /></Form.Item></Col>
            </Row>
            <Button type="primary" size="large" loading={saving} disabled={!config?.launchModeLocked} onClick={save}>保存配置</Button>
          </Form>
        </Card>
      </Col>
      <Col xs={24} xl={8}>
        <Card loading={loading} title={<Space>提审就绪检查 {config?.readyForReview ? <Tag color="success">已就绪</Tag> : <Tag color="warning">待完善</Tag>}</Space>}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            {Object.entries(config?.required || {}).map(([key, passed]) => <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><Text>{CHECK_LABELS[key] || key}</Text><Tag color={passed ? 'success' : 'default'}>{passed ? '通过' : '待配置'}</Tag></div>)}
          </Space>
          <Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>微信服务类目、隐私保护指引、合法域名和模板申请仍需在微信公众平台完成。</Paragraph>
        </Card>
        {config?.technician && <Card title="当前唯一美甲师" style={{ marginTop: 16 }}><Descriptions column={1} size="small" items={[
          { key: 'name', label: '姓名', children: config.technician.name },
          { key: 'phone', label: '手机号', children: config.technician.phone },
          { key: 'service', label: '服务模式', children: config.technician.shopService && !config.technician.homeService ? '仅到店' : '需调整' },
        ]} /></Card>}
      </Col>
    </Row>
  </div>;
}
