pipeline {
  agent any
  
  environment {
    NODE_HOME = tool name: 'NodeJS_20', type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
    PATH = "${NODE_HOME}/bin:${env.PATH}"
    PROJECT_DIR = 'Project_qygl'
    DEPLOY_DIR = 'D:/deploy/qygl'
    SERVER_PORT = '3005'
    FRONTEND_PORT = '3003'
    GIT_REPO = 'git@github.com:panweippc/qygl.git'
    GIT_BRANCH = 'main'
    PM2_APP_NAME = 'qygl-backend'
  }
  
  triggers {
    pollSCM('H/5 * * * *')
  }
  
  options {
    buildDiscarder(logRotator(numToKeepStr: '5'))
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }
  
  stages {
    stage('Checkout') {
      steps {
        echo '=== 阶段1: 拉取代码 ==='
        checkout([
          $class: 'GitSCM',
          branches: [[name: "*/${GIT_BRANCH}"]],
          userRemoteConfigs: [[url: "${GIT_REPO}"]],
          extensions: [
            [$class: 'RelativeTargetDirectory', relativeTargetDir: "${PROJECT_DIR}"],
            [$class: 'CloneOption', depth: 1, shallow: true]
          ]
        ])
      }
    }
    
    stage('Install Dependencies') {
      steps {
        echo '=== 阶段2: 安装依赖 ==='
        dir("${PROJECT_DIR}") {
          bat 'npm install'
        }
      }
    }
    
    stage('Build') {
      steps {
        echo '=== 阶段3: 前端构建 ==='
        dir("${PROJECT_DIR}") {
          bat 'npm run build'
        }
      }
      post {
        success {
          echo '✅ 前端构建成功'
        }
        failure {
          echo '❌ 前端构建失败'
          error '前端构建失败，流水线终止'
        }
      }
    }
    
    stage('Stop Service') {
      steps {
        echo '=== 阶段4: 停止旧服务 ==='
        script {
          try {
            bat 'pm2 stop qygl-backend 2>nul || echo PM2进程未运行'
            bat 'pm2 delete qygl-backend 2>nul || echo PM2进程已删除'
          } catch (e) {
            echo "停止服务失败: ${e.getMessage()}"
          }
        }
      }
    }
    
    stage('Deploy') {
      steps {
        echo '=== 阶段5: 部署应用 ==='
        script {
          bat "if not exist ${DEPLOY_DIR} mkdir ${DEPLOY_DIR}"
          bat "if exist ${DEPLOY_DIR}\\server rmdir /s /q ${DEPLOY_DIR}\\server"
          bat "if exist ${DEPLOY_DIR}\\dist rmdir /s /q ${DEPLOY_DIR}\\dist"
          
          bat "xcopy ${PROJECT_DIR}\\server ${DEPLOY_DIR}\\server /E /Y"
          bat "xcopy ${PROJECT_DIR}\\dist ${DEPLOY_DIR}\\dist /E /Y"
          bat "copy ${PROJECT_DIR}\\server.js ${DEPLOY_DIR}\\server.js /Y"
          bat "copy ${PROJECT_DIR}\\package.json ${DEPLOY_DIR}\\package.json /Y"
          bat "copy ${PROJECT_DIR}\\vite.config.ts ${DEPLOY_DIR}\\vite.config.ts /Y"
          bat "copy ${PROJECT_DIR}\\tsconfig.json ${DEPLOY_DIR}\\tsconfig.json /Y"
        }
      }
    }
    
    stage('Install Deploy Dependencies') {
      steps {
        echo '=== 阶段6: 安装部署环境依赖 ==='
        dir("${DEPLOY_DIR}") {
          bat 'npm install --production'
        }
      }
    }
    
    stage('Start Service') {
      steps {
        echo '=== 阶段7: 启动服务 ==='
        dir("${DEPLOY_DIR}") {
          script {
            bat 'pm2 start server.js --name qygl-backend'
            bat 'pm2 save'
            echo '✅ 后端服务已启动'
          }
        }
      }
    }
    
    stage('Verify Backend') {
      steps {
        echo '=== 阶段8: 验证后端服务 ==='
        script {
          sleep(10)
          try {
            def response = httpRequest(
              url: "http://localhost:${SERVER_PORT}/api/projects",
              timeout: 30
            )
            echo "后端服务响应状态: ${response.status}"
            if (response.status == 200) {
              echo '✅ 后端服务启动成功'
            } else {
              error '❌ 后端服务启动失败'
            }
          } catch (e) {
            echo "验证失败: ${e.getMessage()}"
            currentBuild.result = 'UNSTABLE'
          }
        }
      }
    }
    
    stage('Verify Frontend') {
      steps {
        echo '=== 阶段9: 验证前端服务 ==='
        script {
          try {
            def response = httpRequest(
              url: "http://localhost:${FRONTEND_PORT}",
              timeout: 30
            )
            echo "前端服务响应状态: ${response.status}"
            if (response.status == 200) {
              echo '✅ 前端服务启动成功'
            } else {
              echo '⚠️ 前端服务可能需要通过后端代理访问'
            }
          } catch (e) {
            echo "前端验证失败: ${e.getMessage()}"
          }
        }
      }
    }
    
    stage('PM2 Status') {
      steps {
        echo '=== 阶段10: 检查PM2状态 ==='
        script {
          bat 'pm2 status'
        }
      }
    }
  }
  
  post {
    success {
      echo '🎉 CI/CD流水线执行成功！'
      echo "项目已部署到: ${DEPLOY_DIR}"
      echo "后端服务端口: ${SERVER_PORT}"
    }
    
    failure {
      echo '❌ CI/CD流水线执行失败！'
      script {
        try {
          bat 'pm2 logs qygl-backend --lines 50'
        } catch (e) {
          echo "获取日志失败: ${e.getMessage()}"
        }
      }
    }
    
    always {
      echo '=== 清理工作空间 ==='
      deleteDir()
    }
  }
}