const { Pool } = require('pg');
require('dotenv').config();

// 创建一个数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false  // 对于开发环境可以设置为false，生产环境请考虑安全性
  }
});

// 测试数据库连接
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('数据库连接失败', err.stack);
  } else {
    console.log('数据库连接成功，当前时间:', res.rows[0].now);
  }
});

// 导出连接池供其他模块使用
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
}; 