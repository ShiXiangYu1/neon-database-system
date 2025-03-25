# Neon数据库UI测试检查清单
Write-Host "开始UI功能检查清单..." -ForegroundColor Green

# 定义UI测试状态变量
$uiTestStatus = @{}

# 显示测试项和获取结果的函数
function Test-UI {
    param (
        [Parameter(Mandatory = $true)]
        [string]
        $TestName,
        
        [Parameter(Mandatory = $true)]
        [string]
        $Description
    )
    
    Write-Host "`n测试项: $TestName" -ForegroundColor Yellow
    Write-Host "说明: $Description" -ForegroundColor Cyan
    
    $result = Read-Host "测试是否通过? (y/n/s - 通过/不通过/跳过)"
    
    switch ($result.ToLower()) {
        "y" { 
            Write-Host "✅ 通过!" -ForegroundColor Green
            $uiTestStatus[$TestName] = "通过"
            return $true
        }
        "n" { 
            $reason = Read-Host "失败原因"
            Write-Host "❌ 失败: $reason" -ForegroundColor Red
            $uiTestStatus[$TestName] = "失败: $reason"
            return $false
        }
        "s" { 
            Write-Host "⏭️ 跳过" -ForegroundColor Gray
            $uiTestStatus[$TestName] = "跳过"
            return $null
        }
        default { 
            Write-Host "⚠️ 无效输入，记录为跳过" -ForegroundColor Yellow
            $uiTestStatus[$TestName] = "跳过"
            return $null
        }
    }
}

# 生成报告的函数
function Show-TestReport {
    Write-Host "`n==================== UI测试结果摘要 ====================" -ForegroundColor Magenta
    
    $total = $uiTestStatus.Count
    $passed = ($uiTestStatus.Values | Where-Object { $_ -eq "通过" }).Count
    $failed = ($uiTestStatus.Values | Where-Object { $_ -like "失败*" }).Count
    $skipped = ($uiTestStatus.Values | Where-Object { $_ -eq "跳过" }).Count
    
    Write-Host "总测试项: $total" -ForegroundColor White
    Write-Host "通过: $passed" -ForegroundColor Green
    Write-Host "失败: $failed" -ForegroundColor Red
    Write-Host "跳过: $skipped" -ForegroundColor Gray
    
    $passRate = 0
    if ($total -gt 0 -and ($passed + $failed) -gt 0) {
        $passRate = [math]::Round(($passed / ($passed + $failed)) * 100)
    }
    
    Write-Host "通过率: $passRate%" -ForegroundColor $(if ($passRate -ge 90) { "Green" } elseif ($passRate -ge 75) { "Yellow" } else { "Red" })
    
    if ($failed -gt 0) {
        Write-Host "`n失败项目详情:" -ForegroundColor Red
        foreach ($key in $uiTestStatus.Keys) {
            if ($uiTestStatus[$key] -like "失败*") {
                Write-Host "  - $key : $($uiTestStatus[$key])" -ForegroundColor Red
            }
        }
    }
    
    Write-Host "`n=======================================================" -ForegroundColor Magenta
}

# 请求默认启动系统
Write-Host "请确保系统已在浏览器中打开 (http://localhost:3000)" -ForegroundColor Yellow
$ready = Read-Host "系统是否已经准备好测试? (y/n)"

if ($ready.ToLower() -ne "y") {
    Write-Host "请先启动系统并在浏览器中打开后再运行此测试脚本。" -ForegroundColor Red
    exit
}

# 1. 登录页面测试
Test-UI -TestName "登录页面基本功能" -Description "检查登录页面是否正确显示，包含用户名/密码输入框和登录按钮"
Test-UI -TestName "登录表单验证" -Description "尝试使用空白输入提交登录表单，检查是否有适当的错误提示"
Test-UI -TestName "管理员登录" -Description "使用管理员账户(admin@example.com/admin123)登录，验证是否能成功进入系统"

# 2. 仪表盘测试
Test-UI -TestName "仪表盘加载" -Description "检查仪表盘是否正确加载，包含各主要模块入口和统计卡片"
Test-UI -TestName "统计卡片显示" -Description "验证仪表盘中的销售额、订单数、用户数等统计卡片是否正确显示数据"
Test-UI -TestName "图表展示" -Description "检查仪表盘中的图表（如销售趋势、库存状态）是否正确显示"

# 3. 产品管理测试
Test-UI -TestName "产品列表加载" -Description "检查产品列表页面是否正确加载，显示产品数据"
Test-UI -TestName "产品搜索功能" -Description "测试产品搜索功能，输入关键词查看是否能正确过滤产品"
Test-UI -TestName "产品分页功能" -Description "测试产品列表的分页功能，点击下一页/上一页按钮是否正确加载数据"
Test-UI -TestName "产品创建表单" -Description "点击'添加产品'按钮，检查创建产品表单是否正确展示"
Test-UI -TestName "产品表单验证" -Description "尝试提交空白的产品表单，检查表单验证是否正常工作"
Test-UI -TestName "创建新产品" -Description "填写完整的产品信息并提交，检查是否成功创建产品"
Test-UI -TestName "产品图片上传" -Description "在产品表单中测试图片上传功能，验证是否能正确上传和预览图片"
Test-UI -TestName "编辑产品" -Description "选择一个产品进行编辑，检查编辑表单是否预填充现有数据"
Test-UI -TestName "保存产品编辑" -Description "修改产品信息并保存，检查是否成功更新产品数据"
Test-UI -TestName "删除产品" -Description "选择一个产品进行删除，检查是否有确认对话框并能成功删除"

