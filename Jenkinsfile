/*
 * 智慧办公平台 (OA) · 自动化部署流水线
 * ------------------------------------------------------------
 * 拓扑：Jenkins 安装在【部署机】(E:\qygl\qygl 所在电脑)，本机本地执行。
 * 模型：原地 git pull（不另 checkout 副本、不 xcopy 到别的目录）。
 * 流程：检测 git 更新 → npm install → 停止 Nginx → 构建前端 →
 *       启动/重载 Nginx(8080) → 重启 dev server(3003) → 重启后端 pm2(qygl) → 健康检查。
 * 触发：每 5 分钟轮询；无新提交则【跳过阶段2~10全部部署动作】。
 *
 * ⚠️ 关键运维前提（务必满足，否则 pm2/nginx 操作会失败）：
 *   1. Jenkins 服务/agent 必须运行在【与平时启动 pm2、nginx 相同的 Windows 用户】下，
 *      pm2 守护进程按用户隔离，跨用户 `pm2 restart qygl` 会找不到进程。
 *   2. 部署机需具备：git(且 E:\qygl\qygl 是可 git pull 的仓库)、node/npm(建议加入 PATH，
 *      否则改 NODE_HOME)、全局 pm2、nginx。
 *   3. 流水线用 `bat` 调用 `powershell -Command`，无需额外 Jenkins 插件（仅需默认 Git/Pipeline）。
 * ------------------------------------------------------------
 *
 * v1.2.15 修复：
 *   - 无新提交时跳过全部部署阶段：改用管道顶层 Groovy 变量 `skipDeploy` + `when { expression { !skipDeploy } }`。
 *     之前用 `environment { SKIP_DEPLOY='0' }` + `when { environment name:'SKIP_DEPLOY', value:'0' }` 失效——
 *     pipeline 级 environment 会在每个阶段开始前把 SKIP_DEPLOY 重新注入成 '0'，覆盖阶段1里的赋值，导致无提交也全量执行。
 *   - 阶段6 启动 vite 前先清掉 3003 上的陈旧监听进程，避免新实例 EADDRINUSE 退出（此前 qygl-dev 一直 errored/stopped）。
 */
