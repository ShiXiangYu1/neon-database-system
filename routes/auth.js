const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();
require('dotenv').config();
const { verifyToken } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: 认证
 *   description: 用户认证API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 用户ID
 *         name:
 *           type: string
 *           description: 用户名
 *         email:
 *           type: string
 *           description: 电子邮箱
 *         role:
 *           type: string
 *           description: 用户角色(admin/user)
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: 用户注册
 *     description: 创建新用户账户
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: 用户创建成功
 *       400:
 *         description: 请求数据无效
 *       409:
 *         description: 邮箱已存在
 *       500:
 *         description: 服务器错误
 */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  // 简单验证
  if (!name || !email || !password) {
    return res.status(400).json({ error: '请提供姓名、邮箱和密码' });
  }
  
  // 邮箱格式验证
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: '邮箱格式不正确' });
  }
  
  // 密码强度验证
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
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, 'user']
    );
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: result.rows[0].id, email: result.rows[0].email, role: result.rows[0].role },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '1d' }
    );
    
    // 设置cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1天
      sameSite: 'strict'
    });
    
    res.status(201).json({
      message: '注册成功',
      user: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        email: result.rows[0].email,
        role: result.rows[0].role
      }
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 用户登录
 *     description: 使用邮箱和密码登录系统
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: 请求数据无效
 *       401:
 *         description: 邮箱或密码不正确
 *       500:
 *         description: 服务器错误
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // 验证
  if (!email || !password) {
    return res.status(400).json({ error: '请提供邮箱和密码' });
  }
  
  try {
    // 查找用户
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: '邮箱或密码不正确' });
    }
    
    const user = result.rows[0];
    
    // 比较密码
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: '邮箱或密码不正确' });
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '1d' }
    );
    
    // 设置cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1天
      sameSite: 'strict'
    });
    
    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: 用户登出
 *     description: 登出系统并清除会话
 *     tags: [认证]
 *     responses:
 *       200:
 *         description: 登出成功
 *       500:
 *         description: 服务器错误
 */
router.post('/logout', (req, res) => {
  res.clearCookie('jwt');
  res.json({ message: '登出成功' });
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     description: 获取已登录用户的详细信息
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回用户信息
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/me', verifyToken, async (req, res) => {
  const token = req.cookies.jwt;
  
  if (!token) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    
    // 从数据库获取最新的用户信息
    const result = await db.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [decoded.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(401).json({ error: '令牌无效或已过期' });
  }
});

module.exports = router; 