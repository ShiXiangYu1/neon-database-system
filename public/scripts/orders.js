// DOM 元素
const orderTableBody = document.getElementById('orderTableBody');
const orderCountElement = document.getElementById('orderCount');
const statusFilter = document.getElementById('statusFilter');
const filterBtn = document.getElementById('filterBtn');
const paginationElement = document.getElementById('pagination');
const newOrderBtn = document.getElementById('newOrderBtn');

// 订单详情弹窗
const orderDetailModal = document.getElementById('orderDetailModal');
const closeDetailModal = document.getElementById('closeDetailModal');
const orderDetailContent = document.getElementById('orderDetailContent');
const orderItemsTableBody = document.getElementById('orderItemsTableBody');
const adminActions = document.getElementById('adminActions');
const statusUpdate = document.getElementById('statusUpdate');
const updateStatusBtn = document.getElementById('updateStatusBtn');

// 新建订单弹窗
const newOrderModal = document.getElementById('newOrderModal');
const closeNewOrderModal = document.getElementById('closeNewOrderModal');
const newOrderForm = document.getElementById('newOrderForm');
const orderItemsList = document.getElementById('orderItemsList');
const productSelect = document.getElementById('productSelect');
const quantity = document.getElementById('quantity');
const addItemBtn = document.getElementById('addItemBtn');
const orderTotal = document.getElementById('orderTotal');
const saveOrderBtn = document.getElementById('saveOrderBtn');
const cancelOrderBtn = document.getElementById('cancelOrderBtn');

// 全局变量
let orders = [];
let currentPage = 1;
let totalPages = 1;
let currentStatus = '';
let currentOrderId = null;
let isAdmin = false;
let allProducts = [];
let orderItems = [];
const ITEMS_PER_PAGE = 10;
const statusMap = {
    'pending': '待处理',
    'processing': '处理中',
    'shipped': '已发货',
    'delivered': '已送达',
    'cancelled': '已取消'
};

// 事件监听器
document.addEventListener('DOMContentLoaded', initPage);
filterBtn.addEventListener('click', handleFilter);
closeDetailModal.addEventListener('click', () => orderDetailModal.style.display = 'none');
closeNewOrderModal.addEventListener('click', () => newOrderModal.style.display = 'none');
newOrderBtn.addEventListener('click', openNewOrderModal);
updateStatusBtn.addEventListener('click', updateOrderStatus);
addItemBtn.addEventListener('click', addItemToOrder);
newOrderForm.addEventListener('submit', submitOrder);
cancelOrderBtn.addEventListener('click', () => newOrderModal.style.display = 'none');

// 点击背景关闭弹窗
window.addEventListener('click', (event) => {
    if (event.target === orderDetailModal) {
        orderDetailModal.style.display = 'none';
    }
    if (event.target === newOrderModal) {
        newOrderModal.style.display = 'none';
    }
});

// 初始化页面
async function initPage() {
    try {
        // 检查用户登录状态
        const response = await fetch('/api/auth/me');
        
        if (!response.ok) {
            throw new Error('未登录');
        }
        
        const user = await response.json();
        isAdmin = user.role === 'admin';
        
        // 根据用户角色调整UI
        if (isAdmin) {
            // 管理员可以看到全部订单并修改状态
            adminActions.style.display = 'block';
        } else {
            // 普通用户只能看到自己的订单
            adminActions.style.display = 'none';
        }
        
        // 加载订单数据
        fetchOrders();
        
        // 如果弹窗打开，加载产品数据
        fetchProducts();
    } catch (error) {
        console.error('初始化页面失败:', error);
        // 未登录或发生错误，显示认证遮罩
        authOverlay.style.display = 'flex';
    }
}

// 筛选订单
function handleFilter() {
    currentStatus = statusFilter.value;
    currentPage = 1;
    fetchOrders();
}

// 获取订单列表
async function fetchOrders() {
    try {
        const url = `/api/orders?page=${currentPage}&limit=${ITEMS_PER_PAGE}${currentStatus ? `&status=${currentStatus}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        const data = await response.json();
        
        orders = data.orders;
        totalPages = data.pagination.totalPages;
        orderCountElement.textContent = data.pagination.total;
        
        renderOrders();
        renderPagination();
    } catch (error) {
        console.error('获取订单失败:', error);
        orderTableBody.innerHTML = `<tr><td colspan="6" class="empty-message">获取订单数据失败: ${error.message}</td></tr>`;
    }
}

