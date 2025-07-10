# 开发环境搭建指南

## 🎯 环境要求概览

### 基础软件要求
- **Node.js**: 16.0.0 或更高版本
- **PostgreSQL**: 12.0 或更高版本  
- **npm**: 8.0.0 或更高版本
- **Git**: 2.30.0 或更高版本

### 推荐开发工具
- **IDE**: VS Code + 推荐插件包
- **数据库管理**: pgAdmin 4 或 DBeaver
- **API测试**: Postman 或 Insomnia
- **版本控制**: Git + GitHub Desktop（可选）

## 🛠️ 第一步：基础环境安装

### 1. Node.js 安装配置

#### macOS
```bash
# 使用Homebrew安装（推荐）
brew install node

# 或者下载官方安装包
# https://nodejs.org/zh-cn/
```

#### Windows
```bash
# 1. 下载官方安装包：https://nodejs.org/zh-cn/
# 2. 运行安装程序，选择"Add to PATH"
# 3. 验证安装
node --version
npm --version
```

#### Ubuntu/Debian
```bash
# 使用NodeSource仓库安装最新版本
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 2. PostgreSQL 安装配置

#### macOS
```bash
# 使用Homebrew安装
brew install postgresql

# 启动PostgreSQL服务
brew services start postgresql

# 创建数据库用户（可选，默认使用当前用户）
createuser -s postgres
```

#### Windows
```bash
# 1. 下载官方安装包：https://www.postgresql.org/download/windows/
# 2. 运行安装程序，设置超级用户密码
# 3. 记住端口号（默认5432）和密码
```

#### Ubuntu/Debian
```bash
# 安装PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 配置数据库用户
sudo -u postgres psql
```

### 3. 开发工具安装

#### VS Code + 推荐插件
```bash
# 安装VS Code
# https://code.visualstudio.com/

# 推荐插件（在VS Code中安装）
# - ES7+ React/Redux/React-Native snippets
# - Prettier - Code formatter
# - ESLint
# - Auto Rename Tag
# - Bracket Pair Colorizer
# - GitLens
# - PostgreSQL (by Chris Kolkman)
# - REST Client
```

## 🚀 第二步：项目初始化

### 1. 创建项目目录

```bash
# 创建根目录
mkdir emission-factor-platform
cd emission-factor-platform

# 创建子目录
mkdir backend frontend database docs
```

### 2. 后端项目初始化

```bash
# 进入后端目录
cd backend

# 初始化Node.js项目
npm init -y

# 安装生产依赖
npm install express pg cors helmet compression morgan express-rate-limit dotenv multer joi winston uuid

# 安装开发依赖
npm install -D nodemon concurrently jest supertest eslint prettier

# 创建基础目录结构
mkdir src src/config src/controllers src/middleware src/routes src/utils src/validators logs uploads

# 创建环境变量文件
cp env-template .env
```

### 3. 前端项目初始化

```bash
# 进入前端目录
cd ../frontend

# 使用Vite创建React项目
npm create vite@latest . -- --template react-ts

# 安装依赖
npm install

# 安装Antd相关依赖
npm install antd @ant-design/icons @ant-design/pro-components

# 安装其他常用依赖
npm install axios react-router-dom dayjs lodash

# 安装开发依赖
npm install -D @types/lodash eslint-config-prettier
```

## 🗄️ 第三步：数据库配置

### 1. 创建数据库

```bash
# 连接到PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE emission_factor_db;

# 创建专用用户（可选，生产环境推荐）
CREATE USER emission_factor_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE emission_factor_db TO emission_factor_user;

# 退出psql
\q
```

### 2. 初始化数据库表结构

```bash
# 进入项目根目录
cd ../

# 执行数据库初始化脚本
psql -U postgres -d emission_factor_db -f database/init.sql
```

### 3. 验证数据库连接

```bash
# 连接到新创建的数据库
psql -U postgres -d emission_factor_db

# 检查表是否创建成功
\dt

# 查看表结构
\d emission_factors

# 退出
\q
```

## ⚙️ 第四步：环境变量配置

### 1. 后端环境配置

编辑 `backend/.env` 文件：

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

# 安全配置
JWT_SECRET=your_jwt_secret_key_here_min_32_chars
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### 2. 前端环境配置

创建 `frontend/.env` 文件：

```env
# API配置
VITE_API_BASE_URL=http://localhost:3001/api/v1

# 应用配置
VITE_APP_NAME=排放因子管理系统
VITE_APP_VERSION=1.0.0

# 开发配置
VITE_DEV_TOOLS=true
```

## 🏃‍♂️ 第五步：启动项目

### 1. 启动后端服务

```bash
# 进入后端目录
cd backend

# 开发模式启动（自动重启）
npm run dev

