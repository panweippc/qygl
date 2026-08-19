@echo off
REM =====================================================
REM Uptime Kuma 启动脚本（Windows）
REM =====================================================

echo 正在启动 Uptime Kuma...
echo 访问地址: http://localhost:3001
echo 按 Ctrl+C 停止服务
echo.

REM 检查是否全局安装
where uptime-kuma >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo 使用全局安装的 Uptime Kuma
    uptime-kuma
) else (
    echo 使用项目本地安装的 Uptime Kuma
    node node_modules/uptime-kuma/server/server.js
)

pause