// 文件管理模块

// DOM元素
const loadingIndicator = document.getElementById('loadingIndicator');
const singleFileUploadForm = document.getElementById('singleFileUploadForm');
const uploadProgressContainer = document.querySelector('.upload-progress');
const progressFill = document.querySelector('.progress-fill');
const progressText = document.querySelector('.progress-text');
const uploadMessage = document.getElementById('uploadMessage');
const fileSearchInput = document.getElementById('fileSearch');
const categoryFilter = document.getElementById('categoryFilter');
const searchBtn = document.getElementById('searchBtn');
const filesTable = document.getElementById('filesTable');
const filesPagination = document.getElementById('filesPagination');
const filePreviewModal = document.getElementById('filePreviewModal');
const editFileModal = document.getElementById('editFileModal');
const editFileForm = document.getElementById('editFileForm');
const saveFileChangesBtn = document.getElementById('saveFileChangesBtn');

// 状态变量
let currentPage = 1;
let filesPerPage = 10;
let currentCategory = '';
let currentSearchTerm = '';
let currentFile = null;

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    
    // 监听事件
    singleFileUploadForm.addEventListener('submit', handleFileUpload);
    categoryFilter.addEventListener('change', handleCategoryFilter);
    searchBtn.addEventListener('click', handleSearch);
    fileSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    // 模态框关闭按钮
    document.querySelectorAll('.modal .close, .modal .modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            filePreviewModal.style.display = 'none';
            editFileModal.style.display = 'none';
        });
    });
    
    // 修改文件信息按钮
    document.getElementById('editFileBtn').addEventListener('click', openEditFileModal);
    saveFileChangesBtn.addEventListener('click', saveFileChanges);
    
    // 删除文件按钮
    document.getElementById('deleteFileBtn').addEventListener('click', handleDeleteFile);
    
    // 加载文件列表
    loadFiles();
    
    // 更新当前用户信息
    updateCurrentUserDisplay();
});

// 加载文件列表
async function loadFiles() {
    showLoading();
    
    try {
        // 构建查询参数
        let queryParams = `page=${currentPage}&limit=${filesPerPage}`;
        if (currentCategory) {
            queryParams += `&category=${currentCategory}`;
        }
        
        const response = await fetch(`/api/files?${queryParams}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取文件列表失败');
        }
        
        const data = await response.json();
        renderFilesList(data.files);
        renderPagination(data.pagination);
    } catch (error) {
        console.error('加载文件列表错误:', error);
        uploadMessage.textContent = error.message;
        uploadMessage.className = 'message error';
    } finally {
        hideLoading();
    }
}

// 渲染文件列表
function renderFilesList(files) {
    const tbody = filesTable.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (files.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="8" class="empty-message">没有找到文件记录</td>';
        tbody.appendChild(tr);
        return;
    }
    
    files.forEach(file => {
        const tr = document.createElement('tr');
        
        // 格式化文件大小
        const formattedSize = formatFileSize(file.size);
        
        // 确定文件类型分类
        const fileTypeClass = getFileTypeClass(file.mimetype);
        const fileTypeName = getFileTypeName(file.mimetype);
        
        // 格式化日期
        const formattedDate = new Date(file.created_at).toLocaleString('zh-CN');
        
        // 文件分类样式
        const categoryClass = file.category ? `file-category-${file.category}` : 'file-category-other';
        const categoryName = getCategoryName(file.category);
        
        tr.innerHTML = `
            <td>${file.id}</td>
            <td title="${file.original_name}">${truncateString(file.original_name, 30)}</td>
            <td>${formattedSize}</td>
            <td><span class="file-type-tag ${fileTypeClass}">${fileTypeName}</span></td>
            <td><span class="file-category ${categoryClass}">${categoryName}</span></td>
            <td>${file.user_name || '未知'}</td>
            <td>${formattedDate}</td>
            <td class="file-actions">
                <button class="action-btn view" title="查看" data-id="${file.id}"><span>👁️</span></button>
                <button class="action-btn download" title="下载" data-id="${file.id}"><span>⬇️</span></button>
                <button class="action-btn delete" title="删除" data-id="${file.id}"><span>🗑️</span></button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // 添加事件监听器
    tbody.querySelectorAll('.action-btn.view').forEach(btn => {
        btn.addEventListener('click', () => openFilePreview(parseInt(btn.dataset.id)));
    });
    
    tbody.querySelectorAll('.action-btn.download').forEach(btn => {
        btn.addEventListener('click', () => downloadFile(parseInt(btn.dataset.id)));
    });
    
    tbody.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', () => confirmDeleteFile(parseInt(btn.dataset.id)));
    });
}

