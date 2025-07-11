const pool = require('../config/database');
const logger = require('../utils/logger');
const XLSX = require('xlsx');
const csvParser = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * 查询排放因子列表
 */
const getEmissionFactors = async (req, res) => {
  try {
    const {
      page = 1,
      page_size = 20,
      category_l1,
      category_l2,
      category_l3,
      country_code,
      region,
      reference_year,
      quality_grade,
      search,
      sort_by = 'updated_at',
      sort_order = 'desc'
    } = req.query;

    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    // 构建WHERE条件
    if (category_l1) {
      paramCount++;
      whereConditions.push(`activity_category->>'level_1' = $${paramCount}`);
      params.push(category_l1);
    }

    if (category_l2) {
      paramCount++;
      whereConditions.push(`activity_category->>'level_2' = $${paramCount}`);
      params.push(category_l2);
    }

    if (category_l3) {
      paramCount++;
      whereConditions.push(`activity_category->>'level_3' = $${paramCount}`);
      params.push(category_l3);
    }

    if (country_code) {
      paramCount++;
      whereConditions.push(`geographic_scope->>'country_code' = $${paramCount}`);
      params.push(country_code);
    }

    if (region) {
      paramCount++;
      whereConditions.push(`geographic_scope->>'region' = $${paramCount}`);
      params.push(region);
    }

    if (reference_year) {
      paramCount++;
      whereConditions.push(`(emission_value->>'reference_year')::int = $${paramCount}`);
      params.push(parseInt(reference_year));
    }

    if (quality_grade) {
      paramCount++;
      whereConditions.push(`quality_info->>'grade' = $${paramCount}`);
      params.push(quality_grade);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(
        activity_category->>'display_name_cn' ILIKE $${paramCount} OR
        geographic_scope->>'display_name_cn' ILIKE $${paramCount} OR
        data_source->>'organization' ILIKE $${paramCount}
      )`);
      params.push(`%${search}%`);
    }

    // 只查询已发布的记录
    whereConditions.push("status = 'published'");

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';

    // 计算分页
    const limit = parseInt(page_size);
    const offset = (parseInt(page) - 1) * limit;

    // 查询数据
    const querySQL = `
      SELECT 
        uuid, activity_category, geographic_scope, emission_value, 
        data_source, quality_info, created_at, updated_at
      FROM emission_factors 
      ${whereClause}
      ORDER BY ${sort_by} ${sort_order.toUpperCase()}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);

    const result = await pool.query(querySQL, params);

    // 查询总数
    const countSQL = `
      SELECT COUNT(*) 
      FROM emission_factors 
      ${whereClause}
    `;

    const countResult = await pool.query(countSQL, params.slice(0, paramCount));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        current: parseInt(page),
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Query emission factors failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query emission factors'
    });
  }
};

/**
 * 获取单个排放因子详情
 */
const getEmissionFactor = async (req, res) => {
  try {
    const { uuid } = req.params;

    const result = await pool.query(
      'SELECT * FROM emission_factors WHERE uuid = $1',
      [uuid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Emission factor not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Get emission factor failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get emission factor'
    });
  }
};

/**
 * 创建排放因子
 */
const createEmissionFactor = async (req, res) => {
  try {
    const {
      activity_category,
      geographic_scope,
      emission_value,
      data_source,
      quality_info,
      created_by = 'system'
    } = req.body;

    const uuid = uuidv4();
    
    const result = await pool.query(`
      INSERT INTO emission_factors (
        uuid, activity_category, geographic_scope, emission_value,
        data_source, quality_info, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `, [
      uuid, 
      JSON.stringify(activity_category),
      JSON.stringify(geographic_scope),
      JSON.stringify(emission_value),
      JSON.stringify(data_source),
      JSON.stringify(quality_info),
      created_by
    ]);

    logger.info('Emission factor created:', { uuid });

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Create emission factor failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create emission factor'
    });
  }
};

