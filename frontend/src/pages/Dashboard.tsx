import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Typography, 
  Space, 
  Button,
  List,
  Avatar,
  Badge,
  Spin
} from 'antd';
import {
  DatabaseOutlined,
  UserOutlined,
  TrophyOutlined,
  SyncOutlined,
  PlusOutlined,
  SearchOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../stores/authStore';

const { Title, Paragraph, Text } = Typography;

// 模拟数据
const mockStats = {
  totalFactors: 1248,
  categories: 15,
  countries: 8,
  recentUpdates: 23
};

const mockRecentFactors = [
  {
    id: 1,
    name: '华北电网燃煤发电',
    category: '电力',
    value: '0.8241 kgCO2eq/kWh',
    updatedAt: '2024-01-15',
    quality: 'A'
  },
  {
    id: 2,
    name: '全国电网平均',
    category: '电力',
    value: '0.5703 kgCO2eq/kWh',
    updatedAt: '2024-01-15',
    quality: 'A'
  },
  {
    id: 3,
    name: '汽油乘用车',
    category: '交通',
    value: '2.31 kgCO2/L',
    updatedAt: '2024-01-14',
    quality: 'B'
  }
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟数据加载
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="mb-2">
            欢迎回来，{user?.full_name || user?.username}
          </Title>
          <Paragraph className="text-gray-600 mb-0">
            今天是个管理排放因子数据的好日子！
          </Paragraph>
        </div>
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/emission-factors/create')}
          >
            添加排放因子
          </Button>
          <Button 
            icon={<SearchOutlined />}
            onClick={() => navigate('/emission-factors')}
          >
            搜索因子
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="排放因子总数"
              value={mockStats.totalFactors}
              prefix={<DatabaseOutlined className="text-blue-600" />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="覆盖类别"
              value={mockStats.categories}
              prefix={<BarChartOutlined className="text-green-600" />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="覆盖国家/地区"
              value={mockStats.countries}
              prefix={<TrophyOutlined className="text-orange-600" />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本月更新"
              value={mockStats.recentUpdates}
              prefix={<SyncOutlined className="text-purple-600" />}
              suffix="次"
            />
          </Card>
        </Col>
      </Row>

      {/* 内容区域 */}
      <Row gutter={[16, 16]}>
        {/* 最近更新的排放因子 */}
        <Col xs={24} lg={16}>
          <Card 
            title="最近更新的排放因子" 
            extra={
              <Button type="link" onClick={() => navigate('/emission-factors')}>
                查看全部
              </Button>
            }
          >
            <List
              itemLayout="horizontal"
              dataSource={mockRecentFactors}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button type="link" key="view">
                      查看
                    </Button>,
                    <Button type="link" key="edit">
                      编辑
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar className="bg-blue-100">
                        <DatabaseOutlined className="text-blue-600" />
                      </Avatar>
                    }
                    title={
                      <Space>
                        <span>{item.name}</span>
                        <Badge 
                          count={item.quality} 
                          color={item.quality === 'A' ? 'green' : 'orange'}
                        />
                      </Space>
                    }
                    description={
                      <div>
                        <Text type="secondary">{item.category}</Text>
                        <span className="mx-2">•</span>
                        <Text strong>{item.value}</Text>
                        <span className="mx-2">•</span>
                        <Text type="secondary">更新于 {item.updatedAt}</Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 快捷操作 */}
        <Col xs={24} lg={8}>
          <Card title="快捷操作">
            <Space direction="vertical" className="w-full">
              <Button 
                block 
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/emission-factors/create')}
              >
                添加新的排放因子
              </Button>
              <Button 
                block
                icon={<SearchOutlined />}
                onClick={() => navigate('/emission-factors')}
              >
                搜索排放因子
              </Button>
              <Button 
                block
                icon={<BarChartOutlined />}
                onClick={() => navigate('/emission-factors')}
              >
                查看统计报告
              </Button>
              {user?.role === 'admin' && (
                <Button 
                  block
                  icon={<UserOutlined />}
                  onClick={() => navigate('/users')}
                >
                  用户管理
                </Button>
              )}
            </Space>
          </Card>

          {/* 系统状态 */}
          <Card title="系统状态" className="mt-4">
            <Space direction="vertical" className="w-full">
              <div className="flex justify-between">
                <Text>数据库状态</Text>
                <Badge status="success" text="正常" />
              </div>
              <div className="flex justify-between">
                <Text>API服务</Text>
                <Badge status="success" text="运行中" />
              </div>
              <div className="flex justify-between">
                <Text>最后同步</Text>
                <Text type="secondary">刚刚</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard; 