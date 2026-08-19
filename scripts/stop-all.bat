@echo off
REM =====================================================
REM OA系统停止脚本（Windows）
REM 功能：停止所有服务
REM =====================================================

echo 正在停止OA系统服务...
echo.

REM 停止Node.js进程
echo 停止Node.js进程...
taskkill /F /IM node.exe >nul 2>&1

REM 停止Nginx
echo 停止Nginx...
cd nginx-1.22.1
nginx.exe -s quit >nul 2>&1
cd ..

echo.
echo OA系统服务已停止
echo 如需重新启动，请运行 scripts\start-all.bat
echo.

pause