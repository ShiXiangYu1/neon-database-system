// DOM元素
const authOverlay = document.getElementById('authOverlay');
const userName = document.getElementById('userName');
const loggedInDiv = document.querySelector('.logged-in');
const loggedOutDiv = document.querySelector('.logged-out');
const logoutBtn = document.getElementById('logoutBtn');
const usersLink = document.getElementById('usersLink');
const userCount = document.getElementById('userCount');
const productCount = document.getElementById('productCount');
const orderCount = document.getElementById('orderCount');
const recentOrdersBody = document.getElementById('recentOrdersBody');

// 全局变量
let currentUser = null;
let isAuthenticated = false;

// 将currentUser变量设为全局变量
window.currentUser = currentUser;

// 事件监听器
document.addEventListener('DOMContentLoaded', checkAuthStatus);
if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}

// 检查登录状态
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/me');
        
        if (response.ok) {
            const user = await response.json();
            isAuthenticated = true;
            currentUser = user;
            window.currentUser = user;
            
            // 更新UI
            updateUIForAuthenticatedUser();
            
            // 加载数据
            loadDashboardData();
        } else {
            isAuthenticated = false;
            currentUser = null;
            window.currentUser = null;
            updateUIForUnauthenticatedUser();
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        isAuthenticated = false;
        currentUser = null;
        window.currentUser = null;
        updateUIForUnauthenticatedUser();
    }
}

// 登出处理
async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            isAuthenticated = false;
            currentUser = null;
            
            // 更新UI
            updateUIForUnauthenticatedUser();
            
            // 重定向到登录页
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('登出失败:', error);
    }
}

// 更新认证用户UI
function updateUIForAuthenticatedUser() {
    if (userName) {
        userName.textContent = currentUser.name;
    }
    
    if (loggedInDiv) {
        loggedInDiv.style.display = 'flex';
    }
    
    if (loggedOutDiv) {
        loggedOutDiv.style.display = 'none';
    }
    
    // 显示或隐藏用户管理链接（仅管理员可见）
    if (usersLink) {
        usersLink.style.display = currentUser.role === 'admin' ? 'block' : 'none';
    }
    
    // 隐藏登录提示
    if (authOverlay) {
        authOverlay.style.display = 'none';
    }
}

// 更新未认证用户UI
function updateUIForUnauthenticatedUser() {
    if (loggedInDiv) {
        loggedInDiv.style.display = 'none';
    }
    
    if (loggedOutDiv) {
        loggedOutDiv.style.display = 'flex';
    }
    
    // 显示登录提示
    if (authOverlay) {
        authOverlay.style.display = 'flex';
    }
}

// 加载仪表板数据
async function loadDashboardData() {
    // 只有在主页面上才加载
    if (!userCount || !productCount || !orderCount || !recentOrdersBody) {
        return;
    }
    
    Promise.all([
        fetchUserCount(),
        fetchProductCount(),
        fetchOrderCount(),
        fetchRecentOrders()
    ]).catch(error => {
        console.error('加载仪表板数据失败:', error);
    });
}

// 获取用户数量
async function fetchUserCount() {
    try {
        const response = await fetch('/api/users?limit=1');
        
        if (response.ok) {
            const data = await response.json();
            userCount.textContent = data.pagination.total || 0;
        }
    } catch (error) {
        console.error('获取用户数量失败:', error);
        userCount.textContent = '错误';
    }
}

// 获取产品数量
async function fetchProductCount() {
    try {
        const response = await fetch('/api/products?limit=1');
        
        if (response.ok) {
            const data = await response.json();
            productCount.textContent = data.pagination.total || 0;
        }
    } catch (error) {
        console.error('获取产品数量失败:', error);
        productCount.textContent = '错误';
    }
}

// 获取订单数量
async function fetchOrderCount() {
    try {
        const response = await fetch('/api/orders?limit=1');
        
        if (response.ok) {
            const data = await response.json();
            orderCount.textContent = data.pagination.total || 0;
        }
    } catch (error) {
        console.error('获取订单数量失败:', error);
        orderCount.textContent = '错误';
    }
}

// 获取最近订单
async function fetchRecentOrders() {
    try {
        const response = await fetch('/api/orders?limit=5');
        
        if (response.ok) {
            const data = await response.json();
            
            recentOrdersBody.innerHTML = '';
            
            if (data.orders.length === 0) {
                recentOrdersBody.innerHTML = '<tr><td colspan="5" class="empty-message">暂无订单数据</td></tr>';
                return;
            }
            
            data.orders.forEach(order => {
                const row = document.createElement('tr');
                
                // 格式化日期
                const createdDate = new Date(order.created_at);
                const formattedDate = createdDate.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
                
                // 格式化金额
                const formattedAmount = `¥${parseFloat(order.total_amount).toFixed(2)}`;
                
                // 获取状态中文
                const statusMap = {
                    'pending': '待处理',
                    'processing': '处理中',
                    'shipped': '已发货',
                    'delivered': '已送达',
                    'cancelled': '已取消'
                };
                
                const status = statusMap[order.status] || order.status;
                
                row.innerHTML = `
                    <td>#${order.id}</td>
                    <td>${order.user_name}</td>
                    <td>${formattedAmount}</td>
                    <td><span class="status status-${order.status}">${status}</span></td>
                    <td>${formattedDate}</td>
                `;
                
                recentOrdersBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('获取最近订单失败:', error);
        recentOrdersBody.innerHTML = '<tr><td colspan="5" class="empty-message">加载失败</td></tr>';
    }
} 