/**
 * 批量创建排放因子
 */
const batchCreateEmissionFactors = async (req, res) => {
  try {
    const emissionFactors = req.body;

    if (!Array.isArray(emissionFactors) || emissionFactors.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format'
      });
    }

    const results = [];
    const errors = [];

    // 开始事务
    const client = await pool.connect();
    await client.query('BEGIN');

    try {
      for (let i = 0; i < emissionFactors.length; i++) {
        const factor = emissionFactors[i];
        const uuid = uuidv4();

        try {
          const result = await client.query(`
            INSERT INTO emission_factors (
              uuid, activity_category, geographic_scope, emission_value,
              data_source, quality_info, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            RETURNING uuid
          `, [
            uuid, 
            JSON.stringify(factor.activity_category),
            JSON.stringify(factor.geographic_scope),
            JSON.stringify(factor.emission_value),
            JSON.stringify(factor.data_source),
            JSON.stringify(factor.quality_info),
            factor.created_by || 'system'
          ]);

          results.push(result.rows[0]);
        } catch (error) {
          errors.push({
            index: i,
            data: factor,
            error: error.message
          });
        }
      }

      await client.query('COMMIT');
      logger.info('Batch create completed:', { created: results.length, errors: errors.length });

      res.json({
        success: true,
        data: {
          created: results.length,
          errors: errors.length,
          results,
          errors
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Batch create emission factors failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch create emission factors'
    });
  }
};

/**
 * 从Excel/CSV文件导入排放因子
 */
const importFromFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    let rawData = [];

    // 根据文件类型解析数据
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rawData = XLSX.utils.sheet_to_json(worksheet);
    } else if (fileExtension === '.csv') {
      rawData = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Unsupported file format'
      });
    }

    // 数据转换和验证
    const transformedData = [];
    const validationErrors = [];

    rawData.forEach((row, index) => {
      try {
        const transformed = transformImportRow(row);
        transformedData.push(transformed);
      } catch (error) {
        validationErrors.push({
          row: index + 2, // Excel行号从2开始
          error: error.message,
          data: row
        });
      }
    });

    // 删除临时文件
    fs.unlinkSync(filePath);

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Data validation failed',
        validationErrors,
        processedRows: rawData.length,
        errorCount: validationErrors.length
      });
    }

    // 批量插入数据库
    const importResult = await batchInsertEmissionFactors(transformedData);

    logger.info('File import completed:', {
      file: req.file.originalname,
      processed: rawData.length,
      imported: importResult.success,
      errors: importResult.errors
    });

    res.json({
      success: true,
      data: {
        totalRows: rawData.length,
        importedRows: importResult.success,
        errorRows: importResult.errors,
        message: `成功导入 ${importResult.success} 条数据`
      }
    });

  } catch (error) {
    // 删除临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    logger.error('Import from file failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import data from file'
    });
  }
};

/**
 * 导出排放因子数据
 */
