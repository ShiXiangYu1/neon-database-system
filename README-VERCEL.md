# Neon数据库系统 - Vercel部署指南

本文档提供将Neon数据库系统部署到Vercel的详细步骤和注意事项。

## 部署前准备

1. 确保你已经在[Neon](https://neon.tech)上创建了PostgreSQL数据库
2. 获取Neon数据库的完整连接字符串
3. 创建一个GitHub仓库并将项目代码推送到仓库

## Vercel部署步骤

### 1. 连接GitHub仓库

1. 登录[Vercel](https://vercel.com)
2. 点击"New Project"
3. 从GitHub导入你的仓库
4. 选择个人或团队账户
5. 设置项目名称（例如`neon-database-system`）

### 2. 配置部署设置

在Vercel项目设置页面：

1. **框架预设**：选择"Other"
2. **根目录**：保留默认的"./""
3. **构建命令**：`npm install`
4. **输出目录**：留空

### 3. 环境变量设置

添加以下环境变量：

- `DATABASE_URL`: 你的Neon PostgreSQL连接字符串（格式：`postgresql://用户名:密码@主机地址/数据库名?sslmode=require`）
- `JWT_SECRET`: 设置一个复杂的随机字符串作为JWT密钥
- `VERCEL`: 设置为`1`（标识Vercel环境）
- `PORT`: 设置为`8080`（Vercel优先使用这个端口）

### 4. 点击"Deploy"开始部署

## 部署后注意事项

### 访问你的应用

部署完成后，Vercel会提供一个默认域名（例如：`your-project-name.vercel.app`）。访问这个域名即可使用你的应用。

### 数据库初始化

第一次访问应用时，系统会自动初始化数据库表结构并创建默认管理员账户：
- 邮箱: admin@example.com
- 密码: admin123

### 文件上传功能限制

请注意，在Vercel的无服务器环境中：

1. 文件上传功能会使用`/tmp`目录，这是**临时存储**，文件可能会在一段时间后被自动清理
2. 对于生产环境，建议使用云存储服务（如AWS S3、Google Cloud Storage）来存储上传的文件

### 自定义域名设置

如果需要使用自定义域名：

1. 在Vercel项目设置中选择"Domains"选项
2. 添加你的域名并按照指引完成DNS配置

## 故障排除

### API 404错误

如果遇到API 404错误，请检查：

1. 环境变量是否正确配置
2. `vercel.json`文件是否存在并配置正确
3. 前端代码中API基础URL是否正确

### 数据库连接错误

如果遇到数据库连接错误，请检查：

1. Neon数据库是否处于活动状态
2. 连接字符串是否正确
3. 数据库是否允许来自Vercel的连接

## 本地开发

克隆项目后，在本地开发时：

1. 复制`.env.example`为`.env`
2. 填入你的环境变量
3. 运行`npm install`安装依赖
4. 运行`npm run dev`启动开发服务器

## 支持与帮助

如有问题，请提交GitHub Issue或联系项目维护者。 