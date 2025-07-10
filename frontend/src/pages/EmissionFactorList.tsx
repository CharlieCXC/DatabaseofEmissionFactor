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
  Progress,
  Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/lib/table/interface';
import {
  PlusOutlined,
  FilterOutlined,
  DownloadOutlined,
  UploadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  CopyOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import emissionFactorService from '../services/emissionFactorService';
import { DataImport } from '../components/DataImport/DataImport';
import { DataExport } from '../components/DataExport/DataExport';
import type {
  EmissionFactor,
  EmissionFactorQueryParams,
  EmissionFactorStats
} from '../types/emission-factor';

const { Search } = Input;
const { Option } = Select;
const { Text, Title } = Typography;

const EmissionFactorList: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // 数据状态
  const [data, setData] = useState<EmissionFactor[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<EmissionFactorStats | null>(null);
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) => 
      `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`
  });

  // 查询参数
  const [queryParams, setQueryParams] = useState<EmissionFactorQueryParams>({
    page: 1,
    page_size: 20,
    sort_by: 'updated_at',
    sort_order: 'desc'
  });

  // 选择状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [_selectedRows, setSelectedRows] = useState<EmissionFactor[]>([]);

  // UI状态
  const [filterVisible, setFilterVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);

  // 表格列定义
  const columns: ColumnsType<EmissionFactor> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: EmissionFactor) => (
        <Link 
          to={`/emission-factors/${record.id}`}
          className="text-blue-600 hover:text-blue-800"
        >
          {text}
        </Link>
      ),
      sorter: true,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
      filters: stats?.categories.map(cat => ({ text: cat.category, value: cat.category })) || [],
    },
    {
      title: '子分类',
      dataIndex: 'sub_category',
      key: 'sub_category',
      width: 120,
      render: (text: string) => text ? <Tag color="cyan">{text}</Tag> : '-',
    },
    {
      title: '数值',
      dataIndex: 'value',
      key: 'value',
      width: 100,
      render: (value: number, record: EmissionFactor) => (
        <span>
          {value.toLocaleString()} {record.unit}
        </span>
      ),
      sorter: true,
    },
    {
      title: '温室气体',
      dataIndex: 'gas_type',
      key: 'gas_type',
      width: 100,
      render: (text: string) => <Tag color="green">{text}</Tag>,
      filters: stats?.gas_types.map(gas => ({ text: gas.gas_type, value: gas.gas_type })) || [],
    },
    {
      title: '地理范围',
      dataIndex: 'geographical_scope',
      key: 'geographical_scope',
      width: 120,
      render: (text: string) => <Tag color="orange">{text}</Tag>,
    },
    {
      title: '质量评分',
      dataIndex: 'quality_score',
      key: 'quality_score',
      width: 120,
      render: (score: number) => {
        if (!score && score !== 0) return '-';
        
        let color = 'default';
        let status: 'success' | 'normal' | 'exception' = 'normal';
        
        if (score >= 80) {
          color = 'green';
          status = 'success';
        } else if (score >= 50) {
          color = 'orange';
        } else {
          color = 'red';
          status = 'exception';
        }
        
        return (
          <Progress
            percent={score}
            size="small"
            status={status}
            strokeColor={color}
            format={percent => `${percent}%`}
          />
        );
      },
      sorter: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const statusConfig = {
          draft: { color: 'gray', text: '草稿' },
          published: { color: 'green', text: '已发布' },
          archived: { color: 'red', text: '已归档' }
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Badge color={config.color} text={config.text} />;
      },
      filters: [
        { text: '草稿', value: 'draft' },
        { text: '已发布', value: 'published' },
        { text: '已归档', value: 'archived' }
      ],
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
      sorter: true,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record: EmissionFactor) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/emission-factors/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/emission-factors/${record.id}/edit`)}
            />
          </Tooltip>
          <Tooltip title="克隆">
            <Button
              type="link"
              icon={<CopyOutlined />}
              onClick={() => handleClone(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个排放因子吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 行选择配置
  const rowSelection: TableRowSelection<EmissionFactor> = {
    selectedRowKeys,
    onChange: (keys: React.Key[], rows: EmissionFactor[]) => {
      setSelectedRowKeys(keys as string[]);
      setSelectedRows(rows);
    },
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
  };

  // 加载数据
  const loadData = useCallback(async (params?: EmissionFactorQueryParams) => {
    setLoading(true);
    try {
      const queryParams = params || { page: 1, page_size: 20 };
      const response = await emissionFactorService.getEmissionFactors(queryParams);
      
      setData(response.emission_factors);
      setPagination(prev => ({
        ...prev,
        current: response.page,
        total: response.total,
        pageSize: response.page_size,
      }));
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载统计信息
  const loadStats = useCallback(async () => {
    try {
      const statsData = await emissionFactorService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  }, []);

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

  // 清除筛选
  const handleClearFilters = () => {
    form.resetFields();
    const newParams: EmissionFactorQueryParams = {
      page: 1,
      page_size: queryParams.page_size,
      sort_by: 'updated_at',
      sort_order: 'desc'
    };
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

  // 删除处理
  const handleDelete = async (id: string) => {
    try {
      await emissionFactorService.deleteEmissionFactor(id);
      message.success('删除成功');
      loadData(queryParams);
      loadStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的项目');
      return;
    }

    Modal.confirm({
      title: '批量删除确认',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除选中的 ${selectedRowKeys.length} 个排放因子吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await emissionFactorService.batchDeleteEmissionFactors(selectedRowKeys);
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          setSelectedRows([]);
          loadData(queryParams);
          loadStats();
        } catch (error) {
          message.error('批量删除失败');
        }
      },
    });
  };

  // 克隆处理
  const handleClone = async (record: EmissionFactor) => {
    try {
      await emissionFactorService.cloneEmissionFactor(record.id, `${record.name} - 副本`);
      message.success('克隆成功');
      loadData(queryParams);
    } catch (error) {
      message.error('克隆失败');
    }
  };

  // 这些函数已经迁移到新的组件中，暂时保留以备后用
  // const handleExport = async (format: 'csv' | 'xlsx' = 'xlsx') => {
  //   try {
  //     setLoading(true);
  //     const data = await emissionFactorService.exportData(queryParams);
  //     
  //     // 这里应该处理数据格式化和文件生成
  //     // 为简化示例，直接显示成功消息
  //     message.success(`成功导出 ${data.length} 条数据`);
  //   } catch (error) {
  //     message.error('导出失败');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const handleImport = async (file: File) => {
  //   try {
  //     // 这里的具体实现应该在DataImport组件中处理
  //     message.success('导入功能已集成到新的导入组件中');
  //   } catch (error: any) {
  //     message.error('导入失败：' + error.message);
  //   } finally {
  //     // setImportLoading(false); // This line was removed
  //   }
  // };

  // const beforeUpload = (file: File) => {
  //   const isExcel = 
  //     file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
  //     file.type === 'application/vnd.ms-excel';
  //   
  //   if (!isExcel) {
  //     message.error('只能上传Excel文件！');
  //     return false;
  //   }

  //   const isLt10M = file.size / 1024 / 1024 < 10;
  //   if (!isLt10M) {
  //     message.error('文件大小不能超过10MB！');
  //     return false;
  //   }

  //   handleImport(file);
  //   return false; // 阻止自动上传
  // };

  // const handleDownloadTemplate = async () => {
  //   try {
  //     const blob = await emissionFactorService.downloadTemplate();
  //     const url = window.URL.createObjectURL(blob);
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.download = '排放因子导入模板.xlsx';
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //     window.URL.revokeObjectURL(url);
  //     message.success('模板下载成功');
  //   } catch (error) {
  //     message.error('模板下载失败');
  //   }
  // };

  // 批量操作菜单
  const batchMenuItems = [
    {
      key: 'delete',
      label: '批量删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: handleBatchDelete,
    },
  ];

  // 导出菜单
  const exportMenuItems = [
    {
      key: 'export',
      label: '打开导出设置',
      icon: <DownloadOutlined />,
      onClick: () => setExportModalVisible(true),
    },
  ];

  useEffect(() => {
    loadData(queryParams);
    loadStats();
  }, []);

  return (
    <div className="p-6">
      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="总计"
                value={stats.total_count}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已发布"
                value={stats.published_count}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="草稿"
                value={stats.draft_count}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已归档"
                value={stats.archived_count}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card>
        <div className="mb-4">
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} className="m-0">排放因子管理</Title>
            </Col>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/emission-factors/create')}
                >
                  新建排放因子
                </Button>
                <Dropdown menu={{ items: exportMenuItems }}>
                  <Button icon={<DownloadOutlined />}>
                    导出数据
                  </Button>
                </Dropdown>
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => setImportModalVisible(true)}
                >
                  导入数据
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
                placeholder="搜索排放因子名称、描述..."
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
                  <Dropdown menu={{ items: batchMenuItems }}>
                    <Button>批量操作</Button>
                  </Dropdown>
                </Space>
              </Col>
            )}
          </Row>
        </div>

        {/* 数据表格 */}
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
              <Form.Item label="分类" name="category">
                <Select placeholder="选择分类" allowClear>
                  {stats?.categories.map(cat => (
                    <Option key={cat.category} value={cat.category}>
                      {cat.category} ({cat.count})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="温室气体类型" name="gas_type">
                <Select placeholder="选择气体类型" allowClear>
                  {stats?.gas_types.map(gas => (
                    <Option key={gas.gas_type} value={gas.gas_type}>
                      {gas.gas_type} ({gas.count})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="状态" name="status">
                <Select placeholder="选择状态" allowClear>
                  <Option value="draft">草稿</Option>
                  <Option value="published">已发布</Option>
                  <Option value="archived">已归档</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="质量评分范围" name="quality_range">
                <Select placeholder="选择质量范围" allowClear>
                  <Option value="high">高质量 (80分以上)</Option>
                  <Option value="medium">中等质量 (50-79分)</Option>
                  <Option value="low">低质量 (50分以下)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row justify="end" gutter={8}>
            <Col>
              <Button onClick={handleClearFilters}>
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

      {/* 数据导入组件 */}
      <DataImport
        visible={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onSuccess={() => {
          setImportModalVisible(false);
          loadData(queryParams);
          loadStats();
          message.success('数据导入成功，列表已刷新');
        }}
      />

      {/* 数据导出组件 */}
      <DataExport
        visible={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        currentFilters={queryParams}
      />
    </div>
  );
};

export default EmissionFactorList; 