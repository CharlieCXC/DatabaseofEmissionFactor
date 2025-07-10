const { Pool } = require('pg');
const logger = require('../utils/logger');

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'emission_factor_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20, // 连接池最大连接数
  idleTimeoutMillis: 30000, // 空闲连接超时时间
  connectionTimeoutMillis: 2000, // 连接超时时间
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// 创建连接池
const pool = new Pool(dbConfig);

// 连接事件监听
pool.on('connect', () => {
  logger.info('New client connected to database');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client:', err);
  process.exit(-1);
});

// 数据库查询包装器
const query = async (text, params) => {
  const start = Date.now();
  const client = await pool.connect();
  
  try {
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Executed query', {
      query: text,
      duration: `${duration}ms`,
      rows: result.rowCount
    });
    
    return result;
  } catch (error) {
    logger.error('Database query error:', {
      query: text,
      params: params,
      error: error.message
    });
    throw error;
  } finally {
    client.release();
  }
};

// 事务包装器
const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    
    logger.debug('Transaction completed successfully');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// 健康检查
const healthCheck = async () => {
  try {
    const result = await query('SELECT NOW() as timestamp, version() as version');
    return {
      status: 'healthy',
      timestamp: result.rows[0].timestamp,
      version: result.rows[0].version.split(' ')[0], // 只返回PostgreSQL版本号
      connections: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    };
  } catch (error) {
    logger.error('Database health check failed:', error.message);
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

// 数据库初始化检查
const initCheck = async () => {
  try {
    // 检查主表是否存在
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('emission_factors', 'activity_categories', 'geographic_regions', 'emission_units')
    `);
    
    if (tableCheck.rows.length < 4) {
      logger.warn('Database tables not fully initialized. Run npm run db:init');
      return false;
    }
    
    // 检查是否有基础数据
    const dataCheck = await query('SELECT COUNT(*) as count FROM activity_categories');
    if (parseInt(dataCheck.rows[0].count) === 0) {
      logger.warn('Database tables exist but no seed data found');
      return false;
    }
    
    logger.info('Database initialization check passed');
    return true;
  } catch (error) {
    logger.error('Database initialization check failed:', error.message);
    return false;
  }
};

// 优雅关闭
const close = async () => {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error('Error closing database pool:', error.message);
  }
};

// 导出数据库接口
module.exports = {
  pool,
  query,
  transaction,
  healthCheck,
  initCheck,
  close
}; 