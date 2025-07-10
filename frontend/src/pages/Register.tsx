import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const Register: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <Title level={2} className="text-center mb-6">
          用户注册
        </Title>
        <p className="text-center text-gray-600">
          注册功能正在开发中...
        </p>
      </Card>
    </div>
  );
};

export default Register; 