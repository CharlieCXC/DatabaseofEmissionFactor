import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Steps,
  Table,
  Alert,
  Progress,
  Card,
  Space,
  message,
  Typography,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const { Step } = Steps;
const { Dragger } = Upload;
const { Title, Text } = Typography;

interface ImportData {
  活动类别L1: string;
  活动类别L2: string;
  活动类别L3: string;
  中文名称: string;
  国家代码: string;
  地区: string;
  排放值: number;
  单位: string;
  年份: number;
  数据机构: string;
  质量等级: string;
  [key: string]: any;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: ValidationError[];
  successData: ImportData[];
  failedData: ImportData[];
}

interface DataImportProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export const DataImport: React.FC<DataImportProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [validationResult, setValidationResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);

  // 下载模板
  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/v1/emission-factors/export/template?format=xlsx');
      
      if (!response.ok) {
        throw new Error('模板下载失败');
      }

      // 获取文件名
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = '排放因子导入模板.xlsx';
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="(.+)"/);
        if (matches) {
          filename = matches[1];
        }
      }

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      
      message.success('模板下载成功');
    } catch (error) {
      message.error('模板下载失败：' + (error as Error).message);
    }
  };

  // 文件上传配置
  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls',
    maxCount: 1,
    fileList,
    beforeUpload: (file) => {
      const isExcel = 
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel';
      
      if (!isExcel) {
        message.error('只能上传Excel文件！');
        return false;
      }
      
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过10MB！');
        return false;
      }
      
      return false; // 阻止自动上传
    },
    onChange: (info) => {
      setFileList(info.fileList);
    },
    onRemove: () => {
      setFileList([]);
      setValidationResult(null);
      setCurrentStep(0);
    },
  };

  // 解析Excel文件
  const parseExcelFile = async (file: File): Promise<ImportData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData as ImportData[]);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // 数据验证
  const validateData = (data: ImportData[]): ImportResult => {
    const errors: ValidationError[] = [];
    const successData: ImportData[] = [];
    const failedData: ImportData[] = [];

    data.forEach((row, index) => {
      const rowNumber = index + 2; // Excel行号从2开始（第1行是标题）
      const rowErrors: ValidationError[] = [];

      // 必填字段验证
      const requiredFields = [
        '活动类别L1', '活动类别L2', '活动类别L3', '中文名称',
        '国家代码', '地区', '排放值', '单位', '年份', '数据机构', '质量等级'
      ];

      requiredFields.forEach(field => {
        if (!row[field] || row[field] === '') {
          rowErrors.push({
            row: rowNumber,
            field,
            message: '必填字段不能为空',
            value: row[field]
          });
        }
      });

      // 数值类型验证
      if (row['排放值'] && (isNaN(Number(row['排放值'])) || Number(row['排放值']) <= 0)) {
        rowErrors.push({
          row: rowNumber,
          field: '排放值',
          message: '排放值必须是大于0的数字',
          value: row['排放值']
        });
      }

      if (row['年份'] && (isNaN(Number(row['年份'])) || Number(row['年份']) < 1990 || Number(row['年份']) > 2030)) {
        rowErrors.push({
          row: rowNumber,
          field: '年份',
          message: '年份必须是1990-2030之间的数字',
          value: row['年份']
        });
      }

      // 质量等级验证
      if (row['质量等级'] && !['A', 'B', 'C', 'D'].includes(row['质量等级'])) {
        rowErrors.push({
          row: rowNumber,
          field: '质量等级',
          message: '质量等级只能是A、B、C、D之一',
          value: row['质量等级']
        });
      }

      // 国家代码验证
      if (row['国家代码'] && !/^[A-Z]{2}$/.test(row['国家代码'])) {
        rowErrors.push({
          row: rowNumber,
          field: '国家代码',
          message: '国家代码必须是2位大写字母',
          value: row['国家代码']
        });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        failedData.push(row);
      } else {
        successData.push(row);
      }
    });

    return {
      total: data.length,
      success: successData.length,
      failed: failedData.length,
      errors,
      successData,
      failedData
    };
  };

  // 处理文件上传和解析
  const handleFileProcess = async () => {
    if (fileList.length === 0) {
      message.error('请先选择要上传的文件');
      return;
    }

    setLoading(true);
    try {
      const file = fileList[0].originFileObj as File;
      const data = await parseExcelFile(file);
      
      if (data.length === 0) {
        message.error('文件中没有找到有效数据');
        return;
      }

      setFileList([]); // Clear fileList after parsing
      const result = validateData(data);
      setValidationResult(result);
      setCurrentStep(1);
      
      message.success(`文件解析完成，共解析 ${data.length} 条数据`);
    } catch (error) {
      message.error('文件解析失败：' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 执行数据导入
  const handleDataImport = async () => {
    if (!validationResult || validationResult.successData.length === 0) {
      message.error('没有有效数据可以导入');
      return;
    }

    setLoading(true);
    setImportProgress(0);
    
    try {
      // 转换数据格式为后端接口格式
      const transformedData = validationResult.successData.map(row => ({
        activity_category: {
          level_1: row['活动类别L1'],
          level_2: row['活动类别L2'],
          level_3: row['活动类别L3'],
          display_name_cn: row['中文名称']
        },
        geographic_scope: {
          country_code: row['国家代码'],
          region: row['地区'],
          display_name_cn: row['中文名称']
        },
        emission_value: {
          value: parseFloat(row['排放值'].toString()),
          unit: row['单位'],
          reference_year: parseInt(row['年份'].toString())
        },
        data_source: {
          organization: row['数据机构'],
          publication: '',
          publication_date: new Date().toISOString().slice(0, 10),
          url: '',
          notes: ''
        },
        quality_info: {
          grade: row['质量等级'],
          confidence: 'Medium',
          last_review_date: new Date().toISOString().slice(0, 10),
          notes: '',
          reviewer: ''
        },
        created_by: 'import_user'
      }));

      setImportProgress(30);

      // 调用后端批量导入接口
      const response = await fetch('/api/v1/emission-factors/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedData)
      });

      setImportProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '导入失败');
      }

      const result = await response.json();
      setImportProgress(100);

      if (result.success) {
        setCurrentStep(2);
        message.success(`成功导入 ${result.data.created} 条排放因子数据`);
        
        if (result.data.errors > 0) {
          message.warning(`有 ${result.data.errors} 条数据导入失败`);
        }
      } else {
        throw new Error(result.error || '导入失败');
      }
      
      // 延迟后关闭弹窗并刷新列表
      setTimeout(() => {
        onSuccess();
        handleModalClose();
      }, 2000);
      
    } catch (error) {
      message.error('数据导入失败：' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 关闭弹窗
  const handleModalClose = () => {
    setCurrentStep(0);
    setFileList([]);
    setValidationResult(null);
    setImportProgress(0);
    onCancel();
  };

  // 错误表格列定义
  const errorColumns = [
    {
      title: '行号',
      dataIndex: 'row',
      width: 80,
    },
    {
      title: '字段',
      dataIndex: 'field',
      width: 120,
    },
    {
      title: '错误信息',
      dataIndex: 'message',
      width: 200,
    },
    {
      title: '当前值',
      dataIndex: 'value',
      width: 150,
      render: (value: any) => (
        <Text type="danger">{String(value || '空值')}</Text>
      ),
    },
  ];

  return (
    <Modal
      title="数据导入"
      open={visible}
      onCancel={handleModalClose}
      width={1000}
      footer={null}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 步骤条 */}
        <Steps current={currentStep}>
          <Step title="上传文件" icon={<UploadOutlined />} />
          <Step title="数据验证" icon={<CheckCircleOutlined />} />
          <Step title="导入完成" icon={<InboxOutlined />} />
        </Steps>

        {/* 第一步：文件上传 */}
        {currentStep === 0 && (
          <Card>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Title level={4}>上传Excel文件</Title>
                <Space>
                  <Text type="secondary">支持 .xlsx 和 .xls 格式，文件大小不超过10MB</Text>
                  <Button 
                    type="link" 
                    icon={<DownloadOutlined />}
                    onClick={downloadTemplate}
                  >
                    下载模板
                  </Button>
                </Space>
              </div>
              
              <Dragger {...uploadProps} style={{ padding: '40px 20px' }}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">
                  请按照模板格式准备数据，确保所有必填字段都已填写
                </p>
              </Dragger>

              {fileList.length > 0 && (
                <Button 
                  type="primary" 
                  onClick={handleFileProcess}
                  loading={loading}
                  size="large"
                >
                  解析文件
                </Button>
              )}
            </Space>
          </Card>
        )}

        {/* 第二步：数据验证 */}
        {currentStep === 1 && validationResult && (
          <Card>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Title level={4}>数据验证结果</Title>
              
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic 
                    title="总数据量" 
                    value={validationResult.total} 
                    prefix={<InboxOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="验证通过" 
                    value={validationResult.success} 
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="验证失败" 
                    value={validationResult.failed} 
                    valueStyle={{ color: '#cf1322' }}
                    prefix={<CloseCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="错误总数" 
                    value={validationResult.errors.length} 
                    valueStyle={{ color: '#fa8c16' }}
                    prefix={<ExclamationCircleOutlined />}
                  />
                </Col>
              </Row>

              {validationResult.success > 0 && (
                <Alert
                  message={`有 ${validationResult.success} 条数据验证通过，可以导入`}
                  type="success"
                  showIcon
                />
              )}

              {validationResult.failed > 0 && (
                <>
                  <Alert
                    message={`有 ${validationResult.failed} 条数据验证失败，请修复后重新上传`}
                    type="error"
                    showIcon
                  />
                  
                  <div>
                    <Title level={5}>错误详情：</Title>
                    <Table
                      dataSource={validationResult.errors}
                      columns={errorColumns}
                      size="small"
                      pagination={{ pageSize: 10 }}
                      scroll={{ y: 300 }}
                      rowKey={(record, index) => `${record.row}-${record.field}-${index}`}
                    />
                  </div>
                </>
              )}

              <Space>
                <Button onClick={() => setCurrentStep(0)}>
                  重新上传
                </Button>
                {validationResult.success > 0 && (
                  <Button 
                    type="primary" 
                    onClick={handleDataImport}
                    loading={loading}
                  >
                    导入数据 ({validationResult.success} 条)
                  </Button>
                )}
              </Space>
            </Space>
          </Card>
        )}

        {/* 第三步：导入进度和结果 */}
        {currentStep === 2 && (
          <Card>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Title level={4}>数据导入中...</Title>
              
              <Progress 
                percent={importProgress} 
                status={importProgress === 100 ? 'success' : 'active'}
                format={(percent) => `${percent}%`}
              />

              {importProgress === 100 && (
                <Alert
                  message="数据导入完成！"
                  description={`成功导入 ${validationResult?.success} 条排放因子数据，页面将自动刷新。`}
                  type="success"
                  showIcon
                />
              )}
            </Space>
          </Card>
        )}
      </Space>
    </Modal>
  );
}; 