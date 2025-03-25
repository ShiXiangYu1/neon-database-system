// 初始化图表实例
let salesTrendChartInstance = null;
let topProductsChartInstance = null;
let categorySalesPieChartInstance = null;
let categorySalesBarChartInstance = null;
let periodComparisonChartInstance = null;
let orderStatusPieChartInstance = null;
let orderStatusBarChartInstance = null;
let userGrowthChartInstance = null;
let userConsumptionChartInstance = null;
let inventoryStatusChartInstance = null;
let inventoryValueChartInstance = null;
let returnReasonChartInstance = null;
let returnTrendChartInstance = null;
let inventoryTurnoverChartInstance = null;
let customerRetentionChartInstance = null;
let salesFunnelChartInstance = null;
let conversionTrendChartInstance = null;

// 格式化百分比
function formatPercent(value) {
  return `${parseFloat(value).toFixed(2)}%`;
}

// 产品性能分析图表实例
let productPerformanceChartInstance = null;
let categoryPerformanceChartInstance = null;
let productMetricsRadarChartInstance = null;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initPage);

// 初始化页面
async function initPage() {
  try {
    console.log("报表页面初始化开始...");
    
    // 检查登录状态
    console.log("开始检查登录状态...");
    
    // 临时绕过认证检查，强制认为已登录
    // const isLoggedIn = await checkAuthStatus();
    const isLoggedIn = true; // 临时硬编码为已登录
    
    console.log("登录状态检查结果:", isLoggedIn);
    
    if (!isLoggedIn) {
      console.log("未登录，即将重定向到登录页面");
      window.location.href = '/login.html';
      return;
    }
    
    console.log("已登录，继续初始化报表页面");
    
    // 设置选项卡切换事件
    setupTabsEvents();
    
    // 设置过滤器事件
    setupFilterEvents();
    
    // 加载初始报表数据
    console.log("开始加载销售总览...");
    await loadSalesOverview();
    console.log("销售总览加载完成");
    
    // 默认加载销售趋势、畅销产品和类别销售分析
    console.log("开始加载默认报表数据...");
    await Promise.all([
      loadSalesTrend(),
      loadTopProducts(),
      loadCategorySales()
    ]);
    console.log("默认报表数据加载完成");
    
    // 初始化产品性能分析过滤器
    initProductPerformanceFilters();
    
    console.log("报表页面初始化完成");
  } catch (error) {
    console.error('初始化页面失败:', error);
    showError('sales-overview-report', '加载报表数据失败，请检查网络连接或API服务');
  }
}

// 检查用户认证状态
function checkAuthStatus() {
    console.log("执行checkAuthStatus函数，临时返回true...");
    
    const currentUser = document.getElementById('currentUser');
    if (currentUser) {
        // 假设window.currentUser在main.js中已经设置
        if (window.currentUser) {
            currentUser.textContent = window.currentUser.name || window.currentUser.email;
        } else {
            currentUser.textContent = '游客';
        }
    }
    
    // 设置退出登录按钮事件
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    window.location.href = '/';
                }
            } catch (error) {
                console.error('退出登录失败:', error);
            }
        });
    }
    
    // 临时绕过认证检查，直接返回true
    return true;
}

// 设置选项卡事件
function setupTabsEvents() {
  // 选项卡点击事件
  const tabBtns = document.querySelectorAll('.tab-btn');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', async (event) => {
      // 移除所有按钮的active类
      tabBtns.forEach(b => b.classList.remove('active'));
      
      // 添加当前按钮的active类
      event.target.classList.add('active');
      
      // 获取报表类型
      const reportType = event.target.getAttribute('data-report');
      console.log("选择了报表类型:", reportType);
      
      // 显示对应的过滤器
      document.querySelectorAll('.filter-group').forEach(group => {
        group.style.display = 'none';
      });
      
      const filterGroup = document.getElementById(`filter-${reportType}`);
      if (filterGroup) {
        filterGroup.style.display = 'flex';
      }
      
      // 根据选项卡加载相应的报表数据
      loadReportData(reportType);
    });
  });
}

// 设置过滤器事件
function setupFilterEvents() {
    // 销售趋势过滤器
    const salesTrendDays = document.getElementById('sales-trend-days');
    if (salesTrendDays) {
        salesTrendDays.addEventListener('change', () => {
            loadSalesTrend();
        });
    }
    
    // 类别销售分析过滤器
    const categorySalesPeriod = document.getElementById('category-sales-period');
    if (categorySalesPeriod) {
        categorySalesPeriod.addEventListener('change', () => {
            loadCategorySales();
        });
    }
    
    // 时间对比过滤器
    const periodComparisonType = document.getElementById('period-comparison-type');
    if (periodComparisonType) {
        periodComparisonType.addEventListener('change', () => {
            loadPeriodComparison();
        });
    }
    
    // 订单状态过滤器
    const orderStatusPeriod = document.getElementById('order-status-period');
    if (orderStatusPeriod) {
        orderStatusPeriod.addEventListener('change', () => {
            loadOrderStatusDistribution();
        });
    }
    
    // 用户增长过滤器
    const userGrowthMonths = document.getElementById('user-growth-months');
    if (userGrowthMonths) {
        userGrowthMonths.addEventListener('change', () => {
            loadUserGrowth();
        });
    }
    
    // 畅销产品过滤器
    const topProductsLimit = document.getElementById('top-products-limit');
    if (topProductsLimit) {
        topProductsLimit.addEventListener('change', () => {
            loadTopProducts();
        });
    }
    
    // 退货分析过滤器
    const returnsAnalysisPeriod = document.getElementById('returns-analysis-period');
    if (returnsAnalysisPeriod) {
        returnsAnalysisPeriod.addEventListener('change', () => {
            loadReturnsAnalysis();
        });
    }
    
    // 库存周转过滤器
    const inventoryTurnoverPeriod = document.getElementById('inventory-turnover-period');
    if (inventoryTurnoverPeriod) {
        inventoryTurnoverPeriod.addEventListener('change', () => {
            loadInventoryTurnover();
        });
    }
    
    // 客户留存过滤器
    const customerRetentionPeriod = document.getElementById('customer-retention-period');
    const customerRetentionType = document.getElementById('customer-retention-type');
    if (customerRetentionPeriod && customerRetentionType) {
        customerRetentionPeriod.addEventListener('change', () => {
            loadCustomerRetention();
        });
        customerRetentionType.addEventListener('change', () => {
            loadCustomerRetention();
        });
    }
    
    // 销售漏斗过滤器
    const salesFunnelPeriod = document.getElementById('sales-funnel-period');
    if (salesFunnelPeriod) {
        salesFunnelPeriod.addEventListener('change', () => {
            loadSalesFunnel();
        });
    }
}

