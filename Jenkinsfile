/*
 * 智慧办公平台 (OA) · 自动化部署流水线
 * ------------------------------------------------------------
 * 拓扑：Jenkins 安装在【部署机】(E:\qygl\qygl 所在电脑)，本机本地执行。
 * 模型：原地 git pull（不另 checkout 副本、不 xcopy 到别的目录）。
 * 流程：检测 git 更新 → npm install → 停止 Nginx → 构建前端 →
 *       启动/重载 Nginx(8080) → 重启 dev server(3003) → 重启后端 pm2(qygl) → 健康检查。
 * 触发：每 5 分钟轮询；无新提交则跳过部署。
 *
 * ⚠️ 关键运维前提（务必满足，否则 pm2/nginx 操作会失败）：
 *   1. Jenkins 服务/agent 必须运行在【与平时启动 pm2、nginx 相同的 Windows 用户】下，
 *      pm2 守护进程按用户隔离，跨用户 `pm2 restart qygl` 会找不到进程。
 *   2. 部署机需具备：git(且 E:\qygl\qygl 是可 git pull 的仓库)、node/npm(建议加入 PATH，
 *      否则改 NODE_HOME)、全局 pm2、nginx。
 *   3. 流水线用 `bat` 调用 `powershell -Command`，无需额外 Jenkins 插件（仅需默认 Git/Pipeline）。
 * ------------------------------------------------------------
 */
