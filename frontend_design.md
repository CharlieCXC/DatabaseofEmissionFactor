# 前端界面设计方案

## 整体布局结构

```tsx
// 主布局组件
const EmissionFactorLayout = () => {
  return (
    <Layout>
      <Header>
        <div className="logo">排放因子管理系统</div>
        <Menu mode="horizontal">
          <Menu.Item key="factors">因子管理</Menu.Item>
          <Menu.Item key="search">因子查询</Menu.Item>
          <Menu.Item key="import">数据导入</Menu.Item>
          <Menu.Item key="export">数据导出</Menu.Item>
        </Menu>
      </Header>
      
      <Content>
        <Routes>
          <Route path="/factors" element={<FactorManagement />} />
          <Route path="/search" element={<FactorSearch />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/export" element={<DataExport />} />
        </Routes>
      </Content>
    </Layout>
  );
};
```

## 核心页面设计

### 1. 排放因子管理页面 (`/factors`)

```tsx
// 主要功能：列表展示、新增、编辑、删除
const FactorManagement = () => {
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchForm] = Form.useForm();

  // 表格列定义
  const columns = [
    {
      title: '活动类别',
      dataIndex: ['activity_category', 'display_name_cn'],
      width: 200,
      render: (text, record) => (
        <Tooltip title={`${record.activity_category.level_1} > ${record.activity_category.level_2} > ${record.activity_category.level_3}`}>
          {text}
        </Tooltip>
      )
    },
    {
      title: '地理范围', 
      dataIndex: ['geographic_scope', 'display_name_cn'],
      width: 150
    },
    {
      title: '排放因子',
      width: 150,
      render: (record) => (
        <span>
          {record.emission_value.value} {record.emission_value.unit}
        </span>
      )
    },
    {
      title: '参考年份',
      dataIndex: ['emission_value', 'reference_year'],
      width: 100
    },
    {
      title: '质量等级',
      dataIndex: ['quality_info', 'grade'],
      width: 100,
      render: (grade) => (
        <Badge 
          color={getGradeColor(grade)} 
          text={grade}
        />
      )
    },
    {
      title: '数据来源',
      dataIndex: ['data_source', 'organization'],
      width: 150
    },
    {
      title: '操作',
      width: 150,
      render: (record) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="factor-management">
      {/* 搜索区域 */}
      <Card className="search-card">
        <Form form={searchForm} layout="inline">
          <Form.Item name="category_l1" label="一级分类">
            <Select placeholder="选择分类" style={{ width: 120 }}>
              <Option value="Energy">能源</Option>
              <Option value="Transport">交通</Option>
              <Option value="Industry">工业</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="country_code" label="国家">
            <Select placeholder="选择国家" style={{ width: 100 }}>
              <Option value="CN">中国</Option>
              <Option value="US">美国</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="reference_year" label="年份">
            <DatePicker picker="year" placeholder="选择年份" />
          </Form.Item>
          
          <Form.Item name="quality_grade" label="质量等级">
            <Select mode="multiple" placeholder="选择等级" style={{ width: 120 }}>
              <Option value="A">A级</Option>
              <Option value="B">B级</Option>
              <Option value="C">C级</Option>
              <Option value="D">D级</Option>
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" onClick={handleSearch}>
              搜索
            </Button>
            <Button onClick={handleReset} style={{ marginLeft: 8 }}>
              重置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 操作工具栏 */}
      <Card className="toolbar-card">
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增排放因子
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => setImportVisible(true)}>
            批量导入
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出数据
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
        </Space>
      </Card>

      {/* 数据表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={factors}
          loading={loading}
          rowKey="uuid"
          pagination={{
            total: total,
            pageSize: pageSize,
            current: currentPage,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <FactorFormModal
        visible={formVisible}
        onCancel={() => setFormVisible(false)}
        onSuccess={handleFormSuccess}
        initialValues={editingFactor}
      />
    </div>
  );
};
```

### 2. 排放因子表单组件

