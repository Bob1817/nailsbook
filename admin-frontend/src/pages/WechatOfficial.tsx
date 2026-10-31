import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  wechatOfficialService,
  type OfficialEncryptMode,
  type WechatOfficialConfig,
} from '../services/wechatOfficial';
import AdminPageHeader from '../components/AdminPageHeader';

const { Paragraph, Text } = Typography;
const { TextArea } = Input;

/** 生产环境 API 域名，用于把后端返回的相对回调路径补全为可粘贴的完整 URL。 */
const API_ORIGIN = 'https://api.lunails.cn';

function apiErrorMessage(error: unknown) {
  const value = error as {
    response?: { data?: { message?: string } };
    errorFields?: unknown;
  };
  return value.response?.data?.message;
}

/** 生成微信要求的随机串：Token 建议 24 位，EncodingAESKey 固定 43 位。 */
function randomString(length: number) {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function fullCallbackUrl(path: string) {
  if (!path) return '';
  return path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
}

function StatusTag({
  validAt,
  error,
}: {
  validAt: string | null;
  error: string | null;
}) {
  if (error) return <Tag color="error">校验失败</Tag>;
  if (validAt) return <Tag color="success">已校验生效</Tag>;
  return <Tag color="warning">未校验</Tag>;
}

/** 菜单结构预览，与后端 official-menu-definition.ts 保持一致。 */
const MENU_PREVIEW: Array<{ name: string; type: string; children?: string[] }> = [
  { name: '立即预约', type: '跳转小程序 · 预约下单页' },
  {
    name: '我的服务',
    type: '二级菜单',
    children: ['我的预约', '我的美甲师', '联系客服', '使用帮助', '意见反馈'],
  },
  {
    name: '了解我们',
    type: '二级菜单',
    children: ['作品精选', '发现美甲师', '门店与服务', '美甲师招募', '关于我们'],
  },
];

export default function WechatOfficial() {
  const [data, setData] = useState<WechatOfficialConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuResult, setMenuResult] = useState('');
  const [configForm] = Form.useForm();
  const [replyForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await wechatOfficialService.getConfig();
      setData(next);
      configForm.setFieldsValue({
        enabled: next.enabled,
        appId: next.appId,
        appSecret: '',
        token: next.token,
        encodingAesKey: '',
        encryptMode: next.encryptMode,
      });
      replyForm.setFieldsValue({
        welcomeReply: next.welcomeReply,
        fallbackReply: next.fallbackReply,
      });
    } catch {
      message.error('公众号配置加载失败');
    } finally {
      setLoading(false);
    }
  }, [configForm, replyForm]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveConfig = async () => {
    try {
      const values = await configForm.validateFields();
      await wechatOfficialService.updateConfig(values);
      message.success('接口配置已保存，请点击「在线校验」使其生效');
      await load();
    } catch (error: unknown) {
      if ((error as { errorFields?: unknown }).errorFields) {
        message.warning('请先填写标记为必填的配置项（如公众号 AppID）');
        return;
      }
      message.error(apiErrorMessage(error) || '保存失败');
    }
  };

  const validate = async () => {
    setLoading(true);
    try {
      const result = await wechatOfficialService.validate();
      if (result.ok) message.success(result.message);
      else message.error(result.message);
      await load();
    } catch (error: unknown) {
      message.error(apiErrorMessage(error) || '校验失败');
      await load();
    } finally {
      setLoading(false);
    }
  };

  const saveReply = async () => {
    try {
      const values = await replyForm.validateFields();
      await wechatOfficialService.updateConfig(values);
      message.success('自动回复文案已保存');
      await load();
    } catch (error: unknown) {
      if ((error as { errorFields?: unknown }).errorFields) return;
      message.error(apiErrorMessage(error) || '保存失败');
    }
  };

  const runMenu = async (action: 'sync' | 'get' | 'delete') => {
    setMenuLoading(true);
    try {
      if (action === 'sync') {
        const result = await wechatOfficialService.syncMenu();
        setMenuResult(JSON.stringify(result, null, 2));
        message.success('默认菜单已同步（客户端最长 24 小时内更新）');
      } else if (action === 'delete') {
        const result = await wechatOfficialService.deleteMenu();
        setMenuResult(JSON.stringify(result, null, 2));
        message.success('菜单已删除');
      } else {
        const menu = await wechatOfficialService.getMenu();
        setMenuResult(JSON.stringify(menu, null, 2));
      }
    } catch (error: unknown) {
      message.error(apiErrorMessage(error) || '菜单操作失败');
    } finally {
      setMenuLoading(false);
    }
  };

  const copyText = async (text: string, label: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      message.success(`${label}已复制`);
    } catch {
      message.warning('复制失败，请手动选中复制');
    }
  };

  const copyCallback = () =>
    copyText(fullCallbackUrl(data?.callbackUrl ?? ''), '回调地址');

  const secretHint = (exists: boolean, label: string) =>
    exists ? `已保存${label}，留空表示不修改` : `请输入${label}`;

  const encryptModeOptions: Array<{
    value: OfficialEncryptMode;
    label: string;
  }> = [
    { value: 'plaintext', label: '明文模式（推荐先用，便于排障）' },
    { value: 'compatible', label: '兼容模式（明文与密文都接收）' },
    { value: 'safe', label: '安全模式（仅接收密文）' },
  ];

  return (
    <div>
      <AdminPageHeader
        title="公众号配置"
        description="配置微信服务号/订阅号消息推送、自定义菜单与自动回复规则。"
        extra={
          <StatusTag
            validAt={data?.validatedAt || null}
            error={data?.validationError || null}
          />
        }
      />
      <Alert
        type="info"
        showIcon
        message="这里的配置只影响服务端能力（消息推送、自动回复、菜单）。AppID / AppSecret 等仍需要在微信开发者平台完成 IP 白名单与域名配置后才能校验通过。"
        style={{ marginBottom: 16 }}
      />

      <Tabs
        items={[
          {
            key: 'api',
            label: '接口配置',
            children: (
              <Card loading={loading}>
                {data?.validationError && (
                  <Alert
                    type="warning"
                    showIcon
                    message={data.validationError}
                    style={{ marginBottom: 16 }}
                  />
                )}
                <Form
                  form={configForm}
                  layout="vertical"
                  style={{ maxWidth: 680 }}
                >
                  <Form.Item
                    name="enabled"
                    label="启用消息推送（接收用户消息与事件）"
                    valuePropName="checked"
                    extra="关闭后，用户发给公众号的消息不会被自动回复（不被接管）。微信后台的「服务器配置」校验不受此开关影响。"
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name="appId"
                    label="公众号 AppID"
                    rules={[{ required: true, message: '请输入公众号 AppID' }]}
                  >
                    <Input placeholder="wx 开头，可在微信开发者平台查看" />
                  </Form.Item>
                  <Form.Item
                    name="appSecret"
                    label="公众号 AppSecret"
                    extra={secretHint(!!data?.hasAppSecret, 'AppSecret')}
                  >
                    <Input.Password autoComplete="new-password" />
                  </Form.Item>

                  <Form.Item
                    label="消息推送 Token"
                    required
                    extra="需与微信后台「消息推送」中填写的 Token 完全一致"
                  >
                    <Space.Compact style={{ width: '100%' }}>
                      <Form.Item name="token" noStyle>
                        <Input placeholder="3–32 位字母数字" />
                      </Form.Item>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() =>
                          configForm.setFieldValue('token', randomString(24))
                        }
                      >
                        生成
                      </Button>
                    </Space.Compact>
                  </Form.Item>

                  <Form.Item
                    label="消息加解密 EncodingAESKey"
                    extra={
                      data?.hasEncodingAesKey
                        ? '已保存。保存后可在下方「要填到微信后台的地址」复制同一值；留空表示不修改'
                        : '43 位字母数字，需与微信后台一致；选「明文模式」可留空'
                    }
                  >
                    <Space.Compact style={{ width: '100%' }}>
                      <Form.Item name="encodingAesKey" noStyle>
                        <Input placeholder="43 位" />
                      </Form.Item>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() =>
                          configForm.setFieldValue(
                            'encodingAesKey',
                            randomString(43),
                          )
                        }
                      >
                        生成
                      </Button>
                    </Space.Compact>
                  </Form.Item>

                  <Form.Item
                    name="encryptMode"
                    label="消息加解密方式"
                    rules={[{ required: true }]}
                  >
                    <Select options={encryptModeOptions} />
                  </Form.Item>

                  <Space>
                    <Button type="primary" onClick={saveConfig}>
                      保存配置
                    </Button>
                    <Button
                      onClick={validate}
                      disabled={!data?.hasAppSecret}
                    >
                      在线校验并生效
                    </Button>
                  </Space>
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">
                      校验会向微信请求 access_token：能取到说明 AppSecret 正确且本机
                      IP 已在白名单内。修改任何字段后原校验状态立即失效。
                    </Text>
                  </div>
                </Form>

                <Descriptions
                  title="要填到微信后台的地址"
                  column={1}
                  style={{ marginTop: 24 }}
                  bordered
                  size="small"
                >
                  <Descriptions.Item label="服务器地址(URL)">
                    <Space>
                      <Text code>{fullCallbackUrl(data?.callbackUrl ?? '')}</Text>
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={copyCallback}
                      >
                        复制
                      </Button>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Token">
                    <Space>
                      <Text code>{data?.token || '（先用上方「生成」按钮生成）'}</Text>
                      {data?.token ? (
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => copyText(data.token, 'Token')}
                        >
                          复制
                        </Button>
                      ) : null}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="EncodingAESKey">
                    <Space>
                      <Text code>
                        {data?.encodingAesKey || '（先用上方「生成」按钮生成）'}
                      </Text>
                      {data?.encodingAesKey ? (
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() =>
                            copyText(data.encodingAesKey, 'EncodingAESKey')
                          }
                        >
                          复制
                        </Button>
                      ) : null}
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
                <Paragraph type="secondary" style={{ marginTop: 8 }}>
                  三个值必须与微信后台填写的内容完全一致（区分大小写）。加解密方式选「明文模式」时 EncodingAESKey 可留空。
                </Paragraph>
                <Paragraph type="secondary" style={{ marginTop: 8 }}>
                  填写路径：微信开发者平台 → 我的业务与服务 → 服务号 → 域名与消息推送配置。
                </Paragraph>
              </Card>
            ),
          },
          {
            key: 'reply',
            label: '自动回复',
            children: (
              <Card loading={loading}>
                <Alert
                  type="warning"
                  showIcon
                  message="启用消息推送后，微信后台的「自动回复」会全部失效，改由这里接管。"
                  description="关键词规则（价格 / 预约 / 地址 / 改期 / 退款 / 人工 等 24 条）已内置在服务端；下方只能改「关注欢迎语」和「未命中时的兜底回复」。"
                  style={{ marginBottom: 16 }}
                />
                <Form form={replyForm} layout="vertical" style={{ maxWidth: 680 }}>
                  <Form.Item
                    name="welcomeReply"
                    label="关注欢迎语（用户关注时发送）"
                  >
                    <TextArea rows={6} maxLength={2000} showCount />
                  </Form.Item>
                  <Form.Item
                    name="fallbackReply"
                    label="兜底回复（未命中任何关键词时发送）"
                  >
                    <TextArea rows={5} maxLength={2000} showCount />
                  </Form.Item>
                  <Button type="primary" onClick={saveReply}>
                    保存文案
                  </Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'menu',
            label: '自定义菜单',
            children: (
              <Card loading={loading}>
                <Alert
                  type="info"
                  showIcon
                  message="菜单由服务端统一下发，避免在后台可视化编辑器里改坏结构。"
                  description="同步后老用户最长 24 小时更新；取消关注再关注可立即看到。菜单项跳转的均为小程序真实页面。"
                  style={{ marginBottom: 16 }}
                />
                <Descriptions
                  title="即将下发的菜单结构"
                  column={1}
                  bordered
                  size="small"
                  style={{ marginBottom: 16, maxWidth: 680 }}
                >
                  {MENU_PREVIEW.map((item) => (
                    <Descriptions.Item key={item.name} label={item.name}>
                      {item.children ? (
                        <Space wrap>
                          {item.children.map((child) => (
                            <Tag key={child}>{child}</Tag>
                          ))}
                        </Space>
                      ) : (
                        <Text type="secondary">{item.type}</Text>
                      )}
                    </Descriptions.Item>
                  ))}
                </Descriptions>

                <Space wrap>
                  <Button
                    type="primary"
                    loading={menuLoading}
                    onClick={() => runMenu('sync')}
                    disabled={!data?.hasAppSecret}
                  >
                    同步默认菜单
                  </Button>
                  <Button
                    loading={menuLoading}
                    onClick={() => runMenu('get')}
                    disabled={!data?.hasAppSecret}
                  >
                    查询当前菜单
                  </Button>
                  <Popconfirm
                    title="删除公众号菜单？"
                    description="删除后公众号将没有底部菜单，可用「同步默认菜单」恢复。"
                    okText="确认删除"
                    cancelText="取消"
                    onConfirm={() => runMenu('delete')}
                  >
                    <Button danger loading={menuLoading}>
                      删除菜单
                    </Button>
                  </Popconfirm>
                </Space>

                {menuResult && (
                  <pre
                    style={{
                      marginTop: 16,
                      padding: 12,
                      borderRadius: 8,
                      background: 'var(--nb-page)',
                      maxHeight: 360,
                      overflow: 'auto',
                      fontSize: 12,
                    }}
                  >
                    {menuResult}
                  </pre>
                )}
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
