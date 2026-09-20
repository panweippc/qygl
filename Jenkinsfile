/*
 * 智慧办公平台 (OA) · 自动化部署流水线
 * ------------------------------------------------------------
 * 拓扑：Jenkins 安装在【部署机】(E:\qygl\qygl 所在电脑)，本机本地执行。
 * 模型：原地 git pull（不另 checkout 副本、不 xcopy 到别的目录）。
 * 流程：检测 git 更新 → npm install → 停止 Nginx → 构建前端 →
 *       重启 Nginx(8080+9090, restart 即重新加载配置) → 启动 dev server(3003, nssm 服务 npm run dev 常驻) → 启动 mobile dev server(3004, nssm 服务 npm run dev:mobile 常驻) → 重启后端 pm2(qygl) → 健康检查。
 * 触发：每 5 分钟轮询；无新提交则【跳过阶段2~10全部部署动作】。
 *
 * ⚠️ 关键运维前提（务必满足，否则 pm2/nginx 操作会失败）：
 *   1. Jenkins 服务/agent 必须运行在【与平时启动 pm2、nginx 相同的 Windows 用户】下，
 *      pm2 守护进程按用户隔离，跨用户 `pm2 restart qygl` 会找不到进程。
 *   2. 部署机需具备：git(且 E:\qygl\qygl 是可 git pull 的仓库)、node/npm(建议加入 PATH，
 *      否则改 NODE_HOME)、全局 pm2、nginx、nssm(nssm.exe 需在 PATH，用于把 vite dev server
 *      注册为 Windows 服务常驻 3003 与 3004，避免 start /b 被 Jenkins 会话/进程树清理杀掉)。
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
 *
 * v1.2.33 修复：
 *   - 阶段6 启动 dev server 由 `pm2 start npm -- run dev` 改为 `pm2 start <NODE_HOME>/node.exe -- ./node_modules/vite/bin/vite.js`：
 *     Windows 下 pm2 无法解析 npm.cmd，`qygl-dev` 进程从未注册、3003 长期不可用（流水线"假绿"）。直接调 node.exe 可靠拉起。
 *
 * v1.2.37 修复：
 *   - 合并 Nginx 重启与配置重载：阶段3 停止时不再 `pm2 delete`（保留 pm2 条目），
 *     阶段5 改为 `pm2 restart qygl-nginx || pm2 start ...`（restart 即重启并重新读取最新 conf），
 *     删除原阶段5.5 独立的 `nginx -s reload`（全新启动已加载配置，reload 冗余）。
 *
 * v1.2.38 修复（3003 彻底常驻）：
 *   - 阶段6 改用 nssm 把 dev server 注册为 Windows 服务(qygl-dev)常驻：首次 nssm install
 *     (直调 node.exe + npm-cli.js run dev，规避 pm2/Windows 不解析 npm.cmd)，AppExit Default
 *     Restart 保证崩溃自启、服务器重启也在；每次部署 nssm restart 拉起最新代码。
 *   - 解决此前 start /b 启动的 dev server 不归 pm2、被 Jenkins 会话/进程树清理杀掉(3003 周期性掉)的问题。
 *   - 部署机未装 nssm 时自动回退 start /b（不阻断构建，但重启仍会掉，需运维补装 nssm 并赋权）。
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
    DEV_MOBILE_PORT = '3004'                                              // 移动端开发前端（vite dev:mobile）
    DEV_MOBILE_PM2  = 'qygl-dev-mobile'                                   // 移动端 dev server 的 nssm 服务名
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
        echo '=== 阶段3: 停止 Nginx（仅 stop + taskkill，保留 pm2 条目供阶段5 restart 复用）==='
        // 不再 pm2 delete（否则阶段5 的 restart 无可重启条目）；taskkill 确保 8080 端口释放避免构建 EPERM
        bat "pm2 stop ${NGINX_PM2} 2>nul & taskkill /f /im nginx.exe 2>nul & echo Nginx 已停止/原本未运行 & exit /b 0"
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

    // 阶段5：重启 Nginx（生产 8080）—— 复用已有 pm2 条目 restart（同时重新加载最新配置），不存在则 start
    stage('Start Nginx (pm2)') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段5: 重启 Nginx(8080)（pm2 restart 即重启+重载配置，零停机应用新 conf）==='
        // 阶段3 仅 stop+taskkill（保留 pm2 条目），此处 restart 复用条目并重新读取 git pull 来的 nginx 配置；
        // 条目不存在（首次部署）则回退 start 创建；失败不阻断后续阶段
        bat "pm2 restart ${NGINX_PM2} 2>nul || pm2 start \"${NGINX_EXE}\" --name ${NGINX_PM2} --cwd \"${NGINX_DIR}\" || exit /b 0"
        bat 'ping -n 3 127.0.0.1 >nul'
      }
    }

    // 阶段6：启动前端 dev server（3003）—— 经 nssm 注册为 Windows 服务常驻（等价于 npm run dev，不进 pm2）
    stage('Start Dev Server (3003, nssm)') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段6: 启动前端 dev server (3003)，经 nssm 注册为 Windows 服务常驻（npm run dev）==='
        // 清掉 3003 上的陈旧监听（历史 start /b 进程可能仍占用），避免 nssm 首次 install/start 时 EADDRINUSE
        bat "powershell -Command \"try { \$ps=(Get-NetTCPConnection -LocalPort ${DEV_PORT} -ErrorAction SilentlyContinue | Where-Object { \$_.State -eq 'Listen' }).OwningProcess; foreach(\$p in \$ps){ Stop-Process -Id \$p -Force -ErrorAction SilentlyContinue }; Write-Host ('cleared stale listener on port ${DEV_PORT}') } catch { Write-Host ('clear port error: ' + \$_.Exception.Message) }; exit 0\""
        bat "ping -n 2 127.0.0.1 >nul"
        // 通过 nssm 把 dev server 注册为服务常驻：首次 install(node.exe + npm-cli.js run dev)，
        // AppExit Default Restart 保证崩溃/重启服务器后自启；之后每次部署 nssm restart 拉起最新代码。
        // 部署机未装 nssm 时回退 start /b（不阻断构建，但重启会掉，需运维补装 nssm 并赋权）。
        bat """
          where nssm >nul 2>nul && (
            nssm get ${DEV_PM2} Application >nul 2>nul || (
              nssm install ${DEV_PM2} "${NODE_HOME}/node.exe" "${NODE_HOME}/node_modules/npm/bin/npm-cli.js" run dev
              nssm set ${DEV_PM2} AppDirectory "${PROJECT_DIR}"
              nssm set ${DEV_PM2} AppStdout "${PROJECT_DIR}/devserver.log"
              nssm set ${DEV_PM2} AppStderr "${PROJECT_DIR}/devserver.log"
              nssm set ${DEV_PM2} AppExit Default Restart
              nssm set ${DEV_PM2} DisplayName "qygl dev server (3003)"
            )
            nssm restart ${DEV_PM2} || nssm start ${DEV_PM2}
          ) || (
            echo [warn] nssm not installed, fallback to start /b npm run dev (not persistent after reboot)
            cd /d ${PROJECT_DIR} && start /b cmd /c "npm run dev > ${PROJECT_DIR}/devserver.log 2>&1"
          )
        """
        echo '✅ dev server 阶段完成 (3003)'
      }
    }

    // 阶段6.2：启动移动端 dev server（3004）—— 经 nssm 注册为 Windows 服务常驻（等价于 npm run dev:mobile）
    stage('Start Mobile Dev Server (3004, nssm)') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段6.2: 启动移动端 dev server (3004)，经 nssm 注册为 Windows 服务常驻（npm run dev:mobile）==='
        // 清掉 3004 上的陈旧监听（历史 start /b 进程可能仍占用），避免 nssm 首次 install/start 时 EADDRINUSE
        bat "powershell -Command \"try { \$ps=(Get-NetTCPConnection -LocalPort ${DEV_MOBILE_PORT} -ErrorAction SilentlyContinue | Where-Object { \$_.State -eq 'Listen' }).OwningProcess; foreach(\$p in \$ps){ Stop-Process -Id \$p -Force -ErrorAction SilentlyContinue }; Write-Host ('cleared stale listener on port ${DEV_MOBILE_PORT}') } catch { Write-Host ('clear port error: ' + \$_.Exception.Message) }; exit 0\""
        bat "ping -n 2 127.0.0.1 >nul"
        bat """
          where nssm >nul 2>nul && (
            nssm get ${DEV_MOBILE_PM2} Application >nul 2>nul || (
              nssm install ${DEV_MOBILE_PM2} "${NODE_HOME}/node.exe" "${NODE_HOME}/node_modules/npm/bin/npm-cli.js" run dev:mobile
              nssm set ${DEV_MOBILE_PM2} AppDirectory "${PROJECT_DIR}"
              nssm set ${DEV_MOBILE_PM2} AppStdout "${PROJECT_DIR}/devserver-mobile.log"
              nssm set ${DEV_MOBILE_PM2} AppStderr "${PROJECT_DIR}/devserver-mobile.log"
              nssm set ${DEV_MOBILE_PM2} AppExit Default Restart
              nssm set ${DEV_MOBILE_PM2} DisplayName "qygl mobile dev server (3004)"
            )
            nssm restart ${DEV_MOBILE_PM2} || nssm start ${DEV_MOBILE_PM2}
          ) || (
            echo [warn] nssm not installed, fallback to start /b npm run dev:mobile (not persistent after reboot)
            cd /d ${PROJECT_DIR} && start /b cmd /c "npm run dev:mobile > ${PROJECT_DIR}/devserver-mobile.log 2>&1"
          )
        """
        echo '✅ mobile dev server 阶段完成 (3004)'
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

    // 阶段6.7：验证移动端 dev server（3004，弥补此前未检查导致"假绿"）
    stage('Verify Mobile Dev Server (3004)') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段6.7: 验证移动端 dev server (3004) ==='
        bat "ping -n 6 127.0.0.1 >nul"
        bat "powershell -Command \"\$ok=\$false; for(\$i=1; \$i-le 10; \$i++){ try { \$r=Invoke-WebRequest -Uri 'http://127.0.0.1:${DEV_MOBILE_PORT}' -TimeoutSec 5 -UseBasicParsing -MaximumRedirection 0; Write-Host ('mobile dev server status: ' + \$r.StatusCode); \$ok=\$true; break } catch { \$st=\$null; if(\$_.Exception.Response){ \$st=[int]\$_.Exception.Response.StatusCode }; if(\$st -ge 400){ Write-Host ('mobile dev server status: ' + \$st + ' (ready)'); \$ok=\$true; break }; Write-Host ('  retry ' + \$i + ': ' + \$_.Exception.Message); Start-Sleep -Seconds 3 } }; if(-not \$ok){ Write-Host 'WARN: mobile dev server 3004 not ready' }; exit 0\""
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
        echo '=== 阶段9: 验证前端 (nginx 8080 + 9090) ==='
        bat "powershell -Command \"\$ok=\$false; for(\$i=1; \$i-le 10; \$i++){ try { \$r=Invoke-WebRequest -Uri 'http://127.0.0.1:${FRONTEND_PORT}' -TimeoutSec 5 -UseBasicParsing -MaximumRedirection 0; Write-Host ('frontend status: ' + \$r.StatusCode); \$ok=\$true; break } catch { \$st=\$null; if(\$_.Exception.Response){ \$st=[int]\$_.Exception.Response.StatusCode }; if(\$st -ge 400){ Write-Host ('frontend status: ' + \$st + ' (ready)'); \$ok=\$true; break }; Write-Host ('  retry ' + \$i + ': ' + \$_.Exception.Message); Start-Sleep -Seconds 3 } }; if(-not \$ok){ Write-Host 'WARN: frontend not ready' }; exit 0\""
        // 9090 为反代到 3004 的 nginx 站点，能返回 200 即说明 nginx 已加载新配置并监听 9090
        bat "powershell -Command \"\$ok=\$false; for(\$i=1; \$i-le 10; \$i++){ try { \$r=Invoke-WebRequest -Uri 'http://127.0.0.1:9090' -TimeoutSec 5 -UseBasicParsing -MaximumRedirection 0; Write-Host ('mobile nginx 9090 status: ' + \$r.StatusCode); \$ok=\$true; break } catch { \$st=\$null; if(\$_.Exception.Response){ \$st=[int]\$_.Exception.Response.StatusCode }; if(\$st -ge 400){ Write-Host ('mobile nginx 9090 status: ' + \$st + ' (ready)'); \$ok=\$true; break }; Write-Host ('  retry ' + \$i + ': ' + \$_.Exception.Message); Start-Sleep -Seconds 3 } }; if(-not \$ok){ Write-Host 'WARN: nginx 9090 not ready' }; exit 0\""
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
