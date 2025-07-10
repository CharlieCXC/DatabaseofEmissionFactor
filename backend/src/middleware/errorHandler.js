const logger = require('../utils/logger');

// 自定义错误类
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

// 处理数据库约束错误
const handleDatabaseConstraintError = (error) => {
  if (error.code === '23505') { // 唯一约束违反
    return new ValidationError('Duplicate entry. This record already exists.', {
      field: error.detail || 'unknown',
      constraint: error.constraint
    });
  }
  
  if (error.code === '23503') { // 外键约束违反
    return new ValidationError('Referenced record does not exist.', {
      constraint: error.constraint,
      detail: error.detail
    });
  }
  
  if (error.code === '23502') { // 非空约束违反
    return new ValidationError('Required field is missing.', {
      field: error.column,
      detail: error.detail
    });
  }
  
  if (error.code === '23514') { // 检查约束违反
    return new ValidationError('Data validation failed.', {
      constraint: error.constraint,
      detail: error.detail
    });
  }
  
  return new DatabaseError('Database operation failed', error);
};

// 处理Joi验证错误
const handleJoiValidationError = (error) => {
  const details = error.details.reduce((acc, detail) => {
    acc[detail.path.join('.')] = detail.message;
    return acc;
  }, {});
  
  return new ValidationError('Validation failed', details);
};

// 发送错误响应
const sendErrorResponse = (err, req, res) => {
  const { statusCode, message, status } = err;
  
  // 基本错误响应
  const errorResponse = {
    status,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };
  
  // 开发环境添加详细信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    
    if (err.details) {
      errorResponse.details = err.details;
    }
    
    if (err.originalError) {
      errorResponse.originalError = {
        message: err.originalError.message,
        code: err.originalError.code
      };
    }
  }
  
  // 生产环境只返回操作性错误的详细信息
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    errorResponse.message = 'Something went wrong!';
  }
  
  // 添加错误详情（如验证错误）
  if (err.details && process.env.NODE_ENV !== 'production') {
    errorResponse.details = err.details;
  }
  
  res.status(statusCode).json(errorResponse);
};

// 主错误处理中间件
const errorHandler = (err, req, res, next) => {
  // 复制错误对象
  let error = { ...err };
  error.message = err.message;
  
  // 记录错误日志
  const logContext = {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query
  };
  
  if (err.statusCode >= 500) {
    logger.error('Server error occurred', logContext);
  } else if (err.statusCode >= 400) {
    logger.warn('Client error occurred', logContext);
  } else {
    logger.error('Unhandled error occurred', logContext);
  }
  
  // 处理特定类型的错误
  
  // Joi验证错误
  if (err.name === 'ValidationError' && err.isJoi) {
    error = handleJoiValidationError(err);
  }
  
  // 数据库错误
  else if (err.code && err.code.startsWith('23')) {
    error = handleDatabaseConstraintError(err);
  }
  
  // PostgreSQL错误
  else if (err.code === 'ECONNREFUSED') {
    error = new DatabaseError('Database connection failed');
  }
  
  // JSON解析错误
  else if (err.type === 'entity.parse.failed') {
    error = new ValidationError('Invalid JSON format');
  }
  
  // 文件上传错误
  else if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ValidationError('File size too large');
  }
  
  else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new ValidationError('Unexpected file field');
  }
  
  // 如果不是已知的操作性错误，设置为500
  if (!error.statusCode) {
    error = new AppError('Something went wrong!', 500, false);
  }
  
  sendErrorResponse(error, req, res);
};

// 处理未找到的路由
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

// 异步错误捕获包装器
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  catchAsync,
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError
}; 