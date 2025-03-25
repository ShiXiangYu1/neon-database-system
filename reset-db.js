// reset-db.js
const { Pool } = require('pg');
require('dotenv').config();

// 创建数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function resetDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('开始重置数据库...');
    
    // 开始事务
    await client.query('BEGIN');
    
    // 删除所有表（按依赖关系顺序）
    console.log('删除现有表...');
    await client.query(`
      DROP TABLE IF EXISTS order_items CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    
    console.log('数据库表已成功删除');
    
    // 提交事务
    await client.query('COMMIT');
    console.log('数据库重置完成！');
    console.log('现在您可以重新启动应用，它将自动创建所有表并初始化管理员账户。');
    
  } catch (err) {
    // 发生错误时回滚事务
    await client.query('ROLLBACK');
    console.error('重置数据库时出错:', err);
  } finally {
    // 释放客户端连接
    client.release();
    // 关闭连接池
    pool.end();
  }
}

// 执行重置
resetDatabase();