# Neon数据库项目

这是一个使用Neon PostgreSQL数据库的完整Web应用程序，实现了用户认证、产品管理、订单处理等功能。

## 项目结构

- `index.js`: 主应用文件，包含服务器配置和路由挂载
- `db.js`: 数据库连接配置
- `.env`: 环境变量文件（包含数据库连接和JWT密钥）
- `middleware/`: 中间件文件夹
  - `auth.js`: 认证相关中间件
- `routes/`: API路由文件夹
  - `auth.js`: 认证相关路由（登录、注册、登出）
  - `users.js`: 用户管理路由
  - `products.js`: 产品管理路由
  - `orders.js`: 订单管理路由
- `public/`: 前端文件
  - `index.html`: 主页（仪表板）
  - `login.html`/`register.html`: 登录/注册页面
  - `styles/`: CSS样式文件
  - `scripts/`: JavaScript脚本文件

## 功能特点

- 使用Neon PostgreSQL作为数据库
- 用户认证和授权（JWT）
- 基于角色的访问控制（用户/管理员）
- 完整的CRUD操作
  - 用户管理
  - 产品管理
  - 订单处理
- 关系数据管理（用户-订单-产品）
- 分页、搜索和筛选功能
- 现代化的前端界面
- 响应式设计

## 如何使用

### 前置条件

1. 在[Neon官网](https://neon.tech/)创建一个账号
2. 创建一个新的PostgreSQL数据库项目
3. 获取连接字符串

### 安装和设置

1. 克隆此仓库
2. 安装依赖
```bash
npm install
```
3. 复制环境变量示例文件并填入您的Neon数据库连接信息
```bash
cp .env.example .env
```
4. 编辑.env文件，确保设置以下内容：
   - DATABASE_URL: Neon数据库连接字符串
   - JWT_SECRET: 用于加密JWT的密钥
   - PORT: 服务器端口（默认3001）

### 运行项目

```bash
npm start
```

或者开发模式（自动重启）：

```bash
npm run dev
```

启动后，访问 http://localhost:3001 使用Web界面。系统将自动创建一个默认管理员账户：
- 邮箱: admin@example.com
- 密码: admin123

## API端点

### 认证

- `POST /api/auth/register`: 用户注册
- `POST /api/auth/login`: 用户登录
- `POST /api/auth/logout`: 用户登出
- `GET /api/auth/me`: 获取当前用户信息

### 用户管理

- `GET /api/users`: 获取所有用户（支持分页和搜索）
- `GET /api/users/:id`: 获取单个用户
- `POST /api/users`: 创建用户（管理员）
- `PUT /api/users/:id`: 更新用户
- `DELETE /api/users/:id`: 删除用户（管理员）

### 产品管理

- `GET /api/products`: 获取所有产品（支持分页和搜索）
- `GET /api/products/:id`: 获取单个产品
- `POST /api/products`: 创建产品（管理员）
- `PUT /api/products/:id`: 更新产品（管理员）
- `DELETE /api/products/:id`: 删除产品（管理员）

### 订单管理

- `GET /api/orders`: 获取所有订单（支持分页和筛选）
- `GET /api/orders/:id`: 获取单个订单
- `POST /api/orders`: 创建订单
- `PATCH /api/orders/:id/status`: 更新订单状态（管理员）

## 注意事项

- 请确保不要将包含敏感信息的.env文件提交到代码仓库
- 在生产环境中，请考虑使用更安全的JWT配置和HTTPS 