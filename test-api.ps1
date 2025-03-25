# Neon数据库API测试脚本
Write-Host "开始API测试..." -ForegroundColor Green

$baseUrl = "http://localhost:3000/api"
$authToken = ""

function Test-StatusCode {
    param (
        [Parameter(Mandatory = $true)]
        [Microsoft.PowerShell.Commands.WebResponseObject]
        $Response,
        
        [Parameter(Mandatory = $true)]
        [string]
        $TestName
    )
    
    if ($Response.StatusCode -ge 200 -and $Response.StatusCode -lt 300) {
        Write-Host "✅ $TestName - 状态码: $($Response.StatusCode)" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $TestName - 状态码: $($Response.StatusCode)" -ForegroundColor Red
        Write-Host "  响应内容: $($Response.Content)" -ForegroundColor Red
        return $false
    }
}

# 认证测试
Write-Host "`n测试 认证模块..." -ForegroundColor Yellow

# 1. 测试登录
try {
    $loginBody = @{
        email = "admin@example.com"
        password = "admin123"
    } | ConvertTo-Json

    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -SessionVariable session
    
    $success = Test-StatusCode -Response $loginResponse -TestName "管理员登录"
    if ($success) {
        $responseData = $loginResponse.Content | ConvertFrom-Json
        Write-Host "  用户: $($responseData.name), 角色: $($responseData.role)" -ForegroundColor Cyan
        
        # 保存Cookie用于后续请求
        $authCookie = $session.Cookies.GetCookies($baseUrl) | Where-Object { $_.Name -eq "authToken" }
        if ($authCookie) {
            Write-Host "  成功获取认证Cookie" -ForegroundColor Cyan
            $authToken = $authCookie.Value
        }
    }
} catch {
    Write-Host "❌ 管理员登录失败: $_" -ForegroundColor Red
}

# 2. 测试获取当前用户信息
try {
    $meResponse = Invoke-WebRequest -Uri "$baseUrl/auth/me" -Method Get -WebSession $session
    Test-StatusCode -Response $meResponse -TestName "获取当前用户信息"
    
    $userData = $meResponse.Content | ConvertFrom-Json
    Write-Host "  当前用户: $($userData.name), 邮箱: $($userData.email), 角色: $($userData.role)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 获取当前用户信息失败: $_" -ForegroundColor Red
}

# 产品API测试
Write-Host "`n测试 产品模块..." -ForegroundColor Yellow

# 3. 获取所有产品
try {
    $productsResponse = Invoke-WebRequest -Uri "$baseUrl/products?page=1&limit=10" -Method Get -WebSession $session
    Test-StatusCode -Response $productsResponse -TestName "获取产品列表"
    
    $productsData = $productsResponse.Content | ConvertFrom-Json
    $productCount = $productsData.pagination.total
    Write-Host "  总共 $productCount 个产品" -ForegroundColor Cyan
    
    if ($productsData.products.Length -gt 0) {
        Write-Host "  第一个产品: $($productsData.products[0].name), 价格: $($productsData.products[0].price)" -ForegroundColor Cyan
        $firstProductId = $productsData.products[0].id
    }
} catch {
    Write-Host "❌ 获取产品列表失败: $_" -ForegroundColor Red
}

# 4. 创建产品
try {
    $newProduct = @{
        name = "测试产品 $(Get-Date -Format 'yyyyMMddHHmmss')"
        description = "这是一个API测试创建的产品"
        price = 99.99
        stock = 100
    } | ConvertTo-Json
    
    $createProductResponse = Invoke-WebRequest -Uri "$baseUrl/products" -Method Post -Body $newProduct -ContentType "application/json" -WebSession $session
    Test-StatusCode -Response $createProductResponse -TestName "创建新产品"
    
    $createdProduct = $createProductResponse.Content | ConvertFrom-Json
    Write-Host "  创建的产品: $($createdProduct.name), ID: $($createdProduct.id)" -ForegroundColor Cyan
    $newProductId = $createdProduct.id
} catch {
    Write-Host "❌ 创建产品失败: $_" -ForegroundColor Red
}

# 5. 获取单个产品
if ($newProductId) {
    try {
        $productDetailResponse = Invoke-WebRequest -Uri "$baseUrl/products/$newProductId" -Method Get -WebSession $session
        Test-StatusCode -Response $productDetailResponse -TestName "获取产品详情"
        
        $productDetail = $productDetailResponse.Content | ConvertFrom-Json
        Write-Host "  产品详情: $($productDetail.name), 价格: $($productDetail.price), 库存: $($productDetail.stock)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ 获取产品详情失败: $_" -ForegroundColor Red
    }
}

