const express = require('express');
const cookieParser = require('cookie-parser');
const db = require('./db');
const path = require('path');
require('dotenv').config();

// 导入Swagger配置
const { swaggerUi, specs } = require('./swagger');

// 导入路由文件
const usersRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const reportsRoutes = require('./routes/reports');
const { router: filesRoutes, initFileTable } = require('./routes/files');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(cookieParser());

// 添加CORS中间件
app.use((req, res, next) => {
  // 设置允许的域名，根据环境判断
  const allowedOrigin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // 所有API路由响应添加JSON内容类型
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// 静态文件服务，优化Vercel环境
if (process.env.VERCEL === '1') {
  // Vercel环境，静态文件由vercel.json配置处理
  console.log('在Vercel环境中运行，静态文件由vercel.json处理');
} else {
  // 本地开发环境使用express静态文件中间件
  app.use(express.static(path.join(__dirname, 'public')));
  console.log('在本地环境中运行，使用Express静态文件服务');
}

// 添加Swagger UI中间件
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

// 添加基本的数据验证中间件
const validateUserData = (req, res, next) => {
  const { name, email } = req.body;
  
  const errors = [];
  
  if (!name || name.trim() === '') {
    errors.push('姓名不能为空');
  }
  
  if (!email || email.trim() === '') {
    errors.push('邮箱不能为空');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('邮箱格式不正确');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }
  
  next();
};

// 初始化数据库 - 创建表
async function initializeDb() {
  try {
    // 创建用户表示例
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建产品表
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        image_url VARCHAR(255),
        category VARCHAR(50) DEFAULT '未分类',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建订单表
    await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建订单详情表
    await db.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 初始化文件表
    await initFileTable();

    console.log('数据库表初始化成功');

    // 检查是否有管理员用户，没有则创建默认管理员
    const adminCheck = await db.query('SELECT * FROM users WHERE role = $1', ['admin']);
    
    if (adminCheck.rows.length === 0) {
      const bcrypt = require('bcrypt');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await db.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
        ['管理员', 'admin@example.com', hashedPassword, 'admin']
      );
      
      console.log('已创建默认管理员账户 (email: admin@example.com, password: admin123)');
    }
  } catch (err) {
    console.error('数据库表初始化失败:', err);
  }
}

// 挂载路由
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/files', filesRoutes);

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('全局错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '未找到请求的资源' });
});

// 初始化数据库 - Vercel环境中按需初始化
let dbInitialized = false;

// 数据库初始化中间件，适用于Vercel环境
app.use(async (req, res, next) => {
  // 仅在Vercel环境下并且数据库未初始化时执行
  if (process.env.VERCEL === '1' && !dbInitialized) {
    try {
      await initializeDb();
      dbInitialized = true;
      console.log('数据库初始化成功 (Vercel环境)');
    } catch (err) {
      console.error('数据库初始化失败 (Vercel环境):', err);
      // 继续处理请求，不阻止
    }
  }
  next();
});

// 启动服务器
if (process.env.VERCEL !== '1') {
  // 仅在非Vercel环境启动HTTP服务器
  app.listen(PORT, async () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    // 初始化数据库
    await initializeDb();
  });
}

// 为Vercel无服务器环境导出应用
module.exports = app; 