const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorHandler');
const { validateRequest } = require('../middleware/validateRequest');
const Joi = require('joi');

// 统计查询验证模式
const statsQuerySchema = Joi.object({
  filters: Joi.object({
    category_l1: Joi.string().valid('Energy', 'Transport', 'Industry', 'Agriculture', 'Waste'),
    country_code: Joi.string().length(2).uppercase(),
    quality_grade: Joi.string().valid('A', 'B', 'C', 'D'),
    year_from: Joi.number().integer().min(1990),
    year_to: Joi.number().integer().min(1990).max(new Date().getFullYear())
  }).default({})
});

/**
 * @route   GET /api/v1/stats/overview
 * @desc    获取总体统计概览
 * @access  Public
 */
router.get('/overview',
  validateRequest(statsQuerySchema, 'query'),
  catchAsync(async (req, res) => {
    const db = require('../config/database');
    
    // 基础统计查询
    const overviewQuery = `
      SELECT 
        COUNT(*) as total_factors,
        COUNT(DISTINCT category_l1) as total_categories,
        COUNT(DISTINCT country_code) as total_countries,
        COUNT(DISTINCT reference_year) as total_years,
        AVG(emission_value_num) as avg_emission_value,
        MIN(reference_year) as earliest_year,
        MAX(reference_year) as latest_year,
        COUNT(CASE WHEN quality_grade = 'A' THEN 1 END) as grade_a_count,
        COUNT(CASE WHEN quality_grade = 'B' THEN 1 END) as grade_b_count,
        COUNT(CASE WHEN quality_grade = 'C' THEN 1 END) as grade_c_count,
        COUNT(CASE WHEN quality_grade = 'D' THEN 1 END) as grade_d_count
      FROM emission_factors 
      WHERE status = 'active'
    `;
    
    const overviewResult = await db.query(overviewQuery);
    const overview = overviewResult.rows[0];
    
    // 分类分布查询
    const categoryDistQuery = `
      SELECT 
        category_l1,
        COUNT(*) as count,
        ROUND(AVG(emission_value_num), 4) as avg_value
      FROM emission_factors 
      WHERE status = 'active'
      GROUP BY category_l1
      ORDER BY count DESC
    `;
    
    const categoryDist = await db.query(categoryDistQuery);
    
    // 地区分布查询
    const countryDistQuery = `
      SELECT 
        country_code,
        COUNT(*) as count
      FROM emission_factors 
      WHERE status = 'active'
      GROUP BY country_code
      ORDER BY count DESC
      LIMIT 10
    `;
    
    const countryDist = await db.query(countryDistQuery);
    
    // 年份分布查询
    const yearDistQuery = `
      SELECT 
        reference_year,
        COUNT(*) as count
      FROM emission_factors 
      WHERE status = 'active'
      GROUP BY reference_year
      ORDER BY reference_year DESC
      LIMIT 10
    `;
    
    const yearDist = await db.query(yearDistQuery);
    
    res.json({
      success: true,
      data: {
        overview: {
          total_factors: parseInt(overview.total_factors),
          total_categories: parseInt(overview.total_categories),
          total_countries: parseInt(overview.total_countries),
          total_years: parseInt(overview.total_years),
          avg_emission_value: parseFloat(overview.avg_emission_value) || 0,
          data_range: {
            earliest_year: parseInt(overview.earliest_year),
            latest_year: parseInt(overview.latest_year)
          },
          quality_distribution: {
            A: parseInt(overview.grade_a_count),
            B: parseInt(overview.grade_b_count),
            C: parseInt(overview.grade_c_count),
            D: parseInt(overview.grade_d_count)
          }
        },
        distributions: {
          by_category: categoryDist.rows,
          by_country: countryDist.rows,
          by_year: yearDist.rows
        }
      }
    });
  })
);

/**
 * @route   GET /api/v1/stats/category-distribution
 * @desc    获取分类分布统计
 * @access  Public
 */
router.get('/category-distribution',
  validateRequest(statsQuerySchema, 'query'),
  catchAsync(async (req, res) => {
    const db = require('../config/database');
    const { filters } = req.query;
    
    let whereClause = "WHERE status = 'active'";
    const params = [];
    
    if (filters.country_code) {
      params.push(filters.country_code);
      whereClause += ` AND country_code = $${params.length}`;
    }
    
    if (filters.quality_grade) {
      params.push(filters.quality_grade);
      whereClause += ` AND quality_grade = $${params.length}`;
    }
    
    if (filters.year_from) {
      params.push(filters.year_from);
      whereClause += ` AND reference_year >= $${params.length}`;
    }
    
    if (filters.year_to) {
      params.push(filters.year_to);
      whereClause += ` AND reference_year <= $${params.length}`;
    }
    
    const query = `
      SELECT 
        category_l1,
        category_l2,
        COUNT(*) as count,
        ROUND(AVG(emission_value_num), 4) as avg_value,
        ROUND(MIN(emission_value_num), 4) as min_value,
        ROUND(MAX(emission_value_num), 4) as max_value,
        COUNT(DISTINCT country_code) as country_count,
        array_agg(DISTINCT emission_unit) as units
      FROM emission_factors 
      ${whereClause}
      GROUP BY category_l1, category_l2
      ORDER BY category_l1, count DESC
    `;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  })
);

/**
 * @route   GET /api/v1/stats/geographic-distribution
 * @desc    获取地理分布统计
 * @access  Public
 */
