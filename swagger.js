const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger定义
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Neon数据库系统 API文档',
      version: '1.0.0',
      description: '这是Neon数据库系统的API文档，包含所有接口的详细说明',
      contact: {
        name: '系统管理员',
        email: 'admin@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: '开发服务器'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  // 指定API路由文件位置
  apis: ['./routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs }; 