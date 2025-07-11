import React, { useState } from 'react';
import {
  Modal,
  Form,
  Select,
  DatePicker,
  Button,
  Card,
  Space,
  message,
  Radio,
  Checkbox,
  Typography,
  Row,
  Col,
  Alert,
  Progress,
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { EmissionFactor } from '../../types/emission-factor';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface ExportOptions {
  format: 'xlsx' | 'csv' | 'pdf';
  includeFields: string[];
  fileName: string;
}

interface DataExportProps {
  visible: boolean;
  onCancel: () => void;
  currentFilters?: any; // 从列表页面传入的当前筛选条件
}

export const DataExport: React.FC<DataExportProps> = ({
  visible,
  onCancel,
  currentFilters = {},
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'xlsx',
    includeFields: [
      'category',
      'geographical_scope', 
      'emission_value',
      'data_source',
      'quality_info',
      'created_at'
    ],
    fileName: '排放因子数据'
  });

  // 可导出的字段选项
  const fieldOptions = [
    { label: '基本信息', value: 'category' },
    { label: '地理范围', value: 'geographical_scope' },
    { label: '排放数值', value: 'emission_value' },
    { label: '数据来源', value: 'data_source' },
    { label: '质量信息', value: 'quality_info' },
    { label: '气体类型', value: 'gas_type' },
    { label: '状态标签', value: 'status' },
    { label: '创建时间', value: 'created_at' },
    { label: '更新时间', value: 'updated_at' },
    { label: '创建人', value: 'created_by' },
  ];

  // 分类选项（实际应用中应该从API获取）
  const categoryL1Options = [
    { label: '能源 (Energy)', value: 'Energy' },
    { label: '交通 (Transport)', value: 'Transport' },
    { label: '工业 (Industry)', value: 'Industry' },
    { label: '建筑 (Building)', value: 'Building' },
    { label: '农业 (Agriculture)', value: 'Agriculture' },
  ];

  const countryOptions = [
    { label: '中国 (CN)', value: 'CN' },
    { label: '美国 (US)', value: 'US' },
    { label: '日本 (JP)', value: 'JP' },
    { label: '德国 (DE)', value: 'DE' },
    { label: '英国 (GB)', value: 'GB' },
  ];

  const qualityGradeOptions = [
    { label: 'A级 - 高质量', value: 'A' },
    { label: 'B级 - 较高质量', value: 'B' },
    { label: 'C级 - 中等质量', value: 'C' },
    { label: 'D级 - 参考质量', value: 'D' },
  ];

  // 格式化导出数据
  const formatExportData = (data: EmissionFactor[]): any[] => {
    return data.map(item => {
      const formatted: any = {};
      
      if (exportOptions.includeFields.includes('category')) {
        formatted['分类'] = item.category;
        formatted['子分类'] = item.sub_category;
        formatted['名称'] = item.name;
        formatted['描述'] = item.description;
      }
      
      if (exportOptions.includeFields.includes('geographical_scope')) {
        formatted['地理范围'] = item.geographical_scope;
      }
      
      if (exportOptions.includeFields.includes('emission_value')) {
        formatted['排放值'] = item.value;
        formatted['单位'] = item.unit;
        formatted['参考年份'] = item.reference_year;
        formatted['不确定性'] = item.uncertainty;
      }
      
      if (exportOptions.includeFields.includes('data_source')) {
        formatted['数据来源'] = item.data_source;
      }
      
      if (exportOptions.includeFields.includes('quality_info')) {
        formatted['质量评分'] = item.quality_score;
        formatted['时间代表性'] = item.temporal_representativeness;
        formatted['地理代表性'] = item.geographical_representativeness;
        formatted['技术代表性'] = item.technology_representativeness;
        formatted['完整性'] = item.completeness;
        formatted['可靠性'] = item.reliability;
      }
      
      if (exportOptions.includeFields.includes('gas_type')) {
        formatted['气体类型'] = item.gas_type;
        formatted['行业'] = item.sector;
        formatted['活动'] = item.activity;
        formatted['燃料类型'] = item.fuel_type;
      }
      
      if (exportOptions.includeFields.includes('created_at')) {
        formatted['创建时间'] = item.created_at;
      }
      
      if (exportOptions.includeFields.includes('updated_at')) {
        formatted['更新时间'] = item.updated_at;
      }
      
      if (exportOptions.includeFields.includes('created_by')) {
        formatted['创建人'] = item.created_by;
        formatted['更新人'] = item.updated_by;
      }
      
      if (exportOptions.includeFields.includes('status')) {
        formatted['状态'] = item.status;
        formatted['标签'] = item.tags?.join(', ');
      }
      
      return formatted;
    });
  };

  // 生成Excel文件
  const generateExcelFile = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '排放因子数据');
    
    // 设置列宽
    const colWidths = Object.keys(data[0] || {}).map(() => ({ wch: 15 }));
    ws['!cols'] = colWidths;
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const file = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(file, `${fileName}.xlsx`);
  };

  // 生成CSV文件
  const generateCSVFile = (data: any[], fileName: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => 
          typeof row[header] === 'string' && row[header].includes(',') 
            ? `"${row[header]}"` 
            : row[header] || ''
        ).join(',')
      )
    ].join('\n');
    
    const file = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(file, `${fileName}.csv`);
  };

  // 执行数据导出
  const handleExport = async () => {
    try {
      const filterValues = await form.validateFields();
      setLoading(true);
      setExportProgress(0);

      // 构建查询参数
      const queryParams: any = { ...currentFilters };
      
      if (filterValues.category_l1?.length > 0) {
        queryParams.category_l1 = filterValues.category_l1;
      }
      if (filterValues.country_code?.length > 0) {
        queryParams.country_code = filterValues.country_code;
      }
      if (filterValues.quality_grade?.length > 0) {
        queryParams.quality_grade = filterValues.quality_grade;
      }
      if (filterValues.reference_year_range) {
        queryParams.reference_year_start = filterValues.reference_year_range[0].year();
        queryParams.reference_year_end = filterValues.reference_year_range[1].year();
      }

      setExportProgress(20);

      // 构建导出URL参数
      const urlParams = new URLSearchParams();
      urlParams.append('format', exportOptions.format);
      
      if (queryParams.category_l1?.length > 0) {
        queryParams.category_l1.forEach((cat: string) => urlParams.append('category_l1', cat));
      }
      if (queryParams.country_code?.length > 0) {
        queryParams.country_code.forEach((code: string) => urlParams.append('country_code', code));
      }
      if (queryParams.quality_grade?.length > 0) {
        queryParams.quality_grade.forEach((grade: string) => urlParams.append('quality_grade', grade));
      }
      if (queryParams.reference_year_start) {
        urlParams.append('reference_year_start', queryParams.reference_year_start.toString());
      }
      if (queryParams.reference_year_end) {
        urlParams.append('reference_year_end', queryParams.reference_year_end.toString());
      }

      setExportProgress(40);

      // 调用后端导出接口
      const exportUrl = `/api/v1/emission-factors/export?${urlParams.toString()}`;
      
      if (exportOptions.format === 'xlsx' || exportOptions.format === 'csv') {
        // 文件下载
        const response = await fetch(exportUrl);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '导出失败');
        }

        setExportProgress(80);

        // 获取文件名
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `排放因子数据_${new Date().toISOString().slice(0, 10)}.${exportOptions.format}`;
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

        setExportProgress(100);
        message.success('文件下载成功');

      } else {
        // JSON格式，获取数据
        const response = await fetch(exportUrl);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '导出失败');
        }

        const result = await response.json();
        setExportProgress(80);

        if (result.success) {
          // 格式化数据
          const formattedData = formatExportData(result.data);
          
          // 生成文件
          const timestamp = new Date().toISOString().slice(0, 10);
          const fileName = `${exportOptions.fileName}_${timestamp}`;
          
          generateExcelFile(formattedData, fileName);
          
          setExportProgress(100);
          message.success(`成功导出 ${result.data.length} 条数据`);
        } else {
          throw new Error(result.error || '导出失败');
        }
      }
      
      // 延迟关闭弹窗
      setTimeout(() => {
        handleModalClose();
      }, 1000);
      
    } catch (error) {
      message.error('导出失败：' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 关闭弹窗
  const handleModalClose = () => {
    form.resetFields();
    setExportProgress(0);
    onCancel();
  };

  // 使用当前筛选条件
  const useCurrentFilters = () => {
    form.setFieldsValue({
      category_l1: currentFilters.category_l1 || [],
      country_code: currentFilters.country_code || [],
      quality_grade: currentFilters.quality_grade || [],
    });
    message.info('已应用当前页面的筛选条件');
  };

  return (
    <Modal
      title="数据导出"
      open={visible}
      onCancel={handleModalClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleModalClose}>
          取消
        </Button>,
        <Button 
          key="export" 
          type="primary" 
          icon={<DownloadOutlined />}
          onClick={handleExport}
          loading={loading}
        >
          开始导出
        </Button>,
      ]}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 导出选项 */}
        <Card title="导出选项" size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>导出格式：</Text>
              <Radio.Group 
                value={exportOptions.format} 
                onChange={(e) => setExportOptions({...exportOptions, format: e.target.value})}
                style={{ marginLeft: 16 }}
              >
                <Radio.Button value="xlsx">
                  <FileExcelOutlined /> Excel
                </Radio.Button>
                <Radio.Button value="csv">
                  <FileOutlined /> CSV
                </Radio.Button>
                <Radio.Button value="pdf" disabled>
                  <FilePdfOutlined /> PDF (开发中)
                </Radio.Button>
              </Radio.Group>
            </div>
            
            <div>
              <Text strong>包含字段：</Text>
              <Checkbox.Group
                options={fieldOptions}
                value={exportOptions.includeFields}
                onChange={(checkedValues) => 
                  setExportOptions({...exportOptions, includeFields: checkedValues as string[]})
                }
                style={{ marginLeft: 16, marginTop: 8 }}
              />
            </div>
          </Space>
        </Card>

        {/* 筛选条件 */}
        <Card 
          title="筛选条件" 
          size="small"
          extra={
            <Button size="small" onClick={useCurrentFilters}>
              使用当前筛选条件
            </Button>
          }
        >
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="活动分类" name="category_l1">
                  <Select
                    mode="multiple"
                    placeholder="选择一级分类"
                    options={categoryL1Options}
                    allowClear
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="国家/地区" name="country_code">
                  <Select
                    mode="multiple"
                    placeholder="选择国家"
                    options={countryOptions}
                    allowClear
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="质量等级" name="quality_grade">
                  <Select
                    mode="multiple"
                    placeholder="选择质量等级"
                    options={qualityGradeOptions}
                    allowClear
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="参考年份范围" name="reference_year_range">
                  <RangePicker 
                    picker="year" 
                    placeholder={['开始年份', '结束年份']}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        {/* 导出进度 */}
        {loading && (
          <Card size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>导出进度：</Text>
              <Progress 
                percent={exportProgress} 
                status={exportProgress === 100 ? 'success' : 'active'}
                format={(percent) => `${percent}%`}
              />
              {exportProgress === 100 && (
                <Alert
                  message="导出完成！"
                  description="文件已开始下载，请检查您的下载文件夹。"
                  type="success"
                  showIcon
                />
              )}
            </Space>
          </Card>
        )}

        {/* 导出说明 */}
        <Alert
          message="导出说明"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Excel格式支持完整的数据结构和格式</li>
              <li>CSV格式适用于数据分析和处理</li>
              <li>大量数据导出可能需要较长时间，请耐心等待</li>
              <li>导出的数据将包含您当前有权限访问的所有字段</li>
            </ul>
          }
          type="info"
          showIcon
        />
      </Space>
    </Modal>
  );
}; 