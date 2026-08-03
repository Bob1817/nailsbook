import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  wechatConfigService,
  type WechatConfig as WechatConfigData,
} from '../services/wechatConfig';

const { Title, Paragraph, Text } = Typography;

function Status({ validAt, error }: { validAt: string | null; error: string | null }) {
  if (validAt && !error) return <Tag color="success">已校验生效</Tag>;
  return <Tag color="warning">未生效</Tag>;
}

export default function WechatConfig() {
  const [data, setData] = useState<WechatConfigData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginForm] = Form.useForm();
  const [paymentForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const next = await wechatConfigService.get();
      setData(next);
      loginForm.setFieldsValue({
        loginEnabled: next.loginEnabled,
        miniProgramAppId: next.miniProgramAppId,
        miniProgramSecret: '',
      });
      paymentForm.setFieldsValue({
        paymentEnabled: next.paymentEnabled,
        merchantId: next.merchantId,
        merchantSerialNo: next.merchantSerialNo,
        merchantPrivateKey: '',
        apiV3Key: '',
        paymentNotifyUrl: next.paymentNotifyUrl,
      });
    } catch {
      message.error('微信配置加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const saveLogin = async () => {
    try {
      const values = await loginForm.validateFields();
      await wechatConfigService.updateLogin(values);
      message.success('登录配置已保存，请重新校验');
      await load();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || '保存失败');
    }
  };

  const savePayment = async () => {
    try {
      const values = await paymentForm.validateFields();
      await wechatConfigService.updatePayment(values);
      message.success('支付配置已保存，请重新校验');
      await load();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || '保存失败');
    }
  };

  const validate = async (type: 'login' | 'payment') => {
    setLoading(true);
    try {
      if (type === 'login') await wechatConfigService.validateLogin();
      else await wechatConfigService.validatePayment();
      message.success('微信配置校验成功并已生效');
      await load();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '校验失败');
      await load();
    } finally {
      setLoading(false);
    }
  };

  const secretHint = (exists: boolean, label: string) =>
    exists ? `已保存 ${label}，留空表示不修改` : `请输入 ${label}`;

  return (
    <div>
      <Title level={4}>微信能力配置</Title>
      <Alert
        type="info"
        showIcon
        message="只有启用且在线校验成功的能力，才会在微信小程序中显示。敏感配置加密保存且不会回显。"
        style={{ marginBottom: 16 }}
      />
      <Tabs items={[
        {
          key: 'login',
          label: <Space>微信登录 <Status validAt={data?.loginValidatedAt || null} error={data?.loginValidationError || null} /></Space>,
          children: (
            <Card loading={loading}>
              {data?.loginValidationError && <Alert type="warning" message={data.loginValidationError} style={{ marginBottom: 16 }} />}
              <Form form={loginForm} layout="vertical" style={{ maxWidth: 680 }}>
                <Form.Item name="loginEnabled" label="启用微信授权登录" valuePropName="checked"><Switch /></Form.Item>
                <Form.Item name="miniProgramAppId" label="小程序 AppID" rules={[{ required: true, message: '请输入 AppID' }]}><Input /></Form.Item>
                <Form.Item name="miniProgramSecret" label="小程序 AppSecret" extra={secretHint(!!data?.hasMiniProgramSecret, 'AppSecret')}>
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
                <Space>
                  <Button type="primary" onClick={saveLogin}>保存配置</Button>
                  <Button onClick={() => validate('login')} disabled={!data?.hasMiniProgramSecret}>在线校验并生效</Button>
                </Space>
              </Form>
            </Card>
          ),
        },
        {
          key: 'payment',
          label: <Space>微信支付 <Status validAt={data?.paymentValidatedAt || null} error={data?.paymentValidationError || null} /></Space>,
          children: (
            <Card loading={loading}>
              {data?.paymentValidationError && <Alert type="warning" message={data.paymentValidationError} style={{ marginBottom: 16 }} />}
              <Paragraph type="secondary">支付配置使用商户 API 证书请求微信支付平台证书接口完成真实性校验。</Paragraph>
              <Form form={paymentForm} layout="vertical" style={{ maxWidth: 680 }}>
                <Form.Item name="paymentEnabled" label="启用微信支付" valuePropName="checked"><Switch /></Form.Item>
                <Form.Item name="merchantId" label="微信支付商户号" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item name="merchantSerialNo" label="商户 API 证书序列号" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item name="merchantPrivateKey" label="商户 API 私钥" extra={secretHint(!!data?.hasMerchantPrivateKey, '商户私钥')}>
                  <Input.TextArea rows={6} placeholder="-----BEGIN PRIVATE KEY-----" />
                </Form.Item>
                <Form.Item name="apiV3Key" label="APIv3 Key" extra={secretHint(!!data?.hasApiV3Key, 'APIv3 Key')}>
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
                <Form.Item name="paymentNotifyUrl" label="支付结果回调地址" rules={[{ required: true }, { type: 'url' }]}>
                  <Input placeholder="https://api.example.com/api/payments/wechat/notify" />
                </Form.Item>
                <Space>
                  <Button type="primary" onClick={savePayment}>保存配置</Button>
                  <Button onClick={() => validate('payment')} disabled={!data?.hasMerchantPrivateKey || !data?.hasApiV3Key}>在线校验并生效</Button>
                </Space>
                <div style={{ marginTop: 16 }}><Text type="secondary">修改任何字段后，原校验状态会立即失效，需重新校验。</Text></div>
              </Form>
            </Card>
          ),
        },
      ]} />
    </div>
  );
}
