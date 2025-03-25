// DOM 元素
const productForm = document.getElementById('productForm');
const productFormContainer = document.getElementById('productFormContainer');
const productId = document.getElementById('productId');
const nameInput = document.getElementById('name');
const descriptionInput = document.getElementById('description');
const priceInput = document.getElementById('price');
const stockInput = document.getElementById('stock');
const productImageInput = document.getElementById('productImage');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const productTableBody = document.getElementById('productTableBody');
const productCountElement = document.getElementById('productCount');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const paginationElement = document.getElementById('pagination');

// 全局变量
let isEditing = false;
let products = [];
let currentPage = 1;
let totalPages = 1;
let searchKeyword = '';
let isAdmin = false;
let imageChanged = false;
let imageRemoved = false;
const ITEMS_PER_PAGE = 10;

// 事件监听器
document.addEventListener('DOMContentLoaded', initPage);
productForm.addEventListener('submit', saveProduct);
cancelBtn.addEventListener('click', cancelEdit);
searchBtn.addEventListener('click', handleSearch);
productImageInput.addEventListener('change', handleImageUpload);
removeImageBtn.addEventListener('click', removeImage);
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleSearch();
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
    if (!isAdmin) {
      productFormContainer.style.display = 'none';
    }
    
    // 加载产品数据
    fetchProducts();
  } catch (error) {
    console.error('初始化页面失败:', error);
    // 未登录或发生错误，显示认证遮罩
    authOverlay.style.display = 'flex';
  }
}

// 搜索产品
function handleSearch() {
  searchKeyword = searchInput.value.trim();
  currentPage = 1;
  fetchProducts();
}

// 获取产品列表
async function fetchProducts() {
  try {
    const url = `/api/products?page=${currentPage}&limit=${ITEMS_PER_PAGE}${searchKeyword ? `&search=${encodeURIComponent(searchKeyword)}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    
    const data = await response.json();
    
    products = data.products;
    totalPages = data.pagination.totalPages;
    productCountElement.textContent = data.pagination.total;
    
    renderProducts();
    renderPagination();
  } catch (error) {
    console.error('获取产品失败:', error);
    productTableBody.innerHTML = `<tr><td colspan="8" class="empty-message">获取产品数据失败: ${error.message}</td></tr>`;
  }
}

