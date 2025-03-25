const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: 报表
 *   description: 报表和统计API
 */

/**
 * @swagger
 * /reports/sales-overview:
 *   get:
 *     summary: 获取销售总览
 *     description: 获取总销售额、一段时间内的销售额和订单数量等统计数据
 *     tags: [报表]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回销售总览数据
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
// 获取销售总览
router.get('/sales-overview', verifyToken, async (req, res) => {
  try {
    // 查询条件：过去30天、过去7天、今天
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
    const last7Days = new Date(now);
    last7Days.setDate(now.getDate() - 7);
    const last7DaysStart = last7Days.toISOString();
    const last30Days = new Date(now);
    last30Days.setDate(now.getDate() - 30);
    const last30DaysStart = last30Days.toISOString();

    // 查询销售额
    const [totalSales, last30DaysSales, last7DaysSales, todaySales, yesterdaySales] = await Promise.all([
      db.query('SELECT SUM(total_amount) as total FROM orders WHERE status = $1', ['completed']),
      db.query('SELECT SUM(total_amount) as total FROM orders WHERE status = $1 AND created_at >= $2', ['completed', last30DaysStart]),
      db.query('SELECT SUM(total_amount) as total FROM orders WHERE status = $1 AND created_at >= $2', ['completed', last7DaysStart]),
      db.query('SELECT SUM(total_amount) as total FROM orders WHERE status = $1 AND created_at >= $2', ['completed', todayStart]),
      db.query('SELECT SUM(total_amount) as total FROM orders WHERE status = $1 AND created_at >= $2 AND created_at < $3', ['completed', yesterdayStart, todayStart])
    ]);

    // 查询订单数
    const [totalOrders, last30DaysOrders, last7DaysOrders, todayOrders, pendingOrders] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM orders'),
      db.query('SELECT COUNT(*) as count FROM orders WHERE created_at >= $1', [last30DaysStart]),
      db.query('SELECT COUNT(*) as count FROM orders WHERE created_at >= $1', [last7DaysStart]),
      db.query('SELECT COUNT(*) as count FROM orders WHERE created_at >= $1', [todayStart]),
      db.query('SELECT COUNT(*) as count FROM orders WHERE status = $1', ['pending'])
    ]);

    // 返回数据
    res.json({
      sales: {
        total: parseFloat(totalSales.rows[0]?.total || 0),
        last30Days: parseFloat(last30DaysSales.rows[0]?.total || 0),
        last7Days: parseFloat(last7DaysSales.rows[0]?.total || 0),
        today: parseFloat(todaySales.rows[0]?.total || 0),
        yesterday: parseFloat(yesterdaySales.rows[0]?.total || 0)
      },
      orders: {
        total: parseInt(totalOrders.rows[0]?.count || 0),
        last30Days: parseInt(last30DaysOrders.rows[0]?.count || 0),
        last7Days: parseInt(last7DaysOrders.rows[0]?.count || 0),
        today: parseInt(todayOrders.rows[0]?.count || 0),
        pending: parseInt(pendingOrders.rows[0]?.count || 0)
      }
    });
  } catch (err) {
    console.error('获取销售总览失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /reports/top-products:
 *   get:
 *     summary: 获取畅销产品
 *     description: 获取销量排名靠前的产品列表
 *     tags: [报表]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 返回的产品数量限制
 *     responses:
 *       200:
 *         description: 成功返回畅销产品列表
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
// 获取畅销产品
router.get('/top-products', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const result = await db.query(`
      SELECT p.id, p.name, p.price, p.image_url, 
             SUM(oi.quantity) as total_sold, 
             SUM(oi.quantity * oi.price) as total_sales
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed'
      GROUP BY p.id, p.name, p.price, p.image_url
      ORDER BY total_sold DESC
      LIMIT $1
    `, [limit]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('获取畅销产品失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /reports/sales-trend:
 *   get:
 *     summary: 获取销售趋势
 *     description: 获取一段时间内的销售趋势数据
 *     tags: [报表]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: 查询的天数
 *     responses:
 *       200:
 *         description: 成功返回销售趋势数据
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
// 获取销售趋势（按天）
router.get('/sales-trend', verifyToken, async (req, res) => {
  try {
    // 默认查询过去30天
    const days = parseInt(req.query.days) || 30;
    
    const result = await db.query(`
      SELECT 
        date_trunc('day', created_at)::date as date,
        SUM(total_amount) as daily_sales,
        COUNT(*) as order_count
      FROM orders
      WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY date_trunc('day', created_at)::date
      ORDER BY date
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('获取销售趋势失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /reports/user-growth:
 *   get:
 *     summary: 获取用户增长趋势
 *     description: 获取一段时间内的用户增长趋势数据
 *     tags: [报表]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *         description: 查询的月数
 *     responses:
 *       200:
 *         description: 成功返回用户增长趋势数据
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
// 获取用户增长趋势
router.get('/user-growth', verifyToken, isAdmin, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    
    const result = await db.query(`
      SELECT 
        date_trunc('month', created_at)::date as month,
        COUNT(*) as new_users
      FROM users
      WHERE created_at >= NOW() - INTERVAL '${months} months'
      GROUP BY date_trunc('month', created_at)::date
      ORDER BY month
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('获取用户增长趋势失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /reports/inventory-status:
 *   get:
 *     summary: 获取库存状态
 *     description: 获取产品库存状态和低库存产品列表
 *     tags: [报表]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回库存状态数据
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
// 获取库存状态
router.get('/inventory-status', verifyToken, isAdmin, async (req, res) => {
  try {
    // 查询低库存产品（小于等于5个）
    const lowStock = await db.query(`
      SELECT id, name, stock, price
      FROM products
      WHERE stock <= 5
      ORDER BY stock ASC
    `);
    
    // 查询库存总值
    const inventoryValue = await db.query(`
      SELECT SUM(stock * price) as total_value
      FROM products
    `);
    
    // 查询库存情况统计
    const stockSummary = await db.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock,
        COUNT(CASE WHEN stock BETWEEN 1 AND 5 THEN 1 END) as low_stock,
        COUNT(CASE WHEN stock > 5 THEN 1 END) as in_stock
      FROM products
    `);
    
    res.json({
      lowStockProducts: lowStock.rows,
      inventoryValue: parseFloat(inventoryValue.rows[0]?.total_value || 0),
      summary: stockSummary.rows[0]
    });
  } catch (err) {
    console.error('获取库存状态失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /reports/category-sales:
 *   get:
 *     summary: 获取产品类别销售分析
 *     description: 获取不同产品类别的销售数据分析
 *     tags: [报表]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7days, 30days, 90days, 365days, all]
 *         description: 统计周期
 *     responses:
 *       200:
 *         description: 成功返回产品类别销售分析数据
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
// 获取产品类别销售分析
router.get('/category-sales', verifyToken, async (req, res) => {
  try {
    const period = req.query.period || '30days';
    let timeFilter = '';
    
    // 设置时间过滤条件
    switch(period) {
      case '7days':
        timeFilter = "AND o.created_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30days':
        timeFilter = "AND o.created_at >= NOW() - INTERVAL '30 days'";
        break;
      case '90days':
        timeFilter = "AND o.created_at >= NOW() - INTERVAL '90 days'";
        break;
      case '365days':
        timeFilter = "AND o.created_at >= NOW() - INTERVAL '365 days'";
        break;
      default:
        timeFilter = "";
    }
    
    // 查询各类别销售情况
    // 注意：products表中不存在category列，使用id模拟类别
    const categorySales = await db.query(`
      SELECT 
        '类别' || (p.id % 5 + 1) as category, 
        SUM(oi.quantity) as items_sold,
        SUM(oi.quantity * oi.price) as total_sales,
        COUNT(DISTINCT o.id) as order_count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.status = 'completed' ${timeFilter}
      GROUP BY '类别' || (p.id % 5 + 1)
      ORDER BY total_sales DESC
    `);
    
    // 查询时间范围内的总销售额
    const totalSalesResult = await db.query(`
      SELECT SUM(total_amount) as total_sales
      FROM orders o
      WHERE status = 'completed' ${timeFilter.replace(/o\.created_at/g, 'o.created_at')}
    `);
    
    const totalSales = parseFloat(totalSalesResult.rows[0]?.total_sales || 0);
    
    // 计算每个类别的销售占比
    const results = categorySales.rows.map(category => ({
      ...category,
      percentage: totalSales > 0 ? parseFloat(category.total_sales) / totalSales * 100 : 0
    }));
    
    res.json({
      categories: results,
      totalSales: totalSales,
      period: period
    });
  } catch (err) {
    console.error('获取产品类别销售分析失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /reports/period-comparison:
 *   get:
 *     summary: 获取时间段销售对比
 *     description: 获取两个时间段的销售数据对比(同比/环比)
 *     tags: [报表]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [month, quarter, year]
 *         description: 对比类型(月度环比、季度环比或年度同比)
 *     responses:
 *       200:
 *         description: 成功返回时间段对比数据
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
// 获取时间段销售对比(同比/环比)
router.get('/period-comparison', verifyToken, async (req, res) => {
  try {
    const type = req.query.type || 'month';
    let currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd;
    const now = new Date();
    
    // 根据对比类型设置时间范围
    switch (type) {
      case 'month': // 月度环比
        // 当前月
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        // 上个月
        previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
        
      case 'quarter': // 季度环比
        const currentQuarter = Math.floor(now.getMonth() / 3);
        // 当前季度
        currentPeriodStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
        currentPeriodEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        // 上个季度
        previousPeriodStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
        previousPeriodEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);
        break;
        
      case 'year': // 年度同比
        // 今年
        currentPeriodStart = new Date(now.getFullYear(), 0, 1);
        currentPeriodEnd = new Date(now.getFullYear(), 11, 31);
        // 去年
        previousPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
        previousPeriodEnd = new Date(now.getFullYear() - 1, 11, 31);
        break;
    }
    
    // 查询当前时间段销售数据
    const currentPeriodData = await db.query(`
      SELECT 
        SUM(total_amount) as total_sales,
        COUNT(*) as order_count,
        AVG(total_amount) as avg_order_value
      FROM orders
      WHERE status = 'completed' 
        AND created_at >= $1 
        AND created_at <= $2
    `, [currentPeriodStart, currentPeriodEnd]);
    
    // 查询前一个时间段销售数据
    const previousPeriodData = await db.query(`
      SELECT 
        SUM(total_amount) as total_sales,
        COUNT(*) as order_count,
        AVG(total_amount) as avg_order_value
      FROM orders
      WHERE status = 'completed' 
        AND created_at >= $1 
        AND created_at <= $2
    `, [previousPeriodStart, previousPeriodEnd]);
    
    // 获取每个时间段的畅销产品
    const currentTopProducts = await db.query(`
      SELECT p.id, p.name, SUM(oi.quantity) as total_sold
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed' 
        AND o.created_at >= $1 
        AND o.created_at <= $2
      GROUP BY p.id, p.name
      ORDER BY total_sold DESC
      LIMIT 5
    `, [currentPeriodStart, currentPeriodEnd]);
    
    const previousTopProducts = await db.query(`
      SELECT p.id, p.name, SUM(oi.quantity) as total_sold
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed' 
        AND o.created_at >= $1 
        AND o.created_at <= $2
      GROUP BY p.id, p.name
      ORDER BY total_sold DESC
      LIMIT 5
    `, [previousPeriodStart, previousPeriodEnd]);
    
    // 计算变化率
    const currentSales = parseFloat(currentPeriodData.rows[0]?.total_sales || 0);
    const previousSales = parseFloat(previousPeriodData.rows[0]?.total_sales || 0);
    const salesGrowth = previousSales > 0 ? ((currentSales - previousSales) / previousSales * 100) : 0;
    
    const currentOrders = parseInt(currentPeriodData.rows[0]?.order_count || 0);
    const previousOrders = parseInt(previousPeriodData.rows[0]?.order_count || 0);
    const ordersGrowth = previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders * 100) : 0;
    
    const currentAOV = parseFloat(currentPeriodData.rows[0]?.avg_order_value || 0);
    const previousAOV = parseFloat(previousPeriodData.rows[0]?.avg_order_value || 0);
    const aovGrowth = previousAOV > 0 ? ((currentAOV - previousAOV) / previousAOV * 100) : 0;
    
    // 格式化日期为字符串
    const formatPeriod = (start, end) => {
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      };
    };
    
    res.json({
      type: type,
      currentPeriod: {
        ...formatPeriod(currentPeriodStart, currentPeriodEnd),
        sales: currentSales,
        orders: currentOrders,
        avgOrderValue: currentAOV,
        topProducts: currentTopProducts.rows
      },
      previousPeriod: {
        ...formatPeriod(previousPeriodStart, previousPeriodEnd),
        sales: previousSales,
        orders: previousOrders,
        avgOrderValue: previousAOV,
        topProducts: previousTopProducts.rows
      },
      growth: {
        sales: salesGrowth,
        orders: ordersGrowth,
        avgOrderValue: aovGrowth
      }
    });
  } catch (err) {
    console.error('获取时间段销售对比失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /reports/order-status-distribution:
 *   get:
 *     summary: 获取订单状态分布
 *     description: 获取不同状态订单的分布情况
 *     tags: [报表]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7days, 30days, 90days, all]
 *         description: 统计周期
 *     responses:
 *       200:
 *         description: 成功返回订单状态分布数据
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
// 获取订单状态分布
router.get('/order-status-distribution', verifyToken, async (req, res) => {
  try {
    const period = req.query.period || '30days';
    let timeFilter = '';
    
    // 设置时间过滤条件
    switch(period) {
      case '7days':
        timeFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30days':
        timeFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
        break;
      case '90days':
        timeFilter = "AND created_at >= NOW() - INTERVAL '90 days'";
        break;
      default:
        timeFilter = "";
    }
    
    // 获取订单状态分布
    const statusDistribution = await db.query(`
      SELECT 
        status, 
        COUNT(*) as count,
        SUM(total_amount) as total_amount
      FROM orders
      WHERE 1=1 ${timeFilter}
      GROUP BY status
      ORDER BY count DESC
    `);
    
    // 获取总订单数
    const totalOrders = await db.query(`
      SELECT COUNT(*) as total
      FROM orders
      WHERE 1=1 ${timeFilter}
    `);
    
    const total = parseInt(totalOrders.rows[0]?.total || 0);
    
    // 计算每个状态的百分比
    const results = statusDistribution.rows.map(item => ({
      ...item,
      percentage: total > 0 ? (parseInt(item.count) / total * 100) : 0
    }));
    
    res.json({
      distribution: results,
      total: total,
      period: period
    });
  } catch (err) {
    console.error('获取订单状态分布失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /reports/user-consumption:
 *   get:
 *     summary: 获取用户消费分析
 *     description: 获取用户消费金额分布和高价值用户分析
 *     tags: [报表]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回用户消费分析数据
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
// 获取用户消费分析
router.get('/user-consumption', verifyToken, isAdmin, async (req, res) => {
  try {
    // 用户消费分布 (按消费金额分组)
    const consumptionDistribution = await db.query(`
      WITH user_spending AS (
        SELECT 
          u.id,
          COALESCE(SUM(o.total_amount), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed'
        GROUP BY u.id
      )
      SELECT 
        CASE 
          WHEN total_spent = 0 THEN '无消费'
          WHEN total_spent < 100 THEN '0-100元'
          WHEN total_spent < 500 THEN '100-500元'
          WHEN total_spent < 1000 THEN '500-1000元'
          WHEN total_spent < 5000 THEN '1000-5000元'
          ELSE '5000元以上'
        END as spending_range,
        COUNT(*) as user_count
      FROM user_spending
      GROUP BY 
        CASE 
          WHEN total_spent = 0 THEN '无消费'
          WHEN total_spent < 100 THEN '0-100元'
          WHEN total_spent < 500 THEN '100-500元'
          WHEN total_spent < 1000 THEN '500-1000元'
          WHEN total_spent < 5000 THEN '1000-5000元'
          ELSE '5000元以上'
        END
      ORDER BY 
        CASE 
          WHEN spending_range = '无消费' THEN 1
          WHEN spending_range = '0-100元' THEN 2
          WHEN spending_range = '100-500元' THEN 3
          WHEN spending_range = '500-1000元' THEN 4
          WHEN spending_range = '1000-5000元' THEN 5
          ELSE 6
        END
    `);
    
    // 高价值用户 (消费金额最高的前10名用户)
    const topSpenders = await db.query(`
      SELECT 
        u.id, 
        u.name,
        u.email,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_spent,
        MAX(o.created_at) as last_order_date
      FROM users u
      JOIN orders o ON u.id = o.user_id
      WHERE o.status = 'completed'
      GROUP BY u.id, u.name, u.email
      ORDER BY total_spent DESC
      LIMIT 10
    `);
    
    // 用户平均订单价值
    const userAOV = await db.query(`
      SELECT 
        AVG(user_aov) as average
      FROM (
        SELECT 
          u.id,
          COALESCE(AVG(o.total_amount), 0) as user_aov
        FROM users u
        JOIN orders o ON u.id = o.user_id
        WHERE o.status = 'completed'
        GROUP BY u.id
      ) as user_averages
    `);
    
    // 首次购买到复购的转化率
    const repeatPurchaseRate = await db.query(`
      SELECT 
        (COUNT(DISTINCT CASE WHEN order_count > 1 THEN user_id END) * 100.0 / 
         NULLIF(COUNT(DISTINCT user_id), 0)) as rate
      FROM (
        SELECT 
          user_id,
          COUNT(*) as order_count
        FROM orders
        WHERE status = 'completed'
        GROUP BY user_id
      ) as user_orders
    `);
    
    res.json({
      consumptionDistribution: consumptionDistribution.rows,
      topSpenders: topSpenders.rows,
      averageOrderValue: parseFloat(userAOV.rows[0]?.average || 0),
      repeatPurchaseRate: parseFloat(repeatPurchaseRate.rows[0]?.rate || 0)
    });
  } catch (err) {
    console.error('获取用户消费分析失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /reports/returns-analysis:
 *   get:
 *     summary: 获取退货分析数据
 *     description: 获取指定时间段内的退货分析数据，包括退货原因、退货率趋势等
 *     tags: [报表]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7days, 30days, 90days, 365days, all]
 *         description: 统计周期
 *     responses:
 *       200:
 *         description: 成功返回退货分析数据
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
// 获取退货分析
router.get('/returns-analysis', verifyToken, async (req, res) => {
  try {
    const period = req.query.period || '30days';
    let timeFilter = '';
    
    // 设置时间过滤条件
    switch(period) {
      case '7days':
        timeFilter = "AND o.created_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30days':
        timeFilter = "AND o.created_at >= NOW() - INTERVAL '30 days'";
        break;
      case '90days':
        timeFilter = "AND o.created_at >= NOW() - INTERVAL '90 days'";
        break;
      case '365days':
        timeFilter = "AND o.created_at >= NOW() - INTERVAL '365 days'";
        break;
      default:
        timeFilter = "";
    }
    
    // 假设我们有一个订单状态表和退货原因表
    // 这里我们模拟一些退货数据
    // 实际应用中，这需要根据你的数据库结构调整SQL查询
    
    // 获取退货原因分布
    const returnReasons = [
      { reason: '质量问题', count: 45, percentage: 28.3 },
      { reason: '尺寸不合适', count: 35, percentage: 22.0 },
      { reason: '与描述不符', count: 30, percentage: 18.9 },
      { reason: '收到损坏', count: 25, percentage: 15.7 },
      { reason: '买家后悔', count: 15, percentage: 9.4 },
      { reason: '其他原因', count: 9, percentage: 5.7 }
    ];
    
    // 获取退货率趋势数据
    const returnTrend = [];
    // 模拟生成过去30天的数据
    const days = period === '7days' ? 7 : (period === '30days' ? 30 : (period === '90days' ? 90 : 30));
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // 模拟每天的退货率 (1.5% - 5%)
      const returnRate = (1.5 + Math.random() * 3.5).toFixed(2);
      
      returnTrend.push({
        date: date.toISOString().split('T')[0],
        return_rate: parseFloat(returnRate)
      });
    }
    
    // 计算总体统计数据
    const totalReturnRate = 3.2; // 模拟总体退货率
    const currentReturnAmount = 15689.50; // 模拟本期退货金额
    const avgProcessTime = 2.7; // 模拟平均处理时间(天)
    const totalReturnOrders = 159; // 模拟总退货订单数
    
    // 获取退货率最高的产品
    const topReturnedProducts = [
      { id: 12, name: '精品T恤', return_quantity: 25, sold_quantity: 320, return_rate: 7.8, main_reason: '尺寸不合适' },
      { id: 45, name: '休闲裤', return_quantity: 18, sold_quantity: 258, return_rate: 7.0, main_reason: '质量问题' },
      { id: 23, name: '运动鞋', return_quantity: 15, sold_quantity: 245, return_rate: 6.1, main_reason: '尺寸不合适' },
      { id: 67, name: '时尚帽子', return_quantity: 12, sold_quantity: 210, return_rate: 5.7, main_reason: '与描述不符' },
      { id: 34, name: '牛仔裤', return_quantity: 10, sold_quantity: 180, return_rate: 5.5, main_reason: '质量问题' }
    ];
    
    res.json({
      returnReasons,
      returnTrend,
      statistics: {
        totalReturnRate,
        currentReturnAmount,
        avgProcessTime,
        totalReturnOrders
      },
      topReturnedProducts
    });
    
  } catch (err) {
    console.error('获取退货分析失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /reports/inventory-turnover:
 *   get:
 *     summary: 获取库存周转分析数据
 *     description: 获取不同周期的库存周转率和周转天数分析
 *     tags: [报表]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [month, quarter, year]
 *         description: 分析周期
 *     responses:
 *       200:
 *         description: 成功返回库存周转分析数据
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
// 获取库存周转分析
router.get('/inventory-turnover', verifyToken, isAdmin, async (req, res) => {
  try {
    const period = req.query.period || 'quarter';
    const periodMonths = period === 'month' ? 1 : (period === 'quarter' ? 3 : 12);
    
    // 模拟库存周转率趋势数据
    const turnoverTrend = [];
    const now = new Date();
    const months = 12; // 展示过去12个月的数据
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      
      // 模拟每月的库存周转率 (2 - 5次)
      const turnoverRate = (2 + Math.random() * 3).toFixed(2);
      // 库存周转天数 = 30天/周转率
      const turnoverDays = (30 / parseFloat(turnoverRate)).toFixed(1);
      
      turnoverTrend.push({
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        turnover_rate: parseFloat(turnoverRate),
        turnover_days: parseFloat(turnoverDays)
      });
    }
    
    // 计算平均库存周转率和周转天数
    const avgTurnoverRate = 3.5; // 模拟平均库存周转率
    const avgTurnoverDays = 28.6; // 模拟平均库存周转天数
    
    // 各类别库存周转情况
    const categoryTurnover = [
      { category: '男装', turnover_rate: 4.8, turnover_days: 18.8, avg_inventory: 125000, cogs: 600000, trend: 'up' },
      { category: '女装', turnover_rate: 5.2, turnover_days: 17.3, avg_inventory: 180000, cogs: 936000, trend: 'up' },
      { category: '儿童', turnover_rate: 3.9, turnover_days: 23.1, avg_inventory: 85000, cogs: 331500, trend: 'stable' },
      { category: '运动', turnover_rate: 4.1, turnover_days: 22.0, avg_inventory: 110000, cogs: 451000, trend: 'up' },
      { category: '配饰', turnover_rate: 2.8, turnover_days: 32.1, avg_inventory: 90000, cogs: 252000, trend: 'down' },
      { category: '鞋靴', turnover_rate: 3.2, turnover_days: 28.1, avg_inventory: 160000, cogs: 512000, trend: 'stable' }
    ];
    
    // 最佳和最差类别
    const bestCategory = '女装';
    const worstCategory = '配饰';
    
    res.json({
      turnoverTrend,
      statistics: {
        avgTurnoverRate,
        avgTurnoverDays,
        bestCategory,
        worstCategory
      },
      categoryTurnover
    });
    
  } catch (err) {
    console.error('获取库存周转分析失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /reports/customer-retention:
 *   get:
 *     summary: 获取客户留存分析数据
 *     description: 获取不同周期的客户留存率分析
 *     tags: [报表]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [month, quarter, year]
 *         description: 分析周期
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, new, active]
 *         description: 用户分组
 *     responses:
 *       200:
 *         description: 成功返回客户留存分析数据
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
// 获取客户留存分析
router.get('/customer-retention', verifyToken, isAdmin, async (req, res) => {
  try {
    const period = req.query.period || 'quarter';
    const userType = req.query.type || 'all';
    
    // 模拟客户留存率趋势数据
    const retentionTrend = [];
    const now = new Date();
    const months = 12; // 展示过去12个月的数据
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      
      // 模拟每月的客户留存率 (60% - 85%)
      const retentionRate = (60 + Math.random() * 25).toFixed(1);
      
      retentionTrend.push({
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        retention_rate: parseFloat(retentionRate)
      });
    }
    
    // 创建同期群用户留存热图数据
    const retentionHeatmap = [];
    for (let i = 0; i < 6; i++) { // 6个月的同期群
      const cohort = {
        month: `${now.getFullYear()}-${String(now.getMonth() + 1 - i).padStart(2, '0')}`,
        retention: []
      };
      
      for (let j = 0; j <= i; j++) {
        // 随着时间推移，留存率通常会下降
        const rate = Math.max(30, 100 - j * (15 + Math.random() * 10)).toFixed(1);
        cohort.retention.push(parseFloat(rate));
      }
      
      retentionHeatmap.push(cohort);
    }
    
    // 计算留存率统计
    const overallRetention = 72.5; // 模拟总体留存率
    const thirtyDayRetention = 85.2; // 模拟30天留存率
    const ninetyDayRetention = 68.7; // 模拟90天留存率
    const annualRetention = 42.3; // 模拟年度留存率
    
    // 客户流失原因分析
    const churnReasons = [
      { reason: '竞品吸引', count: 120, percentage: 30.0, avg_spent: 752.50, avg_tenure: 3.2 },
      { reason: '产品不满意', count: 95, percentage: 23.8, avg_spent: 485.75, avg_tenure: 2.1 },
      { reason: '价格因素', count: 85, percentage: 21.3, avg_spent: 625.80, avg_tenure: 4.5 },
      { reason: '客服体验', count: 45, percentage: 11.3, avg_spent: 850.20, avg_tenure: 3.8 },
      { reason: '需求变化', count: 35, percentage: 8.8, avg_spent: 720.40, avg_tenure: 5.2 },
      { reason: '其他原因', count: 20, percentage: 5.0, avg_spent: 580.30, avg_tenure: 2.7 }
    ];
    
    res.json({
      retentionTrend,
      retentionHeatmap,
      statistics: {
        overallRetention,
        thirtyDayRetention,
        ninetyDayRetention,
        annualRetention
      },
      churnReasons
    });
    
  } catch (err) {
    console.error('获取客户留存分析失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /reports/sales-funnel:
 *   get:
 *     summary: 获取销售漏斗分析数据
 *     description: 获取销售过程中各阶段的转化率分析
 *     tags: [报表]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7days, 30days, 90days, all]
 *         description: 统计周期
 *     responses:
 *       200:
 *         description: 成功返回销售漏斗分析数据
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
// 获取销售漏斗分析
router.get('/sales-funnel', verifyToken, async (req, res) => {
  try {
    const period = req.query.period || '30days';
    
    // 模拟销售漏斗数据
    const funnelData = {
      visit: 10000,
      product_view: 7500,
      add_to_cart: 3200,
      create_order: 1800,
      payment: 1250
    };
    
    // 计算转化率
    const conversionRates = {
      product_view_rate: ((funnelData.product_view / funnelData.visit) * 100).toFixed(1),
      add_to_cart_rate: ((funnelData.add_to_cart / funnelData.visit) * 100).toFixed(1),
      create_order_rate: ((funnelData.create_order / funnelData.visit) * 100).toFixed(1),
      payment_rate: ((funnelData.payment / funnelData.visit) * 100).toFixed(1),
      overall_conversion: ((funnelData.payment / funnelData.visit) * 100).toFixed(1)
    };
    
    // 模拟转化率趋势数据
    const conversionTrend = [];
    const now = new Date();
    const days = period === '7days' ? 7 : (period === '30days' ? 30 : (period === '90days' ? 90 : 30));
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // 模拟每天的总体转化率 (8% - 15%)
      const conversion = (8 + Math.random() * 7).toFixed(1);
      
      conversionTrend.push({
        date: date.toISOString().split('T')[0],
        conversion_rate: parseFloat(conversion)
      });
    }
    
    // 页面转化率详情
    const pageConversion = [
      { page: '首页', visits: 10000, bounce_rate: 30.5, avg_time: 120, conversions: 2500, conversion_rate: 25.0 },
      { page: '产品列表页', visits: 7500, bounce_rate: 25.2, avg_time: 180, conversions: 3200, conversion_rate: 42.7 },
      { page: '产品详情页', visits: 5000, bounce_rate: 35.8, avg_time: 210, conversions: 1800, conversion_rate: 36.0 },
      { page: '购物车页面', visits: 3200, bounce_rate: 40.2, avg_time: 150, conversions: 1800, conversion_rate: 56.3 },
      { page: '结算页面', visits: 1800, bounce_rate: 30.0, avg_time: 240, conversions: 1250, conversion_rate: 69.4 }
    ];
    
    res.json({
      funnelData,
      conversionRates,
      conversionTrend,
      pageConversion
    });
    
  } catch (err) {
    console.error('获取销售漏斗分析失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * @swagger
 * /reports/product-performance:
 *   get:
 *     summary: 获取产品性能分析
 *     description: 获取产品的详细性能指标，包括销售情况、利润率、退货率等数据
 *     tags: [报表]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [30days, 90days, 365days, all]
 *         description: 统计周期
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 可选的产品类别过滤
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [sales, profit, roi, views]
 *         description: 排序依据
 *     responses:
 *       200:
 *         description: 成功返回产品性能分析数据
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
// 获取产品性能分析
router.get('/product-performance', verifyToken, isAdmin, async (req, res) => {
  try {
    // 获取查询参数
    const period = req.query.period || '30days';
    const category = req.query.category || null;
    const sort = req.query.sort || 'sales';
    
    // 设置时间过滤条件
    let timeFilter = '';
    switch(period) {
      case '30days':
        timeFilter = "AND o.created_at >= NOW() - INTERVAL '30 days'";
        break;
      case '90days':
        timeFilter = "AND o.created_at >= NOW() - INTERVAL '90 days'";
        break;
      case '365days':
        timeFilter = "AND o.created_at >= NOW() - INTERVAL '365 days'";
        break;
      default:
        timeFilter = "";
    }
    
    // 设置类别过滤条件
    let categoryFilter = '';
    if (category) {
      // 由于我们使用了产品ID模拟类别，实际项目中应该直接使用产品的category字段
      categoryFilter = `AND '类别' || (p.id % 5 + 1) = $1`;
    }
    
    // 查询产品性能数据
    let query = `
      SELECT 
        p.id,
        p.name,
        p.price,
        p.description,
        p.image_url,
        '类别' || (p.id % 5 + 1) as category,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue,
        COALESCE(COUNT(DISTINCT o.id), 0) as order_count,
        COALESCE(COUNT(DISTINCT o.user_id), 0) as customer_count,
        COALESCE(AVG(p.price - (p.price * 0.6)), 0) as avg_profit_margin,
        COALESCE((SUM(oi.quantity * oi.price) / NULLIF(SUM(oi.quantity), 0)), 0) as avg_order_value,
        COALESCE((SUM(oi.quantity * (p.price - (p.price * 0.6))) / NULLIF(SUM(oi.quantity * p.price * 0.6), 0)) * 100, 0) as roi
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed' ${timeFilter}
      ${categoryFilter}
      GROUP BY p.id, p.name, p.price, p.description, p.image_url
    `;
    
    // 添加排序条件
    switch(sort) {
      case 'profit':
        query += ' ORDER BY avg_profit_margin DESC';
        break;
      case 'roi':
        query += ' ORDER BY roi DESC';
        break;
      case 'views':
        // 如果有产品查看统计表，这里可以关联该表进行排序
        // 由于没有该表，我们使用销售量替代
        query += ' ORDER BY total_sold DESC';
        break;
      case 'sales':
      default:
        query += ' ORDER BY total_revenue DESC';
    }
    
    // 执行查询
    const queryParams = category ? [category] : [];
    const result = await db.query(query, queryParams);
    
    // 附加产品性能指标
    const productPerformance = result.rows.map(product => {
      // 计算额外的性能指标
      const returnRate = Math.random() * 5; // 模拟退货率 0-5%
      const stockTurnover = Math.random() * 5 + 1; // 模拟库存周转率 1-6次/月
      const daysToSell = Math.floor(Math.random() * 30) + 5; // 模拟平均销售天数 5-35天
      const marketShare = Math.random() * 10; // 模拟市场份额 0-10%
      
      // 使用随机数模拟产品页面访问量和转化率
      const pageViews = Math.floor(product.total_sold * (Math.random() * 10 + 5)); // 假设每个销售有5-15次页面访问
      const conversionRate = (product.total_sold / pageViews * 100).toFixed(2);
      
      return {
        ...product,
        avg_profit_margin: parseFloat(product.avg_profit_margin),
        roi: parseFloat(product.roi),
        return_rate: parseFloat(returnRate.toFixed(2)),
        stock_turnover: parseFloat(stockTurnover.toFixed(2)),
        avg_days_to_sell: daysToSell,
        market_share: parseFloat(marketShare.toFixed(2)),
        page_views: pageViews,
        conversion_rate: parseFloat(conversionRate)
      };
    });
    
    // 计算总体统计数据
    const totalRevenue = productPerformance.reduce((sum, product) => sum + parseFloat(product.total_revenue), 0);
    const totalSold = productPerformance.reduce((sum, product) => sum + parseInt(product.total_sold), 0);
    const avgProfitMargin = productPerformance.reduce((sum, product) => sum + product.avg_profit_margin, 0) / productPerformance.length;
    const avgRoi = productPerformance.reduce((sum, product) => sum + product.roi, 0) / productPerformance.length;
    
    // 按类别分组的性能数据
    const categoryPerformance = {};
    productPerformance.forEach(product => {
      if (!categoryPerformance[product.category]) {
        categoryPerformance[product.category] = {
          total_revenue: 0,
          total_sold: 0,
          product_count: 0
        };
      }
      
      categoryPerformance[product.category].total_revenue += parseFloat(product.total_revenue);
      categoryPerformance[product.category].total_sold += parseInt(product.total_sold);
      categoryPerformance[product.category].product_count++;
    });
    
    // 将类别性能数据转换为数组
    const categoryStats = Object.keys(categoryPerformance).map(category => ({
      category,
      ...categoryPerformance[category],
      avg_revenue_per_product: categoryPerformance[category].total_revenue / categoryPerformance[category].product_count
    }));
    
    // 返回响应
    res.json({
      products: productPerformance,
      totalProducts: productPerformance.length,
      summary: {
        totalRevenue,
        totalSold,
        avgProfitMargin: parseFloat(avgProfitMargin.toFixed(2)),
        avgRoi: parseFloat(avgRoi.toFixed(2))
      },
      categoryStats,
      period
    });
    
  } catch (err) {
    console.error('获取产品性能分析失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router; 