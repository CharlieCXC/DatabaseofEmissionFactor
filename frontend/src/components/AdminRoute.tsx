import React from 'react';
import { Navigate } from 'react-router-dom';
import { Result, Button } from 'antd';
import { useIsAdmin } from '../stores/authStore';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const isAdmin = useIsAdmin();

  // 如果不是管理员，显示无权限页面
  if (!isAdmin) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您无权访问此页面。"
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            返回
          </Button>
        }
      />
    );
  }

  // 如果是管理员，渲染子组件
  return <>{children}</>;
};

export default AdminRoute; 