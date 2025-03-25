const jwt = require('jsonwebtoken');
require('dotenv').config();

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// 验证 JWT Token 中间件
const verifyToken = (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token验证失败:', err);
    return res.status(401).json({ error: '令牌无效或已过期，请重新登录' });
  }
};

// 检查用户角色是否为管理员
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ error: '禁止访问，需要管理员权限' });
  }
};

module.exports = {
  verifyToken,
  isAdmin,
  JWT_SECRET
}; 