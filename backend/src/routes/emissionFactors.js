const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const emissionFactorController = require('../controllers/emissionFactorController');
const { validateRequest } = require('../middleware/validateRequest');
const { catchAsync } = require('../middleware/errorHandler');
const {
  createEmissionFactorSchema,
  updateEmissionFactorSchema,
  queryEmissionFactorSchema,
  importEmissionFactorSchema
} = require('../validators/emissionFactorSchemas');

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `emission-factors-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
    }
  }
});

// ===== 查询和统计路由 =====

/**
 * @route   GET /api/v1/emission-factors
 * @desc    查询排放因子列表（支持分页、筛选、搜索）
 * @access  Public
 * @query   {
 *   page: number,
 *   limit: number,
 *   category_l1: string,
 *   category_l2: string,
 *   category_l3: string,
 *   country_code: string,
 *   region: string,
 *   reference_year: number,
 *   quality_grade: string,
 *   search: string,
 *   sort: string,
 *   order: 'asc' | 'desc'
 * }
 */
router.get('/', 
  validateRequest(queryEmissionFactorSchema, 'query'),
  catchAsync(emissionFactorController.getEmissionFactors)
);

/**
 * @route   GET /api/v1/emission-factors/search
 * @desc    全文搜索排放因子
 * @access  Public
 * @query   {
 *   q: string (required),
 *   limit: number,
 *   filters: object
 * }
 */
router.get('/search',
  catchAsync(emissionFactorController.searchEmissionFactors)
);

/**
 * @route   GET /api/v1/emission-factors/suggestions
 * @desc    获取搜索建议（自动完成）
 * @access  Public
 * @query   {
 *   q: string (required),
 *   type: 'category' | 'region' | 'source'
 * }
 */
router.get('/suggestions',
  catchAsync(emissionFactorController.getSearchSuggestions)
);

/**
 * @route   GET /api/v1/emission-factors/:uuid
 * @desc    获取单个排放因子详情
 * @access  Public
 */
router.get('/:uuid',
  catchAsync(emissionFactorController.getEmissionFactorByUuid)
);

// ===== 数据管理路由 =====

/**
 * @route   POST /api/v1/emission-factors
 * @desc    创建新的排放因子
 * @access  Private (需要认证)
 * @body    EmissionFactor object
 */
router.post('/',
  validateRequest(createEmissionFactorSchema),
  catchAsync(emissionFactorController.createEmissionFactor)
);

/**
 * @route   PUT /api/v1/emission-factors/:uuid
 * @desc    更新排放因子
 * @access  Private (需要认证)
 * @body    Partial EmissionFactor object
 */
router.put('/:uuid',
  validateRequest(updateEmissionFactorSchema),
  catchAsync(emissionFactorController.updateEmissionFactor)
);

/**
 * @route   DELETE /api/v1/emission-factors/:uuid
 * @desc    删除排放因子（软删除）
 * @access  Private (需要认证)
 */
router.delete('/:uuid',
  catchAsync(emissionFactorController.deleteEmissionFactor)
);

/**
 * @route   PATCH /api/v1/emission-factors/:uuid/status
 * @desc    更新排放因子状态
 * @access  Private (需要认证)
 * @body    { status: 'active' | 'inactive' | 'review' }
 */
router.patch('/:uuid/status',
  catchAsync(emissionFactorController.updateEmissionFactorStatus)
);

// ===== 批量操作路由 =====

/**
 * @route   POST /api/v1/emission-factors/batch
 * @desc    批量创建排放因子
 * @access  Private (需要认证)
 * @body    EmissionFactor[]
 */
router.post('/batch',
  validateRequest(importEmissionFactorSchema),
  catchAsync(emissionFactorController.batchCreateEmissionFactors)
);

/**
 * @route   PUT /api/v1/emission-factors/batch
 * @desc    批量更新排放因子
 * @access  Private (需要认证)
 * @body    { uuids: string[], updates: object }
 */
router.put('/batch',
  catchAsync(emissionFactorController.batchUpdateEmissionFactors)
);

/**
 * @route   DELETE /api/v1/emission-factors/batch
 * @desc    批量删除排放因子
 * @access  Private (需要认证)
 * @body    { uuids: string[] }
 */
router.delete('/batch',
  catchAsync(emissionFactorController.batchDeleteEmissionFactors)
);

// ===== 导入导出路由 =====

/**
 * @route   POST /api/v1/emission-factors/import
 * @desc    导入Excel/CSV文件
 * @access  Private (需要认证)
 * @form    file: multipart/form-data
 */
router.post('/import',
  upload.single('file'),
  catchAsync(emissionFactorController.importFromFile)
);

/**
 * @route   GET /api/v1/emission-factors/export
 * @desc    导出排放因子数据
 * @access  Public
 * @query   {
 *   format: 'xlsx' | 'csv' | 'json',
 *   filters: object (same as list query),
 *   template: boolean
 * }
 */
router.get('/export',
  catchAsync(emissionFactorController.exportEmissionFactors)
);

/**
 * @route   GET /api/v1/emission-factors/export/template
 * @desc    下载导入模板文件
 * @access  Public
 * @query   { format: 'xlsx' | 'csv' }
 */
router.get('/export/template',
  catchAsync(emissionFactorController.downloadImportTemplate)
);

// ===== 数据质量和验证路由 =====

/**
 * @route   POST /api/v1/emission-factors/validate
 * @desc    验证排放因子数据
 * @access  Public
 * @body    EmissionFactor object or array
 */
router.post('/validate',
  catchAsync(emissionFactorController.validateEmissionFactors)
);

/**
 * @route   GET /api/v1/emission-factors/:uuid/similar
 * @desc    查找相似的排放因子
 * @access  Public
 * @query   { limit: number }
 */
router.get('/:uuid/similar',
  catchAsync(emissionFactorController.findSimilarEmissionFactors)
);

/**
 * @route   POST /api/v1/emission-factors/:uuid/quality-review
 * @desc    提交质量评审
 * @access  Private (需要认证)
 * @body    { 
 *   grade: 'A' | 'B' | 'C' | 'D',
 *   confidence: string,
 *   notes: string,
 *   reviewer: string
 * }
 */
router.post('/:uuid/quality-review',
  catchAsync(emissionFactorController.submitQualityReview)
);

/**
 * @route   PUT /api/v1/emission-factors/:uuid/quality-assessment
 * @desc    更新质量评估
 * @access  Private
 */
router.put('/:uuid/quality-assessment', 
  catchAsync(emissionFactorController.updateQualityAssessment)
);

/**
 * @route   GET /api/v1/emission-factors/:uuid/quality-assessment/history
 * @desc    获取质量评估历史
 * @access  Public
 */
router.get('/:uuid/quality-assessment/history',
  catchAsync(emissionFactorController.getQualityAssessmentHistory)
);

// ===== 统计和分析路由 =====

/**
 * @route   GET /api/v1/emission-factors/stats/overview
 * @desc    获取排放因子总体统计
 * @access  Public
 */
router.get('/stats/overview',
  catchAsync(emissionFactorController.getOverviewStats)
);

/**
 * @route   GET /api/v1/emission-factors/stats/distribution
 * @desc    获取排放因子分布统计
 * @access  Public
 * @query   { 
 *   dimension: 'category' | 'region' | 'year' | 'quality',
 *   filters: object
 * }
 */
router.get('/stats/distribution',
  catchAsync(emissionFactorController.getDistributionStats)
);

/**
 * @route   GET /api/v1/emission-factors/stats/trends
 * @desc    获取排放因子趋势分析
 * @access  Public
 * @query   {
 *   category_l1: string,
 *   category_l2: string,
 *   country_code: string,
 *   start_year: number,
 *   end_year: number
 * }
 */
router.get('/stats/trends',
  catchAsync(emissionFactorController.getTrendAnalysis)
);

module.exports = router; 