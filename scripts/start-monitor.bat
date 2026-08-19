@echo off
REM =====================================================
REM 监控服务启动脚本（Windows）
REM 功能：启动监控指标采集服务
REM =====================================================

echo 正在启动监控指标采集服务...
echo 数据采集间隔: 60秒
echo 数据保留时间: 30天
echo.

cd /d E:\AI\qy

REM 检查Node.js环境
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 未找到Node.js环境
    pause
    exit /b 1
)

REM 启动监控采集服务
echo 启动监控采集服务...
node scripts\monitor-collector.js

echo.
echo 监控服务已停止
pause