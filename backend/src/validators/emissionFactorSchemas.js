const Joi = require('joi');

// 通用的JSONB字段验证
const activityCategorySchema = Joi.object({
  level_1: Joi.string().required().valid('Energy', 'Transport', 'Industry', 'Agriculture', 'Waste'),
  level_2: Joi.string().required().max(50),
  level_3: Joi.string().required().max(50),
  display_name_cn: Joi.string().required().max(200)
});

const geographicScopeSchema = Joi.object({
  country_code: Joi.string().required().length(2).uppercase(),
  region: Joi.string().required().max(100),
  display_name_cn: Joi.string().required().max(200)
});

const emissionValueSchema = Joi.object({
  value: Joi.number().positive().required(),
  unit: Joi.string().required().valid(
    'kgCO2eq/kWh', 'gCO2eq/kWh', 'kgCO2eq/MJ', 'kgCO2eq/km', 
    'gCO2eq/km', 'kgCO2eq/tkm', 'kgCO2eq/kg', 'tCO2eq/t', 
    'kgCO2eq/m3', 'kgCO2eq/L'
  ),
  reference_year: Joi.number().integer().min(1990).max(new Date().getFullYear()).required()
});

const dataSourceSchema = Joi.object({
  organization: Joi.string().required().max(200),
  publication: Joi.string().required().max(500),
  publication_date: Joi.date().iso().required(),
  url: Joi.string().uri().allow(''),
  notes: Joi.string().allow('')
});

const qualityInfoSchema = Joi.object({
  grade: Joi.string().required().valid('A', 'B', 'C', 'D'),
  confidence: Joi.string().required().valid('High', 'Medium', 'Low'),
  last_review_date: Joi.date().iso().required(),
  notes: Joi.string().allow(''),
  reviewer: Joi.string().allow('')
});

// 创建排放因子验证模式
const createEmissionFactorSchema = Joi.object({
  activity_category: activityCategorySchema.required(),
  geographic_scope: geographicScopeSchema.required(),
  emission_value: emissionValueSchema.required(),
  data_source: dataSourceSchema.required(),
  quality_info: qualityInfoSchema.required(),
  created_by: Joi.string().default('system')
});

// 更新排放因子验证模式
const updateEmissionFactorSchema = Joi.object({
  activity_category: activityCategorySchema,
  geographic_scope: geographicScopeSchema,
  emission_value: emissionValueSchema,
  data_source: dataSourceSchema,
  quality_info: qualityInfoSchema,
  status: Joi.string().valid('active', 'inactive', 'review'),
  created_by: Joi.string()
}).min(1); // 至少需要一个字段

