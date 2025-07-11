const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorHandler');
const { validateRequest } = require('../middleware/validateRequest');
const Joi = require('joi');

// 简单的查询验证模式
const queryDictionarySchema = Joi.object({
  search: Joi.string().max(100),
  limit: Joi.number().integer().min(1).max(100).default(50),
  is_active: Joi.boolean().default(true)
});

/**
 * @route   GET /api/v1/dictionaries/activity-categories
 * @desc    获取活动分类字典
 * @access  Public
 * @query   { search?, limit?, is_active? }
 */
router.get('/activity-categories',
  validateRequest(queryDictionarySchema, 'query'),
  catchAsync(async (req, res) => {
    const db = require('../config/database');
    const { search, limit, is_active } = req.query;
    
    let query = `
      SELECT 
        level_1, level_1_cn, level_2, level_2_cn, level_3, level_3_cn, description
      FROM activity_categories 
      WHERE is_active = $1
    `;
    const params = [is_active];
    
    if (search) {
      query += ` AND (
        level_1_cn ILIKE $2 OR level_2_cn ILIKE $2 OR level_3_cn ILIKE $2 OR
        level_1 ILIKE $2 OR level_2 ILIKE $2 OR level_3 ILIKE $2 OR
        description ILIKE $2
      )`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY level_1, level_2, level_3 LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  })
);

/**
 * @route   GET /api/v1/dictionaries/geographic-regions
 * @desc    获取地理区域字典
 * @access  Public
 */
router.get('/geographic-regions',
  validateRequest(queryDictionarySchema, 'query'),
  catchAsync(async (req, res) => {
    const db = require('../config/database');
    const { search, limit, is_active } = req.query;
    
    let query = `
      SELECT 
        country_code, country_name, country_name_cn,
        region_code, region_name, region_name_cn, region_type
      FROM geographic_regions 
      WHERE is_active = $1
    `;
    const params = [is_active];
    
    if (search) {
      query += ` AND (
        country_name_cn ILIKE $2 OR region_name_cn ILIKE $2 OR
        country_name ILIKE $2 OR region_name ILIKE $2 OR
        country_code ILIKE $2 OR region_code ILIKE $2
      )`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY country_name, region_name LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  })
);

/**
 * @route   GET /api/v1/dictionaries/emission-units
 * @desc    获取排放单位字典
 * @access  Public
 */
router.get('/emission-units',
  validateRequest(queryDictionarySchema, 'query'),
  catchAsync(async (req, res) => {
    const db = require('../config/database');
    const { search, limit, is_active } = req.query;
    
    let query = `
      SELECT 
        unit_code, unit_name, unit_name_cn, category, description
      FROM emission_units 
      WHERE is_active = $1
    `;
    const params = [is_active];
    
    if (search) {
      query += ` AND (
        unit_name_cn ILIKE $2 OR unit_name ILIKE $2 OR
        unit_code ILIKE $2 OR category ILIKE $2
      )`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY category, unit_code LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  })
);

/**
 * @route   GET /api/v1/dictionaries/countries
 * @desc    获取国家列表
 * @access  Public
 */
router.get('/countries',
  validateRequest(queryDictionarySchema, 'query'),
  catchAsync(async (req, res) => {
    const db = require('../config/database');
    
    const query = `
      SELECT DISTINCT 
        country_code, country_name, country_name_cn
      FROM geographic_regions 
      WHERE is_active = true
      ORDER BY country_name
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
 * @route   GET /api/v1/dictionaries/all
 * @desc    获取所有字典数据
 * @access  Public
 */
router.get('/all',
  catchAsync(async (req, res) => {
    const db = require('../config/database');
    
    // 并行查询所有字典数据
    const [categories, regions, units] = await Promise.all([
      db.query('SELECT * FROM activity_categories WHERE is_active = true ORDER BY level_1, level_2, level_3'),
      db.query('SELECT * FROM geographic_regions WHERE is_active = true ORDER BY country_name, region_name'),
      db.query('SELECT * FROM emission_units WHERE is_active = true ORDER BY category, unit_code')
    ]);
    
    res.json({
      success: true,
      data: {
        activity_categories: categories.rows,
        geographic_regions: regions.rows,
        emission_units: units.rows
      },
      counts: {
        activity_categories: categories.rows.length,
        geographic_regions: regions.rows.length,
        emission_units: units.rows.length
      }
    });
  })
);

module.exports = router; 