const exportEmissionFactors = async (req, res) => {
  try {
    const {
      format = 'xlsx',
      category_l1,
      country_code,
      quality_grade,
      reference_year_start,
      reference_year_end
    } = req.query;

    // 构建查询条件
    let whereConditions = ["status = 'published'"];
    let params = [];
    let paramCount = 0;

    if (category_l1) {
      paramCount++;
      whereConditions.push(`activity_category->>'level_1' = $${paramCount}`);
      params.push(category_l1);
    }

    if (country_code) {
      paramCount++;
      whereConditions.push(`geographic_scope->>'country_code' = $${paramCount}`);
      params.push(country_code);
    }

    if (quality_grade) {
      paramCount++;
      whereConditions.push(`quality_info->>'grade' = $${paramCount}`);
      params.push(quality_grade);
    }

    if (reference_year_start) {
      paramCount++;
      whereConditions.push(`(emission_value->>'reference_year')::int >= $${paramCount}`);
      params.push(parseInt(reference_year_start));
    }

    if (reference_year_end) {
      paramCount++;
      whereConditions.push(`(emission_value->>'reference_year')::int <= $${paramCount}`);
      params.push(parseInt(reference_year_end));
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // 查询数据
    const result = await pool.query(`
      SELECT 
        activity_category->>'level_1' as category_l1,
        activity_category->>'level_2' as category_l2,
        activity_category->>'level_3' as category_l3,
        activity_category->>'display_name_cn' as category_name,
        geographic_scope->>'country_code' as country_code,
        geographic_scope->>'region' as region,
        geographic_scope->>'display_name_cn' as region_name,
        (emission_value->>'value')::numeric as emission_value,
        emission_value->>'unit' as unit,
        (emission_value->>'reference_year')::int as reference_year,
        data_source->>'organization' as data_organization,
        data_source->>'publication' as publication,
        data_source->>'publication_date' as publication_date,
        quality_info->>'grade' as quality_grade,
        quality_info->>'confidence' as confidence,
        created_at,
        updated_at
      FROM emission_factors 
      ${whereClause}
      ORDER BY updated_at DESC
    `, params);

    const exportData = result.rows.map(row => ({
      '活动分类L1': row.category_l1,
      '活动分类L2': row.category_l2,
      '活动分类L3': row.category_l3,
      '中文名称': row.category_name,
      '国家代码': row.country_code,
      '地区': row.region,
      '地区名称': row.region_name,
      '排放值': row.emission_value,
      '单位': row.unit,
      '参考年份': row.reference_year,
      '数据机构': row.data_organization,
      '出版物': row.publication,
      '发布日期': row.publication_date,
      '质量等级': row.quality_grade,
      '置信度': row.confidence,
      '创建时间': row.created_at,
      '更新时间': row.updated_at
    }));

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `排放因子数据_${timestamp}`;

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '排放因子数据');

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);

    } else if (format === 'csv') {
      const csvWriter = createCsvWriter({
        path: `/tmp/${filename}.csv`,
        header: Object.keys(exportData[0] || {}).map(key => ({ id: key, title: key }))
      });

      await csvWriter.writeRecords(exportData);
      const csvContent = fs.readFileSync(`/tmp/${filename}.csv`);

      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.send('\uFEFF' + csvContent); // BOM for UTF-8

      // 清理临时文件
      fs.unlinkSync(`/tmp/${filename}.csv`);

    } else {
      res.json({
        success: true,
        data: exportData,
        total: exportData.length
      });
    }

    logger.info('Export completed:', { format, count: exportData.length });

  } catch (error) {
    logger.error('Export emission factors failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data'
    });
  }
};

/**
 * 下载导入模板
 */
