import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Radio,
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
import AdminPageHeader from '../components/AdminPageHeader';
import SubscribeTemplatesForm from '../components/SubscribeTemplatesForm';

const { Paragraph, Text } = Typography;

function apiErrorMessage(error: unknown) {
  const value = error as { response?: { data?: { message?: string } }; errorFields?: unknown };
  return value.response?.data?.message;
}

function Status({ validAt, error }: { validAt: string | null; error: string | null }) {
  if (validAt && !error) return <Tag color="success">已校验生效</Tag>;
  return <Tag color="warning">未生效</Tag>;
}

export default function WechatConfig() {
  const [data, setData] = useState<WechatConfigData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginForm] = Form.useForm();
  const [paymentForm] = Form.useForm();

  const load = useCallback(async () => {
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
        paymentVerifierMode: next.paymentVerifierMode || 'platform_public_key',
        platformKeyId: next.platformKeyId || '',
        platformPublicKey: '',
        boundAppId: next.boundAppId || next.miniProgramAppId || '',
        bindingConfirmed: Boolean(next.bindingConfirmed),
        paymentNotifyUrl: next.paymentNotifyUrl || '',
      });
    } catch {
      message.error('微信配置加载失败');
    } finally {
      setLoading(false);
    }
  }, [loginForm, paymentForm]);

  useEffect(() => { void load(); }, [load]);

  const saveLogin = async () => {
    try {
      const values = await loginForm.validateFields();
      await wechatConfigService.updateLogin(values);
      message.success('登录配置已保存，请重新校验');
      await load();
    } catch (error: unknown) {
      if ((error as { errorFields?: unknown }).errorFields) return;
      message.error(apiErrorMessage(error) || '保存失败');
    }
  };

  const savePayment = async () => {
    try {
      const values = await paymentForm.validateFields();
      await wechatConfigService.updatePayment(values);
      message.success('支付配置已保存，请点击「在线校验并生效」');
      await load();
    } catch (error: unknown) {
      if ((error as { errorFields?: unknown }).errorFields) return;
      message.error(apiErrorMessage(error) || '保存失败');
    }
  };

  const validate = async (type: 'login' | 'payment') => {
    setLoading(true);
    try {
      if (type === 'login') await wechatConfigService.validateLogin();
      else await wechatConfigService.validatePayment();
      message.success('微信配置校验成功并已生效');
      await load();
    } catch (error: unknown) {
      message.error(apiErrorMessage(error) || '校验失败');
      await load();
    } finally {
      setLoading(false);
    }
  };

  const secretHint = (exists: boolean, label: string) =>
    exists ? `已加密保存 ${label}，留空表示不修改` : `请输入 ${label}`;

  return (
    <div>
      <AdminPageHeader
        title="微信能力配置"
        description="管理微信小程序授权登录、美甲师订阅微信支付 V3 商户凭证与订阅消息模板，提供安全加密存储与连通性自检。"
      />
      <Alert
        type="info"
        showIcon
        message="只有开启开关且在线校验成功的能力，才会在微信小程序中生效。生产环境已禁止静默降级为模拟支付，未校验通过前将阻止发起订阅支付。"
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
              <Paragraph type="secondary">
                用于美甲师 SaaS 订阅套餐微信支付 V3（JSAPI）。保存全部参数后点击「在线校验并生效」，系统会使用商户 API 证书向微信支付接口自检签名与回调验签公钥。
              </Paragraph>
              <Form form={paymentForm} layout="vertical" style={{ maxWidth: 720 }}>
                <Form.Item name="paymentEnabled" label="启用微信支付" valuePropName="checked"><Switch /></Form.Item>
                <Form.Item name="merchantId" label="微信支付商户号（MCHID）" rules={[{ required: true, message: '请输入微信支付商户号' }]}>
                  <Input placeholder="例如：1600000000" />
                </Form.Item>
                <Form.Item name="merchantSerialNo" label="商户 API 证书序列号" rules={[{ required: true, message: '请输入商户 API 证书序列号' }]}>
                  <Input placeholder="微信商户平台 → 账户中心 → API安全 → API证书查看" />
                </Form.Item>
                <Form.Item name="merchantPrivateKey" label="商户 API 私钥（apiclient_key.pem）" extra={secretHint(!!data?.hasMerchantPrivateKey, '商户私钥')}>
                  <Input.TextArea rows={5} placeholder="请粘贴 PEM 格式的商户 API 私钥内容" />
                </Form.Item>
                <Form.Item name="apiV3Key" label="APIv3 Key（32 位密钥）" extra={secretHint(!!data?.hasApiV3Key, 'APIv3 Key')}>
                  <Input.Password autoComplete="new-password" placeholder="32 位 APIv3 密钥，用于解密微信支付回调" />
                </Form.Item>
                <Form.Item
                  name="paymentVerifierMode"
                  label="回调验签方式"
                  rules={[{ required: true, message: '请选择回调验签方式' }]}
                >
                  <Radio.Group>
                    <Radio value="platform_public_key">微信支付公钥（推荐，新商户默认）</Radio>
                    <Radio value="platform_certificate">微信支付平台证书</Radio>
                  </Radio.Group>
                </Form.Item>
                <Form.Item
                  name="platformKeyId"
                  label="微信支付公钥 ID / 平台证书序列号"
                  rules={[{ required: true, message: '请输入微信支付公钥 ID 或平台证书序列号' }]}
                  extra="与微信回调请求头 Wechatpay-Serial 对应（例如 PUB_KEY_ID_... 或平台证书序列号）"
                >
                  <Input placeholder="PUB_KEY_ID_..." />
                </Form.Item>
                <Form.Item
                  name="platformPublicKey"
                  label="微信支付公钥 / 平台证书公钥（PEM）"
                  extra={secretHint(!!data?.hasPlatformPublicKey, '微信支付平台公钥')}
                >
                  <Input.TextArea rows={5} placeholder="请粘贴 PEM 格式的微信支付公钥或平台证书公钥内容" />
                </Form.Item>
                <Form.Item
                  name="boundAppId"
                  label="商户已绑定小程序 AppID"
                  rules={[{ required: true, message: '请输入已绑定的小程序 AppID' }]}
                  extra="必须与「微信登录」标签页中配置的小程序 AppID 完全一致"
                >
                  <Input placeholder={data?.miniProgramAppId || 'wx...'} />
                </Form.Item>
                <Form.Item
                  name="bindingConfirmed"
                  valuePropName="checked"
                  rules={[
                    {
                      validator: (_, value) =>
                        value
                          ? Promise.resolve()
                          : Promise.reject(new Error('请先在微信商户平台确认已完成 AppID 关联绑定')),
                    },
                  ]}
                >
                  <Checkbox>我已确认在微信商户平台「产品中心 → AppID账号管理」完成与当前小程序 AppID 的关联</Checkbox>
                </Form.Item>
                <Form.Item
                  name="paymentNotifyUrl"
                  label="支付结果异步回调地址（必须 HTTPS）"
                  rules={[
                    { required: true, message: '请输入支付结果回调地址' },
                    { type: 'url', message: '请输入合法的 HTTPS 地址' },
                  ]}
                  extra="固定路径：https://<你的后端API域名>/api/payments/wechat/notify"
                >
                  <Input placeholder="https://api.example.com/api/payments/wechat/notify" />
                </Form.Item>
                <Space wrap>
                  <Button type="primary" onClick={savePayment}>保存配置</Button>
                  <Button
                    onClick={() => validate('payment')}
                    disabled={!data?.hasMerchantPrivateKey || !data?.hasApiV3Key || !data?.hasPlatformPublicKey}
                  >
                    在线校验并生效
                  </Button>
                </Space>
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">修改任何字段后，原校验状态会立即失效，需重新点击「在线校验并生效」。</Text>
                </div>
              </Form>
            </Card>
          ),
        },
        {
          key: 'templates',
          label: '订阅消息模板',
          children: (
            <Card>
              <SubscribeTemplatesForm />
            </Card>
          ),
        },
      ]} />
    </div>
  );
}