```tsx
const FactorFormModal = ({ visible, onCancel, onSuccess, initialValues }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const formattedData = {
        activity_category: {
          level_1: values.category_l1,
          level_2: values.category_l2,
          level_3: values.category_l3,
          display_name_cn: values.display_name_cn
        },
        geographic_scope: {
          country_code: values.country_code,
          region: values.region,
          display_name_cn: values.geo_display_name_cn
        },
        emission_value: {
          value: values.emission_value,
          unit: values.emission_unit,
          reference_year: values.reference_year
        },
        data_source: {
          organization: values.organization,
          publication: values.publication,
          url: values.source_url,
          publication_date: values.publication_date
        },
        quality_info: {
          grade: values.quality_grade,
          confidence: values.confidence,
          last_review_date: new Date().toISOString().split('T')[0],
          notes: values.notes
        }
      };

      if (initialValues?.uuid) {
        await updateEmissionFactor(initialValues.uuid, formattedData);
      } else {
        await createEmissionFactor(formattedData);
      }
      
      message.success('保存成功');
      onSuccess();
    } catch (error) {
      message.error('保存失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={initialValues ? '编辑排放因子' : '新增排放因子'}
      visible={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={transformToFormValues(initialValues)}
      >
        {/* 活动分类区域 */}
        <Card title="活动分类" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item 
                name="category_l1" 
                label="一级分类" 
                rules={[{ required: true, message: '请选择一级分类' }]}
              >
                <Select placeholder="选择一级分类">
                  <Option value="Energy">能源</Option>
                  <Option value="Transport">交通</Option>
                  <Option value="Industry">工业</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                name="category_l2" 
                label="二级分类"
                rules={[{ required: true, message: '请选择二级分类' }]}
              >
                <Select placeholder="选择二级分类">
                  <Option value="Electricity">电力</Option>
                  <Option value="Heat">供热</Option>
                  <Option value="Road">公路</Option>
                  <Option value="Steel">钢铁</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                name="category_l3" 
                label="三级分类"
                rules={[{ required: true, message: '请选择三级分类' }]}
              >
                <Select placeholder="选择三级分类">
                  <Option value="Coal_Power">燃煤发电</Option>
                  <Option value="Gas_Power">燃气发电</Option>
                  <Option value="Gasoline_Car">汽油车</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item 
            name="display_name_cn" 
            label="中文显示名称"
            rules={[{ required: true, message: '请输入中文显示名称' }]}
          >
            <Input placeholder="例如：华北电网燃煤发电" />
          </Form.Item>
        </Card>

        {/* 地理范围区域 */}
        <Card title="地理范围" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="country_code" 
                label="国家代码"
                rules={[{ required: true, message: '请选择国家' }]}
              >
                <Select placeholder="选择国家">
                  <Option value="CN">CN - 中国</Option>
                  <Option value="US">US - 美国</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="region" 
                label="地区代码"
                rules={[{ required: true, message: '请输入地区代码' }]}
              >
                <Input placeholder="例如：North_China_Grid" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item 
            name="geo_display_name_cn" 
            label="地理范围中文名称"
            rules={[{ required: true, message: '请输入地理范围中文名称' }]}
          >
            <Input placeholder="例如：华北电网" />
          </Form.Item>
        </Card>

        {/* 排放数值区域 */}
        <Card title="排放数值" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item 
                name="emission_value" 
                label="排放因子数值"
                rules={[
                  { required: true, message: '请输入排放因子数值' },
                  { type: 'number', min: 0, message: '数值必须大于等于0' }
                ]}
              >
                <InputNumber 
                  style={{ width: '100%' }} 
                  placeholder="0.0000"
                  precision={4}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                name="emission_unit" 
                label="单位"
                rules={[{ required: true, message: '请选择单位' }]}
              >
                <Select placeholder="选择单位">
                  <Option value="kgCO2eq/kWh">kgCO2eq/kWh</Option>
                  <Option value="kgCO2eq/km">kgCO2eq/km</Option>
                  <Option value="kgCO2eq/kg">kgCO2eq/kg</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                name="reference_year" 
                label="参考年份"
                rules={[{ required: true, message: '请选择参考年份' }]}
              >
                <DatePicker 
                  picker="year" 
                  style={{ width: '100%' }}
                  placeholder="选择年份"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 数据来源区域 */}
        <Card title="数据来源" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="organization" 
                label="数据机构"
                rules={[{ required: true, message: '请输入数据机构' }]}
              >
                <Input placeholder="例如：中国电力企业联合会" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="publication_date" 
                label="发布日期"
                rules={[{ required: true, message: '请选择发布日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item 
            name="publication" 
            label="发布物"
            rules={[{ required: true, message: '请输入发布物名称' }]}
          >
            <Input placeholder="例如：中国电力行业年度发展报告2024" />
          </Form.Item>
          <Form.Item name="source_url" label="来源链接">
            <Input placeholder="https://..." />
          </Form.Item>
        </Card>

        {/* 质量信息区域 */}
        <Card title="质量信息" size="small">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item 
                name="quality_grade" 
                label="质量等级"
                rules={[{ required: true, message: '请选择质量等级' }]}
              >
                <Select placeholder="选择质量等级">
                  <Option value="A">A级 - 高质量</Option>
                  <Option value="B">B级 - 较高质量</Option>
                  <Option value="C">C级 - 中等质量</Option>
                  <Option value="D">D级 - 参考质量</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                name="confidence" 
                label="信心等级"
                rules={[{ required: true, message: '请选择信心等级' }]}
              >
                <Select placeholder="选择信心等级">
                  <Option value="High">高信心</Option>
                  <Option value="Medium">中等信心</Option>
                  <Option value="Low">低信心</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="可选备注信息..." />
          </Form.Item>
        </Card>
      </Form>
    </Modal>
  );
};
```