// 渲染分页控件
function renderPagination(pagination) {
    filesPagination.innerHTML = '';
    
    if (!pagination || pagination.total === 0) return;
    
    const totalPages = pagination.pages;
    
    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.innerText = '上一页';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadFiles();
        }
    });
    filesPagination.appendChild(prevBtn);
    
    // 页码按钮
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4 && totalPages > 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.innerText = i;
        pageBtn.classList.toggle('active', i === currentPage);
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            loadFiles();
        });
        filesPagination.appendChild(pageBtn);
    }
    
    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.innerText = '下一页';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadFiles();
        }
    });
    filesPagination.appendChild(nextBtn);
}

// 处理文件上传
async function handleFileUpload(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('file');
    if (!fileInput.files.length) {
        uploadMessage.textContent = '请选择要上传的文件';
        uploadMessage.className = 'message error';
        return;
    }
    
    const file = fileInput.files[0];
    if (file.size > 10 * 1024 * 1024) { // 10MB限制
        uploadMessage.textContent = '文件大小不能超过10MB';
        uploadMessage.className = 'message error';
        return;
    }
    
    // 显示上传进度条
    uploadProgressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
    
    const formData = new FormData(singleFileUploadForm);
    
    try {
        // 使用XMLHttpRequest以便监控上传进度
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                progressFill.style.width = percentComplete + '%';
                progressText.textContent = percentComplete + '%';
            }
        });
        
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                uploadMessage.textContent = '文件上传成功';
                uploadMessage.className = 'message success';
                singleFileUploadForm.reset();
                
                // 重新加载文件列表
                loadFiles();
            } else {
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    uploadMessage.textContent = errorResponse.error || '文件上传失败';
                } catch (e) {
                    uploadMessage.textContent = '文件上传失败';
                }
                uploadMessage.className = 'message error';
            }
            
            // 隐藏进度条
            setTimeout(() => {
                uploadProgressContainer.style.display = 'none';
            }, 1000);
        };
        
        xhr.onerror = function() {
            uploadMessage.textContent = '网络错误，文件上传失败';
            uploadMessage.className = 'message error';
            uploadProgressContainer.style.display = 'none';
        };
        
        xhr.open('POST', '/api/files/upload', true);
        xhr.send(formData);
        
    } catch (error) {
        console.error('文件上传错误:', error);
        uploadMessage.textContent = error.message;
        uploadMessage.className = 'message error';
        uploadProgressContainer.style.display = 'none';
    }
}

// 处理分类筛选
function handleCategoryFilter() {
    currentCategory = categoryFilter.value;
    currentPage = 1; // 重置到第一页
    loadFiles();
}

// 处理搜索
function handleSearch() {
    currentSearchTerm = fileSearchInput.value.trim();
    currentPage = 1; // 重置到第一页
    loadFiles();
}

