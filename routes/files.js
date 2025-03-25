const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

/**
 * @swagger
 * components:
 *   schemas:
 *     File:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 文件ID
 *         original_name:
 *           type: string
 *           description: 原始文件名
 *         filename:
 *           type: string
 *           description: 存储文件名
 *         path:
 *           type: string
 *           description: 文件路径
 *         size:
 *           type: integer
 *           description: 文件大小(字节)
 *         mimetype:
 *           type: string
 *           description: 文件MIME类型
 *         user_id:
 *           type: integer
 *           description: 上传用户ID
 *         category:
 *           type: string
 *           description: 文件分类
 *         related_id:
 *           type: integer
 *           description: 关联ID
 *         description:
 *           type: string
 *           description: 文件描述
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 */

// 文件元数据表结构
// CREATE TABLE IF NOT EXISTS files (
//   id SERIAL PRIMARY KEY,
//   original_name VARCHAR(255) NOT NULL,
//   filename VARCHAR(255) NOT NULL,
//   path VARCHAR(255) NOT NULL,
//   size INTEGER NOT NULL,
//   mime_type VARCHAR(100) NOT NULL,
//   user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
//   category VARCHAR(50),
//   related_id INTEGER,
//   description TEXT,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// )

// 创建上传目录
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// 配置文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-rar-compressed', 'text/plain'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
};

// 文件大小限制 (10MB)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

// 初始化文件表（应用启动时在index.js中调用）
async function initFileTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        original_name VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        path VARCHAR(255) NOT NULL,
        size BIGINT NOT NULL,
        mimetype VARCHAR(100) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        category VARCHAR(50),
        related_id INTEGER,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('文件表初始化成功');
  } catch (err) {
    console.error('文件表初始化失败:', err);
  }
}

