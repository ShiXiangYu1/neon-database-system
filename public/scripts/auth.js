// 获取API基础URL
const getApiBaseUrl = () => {
  // 默认使用相对路径（开发环境）
  let baseUrl = '';
  
  // 在生产环境，使用当前域名（Vercel部署）
  if (window.location.hostname !== 'localhost') {
    baseUrl = window.location.origin;
  }
  
  return `${baseUrl}/api`;
};

// API基础URL
const API_BASE_URL = getApiBaseUrl();

// 获取当前页面类型
const isLoginPage = window.location.pathname.includes('login');
const isRegisterPage = window.location.pathname.includes('register');

// 检查用户是否已登录
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`);
        
        if (response.ok) {
            // 用户已登录，重定向到主页
            window.location.href = '/';
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
    }
});

// 登录表单处理
if (isLoginPage) {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        loginError.textContent = '';
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // 简单验证
        if (!email || !password) {
            loginError.textContent = '请填写邮箱和密码';
            return;
        }
        
        try {
            console.log(`正在发送登录请求至: ${API_BASE_URL}/auth/login`);
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                loginError.textContent = data.error || '登录失败';
                return;
            }
            
            // 登录成功，重定向到首页
            window.location.href = '/';
        } catch (error) {
            console.error('登录请求失败:', error);
            loginError.textContent = '登录请求失败，请稍后再试';
        }
    });
}

// 注册表单处理
if (isRegisterPage) {
    const registerForm = document.getElementById('registerForm');
    const registerError = document.getElementById('registerError');
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        registerError.textContent = '';
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // 验证
        if (!name || !email || !password || !confirmPassword) {
            registerError.textContent = '请填写所有字段';
            return;
        }
        
        if (password !== confirmPassword) {
            registerError.textContent = '两次输入的密码不一致';
            return;
        }
        
        if (password.length < 6) {
            registerError.textContent = '密码长度不能少于6个字符';
            return;
        }
        
        try {
            console.log(`正在发送注册请求至: ${API_BASE_URL}/auth/register`);
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                registerError.textContent = data.error || '注册失败';
                return;
            }
            
            // 注册成功，重定向到首页
            window.location.href = '/';
        } catch (error) {
            console.error('注册请求失败:', error);
            registerError.textContent = '注册请求失败，请稍后再试';
        }
    });
} 