// 打开文件预览模态框
async function openFilePreview(fileId) {
    showLoading();
    
    try {
        const response = await fetch(`/api/files/${fileId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取文件信息失败');
        }
        
        const file = await response.json();
        currentFile = file;
        
        // 填充文件信息
        document.getElementById('previewFileName').textContent = file.original_name;
        document.getElementById('previewFileId').textContent = file.id;
        document.getElementById('previewOriginalName').textContent = file.original_name;
        document.getElementById('previewFileSize').textContent = formatFileSize(file.size);
        document.getElementById('previewFileMime').textContent = file.mimetype;
        document.getElementById('previewFileDate').textContent = new Date(file.created_at).toLocaleString('zh-CN');
        document.getElementById('previewFileDesc').textContent = file.description || '无描述';
        
        // 设置下载按钮
        document.getElementById('downloadFileBtn').href = `/api/files/${file.id}/download`;
        
        // 渲染预览内容
        const previewContainer = document.getElementById('filePreview');
        renderFilePreview(previewContainer, file);
        
        // 显示模态框
        filePreviewModal.style.display = 'block';
    } catch (error) {
        console.error('打开文件预览错误:', error);
        alert(error.message);
    } finally {
        hideLoading();
    }
}

// 渲染文件预览
function renderFilePreview(container, file) {
    container.innerHTML = '';
    
    if (file.mimetype.startsWith('image/')) {
        // 图片预览
        const img = document.createElement('img');
        img.src = `/api/files/${file.id}/download`;
        img.alt = file.original_name;
        container.appendChild(img);
    } else if (file.mimetype === 'application/pdf') {
        // PDF预览
        const pdfContainer = document.createElement('div');
        pdfContainer.className = 'pdf-container';
        
        const pdfObject = document.createElement('object');
        pdfObject.data = `/api/files/${file.id}/download`;
        pdfObject.type = 'application/pdf';
        
        const fallbackLink = document.createElement('p');
        fallbackLink.innerHTML = '您的浏览器不支持PDF预览，请 <a href="/api/files/${file.id}/download" target="_blank">点击此处</a> 下载查看。';
        
        pdfObject.appendChild(fallbackLink);
        pdfContainer.appendChild(pdfObject);
        container.appendChild(pdfContainer);
    } else if (file.mimetype === 'text/plain') {
        // 文本文件预览
        fetch(`/api/files/${file.id}/download`)
            .then(response => response.text())
            .then(text => {
                const textPreview = document.createElement('div');
                textPreview.className = 'text-preview';
                textPreview.textContent = text;
                container.appendChild(textPreview);
            })
            .catch(error => {
                console.error('加载文本预览失败:', error);
                renderNonPreviewableFile(container, file);
            });
    } else {
        // 不支持预览的文件类型
        renderNonPreviewableFile(container, file);
    }
}

// 渲染不可预览的文件
function renderNonPreviewableFile(container, file) {
    const nonPreviewable = document.createElement('div');
    nonPreviewable.className = 'non-previewable';
    
    const icon = document.createElement('div');
    icon.className = 'file-icon';
    icon.textContent = getFileIcon(file.mimetype);
    
    const message = document.createElement('p');
    message.textContent = '此文件类型不支持预览';
    
    const downloadLink = document.createElement('a');
    downloadLink.href = `/api/files/${file.id}/download`;
    downloadLink.className = 'btn-primary';
    downloadLink.textContent = '下载文件查看';
    
    nonPreviewable.appendChild(icon);
    nonPreviewable.appendChild(message);
    nonPreviewable.appendChild(downloadLink);
    
    container.appendChild(nonPreviewable);
}

// 下载文件
function downloadFile(fileId) {
    window.location.href = `/api/files/${fileId}/download`;
}

// 确认删除文件
function confirmDeleteFile(fileId) {
    if (confirm('确定要删除此文件吗？此操作不可逆。')) {
        handleDeleteFile(fileId);
    }
}

// 处理删除文件
async function handleDeleteFile(fileId) {
    const id = typeof fileId === 'number' ? fileId : currentFile.id;
    
    showLoading();
    
    try {
        const response = await fetch(`/api/files/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('删除文件失败');
        }
        
        // 隐藏模态框
        filePreviewModal.style.display = 'none';
        
        // 重新加载文件列表
        loadFiles();
        
        // 显示成功消息
        uploadMessage.textContent = '文件已成功删除';
        uploadMessage.className = 'message success';
    } catch (error) {
        console.error('删除文件错误:', error);
        uploadMessage.textContent = error.message;
        uploadMessage.className = 'message error';
    } finally {
        hideLoading();
    }
}