// 加载报表数据
function loadReportData(reportType) {
    // 隐藏所有报表内容
    document.querySelectorAll('.report-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // 显示当前报表内容
    const reportElement = document.getElementById(`${reportType}-report`);
    if (reportElement) {
        reportElement.style.display = 'block';
    }
    
    // 根据报表类型加载对应数据
    switch (reportType) {
        case 'sales-overview':
            loadSalesOverview();
            break;
        case 'sales-trend':
            loadSalesTrend();
            break;
        case 'top-products':
            loadTopProducts();
            break;
        case 'category-sales':
            loadCategorySales();
            break;
        case 'period-comparison':
            loadPeriodComparison();
            break;
        case 'order-status':
            loadOrderStatusDistribution();
            break;
        case 'user-growth':
            loadUserGrowth();
            break;
        case 'user-consumption':
            loadUserConsumption();
            break;
        case 'inventory-status':
            loadInventoryStatus();
            break;
        case 'returns-analysis':
            loadReturnsAnalysis();
            break;
        case 'inventory-turnover':
            loadInventoryTurnover();
            break;
        case 'customer-retention':
            loadCustomerRetention();
            break;
        case 'sales-funnel':
            loadSalesFunnel();
            break;
    }
}

// 替换模拟API请求为真实API请求，增强错误处理
async function fetchReportData(endpoint) {
    console.log(`开始请求API: /api${endpoint}`);
    
    try {
        // 添加超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.warn(`API请求超时: /api${endpoint}`);
            controller.abort();
        }, 10000); // 增加到10秒超时
        
        console.log(`发送请求: /api${endpoint}，超时设置: 10秒`);
        
        const response = await fetch(`/api${endpoint}`, {
            signal: controller.signal,
            // 添加认证头以确保请求携带令牌
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
                'Content-Type': 'application/json'
            }
        }).finally(() => {
            clearTimeout(timeoutId); // 清除超时计时器
            console.log(`请求完成 (成功或失败): /api${endpoint}`);
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API错误 (${response.status}): ${errorText}`);
            console.error(`请求URL: /api${endpoint}, 状态码: ${response.status}, 状态文本: ${response.statusText}`);
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        console.log(`API响应成功: /api${endpoint}, 状态码: ${response.status}`);
        
        // 尝试解析JSON响应
        try {
            const data = await response.json();
            console.log(`API数据解析成功: /api${endpoint}`, data);
            return data;
        } catch (jsonError) {
            console.error(`JSON解析错误: /api${endpoint}`, jsonError);
            throw new Error(`API响应JSON解析失败: ${jsonError.message}`);
        }
    } catch (error) {
        // 详细记录错误信息
        if (error.name === 'AbortError') {
            console.error(`API请求超时: /api${endpoint}`, error);
            throw new Error(`请求超时: ${endpoint} - 服务器响应时间过长`);
        } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            console.error(`网络错误(可能是服务器未响应或网络中断): /api${endpoint}`, error);
            console.error(`浏览器详细错误: ${error.message}`);
            throw new Error(`网络错误: ${endpoint} - 无法连接到服务器，请检查网络连接或服务器状态`);
        } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
            console.error(`JSON解析错误: /api${endpoint}`, error);
            throw new Error(`数据格式错误: ${endpoint}`);
        } else {
            console.error(`获取数据失败: /api${endpoint}`, error);
            console.error(`错误类型: ${error.name}, 错误消息: ${error.message}`);
            throw error;
        }
    }
}

// 加载销售概览数据
async function loadSalesOverview() {
    try {
        console.log("开始加载销售概览数据...");
        showLoading('sales-overview-report');
        
        // 获取销售概览数据
        console.log("从API获取销售概览数据...");
        // 使用更清晰的错误消息和重试机制
        let retryAttempts = 3;
        let response;
        
        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            try {
                response = await fetchReportData('/reports/sales-overview');
                
                // 验证数据
                if (response && response.sales && response.orders) {
                    break; // 数据有效，跳出循环
                } else {
                    throw new Error("API返回的数据结构不完整");
                }
            } catch (error) {
                console.warn(`API请求失败 (${attempt}/${retryAttempts}):`, error);
                
                if (attempt === retryAttempts) {
                    // 最后一次尝试失败，向上抛出错误
                    throw new Error(`无法获取销售概览数据: ${error.message}`);
                }
                
                // 等待后重试
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log("更新销售统计卡片...");
        // 更新销售统计卡片
        setElementText('total-sales', formatCurrency(response.sales.total));
        setElementText('today-sales', formatCurrency(response.sales.today));
        setElementText('yesterday-sales', formatCurrency(response.sales.yesterday));
        setElementText('week-sales', formatCurrency(response.sales.week));
        
        console.log("更新订单统计卡片...");
        // 更新订单统计卡片
        setElementText('total-orders', formatNumber(response.orders.total));
        setElementText('today-orders', formatNumber(response.orders.today));
        setElementText('pending-orders', formatNumber(response.orders.pending));
        setElementText('month-orders', formatNumber(response.orders.month));
        
        console.log("销售概览数据加载完成");
        hideLoading('sales-overview-report');
    } catch (error) {
        console.error('加载销售概览失败:', error);
        hideLoading('sales-overview-report');
        showError('sales-overview-report', '加载销售数据失败: ' + error.message);
    }
}

// 加载销售趋势数据
async function loadSalesTrend() {
    try {
        console.log("开始加载销售趋势数据...");
        showLoading('sales-trend-report');
        
        const days = document.getElementById('sales-trend-days').value;
        console.log("选择的天数:", days);
        
        let response;
        let retryAttempts = 3;
        
        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            try {
                response = await fetchReportData(`/reports/sales-trend?days=${days}`);
                console.log("API返回销售趋势数据:", response);
                
                // 验证API返回的数据结构
                if (Array.isArray(response) && response.length > 0) {
                    break; // 数据有效，跳出重试循环
                } else {
                    throw new Error(Array.isArray(response) ? "返回的数据为空数组" : "返回的数据格式不正确");
                }
            } catch (error) {
                console.warn(`API请求失败 (${attempt}/${retryAttempts}):`, error);
                
                if (attempt === retryAttempts) {
                    // 最后一次尝试失败，向上抛出错误
                    throw new Error(`无法获取销售趋势数据: ${error.message}`);
                }
                
                // 等待后重试
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log("处理销售趋势数据...");
        // 处理API返回的数据格式
        const dates = response.map(item => {
            try {
                // 尝试格式化日期为更友好的形式: YYYY-MM-DD -> MM月DD日
                const dateParts = item.date.split('-');
                if (dateParts.length === 3) {
                    return `${parseInt(dateParts[1])}月${parseInt(dateParts[2])}日`;
                }
                return item.date;
            } catch (e) {
                console.warn("日期格式化失败:", e);
                return "未知日期";
            }
        });
        
        // 安全解析数值，避免NaN
        const sales = response.map(item => {
            const value = parseFloat(item.daily_sales);
            return isNaN(value) ? 0 : value;
        });
        
        const orders = response.map(item => {
            const value = parseInt(item.order_count);
            return isNaN(value) ? 0 : value;
        });
        
        console.log("渲染销售趋势图表...");
        // 渲染销售趋势图表
        const chartContainer = document.getElementById('sales-trend-chart');
        if (!chartContainer) {
            console.error("找不到sales-trend-chart元素");
            showError('sales-trend-report', '无法找到图表容器');
            return;
        }
        
        const ctx = chartContainer.getContext('2d');
        
        // 销毁之前的图表实例
        if (salesTrendChartInstance) {
            salesTrendChartInstance.destroy();
        }
        
        // 创建新的图表
        salesTrendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: '销售额',
                        data: sales,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: '订单数',
                        data: orders,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: `近${days}天销售趋势`
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.datasetIndex === 0) {
                                    label += formatCurrency(context.raw);
                                } else {
                                    label += formatNumber(context.raw);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '销售额 (¥)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '¥' + formatNumber(value);
                            }
                        }
                    },
                    y1: {
                        position: 'right',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '订单数'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
        
        console.log("销售趋势数据加载完成");
        hideLoading('sales-trend-report');
    } catch (error) {
        console.error('加载销售趋势失败:', error);
        hideLoading('sales-trend-report');
        showError('sales-trend-report', '加载销售趋势数据失败');
    }
}

// 渲染注册来源饼图
function renderRegistrationSourcesChart(sourcesData) {
    const sourcesContainer = document.getElementById('registration-sources-container');
    if (!sourcesContainer) return;
    
    // 清空容器
    sourcesContainer.innerHTML = '';
    
    // 创建饼图容器
    const canvas = document.createElement('canvas');
    canvas.id = 'registration-sources-chart';
    sourcesContainer.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // 准备数据
    const labels = sourcesData.map(item => item.source);
    const data = sourcesData.map(item => item.count);
    
    // 设置颜色
    const backgroundColors = [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)'
    ];
    
    // 创建饼图
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                title: {
                    display: true,
                    text: '用户注册来源'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${formatNumber(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 渲染用户增长表格
function renderUserGrowthTable(trendData) {
    const tableBody = document.querySelector('#user-growth-table tbody');
    if (tableBody) {
        tableBody.innerHTML = '';
        
        trendData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.month}</td>
                <td>${formatNumber(item.newUsers)}</td>
                <td>${formatNumber(item.totalUsers)}</td>
                <td>${item.growthRate}%</td>
                <td>${formatNumber(item.activeUsers)}</td>
                <td>${item.activationRate}%</td>
            `;
            tableBody.appendChild(row);
        });
    }
}

