import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Badge,
  Drawer,
} from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useCurrentUser, useUserDisplayName, useAuthActions } from '../../stores/authStore';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useCurrentUser();
  const displayName = useUserDisplayName();
  const { logout } = useAuthActions();

  // 菜单项配置
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/emission-factors',
      icon: <DatabaseOutlined />,
      label: '排放因子',
      children: [
        {
          key: '/emission-factors',
          label: '因子列表',
        },
        {
          key: '/emission-factors/create',
          label: '添加因子',
        },
      ],
    },
    ...(user?.role === 'admin' ? [
      {
        key: '/users',
        icon: <UserOutlined />,
        label: '用户管理',
      },
    ] : []),
    {
      key: '/profile',
      icon: <SettingOutlined />,
      label: '个人设置',
    },
  ];

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  // 处理登出
  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  // 处理菜单点击
  const handleMenuClick = (e: any) => {
    navigate(e.key);
    setMobileMenuVisible(false);
  };

  // 获取当前选中的菜单项
  const selectedKey = location.pathname;

  return (
    <Layout className="min-h-screen">
      {/* 桌面端侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="hidden lg:block"
        theme="light"
        width={256}
        style={{
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        }}
      >
        {/* Logo区域 */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200">
          {collapsed ? (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <DatabaseOutlined className="text-white text-lg" />
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <DatabaseOutlined className="text-white text-lg" />
              </div>
              <Title level={4} className="mb-0 text-blue-600">
                排放因子库
              </Title>
            </div>
          )}
        </div>

        {/* 菜单 */}
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-0 h-[calc(100vh-64px)] overflow-y-auto"
        />
      </Sider>

      {/* 移动端侧边栏 */}
      <Drawer
        title="菜单"
        placement="left"
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        className="lg:hidden"
        width={280}
      >
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Drawer>

      <Layout>
        {/* 顶部导航栏 */}
        <Header className="bg-white border-b border-gray-200 px-4 flex items-center justify-between" style={{ height: '64px' }}>
          <div className="flex items-center space-x-4">
            {/* 折叠按钮 */}
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex"
            />
            
            {/* 移动端菜单按钮 */}
            <Button
              type="text"
              icon={<MenuUnfoldOutlined />}
              onClick={() => setMobileMenuVisible(true)}
              className="lg:hidden"
            />

            {/* 搜索框区域 */}
            <div className="hidden md:block">
              <Button
                icon={<SearchOutlined />}
                className="border-gray-300"
                onClick={() => navigate('/emission-factors')}
              >
                搜索排放因子...
              </Button>
            </div>
          </div>

          {/* 右侧用户区域 */}
          <div className="flex items-center space-x-4">
            {/* 通知铃铛 */}
            <Badge count={0} showZero={false}>
              <Button
                type="text"
                icon={<BellOutlined />}
                className="hover:bg-gray-100"
              />
            </Badge>

            {/* 用户头像和下拉菜单 */}
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button type="text" className="p-0 h-auto">
                <Space>
                  <Avatar
                    src={user?.avatar || undefined}
                    icon={!user?.avatar ? <UserOutlined /> : undefined}
                    className="bg-blue-600"
                  />
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {displayName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user?.organization || user?.role}
                    </div>
                  </div>
                </Space>
              </Button>
            </Dropdown>
          </div>
        </Header>

        {/* 主内容区域 */}
        <Content className="bg-gray-50 p-6 overflow-auto">
          <div className="max-w-full">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout; 