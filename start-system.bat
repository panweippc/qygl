@echo off
chcp 65001 >nul
REM ============================================================
REM 智慧办公平台 (OA) 开机自启脚本
REM 功能：启动后端(pm2) + 前端Nginx(8080) + 前端dev server(3003)
REM 特点：幂等——若服务已在运行则跳过，避免重复启动
REM 部署：由 Windows 计划任务在开机时调用
REM 注意：等待延时使用 ping 而非 timeout，兼容计划任务/无控制台环境
REM ============================================================

set "PROJECT_DIR=e:\AI\qy"
set "NGINX_DIR=e:\AI\qy\nginx-1.22.1"
set "LOG_FILE=%PROJECT_DIR%\logs\startup.log"

echo [%date% %time%] 开机自启脚本开始执行 >> "%LOG_FILE%"

REM ============================================================
REM 1. 后端服务（pm2 管理 qygl-backend，端口 3005）
REM ============================================================
echo [%date% %time%] --- 检查后端(3005) --- >> "%LOG_FILE%"
netstat -ano | findstr ":3005" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [%date% %time%]   后端已在运行，跳过 >> "%LOG_FILE%"
) else (
    echo [%date% %time%]   后端未运行，通过 pm2 启动 >> "%LOG_FILE%"
    cd /d "%PROJECT_DIR%"
    start "QYGL-Backend" /d "%PROJECT_DIR%" cmd /c "pm2 start ecosystem.config.cjs --update-env"
    REM 等待后端就绪（ping 5 次约 4 秒）
    ping -n 5 127.0.0.1 >nul 2>&1
)

REM ============================================================
REM 2. 前端 Nginx（生产模式，端口 8080）
REM ============================================================
echo [%date% %time%] --- 检查 Nginx(8080) --- >> "%LOG_FILE%"
netstat -ano | findstr ":8080" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [%date% %time%]   Nginx 已在运行，跳过 >> "%LOG_FILE%"
) else (
    echo [%date% %time%]   Nginx 未运行，启动 >> "%LOG_FILE%"
    if exist "%NGINX_DIR%\nginx.exe" (
        start "QYGL-Nginx" /d "%NGINX_DIR%" cmd /c "start nginx.exe"
        ping -n 3 127.0.0.1 >nul 2>&1
    ) else (
        echo [%date% %time%]   [错误] 未找到 nginx.exe >> "%LOG_FILE%"
    )
)

REM ============================================================
REM 3. 前端 dev server（开发模式，端口 3003）
REM ============================================================
echo [%date% %time%] --- 检查 dev server(3003) --- >> "%LOG_FILE%"
netstat -ano | findstr ":3003" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [%date% %time%]   dev server 已在运行，跳过 >> "%LOG_FILE%"
) else (
    echo [%date% %time%]   dev server 未运行，启动 >> "%LOG_FILE%"
    cd /d "%PROJECT_DIR%"
    start "QYGL-Frontend" /d "%PROJECT_DIR%" cmd /k "npm run dev"
)

echo [%date% %time%] 开机自启脚本执行完毕 >> "%LOG_FILE%"
exit /b 0