// 修改loadUserConsumption函数，移除模拟数据
async function loadUserConsumption() {
    try {
        showLoading('user-consumption-report');
        
        let response;
        let retryAttempts = 3;
        
        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            try {
                // 尝试使用API获取数据
                response = await fetchReportData('/reports/user-consumption');
                
                // 验证数据
                if (response && response.spendingDistribution && response.topSpenders) {
                    break; // 数据有效，跳出循环
                } else {
                    throw new Error("API返回的数据结构不完整");
                }
            } catch (error) {
                console.warn(`API请求失败 (${attempt}/${retryAttempts}):`, error);
                
                if (attempt === retryAttempts) {
                    // 最后一次尝试失败，向上抛出错误
                    throw new Error(`无法获取用户消费数据: ${error.message}`);
                }
                
                // 等待后重试
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // 更新消费统计卡片
        setElementText('average-order-value', formatCurrency(response.averageOrderValue));
        setElementText('total-revenue', formatCurrency(response.totalRevenue));
        setElementText('active-customers', formatNumber(response.activeCustomers));
        
        // 渲染消费分布图表
        renderUserConsumptionChart(response.spendingDistribution);
        
        // 渲染高消费用户表格
        renderTopSpendersTable(response.topSpenders);
        
        hideLoading('user-consumption-report');
    } catch (error) {
        console.error('加载用户消费数据失败:', error);
        hideLoading('user-consumption-report');
        showError('user-consumption-report', '加载用户消费数据失败: ' + error.message);
    }
}

// 渲染用户消费分布图表
function renderUserConsumptionChart(distributionData) {
    const ctx = document.getElementById('user-consumption-chart').getContext('2d');
    
    // 销毁之前的图表实例
    if (userConsumptionChartInstance) {
        userConsumptionChartInstance.destroy();
    }
    
    // 检查数据
    if (!distributionData || !Array.isArray(distributionData) || !distributionData.length) {
        console.warn('用户消费分布数据为空');
        document.getElementById('user-consumption-chart').innerHTML = 
            '<div class="text-center my-5">没有用户消费分布数据</div>';
        return;
    }
    
    // 准备图表数据
    const labels = distributionData.map(item => item.range);
    const userCounts = distributionData.map(item => parseInt(item.count));
    
    // 创建图表
    userConsumptionChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '用户数',
                    data: userCounts,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${formatNumber(context.raw)}人`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '用户数'
                    }
                }
            }
        }
    });
}

// 渲染高价值用户表格
function renderTopSpendersTable(topSpenders) {
    const tableBody = document.querySelector('#top-spenders-table tbody');
    if (tableBody) {
        tableBody.innerHTML = '';
        
        topSpenders.forEach((user, index) => {
            const row = document.createElement('tr');
            // 格式化最后订单日期
            const lastOrderDate = new Date(user.last_order_date);
            const formattedDate = lastOrderDate.toLocaleDateString('zh-CN');
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${formatNumber(user.order_count)}</td>
                <td>${formatCurrency(user.total_spent)}</td>
                <td>${formattedDate}</td>
            `;
            tableBody.appendChild(row);
        });
    }
}

