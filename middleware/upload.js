const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// 检查是否在Vercel环境中
const isVercel = process.env.VERCEL === '1';

// 配置上传目录
const getUploadDir = () => {
  // 在Vercel环境中使用/tmp目录
  if (isVercel) {
    const tmpDir = '/tmp/uploads';
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  } else {
    // 本地开发环境使用项目目录中的上传文件夹
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
  }
};

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadDir());
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// 文件类型过滤
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型！仅支持JPG、PNG、PDF、DOC、DOCX、XLS、XLSX格式'), false);
  }
};

// 创建上传中间件
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  }
});

module.exports = {
  upload,
  uploadSingle: upload.single('file'),
  uploadMultiple: upload.array('files', 5), // 最多上传5个文件
  isVercel,
  getUploadDir
}; 