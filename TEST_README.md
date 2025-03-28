# Neon数据库系统测试指南

## 测试概述

本测试指南提供了对Neon数据库系统进行全面测试的方法和工具。测试分为两个主要部分：

1. **API功能测试** - 通过自动化脚本验证所有后端API功能
2. **UI功能测试** - 通过交互式检查列表验证前端用户界面功能

## 前提条件

在开始测试之前，请确保：

1. 系统已正确安装和配置
2. 数据库连接正常
3. 系统服务已经启动（运行在http://localhost:3000）
4. 您有管理员账户可用（默认：admin@example.com / admin123）

## API测试

API测试脚本会自动测试系统中的所有主要API端点，包括：

- 用户认证
- 产品管理
- 订单处理
- 报表生成
- 用户管理

### 运行API测试

1. 打开PowerShell终端
2. 确保系统服务已启动（使用`npm start`）
3. 执行以下命令运行API测试脚本：

```powershell
.\test-api.ps1
```

测试脚本将：
- 自动测试所有API端点
- 显示每个测试的结果（成功/失败）
- 在测试过程中创建临时测试数据并在测试结束后清理
- 输出测试摘要

### API测试结果解读

测试结果会使用颜色编码进行显示：
- ✅ 绿色 - 测试通过
- ❌ 红色 - 测试失败

如果测试失败，请检查：
- 服务器是否正在运行
- API路径是否正确
- 数据库连接是否正常
- 参数格式是否正确

## UI测试

UI测试通过交互式检查列表帮助测试人员系统地验证所有用户界面功能。

### 运行UI测试

1. 打开PowerShell终端
2. 确保系统已在浏览器中打开（http://localhost:3000）
3. 执行以下命令运行UI测试脚本：

```powershell
.\test-ui.ps1
```

### UI测试流程

UI测试脚本将：
1. 提示您确认系统是否已在浏览器中打开并准备好测试
2. 按顺序显示每个测试项，包括测试名称和描述
3. 对于每个测试项，您需要在系统上手动执行操作并判断结果
4. 输入测试结果（y/n/s - 通过/不通过/跳过）
5. 如果测试失败，您可以输入失败原因
6. 在测试完成后，生成测试报告并显示结果摘要

### UI测试覆盖范围

UI测试覆盖以下功能领域：
1. 登录页面
2. 仪表盘
3. 产品管理
4. 订单管理
5. 用户管理
6. 报表与统计
7. 响应式设计
8. 通用UI元素
9. 安全和权限
10. 性能感知

### UI测试报告

测试完成后，系统将：
1. 在控制台显示测试结果摘要
2. 生成包含详细测试结果的文本报告文件
3. 报告文件名格式为：`UI_Test_Report_[日期时间].txt`

## 故障排除

### API测试问题

1. **连接错误**：验证系统是否正在运行，端口是否正确
2. **认证失败**：检查测试脚本中使用的凭据
3. **参数错误**：检查API请求的参数格式

### UI测试问题

1. **系统未启动**：确保在运行测试前系统已启动并可访问
2. **测试项不适用**：如果某个测试项不适用于当前系统配置，可使用"s"选项跳过
3. **测试结果不一致**：记录详细的测试步骤和观察到的行为

## 测试维护

随着系统的发展，测试脚本可能需要更新：

1. 新增API端点应添加到`test-api.ps1`
2. 新增UI功能应添加到`test-ui.ps1`的适当部分
3. 更改的验证逻辑应在脚本中相应更新

## 联系与支持

如有测试相关问题或发现系统漏洞，请联系系统管理员或开发团队。 