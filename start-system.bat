@echo off

:: 启动后端服务器
start "Backend Server" /d "c:\Users\86155\Documents\trae_projects\Project_qygl" cmd /c "node server.js"

:: 等待2秒，确保后端服务器有足够的时间启动
ping localhost -n 3 > nul

:: 启动前端服务器
start "Frontend Server" /d "c:\Users\86155\Documents\trae_projects\Project_qygl" cmd /c "npm run dev"

:: 等待5秒，确保前端服务器有足够的时间启动
ping localhost -n 6 > nul

:: 打开系统登录页面
explorer http://localhost:3000

:: 退出批处理文件
exit