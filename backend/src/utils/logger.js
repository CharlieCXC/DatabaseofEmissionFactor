const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    return logMessage;
  })
);

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'emission-factor-api'
  },
  transports: [
    // 错误日志单独文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // 所有日志
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true
    })
  ],
  
  // 异常处理
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log')
    })
  ],
  
  // 拒绝处理（Promise rejections）
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log')
    })
  ]
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let logMessage = `${timestamp} ${level}: ${message}`;
        
        if (Object.keys(meta).length > 0) {
          logMessage += ` ${JSON.stringify(meta, null, 2)}`;
        }
        
        return logMessage;
      })
    )
  }));
}

// 扩展logger功能
logger.database = (operation, params = {}) => {
  logger.debug('Database operation', {
    operation,
    ...params,
    type: 'database'
  });
};

logger.api = (method, url, statusCode, responseTime, params = {}) => {
  const level = statusCode >= 400 ? 'warn' : 'info';
  logger.log(level, 'API request', {
    method,
    url,
    statusCode,
    responseTime: `${responseTime}ms`,
    ...params,
    type: 'api'
  });
};

logger.security = (event, details = {}) => {
  logger.warn('Security event', {
    event,
    ...details,
    type: 'security'
  });
};

logger.performance = (operation, duration, details = {}) => {
  const level = duration > 1000 ? 'warn' : 'info';
  logger.log(level, 'Performance metric', {
    operation,
    duration: `${duration}ms`,
    ...details,
    type: 'performance'
  });
};

// 日志清理函数（可选）
logger.cleanup = () => {
  const files = fs.readdirSync(logDir);
  const now = Date.now();
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
  
  files.forEach(file => {
    const filePath = path.join(logDir, file);
    const stats = fs.statSync(filePath);
    
    if (now - stats.mtime.getTime() > maxAge) {
      fs.unlinkSync(filePath);
      logger.info(`Cleaned up old log file: ${file}`);
    }
  });
};

module.exports = logger; 