import React, { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Grid,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { subscriptionService } from '../services/subscription';
import type { SubscriptionPlan } from '../services/subscription';

const { Text } = Typography;

export interface ManageSubscriptionTarget {
  technicianId: number;
  technicianName: string;
  technicianPhone?: string;
  currentPlanId?: number;
  currentPlanName?: string;
  currentExpiredAt?: string | null;
}

interface ManageSubscriptionModalProps {
  open: boolean;
  target: ManageSubscriptionTarget | null;
  plans: SubscriptionPlan[];
  onClose: () => void;
  onSuccess: () => void;
}

const ManageSubscriptionModal: React.FC<ManageSubscriptionModalProps> = ({
  open,
  target,
  plans,
  onClose,
  onSuccess,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [isPermanent, setIsPermanent] = useState(false);

  useEffect(() => {
    if (!open || !target) return;
    const matchedPlan =
      plans.find((p) => p.id === target.currentPlanId) ||
      plans.find((p) => p.code === 'free') ||
      plans[0];
    const hasExpiry = Boolean(target.currentExpiredAt);
    const permanent = !hasExpiry && (!matchedPlan || matchedPlan.price <= 0);
    setIsPermanent(permanent);
    form.setFieldsValue({
      planId: matchedPlan?.id,
      expiredAt: hasExpiry
        ? dayjs(target.currentExpiredAt)
        : permanent
          ? null
          : dayjs().add(30, 'day').endOf('day'),
      note: '',
    });
  }, [open, target, plans, form]);

  const handlePlanChange = (planId: number) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    if (plan.billingCycle === 'free' || plan.price <= 0) {
      setIsPermanent(true);
      form.setFieldValue('expiredAt', null);
    } else if (isPermanent) {
      setIsPermanent(false);
      const currentVal: Dayjs | null = form.getFieldValue('expiredAt');
      if (!currentVal) {
        form.setFieldValue('expiredAt', dayjs().add(30, 'day').endOf('day'));
      }
    }
  };

  const applyQuickDuration = (days: number | null) => {
    if (days === null) {
      setIsPermanent(true);
      form.setFieldValue('expiredAt', null);
      return;
    }
    setIsPermanent(false);
    // 若当前已有未过期的到期时间，则在其基础上顺延；否则从今天起算
    const currentExpiry =
      target?.currentExpiredAt && dayjs(target.currentExpiredAt).isAfter(dayjs())
        ? dayjs(target.currentExpiredAt)
        : dayjs();
    form.setFieldValue('expiredAt', currentExpiry.add(days, 'day').endOf('day'));
  };

  const handleSubmit = async () => {
    if (!target) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      const expiredAtIso = isPermanent
        ? null
        : values.expiredAt
          ? (values.expiredAt as Dayjs).endOf('day').toISOString()
          : null;

      await subscriptionService.updateTechnicianSubscription(target.technicianId, {
        planId: values.planId,
        expiredAt: expiredAtIso,
        applyAtPeriodEnd: false,
        note: values.note?.trim() || undefined,
      });

      message.success('美甲师订阅套餐与到期时间已更新');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return;
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '更新订阅失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="调整美甲师订阅"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={saving}
      okText="保存并立即生效"
      cancelText="取消"
      width={isMobile ? '94vw' : 520}
      destroyOnClose
    >
      {target && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: 'var(--nb-page)',
            border: '1px solid var(--nb-line)',
            marginBottom: 16,
          }}
        >
          <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
            <div>
              <Text strong style={{ fontSize: 15 }}>
                {target.technicianName}
              </Text>
              {target.technicianPhone && (
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                  {target.technicianPhone}
                </Text>
              )}
            </div>
            <Tag color="blue">{target.currentPlanName || '免费版'}</Tag>
          </Space>
          <div style={{ fontSize: 12, color: 'var(--nb-muted)', marginTop: 6 }}>
            当前到期时间：
            {target.currentExpiredAt
              ? dayjs(target.currentExpiredAt).format('YYYY-MM-DD HH:mm')
              : '永久有效'}
          </div>
        </div>
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="planId"
          label="目标订阅套餐"
          rules={[{ required: true, message: '请选择订阅套餐' }]}
        >
          <Select
            size="large"
            onChange={handlePlanChange}
            options={plans.map((p) => ({
              value: p.id,
              label: `${p.name}（¥${p.price}${p.billingCycle === 'free' ? ' 永久免费' : '/月'}）`,
            }))}
          />
        </Form.Item>

        <Form.Item label="快捷设置有效期" style={{ marginBottom: 12 }}>
          <Space wrap size={8}>
            <Button
              size="small"
              style={{ minHeight: 36 }}
              onClick={() => applyQuickDuration(30)}
            >
              +30 天
            </Button>
            <Button
              size="small"
              style={{ minHeight: 36 }}
              onClick={() => applyQuickDuration(90)}
            >
              +90 天
            </Button>
            <Button
              size="small"
              style={{ minHeight: 36 }}
              onClick={() => applyQuickDuration(365)}
            >
              +1 年
            </Button>
            <Button
              size="small"
              type={isPermanent ? 'primary' : 'default'}
              style={{ minHeight: 36 }}
              onClick={() => applyQuickDuration(null)}
            >
              永久有效
            </Button>
          </Space>
        </Form.Item>

        <Form.Item
          label="生效截止日期"
          extra="若当前套餐尚未到期，点击上方快捷天数会在原到期日基础上顺延；也可直接指定具体截止日期。"
        >
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Checkbox
              checked={isPermanent}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsPermanent(checked);
                if (checked) {
                  form.setFieldValue('expiredAt', null);
                } else if (!form.getFieldValue('expiredAt')) {
                  form.setFieldValue('expiredAt', dayjs().add(30, 'day').endOf('day'));
                }
              }}
            >
              设为永久有效（无截止时间）
            </Checkbox>

            {!isPermanent && (
              <Form.Item
                name="expiredAt"
                noStyle
                rules={[{ required: !isPermanent, message: '请选择生效截止日期' }]}
              >
                <DatePicker
                  size="large"
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  placeholder="选择到期日期（当日 23:59:59 截止）"
                />
              </Form.Item>
            )}
          </Space>
        </Form.Item>

        <Form.Item name="note" label="调整备注（选填，记入变更审计）">
          <Input.TextArea
            rows={2}
            maxLength={200}
            placeholder="例如：1v1 指导配置赠送首年终极版 / 线下转账续费 3 个月"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ManageSubscriptionModal;