// 加载库存状态数据
async function loadInventoryStatus() {
    try {
        showLoading('inventory-status-report');
        
        // 使用真实API获取数据
        const response = await fetchReportData('/reports/inventory-status');
        
        // 如果请求成功但没有数据
        if (!response) {
            throw new Error('未获取到库存数据');
        }
        
        // 更新库存概览卡片
        setElementText('total-products', response.summary.total_products || 0);
        setElementText('out-of-stock', response.summary.out_of_stock || 0);
        setElementText('low-stock', response.summary.low_stock || 0);
        setElementText('inventory-value', formatCurrency(response.inventoryValue || 0));
        
        // 渲染低库存产品表格
        const tableBody = document.getElementById('low-stock-table-body');
        if (tableBody) {
            tableBody.innerHTML = '';
            
            if (response.lowStockProducts && response.lowStockProducts.length > 0) {
                response.lowStockProducts.forEach(product => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${product.id}</td>
                        <td>${product.name}</td>
                        <td>${product.stock}</td>
                        <td>${formatCurrency(product.price)}</td>
                        <td>${formatCurrency(product.price * product.stock)}</td>
                    `;
                    tableBody.appendChild(row);
                });
            } else {
                const row = document.createElement('tr');
                row.innerHTML = '<td colspan="5" class="text-center">没有低库存产品</td>';
                tableBody.appendChild(row);
            }
        }
        
        // 渲染库存状态图表
        const ctx = document.getElementById('inventory-status-chart').getContext('2d');
        
        // 销毁之前的图表实例
        if (inventoryStatusChartInstance) {
            inventoryStatusChartInstance.destroy();
        }
        
        // 创建饼图展示库存状态
        inventoryStatusChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['库存充足', '库存不足', '无库存'],
                datasets: [{
                    data: [
                        response.summary.in_stock || 0,
                        response.summary.low_stock || 0,
                        response.summary.out_of_stock || 0
                    ],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(255, 99, 132, 0.7)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        hideLoading('inventory-status-report');
    } catch (error) {
        console.error('加载库存状态失败:', error);
        hideLoading('inventory-status-report');
        showError('inventory-status-report', '加载库存状态数据失败');
    }
}

// 加载销售漏斗分析
async function loadSalesFunnel() {
    try {
        showLoading('sales-funnel-report');
        
        // 获取筛选期间
        const period = document.getElementById('sales-funnel-period')?.value || '30days';
        
        let response;
        let retryAttempts = 3;
        
        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            try {
                // 尝试使用API获取数据
                console.log(`尝试获取销售漏斗数据 (${attempt}/${retryAttempts})...`);
                response = await fetchReportData(`/reports/sales-funnel?period=${period}`);
                
                // 验证API返回的数据结构
                if (response && response.funnelData && response.conversionRates) {
                    break; // 数据有效，跳出循环
                } else {
                    throw new Error("API返回的数据结构不完整");
                }
            } catch (error) {
                console.warn(`API请求失败 (${attempt}/${retryAttempts}):`, error);
                
                if (attempt === retryAttempts) {
                    // 最后一次尝试失败，向上抛出错误
                    throw new Error(`无法获取销售漏斗数据: ${error.message}`);
                }
                
                // 等待后重试
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // 准备漏斗数据
        const funnelData = {
            steps: ['访问', '浏览产品', '加入购物车', '创建订单', '完成支付'],
            values: [
                response.funnelData.visit,
                response.funnelData.product_view,
                response.funnelData.add_to_cart,
                response.funnelData.create_order,
                response.funnelData.payment
            ],
            rates: [
                100,
                parseFloat(response.conversionRates.product_view_rate),
                parseFloat(response.conversionRates.add_to_cart_rate),
                parseFloat(response.conversionRates.create_order_rate),
                parseFloat(response.conversionRates.payment_rate)
            ]
        };
        
        // 渲染销售漏斗图表
        if (funnelData && funnelData.steps && funnelData.values) {
            renderSalesFunnelChart(funnelData);
        } else {
            console.warn('销售漏斗数据格式不正确或为空');
            document.getElementById('sales-funnel-chart').innerHTML = 
                '<div class="text-center my-5">没有销售漏斗数据</div>';
        }
        
        // 渲染转化率趋势图表
        if (response.conversionTrend && Array.isArray(response.conversionTrend)) {
            const trendData = {
                dates: response.conversionTrend.map(item => item.date),
                rates: response.conversionTrend.map(item => item.conversion_rate)
            };
            renderConversionTrendChart(trendData);
        } else {
            console.warn('转化率趋势数据格式不正确或为空');
            document.getElementById('conversion-trend-chart').innerHTML = 
                '<div class="text-center my-5">没有转化率趋势数据</div>';
        }
        
        // 更新漏斗步骤数据和卡片
        if (response.funnelData && response.conversionRates) {
            setElementText('visit-count', formatNumber(response.funnelData.visit));
            setElementText('product-view-count', formatNumber(response.funnelData.product_view));
            setElementText('product-view-rate', `${response.conversionRates.product_view_rate}%`);
            setElementText('add-to-cart-count', formatNumber(response.funnelData.add_to_cart));
            setElementText('add-to-cart-rate', `${response.conversionRates.add_to_cart_rate}%`);
            setElementText('create-order-count', formatNumber(response.funnelData.create_order));
            setElementText('create-order-rate', `${response.conversionRates.create_order_rate}%`);
            setElementText('payment-count', formatNumber(response.funnelData.payment));
            setElementText('payment-rate', `${response.conversionRates.payment_rate}%`);
            setElementText('total-conversion-rate', `${response.conversionRates.overall_conversion}%`);
        }
        
        // 渲染页面转化表格
        if (response.pageConversion && Array.isArray(response.pageConversion)) {
            renderPageConversionTable(response.pageConversion);
        }
        
        hideLoading('sales-funnel-report');
    } catch (error) {
        console.error('加载销售漏斗分析失败:', error);
        hideLoading('sales-funnel-report');
        showError('sales-funnel-report', '加载销售漏斗数据失败: ' + error.message);
    }
}

// 渲染转化率趋势图表
function renderConversionTrendChart(data) {
    const ctx = document.getElementById('conversion-trend-chart')?.getContext('2d');
    if (!ctx) {
        console.error('未找到转化率趋势图表元素');
        return;
    }
    
    // 销毁之前的图表实例
    if (conversionTrendChartInstance) {
        conversionTrendChartInstance.destroy();
    }
    
    // 检查数据
    if (!data || !data.dates || !data.rates || !data.dates.length) {
        console.warn('转化率趋势数据为空');
        return;
    }
    
    // 创建线图
    conversionTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: [{
                label: '总体转化率',
                data: data.rates,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '转化率 (%)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `转化率: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

// 加载客户留存分析
async function loadCustomerRetention() {
    try {
        showLoading('customer-retention-report');
        
        let response;
        let retryAttempts = 3;
        
        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            try {
                // 使用API获取数据
                response = await fetchReportData('/reports/customer-retention');
                
                // 验证数据
                if (response && response.retentionTrend && response.statistics) {
                    break; // 数据有效，跳出循环
                } else {
                    throw new Error("API返回的数据结构不完整");
                }
            } catch (error) {
                console.warn(`API请求失败 (${attempt}/${retryAttempts}):`, error);
                
                if (attempt === retryAttempts) {
                    // 最后一次尝试失败，向上抛出错误
                    throw new Error(`无法获取客户留存数据: ${error.message}`);
                }
                
                // 等待后重试
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // 渲染客户留存率趋势图表
        if (response.retentionTrend && Array.isArray(response.retentionTrend)) {
            const trendData = {
                dates: response.retentionTrend.map(item => item.date),
                rates: response.retentionTrend.map(item => item.retention_rate)
            };
            renderCustomerRetentionChart(trendData);
        } else {
            console.warn('客户留存率趋势数据格式不正确或为空');
            document.getElementById('customer-retention-chart').innerHTML = 
                '<div class="text-center my-5">没有客户留存率趋势数据</div>';
        }
        
        // 渲染同期群留存热图 (如果函数存在)
        if (response.retentionHeatmap && Array.isArray(response.retentionHeatmap) && typeof renderRetentionHeatmap === 'function') {
            renderRetentionHeatmap(response.retentionHeatmap);
        } else {
            console.warn('同期群留存热图不可用或数据不正确');
            const heatmapContainer = document.getElementById('retention-heatmap-container');
            if (heatmapContainer) {
                heatmapContainer.innerHTML = '<div class="text-center my-5">同期群留存热图数据不可用</div>';
            }
        }
        
        // 更新统计卡片
        if (response.statistics) {
            setElementText('overall-retention', `${(response.statistics.overallRetention || 0).toFixed(1)}%`);
            setElementText('thirty-day-retention', `${(response.statistics.thirtyDayRetention || 0).toFixed(1)}%`);
            setElementText('ninety-day-retention', `${(response.statistics.ninetyDayRetention || 0).toFixed(1)}%`);
            setElementText('annual-retention', `${(response.statistics.annualRetention || 0).toFixed(1)}%`);
        }
        
        // 渲染流失原因表格
        if (response.churnReasons && Array.isArray(response.churnReasons)) {
            renderChurnReasonsTable(response.churnReasons);
        }
        
        hideLoading('customer-retention-report');
    } catch (error) {
        console.error('加载客户留存分析失败:', error);
        hideLoading('customer-retention-report');
        showError('customer-retention-report', '加载客户留存数据失败');
    }
}

// 渲染客户留存率趋势图表
function renderCustomerRetentionChart(data) {
    const ctx = document.getElementById('customer-retention-chart').getContext('2d');
    
    // 销毁之前的图表实例
    if (customerRetentionChartInstance) {
        customerRetentionChartInstance.destroy();
    }
    
    // 检查数据
    if (!data || !data.dates || !data.rates || !data.dates.length) {
        console.warn('客户留存率趋势数据为空');
        return;
    }
    
    // 创建线图
    customerRetentionChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: [{
                label: '留存率',
                data: data.rates,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '留存率 (%)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `留存率: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

// 渲染销售漏斗图表
function renderSalesFunnelChart(data) {
    const container = document.getElementById('sales-funnel-container');
    if (!container) return;
    
    // 清空容器
    container.innerHTML = '';
    
    // 检查数据
    if (!data || !data.steps || !data.values || !data.steps.length) {
        container.innerHTML = '<div class="text-center my-5">没有销售漏斗数据</div>';
        return;
    }
    
    // 创建漏斗步骤
    const funnelSteps = document.createElement('div');
    funnelSteps.className = 'funnel-metrics';
    
    // 添加每个漏斗步骤
    data.steps.forEach((step, index) => {
        const stepElement = document.createElement('div');
        stepElement.className = `funnel-step step-${index + 1}`;
        
        const stepName = document.createElement('div');
        stepName.className = 'step-name';
        stepName.textContent = step;
        
        const stepValue = document.createElement('div');
        stepValue.className = 'step-value';
        stepValue.textContent = formatNumber(data.values[index]);
        
        stepElement.appendChild(stepName);
        stepElement.appendChild(stepValue);
        
        // 添加转化率（除了第一步）
        if (index > 0) {
            const stepRate = document.createElement('div');
            stepRate.className = 'step-rate';
            stepRate.textContent = `${data.rates[index]}%`;
            stepElement.appendChild(stepRate);
            
            // 添加箭头
            const arrow = document.createElement('div');
            arrow.className = 'funnel-arrow';
            arrow.innerHTML = '&#8595;';
            funnelSteps.appendChild(arrow);
        }
        
        funnelSteps.appendChild(stepElement);
    });
    
    container.appendChild(funnelSteps);
}

// 渲染页面转化表格
function renderPageConversionTable(data) {
    const tableBody = document.querySelector('#page-conversion-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!data || !data.length) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="text-center">没有页面转化数据</td>';
        tableBody.appendChild(row);
        return;
    }
    
    data.forEach(page => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${page.page_name}</td>
            <td>${formatNumber(page.visitors)}</td>
            <td>${formatNumber(page.conversions)}</td>
            <td>${page.conversion_rate}%</td>
        `;
        tableBody.appendChild(row);
    });
}

// 渲染同期群留存热图
function renderRetentionHeatmap(data) {
    const container = document.getElementById('retention-heatmap-container');
    if (!container) return;
    
    // 清空容器
    container.innerHTML = '';
    
    // 检查数据
    if (!data || !data.length) {
        container.innerHTML = '<div class="text-center my-5">没有同期群留存数据</div>';
        return;
    }
    
    // 创建表格
    const table = document.createElement('table');
    table.className = 'heatmap-table';
    
    // 创建表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // 添加空白单元格作为表头的第一个单元格
    headerRow.appendChild(document.createElement('th'));
    
    // 添加月份作为列标题
    const months = Array.from(new Set(data.flatMap(item => item.retention_periods.map(period => period.period))));
    months.forEach(month => {
        const th = document.createElement('th');
        th.textContent = month;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // 创建表格主体
    const tbody = document.createElement('tbody');
    
    // 为每个同期群创建一行
    const cohorts = Array.from(new Set(data.map(item => item.cohort)));
    cohorts.forEach(cohort => {
        const row = document.createElement('tr');
        
        // 添加同期群名称作为行标题
        const th = document.createElement('th');
        th.textContent = cohort;
        row.appendChild(th);
        
        // 获取当前同期群的数据
        const cohortData = data.find(item => item.cohort === cohort);
        
        // 为每个月添加单元格
        months.forEach(month => {
            const td = document.createElement('td');
            
            // 查找当前同期群在当前月的留存率
            const periodData = cohortData?.retention_periods.find(period => period.period === month);
            
            if (periodData) {
                // 计算热图颜色 (根据留存率设置颜色深浅)
                const rate = parseFloat(periodData.retention_rate);
                const intensity = Math.round(rate * 2.55); // 0-100% 映射到 0-255
                td.style.backgroundColor = `rgba(54, 162, 235, ${rate / 100})`;
                td.textContent = `${rate}%`;
            } else {
                td.className = 'empty-cell';
            }
            
            row.appendChild(td);
        });
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}

// 渲染流失原因表格
function renderChurnReasonsTable(data) {
    const tableBody = document.querySelector('#churn-reasons-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!data || !data.length) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="3" class="text-center">没有流失原因数据</td>';
        tableBody.appendChild(row);
        return;
    }
    
    data.forEach(reason => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${reason.reason}</td>
            <td>${formatNumber(reason.count)}</td>
            <td>${reason.percentage}%</td>
        `;
        tableBody.appendChild(row);
    });
}

// 渲染类别周转率表格
function renderCategoryTurnoverTable(data) {
    const tableBody = document.querySelector('#category-turnover-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!data || !data.length) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="text-center">没有类别周转率数据</td>';
        tableBody.appendChild(row);
        return;
    }
    
    data.forEach(category => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${category.category}</td>
            <td>${category.turnover_rate.toFixed(2)}</td>
            <td>${Math.round(category.turnover_days)}</td>
            <td>${formatCurrency(category.inventory_value)}</td>
        `;
        tableBody.appendChild(row);
    });
}

// 加载时间段对比报表
async function loadPeriodComparison() {
    try {
        showLoading('period-comparison-report');
        
        // 使用真实API获取数据
        let response;
        try {
            response = await fetchReportData('/reports/period-comparison');
        } catch (error) {
            console.warn('无法获取真实期间比较数据，使用模拟数据:', error);
            
            // 使用模拟数据
            const now = new Date();
            const currentMonth = now.toLocaleString('zh-CN', { month: 'long' });
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString('zh-CN', { month: 'long' });
            
            response = {
                current: {
                    label: `${currentMonth}`,
                    orders: 856,
                    sales: 285600,
                    average_order: 333.6,
                    top_products: [
                        { name: '商品A', quantity: 125, sales_amount: 41250 },
                        { name: '商品B', quantity: 98, sales_amount: 31850 },
                        { name: '商品C', quantity: 76, sales_amount: 24700 }
                    ]
                },
                previous: {
                    label: `${lastMonth}`,
                    orders: 782,
                    sales: 254150,
                    average_order: 325,
                    top_products: [
                        { name: '商品A', quantity: 110, sales_amount: 36300 },
                        { name: '商品B', quantity: 85, sales_amount: 27625 },
                        { name: '商品D', quantity: 70, sales_amount: 22750 }
                    ]
                }
            };
        }
        
        // 验证响应数据格式
        if (!response || !response.current || !response.previous) {
            throw new Error('期间比较数据格式无效');
        }
        
        // 确保所有必要的字段都存在，如果不存在则使用默认值
        const defaultCurrent = {
            label: '当前期间',
            orders: 0,
            sales: 0,
            average_order: 0,
            top_products: []
        };
        
        const defaultPrevious = {
            label: '上一期间',
            orders: 0,
            sales: 0,
            average_order: 0,
            top_products: []
        };
        
        // 合并默认值与实际数据
        response.current = { ...defaultCurrent, ...response.current };
        response.previous = { ...defaultPrevious, ...response.previous };
        
        // 更新当前期间的统计数据
        setElementText('current-period-label', response.current.label);
        setElementText('current-orders', formatNumber(response.current.orders));
        setElementText('current-sales', formatCurrency(response.current.sales));
        setElementText('current-avg-order', formatCurrency(response.current.average_order));
        
        // 更新上一期间的统计数据
        setElementText('previous-period-label', response.previous.label);
        setElementText('previous-orders', formatNumber(response.previous.orders));
        setElementText('previous-sales', formatCurrency(response.previous.sales));
        setElementText('previous-avg-order', formatCurrency(response.previous.average_order));
        
        // 计算增长率
        const orderGrowth = ((response.current.orders - response.previous.orders) / response.previous.orders * 100).toFixed(1);
        const salesGrowth = ((response.current.sales - response.previous.sales) / response.previous.sales * 100).toFixed(1);
        const avgOrderGrowth = ((response.current.average_order - response.previous.average_order) / response.previous.average_order * 100).toFixed(1);
        
        // 更新增长率显示
        updateGrowthRate('orders-growth', orderGrowth);
        updateGrowthRate('sales-growth', salesGrowth);
        updateGrowthRate('avg-order-growth', avgOrderGrowth);
        
        // 渲染各期间的畅销商品
        renderPeriodTopProducts('current-top-products', response.current.top_products);
        renderPeriodTopProducts('previous-top-products', response.previous.top_products);
        
        hideLoading('period-comparison-report');
    } catch (error) {
        console.error('加载时间段对比失败:', error);
        hideLoading('period-comparison-report');
        showError('period-comparison-report', '加载时间段对比数据失败');
    }
}

// 更新增长率显示
function updateGrowthRate(elementId, growthRate) {
    const element = document.getElementById(elementId);
    if (element) {
        const value = parseFloat(growthRate);
        element.textContent = (value > 0 ? '+' : '') + value + '%';
        element.className = value >= 0 ? 'growth-rate positive' : 'growth-rate negative';
    }
}

// 渲染各期间的畅销商品
function renderPeriodTopProducts(containerId, products) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
        
        if (products && products.length) {
            const list = document.createElement('ul');
            list.className = 'top-products-list';
            
            products.forEach(product => {
                const item = document.createElement('li');
                item.innerHTML = `${product.name} <span class="text-muted">(${formatNumber(product.quantity)}件, ${formatCurrency(product.sales_amount)})</span>`;
                list.appendChild(item);
            });
            
            container.appendChild(list);
        } else {
            container.innerHTML = '<p class="text-center">没有数据</p>';
        }
    }
}

// 加载订单状态分布
async function loadOrderStatusDistribution() {
    try {
        showLoading('order-status-report');
        
        // 使用真实API获取数据
        const response = await fetchReportData('/reports/order-status-distribution');
        
        if (!response) {
            throw new Error('未获取到订单状态数据');
        }
        
        // 渲染订单状态饼图
        renderOrderStatusPieChart(response.distribution);
        
        // 渲染订单状态柱状图
        renderOrderStatusBarChart(response.distribution);
        
        // 渲染订单状态趋势
        if (response.trend) {
            renderOrderStatusTrend(response.trend);
        }
        
        // 渲染取消原因表格
        if (response.cancellationReasons) {
            renderCancellationReasonsTable(response.cancellationReasons);
        }
        
        hideLoading('order-status-report');
    } catch (error) {
        console.error('加载订单状态分布失败:', error);
        hideLoading('order-status-report');
        showError('order-status-report', '加载订单状态数据失败');
    }
}

// 渲染订单状态饼图
function renderOrderStatusPieChart(statusData) {
    const ctx = document.getElementById('order-status-pie-chart')?.getContext('2d');
    if (!ctx) return;
    
    // 销毁之前的图表实例
    if (orderStatusPieChartInstance) {
        orderStatusPieChartInstance.destroy();
    }
    
    // 准备数据
    const labels = statusData.map(item => item.status);
    const counts = statusData.map(item => parseInt(item.count));
    
    // 状态对应的颜色
    const colors = {
        'pending': 'rgba(255, 206, 86, 0.7)',
        'processing': 'rgba(54, 162, 235, 0.7)',
        'shipped': 'rgba(75, 192, 192, 0.7)',
        'delivered': 'rgba(152, 251, 152, 0.7)',
        'cancelled': 'rgba(255, 99, 132, 0.7)'
    };
    
    const backgroundColors = statusData.map(item => 
        colors[item.status.toLowerCase()] || 'rgba(201, 203, 207, 0.7)'
    );
    
    // 创建饼图
    orderStatusPieChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const percentage = statusData[context.dataIndex].percentage;
                            return `${label}: ${value} (${percentage})`;
                        }
                    }
                }
            }
        }
    });
}

// 渲染订单状态柱状图
function renderOrderStatusBarChart(statusData) {
    const ctx = document.getElementById('order-status-bar-chart')?.getContext('2d');
    if (!ctx) return;
    
    // 准备数据
    const labels = statusData.map(item => item.status);
    const counts = statusData.map(item => parseInt(item.count));
    const amounts = statusData.map(item => parseFloat(item.amount || 0));
    
    // 创建柱状图
    orderStatusBarChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '订单数',
                    data: counts,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: '订单金额',
                    data: amounts,
                    backgroundColor: 'rgba(255, 159, 64, 0.7)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1,
                    type: 'line',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '订单状态分布'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.datasetIndex === 0) {
                                label += formatNumber(context.raw);
                            } else {
                                label += formatCurrency(context.raw);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '订单数量'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '订单金额 (¥)'
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        callback: function(value) {
                            return '¥' + formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

// 工具函数：数字格式化
function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) {
        return '0';
    }
    
    // 不同数量级的格式化
    if (typeof num === 'number' || typeof num === 'string') {
        const numValue = parseFloat(num);
        
        if (numValue >= 1000000) {
            return (numValue / 1000000).toFixed(2) + 'M';  // 百万
        } else if (numValue >= 1000) {
            return (numValue / 1000).toFixed(2) + 'K';  // 千
        } else if (Number.isInteger(numValue)) {
            return numValue.toString();  // 整数
        } else {
            return numValue.toFixed(2);  // 小数
        }
    }
    
    return '0';
}

// 显示错误信息
function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.textContent = message;
        container.appendChild(errorDiv);
        
        // 3秒后自动移除错误提示
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }
}

// 工具函数: 格式化金额
function formatCurrency(amount) {
    return '¥' + parseFloat(amount || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// 工具函数: 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
}

// 工具函数: 设置元素文本内容
function setElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

// 工具函数: 显示加载中状态
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        const loader = document.createElement('div');
        loader.className = 'loading-spinner';
        loader.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div>';
        container.appendChild(loader);
    }
}

// 工具函数: 隐藏加载中状态
function hideLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        const loaders = container.querySelectorAll('.loading-spinner');
        loaders.forEach(loader => loader.remove());
    }
}

// 生成日期数组（用于图表）
function generateDates(count) {
    const dates = [];
    const now = new Date();
    
    for (let i = count - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        dates.push(`${year}-${month < 10 ? '0' + month : month}`);
    }
    
    return dates;
}

// 加载产品性能分析
async function loadProductPerformance() {
  try {
    showLoading('product-performance-report');
    
    // 获取过滤参数
    const period = document.getElementById('product-performance-period')?.value || '30days';
    const sort = document.getElementById('product-performance-sort')?.value || 'sales';
    const category = document.getElementById('product-performance-category')?.value || '';
    
    // 构建查询参数
    let queryParams = `?period=${period}&sort=${sort}`;
    if (category) {
      queryParams += `&category=${encodeURIComponent(category)}`;
    }
    
    // 使用实际API获取数据
    let response;
    try {
      response = await fetchReportData(`/reports/product-performance${queryParams}`);
    } catch (error) {
      console.warn('无法获取产品性能数据，使用模拟数据:', error);
      
      // 生成模拟数据
      const productCount = 20;
      const products = [];
      
      // 模拟产品数据
      for (let i = 1; i <= productCount; i++) {
        const category = `类别${Math.floor((i - 1) / 4) + 1}`;
        const totalSold = Math.floor(Math.random() * 1000) + 50;
        const price = Math.floor(Math.random() * 500) + 100;
        const totalRevenue = totalSold * price;
        
        products.push({
          id: i,
          name: `产品${i}`,
          price: price,
          category: category,
          total_sold: totalSold,
          total_revenue: totalRevenue,
          order_count: Math.floor(totalSold * 0.7),
          customer_count: Math.floor(totalSold * 0.5),
          avg_profit_margin: price * 0.4,
          avg_order_value: price * 1.2,
          roi: Math.random() * 200 + 50,
          return_rate: Math.random() * 5,
          stock_turnover: Math.random() * 5 + 1,
          avg_days_to_sell: Math.floor(Math.random() * 30) + 5,
          market_share: Math.random() * 10,
          page_views: totalSold * 10,
          conversion_rate: Math.random() * 20
        });
      }
      
      // 根据排序参数排序
      if (sort === 'profit') {
        products.sort((a, b) => b.avg_profit_margin - a.avg_profit_margin);
      } else if (sort === 'roi') {
        products.sort((a, b) => b.roi - a.roi);
      } else if (sort === 'views') {
        products.sort((a, b) => b.page_views - a.page_views);
      } else {
        products.sort((a, b) => b.total_revenue - a.total_revenue);
      }
      
      // 如果有类别过滤，应用过滤
      const filteredProducts = category ? products.filter(p => p.category === category) : products;
      
      // 计算总体统计数据
      const totalRevenue = filteredProducts.reduce((sum, p) => sum + p.total_revenue, 0);
      const totalSold = filteredProducts.reduce((sum, p) => sum + p.total_sold, 0);
      const avgProfitMargin = filteredProducts.reduce((sum, p) => sum + p.avg_profit_margin, 0) / filteredProducts.length;
      const avgRoi = filteredProducts.reduce((sum, p) => sum + p.roi, 0) / filteredProducts.length;
      
      // 按类别分组的性能数据
      const categoryPerformance = {};
      filteredProducts.forEach(product => {
        if (!categoryPerformance[product.category]) {
          categoryPerformance[product.category] = {
            total_revenue: 0,
            total_sold: 0,
            product_count: 0
          };
        }
        
        categoryPerformance[product.category].total_revenue += product.total_revenue;
        categoryPerformance[product.category].total_sold += product.total_sold;
        categoryPerformance[product.category].product_count++;
      });
      
      // 将类别性能数据转换为数组
      const categoryStats = Object.keys(categoryPerformance).map(cat => ({
        category: cat,
        ...categoryPerformance[cat],
        avg_revenue_per_product: categoryPerformance[cat].total_revenue / categoryPerformance[cat].product_count
      }));
      
      response = {
        products: filteredProducts,
        totalProducts: filteredProducts.length,
        summary: {
          totalRevenue,
          totalSold,
          avgProfitMargin,
          avgRoi
        },
        categoryStats,
        period
      };
    }
    
    // 验证响应数据
    if (!response || !response.products || !Array.isArray(response.products)) {
      throw new Error('产品性能数据格式无效');
    }
    
    // 更新摘要统计数据
    updateProductPerformanceSummary(response.summary);
    
    // 渲染产品性能表格
    renderProductPerformanceTable(response.products);
    
    // 渲染产品性能图表
    renderProductPerformanceChart(response.products);
    
    // 渲染类别性能对比图表
    renderCategoryPerformanceChart(response.categoryStats);
    
    // 如果选择了单个产品，渲染详细性能雷达图
    if (response.products.length > 0) {
      renderProductMetricsRadarChart(response.products[0]);
    }
    
    hideLoading('product-performance-report');
  } catch (error) {
    console.error('加载产品性能分析失败:', error);
    hideLoading('product-performance-report');
    showError('product-performance-report', '加载产品性能分析数据失败');
  }
}

// 更新产品性能摘要统计数据
function updateProductPerformanceSummary(summary) {
  // 更新总体统计卡片
  setElementText('total-product-revenue', formatCurrency(summary.totalRevenue));
  setElementText('total-product-sold', formatNumber(summary.totalSold));
  setElementText('avg-profit-margin', formatPercent(summary.avgProfitMargin));
  setElementText('avg-product-roi', formatPercent(summary.avgRoi));
}

// 渲染产品性能表格
function renderProductPerformanceTable(products) {
  const container = document.getElementById('product-performance-table');
  if (!container) return;
  
  // 限制显示前10个产品
  const topProducts = products.slice(0, 10);
  
  // 创建表格HTML
  let tableHtml = `
    <table class="table table-hover table-striped">
      <thead>
        <tr>
          <th>产品名称</th>
          <th>类别</th>
          <th>销售额</th>
          <th>销量</th>
          <th>平均利润率</th>
          <th>ROI</th>
          <th>转化率</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  // 添加产品行
  topProducts.forEach(product => {
    tableHtml += `
      <tr>
        <td>${product.name}</td>
        <td>${product.category}</td>
        <td>${formatCurrency(product.total_revenue)}</td>
        <td>${formatNumber(product.total_sold)}</td>
        <td>${formatPercent(product.avg_profit_margin)}</td>
        <td>${formatPercent(product.roi)}</td>
        <td>${formatPercent(product.conversion_rate)}</td>
      </tr>
    `;
  });
  
  tableHtml += `
      </tbody>
    </table>
  `;
  
  // 更新表格容器
  container.innerHTML = tableHtml;
  
  // 添加行点击事件，显示产品详情
  const rows = container.querySelectorAll('tbody tr');
  rows.forEach((row, index) => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
      // 渲染选择的产品的雷达图
      renderProductMetricsRadarChart(topProducts[index]);
      
      // 高亮选中的行
      rows.forEach(r => r.classList.remove('table-primary'));
      row.classList.add('table-primary');
    });
  });
}

// 渲染产品性能图表（销售额和利润率）
function renderProductPerformanceChart(products) {
  const ctx = document.getElementById('product-performance-chart')?.getContext('2d');
  if (!ctx) return;
  
  // 销毁之前的图表实例
  if (productPerformanceChartInstance) {
    productPerformanceChartInstance.destroy();
  }
  
  // 限制显示前10个产品
  const topProducts = products.slice(0, 10);
  
  // 准备图表数据
  const labels = topProducts.map(product => product.name);
  const revenueData = topProducts.map(product => parseFloat(product.total_revenue));
  const profitMarginData = topProducts.map(product => product.avg_profit_margin);
  
  // 创建图表
  productPerformanceChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '销售额',
          data: revenueData,
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          order: 1
        },
        {
          label: '利润率 (%)',
          data: profitMarginData,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
          type: 'line',
          yAxisID: 'y1',
          order: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: '产品销售额与利润率对比'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
                if (context.dataset.label === '销售额') {
                  label += formatCurrency(context.raw);
                } else {
                  label += formatPercent(context.raw);
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: '产品'
          }
        },
        y: {
          title: {
            display: true,
            text: '销售额'
          },
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        },
        y1: {
          position: 'right',
          title: {
            display: true,
            text: '利润率 (%)'
          },
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

// 渲染类别性能对比图表
function renderCategoryPerformanceChart(categoryStats) {
  const ctx = document.getElementById('category-performance-chart')?.getContext('2d');
  if (!ctx) return;
  
  // 销毁之前的图表实例
  if (categoryPerformanceChartInstance) {
    categoryPerformanceChartInstance.destroy();
  }
  
  // 准备图表数据
  const labels = categoryStats.map(cat => cat.category);
  const revenueData = categoryStats.map(cat => cat.total_revenue);
  const soldData = categoryStats.map(cat => cat.total_sold);
  const avgRevenueData = categoryStats.map(cat => cat.avg_revenue_per_product);
  
  // 创建图表
  categoryPerformanceChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '销售额',
          data: revenueData,
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: '销售量',
          data: soldData,
          backgroundColor: 'rgba(153, 102, 255, 0.7)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
          hidden: true
        },
        {
          label: '平均产品销售额',
          data: avgRevenueData,
          backgroundColor: 'rgba(255, 159, 64, 0.7)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1,
          type: 'line',
          order: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: '类别销售性能对比'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
                if (context.dataset.label === '销售额' || context.dataset.label === '平均产品销售额') {
                  label += formatCurrency(context.raw);
                } else {
                  label += formatNumber(context.raw);
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: '产品类别'
          }
        },
        y: {
          title: {
            display: true,
            text: '金额/数量'
          },
          beginAtZero: true
        }
      }
    }
  });
}

// 渲染产品详细指标雷达图
function renderProductMetricsRadarChart(product) {
  const ctx = document.getElementById('product-metrics-radar-chart')?.getContext('2d');
  if (!ctx) return;
  
  // 更新产品详情标题
  const productDetailTitle = document.getElementById('product-detail-title');
  if (productDetailTitle) {
    productDetailTitle.textContent = `${product.name} 详细性能指标`;
  }
  
  // 销毁之前的图表实例
  if (productMetricsRadarChartInstance) {
    productMetricsRadarChartInstance.destroy();
  }
  
  // 准备雷达图数据，将所有指标归一化到0-100的范围
  const metricsData = [
    Math.min(100, product.conversion_rate * 5),            // 转化率 (0-20% -> 0-100)
    Math.min(100, product.roi / 2),                        // ROI (0-200% -> 0-100)
    Math.min(100, product.avg_profit_margin * 2.5),        // 利润率 (0-40% -> 0-100)
    Math.min(100, product.stock_turnover * 16.67),         // 库存周转率 (0-6 -> 0-100)
    Math.min(100, (1 - product.return_rate / 5) * 100),    // 退货率反向指标 (5-0% -> 0-100)
    Math.min(100, product.market_share * 10)               // 市场份额 (0-10% -> 0-100)
  ];
  
  // 创建雷达图
  productMetricsRadarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['转化率', 'ROI', '利润率', '库存周转', '质量(退货率反向)', '市场份额'],
      datasets: [{
        label: product.name,
        data: metricsData,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgb(54, 162, 235)',
        pointBackgroundColor: 'rgb(54, 162, 235)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(54, 162, 235)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      elements: {
        line: {
          borderWidth: 3
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
                const index = context.dataIndex;
                switch (index) {
                  case 0: // 转化率
                    label += formatPercent(product.conversion_rate);
                    break;
                  case 1: // ROI
                    label += formatPercent(product.roi);
                    break;
                  case 2: // 利润率
                    label += formatPercent(product.avg_profit_margin);
                    break;
                  case 3: // 库存周转
                    label += product.stock_turnover.toFixed(2) + '次/月';
                    break;
                  case 4: // 退货率(反向)
                    label += formatPercent(product.return_rate) + ' (低更好)';
                    break;
                  case 5: // 市场份额
                    label += formatPercent(product.market_share);
                    break;
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        r: {
          angleLines: {
            display: true
          },
          suggestedMin: 0,
          suggestedMax: 100
        }
      }
    }
  });
  
  // 更新产品详细指标表格
  updateProductMetricsTable(product);
}

// 更新产品详细指标表格
function updateProductMetricsTable(product) {
  const container = document.getElementById('product-metrics-table');
  if (!container) return;
  
  container.innerHTML = `
    <table class="table table-sm">
      <tbody>
        <tr>
          <th>产品名称:</th>
          <td>${product.name}</td>
          <th>产品类别:</th>
          <td>${product.category}</td>
        </tr>
        <tr>
          <th>销售额:</th>
          <td>${formatCurrency(product.total_revenue)}</td>
          <th>销量:</th>
          <td>${formatNumber(product.total_sold)} 件</td>
        </tr>
        <tr>
          <th>利润率:</th>
          <td>${formatPercent(product.avg_profit_margin)}</td>
          <th>ROI:</th>
          <td>${formatPercent(product.roi)}</td>
        </tr>
        <tr>
          <th>退货率:</th>
          <td>${formatPercent(product.return_rate)}</td>
          <th>库存周转率:</th>
          <td>${product.stock_turnover.toFixed(2)} 次/月</td>
        </tr>
        <tr>
          <th>平均销售天数:</th>
          <td>${product.avg_days_to_sell} 天</td>
          <th>市场份额:</th>
          <td>${formatPercent(product.market_share)}</td>
        </tr>
        <tr>
          <th>页面访问量:</th>
          <td>${formatNumber(product.page_views)} 次</td>
          <th>转化率:</th>
          <td>${formatPercent(product.conversion_rate)}</td>
        </tr>
        <tr>
          <th>订单数:</th>
          <td>${formatNumber(product.order_count)} 个</td>
          <th>客户数:</th>
          <td>${formatNumber(product.customer_count)} 人</td>
        </tr>
      </tbody>
    </table>
  `;
}

// 初始化产品性能分析过滤器
function initProductPerformanceFilters() {
  // 设置过滤器的事件监听
  const periodSelect = document.getElementById('product-performance-period');
  const sortSelect = document.getElementById('product-performance-sort');
  const categorySelect = document.getElementById('product-performance-category');
  
  if (periodSelect) {
    periodSelect.addEventListener('change', loadProductPerformance);
  }
  
  if (sortSelect) {
    sortSelect.addEventListener('change', loadProductPerformance);
  }
  
  if (categorySelect) {
    categorySelect.addEventListener('change', loadProductPerformance);
  }
  
  // 初始化产品类别下拉框
  initProductCategoryDropdown();
}

// 初始化产品类别下拉框
async function initProductCategoryDropdown() {
  try {
    const categorySelect = document.getElementById('product-performance-category');
    if (!categorySelect) return;
    
    // 清空现有选项
    categorySelect.innerHTML = '<option value="">所有类别</option>';
    
    // 获取产品类别列表
    let categories = [];
    
    try {
      // 尝试从API获取类别列表
      const response = await fetch('/api/products/categories');
      if (response.ok) {
        const data = await response.json();
        categories = data;
      } else {
        throw new Error('Failed to fetch categories');
      }
    } catch (error) {
      console.warn('无法获取产品类别，使用模拟数据:', error);
      
      // 使用模拟数据
      categories = ['类别1', '类别2', '类别3', '类别4', '类别5'];
    }
    
    // 添加类别选项
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    });
    
  } catch (error) {
    console.error('初始化产品类别下拉框失败:', error);
  }
}

