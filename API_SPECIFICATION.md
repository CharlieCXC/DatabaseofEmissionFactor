# 排放因子数据库 API 规范

## 质量评估相关接口

### 1. 计算质量评分

**接口**: `POST /api/v1/emission-factors/quality-score`

**描述**: 基于Pedigree矩阵评分标准计算排放因子数据质量评分

**请求参数**:
```json
{
  "temporal_representativeness": 4,
  "geographical_representativeness": 3,
  "technology_representativeness": 4,
  "completeness": 5,
  "reliability": 4
}
```

**响应数据**:
```json
{
  "success": true,
  "data": {
    "temporal_representativeness": 4,
    "geographical_representativeness": 3,
    "technology_representativeness": 4,
    "completeness": 5,
    "reliability": 4,
    "overall_score": 80
  }
}
```

### 2. 验证排放因子数据

**接口**: `POST /api/v1/emission-factors/validate`

**描述**: 验证排放因子数据的完整性和合规性

**请求参数**: 完整的排放因子数据对象

**响应数据**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [
      {
        "field": "uncertainty",
        "message": "不确定性值偏高，建议核实数据来源"
      }
    ]
  }
}
```

### 3. 创建排放因子（支持质量评估字段）

**接口**: `POST /api/v1/emission-factors`

**重要字段**:
- `reliability`: 数据可靠性评分 (1-5)
- `temporal_representativeness`: 时间代表性评分 (1-5)
- `geographical_representativeness`: 地理代表性评分 (1-5)
- `technology_representativeness`: 技术代表性评分 (1-5)
- `completeness`: 数据完整性评分 (1-5)
- `quality_score`: 综合质量评分 (0-100)

## 权重说明

质量评分计算权重：
- 时间代表性: 25%
- 地理代表性: 25%
- 技术代表性: 25%
- 数据完整性: 15%
- 数据可靠性: 10%

## 质量等级划分

- A级 (90-100分): 优秀，可直接用于精确计算
- B级 (75-89分): 良好，适用于大多数应用场景
- C级 (60-74分): 一般，需要注意不确定性
- D级 (40-59分): 较差，建议谨慎使用
- F级 (0-39分): 很差，不建议使用 