// 获取产品列表（用于创建新订单）
async function fetchProducts() {
    try {
        const response = await fetch('/api/products?limit=100');
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        const data = await response.json();
        allProducts = data.products;
        
        // 更新产品选择下拉框
        renderProductOptions();
    } catch (error) {
        console.error('获取产品失败:', error);
    }
}

// 渲染产品选择下拉框
function renderProductOptions() {
    productSelect.innerHTML = '<option value="">请选择商品</option>';
    
    allProducts.forEach(product => {
        if (product.stock > 0) {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (¥${parseFloat(product.price).toFixed(2)}) - 库存: ${product.stock}`;
            option.dataset.price = product.price;
            option.dataset.stock = product.stock;
            option.dataset.name = product.name;
            productSelect.appendChild(option);
        }
    });
}

// 渲染订单列表
function renderOrders() {
    orderTableBody.innerHTML = '';
    
    if (orders.length === 0) {
        orderTableBody.innerHTML = '<tr><td colspan="6" class="empty-message">没有找到订单数据</td></tr>';
        return;
    }
    
    orders.forEach(order => {
        // 格式化日期
        const createdDate = new Date(order.created_at);
        const formattedDate = createdDate.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // 格式化金额
        const formattedAmount = `¥${parseFloat(order.total_amount).toFixed(2)}`;
        
        // 获取状态中文
        const status = statusMap[order.status] || order.status;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${order.id}</td>
            <td>${order.user_name}</td>
            <td>${formattedAmount}</td>
            <td><span class="status status-${order.status}">${status}</span></td>
            <td>${formattedDate}</td>
            <td>
                <button class="action-btn view-btn" data-id="${order.id}">查看详情</button>
            </td>
        `;
        
        orderTableBody.appendChild(row);
    });
    
    // 绑定查看详情按钮事件
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => viewOrderDetail(btn.dataset.id));
    });
}

// 渲染分页控件
function renderPagination() {
    paginationElement.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.classList.add('pagination-btn');
    prevBtn.textContent = '上一页';
    if (currentPage === 1) {
        prevBtn.classList.add('disabled');
    } else {
        prevBtn.addEventListener('click', () => {
            currentPage--;
            fetchOrders();
        });
    }
    paginationElement.appendChild(prevBtn);
    
    // 页码按钮
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.classList.add('pagination-btn');
        pageBtn.textContent = i;
        
        if (i === currentPage) {
            pageBtn.classList.add('active');
        } else {
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                fetchOrders();
            });
        }
        
        paginationElement.appendChild(pageBtn);
    }
    
    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.classList.add('pagination-btn');
    nextBtn.textContent = '下一页';
    if (currentPage === totalPages) {
        nextBtn.classList.add('disabled');
    } else {
        nextBtn.addEventListener('click', () => {
            currentPage++;
            fetchOrders();
        });
    }
    paginationElement.appendChild(nextBtn);
}

// 查看订单详情
async function viewOrderDetail(id) {
    try {
        currentOrderId = id;
        
        const response = await fetch(`/api/orders/${id}`);
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        const order = await response.json();
        
        // 更新订单详情内容
        document.getElementById('detail-id').textContent = order.id;
        document.getElementById('detail-customer').textContent = `${order.user_name} (${order.user_email})`;
        document.getElementById('detail-amount').textContent = `¥${parseFloat(order.total_amount).toFixed(2)}`;
        
        // 状态显示
        const statusSpan = document.createElement('span');
        statusSpan.classList.add('status', `status-${order.status}`);
        statusSpan.textContent = statusMap[order.status] || order.status;
        document.getElementById('detail-status').innerHTML = '';
        document.getElementById('detail-status').appendChild(statusSpan);
        
        // 时间格式化
        const createdDate = new Date(order.created_at);
        document.getElementById('detail-created').textContent = createdDate.toLocaleString('zh-CN');
        
        const updatedDate = new Date(order.updated_at);
        document.getElementById('detail-updated').textContent = updatedDate.toLocaleString('zh-CN');
        
        // 更新订单商品表格
        orderItemsTableBody.innerHTML = '';
        
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const row = document.createElement('tr');
                const subtotal = parseFloat(item.price) * item.quantity;
                
                row.innerHTML = `
                    <td>${item.product_id}</td>
                    <td>${item.product_name}</td>
                    <td>¥${parseFloat(item.price).toFixed(2)}</td>
                    <td>${item.quantity}</td>
                    <td>¥${subtotal.toFixed(2)}</td>
                `;
                
                orderItemsTableBody.appendChild(row);
            });
        } else {
            orderItemsTableBody.innerHTML = '<tr><td colspan="5" class="empty-message">没有商品数据</td></tr>';
        }
        
        // 更新状态选择框
        statusUpdate.value = order.status;
        
        // 根据角色显示或隐藏管理员操作区域
        adminActions.style.display = isAdmin ? 'block' : 'none';
        
        // 显示弹窗
        orderDetailModal.style.display = 'block';
    } catch (error) {
        console.error('获取订单详情失败:', error);
        alert(`获取订单详情失败: ${error.message}`);
    }
}

