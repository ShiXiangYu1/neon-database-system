const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');

// 获取所有订单（支持分页和筛选）- 管理员可查看所有订单，普通用户只能查看自己的订单
router.get('/', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    
    let query = `
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
    `;
    
    let countQuery = 'SELECT COUNT(*) FROM orders o';
    
    const queryParams = [];
    let paramIndex = 1;
    
    // 非管理员只能查看自己的订单
    if (req.user.role !== 'admin') {
      query += ` WHERE o.user_id = $${paramIndex}`;
      countQuery += ` WHERE o.user_id = $${paramIndex}`;
      queryParams.push(req.user.id);
      paramIndex++;
    }
    
    // 添加状态筛选
    if (status) {
      const whereOrAnd = queryParams.length > 0 ? 'AND' : 'WHERE';
      query += ` ${whereOrAnd} o.status = $${paramIndex}`;
      countQuery += ` ${whereOrAnd} o.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // 添加排序和分页
    query += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);
    
    // 执行查询
    const [ordersResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramIndex - 1))
    ]);
    
    // 获取订单项
    const orders = ordersResult.rows;
    let ordersWithItems = [];
    
    for (const order of orders) {
      const itemsResult = await db.query(`
        SELECT oi.*, p.name as product_name 
        FROM order_items oi 
        JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id = $1
      `, [order.id]);
      
      ordersWithItems.push({
        ...order,
        items: itemsResult.rows
      });
    }
    
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      orders: ordersWithItems,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (err) {
    console.error('获取订单失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单个订单
router.get('/:id', verifyToken, async (req, res) => {
  try {
    // 获取订单基本信息
    const orderResult = await db.query(`
      SELECT o.*, u.name as user_name, u.email as user_email 
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [req.params.id]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    const order = orderResult.rows[0];
    
    // 检查权限（只有管理员或订单所有者可以查看）
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权查看此订单' });
    }
    
    // 获取订单项
    const itemsResult = await db.query(`
      SELECT oi.*, p.name as product_name 
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      WHERE oi.order_id = $1
    `, [order.id]);
    
    res.json({
      ...order,
      items: itemsResult.rows
    });
  } catch (err) {
    console.error('获取订单失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建新订单
router.post('/', verifyToken, async (req, res) => {
  // 开始数据库事务
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { items } = req.body;
    
    // 验证
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '订单至少需要包含一个商品' });
    }
    
    // 验证每个项目
    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ error: '每个订单项都需要有效的商品ID和数量' });
      }
    }
    
    // 计算总金额并检查库存
    let totalAmount = 0;
    const productUpdates = [];
    
    for (const item of items) {
      const productResult = await client.query('SELECT * FROM products WHERE id = $1', [item.product_id]);
      
      if (productResult.rows.length === 0) {
        throw new Error(`商品ID ${item.product_id} 不存在`);
      }
      
      const product = productResult.rows[0];
      
      if (product.stock < item.quantity) {
        throw new Error(`商品 "${product.name}" 库存不足，当前库存: ${product.stock}`);
      }
      
      // 更新产品库存
      productUpdates.push({
        id: product.id,
        newStock: product.stock - item.quantity
      });
      
      // 累加总金额
      totalAmount += product.price * item.quantity;
    }
    
    // 创建订单
    const orderResult = await client.query(`
      INSERT INTO orders (user_id, total_amount, status)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [req.user.id, totalAmount, 'pending']);
    
    const order = orderResult.rows[0];
    
    // 创建订单项
    for (const item of items) {
      const productResult = await client.query('SELECT price FROM products WHERE id = $1', [item.product_id]);
      await client.query(`
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES ($1, $2, $3, $4)
      `, [order.id, item.product_id, item.quantity, productResult.rows[0].price]);
    }
    
    // 更新商品库存
    for (const update of productUpdates) {
      await client.query('UPDATE products SET stock = $1 WHERE id = $2', [update.newStock, update.id]);
    }
    
    await client.query('COMMIT');
    
    // 获取完整的订单信息
    const completeOrderResult = await db.query(`
      SELECT o.*, u.name as user_name, u.email as user_email 
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [order.id]);
    
    const itemsResult = await db.query(`
      SELECT oi.*, p.name as product_name 
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      WHERE oi.order_id = $1
    `, [order.id]);
    
    res.status(201).json({
      ...completeOrderResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('创建订单失败:', err);
    
    if (err.message.includes('库存不足') || err.message.includes('不存在')) {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: '服务器错误' });
  } finally {
    client.release();
  }
});

// 更新订单状态（管理员权限）
router.patch('/:id/status', verifyToken, isAdmin, async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  
  // 验证
  if (!status) {
    return res.status(400).json({ error: '状态是必填项' });
  }
  
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: '无效的订单状态' });
  }
  
  try {
    // 检查订单是否存在
    const checkResult = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    // 更新订单状态
    const result = await db.query(`
      UPDATE orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 
      RETURNING *
    `, [status, orderId]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('更新订单状态失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router; 