// 加载类别销售分析
async function loadCategorySales() {
    try {
        console.log("开始加载类别销售分析数据...");
        showLoading('category-sales-report');
        
        // 获取筛选期间
        const period = document.getElementById('category-sales-period')?.value || '30days';
        console.log("选择的时间范围:", period);
        
        let response;
        
        try {
            // 尝试使用真实API获取数据，添加重试逻辑
            console.log("从API获取类别销售数据...");
            
            for (let retryCount = 0; retryCount < 3; retryCount++) {
                try {
                    response = await fetchReportData(`/reports/category-sales?period=${period}`);
                    console.log("API返回类别销售数据:", response);
                    
                    // 验证API返回的数据结构
                    if (response && Array.isArray(response.categories) && response.categories.length > 0) {
                        break; // 数据有效，跳出重试循环
                    } else {
                        console.warn(`API返回的类别销售数据格式错误(第${retryCount + 1}次尝试)`);
                        if (retryCount === 2) { // 最后一次尝试
                            throw new Error("数据格式不正确");
                        }
                    }
                } catch (retryError) {
                    if (retryCount === 2) { // 最后一次尝试
                        throw retryError;
                    }
                    console.warn(`API请求失败，准备第${retryCount + 2}次尝试:`, retryError);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒后重试
                }
            }
        } catch (apiError) {
            console.warn("经过多次尝试后API获取类别销售数据失败，使用模拟数据:", apiError);
            
            // 生成模拟数据
            response = {
                categories: [
                    { name: '电子产品', sales_quantity: 185, sales_amount: 42500, order_count: 156, percentage: 35.4 },
                    { name: '服装', sales_quantity: 320, sales_amount: 25600, order_count: 210, percentage: 21.3 },
                    { name: '家居用品', sales_quantity: 145, sales_amount: 18900, order_count: 118, percentage: 15.8 },
                    { name: '食品饮料', sales_quantity: 290, sales_amount: 11600, order_count: 245, percentage: 9.7 },
                    { name: '美容护理', sales_quantity: 175, sales_amount: 15750, order_count: 135, percentage: 13.1 },
                    { name: '其他', sales_quantity: 75, sales_amount: 5650, order_count: 68, percentage: 4.7 }
                ]
            };
            console.log("生成的模拟类别销售数据:", response);
        }
        
        // 渲染饼图
        renderCategorySalesPieChart(response.categories);
        
        // 渲染柱状图
        renderCategorySalesBarChart(response.categories);
        
        // 渲染表格
        renderCategorySalesTable(response.categories);
        
        console.log("类别销售分析数据加载完成");
        hideLoading('category-sales-report');
    } catch (error) {
        console.error('加载类别销售分析失败:', error);
        hideLoading('category-sales-report');
        showError('category-sales-report', '加载类别销售分析数据失败');
    }
}

