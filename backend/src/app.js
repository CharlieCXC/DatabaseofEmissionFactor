const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const emissionFactorRoutes = require('./routes/emissionFactors');
const dictionaryRoutes = require('./routes/dictionaries');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3001;

// ===== 中间件配置 =====

// 安全中间件
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// 压缩响应
app.use(compression());

// CORS配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 请求速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 限制每个IP 100个请求
  message: {
    error: 'Too many requests from this IP, please try again later.',
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 请求日志
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// 解析JSON和URL编码数据
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ===== 路由配置 =====

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API路由
const apiPrefix = process.env.API_PREFIX || '/api';
const apiVersion = process.env.API_VERSION || 'v1';

app.use(`${apiPrefix}/${apiVersion}/auth`, authRoutes);
app.use(`${apiPrefix}/${apiVersion}/emission-factors`, emissionFactorRoutes);
app.use(`${apiPrefix}/${apiVersion}/dictionaries`, dictionaryRoutes);
app.use(`${apiPrefix}/${apiVersion}/stats`, statsRoutes);

// API文档路由
app.get(`${apiPrefix}/${apiVersion}/docs`, (req, res) => {
  res.json({
    name: 'Emission Factor API',
    version: '1.0.0',
    description: 'ESG合规平台排放因子库API',
    endpoints: {
      'GET /health': '健康检查',
      // 认证相关
      'POST /api/v1/auth/login': '用户登录',
      'POST /api/v1/auth/register': '用户注册',
      'POST /api/v1/auth/logout': '用户登出',
      'POST /api/v1/auth/refresh': '刷新令牌',
      'GET /api/v1/auth/profile': '获取用户信息',
      'PUT /api/v1/auth/profile': '更新用户信息',
      'POST /api/v1/auth/change-password': '修改密码',
      'GET /api/v1/auth/users': '获取用户列表（管理员）',
      'POST /api/v1/auth/users': '创建用户（管理员）',
      // 排放因子相关
      'GET /api/v1/emission-factors': '查询排放因子',
      'POST /api/v1/emission-factors': '创建排放因子',
      'PUT /api/v1/emission-factors/:uuid': '更新排放因子',
      'DELETE /api/v1/emission-factors/:uuid': '删除排放因子',
      'POST /api/v1/emission-factors/import': '批量导入',
      'GET /api/v1/emission-factors/export': '数据导出',
      // 字典和统计
      'GET /api/v1/dictionaries/*': '字典数据',
      'GET /api/v1/stats/*': '统计数据'
    }
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// 全局错误处理
app.use(errorHandler);

// ===== 服务器启动 =====

// 优雅关闭处理
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  server.close(() => {
    logger.info('HTTP server closed.');
    
    // 关闭数据库连接
    const pool = require('./config/database');
    pool.end(() => {
      logger.info('Database connection closed.');
      process.exit(0);
    });
  });

  // 如果10秒内没有完成关闭，强制退出
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// 启动服务器
const server = app.listen(PORT, () => {
  logger.info(`🚀 Emission Factor API Server started on port ${PORT}`);
  logger.info(`📚 API Documentation: http://localhost:${PORT}${apiPrefix}/${apiVersion}/docs`);
  logger.info(`💊 Health Check: http://localhost:${PORT}/health`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// 处理进程信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app; 