/**
 * 报表和统计模块单元测试
 * 
 * 这个测试文件用于测试reports.js中的所有API接口
 * 包括正常响应和错误处理的测试用例
 */

const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const app = require('../index');
const db = require('../db');

describe('报表API测试', () => {
  // 通用测试用户令牌
  let adminToken;
  let userToken;
  
  // 在所有测试前创建测试环境
  before(async () => {
    // 创建管理员和普通用户的测试令牌
    adminToken = jwt.sign({
      id: 1,
      name: '测试管理员',
      email: 'admin@test.com',
      role: 'admin'
    }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });
    
    userToken = jwt.sign({
      id: 2,
      name: '测试用户',
      email: 'user@test.com',
      role: 'user'
    }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });
  });
  
  // 每个测试前重置数据库查询存根
  beforeEach(() => {
    sinon.restore();
  });
  
  // =====================
  // 销售总览 API 测试
  // =====================
  describe('GET /reports/sales-overview', () => {
    it('应该返回销售总览数据', async () => {
      // 模拟数据库查询结果
      const dbStub = sinon.stub(db, 'query');
      
      // 设置每个查询的返回值
      dbStub.onCall(0).resolves({ rows: [{ total: '10000.50' }] }); // 总销售额
      dbStub.onCall(1).resolves({ rows: [{ total: '3500.25' }] });  // 30天销售额
      dbStub.onCall(2).resolves({ rows: [{ total: '1200.75' }] });  // 7天销售额
      dbStub.onCall(3).resolves({ rows: [{ total: '350.50' }] });   // 今日销售额
      dbStub.onCall(4).resolves({ rows: [{ total: '420.25' }] });   // 昨日销售额
      
      dbStub.onCall(5).resolves({ rows: [{ count: '500' }] });      // 总订单数
      dbStub.onCall(6).resolves({ rows: [{ count: '150' }] });      // 30天订单数
      dbStub.onCall(7).resolves({ rows: [{ count: '50' }] });       // 7天订单数
      dbStub.onCall(8).resolves({ rows: [{ count: '15' }] });       // 今日订单数
      dbStub.onCall(9).resolves({ rows: [{ count: '30' }] });       // 待处理订单数
      
      // 发送请求
      const response = await request(app)
        .get('/api/reports/sales-overview')
        .set('Authorization', `Bearer ${userToken}`);
      
      // 断言
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('sales');
      expect(response.body).to.have.property('orders');
      
      expect(response.body.sales.total).to.equal(10000.5);
      expect(response.body.sales.last30Days).to.equal(3500.25);
      expect(response.body.orders.total).to.equal(500);
      expect(response.body.orders.pending).to.equal(30);
    });
    
    it('未授权用户无法访问销售总览', async () => {
      const response = await request(app)
        .get('/api/reports/sales-overview');
        
      expect(response.status).to.equal(401);
    });
    
    it('应该处理数据库错误', async () => {
      // 模拟数据库查询错误
      sinon.stub(db, 'query').rejects(new Error('数据库连接错误'));
      
      const response = await request(app)
        .get('/api/reports/sales-overview')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).to.equal(500);
      expect(response.body).to.have.property('error');
    });
  });
  
  // =====================
  // 畅销产品 API 测试
  // =====================
  describe('GET /reports/top-products', () => {
    it('应该返回畅销产品列表', async () => {
      // 模拟数据
      const mockProducts = [
        {
          id: 1,
          name: '产品A',
          price: '299.99',
          image_url: 'product-a.jpg',
          total_sold: '150',
          total_sales: '44998.50'
        },
        {
          id: 2,
          name: '产品B',
          price: '199.99',
          image_url: 'product-b.jpg',
          total_sold: '120',
          total_sales: '23998.80'
        }
      ];
      
      // 模拟数据库查询
      sinon.stub(db, 'query').resolves({ rows: mockProducts });
      
      const response = await request(app)
        .get('/api/reports/top-products')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array');
      expect(response.body).to.have.lengthOf(2);
      expect(response.body[0].name).to.equal('产品A');
      expect(response.body[1].name).to.equal('产品B');
    });
    
    it('应该接受limit参数限制返回数量', async () => {
      // 模拟数据库查询，验证limit参数
      const dbStub = sinon.stub(db, 'query').resolves({ rows: [] });
      
      await request(app)
        .get('/api/reports/top-products?limit=10')
        .set('Authorization', `Bearer ${userToken}`);
        
      // 验证查询参数
      expect(dbStub.firstCall.args[1]).to.deep.equal([10]);
    });
  });
  
  // =====================
  // 产品类别销售分析 API 测试
  // =====================
  describe('GET /reports/category-sales', () => {
    it('应该返回产品类别销售分析数据', async () => {
      // 模拟数据库查询结果
      const categorySalesRows = [
        { category: '类别1', items_sold: '300', total_sales: '59997', order_count: '150' },
        { category: '类别2', items_sold: '250', total_sales: '49997.5', order_count: '125' }
      ];
      
      const totalSalesRow = [{ total_sales: '109994.5' }];
      
      const dbStub = sinon.stub(db, 'query');
      dbStub.onCall(0).resolves({ rows: categorySalesRows });
      dbStub.onCall(1).resolves({ rows: totalSalesRow });
      
      const response = await request(app)
        .get('/api/reports/category-sales?period=30days')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('categories');
      expect(response.body).to.have.property('totalSales');
      expect(response.body).to.have.property('period');
      
      expect(response.body.period).to.equal('30days');
      expect(response.body.categories).to.be.an('array');
      expect(response.body.categories).to.have.lengthOf(2);
      
      // 验证百分比计算
      expect(response.body.categories[0].percentage).to.be.closeTo(54.55, 0.01);
    });
    
    it('应该处理不同的时间段参数', async () => {
      const dbStub = sinon.stub(db, 'query').resolves({ rows: [] });
      
      // 测试不同的time参数
      await request(app)
        .get('/api/reports/category-sales?period=7days')
        .set('Authorization', `Bearer ${userToken}`);
        
      // 验证生成的SQL包含7天过滤条件
      expect(dbStub.firstCall.args[0]).to.include("AND o.created_at >= NOW() - INTERVAL '7 days'");
      
      // 重置存根
      dbStub.reset();
      
      // 测试90天参数
      await request(app)
        .get('/api/reports/category-sales?period=90days')
        .set('Authorization', `Bearer ${userToken}`);
        
      expect(dbStub.firstCall.args[0]).to.include("AND o.created_at >= NOW() - INTERVAL '90 days'");
    });
  });
  
  // =====================
  // 用户消费分析 API 测试
  // =====================
  describe('GET /reports/user-consumption', () => {
    it('管理员应该能获取用户消费分析数据', async () => {
      // 模拟数据
      const consumptionDistributionRows = [
        { spending_range: '0-100元', user_count: '250' },
        { spending_range: '100-500元', user_count: '150' },
        { spending_range: '500-1000元', user_count: '75' }
      ];
      
      const topSpendersRows = [
        { id: 1, name: '用户A', email: 'user_a@example.com', order_count: '15', total_spent: '9800.50', last_order_date: '2023-01-15' },
        { id: 2, name: '用户B', email: 'user_b@example.com', order_count: '12', total_spent: '8200.25', last_order_date: '2023-01-10' }
      ];
      
      const userAOVRow = [{ average: '650.75' }];
      const repeatPurchaseRateRow = [{ rate: '35.5' }];
      
      const dbStub = sinon.stub(db, 'query');
      dbStub.onCall(0).resolves({ rows: consumptionDistributionRows });
      dbStub.onCall(1).resolves({ rows: topSpendersRows });
      dbStub.onCall(2).resolves({ rows: userAOVRow });
      dbStub.onCall(3).resolves({ rows: repeatPurchaseRateRow });
      
      const response = await request(app)
        .get('/api/reports/user-consumption')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('consumptionDistribution');
      expect(response.body).to.have.property('topSpenders');
      expect(response.body).to.have.property('averageOrderValue');
      expect(response.body).to.have.property('repeatPurchaseRate');
      
      expect(response.body.consumptionDistribution).to.be.an('array');
      expect(response.body.topSpenders).to.be.an('array');
      expect(response.body.averageOrderValue).to.equal(650.75);
      expect(response.body.repeatPurchaseRate).to.equal(35.5);
    });
    
    it('普通用户无法访问用户消费分析', async () => {
      const response = await request(app)
        .get('/api/reports/user-consumption')
        .set('Authorization', `Bearer ${userToken}`);
        
      expect(response.status).to.equal(403);
    });
  });
  
  // =====================
  // 库存周转分析 API 测试
  // =====================
  describe('GET /reports/inventory-turnover', () => {
    it('管理员应该能获取库存周转分析数据', async () => {
      // 模拟响应数据，因为这个接口中是模拟数据，所以我们直接请求API
      const response = await request(app)
        .get('/api/reports/inventory-turnover?period=quarter')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('turnoverTrend');
      expect(response.body).to.have.property('statistics');
      expect(response.body).to.have.property('categoryTurnover');
      
      expect(response.body.turnoverTrend).to.be.an('array');
      expect(response.body.statistics).to.have.property('avgTurnoverRate');
      expect(response.body.statistics).to.have.property('bestCategory');
      expect(response.body.categoryTurnover).to.be.an('array');
    });
    
    it('普通用户无法访问库存周转分析', async () => {
      const response = await request(app)
        .get('/api/reports/inventory-turnover')
        .set('Authorization', `Bearer ${userToken}`);
        
      expect(response.status).to.equal(403);
    });
  });
  
  // =====================
  // 销售漏斗分析 API 测试
  // =====================
  describe('GET /reports/sales-funnel', () => {
    it('应该返回销售漏斗分析数据', async () => {
      const response = await request(app)
        .get('/api/reports/sales-funnel?period=30days')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('funnelData');
      expect(response.body).to.have.property('conversionRates');
      expect(response.body).to.have.property('conversionTrend');
      expect(response.body).to.have.property('pageConversion');
      
      expect(response.body.funnelData).to.have.property('visit');
      expect(response.body.funnelData).to.have.property('product_view');
      expect(response.body.funnelData).to.have.property('add_to_cart');
      expect(response.body.funnelData).to.have.property('create_order');
      expect(response.body.funnelData).to.have.property('payment');
      
      expect(response.body.conversionRates).to.have.property('overall_conversion');
    });
    
    it('应该处理不同的时间段参数', async () => {
      const response = await request(app)
        .get('/api/reports/sales-funnel?period=7days')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).to.equal(200);
      
      // 检查趋势数据长度是否匹配7天
      expect(response.body.conversionTrend).to.have.lengthOf(7);
    });
  });
  
  // =====================
  // 订单状态分布 API 测试
  // =====================
  describe('GET /reports/order-status-distribution', () => {
    it('应该返回订单状态分布数据', async () => {
      // 模拟数据库查询结果
      const statusDistributionRows = [
        { status: 'completed', count: '500', total_amount: '150000.50', percentage: 50 },
        { status: 'pending', count: '300', total_amount: '90000.25', percentage: 30 },
        { status: 'cancelled', count: '200', total_amount: '60000.75', percentage: 20 }
      ];
      
      const totalOrdersRow = [{ total: '1000' }];
      
      const dbStub = sinon.stub(db, 'query');
      dbStub.onCall(0).resolves({ rows: statusDistributionRows });
      dbStub.onCall(1).resolves({ rows: totalOrdersRow });
      
      const response = await request(app)
        .get('/api/reports/order-status-distribution?period=30days')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('distribution');
      expect(response.body).to.have.property('total');
      expect(response.body).to.have.property('period');
      
      expect(response.body.distribution).to.be.an('array');
      expect(response.body.distribution).to.have.lengthOf(3);
      expect(response.body.total).to.equal(1000);
      expect(response.body.period).to.equal('30days');
    });
  });
  
  // =====================
  // 客户留存分析 API 测试
  // =====================
  describe('GET /reports/customer-retention', () => {
    it('管理员应该能获取客户留存分析数据', async () => {
      const response = await request(app)
        .get('/api/reports/customer-retention?period=quarter&type=all')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('retentionTrend');
      expect(response.body).to.have.property('retentionHeatmap');
      expect(response.body).to.have.property('statistics');
      expect(response.body).to.have.property('churnReasons');
      
      expect(response.body.retentionHeatmap).to.be.an('array');
      expect(response.body.statistics).to.have.property('overallRetention');
      expect(response.body.churnReasons).to.be.an('array');
    });
  });
}); 