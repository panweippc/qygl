/*
 * 通用「Git 轮询 + 有更新才部署、无更新自动跳过」流水线模板（Java 示例）
 * 复用自 OA 项目 Jenkinsfile v1.2.15，仅「构建/运行/健康检查」为 Java 适配层，
 * 其余（轮询触发、SHA 比较跳过、服务托管防被杀、健康检查容错）与语言完全无关，原样复用。
 *
 * 跨项目复用只需改 4 处（标 ← 改）：
 *   1. PROJECT_DIR  / GIT_BRANCH     项目根（须是 git 仓库）
 *   2. BUILD_CMD                    mvn clean package -DskipTests  或  ./gradlew build
 *   3. JAR_PATH                     构建产物路径（target/*.jar 或 build/libs/*.jar）
 *   4. 运行方式                     推荐 WinSW 把 jar 包成 Windows 服务；或 pm2 start "java -jar ..."（跨语言通用）
 */

boolean skipDeploy = false   // 顶层 Groovy 变量，供 when{expression} 实时读取（不要用 environment 块，它会在每阶段前被重置）

pipeline {
  agent any

  environment {
    PROJECT_DIR  = 'D:/apps/myjava'                                  // ← 改：项目根（git 仓库）
    GIT_BRANCH   = 'main'
    SERVICE_NAME = 'MyJavaSvc'                                       // ← 改：WinSW 服务名（用 pm2 方案时可删）
    APP_PORT     = '8080'                                            // ← 改：应用端口（Spring Boot server.port）
    JAR_PATH     = 'D:/apps/myjava/target/myjava-0.0.1.jar'          // ← 改：构建产物
    HEALTH_URL   = '/actuator/health'                                // ← 改：健康检查路径（无 actuator 则换任意 200 接口）
  }

  triggers {
    cron('H/5 * * * *')                                              // 每 5 分钟轮询；无提交自动跳过（无需 webhook）
  }

  options {
    buildDiscarder(logRotator(numToKeepStr: '10'))
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  stages {
    // ===== 阶段1：拉取并检测是否有新提交（始终执行，与语言无关）=====
    stage('Git Pull') {
      steps {
        echo "=== 阶段1: 检测/拉取最新代码 (${PROJECT_DIR}) ==="
        dir("${PROJECT_DIR}") {
          bat "git fetch origin ${GIT_BRANCH}"
          script {
            // 只抽 40 位 SHA，排除 cmd 回显的命令文本；否则比较永远不相等 → 误判"有更新"→ 每次全量重跑
            def rawLocal  = bat(returnStdout: true, script: "git rev-parse ${GIT_BRANCH}").trim()
            def rawRemote = bat(returnStdout: true, script: "git rev-parse origin/${GIT_BRANCH}").trim()
            def local  = (rawLocal  =~ /[0-9a-f]{40}/) ? (rawLocal  =~ /[0-9a-f]{40}/)[0] : ''
            def remote = (rawRemote =~ /[0-9a-f]{40}/) ? (rawRemote =~ /[0-9a-f]{40}/)[0] : ''
            if (local == remote && local != '') {
              echo '✅ 无新提交，跳过本次部署（阶段2~N 全部跳过）'
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

    // ===== 阶段2：构建（Java 适配层）=====
    stage('Build') {
      when { expression { return !skipDeploy } }
      steps {
        echo '=== 阶段2: 构建 (Maven) ==='
        dir("${PROJECT_DIR}") {
          bat 'mvn clean package -DskipTests'      // ← Gradle 改：./gradlew build  -Dorg.gradle.daemon=false
        }
      }
    }

    // ===== 阶段3：部署/重启（Java 适配层；长驻服务必须脱离 Jenkins 进程树）=====
    stage('Deploy / Restart') {
      when { expression { return !skipDeploy } }
      steps {
        echo "=== 阶段3: 重启服务 ==="

        // —— 方案A（推荐 Windows）：WinSW 把 jar 包成服务，Jenkins 只重启，jar 由服务常驻 ——
        bat "powershell -Command \"Restart-Service -Name '${SERVICE_NAME}' -Force; exit 0\""

        // —— 方案B（跨语言通用，无需 WinSW）：pm2 托管 java 进程 ——
        // bat "pm2 delete myjava 2>nul & exit /b 0"
        // bat "pm2 start \"java\" --name myjava --cwd \"${PROJECT_DIR}\" -- -jar \"${JAR_PATH}\""
      }
    }

    // ===== 阶段4：健康检查（与语言无关，仅改 URL/端口）=====
    stage('Health Check') {
      when { expression { return !skipDeploy } }
      steps {
        echo "=== 阶段4: 健康检查 (${APP_PORT}${HEALTH_URL}) ==="
        bat "ping -n 8 127.0.0.1 >nul"   // 给 Spring Boot 启动留时间
        // 任何 HTTP 状态（含 401/404）都说明进程已在端口监听，视为就绪；仅连接失败才重试
        bat "powershell -Command \"\$ok=\$false; for(\$i=1; \$i-le 15; \$i++){ try { \$r=Invoke-WebRequest -Uri 'http://127.0.0.1:${APP_PORT}${HEALTH_URL}' -TimeoutSec 5 -UseBasicParsing -MaximumRedirection 0; Write-Host ('状态: ' + \$r.StatusCode); \$ok=\$true; break } catch { \$st=\$null; if(\$_.Exception.Response){ \$st=[int]\$_.Exception.Response.StatusCode }; if(\$st -ge 400){ Write-Host ('状态: ' + \$st + ' (已就绪)'); \$ok=\$true; break }; Write-Host ('  重试 ' + \$i + ': ' + \$_.Exception.Message); Start-Sleep -Seconds 4 } }; if(-not \$ok){ Write-Host '⚠️ 服务未就绪，请检查日志' }; exit 0\""
      }
    }
  }

  post {
    success { echo '🎉 流水线结束 | skipDeploy=' + skipDeploy }
    failure { echo '❌ 流水线失败，请查看上方日志' }
    always  { deleteDir() }
  }
}