# 或者正常启动
npm start
```

验证后端是否启动成功：
- 访问 http://localhost:3001/health
- 应该看到服务状态信息

### 2. 启动前端开发服务器

```bash
# 新开终端窗口，进入前端目录
cd frontend

# 启动开发服务器
npm run dev
```

验证前端是否启动成功：
- 访问 http://localhost:5173
- 应该看到Vite + React默认页面

## 🧪 第六步：验证完整环境

### 1. API连通性测试

```bash
# 测试健康检查端点
curl http://localhost:3001/health

# 测试排放因子API（应该返回空数组）
curl http://localhost:3001/api/v1/emission-factors

# 测试字典API
curl http://localhost:3001/api/v1/dictionaries/countries
```

### 2. 数据库连接测试

```bash
# 在后端目录执行数据库连接测试
node -e "
const db = require('./src/config/database');
db.query('SELECT NOW()')
  .then(result => console.log('✅ 数据库连接成功:', result.rows[0]))
  .catch(err => console.error('❌ 数据库连接失败:', err));
"
```

### 3. 前端API调用测试

在前端项目中创建一个简单的API测试：

```javascript
// frontend/src/test-api.js
fetch('http://localhost:3001/api/v1/emission-factors')
  .then(response => response.json())
  .then(data => console.log('✅ API调用成功:', data))
  .catch(error => console.error('❌ API调用失败:', error));
```

## 🔧 开发工作流配置

### 1. 并发启动配置

在项目根目录创建 `package.json`：

```json
{
  "name": "emission-factor-platform",
  "version": "1.0.0",
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "test": "cd backend && npm test"
  },
  "devDependencies": {
    "concurrently": "^7.6.0"
  }
}
```

然后安装并启动：
```bash
npm install
npm run dev
```

### 2. Git配置

```bash
# 初始化Git仓库
git init

# 创建.gitignore文件
cat > .gitignore << EOF
# Dependencies
node_modules/
*/node_modules/

# Environment variables
.env
*.env

# Logs
logs/
*.log

# Database
*.db
*.sqlite

# Build outputs
dist/
build/

# OS generated files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/

# Uploads
uploads/
EOF

# 初始提交
git add .
git commit -m "Initial commit: Project setup"
```

## 🚨 常见问题解决

### 1. PostgreSQL连接问题

**问题**: `ECONNREFUSED` 错误
**解决**:
```bash
# 检查PostgreSQL是否运行
sudo systemctl status postgresql

# 启动PostgreSQL
sudo systemctl start postgresql

# 检查端口是否正确
netstat -an | grep 5432
```

### 2. Node.js版本问题

**问题**: `node: command not found` 或版本过低
**解决**:
```bash
# 使用nvm管理Node.js版本
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### 3. 端口冲突问题

**问题**: `EADDRINUSE` 端口被占用
**解决**:
```bash
# 查找占用端口的进程
lsof -ti:3001

# 杀死进程
kill -9 $(lsof -ti:3001)

# 或者修改.env文件中的端口号
```

### 4. 依赖安装问题

**问题**: npm install失败
**解决**:
```bash
# 清理npm缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install

# 使用yarn替代npm（可选）
npm install -g yarn
yarn install
```

## ✅ 环境配置检查清单

### 基础环境
- [ ] Node.js ≥ 16.0.0 安装成功
- [ ] PostgreSQL ≥ 12.0 安装成功
- [ ] npm/yarn 可正常使用
- [ ] Git 配置完成

### 数据库配置
- [ ] 数据库 `emission_factor_db` 创建成功
- [ ] 数据库表结构初始化完成
- [ ] 数据库连接测试通过
- [ ] 数据库用户权限配置正确

### 后端配置
- [ ] 依赖包安装完成
- [ ] 环境变量配置正确
- [ ] 服务启动成功 (http://localhost:3001)
- [ ] API端点响应正常

### 前端配置
- [ ] Vite + React 项目创建成功
- [ ] Antd组件库安装完成
- [ ] 开发服务器启动成功 (http://localhost:5173)
- [ ] 环境变量配置正确

### 集成测试
- [ ] 前后端API调用成功
- [ ] 数据库CRUD操作正常
- [ ] 文件上传功能可用
- [ ] 错误处理机制正常

## 🎯 下一步开发指导

环境搭建完成后，建议按以下顺序开始开发：

1. **后端开发**：
   - 实现排放因子Controller层
   - 完善API端点功能
   - 添加单元测试

2. **前端开发**：
   - 创建基础布局组件
   - 实现排放因子列表页面
   - 开发表单组件

3. **集成测试**：
   - 前后端数据对接
   - API集成测试
   - 用户界面测试

环境搭建完成！🎉 现在可以开始愉快的开发之旅了！ 