// 更新订单状态
async function updateOrderStatus() {
    if (!isAdmin || !currentOrderId) {
        return;
    }
    
    const newStatus = statusUpdate.value;
    
    try {
        const response = await fetch(`/api/orders/${currentOrderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP错误: ${response.status}`);
        }
        
        // 关闭弹窗并刷新订单列表
        orderDetailModal.style.display = 'none';
        await fetchOrders();
        
        alert('订单状态更新成功！');
    } catch (error) {
        console.error('更新订单状态失败:', error);
        alert(`更新订单状态失败: ${error.message}`);
    }
}

// 打开新建订单弹窗
function openNewOrderModal() {
    // 清空已选商品
    orderItems = [];
    renderOrderItems();
    
    // 重置表单
    newOrderForm.reset();
    orderTotal.textContent = '¥0.00';
    
    // 显示弹窗
    newOrderModal.style.display = 'block';
}

// 添加商品到订单
function addItemToOrder() {
    const productId = productSelect.value;
    
    if (!productId) {
        alert('请选择商品');
        return;
    }
    
    const quantityValue = parseInt(quantity.value);
    
    if (isNaN(quantityValue) || quantityValue <= 0) {
        alert('请输入有效的数量');
        return;
    }
    
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const price = parseFloat(selectedOption.dataset.price);
    const stock = parseInt(selectedOption.dataset.stock);
    const name = selectedOption.dataset.name;
    
    // 检查是否超过库存
    if (quantityValue > stock) {
        alert(`商品库存不足，当前库存: ${stock}`);
        return;
    }
    
    // 检查是否已经添加过同一商品
    const existingItemIndex = orderItems.findIndex(item => item.product_id == productId);
    
    if (existingItemIndex !== -1) {
        // 已存在，增加数量
        const newQuantity = orderItems[existingItemIndex].quantity + quantityValue;
        
        if (newQuantity > stock) {
            alert(`商品库存不足，当前库存: ${stock}`);
            return;
        }
        
        orderItems[existingItemIndex].quantity = newQuantity;
    } else {
        // 添加新商品
        orderItems.push({
            product_id: parseInt(productId),
            name: name,
            price: price,
            quantity: quantityValue
        });
    }
    
    // 更新UI
    renderOrderItems();
    updateOrderTotal();
    
    // 重置数量输入框
    quantity.value = 1;
}

// 渲染已选商品
function renderOrderItems() {
    orderItemsList.innerHTML = '';
    
    if (orderItems.length === 0) {
        orderItemsList.innerHTML = '<div class="empty-message">尚未添加商品</div>';
        return;
    }
    
    orderItems.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.classList.add('order-item');
        
        const subtotal = item.price * item.quantity;
        
        itemElement.innerHTML = `
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-details">
                    <span class="item-price">单价: ¥${item.price.toFixed(2)}</span>
                    <span class="item-quantity">数量: ${item.quantity}</span>
                    <span class="item-total">小计: ¥${subtotal.toFixed(2)}</span>
                </div>
            </div>
            <div class="remove-item" data-index="${index}">×</div>
        `;
        
        orderItemsList.appendChild(itemElement);
    });
    
    // 绑定删除按钮事件
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            orderItems.splice(index, 1);
            renderOrderItems();
            updateOrderTotal();
        });
    });
}

// 更新订单总金额
function updateOrderTotal() {
    let total = 0;
    
    orderItems.forEach(item => {
        total += item.price * item.quantity;
    });
    
    orderTotal.textContent = `¥${total.toFixed(2)}`;
}

// 提交订单
async function submitOrder(event) {
    event.preventDefault();
    
    if (orderItems.length === 0) {
        alert('请添加至少一个商品');
        return;
    }
    
    // 准备请求数据
    const orderData = {
        items: orderItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
        }))
    };
    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP错误: ${response.status}`);
        }
        
        // 关闭弹窗并刷新订单列表
        newOrderModal.style.display = 'none';
        await fetchOrders();
        
        // 刷新产品数据（因为库存已更新）
        await fetchProducts();
        
        alert('订单创建成功！');
    } catch (error) {
        console.error('创建订单失败:', error);
        alert(`创建订单失败: ${error.message}`);
    }
} 