const downloadImportTemplate = async (req, res) => {
  try {
    const { format = 'xlsx' } = req.query;

    const templateData = [
      {
        '活动分类L1': 'Energy',
        '活动分类L2': 'Electricity',
        '活动分类L3': 'Coal_Power',
        '中文名称': '华北电网燃煤发电',
        '国家代码': 'CN',
        '地区': 'North_China_Grid',
        '地区名称': '华北电网',
        '排放值': 0.8872,
        '单位': 'kgCO2eq/kWh',
        '参考年份': 2024,
        '数据机构': '中国电力企业联合会',
        '出版物': '中国电力行业年度发展报告2024',
        '发布日期': '2024-06-01',
        '质量等级': 'A',
        '置信度': 'High',
        '网址': 'https://www.cec.org.cn',
        '备注': '基于2024年实际发电数据统计'
      },
      {
        '活动分类L1': 'Transport',
        '活动分类L2': 'Road',
        '活动分类L3': 'Gasoline_Car',
        '中文名称': '汽油乘用车',
        '国家代码': 'CN',
        '地区': 'National',
        '地区名称': '全国',
        '排放值': 0.2016,
        '单位': 'kgCO2eq/km',
        '参考年份': 2024,
        '数据机构': '生态环境部',
        '出版物': '国家温室气体清单指南',
        '发布日期': '2024-03-15',
        '质量等级': 'A',
        '置信度': 'High',
        '网址': 'https://www.mee.gov.cn',
        '备注': '轻型汽油车平均排放因子'
      }
    ];

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '排放因子模板');

      // 设置列宽
      const colWidths = Object.keys(templateData[0]).map(() => ({ wch: 15 }));
      ws['!cols'] = colWidths;

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      res.setHeader('Content-Disposition', 'attachment; filename="排放因子导入模板.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);

    } else if (format === 'csv') {
      const csvWriter = createCsvWriter({
        path: '/tmp/template.csv',
        header: Object.keys(templateData[0]).map(key => ({ id: key, title: key }))
      });

      await csvWriter.writeRecords(templateData);
      const csvContent = fs.readFileSync('/tmp/template.csv');

      res.setHeader('Content-Disposition', 'attachment; filename="排放因子导入模板.csv"');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.send('\uFEFF' + csvContent);

      fs.unlinkSync('/tmp/template.csv');
    }

    logger.info('Template downloaded:', { format });

  } catch (error) {
    logger.error('Download template failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download template'
    });
  }
};

/**
 * 获取统计数据
 */
const getStats = async (req, res) => {
  try {
    const totalQuery = `SELECT COUNT(*) as total FROM emission_factors WHERE status = 'published'`;
    const categoryQuery = `
      SELECT 
        activity_category->>'level_1' as category,
        COUNT(*) as count
      FROM emission_factors 
      WHERE status = 'published'
      GROUP BY activity_category->>'level_1'
      ORDER BY count DESC
    `;
    const qualityQuery = `
      SELECT 
        quality_info->>'grade' as grade,
        COUNT(*) as count
      FROM emission_factors 
      WHERE status = 'published'
      GROUP BY quality_info->>'grade'
      ORDER BY 
        CASE quality_info->>'grade'
          WHEN 'A' THEN 1
          WHEN 'B' THEN 2  
          WHEN 'C' THEN 3
          WHEN 'D' THEN 4
        END
    `;

    const [totalResult, categoryResult, qualityResult] = await Promise.all([
      pool.query(totalQuery),
      pool.query(categoryQuery),
      pool.query(qualityQuery)
    ]);

    res.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].total),
        byCategory: categoryResult.rows,
        byQuality: qualityResult.rows
      }
    });

  } catch (error) {
    logger.error('Get stats failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
};

/**
 * 获取表单选项数据
 */
const getFormOptions = async (req, res) => {
  try {
    const categoryQuery = `
      SELECT DISTINCT
        activity_category->>'level_1' as level_1,
        activity_category->>'level_2' as level_2,
        activity_category->>'level_3' as level_3
      FROM emission_factors 
      WHERE status = 'published'
      ORDER BY level_1, level_2, level_3
    `;

    const regionQuery = `
      SELECT DISTINCT
        geographic_scope->>'country_code' as country_code,
        geographic_scope->>'region' as region
      FROM emission_factors 
      WHERE status = 'published'
      ORDER BY country_code, region
    `;

    const unitQuery = `
      SELECT DISTINCT emission_value->>'unit' as unit
      FROM emission_factors 
      WHERE status = 'published'
      ORDER BY unit
    `;

    const [categoryResult, regionResult, unitResult] = await Promise.all([
      pool.query(categoryQuery),
      pool.query(regionQuery),
      pool.query(unitQuery)
    ]);

    // 组织分类数据
    const categories = {};
    categoryResult.rows.forEach(row => {
      if (!categories[row.level_1]) {
        categories[row.level_1] = {};
      }
      if (!categories[row.level_1][row.level_2]) {
        categories[row.level_1][row.level_2] = [];
      }
      if (!categories[row.level_1][row.level_2].includes(row.level_3)) {
        categories[row.level_1][row.level_2].push(row.level_3);
      }
    });

    // 组织地区数据
    const regions = {};
    regionResult.rows.forEach(row => {
      if (!regions[row.country_code]) {
        regions[row.country_code] = [];
      }
      if (!regions[row.country_code].includes(row.region)) {
        regions[row.country_code].push(row.region);
      }
    });

    res.json({
      success: true,
      data: {
        categories,
        regions,
        units: unitResult.rows.map(row => row.unit),
        qualityGrades: ['A', 'B', 'C', 'D'],
        confidenceLevels: ['High', 'Medium', 'Low']
      }
    });

  } catch (error) {
    logger.error('Get form options failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get form options'
    });
  }
};

