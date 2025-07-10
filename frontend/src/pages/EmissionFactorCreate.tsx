import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Card,
  Row,
  Col,
  Steps,
  Typography,
  Space,
  message,
  Divider,
  Tag,
  Progress,
  Alert,
  Tooltip,
  Modal,
} from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import emissionFactorService from '../services/emissionFactorService';
import PedigreeMatrix, { type QualityAssessmentResult } from '../components/QualityAssessment/PedigreeMatrix';
import type {
  CreateEmissionFactorRequest,
  FormOptions,
  QualityScore
} from '../types/emission-factor';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const EmissionFactorCreate: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // 表单数据状态
  const [formData, setFormData] = useState<Partial<CreateEmissionFactorRequest>>({
    status: 'draft'
  });
  const [formOptions, setFormOptions] = useState<FormOptions | null>(null);
  
  // UI状态
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [qualityScore, _setQualityScore] = useState<QualityScore | null>(null);
  const [_qualityAssessment, setQualityAssessment] = useState<QualityAssessmentResult | null>(null);
  const [_calculating, _setCalculating] = useState(false);

  // 步骤定义
  const steps = [
    {
      title: '基础信息',
      description: '填写排放因子基本信息'
    },
    {
      title: '技术参数',
      description: '设置数值和技术参数'
    },
    {
      title: '质量评估',
      description: '质量评分和数据验证'
    },
    {
      title: '确认提交',
      description: '预览并提交数据'
    }
  ];

  // 加载表单选项数据
  useEffect(() => {
    const loadFormOptions = async () => {
      try {
        const options = await emissionFactorService.getFormOptions();
        setFormOptions(options);
      } catch (error) {
        message.error('加载表单选项失败');
      }
    };

    loadFormOptions();
  }, []);

  // 监听表单值变化
  const handleFormChange = (_changedValues: any, allValues: any) => {
    setFormData(allValues);
  };

  // 计算质量评分 - TODO: 实现质量评分计算功能
  // const calculateQualityScore = async () => {
  //   const values = form.getFieldsValue();
  //   
  //   if (!values.temporal_representativeness || 
  //       !values.geographical_representativeness || 
  //       !values.technology_representativeness || 
  //       !values.completeness) {
  //     message.warning('请先填写所有质量评估字段');
  //     return;
  //   }

  //   setCalculating(true);
  //   try {
  //     const score = await emissionFactorService.calculateQualityScore({
  //       temporal_representativeness: values.temporal_representativeness,
  //       geographical_representativeness: values.geographical_representativeness,
  //       technology_representativeness: values.technology_representativeness,
  //       completeness: values.completeness
  //     });
  //     
  //     setQualityScore(score);
  //     form.setFieldValue('quality_score', score.overall_score);
  //     message.success('质量评分计算完成');
  //   } catch (error) {
  //     message.error('质量评分计算失败');
  //   } finally {
  //     setCalculating(false);
  //   }
  // };

  // 验证表单数据
  const validateForm = async () => {
    try {
      const values = await form.validateFields();
      
      // TODO: 实现后端验证接口
      // const result = await emissionFactorService.validateImportData([values]);
      
      // 暂时使用前端基础验证
      if (!values.name || !values.category || !values.value || !values.unit) {
        Modal.error({
          title: '数据验证失败',
          content: '请填写所有必填字段'
        });
        return false;
      }

      // 如果需要显示警告（示例）
      const warnings: Array<{field: string; message: string}> = [];
      if (values.value && values.value > 10) {
        warnings.push({
          field: '排放值',
          message: '数值较大，请确认是否正确'
        });
      }

      if (warnings.length > 0) {
        Modal.warning({
          title: '数据验证警告',
          content: (
            <div>
              {warnings.map((warning: {field: string; message: string}, index: number) => (
                <div key={index} className="mb-2">
                  <Text strong>{warning.field}:</Text> {warning.message}
                </div>
              ))}
            </div>
          )
        });
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    setLoading(true);
    try {
      const values = form.getFieldsValue();
      await emissionFactorService.createEmissionFactor(values);
      message.success('排放因子创建成功');
      navigate('/emission-factors');
    } catch (error) {
      message.error('创建失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存草稿
  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      values.status = 'draft';
      await emissionFactorService.createEmissionFactor(values);
      message.success('草稿保存成功');
      navigate('/emission-factors');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 步骤导航
  const nextStep = async () => {
    if (currentStep < steps.length - 1) {
      // 验证当前步骤的必填字段
      const fieldsToValidate = getStepFields(currentStep);
      try {
        await form.validateFields(fieldsToValidate);
        setCurrentStep(currentStep + 1);
      } catch (error) {
        message.error('请完成当前步骤的必填项');
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 获取步骤字段
  const getStepFields = (step: number): string[] => {
    switch (step) {
      case 0:
        return ['name', 'category', 'unit', 'data_source', 'geographical_scope', 'gas_type'];
      case 1:
        return ['value'];
      case 2:
        return ['temporal_representativeness', 'geographical_representativeness', 
                'technology_representativeness', 'completeness'];
      default:
        return [];
    }
  };

  // 渲染质量评分 - TODO: 实现质量评分显示功能
  // const renderQualityScore = () => {
  //   if (!qualityScore) return null;

  //   return (
  //     <Card size="small" className="mb-4">
  //       <Title level={5}>质量评分详情</Title>
  //       <Row gutter={16}>
  //         <Col span={6}>
  //           <Statistic
  //             title="时间代表性"
  //             value={qualityScore.temporal_representativeness}
  //             suffix="分"
  //           />
  //         </Col>
  //         <Col span={6}>
  //           <Statistic
  //             title="地理代表性"
  //             value={qualityScore.geographical_representativeness}
  //             suffix="分"
  //           />
  //         </Col>
  //         <Col span={6}>
  //           <Statistic
  //             title="技术代表性"
  //             value={qualityScore.technology_representativeness}
  //             suffix="分"
  //           />
  //         </Col>
  //         <Col span={6}>
  //           <Statistic
  //             title="完整性"
  //             value={qualityScore.completeness}
  //             suffix="分"
  //           />
  //         </Col>
  //       </Row>
  //       <Divider />
  //       <div className="text-center">
  //         <Progress
  //           type="circle"
  //           percent={qualityScore.overall_score}
  //           format={percent => `${percent}分`}
  //           strokeColor={qualityScore.overall_score >= 80 ? '#52c41a' : 
  //                       qualityScore.overall_score >= 50 ? '#faad14' : '#f5222d'}
  //         />
  //         <div className="mt-2">
  //           <Text strong>综合质量评分</Text>
  //         </div>
  //       </div>
  //     </Card>
  //   );
  // };

  // 渲染预览
  const renderPreview = () => {
    const values = form.getFieldsValue();
    
    return (
      <Card>
        <Title level={4}>排放因子预览</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Paragraph>
              <Text strong>名称：</Text>{values.name || '-'}
            </Paragraph>
            <Paragraph>
              <Text strong>分类：</Text>{values.category || '-'}
            </Paragraph>
            <Paragraph>
              <Text strong>子分类：</Text>{values.sub_category || '-'}
            </Paragraph>
            <Paragraph>
              <Text strong>数值：</Text>{values.value || 0} {values.unit || ''}
            </Paragraph>
            <Paragraph>
              <Text strong>不确定性：</Text>{values.uncertainty ? `±${values.uncertainty}%` : '-'}
            </Paragraph>
            <Paragraph>
              <Text strong>温室气体类型：</Text>{values.gas_type || '-'}
            </Paragraph>
          </Col>
          <Col span={12}>
            <Paragraph>
              <Text strong>数据来源：</Text>{values.data_source || '-'}
            </Paragraph>
            <Paragraph>
              <Text strong>参考年份：</Text>{values.reference_year || '-'}
            </Paragraph>
            <Paragraph>
              <Text strong>地理范围：</Text>{values.geographical_scope || '-'}
            </Paragraph>
            <Paragraph>
              <Text strong>行业领域：</Text>{values.sector || '-'}
            </Paragraph>
            <Paragraph>
              <Text strong>活动类型：</Text>{values.activity || '-'}
            </Paragraph>
            <Paragraph>
              <Text strong>燃料类型：</Text>{values.fuel_type || '-'}
            </Paragraph>
          </Col>
        </Row>
        
        {values.description && (
          <div>
            <Divider />
            <Paragraph>
              <Text strong>描述：</Text>
            </Paragraph>
            <Paragraph>{values.description}</Paragraph>
          </div>
        )}

        {values.methodology_description && (
          <div>
            <Divider />
            <Paragraph>
              <Text strong>方法学描述：</Text>
            </Paragraph>
            <Paragraph>{values.methodology_description}</Paragraph>
          </div>
        )}

        {qualityScore && (
          <div>
            <Divider />
            <Text strong>质量评分：</Text>
            <div className="mt-2">
              <Progress
                percent={qualityScore.overall_score}
                strokeColor={qualityScore.overall_score >= 80 ? '#52c41a' : 
                            qualityScore.overall_score >= 50 ? '#faad14' : '#f5222d'}
              />
            </div>
          </div>
        )}

        {values.tags && values.tags.length > 0 && (
          <div>
            <Divider />
            <Paragraph>
              <Text strong>标签：</Text>
            </Paragraph>
            <Space wrap>
              {values.tags.map((tag: string, index: number) => (
                <Tag key={index}>{tag}</Tag>
              ))}
            </Space>
          </div>
        )}
      </Card>
    );
  };

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card title="基础信息" className="mb-4">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="排放因子名称"
                  name="name"
                  rules={[{ required: true, message: '请输入排放因子名称' }]}
                >
                  <Input placeholder="请输入排放因子名称" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="分类"
                  name="category"
                  rules={[{ required: true, message: '请选择分类' }]}
                >
                  <Select placeholder="请选择分类">
                    {formOptions?.categories.map(cat => (
                      <Option key={cat} value={cat}>{cat}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="子分类" name="sub_category">
                  <Select placeholder="请选择子分类" allowClear>
                    {formData.category && formOptions?.subCategories[formData.category]?.map(subCat => (
                      <Option key={subCat} value={subCat}>{subCat}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="单位"
                  name="unit"
                  rules={[{ required: true, message: '请选择单位' }]}
                >
                  <Select placeholder="请选择单位">
                    {formOptions?.units.map(unit => (
                      <Option key={unit} value={unit}>{unit}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="温室气体类型"
                  name="gas_type"
                  rules={[{ required: true, message: '请选择温室气体类型' }]}
                >
                  <Select placeholder="请选择温室气体类型">
                    {formOptions?.gasTypes.map(gas => (
                      <Option key={gas} value={gas}>{gas}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="地理范围"
                  name="geographical_scope"
                  rules={[{ required: true, message: '请选择地理范围' }]}
                >
                  <Select placeholder="请选择地理范围">
                    {formOptions?.geographicalScopes.map(scope => (
                      <Option key={scope} value={scope}>{scope}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="数据来源"
                  name="data_source"
                  rules={[{ required: true, message: '请输入数据来源' }]}
                >
                  <Input placeholder="请输入数据来源" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="参考年份" name="reference_year">
                  <InputNumber
                    placeholder="请输入参考年份"
                    min={1900}
                    max={new Date().getFullYear()}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="描述" name="description">
                  <TextArea
                    placeholder="请输入排放因子描述"
                    rows={3}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        );

      case 1:
        return (
          <Card title="技术参数" className="mb-4">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="数值"
                  name="value"
                  rules={[
                    { required: true, message: '请输入数值' },
                    { type: 'number', min: 0, message: '数值必须大于等于0' }
                  ]}
                >
                  <InputNumber
                    placeholder="请输入数值"
                    style={{ width: '100%' }}
                    precision={6}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={
                    <span>
                      不确定性 (%)
                      <Tooltip title="表示数据的不确定性百分比">
                        <InfoCircleOutlined className="ml-1" />
                      </Tooltip>
                    </span>
                  }
                  name="uncertainty"
                >
                  <InputNumber
                    placeholder="请输入不确定性"
                    min={0}
                    max={100}
                    style={{ width: '100%' }}
                    precision={2}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="行业领域" name="sector">
                  <Select placeholder="请选择行业领域" allowClear>
                    {formOptions?.sectors.map(sector => (
                      <Option key={sector} value={sector}>{sector}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="活动类型" name="activity">
                  <Select placeholder="请选择活动类型" allowClear>
                    {formOptions?.activities.map(activity => (
                      <Option key={activity} value={activity}>{activity}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="燃料类型" name="fuel_type">
                  <Select placeholder="请选择燃料类型" allowClear>
                    {formOptions?.fuelTypes.map(fuel => (
                      <Option key={fuel} value={fuel}>{fuel}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="标签" name="tags">
                  <Select
                    mode="tags"
                    placeholder="请输入标签"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="方法学描述" name="methodology_description">
                  <TextArea
                    placeholder="请输入方法学描述"
                    rows={4}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        );

      case 2:
        return (
          <PedigreeMatrix
            initialValues={{
              temporal_representativeness: formData.temporal_representativeness,
              geographical_representativeness: formData.geographical_representativeness,
              technology_representativeness: formData.technology_representativeness,
              completeness: formData.completeness,
              reliability: formData.reliability
            }}
            onScoreChange={(result) => {
              setQualityAssessment(result);
              form.setFieldsValue({
                temporal_representativeness: result.scores.temporal_representativeness,
                geographical_representativeness: result.scores.geographical_representativeness,
                technology_representativeness: result.scores.technology_representativeness,
                completeness: result.scores.completeness,
                reliability: result.scores.reliability,
                quality_score: result.overall_score
              });
              setFormData(prev => ({
                ...prev,
                temporal_representativeness: result.scores.temporal_representativeness,
                geographical_representativeness: result.scores.geographical_representativeness,
                technology_representativeness: result.scores.technology_representativeness,
                completeness: result.scores.completeness,
                reliability: result.scores.reliability,
                quality_score: result.overall_score
              }));
            }}
            showDetailedAnalysis={true}
          />
        );

      case 3:
        return (
          <Card title="确认提交">
            <Alert
              message="请仔细检查以下信息"
              description="确认无误后，您可以选择保存为草稿或直接发布。发布后的数据将对所有用户可见。"
              type="warning"
              showIcon
              className="mb-4"
            />
            {renderPreview()}
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <Card>
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
                <Title level={3} className="m-0">创建排放因子</Title>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => setPreviewVisible(true)}
                >
                  预览
                </Button>
                <Button
                  icon={<SaveOutlined />}
                  onClick={handleSaveDraft}
                  loading={loading}
                >
                  保存草稿
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 步骤导航 */}
        <div className="mb-6">
          <Steps current={currentStep} className="mb-4">
            {steps.map((step, index) => (
              <Step
                key={index}
                title={step.title}
                description={step.description}
                icon={index === currentStep ? <InfoCircleOutlined /> : 
                      index < currentStep ? <CheckCircleOutlined /> : undefined}
              />
            ))}
          </Steps>
        </div>

        {/* 表单 */}
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFormChange}
          initialValues={{ status: 'draft' }}
        >
          {renderStepContent()}

          {/* 步骤导航按钮 */}
          <div className="text-center">
            <Space size="large">
              {currentStep > 0 && (
                <Button onClick={prevStep}>
                  上一步
                </Button>
              )}
              {currentStep < steps.length - 1 && (
                <Button type="primary" onClick={nextStep}>
                  下一步
                </Button>
              )}
              {currentStep === steps.length - 1 && (
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSubmit}
                    loading={loading}
                  >
                    发布排放因子
                  </Button>
                </Space>
              )}
            </Space>
          </div>
        </Form>
      </Card>

      {/* 预览弹窗 */}
      <Modal
        title="排放因子预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={800}
      >
        {renderPreview()}
      </Modal>
    </div>
  );
};

export default EmissionFactorCreate; 