boolean skipDeploy = false   // 顶层 Groovy 变量，供 when{expression} 实时读取（比 environment 条件可靠）

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
    NGINX_PM2     = 'qygl-nginx'                                          // nginx 的 pm2 进程名
    DEV_PM2       = 'qygl-dev'                                            // vite dev server 的 pm2 进程名
  }

  triggers {
    cron('H/5 * * * *')                                                   // 每 5 分钟轮询（防止 webhook 漏触发）；无提交会自动跳过
  }

  options {
    buildDiscarder(logRotator(numToKeepStr: '10'))
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  stages {
    // 阶段1：拉取代码并检测是否有新提交（始终执行）
    stage('Git Pull') {
      steps {
        echo "=== 阶段1: 检测/拉取最新代码 (${PROJECT_DIR}) ==="
        dir("${PROJECT_DIR}") {
          bat "git fetch origin ${GIT_BRANCH}"
          script {
            // 只抽取 40 位 SHA，排除 cmd 回显的命令文本，否则比较永远不相等 → 每次都误判为"有更新"
            def rawLocal  = bat(returnStdout: true, script: "git rev-parse ${GIT_BRANCH}").trim()
            def rawRemote = bat(returnStdout: true, script: "git rev-parse origin/${GIT_BRANCH}").trim()
            def local  = (rawLocal  =~ /[0-9a-f]{40}/) ? (rawLocal  =~ /[0-9a-f]{40}/)[0] : ''
            def remote = (rawRemote =~ /[0-9a-f]{40}/) ? (rawRemote =~ /[0-9a-f]{40}/)[0] : ''
            if (local == remote && local != '') {
              echo '✅ 无新提交，跳过本次部署（阶段2~10 全部跳过）'
              skipDeploy = true
            } else {
              echo '🔄 检测到新提交，开始更新...'
              skipDeploy = false
              bat "git reset --hard origin/${GIT_BRANCH}"
            }
          }
        }
      }
    }

    // 阶段2：安装依赖（仅在有更新时）
    stage('Install Dependencies') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段2: 安装依赖 ==='
        dir("${PROJECT_DIR}") { bat 'npm install' }
      }
    }

    // 阶段3：停止 Nginx（必须在构建前，否则 nginx 占用 dist/index.html 导致 EPERM 写失败）
    stage('Stop Nginx') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段3: 停止 Nginx（交由 pm2 托管前先清掉旧进程）==='
        // pm2 stop/delete 失败时静默；再兜底 taskkill，确保 dist 不被占用；无论结果如何 exit 0
        bat "pm2 stop ${NGINX_PM2} 2>nul & pm2 delete ${NGINX_PM2} 2>nul & taskkill /f /im nginx.exe 2>nul & echo Nginx 已停止/原本未运行 & exit /b 0"
      }
    }

    // 阶段4：前端构建
    stage('Build') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段4: 前端构建 (npm run build) ==='
        dir("${PROJECT_DIR}") { bat 'npm run build' }
      }
    }

    // 阶段5：启动 Nginx（生产 8080）—— 由 pm2 托管，构建结束不被 Jenkins 杀掉
    stage('Start Nginx (pm2)') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段5: 启动 Nginx(8080)，交由 pm2 常驻托管 ==='
        // 先容忍式删除旧实例（不存在也不报错），再干净启动，避免 pm2 报 "already exists"
        bat "pm2 delete ${NGINX_PM2} 2>nul & exit /b 0"
        bat "pm2 start \"${NGINX_EXE}\" --name ${NGINX_PM2} --cwd \"${NGINX_DIR}\""
        bat 'ping -n 3 127.0.0.1 >nul'
      }
    }

    // 阶段6：重启前端 dev server（3003，普通 npm run dev 进程）—— 同样交 pm2 托管
    stage('Restart Dev Server (3003)') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段6: 重启前端 dev server (3003)，交由 pm2 常驻托管 ==='
        // 容忍式删除：qygl-dev 不存在时 pm2 delete 会返回 1，必须 & exit /b 0，否则阶段失败导致后续阶段全部 skip
        bat "pm2 delete ${DEV_PM2} 2>nul & exit /b 0"
        // 清掉 3003 上的陈旧监听，避免新 vite 因 EADDRINUSE 退出（此前 qygl-dev 一直 errored/stopped 的根因）
        bat "for /f \"tokens=5\" %a in ('netstat -aon ^| findstr :${DEV_PORT} ^| findstr LISTENING') do taskkill /f /pid %a 2>nul"
        bat "pm2 start npm --name ${DEV_PM2} --cwd \"${PROJECT_DIR}\" -- run dev"
        echo '✅ dev server 已交由 pm2 托管 (3003)'
      }
    }

    // 阶段6.5：验证 dev server（3003，弥补此前未检查导致"假绿"）
    stage('Verify Dev Server (3003)') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段6.5: 验证前端 dev server (3003) ==='
        bat "ping -n 6 127.0.0.1 >nul"
        // dev server 正常应返回 200；返回任何 HTTP 状态（含 404）都说明进程已在 3003 监听，视为就绪
        bat "powershell -Command \"\$ok=\$false; for(\$i=1; \$i-le 10; \$i++){ try { \$r=Invoke-WebRequest -Uri 'http://127.0.0.1:${DEV_PORT}' -TimeoutSec 5 -UseBasicParsing -MaximumRedirection 0; Write-Host ('dev server 状态: ' + \$r.StatusCode); \$ok=\$true; break } catch { \$st=\$null; if(\$_.Exception.Response){ \$st=[int]\$_.Exception.Response.StatusCode }; if(\$st -ge 400){ Write-Host ('dev server 状态: ' + \$st + ' (已就绪)'); \$ok=\$true; break }; Write-Host ('  重试 ' + \$i + ': ' + \$_.Exception.Message); Start-Sleep -Seconds 3 } }; if(-not \$ok){ Write-Host '⚠️ dev server 3003 未就绪，可能 npm run dev 启动失败或被占用' }; exit 0\""
      }
    }

    // 阶段7：重启后端（pm2 qygl）
    stage('Restart Backend (pm2)') {
      when { expression { return !skipDeploy } }
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
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段8: 验证后端 (3005) ==='
        // 用 127.0.0.1 避免 localhost 解析到 IPv6(::1)；后端启动较慢，最多重试 15 次(约 60s)
        bat "powershell -Command \"\$ok=\$false; for(\$i=1; \$i-le 15; \$i++){ try { \$r=Invoke-WebRequest -Uri 'http://127.0.0.1:${SERVER_PORT}/api/projects' -TimeoutSec 5 -UseBasicParsing -MaximumRedirection 0; Write-Host ('后端状态: ' + \$r.StatusCode); \$ok=\$true; break } catch { \$st=\$null; if(\$_.Exception.Response){ \$st=[int]\$_.Exception.Response.StatusCode }; if(\$st -ge 400){ Write-Host ('后端状态: ' + \$st + ' (已就绪，需鉴权)'); \$ok=\$true; break }; Write-Host ('  重试 ' + \$i + ': ' + \$_.Exception.Message); Start-Sleep -Seconds 4 } }; if(-not \$ok){ Write-Host '⚠️ 后端 60s 内未就绪，请检查 pm2 日志' }; exit 0\""
      }
    }

    // 阶段9：验证前端（nginx 8080）
    stage('Verify Frontend') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段9: 验证前端 (nginx 8080) ==='
        bat "powershell -Command \"\$ok=\$false; for(\$i=1; \$i-le 10; \$i++){ try { \$r=Invoke-WebRequest -Uri 'http://127.0.0.1:${FRONTEND_PORT}' -TimeoutSec 5 -UseBasicParsing -MaximumRedirection 0; Write-Host ('前端状态: ' + \$r.StatusCode); \$ok=\$true; break } catch { \$st=\$null; if(\$_.Exception.Response){ \$st=[int]\$_.Exception.Response.StatusCode }; if(\$st -ge 400){ Write-Host ('前端状态: ' + \$st + ' (已就绪)'); \$ok=\$true; break }; Write-Host ('  重试 ' + \$i + ': ' + \$_.Exception.Message); Start-Sleep -Seconds 3 } }; if(-not \$ok){ Write-Host '⚠️ 前端未就绪，请检查 nginx 日志' }; exit 0\""
      }
    }

    // 阶段10：PM2 状态
    stage('PM2 Status') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段10: PM2 状态 ==='
        bat 'pm2 status'
      }
    }
  }

  post {
    success {
      echo '🎉 流水线执行成功'
      echo "部署目录: ${PROJECT_DIR} | skipDeploy=${skipDeploy}"
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
