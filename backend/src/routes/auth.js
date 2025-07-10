const express = require('express');
const crypto = require('crypto');
const pool = require('../config/database');
const logger = require('../utils/logger');
const { validateRequest } = require('../middleware/validateRequest');
const {
    generateTokens,
    verifyPassword,
    hashPassword,
    authenticateToken,
    requireRole,
    logUserActivity,
    updateLoginInfo,
    handleLoginFailure,
    saveUserSession,
    cleanupExpiredSessions
} = require('../middleware/authMiddleware');

const {
    loginSchema,
    registerSchema,
    passwordResetRequestSchema,
    passwordResetSchema,
    changePasswordSchema,
    updateProfileSchema,
    adminCreateUserSchema,
    adminUpdateUserSchema,
    refreshTokenSchema,
    userQuerySchema
} = require('../validators/authSchemas');

const router = express.Router();

// =====================================================
// 公开路由（无需认证）
// =====================================================

/**
 * @route   POST /auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', validateRequest(loginSchema), async (req, res) => {
    try {
        const { identifier, password, remember, device_info } = req.body;

        // 查询用户（支持用户名或邮箱登录）
        const userQuery = `
            SELECT id, uuid, username, email, full_name, password_hash, 
                   role, permissions, status, failed_login_attempts, locked_until
            FROM users 
            WHERE (username = $1 OR email = $1) AND status != 'banned'
        `;
        
        const userResult = await pool.query(userQuery, [identifier]);
        
        if (userResult.rows.length === 0) {
            await logUserActivity(null, 'login_failed', req, null, null, {
                reason: 'user_not_found',
                identifier
            });
            
            return res.status(401).json({
                success: false,
                message: '用户名、邮箱或密码错误',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const user = userResult.rows[0];

        // 检查账户是否被锁定
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            return res.status(403).json({
                success: false,
                message: '账户已被锁定，请稍后再试',
                code: 'ACCOUNT_LOCKED',
                locked_until: user.locked_until
            });
        }

        // 验证密码
        const isPasswordValid = await verifyPassword(password, user.password_hash);
        
        if (!isPasswordValid) {
            // 处理登录失败
            const failureInfo = await handleLoginFailure(identifier);
            
            await logUserActivity(user.id, 'login_failed', req, null, null, {
                reason: 'invalid_password',
                attempts: failureInfo?.attempts || 0
            });

            return res.status(401).json({
                success: false,
                message: failureInfo?.locked 
                    ? '密码错误次数过多，账户已被锁定30分钟' 
                    : '用户名、邮箱或密码错误',
                code: failureInfo?.locked ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS',
                attempts_remaining: Math.max(0, 5 - (failureInfo?.attempts || 0))
            });
        }

        // 检查用户状态
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: user.status === 'inactive' ? '账户已被停用' : '账户尚未激活',
                code: 'ACCOUNT_DISABLED'
            });
        }

        // 生成JWT令牌
        const tokens = generateTokens(user);

        // 保存会话信息
        const tokenHash = crypto.createHash('sha256').update(tokens.accessToken).digest('hex');
        const refreshTokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
        
        await saveUserSession(
            user.id,
            tokenHash,
            refreshTokenHash,
            device_info,
            req
        );

        // 更新登录信息
        await updateLoginInfo(user.id, req.ip);

        // 记录登录成功日志
        await logUserActivity(user.id, 'login_success', req, null, null, {
            device_info,
            remember
        });

        // 返回用户信息和令牌
        res.json({
            success: true,
            message: '登录成功',
            data: {
                user: {
                    id: user.id,
                    uuid: user.uuid,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    permissions: user.permissions || {}
                },
                tokens: {
                    access_token: tokens.accessToken,
                    refresh_token: tokens.refreshToken,
                    expires_in: '24h'
                }
            }
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: '登录过程发生错误',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * @route   POST /auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post('/register', validateRequest(registerSchema), async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            full_name,
            phone,
            organization,
            department,
            position
        } = req.body;

        // 检查用户名和邮箱是否已存在
        const existingUserQuery = `
            SELECT username, email FROM users 
            WHERE username = $1 OR email = $2
        `;
        
        const existingUser = await pool.query(existingUserQuery, [username, email]);
        
        if (existingUser.rows.length > 0) {
            const existing = existingUser.rows[0];
            return res.status(409).json({
                success: false,
                message: existing.username === username ? '用户名已存在' : '邮箱已被注册',
                code: 'USER_EXISTS'
            });
        }

        // 加密密码
        const hashedPassword = await hashPassword(password);
        const salt = crypto.randomBytes(32).toString('hex');

        // 创建用户
        const insertQuery = `
            INSERT INTO users (
                username, email, password_hash, salt, full_name, 
                phone, organization, department, position, role, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'user', 'active')
            RETURNING id, uuid, username, email, full_name, role, created_at
        `;

        const result = await pool.query(insertQuery, [
            username,
            email,
            hashedPassword,
            salt,
            full_name,
            phone || null,
            organization || null,
            department || null,
            position || null
        ]);

        const newUser = result.rows[0];

        // 记录注册日志
        await logUserActivity(newUser.id, 'user_registered', req, 'user', newUser.id, {
            registration_method: 'web',
            organization
        });

        logger.info(`New user registered: ${username} (${email})`);

        res.status(201).json({
            success: true,
            message: '注册成功',
            data: {
                user: {
                    id: newUser.id,
                    uuid: newUser.uuid,
                    username: newUser.username,
                    email: newUser.email,
                    full_name: newUser.full_name,
                    role: newUser.role,
                    created_at: newUser.created_at
                }
            }
        });

    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: '注册过程发生错误',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * @route   POST /auth/refresh
 * @desc    刷新访问令牌
 * @access  Public
 */
