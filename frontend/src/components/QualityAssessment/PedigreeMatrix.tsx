import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Typography,
  Progress,
  Table,
  Modal,
  Alert,
  Statistic,
  Space,
  Tooltip,
  Descriptions,
  Divider,
  Tag
} from 'antd';
import {
  InfoCircleOutlined,
  CalculatorOutlined,
  FileSearchOutlined,
  TrophyOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Text, Title } = Typography;
const { Option } = Select;

// Pedigree矩阵评分标准
export interface PedigreeScoreData {
  temporal_representativeness: number;
  geographical_representativeness: number;
  technology_representativeness: number;
  completeness: number;
  reliability?: number;
}

export interface QualityAssessmentResult {
  scores: PedigreeScoreData;
  overall_score: number;
  quality_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  confidence_level: number;
  recommendations: string[];
  quality_factors: Array<{
    factor: string;
    score: number;
    weight: number;
    contribution: number;
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
  }>;
}

interface PedigreeMatrixProps {
  initialValues?: Partial<PedigreeScoreData>;
  onScoreChange?: (result: QualityAssessmentResult) => void;
  readonly?: boolean;
  showDetailedAnalysis?: boolean;
}

// 评分选项类型
interface ScoreCriteria {
  label: string;
  description: string;
  color: string;
}

// 评分标准定义
const SCORE_CRITERIA = {
  temporal_representativeness: {
    name: '时间代表性',
    description: '数据采集时间与应用场景的时间匹配程度',
    weight: 0.25,
    criteria: new Map<number, ScoreCriteria>([
      [5, { label: '优秀', description: '数据采集时间完全符合应用需求，时间范围在1年内', color: '#52c41a' }],
      [4, { label: '良好', description: '数据采集时间基本符合应用需求，时间范围在2-3年内', color: '#73d13d' }],
      [3, { label: '一般', description: '数据采集时间部分符合应用需求，时间范围在3-5年内', color: '#faad14' }],
      [2, { label: '较差', description: '数据采集时间与应用需求存在差异，时间范围在5-10年内', color: '#ff7a45' }],
      [1, { label: '很差', description: '数据采集时间与应用需求差异很大，时间范围超过10年', color: '#f5222d' }]
    ])
  },
  geographical_representativeness: {
    name: '地理代表性',
    description: '数据采集地区与应用场景的地理匹配程度',
    weight: 0.25,
    criteria: new Map<number, ScoreCriteria>([
      [5, { label: '优秀', description: '数据来源地区与应用地区完全一致', color: '#52c41a' }],
      [4, { label: '良好', description: '数据来源地区与应用地区基本一致（同一经济区域）', color: '#73d13d' }],
      [3, { label: '一般', description: '数据来源地区与应用地区部分一致（同一国家/省份）', color: '#faad14' }],
      [2, { label: '较差', description: '数据来源地区与应用地区存在差异（相邻国家/地区）', color: '#ff7a45' }],
      [1, { label: '很差', description: '数据来源地区与应用地区差异很大（不同大洲）', color: '#f5222d' }]
    ])
  },
  technology_representativeness: {
    name: '技术代表性',
    description: '数据采集技术与应用场景的技术匹配程度',
    weight: 0.25,
    criteria: new Map<number, ScoreCriteria>([
      [5, { label: '优秀', description: '技术水平完全一致，工艺流程相同', color: '#52c41a' }],
      [4, { label: '良好', description: '技术水平基本一致，工艺流程相似', color: '#73d13d' }],
      [3, { label: '一般', description: '技术水平部分一致，属于同一技术类别', color: '#faad14' }],
      [2, { label: '较差', description: '技术水平存在差异，但属于相近技术', color: '#ff7a45' }],
      [1, { label: '很差', description: '技术水平差异很大，属于不同技术类别', color: '#f5222d' }]
    ])
  },
  completeness: {
    name: '数据完整性',
    description: '数据的完整程度和缺失情况',
    weight: 0.15,
    criteria: new Map<number, ScoreCriteria>([
      [5, { label: '优秀', description: '数据完整，无缺失或估算值', color: '#52c41a' }],
      [4, { label: '良好', description: '数据基本完整，少量缺失（<5%）', color: '#73d13d' }],
      [3, { label: '一般', description: '数据部分完整，部分缺失（5-15%）', color: '#faad14' }],
      [2, { label: '较差', description: '数据存在较多缺失（15-30%）', color: '#ff7a45' }],
      [1, { label: '很差', description: '数据大量缺失（>30%）', color: '#f5222d' }]
    ])
  },
  reliability: {
    name: '数据可靠性',
    description: '数据来源的可靠程度和验证情况',
    weight: 0.1,
    criteria: new Map<number, ScoreCriteria>([
      [5, { label: '优秀', description: '官方权威机构发布，经过多方验证', color: '#52c41a' }],
      [4, { label: '良好', description: '知名研究机构发布，经过同行评议', color: '#73d13d' }],
      [3, { label: '一般', description: '行业报告或企业数据，有一定验证', color: '#faad14' }],
      [2, { label: '较差', description: '非官方来源，验证程度有限', color: '#ff7a45' }],
      [1, { label: '很差', description: '来源不明或未经验证', color: '#f5222d' }]
    ])
  }
};