## 关键工具函数

```tsx
// 质量等级颜色映射
const getGradeColor = (grade) => {
  const colorMap = {
    'A': 'success',
    'B': 'processing', 
    'C': 'warning',
    'D': 'error'
  };
  return colorMap[grade] || 'default';
};

// 表单数据转换
const transformToFormValues = (data) => {
  if (!data) return {};
  
  return {
    category_l1: data.activity_category?.level_1,
    category_l2: data.activity_category?.level_2,
    category_l3: data.activity_category?.level_3,
    display_name_cn: data.activity_category?.display_name_cn,
    country_code: data.geographic_scope?.country_code,
    region: data.geographic_scope?.region,
    geo_display_name_cn: data.geographic_scope?.display_name_cn,
    emission_value: data.emission_value?.value,
    emission_unit: data.emission_value?.unit,
    reference_year: data.emission_value?.reference_year ? moment(data.emission_value.reference_year.toString()) : undefined,
    organization: data.data_source?.organization,
    publication: data.data_source?.publication,
    source_url: data.data_source?.url,
    publication_date: data.data_source?.publication_date ? moment(data.data_source.publication_date) : undefined,
    quality_grade: data.quality_info?.grade,
    confidence: data.quality_info?.confidence,
    notes: data.quality_info?.notes
  };
};
```

## 项目结构

```
src/
├── components/
│   ├── EmissionFactor/
│   │   ├── FactorManagement.tsx      # 主管理页面
│   │   ├── FactorFormModal.tsx       # 表单弹窗
│   │   ├── FactorSearch.tsx          # 搜索页面  
│   │   ├── DataImport.tsx            # 数据导入
│   │   └── DataExport.tsx            # 数据导出
│   └── Layout/
│       └── EmissionFactorLayout.tsx  # 布局组件
├── services/
│   └── emissionFactorApi.ts          # API调用服务
├── types/
│   └── emissionFactor.ts             # 类型定义
├── utils/
│   ├── constants.ts                  # 常量定义
│   └── helpers.ts                    # 工具函数
└── App.tsx
``` 