import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Popconfirm,
  message,
  Modal,
  Form,
  Row,
  Col,
  Statistic,
  Tooltip,
  Badge,
  Dropdown,
  Avatar,
  Typography,
  Upload,
  Drawer,
  Descriptions
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import {
  PlusOutlined,
  FilterOutlined,
  DownloadOutlined,
  UploadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  UserOutlined,
  LockOutlined,
  UnlockOutlined,
  MailOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  CrownOutlined
} from '@ant-design/icons';
import userService from '../services/userService';
import type {
  User,
  UserRole,
  UserStatus,
  UserQueryParams
} from '../types/auth';

const { Search } = Input;
const { Option } = Select;
const { Text, Title } = Typography;

// 角色配置
const roleConfig = {
  admin: { color: 'red', icon: <CrownOutlined />, label: '管理员' },
  editor: { color: 'blue', icon: <EditOutlined />, label: '编辑者' },
  viewer: { color: 'green', icon: <EyeOutlined />, label: '查看者' },
  user: { color: 'default', icon: <UserOutlined />, label: '普通用户' }
};

// 状态配置
const statusConfig = {
  active: { color: 'green', icon: <CheckCircleOutlined />, label: '活跃' },
  inactive: { color: 'default', icon: <CloseCircleOutlined />, label: '非活跃' },
  pending: { color: 'orange', icon: <ClockCircleOutlined />, label: '待激活' },
  banned: { color: 'red', icon: <ExclamationCircleOutlined />, label: '已封禁' }
};

