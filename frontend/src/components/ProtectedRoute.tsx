import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useIsAuthenticated, useAuthLoading } from '../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useIsAuthenticated();
  const loading = useAuthLoading();
  const location = useLocation();

  // 如果正在加载认证状态，显示加载动画
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip="验证登录状态..." />
      </div>
    );
  }

  // 如果未登录，重定向到登录页面
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`} 
        replace 
      />
    );
  }

  // 如果已登录，渲染子组件
  return <>{children}</>;
};

export default ProtectedRoute; 