# integration-test.ps1
Write-Host "开始Neon数据库系统功能整合测试..." -ForegroundColor Magenta

# 设置基本变量
$apiBase = "http://localhost:3001/api"
$adminUser = @{
    email = "admin@example.com"
    password = "admin123"
}
$testUser = @{
    name = "测试用户"
    email = "test@example.com"
    password = "test123"
}
$testProduct = @{
    name = "整合测试产品"
    description = "用于功能整合测试的产品"
    price = 99.99
    stock = 50
}

# 存储ID和认证令牌
$adminToken = ""
$testUserId = 0
$testProductId = 0
$testOrderId = 0

# 记录测试结果
$testResults = @{}

# 测试函数
function Test-Feature {
    param (
        [Parameter(Mandatory = $true)]
        [string]
        $Name,
        
        [Parameter(Mandatory = $true)]
        [scriptblock]
        $TestScript
    )
    
    Write-Host "`n正在测试: $Name" -ForegroundColor Yellow
    
    try {
        & $TestScript
        Write-Host "✅ 测试通过" -ForegroundColor Green
        $testResults[$Name] = "通过"
        return $true
    }
    catch {
        Write-Host "❌ 测试失败: $_" -ForegroundColor Red
        $testResults[$Name] = "失败: $_"
        return $false
    }
}

