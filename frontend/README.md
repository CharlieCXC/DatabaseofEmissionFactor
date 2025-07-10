# 排放因子数据库前端应用

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖
```bash
npm install
```

### 开发模式运行
```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动

### 构建生产版本
```bash
npm run build
```

### 预览生产版本
```bash
npm run preview
```

## 🏗️ 项目结构

```
src/
├── components/          # 可复用组件
│   ├── Layout/         # 布局组件
│   ├── ProtectedRoute  # 路由保护组件
│   └── AdminRoute      # 管理员路由组件
├── pages/              # 页面组件
│   ├── Login.tsx       # 登录页面
│   ├── Dashboard.tsx   # 仪表板
│   ├── EmissionFactor* # 排放因子相关页面
│   └── ...
├── stores/             # 状态管理
│   └── authStore.ts    # 认证状态管理
├── services/           # API服务
│   ├── api.ts         # HTTP客户端
│   └── authService.ts  # 认证服务
├── types/              # TypeScript类型定义
│   └── auth.ts        # 认证相关类型
├── App.tsx            # 主应用组件
├── main.tsx           # 入口文件
└── index.css          # 全局样式
```

## 🔧 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI组件库**: Ant Design 5
- **路由**: React Router v6
- **状态管理**: Zustand
- **HTTP客户端**: Axios
- **样式**: Tailwind CSS + Ant Design
- **日期处理**: Day.js

## 🎯 主要功能

### 已实现功能
- ✅ 用户认证系统（登录/注册）
- ✅ 响应式布局设计
- ✅ 路由保护和权限控制
- ✅ 现代化UI界面
- ✅ Dashboard仪表板
- ✅ 基础页面结构

### 开发中功能
- 🔄 排放因子管理（CRUD操作）
- 🔄 数据搜索和筛选
- 🔄 用户管理（管理员功能）
- 🔄 数据导入导出
- 🔄 质量评估功能

### 计划功能
- 📋 统计报表和图表
- 📋 批量数据操作
- 📋 审计日志
- 📋 系统设置

## 🔐 认证说明

### 默认账户
- **管理员账户**: admin / admin123456
- **测试账户**: testuser / user123456

### 权限级别
- **admin**: 完全访问权限
- **editor**: 编辑权限
- **viewer**: 只读权限
- **user**: 基础用户权限

## 🌐 API集成

前端应用与后端API的集成：

### 环境配置
- 开发环境: `http://localhost:3000`
- 生产环境: 配置在 `.env` 文件中

### 认证流程
1. 用户登录 → 获取JWT Token
2. Token存储在localStorage
3. 自动在请求头中包含Token
4. Token过期时自动刷新

### 错误处理
- 401: 自动跳转到登录页
- 403: 显示权限不足页面
- 500: 显示服务器错误提示

## 📱 响应式设计

应用支持多种设备：
- 📱 手机端 (< 768px)
- 📱 平板端 (768px - 1024px)
- 💻 桌面端 (> 1024px)

## 🎨 UI设计

### 主题色彩
- 主色: #1677ff (蓝色)
- 成功: #52c41a (绿色)
- 警告: #faad14 (橙色)
- 错误: #ff4d4f (红色)

### 组件风格
- 卡片圆角: 12px
- 按钮圆角: 8px
- 输入框圆角: 8px
- 阴影: 渐进式阴影效果

## 🔍 开发工具

### 代码检查
```bash
npm run lint
```

### 类型检查
```bash
npm run type-check
```

### 格式化代码
建议使用 Prettier 和 ESLint 插件

## 🚀 部署

### 构建优化
- 代码分割和懒加载
- 资源压缩和优化
- 浏览器缓存策略

### 环境变量
创建 `.env` 文件：
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=排放因子数据库
```

## 📞 技术支持

如果遇到问题，请：
1. 检查控制台错误信息
2. 确认后端API是否正常运行
3. 检查网络连接
4. 查看开发者工具Network面板

## 🔄 更新日志

### v1.0.0 (2024-01-15)
- 初始版本发布
- 完整的认证系统
- 基础页面结构
- 响应式布局

---

**注意**: 这是一个开发中的项目，部分功能仍在实现中。请确保后端API服务正在运行以获得完整的功能体验。 