// 打开编辑文件信息模态框
function openEditFileModal() {
    if (!currentFile) return;
    
    // 填充表单
    document.getElementById('editFileId').value = currentFile.id;
    document.getElementById('editFileCategory').value = currentFile.category || '';
    document.getElementById('editFileDescription').value = currentFile.description || '';
    document.getElementById('editRelatedId').value = currentFile.related_id || '';
    
    // 显示模态框
    editFileModal.style.display = 'block';
}

// 保存文件信息修改
async function saveFileChanges() {
    const fileId = document.getElementById('editFileId').value;
    
    const fileData = {
        category: document.getElementById('editFileCategory').value,
        description: document.getElementById('editFileDescription').value,
        related_id: document.getElementById('editRelatedId').value || null
    };
    
    showLoading();
    
    try {
        const response = await fetch(`/api/files/${fileId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fileData)
        });
        
        if (!response.ok) {
            throw new Error('更新文件信息失败');
        }
        
        // 隐藏模态框
        editFileModal.style.display = 'none';
        
        // 重新加载文件列表并更新当前文件预览
        await loadFiles();
        openFilePreview(parseInt(fileId));
        
        // 显示成功消息
        uploadMessage.textContent = '文件信息已成功更新';
        uploadMessage.className = 'message success';
    } catch (error) {
        console.error('更新文件信息错误:', error);
        uploadMessage.textContent = error.message;
        uploadMessage.className = 'message error';
    } finally {
        hideLoading();
    }
}

// 辅助函数 - 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 辅助函数 - 获取文件类型分类
function getFileTypeClass(mimetype) {
    if (mimetype.startsWith('image/')) return 'file-type-image';
    if (mimetype === 'application/pdf' || mimetype.includes('word')) return 'file-type-document';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'file-type-spreadsheet';
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('compressed')) return 'file-type-archive';
    if (mimetype === 'text/plain') return 'file-type-text';
    return 'file-type-other';
}

// 辅助函数 - 获取文件类型名称
function getFileTypeName(mimetype) {
    if (mimetype.startsWith('image/')) return '图片';
    if (mimetype === 'application/pdf') return 'PDF';
    if (mimetype.includes('word')) return 'WORD';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'EXCEL';
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('compressed')) return '压缩包';
    if (mimetype === 'text/plain') return '文本';
    
    // 从MIME类型提取格式
    const format = mimetype.split('/')[1];
    return format ? format.toUpperCase() : '其他';
}

// 辅助函数 - 获取文件分类名称
function getCategoryName(category) {
    if (!category) return '其他';
    
    const categories = {
        'product': '商品相关',
        'order': '订单相关',
        'user': '用户相关',
        'document': '文档',
        'other': '其他'
    };
    
    return categories[category] || category;
}

// 辅助函数 - 获取文件图标
function getFileIcon(mimetype) {
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype === 'application/pdf') return '📄';
    if (mimetype.includes('word')) return '📝';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('compressed')) return '🗜️';
    if (mimetype === 'text/plain') return '📃';
    return '📦';
}

// 辅助函数 - 截断字符串
function truncateString(str, maxLength) {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

// 显示加载状态
function showLoading() {
    loadingIndicator.style.display = 'flex';
}

// 隐藏加载状态
function hideLoading() {
    loadingIndicator.style.display = 'none';
}

// 更新当前用户显示
function updateCurrentUserDisplay() {
    const currentUserElement = document.getElementById('currentUser');
    if (currentUserElement) {
        if (window.currentUser) {
            currentUserElement.textContent = window.currentUser.name || window.currentUser.email;
        } else {
            currentUserElement.textContent = '未登录';
        }
    }
} 