router.post('/refresh', validateRequest(refreshTokenSchema), async (req, res) => {
    try {
        const { refresh_token } = req.body;

        // 验证刷新令牌
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../middleware/authMiddleware');
        
        const decoded = jwt.verify(refresh_token, JWT_SECRET);
        
        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                success: false,
                message: '无效的刷新令牌',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }

        // 查询用户信息
        const userQuery = `
            SELECT id, uuid, username, email, full_name, role, permissions, status
            FROM users 
            WHERE id = $1 AND status = 'active'
        `;
        
        const userResult = await pool.query(userQuery, [decoded.id]);
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: '用户不存在或已被禁用',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = userResult.rows[0];

        // 生成新的访问令牌
        const tokens = generateTokens(user);

        // 记录令牌刷新日志
        await logUserActivity(user.id, 'token_refreshed', req);

        res.json({
            success: true,
            message: '令牌刷新成功',
            data: {
                tokens: {
                    access_token: tokens.accessToken,
                    refresh_token: tokens.refreshToken,
                    expires_in: '24h'
                }
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '无效或过期的刷新令牌',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }

        logger.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            message: '令牌刷新过程发生错误',
            code: 'INTERNAL_ERROR'
        });
    }
});

// =====================================================
// 需要认证的路由
// =====================================================

/**
 * @route   POST /auth/logout
 * @desc    用户登出
 * @access  Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (token) {
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            
            // 标记会话为已登出
            await pool.query(`
                UPDATE user_sessions 
                SET is_active = false, logout_at = NOW()
                WHERE token_hash = $1 AND user_id = $2
            `, [tokenHash, req.user.id]);
        }

        // 记录登出日志
        await logUserActivity(req.user.id, 'logout', req);

        res.json({
            success: true,
            message: '登出成功'
        });

    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: '登出过程发生错误',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * @route   GET /auth/profile
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userQuery = `
            SELECT id, uuid, username, email, full_name, phone, 
                   organization, department, position, role, permissions,
                   created_at, updated_at, last_login_at, login_count
            FROM users 
            WHERE id = $1
        `;
        
        const result = await pool.query(userQuery, [req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    uuid: user.uuid,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    phone: user.phone,
                    organization: user.organization,
                    department: user.department,
                    position: user.position,
                    role: user.role,
                    permissions: user.permissions || {},
                    created_at: user.created_at,
                    updated_at: user.updated_at,
                    last_login_at: user.last_login_at,
                    login_count: user.login_count
                }
            }
        });

    } catch (error) {
        logger.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: '获取用户信息失败',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * @route   PUT /auth/profile
 * @desc    更新当前用户信息
 * @access  Private
 */
router.put('/profile', authenticateToken, validateRequest(updateProfileSchema), async (req, res) => {
    try {
        const updates = req.body;
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        // 构建动态更新查询
        for (const [key, value] of Object.entries(updates)) {
            updateFields.push(`${key} = $${paramCount}`);
            updateValues.push(value);
            paramCount++;
        }

        updateFields.push(`updated_at = NOW()`);
        updateFields.push(`updated_by = $${paramCount}`);
        updateValues.push(req.user.id);
        paramCount++;

        const updateQuery = `
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, uuid, username, email, full_name, phone, 
                     organization, department, position, role, updated_at
        `;
        
        updateValues.push(req.user.id);
        
        const result = await pool.query(updateQuery, updateValues);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在',
                code: 'USER_NOT_FOUND'
            });
        }

        const updatedUser = result.rows[0];

        // 记录更新日志
        await logUserActivity(req.user.id, 'profile_updated', req, 'user', req.user.id, {
            updated_fields: Object.keys(updates)
        });

        res.json({
            success: true,
            message: '用户信息更新成功',
            data: {
                user: updatedUser
            }
        });

    } catch (error) {
        logger.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: '更新用户信息失败',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * @route   POST /auth/change-password
 * @desc    修改密码
 * @access  Private
 */
router.post('/change-password', authenticateToken, validateRequest(changePasswordSchema), async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        // 获取当前密码
        const userQuery = `
            SELECT password_hash FROM users WHERE id = $1
        `;
        
        const userResult = await pool.query(userQuery, [req.user.id]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在',
                code: 'USER_NOT_FOUND'
            });
        }

        const { password_hash } = userResult.rows[0];

        // 验证当前密码
        const isCurrentPasswordValid = await verifyPassword(current_password, password_hash);
        
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: '当前密码错误',
                code: 'INVALID_CURRENT_PASSWORD'
            });
        }

        // 加密新密码
        const newHashedPassword = await hashPassword(new_password);
        const newSalt = crypto.randomBytes(32).toString('hex');

        // 更新密码
        const updateQuery = `
            UPDATE users 
            SET password_hash = $1, 
                salt = $2, 
                password_changed_at = NOW(),
                updated_at = NOW(),
                updated_by = $3
            WHERE id = $3
        `;
        
        await pool.query(updateQuery, [newHashedPassword, newSalt, req.user.id]);

        // 记录密码修改日志
        await logUserActivity(req.user.id, 'password_changed', req, 'user', req.user.id);

        res.json({
            success: true,
            message: '密码修改成功'
        });

    } catch (error) {
        logger.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: '修改密码失败',
            code: 'INTERNAL_ERROR'
        });
    }
});