router.get('/geographic-distribution',
  validateRequest(statsQuerySchema, 'query'),
  catchAsync(async (req, res) => {
    const db = require('../config/database');
    const { filters } = req.query;
    
    let whereClause = "WHERE ef.status = 'active'";
    const params = [];
    
    if (filters.category_l1) {
      params.push(filters.category_l1);
      whereClause += ` AND ef.category_l1 = $${params.length}`;
    }
    
    if (filters.quality_grade) {
      params.push(filters.quality_grade);
      whereClause += ` AND ef.quality_grade = $${params.length}`;
    }
    
    const query = `
      SELECT 
        ef.country_code,
        gr.country_name_cn,
        ef.region,
        COUNT(*) as count,
        ROUND(AVG(ef.emission_value_num), 4) as avg_value,
        COUNT(DISTINCT ef.category_l1) as category_count,
        array_agg(DISTINCT ef.category_l1) as categories
      FROM emission_factors ef
      LEFT JOIN geographic_regions gr ON ef.country_code = gr.country_code AND ef.region = gr.region_code
      ${whereClause}
      GROUP BY ef.country_code, gr.country_name_cn, ef.region
      ORDER BY count DESC
    `;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  })
);

/**
 * @route   GET /api/v1/stats/quality-distribution
 * @desc    获取质量分布统计
 * @access  Public
 */
router.get('/quality-distribution',
  catchAsync(async (req, res) => {
    const db = require('../config/database');
    
    const query = `
      SELECT 
        quality_grade,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
        COUNT(DISTINCT category_l1) as category_count,
        COUNT(DISTINCT country_code) as country_count,
        ROUND(AVG(emission_value_num), 4) as avg_value
      FROM emission_factors 
      WHERE status = 'active'
      GROUP BY quality_grade
      ORDER BY quality_grade
    `;
    
    const result = await db.query(query);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  })
);

/**
 * @route   GET /api/v1/stats/trends
 * @desc    获取时间趋势分析
 * @access  Public
 */
router.get('/trends',
  validateRequest(Joi.object({
    category_l1: Joi.string().valid('Energy', 'Transport', 'Industry', 'Agriculture', 'Waste'),
    country_code: Joi.string().length(2).uppercase(),
    start_year: Joi.number().integer().min(1990).default(2020),
    end_year: Joi.number().integer().min(1990).max(new Date().getFullYear()).default(new Date().getFullYear())
  }), 'query'),
  catchAsync(async (req, res) => {
    const db = require('../config/database');
    const { category_l1, country_code, start_year, end_year } = req.query;
    
    let whereClause = "WHERE status = 'active'";
    const params = [start_year, end_year];
    
    whereClause += ` AND reference_year BETWEEN $1 AND $2`;
    
    if (category_l1) {
      params.push(category_l1);
      whereClause += ` AND category_l1 = $${params.length}`;
    }
    
    if (country_code) {
      params.push(country_code);
      whereClause += ` AND country_code = $${params.length}`;
    }
    
    const query = `
      SELECT 
        reference_year,
        COUNT(*) as factor_count,
        ROUND(AVG(emission_value_num), 4) as avg_value,
        ROUND(MIN(emission_value_num), 4) as min_value,
        ROUND(MAX(emission_value_num), 4) as max_value,
        ROUND(STDDEV(emission_value_num), 4) as std_dev,
        COUNT(DISTINCT category_l2) as subcategory_count
      FROM emission_factors 
      ${whereClause}
      GROUP BY reference_year
      ORDER BY reference_year
    `;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      filters: {
        category_l1,
        country_code,
        year_range: `${start_year}-${end_year}`
      }
    });
  })
);

/**
 * @route   GET /api/v1/stats/comparison
 * @desc    对比分析（比较不同地区/分类的排放因子）
 * @access  Public
 */
router.get('/comparison',
  validateRequest(Joi.object({
    compare_by: Joi.string().valid('category', 'country', 'quality').default('category'),
    baseline: Joi.string().required(),
    targets: Joi.array().items(Joi.string()).min(1).max(5).required(),
    reference_year: Joi.number().integer().min(1990).max(new Date().getFullYear())
  }), 'query'),
  catchAsync(async (req, res) => {
    const db = require('../config/database');
    const { compare_by, baseline, targets, reference_year } = req.query;
    
    let groupField, whereField;
    switch (compare_by) {
      case 'category':
        groupField = 'category_l1';
        whereField = 'category_l1';
        break;
      case 'country':
        groupField = 'country_code';
        whereField = 'country_code';
        break;
      case 'quality':
        groupField = 'quality_grade';
        whereField = 'quality_grade';
        break;
    }
    
    const allTargets = [baseline, ...targets];
    const placeholders = allTargets.map((_, i) => `$${i + 1}`).join(',');
    const params = [...allTargets];
    
    let query = `
      SELECT 
        ${groupField} as group_value,
        COUNT(*) as count,
        ROUND(AVG(emission_value_num), 4) as avg_value,
        ROUND(MIN(emission_value_num), 4) as min_value,
        ROUND(MAX(emission_value_num), 4) as max_value
      FROM emission_factors 
      WHERE status = 'active' AND ${whereField} IN (${placeholders})
    `;
    
    if (reference_year) {
      params.push(reference_year);
      query += ` AND reference_year = $${params.length}`;
    }
    
    query += ` GROUP BY ${groupField} ORDER BY ${groupField}`;
    
    const result = await db.query(query, params);
    
    // 计算相对于baseline的差异
    const baselineData = result.rows.find(row => row.group_value === baseline);
    const comparison = result.rows.map(row => ({
      ...row,
      diff_from_baseline: baselineData ? 
        ((row.avg_value - baselineData.avg_value) / baselineData.avg_value * 100).toFixed(2) : null,
      is_baseline: row.group_value === baseline
    }));
    
    res.json({
      success: true,
      data: comparison,
      baseline_info: baselineData,
      comparison_config: {
        compare_by,
        baseline,
        targets,
        reference_year: reference_year || 'all_years'
      }
    });
  })
);

module.exports = router; 