const UserManagement: React.FC = () => {
  const [form] = Form.useForm();
  const [createForm] = Form.useForm();

  // 数据状态
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) => 
      `显示 ${range[0]}-${range[1]} 条，共 ${total} 条用户`
  });

  // 查询参数
  const [queryParams, setQueryParams] = useState<UserQueryParams>({
    page: 1,
    page_size: 20,
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  // 选择状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  // UI状态
  const [filterVisible, setFilterVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [userDetailDrawer, setUserDetailDrawer] = useState<{ visible: boolean; user?: User }>({
    visible: false
  });
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({});

  // 表格列定义
  const columns: ColumnsType<User> = [
    {
      title: '用户信息',
      key: 'userInfo',
      width: 250,
      render: (_, record) => (
        <div className="flex items-center space-x-3">
          <Avatar 
            size={40}
            icon={<UserOutlined />}
            style={{ backgroundColor: roleConfig[record.role].color }}
          />
          <div>
            <div className="font-medium">{record.full_name}</div>
            <div className="text-sm text-gray-500">@{record.username}</div>
            <div className="text-xs text-gray-400">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: UserRole) => {
        const config = roleConfig[role];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      },
      filters: Object.entries(roleConfig).map(([key, config]) => ({
        text: config.label,
        value: key
      })),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: UserStatus) => {
        const config = statusConfig[status];
        return (
          <Badge 
            color={config.color} 
            text={
              <Space size={4}>
                {config.icon}
                {config.label}
              </Space>
            }
          />
        );
      },
      filters: Object.entries(statusConfig).map(([key, config]) => ({
        text: config.label,
        value: key
      })),
    },
    {
      title: '组织信息',
      key: 'organization',
      width: 180,
      render: (_, record) => (
        <div>
          <div className="text-sm">{record.organization || '-'}</div>
          <div className="text-xs text-gray-500">{record.department || '-'}</div>
          <div className="text-xs text-gray-400">{record.position || '-'}</div>
        </div>
      ),
    },
    {
      title: '登录统计',
      key: 'loginStats',
      width: 120,
      render: (_, record) => (
        <div className="text-center">
          <div className="text-sm font-medium">{record.login_count || 0}</div>
          <div className="text-xs text-gray-500">登录次数</div>
          {record.last_login_at && (
            <div className="text-xs text-gray-400">
              {new Date(record.last_login_at).toLocaleDateString('zh-CN')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => (
        <div className="text-sm">
          {new Date(date).toLocaleDateString('zh-CN')}
        </div>
      ),
      sorter: true,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setUserDetailDrawer({ visible: true, user: record })}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditUser()}
            />
          </Tooltip>
          <Tooltip title={record.status === 'active' ? '禁用' : '激活'}>
            <Button
              type="link"
              size="small"
              icon={record.status === 'active' ? <LockOutlined /> : <UnlockOutlined />}
              onClick={() => handleToggleUserStatus(record)}
              loading={actionLoading[record.id]}
            />
          </Tooltip>
          <Tooltip title="重置密码">
            <Button
              type="link"
              size="small"
              icon={<MailOutlined />}
              onClick={() => handleResetPassword(record)}
              loading={actionLoading[record.id]}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个用户吗？"
            description="删除后无法恢复，请谨慎操作。"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={actionLoading[record.id]}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 行选择配置
  const rowSelection: TableRowSelection<User> = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys as number[]);
    },
  };

  // 加载数据
  const loadData = useCallback(async (params?: UserQueryParams) => {
    setLoading(true);
    try {
      const queryParams = params || { page: 1, page_size: 20 };
      const response = await userService.getUsers(queryParams);
      
      setData(response.users);
      setPagination(prev => ({
        ...prev,
        current: response.pagination.page,
        total: response.pagination.total,
        pageSize: response.pagination.page_size,
      }));
    } catch (error) {
      message.error('加载用户数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载统计信息
  const loadStats = useCallback(async () => {
    try {
      const statsData = await userService.getUserStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  }, []);

  useEffect(() => {
    loadData(queryParams);
    loadStats();
  }, [loadData, loadStats, queryParams]);

  // 搜索处理
  const handleSearch = (value: string) => {
    const newParams = { ...queryParams, search: value, page: 1 };
    setQueryParams(newParams);
    loadData(newParams);
  };

  // 筛选处理
  const handleFilter = (values: any) => {
    const newParams = { ...queryParams, ...values, page: 1 };
    setQueryParams(newParams);
    loadData(newParams);
    setFilterVisible(false);
  };

  // 表格变化处理
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    const newParams = {
      ...queryParams,
      page: pagination.current,
      page_size: pagination.pageSize,
      ...filters,
    };

    if (sorter.field) {
      newParams.sort_by = sorter.field;
      newParams.sort_order = sorter.order === 'ascend' ? 'asc' : 'desc';
    }

    setQueryParams(newParams);
    loadData(newParams);
  };

  // 创建用户
  const handleCreateUser = async () => {
    try {
      const values = await createForm.validateFields();
      await userService.createUser(values);
      message.success('用户创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      loadData(queryParams);
      loadStats();
    } catch (error) {
      message.error('用户创建失败');
    }
  };

  // 编辑用户
  const handleEditUser = () => {
    Modal.info({
      title: '编辑用户',
      content: '编辑用户功能正在开发中，请使用详情页面进行编辑。',
    });
  };

  // 切换用户状态
  const handleToggleUserStatus = async (user: User) => {
    setActionLoading(prev => ({ ...prev, [user.id]: true }));
    try {
      if (user.status === 'active') {
        await userService.deactivateUser(user.id);
        message.success('用户已禁用');
      } else {
        await userService.activateUser(user.id);
        message.success('用户已激活');
      }
      loadData(queryParams);
      loadStats();
    } catch (error) {
      message.error('操作失败');
    } finally {
      setActionLoading(prev => ({ ...prev, [user.id]: false }));
    }
  };

  // 重置密码
  const handleResetPassword = async (user: User) => {
    setActionLoading(prev => ({ ...prev, [user.id]: true }));
    try {
      await userService.sendPasswordResetEmail(user.id);
      message.success('密码重置邮件已发送');
    } catch (error) {
      message.error('发送重置邮件失败');
    } finally {
      setActionLoading(prev => ({ ...prev, [user.id]: false }));
    }
  };

  // 删除用户
  const handleDeleteUser = async (id: number) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await userService.deleteUser(id);
      message.success('用户删除成功');
      loadData(queryParams);
      loadStats();
    } catch (error) {
      message.error('用户删除失败');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的用户');
      return;
    }

    Modal.confirm({
      title: '批量删除确认',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除选中的 ${selectedRowKeys.length} 个用户吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await userService.batchDeleteUsers(selectedRowKeys);
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          loadData(queryParams);
          loadStats();
        } catch (error) {
          message.error('批量删除失败');
        }
      },
    });
  };

  // 导出用户
  const handleExport = async (format: 'csv' | 'xlsx' = 'xlsx') => {
    try {
      const blob = await userService.exportUsers(queryParams, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('用户数据导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 导入用户
  const handleImport = async (file: File) => {
    try {
      const result = await userService.importUsers(file, {
        update_existing: false,
        send_welcome_email: true,
        default_role: 'user'
      });
      
      if (result.error_count > 0) {
        Modal.info({
          title: '导入完成',
          content: (
            <div>
              <p>成功导入: {result.success_count} 个用户</p>
              <p>失败: {result.error_count} 个用户</p>
              {result.errors.length > 0 && (
                <div className="mt-4">
                  <Text strong>错误详情:</Text>
                  <ul className="mt-2">
                    {result.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>第{error.row}行: {error.message}</li>
                    ))}
                    {result.errors.length > 5 && <li>...</li>}
                  </ul>
                </div>
              )}
            </div>
          ),
        });
      } else {
        message.success(`成功导入 ${result.success_count} 个用户`);
      }
      
      setImportModalVisible(false);
      loadData(queryParams);
      loadStats();
    } catch (error) {
      message.error('用户导入失败');
    }
  };

  // 下载模板
  const handleDownloadTemplate = async () => {
    try {
      const blob = await userService.getUserImportTemplate('xlsx');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'user_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('模板下载成功');
    } catch (error) {
      message.error('模板下载失败');
    }
  };

  // 渲染用户详情抽屉
  const renderUserDetailDrawer = () => {
    const { user } = userDetailDrawer;
    if (!user) return null;

    return (
      <Drawer
        title={
          <Space>
            <Avatar size={32} icon={<UserOutlined />} />
            <div>
              <div>{user.full_name}</div>
              <div className="text-sm text-gray-500">@{user.username}</div>
            </div>
          </Space>
        }
        width={600}
        open={userDetailDrawer.visible}
        onClose={() => setUserDetailDrawer({ visible: false })}
      >
        <div className="space-y-6">
          {/* 基本信息 */}
          <Card title="基本信息" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
              <Descriptions.Item label="姓名">{user.full_name}</Descriptions.Item>
              <Descriptions.Item label="电话">{user.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="角色">
                <Tag color={roleConfig[user.role].color} icon={roleConfig[user.role].icon}>
                  {roleConfig[user.role].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Badge 
                  color={statusConfig[user.status!].color} 
                  text={statusConfig[user.status!].label}
                />
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 组织信息 */}
          {(user.organization || user.department || user.position) && (
            <Card title="组织信息" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="组织">{user.organization || '-'}</Descriptions.Item>
                <Descriptions.Item label="部门">{user.department || '-'}</Descriptions.Item>
                <Descriptions.Item label="职位">{user.position || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {/* 统计信息 */}
          <Card title="统计信息" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="登录次数" value={user.login_count || 0} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="最后登录"
                  value={user.last_login_at ? new Date(user.last_login_at).toLocaleString('zh-CN') : '从未登录'}
                />
              </Col>
            </Row>
          </Card>

          {/* 时间信息 */}
          <Card title="时间信息" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="创建时间">
                {new Date(user.created_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {new Date(user.updated_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 操作按钮 */}
          <Card title="操作" size="small">
            <Space wrap>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => handleEditUser()}
              >
                编辑用户
              </Button>
              <Button
                icon={user.status === 'active' ? <LockOutlined /> : <UnlockOutlined />}
                onClick={() => handleToggleUserStatus(user)}
                loading={actionLoading[user.id]}
              >
                {user.status === 'active' ? '禁用用户' : '激活用户'}
              </Button>
              <Button
                icon={<MailOutlined />}
                onClick={() => handleResetPassword(user)}
                loading={actionLoading[user.id]}
              >
                重置密码
              </Button>
            </Space>
          </Card>
        </div>
      </Drawer>
    );
  };

  return (
    <div className="p-6">
      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="总用户数"
                value={stats.total_users}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="活跃用户"
                value={stats.active_users}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日新注册"
                value={stats.new_registrations_today}
                prefix={<PlusOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="本周新注册"
                value={stats.new_registrations_week}
                prefix={<PlusOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card>
        <div className="mb-4">
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} className="m-0">用户管理</Title>
            </Col>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                >
                  创建用户
                </Button>
                <Dropdown
                  menu={{
                    items: [
                      { key: 'xlsx', label: 'Excel格式(.xlsx)', onClick: () => handleExport('xlsx') },
                      { key: 'csv', label: 'CSV格式(.csv)', onClick: () => handleExport('csv') },
                    ]
                  }}
                >
                  <Button icon={<DownloadOutlined />}>
                    导出用户
                  </Button>
                </Dropdown>
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => setImportModalVisible(true)}
                >
                  导入用户
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => loadData(queryParams)}
                  loading={loading}
                >
                  刷新
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 搜索和筛选 */}
        <div className="mb-4">
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Search
                placeholder="搜索用户名、邮箱、姓名..."
                allowClear
                onSearch={handleSearch}
                className="w-full"
              />
            </Col>
            <Col>
              <Button
                icon={<FilterOutlined />}
                onClick={() => setFilterVisible(true)}
              >
                高级筛选
              </Button>
            </Col>
            {selectedRowKeys.length > 0 && (
              <Col>
                <Space>
                  <Text>已选择 {selectedRowKeys.length} 项</Text>
                  <Button 
                    danger
                    onClick={handleBatchDelete}
                  >
                    批量删除
                  </Button>
                </Space>
              </Col>
            )}
          </Row>
        </div>

        {/* 用户表格 */}
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          rowSelection={rowSelection}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>

      {/* 高级筛选弹窗 */}
      <Modal
        title="高级筛选"
        open={filterVisible}
        onCancel={() => setFilterVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFilter}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="用户角色" name="role">
                <Select placeholder="选择角色" allowClear>
                  {Object.entries(roleConfig).map(([key, config]) => (
                    <Option key={key} value={key}>
                      <Space>
                        {config.icon}
                        {config.label}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="用户状态" name="status">
                <Select placeholder="选择状态" allowClear>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <Option key={key} value={key}>
                      <Space>
                        {config.icon}
                        {config.label}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="组织" name="organization">
                <Input placeholder="请输入组织名称" />
              </Form.Item>
            </Col>
          </Row>
          <Row justify="end" gutter={8}>
            <Col>
              <Button onClick={() => form.resetFields()}>
                清除筛选
              </Button>
            </Col>
            <Col>
              <Button onClick={() => setFilterVisible(false)}>
                取消
              </Button>
            </Col>
            <Col>
              <Button type="primary" htmlType="submit">
                应用筛选
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 创建用户弹窗 */}
      <Modal
        title="创建用户"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        onOk={handleCreateUser}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{ role: 'user', status: 'active' }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="用户名"
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input placeholder="请输入用户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="姓名"
                name="full_name"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="密码"
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="角色"
                name="role"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select placeholder="请选择角色">
                  {Object.entries(roleConfig).map(([key, config]) => (
                    <Option key={key} value={key}>
                      <Space>
                        {config.icon}
                        {config.label}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="电话" name="phone">
                <Input placeholder="请输入电话号码" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="组织" name="organization">
                <Input placeholder="请输入组织名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="部门" name="department">
                <Input placeholder="请输入部门名称" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="职位" name="position">
                <Input placeholder="请输入职位" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 导入用户弹窗 */}
      <Modal
        title="导入用户"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        footer={null}
        width={500}
      >
        <div className="text-center py-8">
          <Upload.Dragger
            accept=".xlsx,.xls,.csv"
            multiple={false}
            beforeUpload={(file) => {
              handleImport(file);
              return false;
            }}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 Excel (.xlsx, .xls) 和 CSV 格式文件
            </p>
          </Upload.Dragger>
          
          <div className="mt-4">
            <Button
              type="link"
              onClick={handleDownloadTemplate}
            >
              下载导入模板
            </Button>
          </div>
        </div>
      </Modal>

      {/* 用户详情抽屉 */}
      {renderUserDetailDrawer()}
    </div>
  );
};

export default UserManagement; 