# 1. 测试管理员登录
Test-Feature -Name "管理员登录" -TestScript {
    $loginData = @{
        email = $adminUser.email
        password = $adminUser.password
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$apiBase/auth/login" -Method Post -Body $loginData -ContentType "application/json"
    
    if (-not $response.token) {
        throw "登录失败，未返回有效令牌"
    }
    
    # 保存管理员令牌
    $script:adminToken = $response.token
    Write-Host "  管理员登录成功，获取令牌"
}

# 2. 测试创建测试用户
Test-Feature -Name "创建测试用户" -TestScript {
    $userData = @{
        name = $testUser.name
        email = $testUser.email
        password = $testUser.password
        role = "user"
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    
    $response = Invoke-RestMethod -Uri "$apiBase/users" -Method Post -Body $userData -ContentType "application/json" -Headers $headers
    
    if (-not $response.id) {
        throw "创建用户失败，未返回用户ID"
    }
    
    # 保存测试用户ID
    $script:testUserId = $response.id
    Write-Host "  测试用户创建成功，ID: $testUserId"
}

# 3. 测试用户登录
Test-Feature -Name "测试用户登录" -TestScript {
    $loginData = @{
        email = $testUser.email
        password = $testUser.password
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$apiBase/auth/login" -Method Post -Body $loginData -ContentType "application/json"
    
    if (-not $response.token) {
        throw "测试用户登录失败，未返回有效令牌"
    }
    
    Write-Host "  测试用户登录成功"
}

# 4. 测试创建产品
Test-Feature -Name "创建产品" -TestScript {
    $productData = @{
        name = $testProduct.name
        description = $testProduct.description
        price = $testProduct.price
        stock = $testProduct.stock
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    
    $response = Invoke-RestMethod -Uri "$apiBase/products" -Method Post -Body $productData -ContentType "application/json" -Headers $headers
    
    if (-not $response.id) {
        throw "创建产品失败，未返回产品ID"
    }
    
    # 保存产品ID
    $script:testProductId = $response.id
    Write-Host "  产品创建成功，ID: $testProductId"
}

# 5. 测试获取产品详情
Test-Feature -Name "获取产品详情" -TestScript {
    $response = Invoke-RestMethod -Uri "$apiBase/products/$testProductId" -Method Get
    
    if ($response.name -ne $testProduct.name) {
        throw "获取产品详情失败，产品名称不匹配"
    }
    
    Write-Host "  成功获取产品详情"
}

# 6. 测试创建订单
Test-Feature -Name "创建订单" -TestScript {
    $orderData = @{
        items = @(
            @{
                product_id = $testProductId
                quantity = 2
                price = $testProduct.price
            }
        )
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    
    $response = Invoke-RestMethod -Uri "$apiBase/orders" -Method Post -Body $orderData -ContentType "application/json" -Headers $headers
    
    if (-not $response.id) {
        throw "创建订单失败，未返回订单ID"
    }
    
    # 保存订单ID
    $script:testOrderId = $response.id
    Write-Host "  订单创建成功，ID: $testOrderId"
}

# 7. 测试获取订单详情
Test-Feature -Name "获取订单详情" -TestScript {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    
    $response = Invoke-RestMethod -Uri "$apiBase/orders/$testOrderId" -Method Get -Headers $headers
    
    if (-not $response.items) {
        throw "获取订单详情失败，未返回订单项目"
    }
    
    Write-Host "  成功获取订单详情"
}

# 8. 测试更新订单状态
Test-Feature -Name "更新订单状态" -TestScript {
    $statusData = @{
        status = "completed"
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    
    $response = Invoke-RestMethod -Uri "$apiBase/orders/$testOrderId/status" -Method Patch -Body $statusData -ContentType "application/json" -Headers $headers
    
    if ($response.status -ne "completed") {
        throw "更新订单状态失败，状态未改变"
    }
    
    Write-Host "  订单状态更新成功"
}

# 9. 测试获取销售报表
Test-Feature -Name "获取销售报表" -TestScript {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    
    $response = Invoke-RestMethod -Uri "$apiBase/reports/sales-overview" -Method Get -Headers $headers
    
    if (-not $response.sales) {
        throw "获取销售报表失败，未返回销售数据"
    }
    
    Write-Host "  成功获取销售报表"
}

# 10. 测试获取畅销产品
Test-Feature -Name "获取畅销产品" -TestScript {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    
    $response = Invoke-RestMethod -Uri "$apiBase/reports/top-products" -Method Get -Headers $headers
    
    if ($response.Count -eq 0) {
        throw "获取畅销产品失败，未返回产品数据"
    }
    
    Write-Host "  成功获取畅销产品"
}

# 11. 测试更新产品
Test-Feature -Name "更新产品" -TestScript {
    $updateData = @{
        price = 129.99
        stock = 45
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    
    $response = Invoke-RestMethod -Uri "$apiBase/products/$testProductId" -Method Put -Body $updateData -ContentType "application/json" -Headers $headers
    
    if ($response.price -ne 129.99) {
        throw "更新产品失败，价格未更新"
    }
    
    Write-Host "  产品更新成功"
}

# 12. 测试清理（可选，取决于是否需要保留测试数据）
if ($false) { # 设置为$true执行清理
    Test-Feature -Name "清理测试数据" -TestScript {
        $headers = @{
            "Authorization" = "Bearer $adminToken"
        }
        
        # 删除测试订单
        # 注意：根据数据库约束，可能需要先删除order_items
        # Invoke-RestMethod -Uri "$apiBase/orders/$testOrderId" -Method Delete -Headers $headers
        
        # 删除测试产品
        Invoke-RestMethod -Uri "$apiBase/products/$testProductId" -Method Delete -Headers $headers
        
        # 删除测试用户
        Invoke-RestMethod -Uri "$apiBase/users/$testUserId" -Method Delete -Headers $headers
        
        Write-Host "  测试数据清理完成"
    }
}

# 显示测试结果摘要
Write-Host "`n==================== 功能整合测试结果摘要 ====================" -ForegroundColor Magenta
$totalTests = $testResults.Count
$passedTests = ($testResults.Values | Where-Object { $_ -eq "通过" }).Count
$failedTests = $totalTests - $passedTests

Write-Host "总测试项: $totalTests" -ForegroundColor White
Write-Host "通过: $passedTests" -ForegroundColor Green
Write-Host "失败: $failedTests" -ForegroundColor Red

$passRate = 0
if ($totalTests -gt 0) {
    $passRate = [math]::Round(($passedTests / $totalTests) * 100)
}

Write-Host "通过率: $passRate%" -ForegroundColor $(if ($passRate -eq 100) { "Green" } elseif ($passRate -ge 80) { "Yellow" } else { "Red" })

if ($failedTests -gt 0) {
    Write-Host "`n失败项目详情:" -ForegroundColor Red
    foreach ($key in $testResults.Keys) {
        if ($testResults[$key] -ne "通过") {
            Write-Host "  - $key : $($testResults[$key])" -ForegroundColor Red
        }
    }
}

Write-Host "`n=======================================================" -ForegroundColor Magenta

# 生成测试报告文件
$reportDate = Get-Date -Format "yyyyMMdd_HHmmss"
$reportPath = "Integration_Test_Report_$reportDate.txt"

"==================== Neon数据库系统功能整合测试报告 ====================" | Out-File -FilePath $reportPath
"测试日期: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File -FilePath $reportPath -Append
"" | Out-File -FilePath $reportPath -Append

"测试结果摘要:" | Out-File -FilePath $reportPath -Append
"总测试项: $totalTests" | Out-File -FilePath $reportPath -Append
"通过: $passedTests" | Out-File -FilePath $reportPath -Append
"失败: $failedTests" | Out-File -FilePath $reportPath -Append
"通过率: $passRate%" | Out-File -FilePath $reportPath -Append
"" | Out-File -FilePath $reportPath -Append

"详细测试结果:" | Out-File -FilePath $reportPath -Append
foreach ($key in $testResults.Keys) {
    "$key : $($testResults[$key])" | Out-File -FilePath $reportPath -Append
}

"==============================================================" | Out-File -FilePath $reportPath -Append

Write-Host "`n测试报告已保存至: $reportPath" -ForegroundColor Green