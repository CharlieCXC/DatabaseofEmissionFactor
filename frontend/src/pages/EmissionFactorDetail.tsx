import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Descriptions,
  Tag,
  Button,
  Space,
  message,
  Modal,
  Popconfirm,
  Progress,
  Divider,
  Timeline,
  Badge,
  Statistic,
  Tabs,
  Empty,
  Spin,
  Tooltip
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  HistoryOutlined,
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import emissionFactorService from '../services/emissionFactorService';
import type { EmissionFactor } from '../types/emission-factor';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const EmissionFactorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 数据状态
  const [data, setData] = useState<EmissionFactor | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);
  const [similarFactors, setSimilarFactors] = useState<EmissionFactor[]>([]);

  // UI状态
  const [activeTab, setActiveTab] = useState('details');

  // 加载数据
  const loadData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const emissionFactor = await emissionFactorService.getEmissionFactorById(id);
      setData(emissionFactor);
    } catch (error) {
      message.error('加载数据失败');
      navigate('/emission-factors');
    } finally {
      setLoading(false);
    }
  };

  // 加载版本历史
  const loadVersionHistory = async () => {
    if (!id) return;
    
    try {
      const history = await emissionFactorService.getVersionHistory(id);
      setVersionHistory(history);
    } catch (error) {
      console.error('加载版本历史失败:', error);
    }
  };

  // 加载相似排放因子
  const loadSimilarFactors = async () => {
    if (!id) return;
    
    try {
      const similar = await emissionFactorService.getSimilarEmissionFactors(id, 5);
      setSimilarFactors(similar);
    } catch (error) {
      console.error('加载相似排放因子失败:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (data) {
      loadVersionHistory();
      loadSimilarFactors();
    }
  }, [data]);

  // 删除排放因子
  const handleDelete = async () => {
    if (!id) return;
    
    setActionLoading(true);
    try {
      await emissionFactorService.deleteEmissionFactor(id);
      message.success('删除成功');
      navigate('/emission-factors');
    } catch (error) {
      message.error('删除失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 克隆排放因子
  const handleClone = async () => {
    if (!id || !data) return;
    
    setActionLoading(true);
    try {
      await emissionFactorService.cloneEmissionFactor(id, `${data.name} - 副本`);
      message.success('克隆成功');
      navigate('/emission-factors');
    } catch (error) {
      message.error('克隆失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 发布排放因子
  const handlePublish = async () => {
    if (!id) return;
    
    setActionLoading(true);
    try {
      const updated = await emissionFactorService.publishEmissionFactor(id);
      setData(updated);
      message.success('发布成功');
    } catch (error) {
      message.error('发布失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 归档排放因子
  const handleArchive = async () => {
    if (!id) return;
    
    setActionLoading(true);
    try {
      const updated = await emissionFactorService.archiveEmissionFactor(id);
      setData(updated);
      message.success('归档成功');
    } catch (error) {
      message.error('归档失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 恢复版本
  const handleRestoreVersion = async (version: number) => {
    if (!id) return;
    
    Modal.confirm({
      title: '确认恢复版本',
      content: `确定要将数据恢复到版本 ${version} 吗？当前的修改将会丢失。`,
      onOk: async () => {
        try {
          const restored = await emissionFactorService.restoreVersion(id, version);
          setData(restored);
          message.success('版本恢复成功');
          loadVersionHistory();
        } catch (error) {
          message.error('版本恢复失败');
        }
      }
    });
  };

  // 渲染状态标签
  const renderStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'default', text: '草稿', icon: <FileOutlined /> },
      published: { color: 'green', text: '已发布', icon: <CheckCircleOutlined /> },
      archived: { color: 'red', text: '已归档', icon: <ClockCircleOutlined /> }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge
        color={config.color}
        text={
          <Space size={4}>
            {config.icon}
            {config.text}
          </Space>
        }
      />
    );
  };

  // 渲染质量评分
  const renderQualityScore = (score?: number) => {
    if (!score && score !== 0) return '-';
    
    let color = '#d9d9d9';
    let status: 'success' | 'normal' | 'exception' = 'normal';
    
    if (score >= 80) {
      color = '#52c41a';
      status = 'success';
    } else if (score >= 50) {
      color = '#faad14';
    } else {
      color = '#f5222d';
      status = 'exception';
    }
    
    return (
      <Progress
        type="circle"
        percent={score}
        size={80}
        status={status}
        strokeColor={color}
        format={percent => `${percent}分`}
      />
    );
  };

  // 渲染详情标签页
  const renderDetailsTab = () => {
    if (!data) return null;

    return (
      <Row gutter={24}>
        <Col span={16}>
          <Card title="基础信息" className="mb-4">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="排放因子名称" span={2}>
                {data.name}
              </Descriptions.Item>
              <Descriptions.Item label="分类">
                <Tag color="blue">{data.category}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="子分类">
                {data.sub_category ? <Tag color="cyan">{data.sub_category}</Tag> : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="数值">
                <Text strong>{data.value.toLocaleString()} {data.unit}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="不确定性">
                {data.uncertainty ? `±${data.uncertainty}%` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="温室气体类型">
                <Tag color="green">{data.gas_type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="地理范围">
                <Tag color="orange">{data.geographical_scope}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="数据来源">
                {data.data_source}
              </Descriptions.Item>
              <Descriptions.Item label="参考年份">
                {data.reference_year || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="行业领域">
                {data.sector || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="活动类型">
                {data.activity || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="燃料类型">
                {data.fuel_type || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {renderStatusBadge(data.status)}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {data.description && (
            <Card title="描述" className="mb-4">
              <Paragraph>{data.description}</Paragraph>
            </Card>
          )}

          {data.methodology_description && (
            <Card title="方法学描述" className="mb-4">
              <Paragraph>{data.methodology_description}</Paragraph>
            </Card>
          )}

          {data.tags && data.tags.length > 0 && (
            <Card title="标签" className="mb-4">
              <Space wrap>
                {data.tags.map((tag, index) => (
                  <Tag key={index}>{tag}</Tag>
                ))}
              </Space>
            </Card>
          )}
        </Col>

        <Col span={8}>
          {/* 质量评分 */}
          <Card title="质量评分" className="mb-4">
            <div className="text-center">
              {renderQualityScore(data.quality_score)}
              <div className="mt-4">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="时间代表性"
                      value={data.temporal_representativeness || '-'}
                      suffix={data.temporal_representativeness ? '分' : ''}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="地理代表性"
                      value={data.geographical_representativeness || '-'}
                      suffix={data.geographical_representativeness ? '分' : ''}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="技术代表性"
                      value={data.technology_representativeness || '-'}
                      suffix={data.technology_representativeness ? '分' : ''}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="完整性"
                      value={data.completeness || '-'}
                      suffix={data.completeness ? '分' : ''}
                    />
                  </Col>
                </Row>
              </div>
            </div>
          </Card>

          {/* 创建和更新信息 */}
          <Card title="记录信息" className="mb-4">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="创建时间">
                {new Date(data.created_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {new Date(data.updated_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
              {data.created_by && (
                <Descriptions.Item label="创建者">
                  {data.created_by}
                </Descriptions.Item>
              )}
              {data.updated_by && (
                <Descriptions.Item label="更新者">
                  {data.updated_by}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* 相似排放因子 */}
          {similarFactors.length > 0 && (
            <Card title="相似排放因子" className="mb-4">
              <div className="space-y-2">
                {similarFactors.map(factor => (
                  <div
                    key={factor.id}
                    className="p-2 border rounded cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/emission-factors/${factor.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Text strong className="text-sm">{factor.name}</Text>
                        <div className="flex gap-1 mt-1">
                          <Tag color="blue">{factor.category}</Tag>
                          <Tag color="green">{factor.gas_type}</Tag>
                        </div>
                      </div>
                      <LinkOutlined className="text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </Col>
      </Row>
    );
  };

  // 渲染版本历史标签页
  const renderHistoryTab = () => {
    if (versionHistory.length === 0) {
      return <Empty description="暂无版本历史" />;
    }

    return (
      <Timeline>
        {versionHistory.map((version, index) => (
          <Timeline.Item
            key={version.version}
            color={index === 0 ? 'green' : 'blue'}
          >
            <div className="mb-2">
              <Space>
                <Text strong>版本 {version.version}</Text>
                <Text type="secondary">{new Date(version.created_at).toLocaleString('zh-CN')}</Text>
                <Text type="secondary">by {version.created_by}</Text>
                {index > 0 && (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => handleRestoreVersion(version.version)}
                  >
                    恢复此版本
                  </Button>
                )}
              </Space>
            </div>
            <div>
              {version.changes.map((change: string, idx: number) => (
                <div key={idx} className="mb-1">
                  <Text type="secondary">• {change}</Text>
                </div>
              ))}
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <Empty description="排放因子不存在" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        {/* 页面头部 */}
        <div className="mb-6">
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate('/emission-factors')}
                >
                  返回列表
                </Button>
                <Title level={3} className="m-0">{data.name}</Title>
                {renderStatusBadge(data.status)}
              </Space>
            </Col>
            <Col>
              <Space>
                <Tooltip title="编辑">
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/emission-factors/${id}/edit`)}
                  >
                    编辑
                  </Button>
                </Tooltip>
                <Tooltip title="克隆">
                  <Button
                    icon={<CopyOutlined />}
                    onClick={handleClone}
                    loading={actionLoading}
                  >
                    克隆
                  </Button>
                </Tooltip>
                {data.status === 'draft' && (
                  <Tooltip title="发布">
                    <Button
                      type="primary"
                      ghost
                      onClick={handlePublish}
                      loading={actionLoading}
                    >
                      发布
                    </Button>
                  </Tooltip>
                )}
                {data.status === 'published' && (
                  <Tooltip title="归档">
                    <Button
                      onClick={handleArchive}
                      loading={actionLoading}
                    >
                      归档
                    </Button>
                  </Tooltip>
                )}
                <Popconfirm
                  title="确定要删除这个排放因子吗？"
                  description="删除后无法恢复，请谨慎操作。"
                  onConfirm={handleDelete}
                  okText="确定"
                  cancelText="取消"
                  icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
                >
                  <Tooltip title="删除">
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      loading={actionLoading}
                    >
                      删除
                    </Button>
                  </Tooltip>
                </Popconfirm>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 标签页内容 */}
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="详细信息" key="details">
            {renderDetailsTab()}
          </TabPane>
          <TabPane
            tab={
              <Space>
                <HistoryOutlined />
                版本历史
              </Space>
            }
            key="history"
          >
            {renderHistoryTab()}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default EmissionFactorDetail; 