import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Space, Spin, Tag, Typography, message } from 'antd';
import { wechatConfigService, type SubscribeTemplateConfig } from '../services/wechatConfig';

const { Text } = Typography;

export const TEMPLATE_FIELDS: Array<{
  name: keyof Omit<SubscribeTemplateConfig, 'updatedAt'>;
  label: string;
  eventHint: string;
}> = [
  {
    name: 'bookingClientSuccessTemplateId',
    label: '客户预约成功模板 ID',
    eventHint: 'booking.client_success',
  },
  {
    name: 'bookingTechnicianNewTemplateId',
    label: '美甲师新预约提醒模板 ID',
    eventHint: 'booking.technician_new',
  },
  {
    name: 'bookingDayBeforeTemplateId',
    label: '次日预约提醒模板 ID',
    eventHint: 'booking.day_before',
  },
  {
    name: 'bookingHourBeforeTemplateId',
    label: '一小时前提醒模板 ID',
    eventHint: 'booking.hour_before',
  },
  {
    name: 'bookingClientStatusTemplateId',
    label: '客户预约状态变更模板 ID',
    eventHint: 'booking.status.* (客户)',
  },
  {
    name: 'bookingTechnicianStatusTemplateId',
    label: '美甲师预约状态变更模板 ID',
    eventHint: 'booking.status.* (美甲师)',
  },
  {
    name: 'consultationReplyTemplateId',
    label: '在线咨询回复提醒模板 ID',
    eventHint: 'consultation.reply',
  },
  {
    name: 'bookingReminderTemplateId',
    label: '兜底通用预约提醒模板 ID（选填）',
    eventHint: 'day_before 未配时兜底',
  },
];

interface SubscribeTemplatesFormProps {
  highlightField?: keyof Omit<SubscribeTemplateConfig, 'updatedAt'>;
  onSaved?: () => void;
}

const SubscribeTemplatesForm: React.FC<SubscribeTemplatesFormProps> = ({
  highlightField,
  onSaved,
}) => {
  const [form] = Form.useForm<SubscribeTemplateConfig>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SubscribeTemplateConfig | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await wechatConfigService.getTemplates();
      setData(res);
      form.setFieldsValue(res);
    } catch {
      message.error('加载微信订阅消息模板配置失败');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const updated = await wechatConfigService.updateTemplates(values);
      setData(updated);
      message.success('微信订阅消息模板配置已保存并立即生效');
      onSaved?.();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return;
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: 36 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="请填写微信小程序后台「功能 → 订阅消息 → 我的模板」中审核通过的模板 ID，保存后无需重启即刻生效。"
      />

      <Form form={form} layout="vertical" style={{ maxWidth: 680 }}>
        {TEMPLATE_FIELDS.map((field) => {
          const isHighlighted = highlightField === field.name;
          const configured = Boolean(data?.[field.name]?.trim());
          return (
            <Form.Item
              key={field.name}
              name={field.name}
              label={
                <Space size={6} wrap>
                  <span>{field.label}</span>
                  <Tag color={configured ? 'success' : 'warning'}>
                    {configured ? '已配置' : '未配置'}
                  </Tag>
                  {isHighlighted && <Tag color="error">当前失败对应项</Tag>}
                </Space>
              }
              extra={<Text type="secondary" style={{ fontSize: 12 }}>对应事件：{field.eventHint}</Text>}
            >
              <Input
                placeholder="输入微信小程序订阅消息模板 ID"
                allowClear
                style={{ minHeight: 42 }}
              />
            </Form.Item>
          );
        })}

        <Space wrap>
          <Button
            type="primary"
            loading={saving}
            style={{ minHeight: 44 }}
            onClick={handleSave}
          >
            保存模板配置
          </Button>
          <Button style={{ minHeight: 44 }} onClick={() => void load()}>
            重新加载
          </Button>
        </Space>
      </Form>
    </div>
  );
};

export default SubscribeTemplatesForm;
