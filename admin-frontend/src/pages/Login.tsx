import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      navigate(from, { replace: true });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'var(--nb-page)',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48,
            height: 48,
            margin: '0 auto 14px',
            borderRadius: 12,
            background: 'var(--nb-action)',
            color: '#FFFFFF',
            display: 'grid',
            placeItems: 'center',
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: -0.5,
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
          }}>
            ON
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--nb-ink)', letterSpacing: -0.4 }}>
            OnlyNail SaaS
          </div>
          <div style={{ fontSize: 13, color: 'var(--nb-secondary)', marginTop: 4 }}>
            美甲师预约管理系统 · 运营中台
          </div>
        </div>

        <Card
          style={{
            borderRadius: 16,
            border: '1px solid var(--nb-line)',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
          }}
          styles={{ body: { padding: '32px 28px 24px' } }}
        >
          <Form
            name="login"
            onFinish={handleSubmit}
            autoComplete="off"
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="username"
              label={<span style={{ fontWeight: 500, fontSize: 13 }}>账号</span>}
              rules={[{ required: true, message: '请输入管理员账号' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: 'var(--nb-control)' }} />}
                placeholder="请输入管理员账号"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontWeight: 500, fontSize: 13 }}>密码</span>}
              rules={[{ required: true, message: '请输入登录密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--nb-control)' }} />}
                placeholder="请输入登录密码"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 28, marginBottom: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 42,
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 15,
                }}
              >
                登 录
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <div style={{
          textAlign: 'center',
          marginTop: 24,
          fontSize: 12,
          color: 'var(--nb-muted)',
        }}>
          OnlyNail Platform © 2026 · 独立美甲师私域预约管理平台
        </div>
      </div>
    </div>
  );
};

export default Login;
