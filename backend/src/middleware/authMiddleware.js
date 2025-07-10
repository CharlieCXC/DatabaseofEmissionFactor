const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const logger = require('../utils/logger');

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

/**
 * 生成JWT Token
 */
function generateTokens(user) {
    const payload = {
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions || {}
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { 
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'emission-factor-api',
        audience: 'emission-factor-app'
    });

    const refreshToken = jwt.sign(
        { id: user.id, uuid: user.uuid, type: 'refresh' }, 
        JWT_SECRET, 
        { 
            expiresIn: REFRESH_TOKEN_EXPIRES_IN,
            issuer: 'emission-factor-api',
            audience: 'emission-factor-app'
        }
    );

    return { accessToken, refreshToken };
}

/**
 * 验证密码
 */
async function verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * 加密密码
 */
async function hashPassword(password) {
    return bcrypt.hash(password, 12);
}

/**
 * JWT认证中间件
 */
async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: '访问令牌缺失',
                code: 'MISSING_TOKEN'
            });
        }

        // 验证JWT
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'emission-factor-api',
            audience: 'emission-factor-app'
        });

        // 检查用户是否存在且状态正常
        const userQuery = `
            SELECT id, uuid, username, email, full_name, role, permissions, 
                   status, last_login_at, failed_login_attempts, locked_until
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

        // 检查是否被锁定
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            return res.status(403).json({
                success: false,
                message: '账户已被锁定',
                code: 'ACCOUNT_LOCKED',
                locked_until: user.locked_until
            });
        }

        // 将用户信息添加到请求对象
        req.user = {
            id: user.id,
            uuid: user.uuid,
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            permissions: user.permissions || {}
        };

        // 记录活动日志（异步，不阻塞请求）
        logUserActivity(user.id, 'api_access', req).catch(err => {
            logger.error('Failed to log user activity:', err);
        });

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: '无效的访问令牌',
                code: 'INVALID_TOKEN'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '访问令牌已过期',
                code: 'TOKEN_EXPIRED'
            });
        } else {
            logger.error('Authentication error:', error);
            return res.status(500).json({
                success: false,
                message: '认证过程发生错误',
                code: 'AUTH_ERROR'
            });
        }
    }
}

/**
 * 角色权限检查中间件
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: '需要认证',
                code: 'AUTHENTICATION_REQUIRED'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: '权限不足',
                code: 'INSUFFICIENT_PERMISSIONS',
                required_roles: allowedRoles,
                user_role: req.user.role
            });
        }

        next();
    };
}

/**
 * 特定权限检查中间件
 */
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: '需要认证',
                code: 'AUTHENTICATION_REQUIRED'
            });
        }

        // 管理员拥有所有权限
        if (req.user.role === 'admin') {
            return next();
        }

        // 检查具体权限
        const userPermissions = req.user.permissions || {};
        if (!userPermissions[permission]) {
            return res.status(403).json({
                success: false,
                message: '权限不足',
                code: 'INSUFFICIENT_PERMISSIONS',
                required_permission: permission
            });
        }

        next();
    };
}

/**
 * 可选认证中间件（不强制要求认证）
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            const userQuery = `
                SELECT id, uuid, username, email, full_name, role, permissions
                FROM users 
                WHERE id = $1 AND status = 'active'
            `;
            
            const userResult = await pool.query(userQuery, [decoded.id]);
            
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                req.user = {
                    id: user.id,
                    uuid: user.uuid,
                    username: user.username,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    permissions: user.permissions || {}
                };
            }
        }

        next();
    } catch (error) {
        // 可选认证失败时不返回错误，继续处理
        next();
    }
}

/**
 * 记录用户活动日志
 */
async function logUserActivity(userId, action, req, resourceType = null, resourceId = null, metadata = {}) {
    try {
        const insertQuery = `
            INSERT INTO user_activity_logs (
                user_id, action, resource_type, resource_id, 
                ip_address, user_agent, request_method, request_path,
                metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

        await pool.query(insertQuery, [
            userId,
            action,
            resourceType,
            resourceId,
            req.ip,
            req.get('User-Agent'),
            req.method,
            req.path,
            JSON.stringify(metadata)
        ]);
    } catch (error) {
        logger.error('Failed to log user activity:', error);
    }
}

/**
 * 更新用户登录信息
 */
async function updateLoginInfo(userId, ipAddress) {
    try {
        const updateQuery = `
            UPDATE users 
            SET last_login_at = NOW(),
                last_login_ip = $2,
                login_count = login_count + 1,
                failed_login_attempts = 0
            WHERE id = $1
        `;
        
        await pool.query(updateQuery, [userId, ipAddress]);
    } catch (error) {
        logger.error('Failed to update login info:', error);
    }
}

/**
 * 处理登录失败
 */
async function handleLoginFailure(identifier) {
    try {
        // 增加失败尝试次数
        const updateQuery = `
            UPDATE users 
            SET failed_login_attempts = failed_login_attempts + 1,
                locked_until = CASE 
                    WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '30 minutes'
                    ELSE locked_until 
                END
            WHERE (username = $1 OR email = $1) AND status = 'active'
            RETURNING failed_login_attempts, locked_until
        `;
        
        const result = await pool.query(updateQuery, [identifier]);
        
        if (result.rows.length > 0) {
            const { failed_login_attempts, locked_until } = result.rows[0];
            return {
                attempts: failed_login_attempts,
                locked: locked_until !== null
            };
        }
        
        return null;
    } catch (error) {
        logger.error('Failed to handle login failure:', error);
        return null;
    }
}

/**
 * 保存用户会话
 */
async function saveUserSession(userId, tokenHash, refreshTokenHash, deviceInfo, req) {
    try {
        const insertQuery = `
            INSERT INTO user_sessions (
                user_id, token_hash, refresh_token_hash, device_info,
                ip_address, user_agent, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '24 hours')
            RETURNING id
        `;

        const result = await pool.query(insertQuery, [
            userId,
            tokenHash,
            refreshTokenHash,
            JSON.stringify(deviceInfo),
            req.ip,
            req.get('User-Agent')
        ]);

        return result.rows[0].id;
    } catch (error) {
        logger.error('Failed to save user session:', error);
        return null;
    }
}

/**
 * 清理过期会话
 */
async function cleanupExpiredSessions() {
    try {
        await pool.query(`
            UPDATE user_sessions 
            SET is_active = false 
            WHERE expires_at < NOW() AND is_active = true
        `);
    } catch (error) {
        logger.error('Failed to cleanup expired sessions:', error);
    }
}

module.exports = {
    generateTokens,
    verifyPassword,
    hashPassword,
    authenticateToken,
    requireRole,
    requirePermission,
    optionalAuth,
    logUserActivity,
    updateLoginInfo,
    handleLoginFailure,
    saveUserSession,
    cleanupExpiredSessions,
    JWT_SECRET,
    JWT_EXPIRES_IN
}; 