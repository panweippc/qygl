@echo off
REM =====================================================
REM OA系统完整启动脚本（Windows）
REM 功能：启动后端服务 + Nginx + 监控服务
REM =====================================================

echo =====================================================
echo OA系统完整启动脚本
echo =====================================================
echo.

cd /d E:\AI\qy

REM 1. 启动Uptime Kuma
echo [1/4] 启动 Uptime Kuma...
start "Uptime Kuma" cmd /k "scripts\start-uptime-kuma.bat"
timeout /t 3 >nul

REM 2. 启动监控采集服务
echo [2/4] 启动监控采集服务...
start "监控采集服务" cmd /k "scripts\start-monitor.bat"
timeout /t 2 >nul

REM 3. 启动后端服务
echo [3/4] 启动后端服务...
start "后端服务" cmd /k "node server.js"
timeout /t 2 >nul

REM 4. 启动Nginx
echo [4/4] 启动 Nginx...
cd nginx-1.22.1
start nginx.exe
cd ..

echo.
echo =====================================================
echo OA系统启动完成！
echo =====================================================
echo.
echo 访问地址：
echo   - 前端应用: http://localhost:8080
echo   - Uptime Kuma: http://localhost:8080/uptime-kuma/
echo   - 系统监控: http://localhost:8080/#/monitor
echo.
echo 管理端口：
echo   - 后端API: http://localhost:3005
echo   - Uptime Kuma: http://localhost:3001
echo.
echo 按 Ctrl+C 关闭此窗口不会影响服务运行
echo 如需停止所有服务，请运行 scripts\stop-all.bat
echo.

pause