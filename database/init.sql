-- =====================================================
-- 排放因子数据库初始化脚本
-- 版本: MVP v1.0
-- 创建时间: 2024
-- =====================================================

-- 创建数据库（如果需要）
-- CREATE DATABASE emission_factor_db;

-- 连接到数据库
-- \c emission_factor_db;

-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 启用中文全文搜索扩展
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 启用加密扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 用户认证系统表
-- =====================================================

-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    
    -- 基本信息
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    full_name VARCHAR(100) NOT NULL,
    
    -- 认证信息
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    
    -- 角色和权限
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'editor', 'viewer', 'user')),
    permissions JSONB DEFAULT '{}',
    
    -- 状态管理
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'banned')),
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    
    -- 登录信息
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- 密码管理
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- 组织信息
    organization VARCHAR(200),
    department VARCHAR(100),
    position VARCHAR(100),
    
    -- 元数据
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- 用户会话表
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    
    -- 会话信息
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    
    -- 时间管理
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 状态
    is_active BOOLEAN DEFAULT TRUE,
    logout_at TIMESTAMP WITH TIME ZONE
);

-- 用户操作日志表
CREATE TABLE user_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- 操作信息
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    description TEXT,
    
    -- 请求信息
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    
    -- 结果信息
    status_code INTEGER,
    error_message TEXT,
    
    -- 元数据
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 主表：排放因子表
-- =====================================================
CREATE TABLE emission_factors (
    -- 主键和唯一标识
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    
    -- 核心业务数据（JSONB格式便于扩展）
    activity_category JSONB NOT NULL CHECK (
        activity_category ? 'level_1' AND 
        activity_category ? 'level_2' AND 
        activity_category ? 'level_3' AND
        activity_category ? 'display_name_cn'
    ),
    
    geographic_scope JSONB NOT NULL CHECK (
        geographic_scope ? 'country_code' AND
        geographic_scope ? 'region' AND
        geographic_scope ? 'display_name_cn'
    ),
    
    emission_value JSONB NOT NULL CHECK (
        emission_value ? 'value' AND
        emission_value ? 'unit' AND
        emission_value ? 'reference_year' AND
        (emission_value->>'value')::NUMERIC > 0
    ),
    
    data_source JSONB NOT NULL CHECK (
        data_source ? 'organization' AND
        data_source ? 'publication' AND
        data_source ? 'publication_date'
    ),
    
    quality_info JSONB NOT NULL CHECK (
        quality_info ? 'grade' AND
        quality_info ? 'confidence' AND
        quality_info ? 'last_review_date' AND
        quality_info->>'grade' IN ('A', 'B', 'C', 'D')
    ),
    
    -- 系统字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'system',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'review')),
    
    -- 搜索优化字段（从JSONB中提取便于索引）
    category_l1 VARCHAR(50) GENERATED ALWAYS AS (activity_category->>'level_1') STORED,
    category_l2 VARCHAR(50) GENERATED ALWAYS AS (activity_category->>'level_2') STORED,
    category_l3 VARCHAR(50) GENERATED ALWAYS AS (activity_category->>'level_3') STORED,
    country_code VARCHAR(10) GENERATED ALWAYS AS (geographic_scope->>'country_code') STORED,
    region VARCHAR(100) GENERATED ALWAYS AS (geographic_scope->>'region') STORED,
    reference_year INTEGER GENERATED ALWAYS AS ((emission_value->>'reference_year')::integer) STORED,
    quality_grade VARCHAR(5) GENERATED ALWAYS AS (quality_info->>'grade') STORED,
    emission_value_num NUMERIC GENERATED ALWAYS AS ((emission_value->>'value')::NUMERIC) STORED,
    emission_unit VARCHAR(50) GENERATED ALWAYS AS (emission_value->>'unit') STORED
);

-- =====================================================
-- 索引策略 - 针对常用查询模式优化
-- =====================================================

-- 用户认证系统索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_organization ON users(organization);
CREATE INDEX idx_users_last_login ON users(last_login_at DESC);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active, expires_at) WHERE is_active = true;

CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_action ON user_activity_logs(action);
CREATE INDEX idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX idx_user_activity_logs_resource ON user_activity_logs(resource_type, resource_id);

