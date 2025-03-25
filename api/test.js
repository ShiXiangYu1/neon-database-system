// 简单的测试API端点
module.exports = (req, res) => {
  res.status(200).json({
    message: 'API正常工作！',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
}; 