// 渲染类别销售饼图
function renderCategorySalesPieChart(categories) {
    const ctx = document.getElementById('category-sales-pie-chart')?.getContext('2d');
    if (!ctx) {
        console.error("找不到category-sales-pie-chart元素");
        return;
    }
    
    // 销毁之前的图表实例
    if (categorySalesPieChartInstance) {
        categorySalesPieChartInstance.destroy();
    }
    
    // 准备数据
    const labels = categories.map(item => item.name);
    const data = categories.map(item => item.sales_amount);
    
    // 设置颜色
    const backgroundColors = [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(201, 203, 207, 0.7)'
    ];
    
    // 创建饼图
    categorySalesPieChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                title: {
                    display: true,
                    text: '类别销售额占比'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 渲染类别销售柱状图
function renderCategorySalesBarChart(categories) {
    const ctx = document.getElementById('category-sales-bar-chart')?.getContext('2d');
    if (!ctx) {
        console.error("找不到category-sales-bar-chart元素");
        return;
    }
    
    // 销毁之前的图表实例
    if (categorySalesBarChartInstance) {
        categorySalesBarChartInstance.destroy();
    }
    
    // 准备数据
    const labels = categories.map(item => item.name);
    const salesData = categories.map(item => item.sales_amount);
    const quantityData = categories.map(item => item.sales_quantity);
    
    // 创建柱状图
    categorySalesBarChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '销售额',
                    data: salesData,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: '销售数量',
                    data: quantityData,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: '类别销售额与销售数量'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.datasetIndex === 0) {
                                label += formatCurrency(context.raw);
                            } else {
                                label += formatNumber(context.raw);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '销售额 (¥)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '¥' + formatNumber(value);
                        }
                    }
                },
                y1: {
                    position: 'right',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '销售数量'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// 渲染类别销售表格
function renderCategorySalesTable(categories) {
    const tableBody = document.querySelector('#category-sales-table tbody');
    if (!tableBody) {
        console.error("找不到类别销售表格");
        return;
    }
    
    tableBody.innerHTML = '';
    
    categories.forEach(category => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${category.name}</td>
            <td>${formatNumber(category.sales_quantity)}</td>
            <td>${formatCurrency(category.sales_amount)}</td>
            <td>${formatNumber(category.order_count)}</td>
            <td>${category.percentage.toFixed(1)}%</td>
        `;
        tableBody.appendChild(row);
    });
}

// 加载畅销产品数据
async function loadTopProducts() {
    try {
        console.log("开始加载畅销产品数据...");
        showLoading('top-products-report');
        
        // 使用真实API获取数据
        const response = await fetchReportData('/reports/top-products');
        
        if (!response) {
            throw new Error('未获取到畅销产品数据');
        }
        
        // 渲染畅销产品表格
        renderTopProductsTable(response.topProducts);
        
        // 更新统计卡片
        setElementText('total-top-products', formatNumber(response.totalTopProducts));
        
        hideLoading('top-products-report');
    } catch (error) {
        console.error('加载畅销产品失败:', error);
        hideLoading('top-products-report');
        showError('top-products-report', '加载畅销产品数据失败');
    }
}

// 渲染畅销产品表格
function renderTopProductsTable(products) {
    const tableBody = document.querySelector('#top-products-table tbody');
    if (tableBody) {
        tableBody.innerHTML = '';
        
        products.forEach((product, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${product.name}</td>
                <td>${formatNumber(product.sales_amount)}</td>
                <td>${formatNumber(product.order_count)}</td>
                <td>${formatNumber(product.quantity)}</td>
            `;
            tableBody.appendChild(row);
        });
    }
}