-- 主要搜索条件的复合索引
CREATE INDEX idx_ef_main_search ON emission_factors(category_l1, category_l2, country_code, reference_year);

-- 分类层级索引
CREATE INDEX idx_ef_category ON emission_factors(category_l1, category_l2, category_l3);

-- 地理位置索引
CREATE INDEX idx_ef_geography ON emission_factors(country_code, region);

-- 时间相关索引
CREATE INDEX idx_ef_year ON emission_factors(reference_year DESC);
CREATE INDEX idx_ef_created ON emission_factors(created_at DESC);

-- 质量等级索引
CREATE INDEX idx_ef_quality ON emission_factors(quality_grade, status);

-- 状态索引
CREATE INDEX idx_ef_status ON emission_factors(status) WHERE status = 'active';

-- 数值范围索引（用于统计查询）
CREATE INDEX idx_ef_value_range ON emission_factors(emission_unit, emission_value_num);

-- 全文搜索索引（支持中文搜索）
CREATE INDEX idx_ef_fulltext ON emission_factors USING gin(
    to_tsvector('english', 
        COALESCE(activity_category->>'display_name_cn', '') || ' ' ||
        COALESCE(geographic_scope->>'display_name_cn', '') || ' ' ||
        COALESCE(data_source->>'organization', '') || ' ' ||
        COALESCE(data_source->>'publication', '')
    )
);

-- JSONB字段的GIN索引（支持复杂JSONB查询）
CREATE INDEX idx_ef_activity_gin ON emission_factors USING gin(activity_category);
CREATE INDEX idx_ef_geographic_gin ON emission_factors USING gin(geographic_scope);
CREATE INDEX idx_ef_source_gin ON emission_factors USING gin(data_source);

-- =====================================================
-- 触发器 - 自动更新时间戳
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_emission_factors_updated_at 
    BEFORE UPDATE ON emission_factors 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 数据验证函数
-- =====================================================

