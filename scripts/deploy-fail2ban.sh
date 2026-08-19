#!/bin/bash
# =====================================================
# OA系统 Fail2ban 自动部署脚本
# 适用环境：Ubuntu/Debian/CentOS
# 用途：一键安装配置fail2ban保护OA系统
# =====================================================

set -e  # 遇到错误立即退出

echo "================================================"
echo "OA系统 Fail2ban 部署脚本"
echo "================================================"

# 检测操作系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VERSION=$VERSION_ID
else
    echo "无法检测操作系统版本"
    exit 1
fi

echo "检测到操作系统: $OS $VERSION"

# 安装fail2ban
echo "正在安装fail2ban..."
if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    sudo apt update
    sudo apt install fail2ban -y
elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
    sudo yum install epel-release -y
    sudo yum install fail2ban -y
else
    echo "不支持的操作系统: $OS"
    exit 1
fi

echo "fail2ban安装完成"

# 创建配置目录
sudo mkdir -p /etc/fail2ban/jail.d
sudo mkdir -p /etc/fail2ban/filter.d

# 获取项目路径（假设脚本在项目根目录）
PROJECT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "项目路径: $PROJECT_PATH"

# 检查配置文件是否存在
if [ ! -f "$PROJECT_PATH/docs/fail2ban-jail.conf" ]; then
    echo "错误: 找不到fail2ban-jail.conf配置文件"
    exit 1
fi

if [ ! -f "$PROJECT_PATH/docs/fail2ban-filters.conf" ]; then
    echo "错误: 找不到fail2ban-filters.conf配置文件"
    exit 1
fi

# 复制配置文件
echo "正在配置fail2ban..."
sudo cp "$PROJECT_PATH/docs/fail2ban-jail.conf" /etc/fail2ban/jail.d/qygl.conf
sudo cp "$PROJECT_PATH/docs/fail2ban-filters.conf" /etc/fail2ban/filter.d/qygl.conf

echo "配置文件已复制"

# 询问日志路径
echo "请确认以下日志路径（如需修改请手动编辑配置文件）："
echo "1. Nginx访问日志: /var/log/nginx/qygl-access.log"
echo "2. 应用安全日志: $PROJECT_PATH/logs/security-alert.log"
echo ""
read -p "日志路径是否正确？(y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "请手动编辑配置文件: /etc/fail2ban/jail.d/qygl.conf"
    echo "修改logpath路径为实际的日志文件路径"
fi

# 备份原配置（如果存在）
if [ -f /etc/fail2ban/jail.local ]; then
    sudo cp /etc/fail2ban/jail.local /etc/fail2ban/jail.local.backup.$(date +%Y%m%d_%H%M%S)
    echo "原配置已备份"
fi

# 启动fail2ban
echo "正在启动fail2ban服务..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 检查状态
echo "检查fail2ban状态..."
sleep 2
if sudo systemctl is-active --quiet fail2ban; then
    echo "✓ fail2ban服务已成功启动"
else
    echo "✗ fail2ban服务启动失败"
    sudo systemctl status fail2ban
    exit 1
fi

# 显示配置状态
echo ""
echo "================================================"
echo "Fail2ban部署完成！"
echo "================================================"
echo ""
echo "当前生效的jail规则："
sudo fail2ban-client status

echo ""
echo "详细状态查询命令："
echo "  查看SSH状态: sudo fail2ban-client status sshd"
echo "  查看Nginx登录状态: sudo fail2ban-client status nginx-login-ban"
echo "  查看被封锁IP: sudo fail2ban-client banned"
echo "  查看日志: sudo tail -f /var/log/fail2ban.log"
echo ""
echo "配置文件位置："
echo "  主配置: /etc/fail2ban/jail.d/qygl.conf"
echo "  过滤规则: /etc/fail2ban/filter.d/qygl.conf"
echo ""
echo "常用管理命令："
echo "  解封IP: sudo fail2ban-client set sshd unbanip <IP地址>"
echo "  重启服务: sudo systemctl restart fail2ban"
echo "  停止服务: sudo systemctl stop fail2ban"
echo ""
echo "注意事项："
echo "1. 请确保日志路径正确，否则规则不会生效"
echo "2. 首次部署建议在测试环境验证"
echo "3. 定期检查封禁日志，避免误封正常用户"
echo ""
echo "================================================"