# 4. 订单管理测试
Test-UI -TestName "订单列表加载" -Description "检查订单列表页面是否正确加载，显示订单数据"
Test-UI -TestName "订单搜索功能" -Description "测试订单搜索功能，输入关键词或订单编号查看是否能正确过滤订单"
Test-UI -TestName "订单过滤器" -Description "测试按状态过滤订单，验证过滤结果是否正确"
Test-UI -TestName "订单详情查看" -Description "点击订单查看详情，检查订单详情页是否正确显示信息"
Test-UI -TestName "更新订单状态" -Description "在订单详情页更改订单状态，检查状态是否成功更新"

# 5. 用户管理测试
Test-UI -TestName "用户列表加载" -Description "检查用户列表页面是否正确加载，显示用户数据"
Test-UI -TestName "用户搜索功能" -Description "测试用户搜索功能，输入关键词查看是否能正确过滤用户"
Test-UI -TestName "创建新用户" -Description "测试创建新用户流程，验证表单验证和提交是否正常"
Test-UI -TestName "编辑用户" -Description "选择一个用户进行编辑，检查编辑表单是否预填充现有数据"
Test-UI -TestName "删除用户" -Description "选择一个用户进行删除，检查是否有确认对话框并能成功删除"

# 6. 报表与统计测试
Test-UI -TestName "报表页面加载" -Description "检查报表页面是否正确加载"
Test-UI -TestName "销售概览图表" -Description "验证销售概览图表是否正确显示数据"
Test-UI -TestName "畅销产品报表" -Description "检查畅销产品报表是否正确显示产品销售排名"
Test-UI -TestName "库存状态报表" -Description "验证库存状态报表是否正确显示库存信息"
Test-UI -TestName "日期范围过滤" -Description "测试报表的日期范围过滤功能，选择不同日期范围查看数据变化"

# 7. 响应式设计测试
Test-UI -TestName "移动端响应" -Description "调整浏览器窗口大小模拟移动设备，检查UI是否适应不同屏幕尺寸"
Test-UI -TestName "导航栏响应式" -Description "在小屏幕下测试导航栏是否转为汉堡菜单，功能是否正常"
Test-UI -TestName "表格响应式" -Description "在小屏幕下测试表格数据显示是否有适当调整"

# 8. 通用UI元素测试
Test-UI -TestName "导航菜单" -Description "测试顶部或侧边导航菜单，验证所有链接是否正确跳转"
Test-UI -TestName "通知消息" -Description "执行需要显示通知的操作（如保存成功），检查通知是否正确显示"
Test-UI -TestName "错误处理" -Description "故意执行可能导致错误的操作，检查错误处理和用户提示是否友好"
Test-UI -TestName "加载状态" -Description "检查数据加载过程中是否显示合适的加载指示器"
Test-UI -TestName "主题切换" -Description "如果支持，测试明暗主题切换功能"

# 9. 安全和权限测试
Test-UI -TestName "角色权限" -Description "使用不同角色账户登录，验证是否根据角色正确显示/隐藏功能"
Test-UI -TestName "未授权访问" -Description "尝试访问需要授权的页面（如未登录访问仪表盘），检查是否正确重定向"
Test-UI -TestName "注销功能" -Description "测试注销功能，验证是否成功退出系统并重定向到登录页面"

# 10. 性能感知测试
Test-UI -TestName "页面加载速度" -Description "评估各主要页面的加载速度，是否在可接受范围内"
Test-UI -TestName "操作响应速度" -Description "评估常见操作（如创建/编辑数据）的响应速度"

# 显示测试报告
Show-TestReport

# 生成测试报告文件
$reportDate = Get-Date -Format "yyyyMMdd_HHmmss"
$reportPath = "UI_Test_Report_$reportDate.txt"

"==================== Neon数据库系统UI测试报告 ====================" | Out-File -FilePath $reportPath
"测试日期: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File -FilePath $reportPath -Append
"" | Out-File -FilePath $reportPath -Append

"测试结果摘要:" | Out-File -FilePath $reportPath -Append
"总测试项: $total" | Out-File -FilePath $reportPath -Append  
"通过: $passed" | Out-File -FilePath $reportPath -Append
"失败: $failed" | Out-File -FilePath $reportPath -Append
"跳过: $skipped" | Out-File -FilePath $reportPath -Append
"通过率: $passRate%" | Out-File -FilePath $reportPath -Append
"" | Out-File -FilePath $reportPath -Append

"详细测试结果:" | Out-File -FilePath $reportPath -Append
foreach ($key in $uiTestStatus.Keys) {
    "$key : $($uiTestStatus[$key])" | Out-File -FilePath $reportPath -Append
}

"==============================================================" | Out-File -FilePath $reportPath -Append

Write-Host "`n测试报告已保存至: $reportPath" -ForegroundColor Green 