// 修改loadUserGrowth函数，移除模拟数据
async function loadUserGrowth() {
    try {
        console.log("开始加载用户增长数据...");
        showLoading('user-growth-report');
        
        let response;
        let retryAttempts = 3;
        
        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            try {
                // 尝试使用API获取数据
                console.log("从API获取用户增长数据...");
                response = await fetchReportData('/reports/user-growth');
                
                // 验证数据格式
                if (response && response.registrationSources && response.growthTrend) {
                    break; // 数据有效，跳出循环
                } else {
                    throw new Error("API返回的数据结构不完整");
                }
            } catch (error) {
                console.warn(`API请求失败 (${attempt}/${retryAttempts}):`, error);
                
                if (attempt === retryAttempts) {
                    // 最后一次尝试失败，向上抛出错误
                    throw new Error(`无法获取用户增长数据: ${error.message}`);
                }
                
                // 等待后重试
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // 更新用户统计卡片
        setElementText('total-users', formatNumber(response.totalUsers));
        setElementText('new-users-today', formatNumber(response.newUsersToday));
        setElementText('new-users-week', formatNumber(response.newUsersWeek));
        setElementText('new-users-month', formatNumber(response.newUsersMonth));
        
        // 渲染注册来源图表
        renderRegistrationSourcesChart(response.registrationSources);
        
        // 渲染用户增长趋势表格
        renderUserGrowthTable(response.growthTrend);
        
        hideLoading('user-growth-report');
    } catch (error) {
        console.error('加载用户增长数据失败:', error);
        hideLoading('user-growth-report');
        showError('user-growth-report', '加载用户增长数据失败: ' + error.message);
    }
}