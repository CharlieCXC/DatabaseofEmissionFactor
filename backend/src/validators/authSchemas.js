const Joi = require('joi');

// 通用用户名验证
const usernameSchema = Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
        'string.alphanum': '用户名只能包含字母和数字',
        'string.min': '用户名至少需要3个字符',
        'string.max': '用户名不能超过30个字符',
        'any.required': '用户名为必填项'
    });

// 通用邮箱验证
const emailSchema = Joi.string()
    .email()
    .max(255)
    .required()
    .messages({
        'string.email': '请输入有效的邮箱地址',
        'string.max': '邮箱地址不能超过255个字符',
        'any.required': '邮箱为必填项'
    });

// 通用密码验证
const passwordSchema = Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
        'string.min': '密码至少需要8个字符',
        'string.max': '密码不能超过128个字符',
        'string.pattern.base': '密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符',
        'any.required': '密码为必填项'
    });

// 简化密码验证（用于测试环境）
const simplePasswordSchema = Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
        'string.min': '密码至少需要6个字符',
        'string.max': '密码不能超过128个字符',
        'any.required': '密码为必填项'
    });

// 手机号验证
const phoneSchema = Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .allow('')
    .messages({
        'string.pattern.base': '请输入有效的手机号码'
    });

// 用户登录验证
const loginSchema = Joi.object({
    identifier: Joi.string()
        .required()
        .messages({
            'any.required': '用户名或邮箱为必填项'
        }),
    password: Joi.string()
        .required()
        .messages({
            'any.required': '密码为必填项'
        }),
    remember: Joi.boolean().default(false),
    device_info: Joi.object({
        device_type: Joi.string().allow(''),
        device_name: Joi.string().allow(''),
        browser: Joi.string().allow(''),
        os: Joi.string().allow('')
    }).default({})
});

// 用户注册验证
const registerSchema = Joi.object({
    username: usernameSchema,
    email: emailSchema,
    password: process.env.NODE_ENV === 'production' ? passwordSchema : simplePasswordSchema,
    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
            'any.only': '确认密码必须与密码一致',
            'any.required': '确认密码为必填项'
        }),
    full_name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': '姓名至少需要2个字符',
            'string.max': '姓名不能超过100个字符',
            'any.required': '姓名为必填项'
        }),
    phone: phoneSchema,
    organization: Joi.string()
        .max(200)
        .allow('')
        .messages({
            'string.max': '组织名称不能超过200个字符'
        }),
    department: Joi.string()
        .max(100)
        .allow('')
        .messages({
            'string.max': '部门名称不能超过100个字符'
        }),
    position: Joi.string()
        .max(100)
        .allow('')
        .messages({
            'string.max': '职位名称不能超过100个字符'
        })
});

// 密码重置请求验证
const passwordResetRequestSchema = Joi.object({
    email: emailSchema
});

// 密码重置验证
const passwordResetSchema = Joi.object({
    token: Joi.string()
        .required()
        .messages({
            'any.required': '重置令牌为必填项'
        }),
    password: process.env.NODE_ENV === 'production' ? passwordSchema : simplePasswordSchema,
    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
            'any.only': '确认密码必须与密码一致',
            'any.required': '确认密码为必填项'
        })
});

// 修改密码验证
const changePasswordSchema = Joi.object({
    current_password: Joi.string()
        .required()
        .messages({
            'any.required': '当前密码为必填项'
        }),
    new_password: process.env.NODE_ENV === 'production' ? passwordSchema : simplePasswordSchema,
    confirm_password: Joi.string()
        .valid(Joi.ref('new_password'))
        .required()
        .messages({
            'any.only': '确认密码必须与新密码一致',
            'any.required': '确认密码为必填项'
        })
});

