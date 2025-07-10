# 排放因子数据库后端API

ESG合规平台排放因子库的后端API服务，基于Node.js + Express + PostgreSQL构建。

## 🚀 快速开始

### 1. 环境要求

- Node.js >= 16.0.0
- PostgreSQL >= 12.0
- npm >= 8.0.0

### 2. 安装依赖

```bash
cd backend
npm install
```

### 3. 环境配置

复制环境变量模板并配置：

```bash
cp env-template .env
```

编辑 `.env` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=emission_factor_db
DB_USER=postgres
DB_PASSWORD=your_password

# 服务器配置
PORT=3001
NODE_ENV=development

# CORS配置
CORS_ORIGIN=http://localhost:5173
```

### 4. 数据库初始化

首先创建数据库：

```bash
# 连接到PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE emission_factor_db;
\q
```

然后初始化表结构和基础数据：

```bash
npm run db:init
```

### 5. 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务启动后访问：
- 健康检查：http://localhost:3001/health
- API文档：http://localhost:3001/api/v1/docs

## 📡 API接口

### 核心端点

#### 排放因子管理
- `GET /api/v1/emission-factors` - 查询排放因子
- `POST /api/v1/emission-factors` - 创建排放因子
- `PUT /api/v1/emission-factors/:uuid` - 更新排放因子
- `DELETE /api/v1/emission-factors/:uuid` - 删除排放因子

#### 字典数据
- `GET /api/v1/dictionaries/activity-categories` - 活动分类
- `GET /api/v1/dictionaries/geographic-regions` - 地理区域
- `GET /api/v1/dictionaries/emission-units` - 排放单位

#### 统计分析
- `GET /api/v1/stats/overview` - 总体统计
- `GET /api/v1/stats/trends` - 趋势分析
- `GET /api/v1/stats/comparison` - 对比分析

### 查询示例

#### 查询电力排放因子
```bash
curl "http://localhost:3001/api/v1/emission-factors?category_l1=Energy&category_l2=Electricity&country_code=CN"
```

#### 搜索排放因子
```bash
curl "http://localhost:3001/api/v1/emission-factors/search?q=燃煤发电"
```

#### 获取统计概览
```bash
curl "http://localhost:3001/api/v1/stats/overview"
```

### 创建排放因子示例

```bash
curl -X POST "http://localhost:3001/api/v1/emission-factors" \
  -H "Content-Type: application/json" \
  -d '{
    "activity_category": {
      "level_1": "Energy",
      "level_2": "Electricity", 
      "level_3": "Solar_Power",
      "display_name_cn": "太阳能光伏发电"
    },
    "geographic_scope": {
      "country_code": "CN",
      "region": "Shanghai",
      "display_name_cn": "上海市"
    },
    "emission_value": {
      "value": 0.045,
      "unit": "kgCO2eq/kWh",
      "reference_year": 2024
    },
    "data_source": {
      "organization": "上海市发改委",
      "publication": "上海市可再生能源发电排放因子研究报告",
      "publication_date": "2024-01-15"
    },
    "quality_info": {
      "grade": "A",
      "confidence": "High",
      "last_review_date": "2024-03-15",
      "notes": "基于实际运行数据计算"
    }
  }'
```

## 🗄️ 数据库结构

### 主要数据表

#### emission_factors（排放因子主表）
- `id` - 主键
- `uuid` - 全局唯一标识符
- `activity_category` - 活动分类（JSONB）
- `geographic_scope` - 地理范围（JSONB）
- `emission_value` - 排放数值（JSONB）
- `data_source` - 数据来源（JSONB）
- `quality_info` - 质量信息（JSONB）
- `status` - 状态（active/inactive/review）
- `created_at/updated_at` - 时间戳

#### activity_categories（活动分类字典）
- 三级分类体系：level_1 → level_2 → level_3
- 中英文对照：level_1_cn, level_2_cn, level_3_cn

#### geographic_regions（地理区域字典）
- 国家+区域两级结构
- 支持电网、省份、城市等不同区域类型

#### emission_units（排放单位字典）
- 标准化的排放因子单位
- 按分类组织：electricity, transport, industry等

### 数据库管理命令

```bash
# 重置数据库（谨慎使用）
npm run db:reset

# 手动连接数据库
psql -U postgres -d emission_factor_db
```

## 📊 数据验证

系统使用Joi进行严格的数据验证：

### 创建排放因子验证规则
- `activity_category`: 必需，包含三级分类和中文名称
- `geographic_scope`: 必需，国家代码+区域+中文名称  
- `emission_value`: 必需，数值>0，有效单位，合理年份范围
- `data_source`: 必需，组织名称、出版物、日期
- `quality_info`: 必需，等级A-D，置信度，评审日期

### 数据合理性检查
- 电力排放因子：0.1-2.0 kgCO2eq/kWh
- 交通排放因子：0.05-0.5 kgCO2eq/km  
- 工业排放因子：0.5-5.0 kgCO2eq/kg

## 🔧 开发工具

### 日志系统
- 开发环境：控制台 + 文件
- 生产环境：仅文件
- 日志级别：error, warn, info, debug
- 自动轮转：5MB/文件，保留10个文件

### 错误处理
- 统一错误响应格式
- 自定义错误类型：ValidationError, NotFoundError, DatabaseError
- 数据库约束错误自动转换
- 开发/生产环境不同的错误详情

### 性能监控
- 请求响应时间记录
- 数据库查询性能追踪
- 慢查询告警（>1000ms）

## 🧪 测试

```bash
# 运行所有测试
npm test

# 监听模式运行测试
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage
```

## 📦 部署

### 生产环境配置

1. 设置环境变量：
```env
NODE_ENV=production
DB_SSL=true
LOG_LEVEL=warn
```

2. 使用PM2进程管理：
```bash
npm install -g pm2
pm2 start src/app.js --name emission-factor-api
```

3. Nginx反向代理配置：
```nginx
server {
    listen 80;
    server_name api.emissionfactor.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Docker部署

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🔒 安全特性

- Helmet.js安全头设置
- CORS跨域控制
- 请求频率限制（100次/15分钟）
- SQL注入防护（参数化查询）
- 输入数据验证和清理
- 敏感信息日志过滤

## 📝 开发规范

### 代码风格
- 使用ESLint + Prettier
- 遵循Airbnb JavaScript规范
- async/await异步编程
- 函数式编程优先

### Git工作流
- 功能分支开发
- 提交信息规范：feat/fix/docs/style/refactor
- 代码审查要求

### API设计原则
- RESTful风格
- 统一响应格式
- 版本控制（/api/v1/）
- 详细的错误信息

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交变更：`git commit -am 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 提交Pull Request

## 📞 技术支持

- 项目地址：https://github.com/your-org/emission-factor-backend
- 问题反馈：https://github.com/your-org/emission-factor-backend/issues
- 技术文档：https://docs.emissionfactor.com

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件 