-- 验证排放因子数值合理性
CREATE OR REPLACE FUNCTION validate_emission_value(
    category_l1 TEXT,
    category_l2 TEXT,
    emission_value NUMERIC,
    emission_unit TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- 电力排放因子合理性检查 (0.1-2.0 kgCO2eq/kWh)
    IF category_l1 = 'Energy' AND category_l2 = 'Electricity' THEN
        IF emission_unit = 'kgCO2eq/kWh' THEN
            RETURN emission_value BETWEEN 0.1 AND 2.0;
        END IF;
    END IF;
    
    -- 交通排放因子合理性检查 (0.05-0.5 kgCO2eq/km)
    IF category_l1 = 'Transport' THEN
        IF emission_unit = 'kgCO2eq/km' THEN
            RETURN emission_value BETWEEN 0.05 AND 0.5;
        END IF;
    END IF;
    
    -- 工业排放因子合理性检查 (0.5-5.0 kgCO2eq/kg)
    IF category_l1 = 'Industry' THEN
        IF emission_unit = 'kgCO2eq/kg' THEN
            RETURN emission_value BETWEEN 0.5 AND 5.0;
        END IF;
    END IF;
    
    -- 默认检查：数值必须为正数
    RETURN emission_value > 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 初始化基础数据 - 数据字典表
-- =====================================================

-- 活动分类字典表
CREATE TABLE activity_categories (
    id SERIAL PRIMARY KEY,
    level_1 VARCHAR(50) NOT NULL,
    level_1_cn VARCHAR(100) NOT NULL,
    level_2 VARCHAR(50) NOT NULL,
    level_2_cn VARCHAR(100) NOT NULL,
    level_3 VARCHAR(50) NOT NULL,
    level_3_cn VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(level_1, level_2, level_3)
);

-- 地理区域字典表
CREATE TABLE geographic_regions (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(10) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    country_name_cn VARCHAR(100) NOT NULL,
    region_code VARCHAR(100) NOT NULL,
    region_name VARCHAR(200) NOT NULL,
    region_name_cn VARCHAR(200) NOT NULL,
    region_type VARCHAR(50), -- 'grid', 'province', 'city', 'custom'
    parent_region VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(country_code, region_code)
);

-- 排放单位字典表
CREATE TABLE emission_units (
    id SERIAL PRIMARY KEY,
    unit_code VARCHAR(50) UNIQUE NOT NULL,
    unit_name VARCHAR(100) NOT NULL,
    unit_name_cn VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'electricity', 'transport', 'industry', etc.
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 插入基础字典数据
-- =====================================================

-- 活动分类基础数据
INSERT INTO activity_categories (level_1, level_1_cn, level_2, level_2_cn, level_3, level_3_cn, description) VALUES
-- 能源类
('Energy', '能源', 'Electricity', '电力', 'Coal_Power', '燃煤发电', '燃煤发电排放因子'),
('Energy', '能源', 'Electricity', '电力', 'Gas_Power', '燃气发电', '天然气发电排放因子'),
('Energy', '能源', 'Electricity', '电力', 'Nuclear_Power', '核电', '核能发电排放因子'),
('Energy', '能源', 'Electricity', '电力', 'Wind_Power', '风电', '风能发电排放因子'),
('Energy', '能源', 'Electricity', '电力', 'Solar_Power', '光伏发电', '太阳能光伏发电排放因子'),
('Energy', '能源', 'Electricity', '电力', 'Hydro_Power', '水电', '水力发电排放因子'),
('Energy', '能源', 'Heat', '供热', 'Coal_Boiler', '燃煤锅炉', '燃煤供热锅炉排放因子'),
('Energy', '能源', 'Heat', '供热', 'Gas_Boiler', '燃气锅炉', '燃气供热锅炉排放因子'),

-- 交通运输类
('Transport', '交通', 'Road', '公路', 'Gasoline_Car', '汽油乘用车', '汽油乘用车排放因子'),
('Transport', '交通', 'Road', '公路', 'Diesel_Car', '柴油乘用车', '柴油乘用车排放因子'),
('Transport', '交通', 'Road', '公路', 'Electric_Car', '电动乘用车', '电动乘用车排放因子'),
('Transport', '交通', 'Road', '公路', 'Gasoline_Truck', '汽油货车', '汽油货车排放因子'),
('Transport', '交通', 'Road', '公路', 'Diesel_Truck', '柴油货车', '柴油货车排放因子'),
('Transport', '交通', 'Aviation', '航空', 'Domestic_Flight', '国内航班', '国内航班排放因子'),
('Transport', '交通', 'Aviation', '航空', 'International_Flight', '国际航班', '国际航班排放因子'),
('Transport', '交通', 'Rail', '铁路', 'Electric_Train', '电力机车', '电力机车排放因子'),
('Transport', '交通', 'Rail', '铁路', 'Diesel_Train', '内燃机车', '内燃机车排放因子'),

-- 工业类
('Industry', '工业', 'Steel', '钢铁', 'Blast_Furnace', '高炉炼钢', '高炉-转炉炼钢排放因子'),
('Industry', '工业', 'Steel', '钢铁', 'Electric_Furnace', '电炉炼钢', '电弧炉炼钢排放因子'),
('Industry', '工业', 'Cement', '水泥', 'Dry_Process', '干法水泥', '干法水泥生产排放因子'),
('Industry', '工业', 'Cement', '水泥', 'Wet_Process', '湿法水泥', '湿法水泥生产排放因子'),
('Industry', '工业', 'Aluminum', '铝业', 'Primary_Aluminum', '电解铝', '原铝生产排放因子'),
('Industry', '工业', 'Aluminum', '铝业', 'Secondary_Aluminum', '再生铝', '再生铝生产排放因子'),
('Industry', '工业', 'Chemical', '化工', 'Ethylene', '乙烯', '乙烯生产排放因子'),
('Industry', '工业', 'Chemical', '化工', 'Ammonia', '合成氨', '合成氨生产排放因子');

-- 地理区域基础数据
INSERT INTO geographic_regions (country_code, country_name, country_name_cn, region_code, region_name, region_name_cn, region_type) VALUES
-- 中国主要区域
('CN', 'China', '中国', 'National', 'National Average', '全国平均', 'country'),
('CN', 'China', '中国', 'North_China_Grid', 'North China Grid', '华北电网', 'grid'),
('CN', 'China', '中国', 'Northeast_Grid', 'Northeast Grid', '东北电网', 'grid'),
('CN', 'China', '中国', 'East_China_Grid', 'East China Grid', '华东电网', 'grid'),
('CN', 'China', '中国', 'Central_China_Grid', 'Central China Grid', '华中电网', 'grid'),
('CN', 'China', '中国', 'Northwest_Grid', 'Northwest Grid', '西北电网', 'grid'),
('CN', 'China', '中国', 'South_Grid', 'South Grid', '南方电网', 'grid'),
('CN', 'China', '中国', 'Beijing', 'Beijing', '北京市', 'province'),
('CN', 'China', '中国', 'Shanghai', 'Shanghai', '上海市', 'province'),
('CN', 'China', '中国', 'Guangdong', 'Guangdong Province', '广东省', 'province'),
('CN', 'China', '中国', 'Jiangsu', 'Jiangsu Province', '江苏省', 'province'),
('CN', 'China', '中国', 'Shandong', 'Shandong Province', '山东省', 'province'),

-- 其他主要国家
('US', 'United States', '美国', 'National', 'National Average', '全国平均', 'country'),
('US', 'United States', '美国', 'WECC', 'Western Electricity Coordinating Council', '西部电力协调委员会', 'grid'),
('US', 'United States', '美国', 'ERCOT', 'Electric Reliability Council of Texas', '德克萨斯州电力可靠性委员会', 'grid'),
('JP', 'Japan', '日本', 'National', 'National Average', '全国平均', 'country'),
('DE', 'Germany', '德国', 'National', 'National Average', '全国平均', 'country'),
('GB', 'United Kingdom', '英国', 'National', 'National Average', '全国平均', 'country');

-- 排放单位基础数据
INSERT INTO emission_units (unit_code, unit_name, unit_name_cn, category, description) VALUES
('kgCO2eq/kWh', 'kg CO2 equivalent per kWh', '千克二氧化碳当量每千瓦时', 'electricity', '电力排放因子标准单位'),
('gCO2eq/kWh', 'gram CO2 equivalent per kWh', '克二氧化碳当量每千瓦时', 'electricity', '电力排放因子小单位'),
('kgCO2eq/MJ', 'kg CO2 equivalent per MJ', '千克二氧化碳当量每兆焦', 'energy', '能源排放因子单位'),
('kgCO2eq/km', 'kg CO2 equivalent per kilometer', '千克二氧化碳当量每公里', 'transport', '交通排放因子单位'),
('gCO2eq/km', 'gram CO2 equivalent per kilometer', '克二氧化碳当量每公里', 'transport', '交通排放因子小单位'),
('kgCO2eq/tkm', 'kg CO2 equivalent per tonne-kilometer', '千克二氧化碳当量每吨公里', 'transport', '货运排放因子单位'),
('kgCO2eq/kg', 'kg CO2 equivalent per kg product', '千克二氧化碳当量每千克产品', 'industry', '工业产品排放因子单位'),
('tCO2eq/t', 'tonne CO2 equivalent per tonne product', '吨二氧化碳当量每吨产品', 'industry', '工业产品排放因子大单位'),
('kgCO2eq/m3', 'kg CO2 equivalent per cubic meter', '千克二氧化碳当量每立方米', 'material', '材料排放因子单位'),
('kgCO2eq/L', 'kg CO2 equivalent per liter', '千克二氧化碳当量每升', 'fuel', '燃料排放因子单位');

-- =====================================================
-- 示例排放因子数据插入
-- =====================================================
INSERT INTO emission_factors (
    activity_category,
    geographic_scope,
    emission_value,
    data_source,
    quality_info,
    created_by
) VALUES 
-- 华北电网燃煤发电示例
(
    '{"level_1": "Energy", "level_2": "Electricity", "level_3": "Coal_Power", "display_name_cn": "华北电网燃煤发电"}',
    '{"country_code": "CN", "region": "North_China_Grid", "display_name_cn": "华北电网"}',
    '{"value": 0.8241, "unit": "kgCO2eq/kWh", "reference_year": 2024}',
    '{"organization": "中国电力企业联合会", "publication": "中国电力行业年度发展报告2024", "publication_date": "2024-02-28", "url": "https://www.cec.org.cn"}',
    '{"grade": "A", "confidence": "High", "last_review_date": "2024-03-15", "notes": "基于156家电厂实际运行数据统计"}',
    'system'
),
-- 全国电网平均排放因子示例
(
    '{"level_1": "Energy", "level_2": "Electricity", "level_3": "Grid_Average", "display_name_cn": "全国电网平均"}',
    '{"country_code": "CN", "region": "National", "display_name_cn": "全国平均"}',
    '{"value": 0.5703, "unit": "kgCO2eq/kWh", "reference_year": 2024}',
    '{"organization": "生态环境部", "publication": "2024年企业温室气体排放核算方法与报告指南", "publication_date": "2024-01-10"}',
    '{"grade": "A", "confidence": "High", "last_review_date": "2024-01-15", "notes": "官方发布的全国电网平均排放因子"}',
    'system'
);

-- =====================================================
-- 创建视图 - 便于查询和展示
-- =====================================================

-- 排放因子详细信息视图
CREATE VIEW v_emission_factors_detail AS
SELECT 
    ef.id,
    ef.uuid,
    ef.category_l1,
    ef.category_l2, 
    ef.category_l3,
    ef.activity_category->>'display_name_cn' AS category_display_name,
    ef.country_code,
    ef.region,
    ef.geographic_scope->>'display_name_cn' AS region_display_name,
    ef.emission_value_num,
    ef.emission_unit,
    ef.reference_year,
    ef.data_source->>'organization' AS data_organization,
    ef.data_source->>'publication' AS data_publication,
    ef.quality_grade,
    ef.quality_info->>'confidence' AS confidence_level,
    ef.status,
    ef.created_at,
    ef.updated_at
FROM emission_factors ef
WHERE ef.status = 'active';

-- 数据统计视图
CREATE VIEW v_emission_factors_stats AS
SELECT 
    category_l1,
    category_l2,
    country_code,
    quality_grade,
    COUNT(*) AS factor_count,
    AVG(emission_value_num) AS avg_emission_value,
    MIN(emission_value_num) AS min_emission_value,
    MAX(emission_value_num) AS max_emission_value,
    MIN(reference_year) AS earliest_year,
    MAX(reference_year) AS latest_year
FROM emission_factors 
WHERE status = 'active'
GROUP BY category_l1, category_l2, country_code, quality_grade;

-- =====================================================
-- 权限设置（建议）
-- =====================================================

-- 创建只读用户（用于API查询）
-- CREATE USER ef_readonly WITH PASSWORD 'your_readonly_password';
-- GRANT CONNECT ON DATABASE emission_factor_db TO ef_readonly;
-- GRANT USAGE ON SCHEMA public TO ef_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO ef_readonly;

-- 创建读写用户（用于管理界面）
-- CREATE USER ef_readwrite WITH PASSWORD 'your_readwrite_password';
-- GRANT CONNECT ON DATABASE emission_factor_db TO ef_readwrite;
-- GRANT USAGE ON SCHEMA public TO ef_readwrite;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ef_readwrite;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO ef_readwrite;

-- =====================================================
-- 用户表触发器
-- =====================================================

-- 用户表更新时间戳触发器
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 用户会话表更新触发器
CREATE OR REPLACE FUNCTION update_session_last_used()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_sessions_last_used 
    BEFORE UPDATE ON user_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_session_last_used();

-- =====================================================
-- 初始化管理员用户
-- =====================================================

-- 插入默认管理员用户 (密码: admin123456)
INSERT INTO users (
    username,
    email,
    full_name,
    password_hash,
    salt,
    role,
    status,
    email_verified,
    organization,
    department,
    position,
    created_by
) VALUES (
    'admin',
    'admin@emissionfactor.com',
    '系统管理员',
    crypt('admin123456', gen_salt('bf', 10)),
    gen_salt('bf', 10),
    'admin',
    'active',
    true,
    '排放因子数据库管理中心',
    '系统管理部',
    '系统管理员',
    NULL
);

-- 插入测试用户 (密码: user123456)  
INSERT INTO users (
    username,
    email,
    full_name,
    password_hash,
    salt,
    role,
    status,
    email_verified,
    organization,
    department,
    position,
    created_by
) VALUES (
    'testuser',
    'testuser@emissionfactor.com',
    '测试用户',
    crypt('user123456', gen_salt('bf', 10)),
    gen_salt('bf', 10),
    'user',
    'active',
    true,
    '测试机构',
    '环境部',
    '环境数据分析师',
    1
);

-- =====================================================
-- 完成提示
-- =====================================================
SELECT 'Database initialization completed successfully!' AS status; 