// 查询排放因子验证模式
const queryEmissionFactorSchema = Joi.object({
  // 分页参数
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  
  // 筛选参数
  category_l1: Joi.string().valid('Energy', 'Transport', 'Industry', 'Agriculture', 'Waste'),
  category_l2: Joi.string().max(50),
  category_l3: Joi.string().max(50),
  country_code: Joi.string().length(2).uppercase(),
  region: Joi.string().max(100),
  reference_year: Joi.number().integer().min(1990).max(new Date().getFullYear()),
  quality_grade: Joi.string().valid('A', 'B', 'C', 'D'),
  status: Joi.string().valid('active', 'inactive', 'review').default('active'),
  
  // 搜索参数
  search: Joi.string().max(200),
  
  // 排序参数
  sort: Joi.string().valid(
    'created_at', 'updated_at', 'reference_year', 'emission_value_num', 
    'quality_grade', 'category_l1', 'country_code'
  ).default('updated_at'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  
  // 数值范围筛选
  emission_value_min: Joi.number().positive(),
  emission_value_max: Joi.number().positive(),
  emission_unit: Joi.string().valid(
    'kgCO2eq/kWh', 'gCO2eq/kWh', 'kgCO2eq/MJ', 'kgCO2eq/km', 
    'gCO2eq/km', 'kgCO2eq/tkm', 'kgCO2eq/kg', 'tCO2eq/t', 
    'kgCO2eq/m3', 'kgCO2eq/L'
  ),
  
  // 时间范围筛选
  year_from: Joi.number().integer().min(1990),
  year_to: Joi.number().integer().min(1990).max(new Date().getFullYear()),
  
  // 数据源筛选
  organization: Joi.string().max(200),
  
  // 响应格式
  format: Joi.string().valid('json', 'csv', 'xlsx').default('json'),
  include_metadata: Joi.boolean().default(false)
});

// 批量导入验证模式
const importEmissionFactorSchema = Joi.array().items(
  createEmissionFactorSchema.fork(['created_by'], (schema) => schema.optional())
).min(1).max(1000); // 限制批量导入数量

// 搜索验证模式
const searchEmissionFactorSchema = Joi.object({
  q: Joi.string().required().min(2).max(200),
  limit: Joi.number().integer().min(1).max(50).default(10),
  
  // 搜索范围
  search_fields: Joi.array().items(
    Joi.string().valid('category', 'region', 'source', 'all')
  ).default(['all']),
  
  // 筛选器
  filters: Joi.object({
    category_l1: Joi.string().valid('Energy', 'Transport', 'Industry', 'Agriculture', 'Waste'),
    country_code: Joi.string().length(2).uppercase(),
    quality_grade: Joi.string().valid('A', 'B', 'C', 'D'),
    reference_year: Joi.number().integer().min(1990).max(new Date().getFullYear())
  }).default({})
});

// 统计查询验证模式
const statsQuerySchema = Joi.object({
  dimension: Joi.string().required().valid('category', 'region', 'year', 'quality', 'source'),
  
  // 筛选条件
  filters: Joi.object({
    category_l1: Joi.string().valid('Energy', 'Transport', 'Industry', 'Agriculture', 'Waste'),
    category_l2: Joi.string().max(50),
    country_code: Joi.string().length(2).uppercase(),
    quality_grade: Joi.string().valid('A', 'B', 'C', 'D'),
    year_from: Joi.number().integer().min(1990),
    year_to: Joi.number().integer().min(1990).max(new Date().getFullYear())
  }).default({}),
  
  // 聚合参数
  aggregation: Joi.string().valid('count', 'avg', 'min', 'max', 'sum').default('count'),
  group_by: Joi.string().valid('month', 'quarter', 'year'),
  
  // 输出控制
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid('value', 'count', 'name').default('count'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

// 趋势分析验证模式
const trendAnalysisSchema = Joi.object({
  category_l1: Joi.string().valid('Energy', 'Transport', 'Industry', 'Agriculture', 'Waste'),
  category_l2: Joi.string().max(50),
  category_l3: Joi.string().max(50),
  country_code: Joi.string().length(2).uppercase(),
  region: Joi.string().max(100),
  
  start_year: Joi.number().integer().min(1990).default(2020),
  end_year: Joi.number().integer().min(1990).max(new Date().getFullYear()).default(new Date().getFullYear()),
  
  // 分析参数
  time_granularity: Joi.string().valid('year', 'quarter', 'month').default('year'),
  metric: Joi.string().valid('average', 'median', 'count', 'range').default('average'),
  include_forecast: Joi.boolean().default(false),
  confidence_interval: Joi.number().min(0.8).max(0.99).default(0.95)
}).custom((value, helpers) => {
  if (value.end_year < value.start_year) {
    return helpers.error('any.invalid', { 
      message: 'end_year must be greater than or equal to start_year' 
    });
  }
  return value;
});

// 质量评审验证模式
const qualityReviewSchema = Joi.object({
  grade: Joi.string().required().valid('A', 'B', 'C', 'D'),
  confidence: Joi.string().required().valid('High', 'Medium', 'Low'),
  notes: Joi.string().max(1000).allow(''),
  reviewer: Joi.string().required().max(100),
  review_date: Joi.date().iso().default(new Date()),
  
  // 详细评分维度
  data_quality_scores: Joi.object({
    accuracy: Joi.number().min(1).max(5),
    completeness: Joi.number().min(1).max(5),
    timeliness: Joi.number().min(1).max(5),
    consistency: Joi.number().min(1).max(5),
    traceability: Joi.number().min(1).max(5),
    representativeness: Joi.number().min(1).max(5)
  }),
  
  recommendations: Joi.array().items(Joi.string().max(500))
});

// 导出配置验证模式
const exportConfigSchema = Joi.object({
  format: Joi.string().required().valid('xlsx', 'csv', 'json', 'xml'),
  
  // 数据筛选（复用查询模式）
  filters: queryEmissionFactorSchema.fork([
    'page', 'limit', 'sort', 'order', 'format', 'include_metadata'
  ], (schema) => schema.forbidden()),
  
  // 导出选项
  include_metadata: Joi.boolean().default(true),
  include_quality_info: Joi.boolean().default(true),
  include_source_info: Joi.boolean().default(true),
  
  // 本地化选项
  language: Joi.string().valid('en', 'zh-CN').default('zh-CN'),
  date_format: Joi.string().valid('YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY').default('YYYY-MM-DD'),
  
  // 文件选项
  filename: Joi.string().max(100),
  compression: Joi.boolean().default(false)
});

module.exports = {
  createEmissionFactorSchema,
  updateEmissionFactorSchema,
  queryEmissionFactorSchema,
  importEmissionFactorSchema,
  searchEmissionFactorSchema,
  statsQuerySchema,
  trendAnalysisSchema,
  qualityReviewSchema,
  exportConfigSchema,
  
  // 单独的schema组件，供其他模块使用
  activityCategorySchema,
  geographicScopeSchema,
  emissionValueSchema,
  dataSourceSchema,
  qualityInfoSchema
}; 