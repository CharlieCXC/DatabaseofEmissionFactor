# MVP排放因子数据模型设计

## 核心字段设计（6个必需字段）

```typescript
interface EmissionFactorMVP {
  // 1. 基础标识
  id: string;                    // 系统内部ID
  uuid: string;                  // 全局唯一标识
  
  // 2. 活动分类（简化为3级）
  activity_category: {
    level_1: string;             // 一级：Energy/Transport/Industry
    level_2: string;             // 二级：Electricity/Road/Steel
    level_3: string;             // 三级：Coal_Power/Gasoline_Car
    display_name_cn: string;     // 中文显示名称
  };
  
  // 3. 地理范围（简化）
  geographic_scope: {
    country_code: string;        // 国家代码：CN/US
    region: string;             // 地区：North_China_Grid
    display_name_cn: string;     // 中文显示名称
  };
  
  // 4. 排放数值
  emission_value: {
    value: number;              // 数值
    unit: string;               // 单位：kgCO2eq/kWh
    reference_year: number;     // 参考年份
  };
  
  // 5. 数据来源（简化）
  data_source: {
    organization: string;       // 数据机构
    publication: string;        // 发布物
    url?: string;              // 链接（可选）
    publication_date: string;   // 发布日期
  };
  
  // 6. 质量信息（简化）
  quality_info: {
    grade: 'A' | 'B' | 'C' | 'D';  // 质量等级
    confidence: 'High' | 'Medium' | 'Low';  // 信心等级
    last_review_date: string;    // 最后审核日期
    notes?: string;             // 备注
  };
  
  // 系统字段
  created_at: string;
  updated_at: string;
  created_by: string;
  status: 'active' | 'inactive' | 'review';
}
```

## 数据库表结构

```sql
-- 主表：emission_factors
CREATE TABLE emission_factors (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    
    -- 活动分类（JSONB存储便于查询）
    activity_category JSONB NOT NULL,
    
    -- 地理范围
    geographic_scope JSONB NOT NULL,
    
    -- 排放值
    emission_value JSONB NOT NULL,
    
    -- 数据来源
    data_source JSONB NOT NULL,
    
    -- 质量信息
    quality_info JSONB NOT NULL,
    
    -- 系统字段
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    
    -- 搜索优化字段（冗余但提升性能）
    category_l1 VARCHAR(50) GENERATED ALWAYS AS (activity_category->>'level_1') STORED,
    category_l2 VARCHAR(50) GENERATED ALWAYS AS (activity_category->>'level_2') STORED,
    category_l3 VARCHAR(50) GENERATED ALWAYS AS (activity_category->>'level_3') STORED,
    country_code VARCHAR(10) GENERATED ALWAYS AS (geographic_scope->>'country_code') STORED,
    reference_year INTEGER GENERATED ALWAYS AS ((emission_value->>'reference_year')::integer) STORED,
    quality_grade VARCHAR(5) GENERATED ALWAYS AS (quality_info->>'grade') STORED
);

-- 索引策略
CREATE INDEX idx_ef_category ON emission_factors(category_l1, category_l2, category_l3);
CREATE INDEX idx_ef_geography ON emission_factors(country_code, (geographic_scope->>'region'));
CREATE INDEX idx_ef_year ON emission_factors(reference_year);
CREATE INDEX idx_ef_quality ON emission_factors(quality_grade);
CREATE INDEX idx_ef_status ON emission_factors(status);

-- 全文搜索索引
CREATE INDEX idx_ef_search ON emission_factors USING gin(
    (activity_category || geographic_scope || data_source)
);
```

## API接口设计

```typescript
// 1. 查询接口
GET /api/v1/emission-factors
Query Parameters:
- category_l1?: string
- category_l2?: string  
- category_l3?: string
- country_code?: string
- region?: string
- reference_year?: number
- quality_grade?: string[]
- keyword?: string (全文搜索)
- page?: number
- limit?: number

// 2. 详情接口
GET /api/v1/emission-factors/{uuid}

// 3. 创建接口
POST /api/v1/emission-factors
Body: EmissionFactorMVP

// 4. 更新接口
PUT /api/v1/emission-factors/{uuid}
Body: Partial<EmissionFactorMVP>

// 5. 删除接口（软删除）
DELETE /api/v1/emission-factors/{uuid}

// 6. 批量导入
POST /api/v1/emission-factors/import
Body: { file: File, format: 'excel' | 'csv' }

// 7. 导出
GET /api/v1/emission-factors/export
Query: format=excel&filter={...}
``` 