# 6. 更新产品
if ($newProductId) {
    try {
        $updateProduct = @{
            name = "更新后的测试产品"
            price = 199.99
            stock = 50
        } | ConvertTo-Json
        
        $updateProductResponse = Invoke-WebRequest -Uri "$baseUrl/products/$newProductId" -Method Put -Body $updateProduct -ContentType "application/json" -WebSession $session
        Test-StatusCode -Response $updateProductResponse -TestName "更新产品"
        
        $updatedProduct = $updateProductResponse.Content | ConvertFrom-Json
        Write-Host "  更新后的产品: $($updatedProduct.name), 价格: $($updatedProduct.price), 库存: $($updatedProduct.stock)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ 更新产品失败: $_" -ForegroundColor Red
    }
}

# 订单API测试
Write-Host "`n测试 订单模块..." -ForegroundColor Yellow

# 7. 获取所有订单
try {
    $ordersResponse = Invoke-WebRequest -Uri "$baseUrl/orders?page=1&limit=10" -Method Get -WebSession $session
    Test-StatusCode -Response $ordersResponse -TestName "获取订单列表"
    
    $ordersData = $ordersResponse.Content | ConvertFrom-Json
    $orderCount = $ordersData.pagination.total
    Write-Host "  总共 $orderCount 个订单" -ForegroundColor Cyan
    
    if ($ordersData.orders.Length -gt 0) {
        Write-Host "  第一个订单: ID: $($ordersData.orders[0].id), 金额: $($ordersData.orders[0].total_amount), 状态: $($ordersData.orders[0].status)" -ForegroundColor Cyan
        $firstOrderId = $ordersData.orders[0].id
    }
} catch {
    Write-Host "❌ 获取订单列表失败: $_" -ForegroundColor Red
}

# 8. 创建订单（需要产品和用户）
if ($newProductId) {
    try {
        $newOrder = @{
            items = @(
                @{
                    product_id = $newProductId
                    quantity = 2
                }
            )
        } | ConvertTo-Json
        
        $createOrderResponse = Invoke-WebRequest -Uri "$baseUrl/orders" -Method Post -Body $newOrder -ContentType "application/json" -WebSession $session
        Test-StatusCode -Response $createOrderResponse -TestName "创建新订单"
        
        $createdOrder = $createOrderResponse.Content | ConvertFrom-Json
        Write-Host "  创建的订单: ID: $($createdOrder.id), 金额: $($createdOrder.total_amount), 状态: $($createdOrder.status)" -ForegroundColor Cyan
        $newOrderId = $createdOrder.id
    } catch {
        Write-Host "❌ 创建订单失败: $_" -ForegroundColor Red
    }
}

# 9. 获取订单详情
if ($newOrderId) {
    try {
        $orderDetailResponse = Invoke-WebRequest -Uri "$baseUrl/orders/$newOrderId" -Method Get -WebSession $session
        Test-StatusCode -Response $orderDetailResponse -TestName "获取订单详情"
        
        $orderDetail = $orderDetailResponse.Content | ConvertFrom-Json
        Write-Host "  订单详情: ID: $($orderDetail.id), 金额: $($orderDetail.total_amount), 状态: $($orderDetail.status)" -ForegroundColor Cyan
        Write-Host "  包含的产品数量: $($orderDetail.items.Length)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ 获取订单详情失败: $_" -ForegroundColor Red
    }
}

# 10. 更新订单状态
if ($newOrderId) {
    try {
        $updateStatus = @{
            status = "completed"
        } | ConvertTo-Json
        
        $updateStatusResponse = Invoke-WebRequest -Uri "$baseUrl/orders/$newOrderId/status" -Method Patch -Body $updateStatus -ContentType "application/json" -WebSession $session
        Test-StatusCode -Response $updateStatusResponse -TestName "更新订单状态"
        
        $updatedOrder = $updateStatusResponse.Content | ConvertFrom-Json
        Write-Host "  更新后的订单状态: $($updatedOrder.status)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ 更新订单状态失败: $_" -ForegroundColor Red
    }
}

# 报表API测试
Write-Host "`n测试 报表模块..." -ForegroundColor Yellow

# 11. 获取销售概览
try {
    $salesOverviewResponse = Invoke-WebRequest -Uri "$baseUrl/reports/sales-overview" -Method Get -WebSession $session
    Test-StatusCode -Response $salesOverviewResponse -TestName "获取销售概览"
    
    $salesData = $salesOverviewResponse.Content | ConvertFrom-Json
    Write-Host "  总销售额: $($salesData.sales.total), 总订单数: $($salesData.orders.total)" -ForegroundColor Cyan
    Write-Host "  30天销售额: $($salesData.sales.last30Days), 等待处理订单: $($salesData.orders.pending)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 获取销售概览失败: $_" -ForegroundColor Red
}