/**
 * @swagger
 * /files:
 *   get:
 *     summary: 获取文件列表
 *     description: 获取所有文件的列表，支持分页和分类筛选
 *     tags: [文件管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码 (默认 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 每页记录数 (默认 10)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 按分类筛选
 *     responses:
 *       200:
 *         description: 成功返回文件列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 files:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/File'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT f.*, u.name as user_name
      FROM files f
      LEFT JOIN users u ON f.user_id = u.id
    `;
    
    let countQuery = `SELECT COUNT(*) FROM files`;
    const queryParams = [];
    
    // 根据用户角色限制访问
    if (req.user.role !== 'admin') {
      query += ` WHERE f.user_id = $${queryParams.length + 1}`;
      countQuery += ` WHERE user_id = $${queryParams.length + 1}`;
      queryParams.push(req.user.id);
    }
    
    // 添加分类过滤
    if (category) {
      const operator = queryParams.length ? 'AND' : 'WHERE';
      query += ` ${operator} f.category = $${queryParams.length + 1}`;
      countQuery += ` ${operator} category = $${queryParams.length + 1}`;
      queryParams.push(category);
    }
    
    // 添加排序和分页
    query += ` ORDER BY f.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit), offset);
    
    // 执行查询
    const [filesResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, -2))
    ]);
    
    const files = filesResult.rows;
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      files,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('获取文件列表失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /files/{id}:
 *   get:
 *     summary: 获取单个文件详情
 *     description: 根据ID获取文件的详细信息
 *     tags: [文件管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 文件ID
 *     responses:
 *       200:
 *         description: 成功返回文件信息
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       404:
 *         description: 文件不存在
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT f.*, u.name as user_name 
      FROM files f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('获取文件详情错误:', err);
    res.status(500).json({ error: '获取文件详情失败' });
  }
});

/**
 * @swagger
 * /files/upload:
 *   post:
 *     summary: 上传单个文件
 *     description: 上传单个文件并保存文件信息
 *     tags: [文件管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 要上传的文件
 *               category:
 *                 type: string
 *                 description: 文件分类
 *               description:
 *                 type: string
 *                 description: 文件描述
 *               related_id:
 *                 type: integer
 *                 description: 关联ID
 *     responses:
 *       201:
 *         description: 文件上传成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 file:
 *                   $ref: '#/components/schemas/File'
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    const { category, description, related_id } = req.body;
    
    // 保存文件信息到数据库
    const fileData = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      userId: req.user.id,
      category: category || null,
      relatedId: related_id || null,
      description: description || null
    };
    
    const result = await db.query(
      `INSERT INTO files (original_name, filename, path, size, mimetype, user_id, category, related_id, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [fileData.originalName, fileData.filename, fileData.path, fileData.size, fileData.mimetype, 
       fileData.userId, fileData.category, fileData.relatedId, fileData.description]
    );
    
    res.status(201).json({ 
      message: '文件上传成功',
      file: result.rows[0]
    });
  } catch (err) {
    console.error('文件上传失败:', err);
    // 出错时删除上传的文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: '服务器错误' });
  }
});

// 上传多个文件
router.post('/upload-multiple', verifyToken, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    const { category, description, related_id } = req.body;
    const filesData = [];
    
    // 批量插入文件信息
    const queryValues = [];
    const queryParts = [];
    let valueIndex = 1;
    
    for (const file of req.files) {
      queryParts.push(`($${valueIndex}, $${valueIndex + 1}, $${valueIndex + 2}, $${valueIndex + 3}, $${valueIndex + 4}, $${valueIndex + 5}, $${valueIndex + 6}, $${valueIndex + 7}, $${valueIndex + 8})`);
      
      queryValues.push(
        file.originalname,
        file.filename,
        file.path,
        file.size,
        file.mimetype,
        req.user.id,
        category || null,
        related_id || null,
        description || null
      );
      
      valueIndex += 9;
    }
    
    const query = `
      INSERT INTO files (original_name, filename, path, size, mimetype, user_id, category, related_id, description)
      VALUES ${queryParts.join(', ')}
      RETURNING *
    `;
    
    const result = await db.query(query, queryValues);
    
    res.status(201).json({
      message: `成功上传 ${req.files.length} 个文件`,
      files: result.rows
    });
  } catch (err) {
    console.error('多文件上传失败:', err);
    // 出错时尝试删除已上传的文件
    if (req.files && req.files.length) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.error('删除文件失败:', e);
        }
      });
    }
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新文件信息
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { category, description } = req.body;
    
    // 检查文件是否存在以及用户权限
    const checkResult = await db.query('SELECT * FROM files WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    const file = checkResult.rows[0];
    
    // 检查权限
    if (req.user.role !== 'admin' && file.user_id !== req.user.id) {
      return res.status(403).json({ error: '没有权限修改此文件' });
    }
    
    // 更新文件信息
    const result = await db.query(`
      UPDATE files
      SET category = $1, description = $2
      WHERE id = $3
      RETURNING *
    `, [category, description, id]);
    
    res.json({
      message: '文件信息更新成功',
      file: result.rows[0]
    });
  } catch (err) {
    console.error('更新文件信息失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /files/{id}:
 *   delete:
 *     summary: 删除文件
 *     description: 根据ID删除文件
 *     tags: [文件管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 文件ID
 *     responses:
 *       200:
 *         description: 文件删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: 文件不存在
 *       401:
 *         description: 未授权
 *       403:
 *         description: 没有权限
 *       500:
 *         description: 服务器错误
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查文件是否存在以及用户权限
    const checkResult = await db.query('SELECT * FROM files WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    const file = checkResult.rows[0];
    
    // 检查权限
    if (req.user.role !== 'admin' && file.user_id !== req.user.id) {
      return res.status(403).json({ error: '没有权限删除此文件' });
    }
    
    // 从文件系统中删除文件
    try {
      fs.unlinkSync(file.path);
    } catch (e) {
      console.error('删除物理文件失败:', e);
      // 继续删除数据库记录
    }
    
    // 从数据库中删除记录
    await db.query('DELETE FROM files WHERE id = $1', [id]);
    
    res.json({ message: '文件删除成功' });
  } catch (err) {
    console.error('删除文件失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /files/{id}/download:
 *   get:
 *     summary: 下载文件
 *     description: 根据ID下载文件
 *     tags: [文件管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 文件ID
 *     responses:
 *       200:
 *         description: 文件内容
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: 文件不存在
 *       401:
 *         description: 未授权
 *       403:
 *         description: 没有权限
 *       500:
 *         description: 服务器错误
 */
router.get('/:id/download', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查文件是否存在以及用户权限
    const result = await db.query('SELECT * FROM files WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    const file = result.rows[0];
    
    // 检查权限
    if (req.user.role !== 'admin' && file.user_id !== req.user.id) {
      return res.status(403).json({ error: '没有权限下载此文件' });
    }
    
    // 使用正确的文件路径 - 不添加../public前缀
    const filePath = file.path;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在于服务器上' });
    }
    
    // 设置响应头
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(file.original_name)}`);
    
    // 发送文件
    res.sendFile(filePath);
  } catch (err) {
    console.error('文件下载失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = {
  router,
  initFileTable
}; 