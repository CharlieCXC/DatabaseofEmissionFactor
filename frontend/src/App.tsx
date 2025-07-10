import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

// 导入页面组件
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import EmissionFactorList from './pages/EmissionFactorList';
import EmissionFactorDetail from './pages/EmissionFactorDetail';
import EmissionFactorCreate from './pages/EmissionFactorCreate';
import UserManagement from './pages/UserManagement';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

// 导入布局组件
import MainLayout from './components/Layout/MainLayout';
import AuthLayout from './components/Layout/AuthLayout';

// 导入路由保护组件
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// 导入hooks
import { useAuthActions, useIsAuthenticated } from './stores/authStore';

// 设置dayjs中文locale
dayjs.locale('zh-cn');

// Antd主题配置
const themeConfig = {
  token: {
    colorPrimary: '#1677ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1677ff',
    borderRadius: 8,
    wireframe: false,
  },
  components: {
    Button: {
      borderRadius: 8,
    },
    Card: {
      borderRadius: 12,
    },
    Input: {
      borderRadius: 8,
    },
    Select: {
      borderRadius: 8,
    },
  },
};

const App: React.FC = () => {
  const { checkAuth } = useAuthActions();
  const isAuthenticated = useIsAuthenticated();

  // 应用启动时检查认证状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={themeConfig}
    >
      <AntdApp>
        <Router>
          <Routes>
            {/* 公开路由 - 使用认证布局 */}
            <Route path="/login" element={
              <AuthLayout>
                <Login />
              </AuthLayout>
            } />
            <Route path="/register" element={
              <AuthLayout>
                <Register />
              </AuthLayout>
            } />

            {/* 受保护的路由 - 使用主布局 */}
            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              {/* 默认重定向到dashboard */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              
              {/* Dashboard主页 */}
              <Route path="dashboard" element={<Dashboard />} />
              
              {/* 排放因子管理 */}
              <Route path="emission-factors" element={<EmissionFactorList />} />
              <Route path="emission-factors/create" element={<EmissionFactorCreate />} />
              <Route path="emission-factors/:id" element={<EmissionFactorDetail />} />
              <Route path="emission-factors/:id/edit" element={<EmissionFactorCreate />} />
              
              {/* 用户管理（仅管理员） */}
              <Route path="users" element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              } />
              
              {/* 用户个人资料 */}
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* 404页面 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App; 