// 用户信息更新验证
const updateProfileSchema = Joi.object({
    email: emailSchema.optional(),
    full_name: Joi.string()
        .min(2)
        .max(100)
        .messages({
            'string.min': '姓名至少需要2个字符',
            'string.max': '姓名不能超过100个字符'
        }),
    phone: phoneSchema,
    organization: Joi.string()
        .max(200)
        .allow('')
        .messages({
            'string.max': '组织名称不能超过200个字符'
        }),
    department: Joi.string()
        .max(100)
        .allow('')
        .messages({
            'string.max': '部门名称不能超过100个字符'
        }),
    position: Joi.string()
        .max(100)
        .allow('')
        .messages({
            'string.max': '职位名称不能超过100个字符'
        })
}).min(1).messages({
    'object.min': '至少需要更新一个字段'
});

// 管理员创建用户验证
const adminCreateUserSchema = Joi.object({
    username: usernameSchema,
    email: emailSchema,
    password: process.env.NODE_ENV === 'production' ? passwordSchema : simplePasswordSchema,
    full_name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': '姓名至少需要2个字符',
            'string.max': '姓名不能超过100个字符',
            'any.required': '姓名为必填项'
        }),
    role: Joi.string()
        .valid('admin', 'editor', 'viewer', 'user')
        .default('user')
        .messages({
            'any.only': '无效的用户角色'
        }),
    phone: phoneSchema,
    organization: Joi.string()
        .max(200)
        .allow('')
        .messages({
            'string.max': '组织名称不能超过200个字符'
        }),
    department: Joi.string()
        .max(100)
        .allow('')
        .messages({
            'string.max': '部门名称不能超过100个字符'
        }),
    position: Joi.string()
        .max(100)
        .allow('')
        .messages({
            'string.max': '职位名称不能超过100个字符'
        }),
    status: Joi.string()
        .valid('active', 'inactive', 'pending')
        .default('active')
        .messages({
            'any.only': '无效的用户状态'
        }),
    permissions: Joi.object().default({})
});

// 管理员更新用户验证
const adminUpdateUserSchema = Joi.object({
    email: emailSchema.optional(),
    full_name: Joi.string()
        .min(2)
        .max(100)
        .messages({
            'string.min': '姓名至少需要2个字符',
            'string.max': '姓名不能超过100个字符'
        }),
    role: Joi.string()
        .valid('admin', 'editor', 'viewer', 'user')
        .messages({
            'any.only': '无效的用户角色'
        }),
    phone: phoneSchema,
    organization: Joi.string()
        .max(200)
        .allow('')
        .messages({
            'string.max': '组织名称不能超过200个字符'
        }),
    department: Joi.string()
        .max(100)
        .allow('')
        .messages({
            'string.max': '部门名称不能超过100个字符'
        }),
    position: Joi.string()
        .max(100)
        .allow('')
        .messages({
            'string.max': '职位名称不能超过100个字符'
        }),
    status: Joi.string()
        .valid('active', 'inactive', 'pending', 'banned')
        .messages({
            'any.only': '无效的用户状态'
        }),
    permissions: Joi.object()
}).min(1).messages({
    'object.min': '至少需要更新一个字段'
});

// 刷新令牌验证
const refreshTokenSchema = Joi.object({
    refresh_token: Joi.string()
        .required()
        .messages({
            'any.required': '刷新令牌为必填项'
        })
});

// 用户查询验证
const userQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    page_size: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().allow(''),
    role: Joi.string().valid('admin', 'editor', 'viewer', 'user').allow(''),
    status: Joi.string().valid('active', 'inactive', 'pending', 'banned').allow(''),
    organization: Joi.string().allow(''),
    sort_by: Joi.string().valid('created_at', 'updated_at', 'last_login_at', 'username', 'email').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
});

module.exports = {
    loginSchema,
    registerSchema,
    passwordResetRequestSchema,
    passwordResetSchema,
    changePasswordSchema,
    updateProfileSchema,
    adminCreateUserSchema,
    adminUpdateUserSchema,
    refreshTokenSchema,
    userQuerySchema,
    usernameSchema,
    emailSchema,
    passwordSchema,
    simplePasswordSchema
}; 