// DOM 元素
const userForm = document.getElementById('userForm');
const userId = document.getElementById('userId');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const userTableBody = document.getElementById('userTableBody');
const userCount = document.getElementById('userCount');

// 全局变量
let isEditing = false;
let users = [];

// 事件监听器
document.addEventListener('DOMContentLoaded', fetchUsers);
userForm.addEventListener('submit', saveUser);
cancelBtn.addEventListener('click', cancelEdit);

// 获取所有用户
async function fetchUsers() {
    try {
        const response = await fetch('/api/users');
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        users = await response.json();
        renderUsers();
    } catch (error) {
        console.error('获取用户失败:', error);
        alert('获取用户数据失败，请查看控制台了解详情。');
    }
}

// 渲染用户列表
function renderUsers() {
    userTableBody.innerHTML = '';
    userCount.textContent = users.length;
    
    if (users.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" style="text-align: center;">暂无用户数据</td>';
        userTableBody.appendChild(row);
        return;
    }
    
    users.forEach(user => {
        const row = document.createElement('tr');
        
        // 格式化日期
        const createdDate = new Date(user.created_at);
        const formattedDate = createdDate.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
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

// 保存用户（创建或更新）
async function saveUser(event) {
    event.preventDefault();
    
    const userData = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim()
    };
    
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
        
        isEditing = true;
        saveBtn.textContent = '更新';
        document.querySelector('.user-form h2').textContent = '编辑用户';
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
            throw new Error(`HTTP错误: ${response.status}`);
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