# 12. 获取畅销产品
try {
    $topProductsResponse = Invoke-WebRequest -Uri "$baseUrl/reports/top-products?limit=5" -Method Get -WebSession $session
    Test-StatusCode -Response $topProductsResponse -TestName "获取畅销产品"
    
    $topProducts = $topProductsResponse.Content | ConvertFrom-Json
    Write-Host "  获取到 $($topProducts.Length) 个畅销产品" -ForegroundColor Cyan
    
    if ($topProducts.Length -gt 0) {
        Write-Host "  最畅销产品: $($topProducts[0].name), 售出数量: $($topProducts[0].total_sold), 销售额: $($topProducts[0].total_sales)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ 获取畅销产品失败: $_" -ForegroundColor Red
}

# 13. 获取库存状态
try {
    $inventoryResponse = Invoke-WebRequest -Uri "$baseUrl/reports/inventory-status" -Method Get -WebSession $session
    Test-StatusCode -Response $inventoryResponse -TestName "获取库存状态"
    
    $inventory = $inventoryResponse.Content | ConvertFrom-Json
    Write-Host "  库存总值: $($inventory.inventoryValue)" -ForegroundColor Cyan
    Write-Host "  产品总数: $($inventory.summary.total_products), 缺货产品: $($inventory.summary.out_of_stock), 低库存产品: $($inventory.summary.low_stock)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 获取库存状态失败: $_" -ForegroundColor Red
}

# 用户管理API测试
Write-Host "`n测试 用户管理模块..." -ForegroundColor Yellow

# 14. 获取所有用户
try {
    $usersResponse = Invoke-WebRequest -Uri "$baseUrl/users" -Method Get -WebSession $session
    Test-StatusCode -Response $usersResponse -TestName "获取用户列表"
    
    $usersData = $usersResponse.Content | ConvertFrom-Json
    $userCount = $usersData.pagination.total
    Write-Host "  总共 $userCount 个用户" -ForegroundColor Cyan
    
    if ($usersData.users.Length -gt 0) {
        Write-Host "  第一个用户: $($usersData.users[0].name), 邮箱: $($usersData.users[0].email), 角色: $($usersData.users[0].role)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ 获取用户列表失败: $_" -ForegroundColor Red
}

# 15. 创建新用户
try {
    $newUser = @{
        name = "测试用户 $(Get-Date -Format 'yyyyMMddHHmmss')"
        email = "test$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
        password = "password123"
        role = "user"
    } | ConvertTo-Json
    
    $createUserResponse = Invoke-WebRequest -Uri "$baseUrl/users" -Method Post -Body $newUser -ContentType "application/json" -WebSession $session
    Test-StatusCode -Response $createUserResponse -TestName "创建新用户"
    
    $createdUser = $createUserResponse.Content | ConvertFrom-Json
    Write-Host "  创建的用户: $($createdUser.name), ID: $($createdUser.id), 角色: $($createdUser.role)" -ForegroundColor Cyan
    $newUserId = $createdUser.id
} catch {
    Write-Host "❌ 创建用户失败: $_" -ForegroundColor Red
}

# 16. 获取用户详情
if ($newUserId) {
    try {
        $userDetailResponse = Invoke-WebRequest -Uri "$baseUrl/users/$newUserId" -Method Get -WebSession $session
        Test-StatusCode -Response $userDetailResponse -TestName "获取用户详情"
        
        $userDetail = $userDetailResponse.Content | ConvertFrom-Json
        Write-Host "  用户详情: $($userDetail.name), 邮箱: $($userDetail.email), 角色: $($userDetail.role)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ 获取用户详情失败: $_" -ForegroundColor Red
    }
}

# 清理测试数据
Write-Host "`n清理测试数据..." -ForegroundColor Yellow

# 17. 删除测试创建的用户
if ($newUserId) {
    try {
        $deleteUserResponse = Invoke-WebRequest -Uri "$baseUrl/users/$newUserId" -Method Delete -WebSession $session
        Test-StatusCode -Response $deleteUserResponse -TestName "删除测试用户"
        Write-Host "  成功删除测试用户 ID: $newUserId" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ 删除用户失败: $_" -ForegroundColor Red
    }
}

# 18. 删除测试创建的产品
if ($newProductId) {
    try {
        $deleteProductResponse = Invoke-WebRequest -Uri "$baseUrl/products/$newProductId" -Method Delete -WebSession $session
        Test-StatusCode -Response $deleteProductResponse -TestName "删除测试产品"
        Write-Host "  成功删除测试产品 ID: $newProductId" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ 删除产品失败: $_" -ForegroundColor Red
    }
}

# 19. 测试登出
try {
    $logoutResponse = Invoke-WebRequest -Uri "$baseUrl/auth/logout" -Method Post -WebSession $session
    Test-StatusCode -Response $logoutResponse -TestName "用户登出"
    Write-Host "  成功登出系统" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 用户登出失败: $_" -ForegroundColor Red
}

Write-Host "`n测试完成!" -ForegroundColor Green 