// 渲染产品列表
function renderProducts() {
  productTableBody.innerHTML = '';
  
  if (products.length === 0) {
    productTableBody.innerHTML = '<tr><td colspan="8" class="empty-message">没有找到产品数据</td></tr>';
    return;
  }
  
  products.forEach(product => {
    // 格式化日期
    const updatedDate = new Date(product.updated_at);
    const formattedDate = updatedDate.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // 格式化价格
    const formattedPrice = parseFloat(product.price).toFixed(2);
    
    // 产品图片
    const imageHtml = product.image_url 
      ? `<img src="${product.image_url}" alt="${product.name}" class="product-thumbnail" />`
      : '无图片';
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${product.id}</td>
      <td>${product.name}</td>
      <td><div class="product-description" title="${product.description || ''}">${product.description || '-'}</div></td>
      <td>${imageHtml}</td>
      <td>${formattedPrice}</td>
      <td>${product.stock}</td>
      <td>${formattedDate}</td>
      <td>
        ${isAdmin ? `
          <button class="action-btn edit-btn" data-id="${product.id}">编辑</button>
          <button class="action-btn delete-btn" data-id="${product.id}">删除</button>
        ` : ''}
      </td>
    `;
    
    productTableBody.appendChild(row);
  });
  
  // 如果是管理员，绑定编辑和删除按钮事件
  if (isAdmin) {
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => editProduct(btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });
  }
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
      fetchProducts();
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
        fetchProducts();
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
      fetchProducts();
    });
  }
  paginationElement.appendChild(nextBtn);
}

// 处理图片上传预览
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // 验证文件类型
  if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
    alert('只支持JPG和PNG格式的图片');
    productImageInput.value = '';
    return;
  }
  
  // 验证文件大小
  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过5MB');
    productImageInput.value = '';
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    imagePreview.src = e.target.result;
    imagePreviewContainer.style.display = 'block';
  };
  reader.readAsDataURL(file);
  
  imageChanged = true;
  imageRemoved = false;
}

// 移除图片
function removeImage() {
  imagePreview.src = '';
  imagePreviewContainer.style.display = 'none';
  productImageInput.value = '';
  imageChanged = true;
  imageRemoved = true;
}

// 保存产品（创建或更新）
async function saveProduct(event) {
  event.preventDefault();
  
  if (!isAdmin) {
    alert('只有管理员可以管理产品');
    return;
  }
  
  // 使用FormData以支持文件上传
  const formData = new FormData();
  formData.append('name', nameInput.value.trim());
  formData.append('description', descriptionInput.value.trim());
  formData.append('price', parseFloat(priceInput.value));
  formData.append('stock', parseInt(stockInput.value));
  
  // 处理图片上传
  if (productImageInput.files.length > 0) {
    formData.append('file', productImageInput.files[0]);
  }
  
  // 验证
  if (!nameInput.value.trim()) {
    alert('请输入产品名称');
    return;
  }
  
  if (isNaN(parseFloat(priceInput.value)) || parseFloat(priceInput.value) <= 0) {
    alert('请输入有效的价格');
    return;
  }
  
  if (isNaN(parseInt(stockInput.value)) || parseInt(stockInput.value) < 0) {
    alert('请输入有效的库存数量');
    return;
  }
  
  try {
    let response;
    
    if (isEditing) {
      // 更新产品
      response = await fetch(`/api/products/${productId.value}`, {
        method: 'PUT',
        body: formData
      });
    } else {
      // 创建新产品
      response = await fetch('/api/products', {
        method: 'POST',
        body: formData
      });
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '操作失败');
    }
    
    resetForm();
    fetchProducts();
    alert(`产品${isEditing ? '更新' : '创建'}成功`);
  } catch (error) {
    console.error(`${isEditing ? '更新' : '创建'}产品失败:`, error);
    alert(`${isEditing ? '更新' : '创建'}产品失败: ${error.message}`);
  }
}

// 编辑产品
async function editProduct(id) {
  try {
    const response = await fetch(`/api/products/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    
    const product = await response.json();
    
    // 填充表单
    productId.value = product.id;
    nameInput.value = product.name;
    descriptionInput.value = product.description || '';
    priceInput.value = parseFloat(product.price).toFixed(2);
    stockInput.value = product.stock;
    
    // 处理图片预览
    if (product.image_url) {
      imagePreview.src = product.image_url;
      imagePreviewContainer.style.display = 'block';
    } else {
      imagePreview.src = '';
      imagePreviewContainer.style.display = 'none';
    }
    
    // 重置图片状态
    imageChanged = false;
    imageRemoved = false;
    
    // 切换到编辑模式
    isEditing = true;
    saveBtn.textContent = '更新';
    
    // 滚动到表单
    productFormContainer.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('获取产品详情失败:', error);
    alert('获取产品详情失败: ' + error.message);
  }
}

// 删除产品
async function deleteProduct(id) {
  if (!isAdmin) {
    return;
  }
  
  if (!confirm('确定要删除这个产品吗？此操作不可撤销。')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP错误: ${response.status}`);
    }
    
    await fetchProducts();
    alert('产品删除成功！');
  } catch (error) {
    console.error('删除产品失败:', error);
    alert(`删除产品失败: ${error.message}`);
  }
}

// 取消编辑
function cancelEdit() {
  resetForm();
}

// 重置表单
function resetForm() {
  productForm.reset();
  productId.value = '';
  isEditing = false;
  saveBtn.textContent = '保存';
  
  // 重置图片预览
  imagePreview.src = '';
  imagePreviewContainer.style.display = 'none';
  
  // 重置图片状态
  imageChanged = false;
  imageRemoved = false;
} 