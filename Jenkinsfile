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
 *   ⚠️ 部署机系统代码页为 GBK(936)：`powershell -Command "..."` 内的【中文/emoji 会被错误解码成乱码】，
 *      导致 PowerShell 解析失败（如 "Try 缺少与其匹配的 Catch"），整条阶段返回非零并跳过后续所有阶段。
 *      → 所有 powershell -Command 字符串必须【全 ASCII/英文】，中文只能写在 Groovy `echo` 或 cmd `echo` 里。
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
        // 注意：不能用 bat 的 for/f %a（临时.bat 里 %a 被当环境变量→语法错误退出255）；
        //      也不能用 taskkill 直接清（失败即非零退出码→拖垮阶段）。统一用 powershell + try/catch + 强制 exit 0
        bat "powershell -Command \"try { \$ps=(Get-NetTCPConnection -LocalPort ${DEV_PORT} -ErrorAction SilentlyContinue | Where-Object { \$_.State -eq 'Listen' }).OwningProcess; foreach(\$p in \$ps){ Stop-Process -Id \$p -Force -ErrorAction SilentlyContinue }; Write-Host ('cleared stale listener on port ${DEV_PORT}') } catch { Write-Host ('clear port error: ' + \$_.Exception.Message) }; exit 0\""
        bat "ping -n 2 127.0.0.1 >nul"
        // dev server 启动失败【不应】阻断后端重启：用 || 兜底并 exit 0，避免阶段6失败导致阶段7(重启后端)被整条流水线跳过
        bat "pm2 start npm --name ${DEV_PM2} --cwd \"${PROJECT_DIR}\" -- run dev || echo [warn] dev server 启动失败，不影响后端部署（可稍后手动 pm2 start ${DEV_PM2}）"
        echo '✅ dev server 阶段完成 (3003)'
      }
    }

    // 阶段6.5：验证 dev server（3003，弥补此前未检查导致"假绿"）
    stage('Verify Dev Server (3003)') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段6.5: 验证前端 dev server (3003) ==='
        bat "ping -n 6 127.0.0.1 >nul"
        // dev server 正常应返回 200；返回任何 HTTP 状态（含 404）都说明进程已在 3003 监听，视为就绪
        bat "powershell -Command \"\$ok=\$false; for(\$i=1; \$i-le 10; \$i++){ try { \$r=Invoke-WebRequest -Uri 'http://127.0.0.1:${DEV_PORT}' -TimeoutSec 5 -UseBasicParsing -MaximumRedirection 0; Write-Host ('dev server status: ' + \$r.StatusCode); \$ok=\$true; break } catch { \$st=\$null; if(\$_.Exception.Response){ \$st=[int]\$_.Exception.Response.StatusCode }; if(\$st -ge 400){ Write-Host ('dev server status: ' + \$st + ' (ready)'); \$ok=\$true; break }; Write-Host ('  retry ' + \$i + ': ' + \$_.Exception.Message); Start-Sleep -Seconds 3 } }; if(-not \$ok){ Write-Host 'WARN: dev server 3003 not ready' }; exit 0\""
      }
    }

    // 阶段7：重启后端（pm2 qygl）
    stage('Restart Backend (pm2)') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段7: 重启后端 (pm2 qygl) ==='
        dir("${PROJECT_DIR}") {
          // 采用 delete + start（而非 restart）确保完整重载新代码，避免 fork 进程残留旧模块；
          // 进程不存在时 delete 失败用 & 继续（cmd 中 ; 不是命令分隔符，必须用 &），最终由 start 兜底拉起；
          // 末尾 & exit /b 0 确保 pm2 任何非致命报错都不会让本阶段判失败（否则会跳过阶段8~10 健康检查）
          bat "pm2 delete ${PM2_APP_NAME} 2>nul & pm2 start server.js --name ${PM2_APP_NAME} --cwd \"${PROJECT_DIR}\" & exit /b 0"
          bat 'pm2 save'
          // 诊断输出：确认后端进程确实已拉起（uptime/restart 数），便于排查"看似没重启"的问题
          bat "pm2 describe ${PM2_APP_NAME} || pm2 status"
        }
      }
    }

    // 阶段8：验证后端
    stage('Verify Backend') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段8: 验证后端 (3005) ==='
        // 用 127.0.0.1 避免 localhost 解析到 IPv6(::1)；后端启动较慢，最多重试 15 次(约 60s)
        bat "powershell -Command \"\$ok=\$false; for(\$i=1; \$i-le 15; \$i++){ try { \$r=Invoke-WebRequest -Uri 'http://127.0.0.1:${SERVER_PORT}/api/projects' -TimeoutSec 5 -UseBasicParsing -MaximumRedirection 0; Write-Host ('backend status: ' + \$r.StatusCode); \$ok=\$true; break } catch { \$st=\$null; if(\$_.Exception.Response){ \$st=[int]\$_.Exception.Response.StatusCode }; if(\$st -ge 400){ Write-Host ('backend status: ' + \$st + ' (ready, needs auth)'); \$ok=\$true; break }; Write-Host ('  retry ' + \$i + ': ' + \$_.Exception.Message); Start-Sleep -Seconds 4 } }; if(-not \$ok){ Write-Host 'WARN: backend not ready within 60s' }; exit 0\""
      }
    }

    // 阶段9：验证前端（nginx 8080）
    stage('Verify Frontend') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段9: 验证前端 (nginx 8080) ==='
        bat "powershell -Command \"\$ok=\$false; for(\$i=1; \$i-le 10; \$i++){ try { \$r=Invoke-WebRequest -Uri 'http://127.0.0.1:${FRONTEND_PORT}' -TimeoutSec 5 -UseBasicParsing -MaximumRedirection 0; Write-Host ('frontend status: ' + \$r.StatusCode); \$ok=\$true; break } catch { \$st=\$null; if(\$_.Exception.Response){ \$st=[int]\$_.Exception.Response.StatusCode }; if(\$st -ge 400){ Write-Host ('frontend status: ' + \$st + ' (ready)'); \$ok=\$true; break }; Write-Host ('  retry ' + \$i + ': ' + \$_.Exception.Message); Start-Sleep -Seconds 3 } }; if(-not \$ok){ Write-Host 'WARN: frontend not ready' }; exit 0\""
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
      // 注意：pm2 logs --lines N 在本机 pm2 版本会进入 [TAILING] 持续流式输出、永不退出，
      // 触发 30 分钟 timeout 把整条流水线判失败。改为直接读取日志文件末尾（非流式），纯 ASCII，必然退出。
      bat "powershell -Command \"Get-Content (Join-Path \$env:USERPROFILE ('.pm2/logs/${PM2_APP_NAME}-error.log')) -Tail 50 -ErrorAction SilentlyContinue; Get-Content (Join-Path \$env:USERPROFILE ('.pm2/logs/${PM2_APP_NAME}-out.log')) -Tail 30 -ErrorAction SilentlyContinue; exit 0\""
    }
    always {
      echo '=== 清理 Jenkins 工作区 ==='
      deleteDir()
    }
  }
}
