// DOM 元素
const userForm = document.getElementById('userForm');
const userId = document.getElementById('userId');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const roleInput = document.getElementById('role');
const roleGroup = document.getElementById('roleGroup');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const userTableBody = document.getElementById('userTableBody');
const userCountElement = document.getElementById('userCount');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const paginationElement = document.getElementById('pagination');

// 全局变量
let isEditing = false;
let users = [];
let currentPage = 1;
let totalPages = 1;
let searchKeyword = '';
const ITEMS_PER_PAGE = 10;

// 事件监听器
document.addEventListener('DOMContentLoaded', initPage);
userForm.addEventListener('submit', saveUser);
cancelBtn.addEventListener('click', cancelEdit);
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleSearch();
  }
});

// 初始化页面
async function initPage() {
  try {
    // 检查用户权限
    const response = await fetch('/api/auth/me');
    
    if (!response.ok) {
      throw new Error('未登录');
    }
    
    const user = await response.json();
    
    // 只有管理员可以访问用户管理页面
    if (user.role !== 'admin') {
      authOverlay.style.display = 'flex';
      return;
    }
    
    // 加载用户数据
    fetchUsers();
  } catch (error) {
    console.error('初始化页面失败:', error);
    // 未登录或发生错误，显示认证遮罩
    authOverlay.style.display = 'flex';
  }
}

// 搜索用户
function handleSearch() {
  searchKeyword = searchInput.value.trim();
  currentPage = 1;
  fetchUsers();
}

// 获取用户列表
async function fetchUsers() {
  try {
    const url = `/api/users?page=${currentPage}&limit=${ITEMS_PER_PAGE}${searchKeyword ? `&search=${encodeURIComponent(searchKeyword)}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    
    const data = await response.json();
    
    users = data.users;
    totalPages = data.pagination.totalPages;
    userCountElement.textContent = data.pagination.total;
    
    renderUsers();
    renderPagination();
  } catch (error) {
    console.error('获取用户失败:', error);
    userTableBody.innerHTML = `<tr><td colspan="6" class="empty-message">获取用户数据失败: ${error.message}</td></tr>`;
  }
}

// 渲染用户列表
function renderUsers() {
  userTableBody.innerHTML = '';
  
  if (users.length === 0) {
    userTableBody.innerHTML = '<tr><td colspan="6" class="empty-message">没有找到用户数据</td></tr>';
    return;
  }
  
  users.forEach(user => {
    // 格式化日期
    const createdDate = new Date(user.created_at);
    const formattedDate = createdDate.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // 角色显示
    const roleDisplay = user.role === 'admin' ? '管理员' : '普通用户';
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.id}</td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${roleDisplay}</td>
      <td>${formattedDate}</td>
      <td>
        <button class="action-btn edit-btn" data-id="${user.id}">编辑</button>
        <button class="action-btn delete-btn" data-id="${user.id}">删除</button>
      </td>
    `;
    
    userTableBody.appendChild(row);
  });
  
  // 绑定编辑和删除按钮事件
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editUser(btn.dataset.id));
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteUser(btn.dataset.id));
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
      fetchUsers();
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
        fetchUsers();
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
      fetchUsers();
    });
  }
  paginationElement.appendChild(nextBtn);
}

// 保存用户（创建或更新）
async function saveUser(event) {
  event.preventDefault();
  
  const userData = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim()
  };
  
  // 如果填写了密码（编辑时密码是可选的）
  if (passwordInput.value.trim()) {
    userData.password = passwordInput.value.trim();
  }
  
  // 如果是管理员，则可以设置角色
  userData.role = roleInput.value;
  
  try {
    let response;
    
    if (isEditing) {
      // 更新用户
      response = await fetch(`/api/users/${userId.value}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
    } else {
      // 创建新用户
      response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP错误: ${response.status}`);
    }
    
    // 重置表单并刷新用户列表
    resetForm();
    await fetchUsers();
    
    alert(isEditing ? '用户更新成功！' : '用户创建成功！');
  } catch (error) {
    console.error('保存用户失败:', error);
    alert(`保存用户失败: ${error.message}`);
  }
}

// 编辑用户
function editUser(id) {
  const user = users.find(u => u.id == id);
  
  if (user) {
    userId.value = user.id;
    nameInput.value = user.name;
    emailInput.value = user.email;
    passwordInput.value = ''; // 密码不会被返回
    roleInput.value = user.role;
    
    isEditing = true;
    saveBtn.textContent = '更新';
    document.querySelector('.user-form h2').textContent = '编辑用户';
    
    // 滚动到表单
    userForm.scrollIntoView({ behavior: 'smooth' });
  }
}

// 删除用户
async function deleteUser(id) {
  if (!confirm('确定要删除这个用户吗？此操作不可撤销。')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/users/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP错误: ${response.status}`);
    }
    
    await fetchUsers();
    alert('用户删除成功！');
  } catch (error) {
    console.error('删除用户失败:', error);
    alert(`删除用户失败: ${error.message}`);
  }
}

// 取消编辑
function cancelEdit() {
  resetForm();
}

// 重置表单
function resetForm() {
  userForm.reset();
  userId.value = '';
  isEditing = false;
  saveBtn.textContent = '保存';
  document.querySelector('.user-form h2').textContent = '添加/编辑用户';
} 