// 辅助函数：转换导入行数据
function transformImportRow(row) {
  const required = ['活动分类L1', '活动分类L2', '活动分类L3', '中文名称', '国家代码', '地区', '排放值', '单位', '参考年份', '数据机构', '质量等级'];
  
  // 检查必填字段
  for (const field of required) {
    if (!row[field] || row[field] === '') {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // 验证数值
  const emissionValue = parseFloat(row['排放值']);
  if (isNaN(emissionValue) || emissionValue <= 0) {
    throw new Error('Invalid emission value');
  }

  const referenceYear = parseInt(row['参考年份']);
  if (isNaN(referenceYear) || referenceYear < 1990 || referenceYear > 2030) {
    throw new Error('Invalid reference year');
  }

  // 验证质量等级
  if (!['A', 'B', 'C', 'D'].includes(row['质量等级'])) {
    throw new Error('Invalid quality grade');
  }

  // 验证国家代码
  if (!/^[A-Z]{2}$/.test(row['国家代码'])) {
    throw new Error('Invalid country code');
  }

  return {
    activity_category: {
      level_1: row['活动分类L1'],
      level_2: row['活动分类L2'], 
      level_3: row['活动分类L3'],
      display_name_cn: row['中文名称']
    },
    geographic_scope: {
      country_code: row['国家代码'],
      region: row['地区'],
      display_name_cn: row['地区名称'] || row['地区']
    },
    emission_value: {
      value: emissionValue,
      unit: row['单位'],
      reference_year: referenceYear
    },
    data_source: {
      organization: row['数据机构'],
      publication: row['出版物'] || '',
      publication_date: row['发布日期'] || new Date().toISOString().slice(0, 10),
      url: row['网址'] || '',
      notes: row['备注'] || ''
    },
    quality_info: {
      grade: row['质量等级'],
      confidence: row['置信度'] || 'Medium',
      last_review_date: new Date().toISOString().slice(0, 10),
      notes: '',
      reviewer: ''
    },
    created_by: 'import_system'
  };
}

// 辅助函数：批量插入数据
async function batchInsertEmissionFactors(data) {
  const client = await pool.connect();
  let successCount = 0;
  let errorCount = 0;

  try {
    await client.query('BEGIN');

    for (const item of data) {
      try {
        const uuid = uuidv4();
        await client.query(`
          INSERT INTO emission_factors (
            uuid, activity_category, geographic_scope, emission_value,
            data_source, quality_info, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [
          uuid, 
          JSON.stringify(item.activity_category),
          JSON.stringify(item.geographic_scope),
          JSON.stringify(item.emission_value),
          JSON.stringify(item.data_source),
          JSON.stringify(item.quality_info),
          item.created_by
        ]);
        successCount++;
      } catch (error) {
        errorCount++;
        logger.error('Insert error:', error);
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return { success: successCount, errors: errorCount };
}

module.exports = {
  getEmissionFactors,
  getEmissionFactor,
  createEmissionFactor,
  batchCreateEmissionFactors,
  importFromFile,
  exportEmissionFactors,
  downloadImportTemplate,
  getStats,
  getFormOptions
}; 