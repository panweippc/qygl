@echo off
REM =====================================================
REM OA系统 Fail2ban 部署脚本 (Windows参考版)
REM 说明：Windows环境建议使用替代方案，此脚本仅作参考
REM =====================================================

echo =================================================
echo OA系统 Fail2ban 部署脚本 (Windows环境)
echo =================================================
echo.
echo 重要提示：
echo 1. Fail2ban 主要适用于 Linux 环境
echo 2. Windows 环境建议使用以下替代方案：
echo    - Windows 防火墙高级安全
echo    - IPSecurity Policy
echo    - 第三方软件：PeerBlock、SimpleWall
echo    - IIS 动态 IP 限制（如果使用 IIS）
echo.
echo 如需在 Linux 服务器上部署，请：
echo 1. 将项目部署到 Linux 服务器
echo 2. 运行 scripts/deploy-fail2ban.sh
echo 3. 参考 docs/fail2ban-setup-guide.md
echo.
echo =================================================
pause