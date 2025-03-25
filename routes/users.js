const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { verifyToken, isAdmin } = require('../middleware/auth');

// 获取所有用户（需要管理员权限，支持分页和搜索）
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;
    
    let query = 'SELECT id, name, email, role, created_at FROM users';
    let countQuery = 'SELECT COUNT(*) FROM users';
    const queryParams = [];
    
    // 添加搜索条件
    if (search) {
      query += ' WHERE name ILIKE $1 OR email ILIKE $1';
      countQuery += ' WHERE name ILIKE $1 OR email ILIKE $1';
      queryParams.push(`%${search}%`);
    }
    
    // 添加排序和分页
    query += ' ORDER BY id ASC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
    queryParams.push(limit, offset);
    
    // 执行查询
    const [usersResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, search ? [`%${search}%`] : [])
    ]);
    
    const users = usersResult.rows;
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      users,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (err) {
    console.error('获取用户失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单个用户（用户只能获取自己的信息，管理员可以获取任何用户）
router.get('/:id', verifyToken, async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: '无权访问此用户信息' });
    }
    
    const result = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('获取用户失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建用户（仅管理员）
router.post('/', verifyToken, isAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  
  // 验证
  if (!name || !email || !password) {
    return res.status(400).json({ error: '姓名、邮箱和密码是必填项' });
  }
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: '邮箱格式不正确' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度不能少于6个字符' });
  }
  
  try {
    // 检查邮箱是否已存在
    const checkResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }
    
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 添加用户
    const result = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, hashedPassword, role || 'user']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('创建用户失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新用户（用户只能更新自己的信息，管理员可以更新任何用户）
router.put('/:id', verifyToken, async (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, email, password, role } = req.body;
  
  // 检查权限
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({ error: '无权更新此用户信息' });
  }
  
  // 普通用户不能修改角色
  if (req.user.role !== 'admin' && role) {
    return res.status(403).json({ error: '无权修改用户角色' });
  }
  
  try {
    // 检查用户是否存在
    const checkResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const user = checkResult.rows[0];
    
    // 检查邮箱是否重复
    if (email && email !== user.email) {
      const emailCheck = await db.query('SELECT * FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: '该邮箱已被其他用户使用' });
      }
    }
    
    // 准备更新的字段
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (name) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    
    if (email) {
      updates.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }
    
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: '密码长度不能少于6个字符' });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updates.push(`password = $${paramIndex}`);
      values.push(hashedPassword);
      paramIndex++;
    }
    
    if (role && req.user.role === 'admin') {
      updates.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: '没有提供要更新的字段' });
    }
    
    // 更新用户
    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING id, name, email, role, created_at
    `;
    values.push(userId);
    
    const result = await db.query(updateQuery, values);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('更新用户失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除用户（仅管理员）
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    // 检查用户是否存在
    const checkResult = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 防止删除最后一个管理员账户
    if (checkResult.rows[0].role === 'admin') {
      const adminCount = await db.query('SELECT COUNT(*) FROM users WHERE role = $1', ['admin']);
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: '不能删除最后一个管理员账户' });
      }
    }
    
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    
    res.json({ message: '用户删除成功' });
  } catch (err) {
    console.error('删除用户失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router; 