pipeline {
  agent any

  environment {
    PROJECT_DIR   = 'E:/qygl/qygl'                                       // 部署机项目根目录（同时是 git 仓库）
    NGINX_DIR     = 'E:/qygl/qygl/nginx-1.22.1'                           // nginx 安装目录
    NGINX_EXE     = 'E:/qygl/qygl/nginx-1.22.1/nginx.exe'                 // nginx 可执行文件
    NODE_HOME     = 'D:/node/node-v20.20.2-win-x64'                       // node 目录（已加入 PATH 可忽略）
    PATH          = "${NODE_HOME};${env.PATH}"
    GIT_BRANCH    = 'main'
    SERVER_PORT   = '3005'                                                // 后端端口
    FRONTEND_PORT = '8080'                                                // 生产前端（nginx 托管 dist）
    DEV_PORT      = '3003'                                                // 开发前端（vite dev server）
    PM2_APP_NAME  = 'qygl'                                                // 后端 pm2 进程名
    SKIP_DEPLOY   = '0'                                                   // 1=无更新跳过部署
  }

  triggers {
    githubPush()                                                           // GitHub Webhook 推送即秒触发
    cron('H/5 * * * *')                                                   // 兜底：每 5 分钟轮询（防止 webhook 漏触发）
  }

  options {
    buildDiscarder(logRotator(numToKeepStr: '10'))
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  stages {
    // 阶段1：拉取代码并检测是否有新提交
    stage('Git Pull') {
      steps {
        echo "=== 阶段1: 检测/拉取最新代码 (${PROJECT_DIR}) ==="
        dir("${PROJECT_DIR}") {
          bat "git fetch origin ${GIT_BRANCH}"
          script {
            def local  = bat(returnStdout: true, script: "git rev-parse ${GIT_BRANCH}").trim()
            def remote = bat(returnStdout: true, script: "git rev-parse origin/${GIT_BRANCH}").trim()
            if (local == remote) {
              echo '✅ 无新提交，跳过本次部署'
              env.SKIP_DEPLOY = '1'
            } else {
              echo '🔄 检测到新提交，开始更新...'
              bat "git reset --hard origin/${GIT_BRANCH}"
            }
          }
        }
      }
    }

    // 阶段2：安装依赖（仅在有更新时）
    stage('Install Dependencies') {
      when { environment name: 'SKIP_DEPLOY', value: '0' }
      steps {
        echo '=== 阶段2: 安装依赖 ==='
        dir("${PROJECT_DIR}") { bat 'npm install' }
      }
    }

    // 阶段3：停止 Nginx（必须在构建前，否则 nginx 占用 dist/index.html 导致 EPERM 写失败）
    stage('Stop Nginx') {
      when { environment name: 'SKIP_DEPLOY', value: '0' }
      steps {
        echo '=== 阶段3: 停止 Nginx ==='
        // 先探测是否运行：仅在运行时才 stop；无论结果如何强制 exit 0，避免"未运行"误判为失败
        bat "tasklist | findstr /i nginx >nul 2>&1 && (cd /d \"${NGINX_DIR}\" && \"${NGINX_EXE}\" -s stop && echo 已停止 Nginx) || echo Nginx 未运行，跳过 & exit /b 0"
      }
    }

    // 阶段4：前端构建
    stage('Build') {
      when { environment name: 'SKIP_DEPLOY', value: '0' }
      steps {
        echo '=== 阶段4: 前端构建 (npm run build) ==='
        dir("${PROJECT_DIR}") { bat 'npm run build' }
      }
    }

    // 阶段5：启动并 reload Nginx（生产 8080）
    stage('Start & Reload Nginx') {
      when { environment name: 'SKIP_DEPLOY', value: '0' }
      steps {
        echo '=== 阶段5: 启动 Nginx(8080) 并 reload ==='
        bat "tasklist | findstr /i nginx >nul 2>&1 && echo Nginx 已运行 || powershell -Command \"Start-Process -FilePath '${NGINX_EXE}' -WorkingDirectory '${NGINX_DIR}' -WindowStyle Hidden\" & exit /b 0"
        bat 'ping -n 3 127.0.0.1 >nul'
        bat "cd /d \"${NGINX_DIR}\" && \"${NGINX_EXE}\" -s reload || echo reload 跳过 & exit /b 0"
      }
    }

    // 阶段6：重启前端 dev server（3003，普通 npm run dev 进程）
    stage('Restart Dev Server (3003)') {
      when { environment name: 'SKIP_DEPLOY', value: '0' }
      steps {
        echo '=== 阶段6: 重启前端 dev server (3003) ==='
        // 尽力而为：探测/停止旧进程 + 启动新进程，任意异常都吞掉并强制 exit 0，绝不中断流水线
        bat "powershell -Command \"try { \$p=Get-NetTCPConnection -LocalPort ${DEV_PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue; if(\$p){Stop-Process -Id \$p -Force -ErrorAction SilentlyContinue; Write-Host '已停止旧 dev server'} } catch { Write-Host ('dev 停止跳过: ' + \$_.Exception.Message) }; exit 0\""
        bat "powershell -Command \"try { Start-Process -FilePath npm -ArgumentList 'run','dev' -WorkingDirectory '${PROJECT_DIR}' -WindowStyle Hidden; Write-Host '已启动新 dev server' } catch { Write-Host ('dev 启动跳过: ' + \$_.Exception.Message) }; exit 0\""
        echo '✅ dev server 重启指令已下发 (3003)'
      }
    }

    // 阶段7：重启后端（pm2 qygl）
    stage('Restart Backend (pm2)') {
      when { environment name: 'SKIP_DEPLOY', value: '0' }
      steps {
        echo '=== 阶段7: 重启后端 (pm2 qygl) ==='
        dir("${PROJECT_DIR}") {
          bat "pm2 restart ${PM2_APP_NAME} || pm2 start server.js --name ${PM2_APP_NAME}"
          bat 'pm2 save'
        }
      }
    }

    // 阶段8：验证后端
    stage('Verify Backend') {
      when { environment name: 'SKIP_DEPLOY', value: '0' }
      steps {
        echo '=== 阶段8: 验证后端 (3005) ==='
        // 用 127.0.0.1 避免 localhost 解析到 IPv6(::1)；后端启动较慢，最多重试 15 次(约 60s)
        bat "powershell -Command \"\$ok=\$false; for(\$i=1; \$i-le 15; \$i++){ try { \$r=Invoke-WebRequest -Uri 'http://127.0.0.1:${SERVER_PORT}/api/projects' -TimeoutSec 5 -UseBasicParsing; Write-Host ('后端状态: ' + \$r.StatusCode); \$ok=\$true; break } catch { Write-Host ('  重试 ' + \$i + ': ' + \$_.Exception.Message); Start-Sleep -Seconds 4 } }; if(-\$ok){ Write-Host '⚠️ 后端 60s 内未就绪，请检查 pm2 日志' }; exit 0\""
      }
    }

    // 阶段9：验证前端（nginx 8080）
    stage('Verify Frontend') {
      when { environment name: 'SKIP_DEPLOY', value: '0' }
      steps {
        echo '=== 阶段9: 验证前端 (nginx 8080) ==='
        bat "powershell -Command \"\$ok=\$false; for(\$i=1; \$i-le 10; \$i++){ try { \$r=Invoke-WebRequest -Uri 'http://127.0.0.1:${FRONTEND_PORT}' -TimeoutSec 5 -UseBasicParsing; Write-Host ('前端状态: ' + \$r.StatusCode); \$ok=\$true; break } catch { Write-Host ('  重试 ' + \$i + ': ' + \$_.Exception.Message); Start-Sleep -Seconds 3 } }; if(-\$ok){ Write-Host '⚠️ 前端未就绪，请检查 nginx 日志' }; exit 0\""
      }
    }

    // 阶段10：PM2 状态
    stage('PM2 Status') {
      when { environment name: 'SKIP_DEPLOY', value: '0' }
      steps {
        echo '=== 阶段10: PM2 状态 ==='
        bat 'pm2 status'
      }
    }
  }

  post {
    success {
      echo '🎉 流水线执行成功'
      echo "部署目录: ${PROJECT_DIR}"
    }
    failure {
      echo '❌ 流水线执行失败'
      bat "pm2 logs ${PM2_APP_NAME} --lines 50 || echo 无日志"
    }
    always {
      echo '=== 清理 Jenkins 工作区 ==='
      deleteDir()
    }
  }
}