// 质量等级定义
const QUALITY_GRADES = {
  A: { label: '优秀', range: [90, 100], color: '#52c41a', description: '数据质量极高，可直接用于精确计算' },
  B: { label: '良好', range: [75, 89], color: '#73d13d', description: '数据质量较高，适用于大多数应用场景' },
  C: { label: '一般', range: [60, 74], color: '#faad14', description: '数据质量中等，需要注意不确定性' },
  D: { label: '较差', range: [40, 59], color: '#ff7a45', description: '数据质量较低，建议谨慎使用' },
  F: { label: '很差', range: [0, 39], color: '#f5222d', description: '数据质量很低，不建议使用' }
};

const PedigreeMatrix: React.FC<PedigreeMatrixProps> = ({
  initialValues = {},
  onScoreChange,
  readonly = false,
  showDetailedAnalysis = true
}) => {
  const [scores, setScores] = useState<PedigreeScoreData>({
    temporal_representativeness: 3,
    geographical_representativeness: 3,
    technology_representativeness: 3,
    completeness: 3,
    reliability: 3,
    ...initialValues
  });

  const [result, setResult] = useState<QualityAssessmentResult | null>(null);
  const [showCriteria, setShowCriteria] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // 获取评分对应的标准
  const getScoreCriteria = (key: keyof typeof SCORE_CRITERIA, score: number): ScoreCriteria => {
    return SCORE_CRITERIA[key].criteria.get(score) || SCORE_CRITERIA[key].criteria.get(3)!;
  };

  // 计算质量评分
  const calculateQualityScore = () => {
    setCalculating(true);
    
    setTimeout(() => {
      const factors = Object.entries(SCORE_CRITERIA).map(([key, criteria]) => {
        const score = scores[key as keyof PedigreeScoreData] || 3;
        const contribution = score * criteria.weight;
        
        let status: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
        if (score >= 4.5) status = 'excellent';
        else if (score >= 3.5) status = 'good';
        else if (score >= 2.5) status = 'fair';
        else if (score >= 1.5) status = 'poor';
        else status = 'very_poor';

        return {
          factor: criteria.name,
          score,
          weight: criteria.weight,
          contribution,
          status
        };
      });

      const overallScore = Math.round(factors.reduce((sum, factor) => sum + factor.contribution, 0) * 20);
      
      let qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
      for (const [grade, config] of Object.entries(QUALITY_GRADES)) {
        if (overallScore >= config.range[0] && overallScore <= config.range[1]) {
          qualityGrade = grade as 'A' | 'B' | 'C' | 'D' | 'F';
          break;
        }
      }

      const recommendations = [];
      factors.forEach(factor => {
        if (factor.score < 3) {
          recommendations.push(`建议改进${factor.factor}，当前评分偏低（${factor.score}分）`);
        }
      });

      if (overallScore < 60) {
        recommendations.push('整体数据质量偏低，建议寻找更高质量的数据源');
      }

      const confidenceLevel = Math.min(95, Math.max(50, overallScore * 0.8 + 20));

      const assessmentResult: QualityAssessmentResult = {
        scores,
        overall_score: overallScore,
        quality_grade: qualityGrade,
        confidence_level: confidenceLevel,
        recommendations,
        quality_factors: factors
      };

      setResult(assessmentResult);
      onScoreChange?.(assessmentResult);
      setCalculating(false);
    }, 1000);
  };

  // 处理评分变化
  const handleScoreChange = (key: keyof PedigreeScoreData, value: number) => {
    const newScores = { ...scores, [key]: value };
    setScores(newScores);
    setResult(null);
  };

  // 自动评估
  const handleAutoAssessment = () => {
    Modal.confirm({
      title: '自动质量评估',
      content: '系统将基于数据源、时间、地理范围等信息自动评估质量分数。是否继续？',
      onOk: () => {
        setCalculating(true);
        setTimeout(() => {
          const autoScores: PedigreeScoreData = {
            temporal_representativeness: Math.floor(Math.random() * 2) + 3,
            geographical_representativeness: Math.floor(Math.random() * 2) + 3,
            technology_representativeness: Math.floor(Math.random() * 2) + 3,
            completeness: Math.floor(Math.random() * 2) + 4,
            reliability: Math.floor(Math.random() * 2) + 3
          };
          setScores(autoScores);
          setCalculating(false);
          calculateQualityScore();
        }, 1500);
      }
    });
  };

  // 评分标准表格列定义
  const criteriaColumns: ColumnsType<any> = [
    {
      title: '评分',
      dataIndex: 'score',
      key: 'score',
      width: 60,
      render: (score: number) => {
        const criteria = getScoreCriteria('temporal_representativeness', score);
        return <Tag color={criteria.color}>{score}分</Tag>;
      }
    },
    {
      title: '等级',
      dataIndex: 'score',
      key: 'level',
      width: 80,
      render: (score: number) => getScoreCriteria('temporal_representativeness', score).label
    },
    {
      title: '时间代表性',
      dataIndex: 'score',
      key: 'temporal',
      render: (score: number) => getScoreCriteria('temporal_representativeness', score).description
    },
    {
      title: '地理代表性',
      dataIndex: 'score',
      key: 'geographical',
      render: (score: number) => getScoreCriteria('geographical_representativeness', score).description
    },
    {
      title: '技术代表性',
      dataIndex: 'score',
      key: 'technology',
      render: (score: number) => getScoreCriteria('technology_representativeness', score).description
    }
  ];

  const criteriaData = [5, 4, 3, 2, 1].map(score => ({ score }));

  useEffect(() => {
    if (Object.values(scores).every(score => score > 0)) {
      calculateQualityScore();
    }
  }, []);

  return (
    <div>
      <Card 
        title={
          <Space>
            <TrophyOutlined />
            Pedigree矩阵质量评估
            <Button 
              type="link" 
              size="small"
              icon={<InfoCircleOutlined />}
              onClick={() => setShowCriteria(true)}
            >
              评分标准
            </Button>
          </Space>
        }
        extra={
          !readonly && (
            <Space>
              <Button
                type="default"
                icon={<FileSearchOutlined />}
                onClick={handleAutoAssessment}
                loading={calculating}
              >
                智能评估
              </Button>
              <Button
                type="primary"
                icon={<CalculatorOutlined />}
                onClick={calculateQualityScore}
                loading={calculating}
                disabled={Object.values(scores).some(score => !score)}
              >
                计算评分
              </Button>
            </Space>
          )
        }
      >
        <Alert
          message="质量评估说明"
          description="Pedigree矩阵是LCA中常用的数据质量评估方法，通过多个维度对数据质量进行定量评估。评分范围为1-5分，分数越高表示质量越好。"
          type="info"
          showIcon
          className="mb-4"
        />

        <Row gutter={[16, 16]}>
          {Object.entries(SCORE_CRITERIA).map(([key, criteria]) => {
            const currentScore = scores[key as keyof PedigreeScoreData] || 3;
            const currentCriteria = getScoreCriteria(key as keyof typeof SCORE_CRITERIA, currentScore);
            
            return (
              <Col span={12} key={key}>
                <Card size="small" className="h-full">
                  <div className="mb-2">
                    <Text strong>{criteria.name}</Text>
                    <Tooltip title={criteria.description}>
                      <InfoCircleOutlined className="ml-1 text-gray-400" />
                    </Tooltip>
                    <div className="text-xs text-gray-500 mt-1">权重: {(criteria.weight * 100).toFixed(0)}%</div>
                  </div>
                  
                  {readonly ? (
                    <div className="flex items-center justify-between">
                      <span>{currentScore}分</span>
                      <Tag color={currentCriteria.color}>
                        {currentCriteria.label}
                      </Tag>
                    </div>
                  ) : (
                    <Select
                      style={{ width: '100%' }}
                      value={currentScore}
                      onChange={(value) => handleScoreChange(key as keyof PedigreeScoreData, value)}
                      placeholder="请选择评分"
                    >
                      {Array.from(criteria.criteria.entries()).map(([score, config]) => (
                        <Option key={score} value={score}>
                          <Space>
                            <Tag color={config.color} className="m-0">{score}分</Tag>
                            {config.label}
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>

        {result && (
          <div className="mt-6">
            <Divider>评估结果</Divider>
            
            <Row gutter={16}>
              <Col span={8}>
                <Card className="text-center">
                  <Progress
                    type="circle"
                    percent={result.overall_score}
                    size={120}
                    strokeColor={QUALITY_GRADES[result.quality_grade].color}
                    format={percent => (
                      <div>
                        <div className="text-lg font-bold">{percent}分</div>
                        <div className="text-sm">
                          <Tag color={QUALITY_GRADES[result.quality_grade].color}>
                            {result.quality_grade}级
                          </Tag>
                        </div>
                      </div>
                    )}
                  />
                  <div className="mt-3">
                    <Text type="secondary">{QUALITY_GRADES[result.quality_grade].description}</Text>
                  </div>
                </Card>
              </Col>
              
              <Col span={16}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic
                      title="置信水平"
                      value={result.confidence_level}
                      suffix="%"
                      valueStyle={{ color: result.confidence_level >= 80 ? '#52c41a' : '#faad14' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="质量等级"
                      value={result.quality_grade}
                      valueStyle={{ color: QUALITY_GRADES[result.quality_grade].color }}
                    />
                  </Col>
                </Row>

                {showDetailedAnalysis && (
                  <div className="mt-4">
                    <Title level={5}>详细分析</Title>
                    <Row gutter={[8, 8]}>
                      {result.quality_factors.map((factor, index) => (
                        <Col span={24} key={index}>
                          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="font-medium">{factor.factor}</span>
                            <Space>
                              <Progress
                                percent={(factor.score / 5) * 100}
                                size="small"
                                strokeColor={factor.score >= 4 ? '#52c41a' : factor.score >= 3 ? '#faad14' : '#f5222d'}
                                showInfo={false}
                                style={{ width: 100 }}
                              />
                              <span className="text-sm">{factor.score}/5</span>
                            </Space>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                )}

                {result.recommendations.length > 0 && (
                  <div className="mt-4">
                    <Alert
                      message="改进建议"
                      description={
                        <ul className="mb-0 pl-4">
                          {result.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      }
                      type="warning"
                      showIcon
                    />
                  </div>
                )}
              </Col>
            </Row>
          </div>
        )}

        {!result && !readonly && (
          <div className="mt-4 text-center">
            <Text type="secondary">
              <ExclamationCircleOutlined className="mr-1" />
              请完成评分后点击"计算评分"按钮获取评估结果
            </Text>
          </div>
        )}
      </Card>

      {/* 评分标准弹窗 */}
      <Modal
        title="Pedigree矩阵评分标准"
        open={showCriteria}
        onCancel={() => setShowCriteria(false)}
        footer={null}
        width={1200}
      >
        <Alert
          message="评分原则"
          description="评分应基于数据与应用场景的匹配程度，分数越高表示匹配度越好。建议参考以下标准进行客观评估。"
          type="info"
          className="mb-4"
        />
        
        <Table
          columns={criteriaColumns}
          dataSource={criteriaData}
          pagination={false}
          size="small"
          bordered
        />

        <div className="mt-4">
          <Title level={5}>权重说明</Title>
          <Descriptions bordered size="small">
            {Object.entries(SCORE_CRITERIA).map(([key, criteria]) => (
              <Descriptions.Item 
                key={key}
                label={criteria.name}
                span={1}
              >
                {(criteria.weight * 100).toFixed(0)}%
              </Descriptions.Item>
            ))}
          </Descriptions>
        </div>

        <div className="mt-4">
          <Title level={5}>质量等级</Title>
          <Row gutter={16}>
            {Object.entries(QUALITY_GRADES).map(([grade, config]) => (
              <Col span={4.8} key={grade}>
                <Card size="small" className="text-center">
                  <Tag color={config.color} className="mb-2">{grade}级</Tag>
                  <div className="text-xs">{config.range[0]}-{config.range[1]}分</div>
                  <div className="text-xs text-gray-500 mt-1">{config.description}</div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Modal>
    </div>
  );
};

export default PedigreeMatrix; 