// =====================================================
// 管理员路由
// =====================================================

/**
 * @route   GET /auth/users
 * @desc    获取用户列表（管理员）
 * @access  Private (Admin)
 */
router.get('/users', authenticateToken, requireRole('admin'), validateRequest(userQuerySchema, 'query'), async (req, res) => {
    try {
        const {
            page,
            page_size,
            search,
            role,
            status,
            organization,
            sort_by,
            sort_order
        } = req.query;

        // 构建查询条件
        const conditions = ['1=1'];
        const values = [];
        let paramCount = 1;

        if (search) {
            conditions.push(`(username ILIKE $${paramCount} OR email ILIKE $${paramCount} OR full_name ILIKE $${paramCount})`);
            values.push(`%${search}%`);
            paramCount++;
        }

        if (role) {
            conditions.push(`role = $${paramCount}`);
            values.push(role);
            paramCount++;
        }

        if (status) {
            conditions.push(`status = $${paramCount}`);
            values.push(status);
            paramCount++;
        }

        if (organization) {
            conditions.push(`organization ILIKE $${paramCount}`);
            values.push(`%${organization}%`);
            paramCount++;
        }

        // 计算总数
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM users 
            WHERE ${conditions.join(' AND ')}
        `;
        
        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);

        // 获取用户列表
        const offset = (page - 1) * page_size;
        const usersQuery = `
            SELECT id, uuid, username, email, full_name, phone, 
                   organization, department, position, role, status,
                   created_at, updated_at, last_login_at, login_count,
                   failed_login_attempts, locked_until
            FROM users 
            WHERE ${conditions.join(' AND ')}
            ORDER BY ${sort_by} ${sort_order.toUpperCase()}
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;
        
        values.push(page_size, offset);
        
        const usersResult = await pool.query(usersQuery, values);

        res.json({
            success: true,
            data: {
                users: usersResult.rows,
                pagination: {
                    page,
                    page_size,
                    total,
                    total_pages: Math.ceil(total / page_size)
                }
            }
        });

    } catch (error) {
        logger.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: '获取用户列表失败',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * @route   POST /auth/users
 * @desc    创建用户（管理员）
 * @access  Private (Admin)
 */
router.post('/users', authenticateToken, requireRole('admin'), validateRequest(adminCreateUserSchema), async (req, res) => {
    try {
        const userData = req.body;

        // 检查用户名和邮箱是否已存在
        const existingUserQuery = `
            SELECT username, email FROM users 
            WHERE username = $1 OR email = $2
        `;
        
        const existingUser = await pool.query(existingUserQuery, [userData.username, userData.email]);
        
        if (existingUser.rows.length > 0) {
            const existing = existingUser.rows[0];
            return res.status(409).json({
                success: false,
                message: existing.username === userData.username ? '用户名已存在' : '邮箱已被注册',
                code: 'USER_EXISTS'
            });
        }

        // 加密密码
        const hashedPassword = await hashPassword(userData.password);
        const salt = crypto.randomBytes(32).toString('hex');

        // 创建用户
        const insertQuery = `
            INSERT INTO users (
                username, email, password_hash, salt, full_name, phone,
                organization, department, position, role, status, permissions,
                created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, uuid, username, email, full_name, role, status, created_at
        `;

        const result = await pool.query(insertQuery, [
            userData.username,
            userData.email,
            hashedPassword,
            salt,
            userData.full_name,
            userData.phone || null,
            userData.organization || null,
            userData.department || null,
            userData.position || null,
            userData.role,
            userData.status,
            JSON.stringify(userData.permissions),
            req.user.id
        ]);

        const newUser = result.rows[0];

        // 记录创建日志
        await logUserActivity(req.user.id, 'user_created', req, 'user', newUser.id, {
            created_user: userData.username,
            role: userData.role
        });

        res.status(201).json({
            success: true,
            message: '用户创建成功',
            data: {
                user: newUser
            }
        });

    } catch (error) {
        logger.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: '创建用户失败',
            code: 'INTERNAL_ERROR'
        });
    }
});

// 定期清理过期会话
setInterval(cleanupExpiredSessions, 60 * 60 * 1000); // 每小时清理一次

module.exports = router; 