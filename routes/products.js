const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

// 获取所有产品（支持分页和搜索）
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM products';
    let countQuery = 'SELECT COUNT(*) FROM products';
    const queryParams = [];
    
    // 添加搜索条件
    if (search) {
      query += ' WHERE name ILIKE $1 OR description ILIKE $1';
      countQuery += ' WHERE name ILIKE $1 OR description ILIKE $1';
      queryParams.push(`%${search}%`);
    }
    
    // 添加排序和分页
    query += ' ORDER BY id DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
    queryParams.push(limit, offset);
    
    // 执行查询
    const [productsResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, search ? [`%${search}%`] : [])
    ]);
    
    const products = productsResult.rows;
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      products,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (err) {
    console.error('获取产品失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单个产品
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '产品不存在' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('获取产品失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 上传产品图片（需要管理员权限）
router.post('/:id/upload', verifyToken, isAdmin, uploadSingle, async (req, res) => {
  try {
    const productId = req.params.id;
    
    // 检查产品是否存在
    const checkResult = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
    
    if (checkResult.rows.length === 0) {
      // 如果产品不存在，删除上传的文件
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: '产品不存在' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    // 如果产品已有图片，删除旧图片
    const existingProduct = checkResult.rows[0];
    if (existingProduct.image_url) {
      const oldImagePath = path.join(__dirname, '../public', existingProduct.image_url);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    
    // 获取文件相对路径（用于存储在数据库）
    const relativePath = '/uploads/' + req.file.filename;
    
    // 更新产品的图片URL
    const result = await db.query(
      'UPDATE products SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [relativePath, productId]
    );
    
    res.json({
      message: '图片上传成功',
      product: result.rows[0]
    });
  } catch (err) {
    console.error('上传产品图片失败:', err);
    // 出错时删除上传的文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建产品（需要管理员权限）
router.post('/', verifyToken, isAdmin, uploadSingle, async (req, res) => {
  const { name, description, price, stock } = req.body;
  
  // 验证
  if (!name || !price) {
    // 出错时删除上传的文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ error: '产品名称和价格是必填项' });
  }
  
  if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
    // 出错时删除上传的文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ error: '价格必须是正数' });
  }
  
  if (stock !== undefined && (isNaN(parseInt(stock)) || parseInt(stock) < 0)) {
    // 出错时删除上传的文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ error: '库存必须是非负整数' });
  }
  
  try {
    // 获取图片路径（如果有）
    let imagePath = null;
    if (req.file) {
      imagePath = '/uploads/' + req.file.filename;
    }
    
    const result = await db.query(
      'INSERT INTO products (name, description, price, stock, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description || '', parseFloat(price), stock || 0, imagePath]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('创建产品失败:', err);
    // 出错时删除上传的文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新产品（需要管理员权限）
router.put('/:id', verifyToken, isAdmin, uploadSingle, async (req, res) => {
  const { name, description, price, stock } = req.body;
  const productId = req.params.id;
  
  // 验证
  if (price !== undefined && (isNaN(parseFloat(price)) || parseFloat(price) <= 0)) {
    // 出错时删除上传的文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ error: '价格必须是正数' });
  }
  
  if (stock !== undefined && (isNaN(parseInt(stock)) || parseInt(stock) < 0)) {
    // 出错时删除上传的文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ error: '库存必须是非负整数' });
  }
  
  try {
    // 首先检查产品是否存在
    const checkResult = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
    
    if (checkResult.rows.length === 0) {
      // 出错时删除上传的文件
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: '产品不存在' });
    }
    
    const existingProduct = checkResult.rows[0];
    
    // 处理图片上传
    let imagePath = existingProduct.image_url;
    if (req.file) {
      // 如果上传了新图片，删除旧图片
      if (existingProduct.image_url) {
        const oldImagePath = path.join(__dirname, '../public', existingProduct.image_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      imagePath = '/uploads/' + req.file.filename;
    }
    
    // 更新产品
    const result = await db.query(
      `UPDATE products 
       SET name = $1, 
           description = $2, 
           price = $3, 
           stock = $4,
           image_url = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 
       RETURNING *`,
      [
        name || existingProduct.name,
        description !== undefined ? description : existingProduct.description,
        price !== undefined ? parseFloat(price) : existingProduct.price,
        stock !== undefined ? parseInt(stock) : existingProduct.stock,
        imagePath,
        productId
      ]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('更新产品失败:', err);
    // 出错时删除上传的文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除产品（需要管理员权限）
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    // 首先检查产品是否存在
    const checkResult = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '产品不存在' });
    }
    
    // 如果产品有图片，删除图片文件
    const existingProduct = checkResult.rows[0];
    if (existingProduct.image_url) {
      const imagePath = path.join(__dirname, '../public', existingProduct.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    
    res.status(200).json({ message: '产品删除成功' });
  } catch (err) {
    console.error('删除产品失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router; 