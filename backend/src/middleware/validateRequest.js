const { ValidationError } = require('./errorHandler');

/**
 * 请求验证中间件
 * @param {Joi.Schema} schema - Joi验证模式
 * @param {string} source - 验证数据源 ('body', 'query', 'params')
 * @returns {Function} Express中间件函数
 */
const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    // 获取要验证的数据
    let dataToValidate;
    switch (source) {
      case 'query':
        dataToValidate = req.query;
        break;
      case 'params':
        dataToValidate = req.params;
        break;
      case 'headers':
        dataToValidate = req.headers;
        break;
      case 'body':
      default:
        dataToValidate = req.body;
        break;
    }

    // 执行验证
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // 显示所有验证错误
      allowUnknown: true, // 允许未知字段
      stripUnknown: true // 移除未知字段
    });

    // 如果有验证错误，抛出ValidationError
    if (error) {
      const details = {};
      error.details.forEach(detail => {
        const path = detail.path.join('.');
        details[path] = detail.message;
      });

      return next(new ValidationError('请求数据验证失败', details));
    }

    // 将验证后的数据写回原位置
    switch (source) {
      case 'query':
        req.query = value;
        break;
      case 'params':
        req.params = value;
        break;
      case 'headers':
        req.headers = value;
        break;
      case 'body':
      default:
        req.body = value;
        break;
    }

    next();
  };
};

/**
 * 多数据源验证中间件
 * @param {Object} schemas - 验证模式对象 { body: schema, query: schema, params: schema }
 * @returns {Function} Express中间件函数
 */
const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const errors = {};

    // 验证每个数据源
    for (const [source, schema] of Object.entries(schemas)) {
      let dataToValidate;
      
      switch (source) {
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        case 'headers':
          dataToValidate = req.headers;
          break;
        case 'body':
          dataToValidate = req.body;
          break;
        default:
          continue;
      }

      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true
      });

      if (error) {
        errors[source] = {};
        error.details.forEach(detail => {
          const path = detail.path.join('.');
          errors[source][path] = detail.message;
        });
      } else {
        // 将验证后的数据写回
        switch (source) {
          case 'query':
            req.query = value;
            break;
          case 'params':
            req.params = value;
            break;
          case 'headers':
            req.headers = value;
            break;
          case 'body':
            req.body = value;
            break;
        }
      }
    }

    // 如果有任何验证错误，抛出ValidationError
    if (Object.keys(errors).length > 0) {
      return next(new ValidationError('请求数据验证失败', errors));
    }

    next();
  };
};

/**
 * 条件验证中间件 - 仅在特定条件下验证
 * @param {Joi.Schema} schema - Joi验证模式
 * @param {Function} condition - 条件函数 (req) => boolean
 * @param {string} source - 验证数据源
 * @returns {Function} Express中间件函数
 */
const validateConditional = (schema, condition, source = 'body') => {
  return (req, res, next) => {
    // 检查条件
    if (!condition(req)) {
      return next();
    }

    // 如果条件满足，执行正常验证
    return validateRequest(schema, source)(req, res, next);
  };
};

/**
 * 文件验证中间件
 * @param {Object} options - 验证选项
 * @param {string[]} options.allowedMimes - 允许的MIME类型
 * @param {number} options.maxSize - 最大文件大小（字节）
 * @param {boolean} options.required - 是否必需文件
 * @returns {Function} Express中间件函数
 */
const validateFile = (options = {}) => {
  const {
    allowedMimes = [],
    maxSize = 10 * 1024 * 1024, // 10MB
    required = false
  } = options;

  return (req, res, next) => {
    const file = req.file;

    // 检查是否需要文件
    if (required && !file) {
      return next(new ValidationError('文件是必需的'));
    }

    // 如果没有文件但不是必需的，直接通过
    if (!file) {
      return next();
    }

    // 验证MIME类型
    if (allowedMimes.length > 0 && !allowedMimes.includes(file.mimetype)) {
      return next(new ValidationError(`不支持的文件类型: ${file.mimetype}`, {
        allowed: allowedMimes,
        received: file.mimetype
      }));
    }

    // 验证文件大小
    if (file.size > maxSize) {
      return next(new ValidationError(`文件过大: ${file.size} bytes`, {
        maxSize: maxSize,
        receivedSize: file.size
      }));
    }

    next();
  };
};

/**
 * UUID参数验证中间件
 * @param {string} paramName - 参数名称，默认为'uuid'
 * @returns {Function} Express中间件函数
 */
const validateUUID = (paramName = 'uuid') => {
  const Joi = require('joi');
  
  const uuidSchema = Joi.object({
    [paramName]: Joi.string().uuid().required()
  });

  return validateRequest(uuidSchema, 'params');
};

/**
 * 分页参数验证中间件
 * @param {Object} options - 选项
 * @param {number} options.maxLimit - 最大限制数量
 * @param {number} options.defaultLimit - 默认限制数量
 * @returns {Function} Express中间件函数
 */
const validatePagination = (options = {}) => {
  const Joi = require('joi');
  const { maxLimit = 100, defaultLimit = 20 } = options;

  const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(maxLimit).default(defaultLimit),
    offset: Joi.number().integer().min(0)
  });

  return (req, res, next) => {
    const middleware = validateRequest(paginationSchema, 'query');
    
    // 执行验证后，计算offset
    middleware(req, res, (err) => {
      if (err) return next(err);
      
      // 如果没有提供offset，根据page和limit计算
      if (req.query.offset === undefined) {
        req.query.offset = (req.query.page - 1) * req.query.limit;
      }
      
      next();
    });
  };
};

module.exports = {
  validateRequest,
  validateMultiple,
  validateConditional,
  validateFile,
  validateUUID,
  validatePagination
}; 