# 复制启动脚本到启动文件夹
$sourceFile = "c:\Users\86155\Documents\trae_projects\Project_qygl\start-system.bat"
$destinationFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"

# 复制文件
Copy-Item -Path $sourceFile -Destination $destinationFolder -Force

# 验证复制是否成功
if (Test-Path "$destinationFolder\start-system.bat") {
    Write-Host "启动脚本已成功添加到开机自启动"
} else {
    Write-Host "启动脚本添加失败"
}
