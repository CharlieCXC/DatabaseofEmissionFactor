import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  Typography, 
  Divider, 
  Checkbox,
  message,
  Row,
  Col,
  Space
} from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  EyeInvisibleOutlined, 
  EyeTwoTone,
  MailOutlined 
} from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore, useAuthActions, useIsAuthenticated, useAuthLoading } from '../stores/authStore';

const { Title, Text, Paragraph } = Typography;

interface LoginFormData {
  identifier: string;
  password: string;
  remember: boolean;
}

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  
  const isAuthenticated = useIsAuthenticated();
  const loading = useAuthLoading();
  const { login, clearError } = useAuthActions();

  // 如果已经登录，重定向到主页
  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = searchParams.get('redirect') || '/dashboard';
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams]);

  // 清除错误信息
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  // 处理登录表单提交
  const handleSubmit = async (values: LoginFormData) => {
    try {
      await login({
        identifier: values.identifier,
        password: values.password,
        remember: values.remember,
      });

      // 登录成功后跳转
      const redirectTo = searchParams.get('redirect') || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      // 错误处理已在store中完成
      console.error('Login failed:', error);
    }
  };

  // 切换登录方式
  const toggleLoginType = () => {
    setIsEmailLogin(!isEmailLogin);
    form.resetFields(['identifier']);
  };

  // 处理演示登录
  const handleDemoLogin = (type: 'admin' | 'user') => {
    const credentials = {
      admin: { identifier: 'admin', password: 'admin123456' },
      user: { identifier: 'testuser', password: 'user123456' }
    };

    form.setFieldsValue({
      identifier: credentials[type].identifier,
      password: credentials[type].password,
      remember: true
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Row justify="center" className="w-full max-w-6xl">
        <Col xs={24} sm={20} md={16} lg={12} xl={10}>
          <Card
            className="shadow-2xl border-0 rounded-2xl overflow-hidden"
            bodyStyle={{ padding: 0 }}
          >
            {/* 头部区域 */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center text-white">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
                  <UserOutlined className="text-3xl" />
                </div>
                <Title level={2} className="text-white mb-2">
                  排放因子数据库
                </Title>
                <Text className="text-blue-100">
                  ESG合规平台 - 碳核算数据管理系统
                </Text>
              </div>
            </div>

            {/* 登录表单区域 */}
            <div className="p-8">
              <div className="text-center mb-6">
                <Title level={3} className="mb-2">
                  登录账户
                </Title>
                <Text type="secondary">
                  使用 {isEmailLogin ? '邮箱' : '用户名'} 和密码登录系统
                </Text>
              </div>

              <Form
                form={form}
                name="login"
                onFinish={handleSubmit}
                layout="vertical"
                size="large"
                requiredMark={false}
              >
                <Form.Item
                  name="identifier"
                  rules={[
                    { required: true, message: `请输入${isEmailLogin ? '邮箱' : '用户名'}` },
                    isEmailLogin ? { type: 'email', message: '请输入有效的邮箱地址' } : {},
                  ]}
                >
                  <Input
                    prefix={isEmailLogin ? <MailOutlined /> : <UserOutlined />}
                    placeholder={`请输入${isEmailLogin ? '邮箱' : '用户名'}`}
                    className="rounded-lg"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[{ required: true, message: '请输入密码' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="请输入密码"
                    className="rounded-lg"
                    iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                  />
                </Form.Item>

                <Form.Item>
                  <div className="flex justify-between items-center">
                    <Form.Item name="remember" valuePropName="checked" noStyle>
                      <Checkbox>记住登录状态</Checkbox>
                    </Form.Item>
                    <Button type="link" onClick={toggleLoginType} className="p-0">
                      {isEmailLogin ? '使用用户名登录' : '使用邮箱登录'}
                    </Button>
                  </div>
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    className="w-full h-12 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 border-0 text-base font-medium"
                  >
                    {loading ? '登录中...' : '登录'}
                  </Button>
                </Form.Item>

                <div className="text-center">
                  <Text type="secondary">
                    还没有账户？{' '}
                    <Link to="/register" className="text-blue-600 hover:text-blue-700">
                      立即注册
                    </Link>
                  </Text>
                </div>
              </Form>

              <Divider>演示账户</Divider>

              <Space direction="vertical" className="w-full">
                <Row gutter={16}>
                  <Col span={12}>
                    <Button 
                      block 
                      onClick={() => handleDemoLogin('admin')}
                      className="h-10 border-blue-300 text-blue-600 hover:border-blue-400 hover:text-blue-700"
                    >
                      管理员演示
                    </Button>
                  </Col>
                  <Col span={12}>
                    <Button 
                      block 
                      onClick={() => handleDemoLogin('user')}
                      className="h-10 border-green-300 text-green-600 hover:border-green-400 hover:text-green-700"
                    >
                      普通用户演示
                    </Button>
                  </Col>
                </Row>
                
                <div className="text-center mt-4">
                  <Paragraph type="secondary" className="text-xs">
                    演示账户：管理员 (admin/admin123456) | 普通用户 (testuser/user123456)
                  </Paragraph>
                </div>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Login; 