import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3005;

// 跟踪用户登录状态，用于单设备登录限制
const userSessions = new Map(); // 键: 用户名, 值: socket.id

// 导入路由模块
import workflowRouter, { initWorkflowEngine } from './server/routes/workflow.js';
import authRouter from './server/routes/auth.js';
import employeesRouter from './server/routes/employees.js';
import weeklyReportsRouter from './server/routes/weekly-reports.js';
import toolsRouter from './server/routes/tools.js';
import salesRouter from './server/routes/sales.js';
import attendanceRouter from './server/routes/attendance.js';
import reimbursementRouter from './server/routes/reimbursement.js';
import visitsRouter from './server/routes/visits.js';
import filesRouter from './server/routes/files.js';
import chatsRouter from './server/routes/chats.js';
import projectsRouter from './server/routes/projects.js';
import customersRouter from './server/routes/customers.js';
import meetingsRouter from './server/routes/meetings.js';
import officeSuppliesRouter from './server/routes/office-supplies.js';
import dealsRouter from './server/routes/deals.js';
import regionsRouter from './server/routes/regions.js';
import systemRouter from './server/routes/system.js';
import approvalsRouter from './server/routes/approvals.js';
import distributeRouter from './server/routes/distribute.js';
import projectApplicationsRouter from './server/routes/project-applications.js';
import businessTripsRouter from './server/routes/business-trips.js';

// 启用CORS

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Charset']
}));

// 确保正确处理UTF-8编码
app.use((req, res, next) => {
  // 设置响应编码
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Accept-Charset', 'utf-8');
  next();
});

// 解析JSON请求体，确保使用UTF-8编码
app.use(express.json({ 
  charset: 'utf-8'
}));

// 解析URL编码的请求体，确保使用UTF-8编码
app.use(express.urlencoded({ 
  extended: true, 
  charset: 'utf-8'
}));

// API 统一响应辅助函数
app.use((req, res, next) => {
  res.success = (data = null, message = '成功') => res.json({ success: true, data, message });
  res.fail = (message = '失败', status = 400) => res.status(status).json({ success: false, message });
  next();
});

// 挂载工作流路由
app.use('/api', workflowRouter);

// 挂载业务路由模块
app.use('/api', authRouter);
app.use('/api', employeesRouter);
app.use('/api', weeklyReportsRouter);
app.use('/api', toolsRouter);
app.use('/api', salesRouter);
app.use('/api', attendanceRouter);
app.use('/api', reimbursementRouter);
app.use('/api', visitsRouter);
app.use('/api', filesRouter);
app.use('/api', chatsRouter);
app.use('/api', projectsRouter);
app.use('/api', customersRouter);
app.use('/api', meetingsRouter);
app.use('/api', officeSuppliesRouter);
app.use('/api', dealsRouter);
app.use('/api', regionsRouter);
app.use('/api', systemRouter);
app.use('/api', approvalsRouter);
app.use('/api', distributeRouter);
app.use('/api', projectApplicationsRouter);
app.use('/api', businessTripsRouter);

// 创建数据库连接池
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root123456',
  database: 'qyglfb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// 将数据库连接池设置到app.locals，供路由使用
app.locals.pool = pool;
app.locals.userSessions = userSessions;

// 创建数据库
const createDatabase = async () => {
  try {
    // 创建一个不指定数据库的连接
    const tempPool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: 'root123456',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4'
    });
    
    const connection = await tempPool.getConnection();
    // 只在数据库不存在时创建，不删除现有数据库
    await connection.execute('CREATE DATABASE IF NOT EXISTS qyglfb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('数据库检查/创建成功');
    connection.release();
    tempPool.end();
    return true;
  } catch (error) {
    console.error('创建数据库失败:', error);
    return false;
  }
};

// 测试数据库连接
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return false;
  }
};

// 初始化数据库表结构
const initDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
    // 设置字符编码
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');
    await connection.execute('SET collation_connection = utf8mb4_unicode_ci');
    await connection.execute('SET character_set_client = utf8mb4');
    await connection.execute('SET character_set_results = utf8mb4');
    await connection.execute('SET character_set_server = utf8mb4');
    
    // 创建users表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        createdAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建employees表（扩展版本）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        department VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        position VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(255) NOT NULL,
        entryDate DATETIME NOT NULL,
        createdAt DATETIME NOT NULL,
        -- 员工状态：在职、离职、试用期、休假
        status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '在职',
        -- 员工类型：正式员工、实习生、外包
        employeeType VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '正式员工',
        -- 系统角色ID
        roleId INT,
        -- 扩展信息字段
        education VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        birthDate DATE,
        idCard VARCHAR(18) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        address VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        emergencyContact VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        emergencyPhone VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        -- 组织架构支持
        parentDepartmentId INT,
        level INT DEFAULT 1,
        UNIQUE KEY unique_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 检查并添加新字段到employees表（如果表已存在）
    const newFields = [
      { name: 'status', type: "VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '在职'" },
      { name: 'employeeType', type: "VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '正式员工'" },
      { name: 'education', type: "VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" },
      { name: 'birthDate', type: "DATE" },
      { name: 'idCard', type: "VARCHAR(18) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" },
      { name: 'address', type: "VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" },
      { name: 'emergencyContact', type: "VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" },
      { name: 'emergencyPhone', type: "VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" },
      { name: 'parentDepartmentId', type: "INT" },
      { name: 'level', type: "INT DEFAULT 1" },
      { name: 'roleId', type: "INT" },
      { name: 'id', type: "INT AUTO_INCREMENT PRIMARY KEY" }
    ];
    
    for (const field of newFields) {
      try {
        const [columns] = await connection.execute(
          `SHOW COLUMNS FROM employees WHERE Field = ?`,
          [field.name]
        );
        if (columns.length === 0) {
          await connection.execute(
            `ALTER TABLE employees ADD COLUMN ${field.name} ${field.type}`
          );
          console.log(`添加字段 ${field.name} 成功`);
        }
      } catch (error) {
        console.log(`检查/添加字段 ${field.name}:`, error.message);
      }
    }
    
    // 创建weeklyReports表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS weeklyReports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        plan TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        files LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        userId INT NOT NULL,
        createdAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 检查并添加date字段（如果不存在）
    try {
      // 查询表结构，检查是否存在date字段
      const [columns] = await connection.execute(`
        SHOW COLUMNS FROM weeklyReports WHERE Field = 'date'
      `);
      
      // 如果不存在date字段，则添加
      if (columns.length === 0) {
        await connection.execute(`
          ALTER TABLE weeklyReports ADD COLUMN date VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        console.log('date字段添加成功');
      }
    } catch (error) {
      console.error('添加date字段失败:', error);
    }
    
    // 检查并修改files字段类型为LONGTEXT
    try {
      // 修改files字段类型为LONGTEXT
      await connection.execute(`
        ALTER TABLE weeklyReports MODIFY COLUMN files LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('files字段类型更新为LONGTEXT成功');
    } catch (error) {
      console.error('更新files字段类型失败:', error);
    }
    
    // 创建messages表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        chatId BIGINT NOT NULL,
        senderId VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        time VARCHAR(50) NOT NULL,
        isOwn BOOLEAN DEFAULT FALSE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_chatId (chatId),
        INDEX idx_createdAt (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 检查并更新senderId字段类型（如果需要）
    try {
      // 尝试修改senderId字段为VARCHAR类型
      await connection.execute(`
        ALTER TABLE messages MODIFY COLUMN senderId VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
      `);
      console.log('senderId字段类型更新成功');
    } catch (error) {
      console.error('更新senderId字段类型失败:', error);
    }
    
    // 检查并添加messages表的createdAt字段（如果不存在）
    try {
      const [msgColumns] = await connection.execute(`
        SHOW COLUMNS FROM messages WHERE Field = 'createdAt'
      `);
      if (msgColumns.length === 0) {
        await connection.execute(`
          ALTER TABLE messages ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        `);
        console.log('messages表createdAt字段添加成功');
      }
    } catch (error) {
      console.error('添加messages表createdAt字段失败:', error);
    }
    
    // 创建chats表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chats (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        lastMessage TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        time VARCHAR(50),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_createdAt (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 检查并添加chats表的createdAt字段（如果不存在）
    try {
      const [chatColumns] = await connection.execute(`
        SHOW COLUMNS FROM chats WHERE Field = 'createdAt'
      `);
      if (chatColumns.length === 0) {
        await connection.execute(`
          ALTER TABLE chats ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        `);
        console.log('chats表createdAt字段添加成功');
      }
    } catch (error) {
      console.error('添加chats表createdAt字段失败:', error);
    }
    
    // 检查并添加chats表的updatedAt字段（如果不存在）
    try {
      const [chatUpdateColumns] = await connection.execute(`
        SHOW COLUMNS FROM chats WHERE Field = 'updatedAt'
      `);
      if (chatUpdateColumns.length === 0) {
        await connection.execute(`
          ALTER TABLE chats ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        `);
        console.log('chats表updatedAt字段添加成功');
      }
    } catch (error) {
      console.error('添加chats表updatedAt字段失败:', error);
    }
    
    // 创建file_categories表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS file_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        createdAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建files表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        size INT NOT NULL,
        type VARCHAR(255) NOT NULL,
        url VARCHAR(255) NOT NULL,
        uploaderId INT NOT NULL,
        categoryId INT,
        createdAt DATETIME NOT NULL,
        FOREIGN KEY (uploaderId) REFERENCES users(id),
        FOREIGN KEY (categoryId) REFERENCES file_categories(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建projects表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        category VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        manager VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        link VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        createdAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建tools表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tools (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        category VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(18,2) NOT NULL,
        supplier VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        location VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        status VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        entryDate DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建customers表（客户管理）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        contact VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        phone VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        address VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        tags VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        status VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        createdAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建customer_activities表（客户跟进记录）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS customer_activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customerId INT NOT NULL,
        content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        followUpMethod VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        followUpTime DATETIME NOT NULL,
        createdAt DATETIME NOT NULL,
        FOREIGN KEY (customerId) REFERENCES customers(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建sales_funnel_stages表（销售漏斗阶段）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sales_funnel_stages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        orderIndex INT NOT NULL,
        createdAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建sales_funnel_data表（销售漏斗数据）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sales_funnel_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stageId INT NOT NULL,
        count INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        date DATE NOT NULL,
        createdAt DATETIME NOT NULL,
        FOREIGN KEY (stageId) REFERENCES sales_funnel_stages(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建city_sales表（盟市销售数据）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS city_sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        sales DECIMAL(10,2) NOT NULL,
        customers INT NOT NULL,
        growthRate DECIMAL(5,2) NOT NULL,
        createdAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建county_sales表（旗县销售数据）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS county_sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cityId INT NOT NULL,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        sales DECIMAL(10,2) NOT NULL,
        customers INT NOT NULL,
        createdAt DATETIME NOT NULL,
        FOREIGN KEY (cityId) REFERENCES city_sales(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建town_sales表（乡镇销售数据）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS town_sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        countyId INT NOT NULL,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        contactPerson VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        contactPhone VARCHAR(255) NOT NULL,
        manager VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        intention INT NOT NULL,
        requirement TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        isDealed TINYINT(1) DEFAULT 0,
        createdAt DATETIME NOT NULL,
        FOREIGN KEY (countyId) REFERENCES county_sales(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建visit_records表（拜访记录）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS visit_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        townId INT NOT NULL,
        customerName VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        address VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        visitDate DATE NOT NULL,
        visitPerson VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        visitContent TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        nextPlan TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        createdAt DATETIME NOT NULL,
        FOREIGN KEY (townId) REFERENCES town_sales(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 检查并添加manager字段（如果表已存在但缺少该字段）
    try {
      // 先检查字段是否存在
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'town_sales' AND COLUMN_NAME = 'manager'
      `);
      
      if (columns.length === 0) {
        // 字段不存在，添加字段
        await connection.execute(`
          ALTER TABLE town_sales 
          ADD COLUMN manager VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        console.log('manager字段添加成功');
      } else {
        console.log('manager字段已存在');
      }
    } catch (alterError) {
      console.log('manager字段检查/添加结果:', alterError.message);
    }
    
    // 创建closing_projects表（成交项目）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS closing_projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        status VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        startDate DATE NOT NULL,
        dealTime DATE NOT NULL,
        price DECIMAL(18,2) NOT NULL,
        serviceEndTime DATE NOT NULL,
        nextYearFeeStatus VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        provinceId INT,
        cityId INT,
        countyId INT,
        createdAt DATETIME NOT NULL,
        FOREIGN KEY (provinceId) REFERENCES provinces(id),
        FOREIGN KEY (cityId) REFERENCES cities(id),
        FOREIGN KEY (countyId) REFERENCES counties(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 检查并添加缺失的字段到closing_projects表
    try {
      const [columns] = await connection.execute(`
        SHOW COLUMNS FROM closing_projects WHERE Field = 'provinceId'
      `);
      if (columns.length === 0) {
        await connection.execute(`ALTER TABLE closing_projects ADD COLUMN provinceId INT`);
        console.log('provinceId字段添加成功');
      }
    } catch (error) {
      console.error('添加provinceId字段失败:', error);
    }
    
    // 修改price字段类型为DECIMAL(18,2)以支持更大的值
    try {
      await connection.execute(`ALTER TABLE closing_projects MODIFY COLUMN price DECIMAL(18,2) NOT NULL`);
      console.log('price字段类型修改成功');
    } catch (error) {
      console.error('修改price字段类型失败:', error);
    }
    
    try {
      const [columns] = await connection.execute(`
        SHOW COLUMNS FROM closing_projects WHERE Field = 'cityId'
      `);
      if (columns.length === 0) {
        await connection.execute(`ALTER TABLE closing_projects ADD COLUMN cityId INT`);
        console.log('cityId字段添加成功');
      }
    } catch (error) {
      console.error('添加cityId字段失败:', error);
    }
    
    try {
      const [columns] = await connection.execute(`
        SHOW COLUMNS FROM closing_projects WHERE Field = 'countyId'
      `);
      if (columns.length === 0) {
        await connection.execute(`ALTER TABLE closing_projects ADD COLUMN countyId INT`);
        console.log('countyId字段添加成功');
      }
    } catch (error) {
      console.error('添加countyId字段失败:', error);
    }
    
    try {
      const [columns] = await connection.execute(`
        SHOW COLUMNS FROM closing_projects WHERE Field = 'contractFeeStatus'
      `);
      if (columns.length === 0) {
        await connection.execute(`ALTER TABLE closing_projects ADD COLUMN contractFeeStatus VARCHAR(50) DEFAULT '未结'`);
        console.log('contractFeeStatus字段添加成功');
      }
    } catch (error) {
      console.error('添加contractFeeStatus字段失败:', error);
    }
    
    try {
      const [columns] = await connection.execute(`
        SHOW COLUMNS FROM closing_projects WHERE Field = 'remainingAmount'
      `);
      if (columns.length === 0) {
        await connection.execute(`ALTER TABLE closing_projects ADD COLUMN remainingAmount DECIMAL(18,2) DEFAULT 0`);
        console.log('remainingAmount字段添加成功');
      }
    } catch (error) {
      console.error('添加remainingAmount字段失败:', error);
    }
    
    // 创建provinces表（省份）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS provinces (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
        code VARCHAR(50) NOT NULL UNIQUE,
        createdAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建cities表（城市）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS cities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        code VARCHAR(50) NOT NULL,
        provinceId INT NOT NULL,
        createdAt DATETIME NOT NULL,
        FOREIGN KEY (provinceId) REFERENCES provinces(id),
        UNIQUE KEY city_unique (provinceId, name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建counties表（旗县/区）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS counties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        code VARCHAR(50) NOT NULL,
        cityId INT NOT NULL,
        createdAt DATETIME NOT NULL,
        FOREIGN KEY (cityId) REFERENCES cities(id),
        UNIQUE KEY county_unique (cityId, name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 初始化省份数据
    const [existingProvinces] = await connection.execute('SELECT * FROM provinces');
    if (existingProvinces.length === 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const provinces = [
        { name: '内蒙古自治区', code: '150000' },
        { name: '北京市', code: '110000' },
        { name: '上海市', code: '310000' },
        { name: '广东省', code: '440000' },
        { name: '江苏省', code: '320000' },
        { name: '浙江省', code: '330000' },
        { name: '山东省', code: '370000' },
        { name: '河南省', code: '410000' },
        { name: '四川省', code: '510000' },
        { name: '湖北省', code: '420000' }
      ];
      for (const p of provinces) {
        await connection.execute(
          'INSERT INTO provinces (name, code, createdAt) VALUES (?, ?, ?)',
          [p.name, p.code, now]
        );
      }
      console.log('省份数据初始化成功');
    }
    
    // 初始化城市数据
    const [existingCities] = await connection.execute('SELECT * FROM cities');
    if (existingCities.length === 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      // 获取省份ID
      const [provinceRows] = await connection.execute('SELECT * FROM provinces');
      const provinceMap = {};
      for (const p of provinceRows) {
        provinceMap[p.name] = p.id;
      }
      
      const cities = [
        // 内蒙古
        { name: '呼和浩特市', code: '150100', province: '内蒙古自治区' },
        { name: '包头市', code: '150200', province: '内蒙古自治区' },
        { name: '赤峰市', code: '150400', province: '内蒙古自治区' },
        { name: '通辽市', code: '150500', province: '内蒙古自治区' },
        { name: '鄂尔多斯市', code: '150600', province: '内蒙古自治区' },
        // 北京
        { name: '朝阳区', code: '110105', province: '北京市' },
        { name: '海淀区', code: '110108', province: '北京市' },
        { name: '丰台区', code: '110106', province: '北京市' },
        { name: '大兴区', code: '110115', province: '北京市' },
        // 上海
        { name: '浦东新区', code: '310115', province: '上海市' },
        { name: '黄浦区', code: '310101', province: '上海市' },
        { name: '徐汇区', code: '310104', province: '上海市' },
        { name: '静安区', code: '310106', province: '上海市' },
        { name: '长宁区', code: '310105', province: '上海市' },
        // 广东
        { name: '广州市', code: '440100', province: '广东省' },
        { name: '深圳市', code: '440300', province: '广东省' },
        { name: '珠海市', code: '440400', province: '广东省' },
        { name: '佛山市', code: '440600', province: '广东省' },
        { name: '东莞市', code: '441900', province: '广东省' },
        // 江苏
        { name: '南京市', code: '320100', province: '江苏省' },
        { name: '苏州市', code: '320500', province: '江苏省' },
        { name: '无锡市', code: '320200', province: '江苏省' },
        { name: '常州市', code: '320400', province: '江苏省' },
        { name: '南通市', code: '320600', province: '江苏省' },
        // 浙江
        { name: '杭州市', code: '330100', province: '浙江省' },
        { name: '宁波市', code: '330200', province: '浙江省' },
        { name: '温州市', code: '330300', province: '浙江省' },
        { name: '嘉兴市', code: '330400', province: '浙江省' },
        { name: '绍兴市', code: '330600', province: '浙江省' },
        // 山东
        { name: '济南市', code: '370100', province: '山东省' },
        { name: '青岛市', code: '370200', province: '山东省' },
        { name: '烟台市', code: '370600', province: '山东省' },
        { name: '潍坊市', code: '370700', province: '山东省' },
        { name: '临沂市', code: '371300', province: '山东省' },
        // 河南
        { name: '郑州市', code: '410100', province: '河南省' },
        { name: '洛阳市', code: '410300', province: '河南省' },
        { name: '新乡市', code: '410700', province: '河南省' },
        { name: '南阳市', code: '411300', province: '河南省' },
        { name: '许昌市', code: '411000', province: '河南省' },
        // 四川
        { name: '成都市', code: '510100', province: '四川省' },
        { name: '绵阳市', code: '510700', province: '四川省' },
        { name: '德阳市', code: '510600', province: '四川省' },
        { name: '南充市', code: '511300', province: '四川省' },
        { name: '宜宾市', code: '511500', province: '四川省' },
        // 湖北
        { name: '武汉市', code: '420100', province: '湖北省' },
        { name: '宜昌市', code: '420500', province: '湖北省' },
        { name: '襄阳市', code: '420600', province: '湖北省' },
        { name: '荆州市', code: '421000', province: '湖北省' }
      ];
      
      for (const c of cities) {
        const provinceId = provinceMap[c.province];
        if (provinceId) {
          await connection.execute(
            'INSERT INTO cities (name, code, provinceId, createdAt) VALUES (?, ?, ?, ?)',
            [c.name, c.code, provinceId, now]
          );
        }
      }
      console.log('城市数据初始化成功');
    }
    
    // 初始化旗县数据
    const [existingCounties] = await connection.execute('SELECT * FROM counties');
    if (existingCounties.length === 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      // 获取城市ID
      const [cityRows] = await connection.execute('SELECT * FROM cities');
      const cityMap = {};
      for (const c of cityRows) {
        cityMap[c.name] = c.id;
      }
      
      const counties = [
        // 呼和浩特
        { name: '新城区', code: '150102', city: '呼和浩特市' },
        { name: '回民区', code: '150103', city: '呼和浩特市' },
        { name: '玉泉区', code: '150104', city: '呼和浩特市' },
        { name: '赛罕区', code: '150105', city: '呼和浩特市' },
        // 包头
        { name: '昆都仑区', code: '150203', city: '包头市' },
        { name: '东河区', code: '150202', city: '包头市' },
        { name: '青山区', code: '150204', city: '包头市' },
        // 赤峰
        { name: '红山区', code: '150402', city: '赤峰市' },
        { name: '元宝山区', code: '150403', city: '赤峰市' },
        { name: '松山区', code: '150404', city: '赤峰市' },
        { name: '宁城县', code: '150429', city: '赤峰市' },
        // 广州
        { name: '天河区', code: '440106', city: '广州市' },
        { name: '越秀区', code: '440104', city: '广州市' },
        { name: '海珠区', code: '440105', city: '广州市' },
        { name: '白云区', code: '440111', city: '广州市' },
        { name: '番禺区', code: '440113', city: '广州市' },
        // 深圳
        { name: '福田区', code: '440304', city: '深圳市' },
        { name: '罗湖区', code: '440303', city: '深圳市' },
        { name: '南山区', code: '440305', city: '深圳市' },
        { name: '宝安区', code: '440306', city: '深圳市' },
        { name: '龙岗区', code: '440307', city: '深圳市' },
        // 南京
        { name: '玄武区', code: '320102', city: '南京市' },
        { name: '秦淮区', code: '320104', city: '南京市' },
        { name: '建邺区', code: '320105', city: '南京市' },
        { name: '鼓楼区', code: '320106', city: '南京市' },
        { name: '浦口区', code: '320111', city: '南京市' },
        // 苏州
        { name: '姑苏区', code: '320508', city: '苏州市' },
        { name: '虎丘区', code: '320505', city: '苏州市' },
        { name: '吴中区', code: '320506', city: '苏州市' },
        { name: '相城区', code: '320507', city: '苏州市' },
        { name: '吴江区', code: '320509', city: '苏州市' },
        // 杭州
        { name: '上城区', code: '330102', city: '杭州市' },
        { name: '下城区', code: '330103', city: '杭州市' },
        { name: '江干区', code: '330104', city: '杭州市' },
        { name: '拱墅区', code: '330105', city: '杭州市' },
        { name: '西湖区', code: '330106', city: '杭州市' },
        // 宁波
        { name: '海曙区', code: '330203', city: '宁波市' },
        { name: '江北区', code: '330205', city: '宁波市' },
        { name: '北仑区', code: '330206', city: '宁波市' },
        { name: '镇海区', code: '330211', city: '宁波市' },
        // 济南
        { name: '历下区', code: '370102', city: '济南市' },
        { name: '市中区', code: '370103', city: '济南市' },
        { name: '槐荫区', code: '370104', city: '济南市' },
        { name: '天桥区', code: '370105', city: '济南市' },
        // 青岛
        { name: '市南区', code: '370202', city: '青岛市' },
        { name: '市北区', code: '370203', city: '青岛市' },
        { name: '黄岛区', code: '370211', city: '青岛市' },
        { name: '崂山区', code: '370212', city: '青岛市' },
        // 郑州
        { name: '中原区', code: '410102', city: '郑州市' },
        { name: '二七区', code: '410103', city: '郑州市' },
        { name: '管城回族区', code: '410104', city: '郑州市' },
        { name: '金水区', code: '410105', city: '郑州市' },
        // 成都
        { name: '锦江区', code: '510104', city: '成都市' },
        { name: '青羊区', code: '510105', city: '成都市' },
        { name: '金牛区', code: '510106', city: '成都市' },
        { name: '武侯区', code: '510107', city: '成都市' },
        { name: '成华区', code: '510108', city: '成都市' },
        // 武汉
        { name: '江岸区', code: '420102', city: '武汉市' },
        { name: '江汉区', code: '420103', city: '武汉市' },
        { name: '硚口区', code: '420104', city: '武汉市' },
        { name: '汉阳区', code: '420105', city: '武汉市' }
      ];
      
      for (const c of counties) {
        const cityId = cityMap[c.city];
        if (cityId) {
          await connection.execute(
            'INSERT INTO counties (name, code, cityId, createdAt) VALUES (?, ?, ?, ?)',
            [c.name, c.code, cityId, now]
          );
        }
      }
      console.log('旗县数据初始化成功');
    }
    
    // 创建leave_applications表（请假申请）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS leave_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        applicant VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        leaveType VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        startDate DATE NOT NULL,
        endDate DATE NOT NULL,
        days INT NOT NULL,
        reason TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        status VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '审批中',
        approver VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        nextApprover VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        comment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        result VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        createdAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建reimbursements表（报销管理）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reimbursements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        applicant VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        reimburseType VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        reimburseDate DATE NOT NULL,
        reason TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        status VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '审批中',
        approver VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        comment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        result VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        createdAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建meetings表（会议管理）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS meetings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        organizer VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        meetingDate DATE NOT NULL,
        meetingTime VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        location VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        participants TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        agenda TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        status VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '待审批',
        approver VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        comment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        result VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        createdAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建project_applications表（项目申请）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS project_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        applicant VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        projectName VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        projectType VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        budget DECIMAL(10,2) NOT NULL,
        priority VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        projectLink VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        status VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '审批中',
        approver VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        comment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        result VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        createdAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建office_supplies_applications表（办公用品申请）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS office_supplies_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        applicant VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        itemName VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        quantity INT NOT NULL,
        reason TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        status VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '审批中',
        approver VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        comment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        result VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        createdAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 创建business_trip_applications表（出差申请）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS business_trip_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        applicant VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        destination VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        tripType VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        startDate DATE NOT NULL,
        endDate DATE NOT NULL,
        days INT NOT NULL,
        purpose TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        estimatedCost DECIMAL(10,2) NOT NULL,
        status VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '审批中',
        approver VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        comment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        result VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        createdAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建oa_approval_flows表（OA审批流程定义）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS oa_approval_flows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        flowCode VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
        flowName VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '启用',
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建oa_approval_instances表（OA审批实例）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS oa_approval_instances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        flowCode VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        applicantId INT NOT NULL,
        applicantName VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        applicantDept VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        applicantPosition VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        businessType VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        businessData JSON NOT NULL,
        currentApproverType VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        currentApproverId INT,
        currentApproverName VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        approvalPath JSON,
        status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '审批中',
        createdAt DATETIME NOT NULL,
        completedAt DATETIME,
        INDEX idx_applicantId (applicantId),
        INDEX idx_currentApproverId (currentApproverId),
        INDEX idx_status (status),
        INDEX idx_flowCode (flowCode)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建oa_approval_history表（OA审批历史记录）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS oa_approval_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        instanceId INT NOT NULL,
        nodeOrder INT NOT NULL,
        approverType VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        approverId INT NOT NULL,
        approverName VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        approverPosition VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        action VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        comment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        createdAt DATETIME NOT NULL,
        INDEX idx_instanceId (instanceId),
        INDEX idx_approverId (approverId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建oa_approver_configs表（审批人配置）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS oa_approver_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        position VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        superiorPosition VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        isDeptManager BOOLEAN DEFAULT FALSE,
        isTopManager BOOLEAN DEFAULT FALSE,
        isFinanceDirector BOOLEAN DEFAULT FALSE,
        createdAt DATETIME NOT NULL,
        UNIQUE KEY dept_position_unique (department, position)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 初始化OA审批流程数据
    const [existingFlows] = await connection.execute('SELECT * FROM oa_approval_flows');
    if (existingFlows.length === 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await connection.execute(
        'INSERT INTO oa_approval_flows (flowCode, flowName, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        ['leave', '请假审批', '员工请假申请审批流程', '启用', now, now]
      );
      await connection.execute(
        'INSERT INTO oa_approval_flows (flowCode, flowName, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        ['reimburse', '报销审批', '费用报销申请审批流程', '启用', now, now]
      );
      await connection.execute(
        'INSERT INTO oa_approval_flows (flowCode, flowName, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        ['purchase', '采购审批', '物品采购申请审批流程', '启用', now, now]
      );
      await connection.execute(
        'INSERT INTO oa_approval_flows (flowCode, flowName, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        ['business_trip', '出差审批', '员工出差申请审批流程', '启用', now, now]
      );
      await connection.execute(
        'INSERT INTO oa_approval_flows (flowCode, flowName, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        ['office_supplies', '办公用品申请', '办公用品申请审批流程', '启用', now, now]
      );
      console.log('OA审批流程数据初始化成功');
    }

    // 初始化审批人配置数据
    const [existingConfigs] = await connection.execute('SELECT * FROM oa_approver_configs');
    if (existingConfigs.length === 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const approverConfigs = [
        // 技术部
        { dept: '技术部', pos: '软件研发工程师', superior: '项目经理', isDeptMgr: false, isTopMgr: false, isFinance: false },
        { dept: '技术部', pos: '系统运维工程师', superior: '项目经理', isDeptMgr: false, isTopMgr: false, isFinance: false },
        { dept: '技术部', pos: '项目经理', superior: '技术部经理', isDeptMgr: false, isTopMgr: false, isFinance: false },
        { dept: '技术部', pos: '技术部经理', superior: null, isDeptMgr: true, isTopMgr: false, isFinance: false },
        // 销售部
        { dept: '销售部', pos: '销售', superior: '销售部经理', isDeptMgr: false, isTopMgr: false, isFinance: false },
        { dept: '销售部', pos: '销售部经理', superior: null, isDeptMgr: true, isTopMgr: false, isFinance: false },
        // 财务部
        { dept: '财务部', pos: '财务总监', superior: null, isDeptMgr: true, isTopMgr: false, isFinance: true },
        // 人力资源部
        { dept: '人力资源部', pos: '人事经理', superior: null, isDeptMgr: true, isTopMgr: false, isFinance: false },
        // 管理部门
        { dept: '管理部门', pos: '总经理', superior: null, isDeptMgr: false, isTopMgr: true, isFinance: false }
      ];
      
      for (const config of approverConfigs) {
        await connection.execute(
          'INSERT INTO oa_approver_configs (department, position, superiorPosition, isDeptManager, isTopManager, isFinanceDirector, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [config.dept, config.pos, config.superior, config.isDeptMgr, config.isTopMgr, config.isFinance, now]
        );
      }
      console.log('审批人配置数据初始化成功');
    }

    // 创建distributed_records表（下发记录）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS distributed_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        applicationId INT NOT NULL COMMENT '原申请ID',
        applicationType VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '申请类型(leave/reimbursement/meeting)',
        applicant VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '原申请人',
        distributedBy VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '下发人',
        targetUser VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '下发目标用户',
        comment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '下发说明',
        processComment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '处理说明',
        status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '待处理' COMMENT '状态(待处理/已处理)',
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME,
        INDEX idx_targetUser (targetUser),
        INDEX idx_status (status),
        INDEX idx_applicationId (applicationId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 检查并添加processComment字段（如果表已存在但缺少该字段）
    try {
      // 先检查字段是否存在
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'distributed_records' AND COLUMN_NAME = 'processComment'
      `);
      
      if (columns.length === 0) {
        // 字段不存在，添加字段
        await connection.execute(`
          ALTER TABLE distributed_records 
          ADD COLUMN processComment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '处理说明'
        `);
        console.log('processComment字段添加成功');
      } else {
        console.log('processComment字段已存在');
      }
    } catch (alterError) {
      console.log('processComment字段检查/添加结果:', alterError.message);
    }

    // 创建departments表（部门管理）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
        code VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
        description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        status VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '启用',
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建roles表（角色管理）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        code VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
        description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        status VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '启用',
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 检查并添加code列（如果不存在）
    try {
      await connection.execute('SELECT code FROM roles LIMIT 1');
    } catch (error) {
      console.log('添加code列到roles表');
      await connection.execute(`
        ALTER TABLE roles 
        ADD COLUMN code VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE AFTER name
      `);
    }

    // 检查并添加description列（如果不存在）
    try {
      await connection.execute('SELECT description FROM roles LIMIT 1');
    } catch (error) {
      console.log('添加description列到roles表');
      await connection.execute(`
        ALTER TABLE roles 
        ADD COLUMN description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci AFTER code
      `);
    }

    // 检查并添加status列（如果不存在）
    try {
      await connection.execute('SELECT status FROM roles LIMIT 1');
    } catch (error) {
      console.log('添加status列到roles表');
      await connection.execute(`
        ALTER TABLE roles 
        ADD COLUMN status VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '启用' AFTER description
      `);
    }

    // 检查并添加updatedAt列（如果不存在）
    try {
      await connection.execute('SELECT updatedAt FROM roles LIMIT 1');
    } catch (error) {
      console.log('添加updatedAt列到roles表');
      await connection.execute(`
        ALTER TABLE roles 
        ADD COLUMN updatedAt DATETIME NOT NULL AFTER createdAt
      `);
    }

    // 创建menus表（菜单管理）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS menus (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parentId INT DEFAULT 0,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        path VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        component VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        icon VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        sort INT DEFAULT 0,
        status VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '启用',
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建role_permissions表（角色权限关联）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        roleId INT NOT NULL,
        menuId INT NOT NULL,
        createdAt DATETIME NOT NULL,
        FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (menuId) REFERENCES menus(id) ON DELETE CASCADE,
        UNIQUE KEY role_menu_unique (roleId, menuId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 检查并添加menuId字段（如果不存在）
    try {
      const [menuIdColumns] = await connection.execute(`
        SHOW COLUMNS FROM role_permissions WHERE Field = 'menuId'
      `);
      if (menuIdColumns.length === 0) {
        console.log('添加menuId列到role_permissions表');
        await connection.execute(`
          ALTER TABLE role_permissions 
          ADD COLUMN menuId INT NOT NULL DEFAULT 0,
          ADD FOREIGN KEY (menuId) REFERENCES menus(id) ON DELETE CASCADE
        `);
      }
    } catch (error) {
      console.log('检查/添加menuId列:', error.message);
    }
    
    // 检查并添加createdAt字段（如果不存在）
    try {
      const [createdAtColumns] = await connection.execute(`
        SHOW COLUMNS FROM role_permissions WHERE Field = 'createdAt'
      `);
      if (createdAtColumns.length === 0) {
        console.log('添加createdAt列到role_permissions表');
        await connection.execute(`
          ALTER TABLE role_permissions 
          ADD COLUMN createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        `);
      }
    } catch (error) {
      console.log('检查/添加createdAt列:', error.message);
    }
    
    // 检查并修复role_permissions表结构
    try {
      // 检查是否存在id字段
      const [idColumns] = await connection.execute(`
        SHOW COLUMNS FROM role_permissions WHERE Field = 'id'
      `);
      
      if (idColumns.length === 0) {
        console.log('role_permissions表缺少id字段，需要重建表');
        
        // 删除旧表（如果存在）
        try {
          await connection.execute('DROP TABLE IF EXISTS role_permissions');
          console.log('删除旧表成功');
        } catch (dropError) {
          console.log('删除旧表:', dropError.message);
        }
        
        // 创建新表
        await connection.execute(`
          CREATE TABLE role_permissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            roleId INT NOT NULL,
            menuId INT NOT NULL,
            createdAt DATETIME NOT NULL,
            FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (menuId) REFERENCES menus(id) ON DELETE CASCADE,
            UNIQUE KEY role_menu_unique (roleId, menuId)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('创建新表成功');
      }
    } catch (error) {
      console.log('检查/修复表结构:', error.message);
    }
    
    // 检查并删除permissionId字段的外键约束和字段（如果存在）
    try {
      const [permissionIdColumns] = await connection.execute(`
        SHOW COLUMNS FROM role_permissions WHERE Field = 'permissionId'
      `);
      if (permissionIdColumns.length > 0) {
        console.log('删除permissionId字段的外键约束');
        // 先删除外键约束
        try {
          await connection.execute(`
            ALTER TABLE role_permissions 
            DROP FOREIGN KEY role_permissions_ibfk_2
          `);
        } catch (fkError) {
          console.log('删除外键约束:', fkError.message);
        }
        // 再删除字段
        console.log('删除permissionId字段');
        await connection.execute(`
          ALTER TABLE role_permissions 
          DROP COLUMN permissionId
        `);
      }
    } catch (error) {
      console.log('检查/删除permissionId列:', error.message);
    }

    // 初始化默认部门数据
    const [existingDepartments] = await connection.execute('SELECT * FROM departments');
    if (existingDepartments.length === 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const departments = [
        { name: '技术部', code: 'tech', description: '负责公司技术开发和系统维护' },
        { name: '销售部', code: 'sales', description: '负责公司产品销售和客户关系管理' },
        { name: '财务部', code: 'finance', description: '负责公司财务管理和会计核算' },
        { name: '人力资源部', code: 'hr', description: '负责人力资源管理和员工培训' },
        { name: '管理部门', code: 'management', description: '公司管理层' }
      ];
      for (const dept of departments) {
        await connection.execute(
          'INSERT INTO departments (name, code, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
          [dept.name, dept.code, dept.description, '启用', now, now]
        );
      }
      console.log('默认部门数据添加成功');
    }

    // 初始化默认角色数据
    const [existingRoles] = await connection.execute('SELECT * FROM roles');
    if (existingRoles.length === 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await connection.execute(
        'INSERT INTO roles (name, code, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        ['系统管理员', 'admin', '系统超级管理员，拥有所有权限', '启用', now, now]
      );
      await connection.execute(
        'INSERT INTO roles (name, code, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        ['普通员工', 'employee', '普通员工角色', '启用', now, now]
      );
      console.log('默认角色数据添加成功');
    }

    // 初始化默认菜单数据
    const [existingMenus] = await connection.execute('SELECT * FROM menus');
    if (existingMenus.length === 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      // 添加系统管理菜单
      const [systemMenuResult] = await connection.execute(
        'INSERT INTO menus (parentId, name, path, component, icon, sort, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [0, '系统管理', '/system', 'SystemManagementView', '⚙️', 1, '启用', now, now]
      );
      const systemMenuId = systemMenuResult.insertId;

      // 添加角色管理子菜单
      await connection.execute(
        'INSERT INTO menus (parentId, name, path, component, icon, sort, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [systemMenuId, '角色管理', '/system/roles', 'RoleManagement', '👥', 1, '启用', now, now]
      );

      // 添加菜单管理子菜单
      await connection.execute(
        'INSERT INTO menus (parentId, name, path, component, icon, sort, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [systemMenuId, '菜单管理', '/system/menus', 'MenuManagement', '📋', 2, '启用', now, now]
      );

      // 添加OA办公菜单
      await connection.execute(
        'INSERT INTO menus (parentId, name, path, component, icon, sort, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [0, 'OA办公', '/oa-office', 'OAWorkflowView', '📝', 3, '启用', now, now]
      );

      console.log('默认菜单数据添加成功');
    }

    // 删除已废弃的菜单（OA审批中心、员工交流）
    try {
      const [oaMenu] = await connection.execute('SELECT id FROM menus WHERE path = ?', ['/oa-approval']);
      if (oaMenu.length > 0) {
        const menuId = oaMenu[0].id;
        await connection.execute('DELETE FROM role_permissions WHERE menuId = ?', [menuId]);
        await connection.execute('DELETE FROM menus WHERE id = ?', [menuId]);
        console.log('已删除废弃菜单: OA审批中心');
      }
      const [chatMenu] = await connection.execute('SELECT id FROM menus WHERE path = ?', ['/employee-chat']);
      if (chatMenu.length > 0) {
        const menuId = chatMenu[0].id;
        await connection.execute('DELETE FROM role_permissions WHERE menuId = ?', [menuId]);
        await connection.execute('DELETE FROM menus WHERE id = ?', [menuId]);
        console.log('已删除废弃菜单: 员工交流');
      }
    } catch (error) {
      console.log('清理废弃菜单失败:', error.message);
    }

    // 检查并添加OA办公菜单（如果不存在）
    try {
      const [oaOfficeMenu] = await connection.execute('SELECT * FROM menus WHERE path = ?', ['/oa-office']);
      if (oaOfficeMenu.length === 0) {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await connection.execute(
          'INSERT INTO menus (parentId, name, path, component, icon, sort, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [0, 'OA办公', '/oa-office', 'OAWorkflowView', '📝', 3, '启用', now, now]
        );
        console.log('OA办公菜单添加成功');
      }
    } catch (error) {
      console.log('检查/添加OA办公菜单:', error.message);
    }

    // 只在admin用户不存在时添加
    const [existingUsers] = await connection.execute('SELECT * FROM users WHERE username = ?', ['管理员']);
    if (existingUsers.length === 0) {
      await connection.execute(
        'INSERT INTO users (username, password, createdAt) VALUES (?, ?, ?)',
        ['管理员', '123456', new Date().toISOString().replace('T', ' ').replace('Z', '')]
      );
      console.log('默认admin用户添加成功');
    }
    
    // 只在销售漏斗阶段数据不存在时添加
    const [existingStages] = await connection.execute('SELECT * FROM sales_funnel_stages');
    if (existingStages.length === 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await connection.execute(
        'INSERT INTO sales_funnel_stages (name, orderIndex, createdAt) VALUES (?, ?, ?)',
        ['潜在客户', 1, now]
      );
      await connection.execute(
        'INSERT INTO sales_funnel_stages (name, orderIndex, createdAt) VALUES (?, ?, ?)',
        ['意向客户', 2, now]
      );
      await connection.execute(
        'INSERT INTO sales_funnel_stages (name, orderIndex, createdAt) VALUES (?, ?, ?)',
        ['提案阶段', 3, now]
      );
      await connection.execute(
        'INSERT INTO sales_funnel_stages (name, orderIndex, createdAt) VALUES (?, ?, ?)',
        ['谈判阶段', 4, now]
      );
      await connection.execute(
        'INSERT INTO sales_funnel_stages (name, orderIndex, createdAt) VALUES (?, ?, ?)',
        ['成交客户', 5, now]
      );
      console.log('默认销售漏斗阶段数据添加成功');
    }
    
    // 清除现有的销售漏斗数据
    await connection.execute('DELETE FROM sales_funnel_data');
    console.log('销售漏斗数据已清除');
    
    // 只在销售漏斗数据不存在时添加（现在总是添加新数据）
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const today = new Date().toISOString().slice(0, 10);
    await connection.execute(
      'INSERT INTO sales_funnel_data (stageId, count, amount, date, createdAt) VALUES (?, ?, ?, ?, ?)',
      [1, 0, 0.00, today, now]
    );
    await connection.execute(
      'INSERT INTO sales_funnel_data (stageId, count, amount, date, createdAt) VALUES (?, ?, ?, ?, ?)',
      [2, 0, 0.00, today, now]
    );
    await connection.execute(
      'INSERT INTO sales_funnel_data (stageId, count, amount, date, createdAt) VALUES (?, ?, ?, ?, ?)',
      [3, 0, 0.00, today, now]
    );
    await connection.execute(
      'INSERT INTO sales_funnel_data (stageId, count, amount, date, createdAt) VALUES (?, ?, ?, ?, ?)',
      [4, 0, 0.00, today, now]
    );
    await connection.execute(
      'INSERT INTO sales_funnel_data (stageId, count, amount, date, createdAt) VALUES (?, ?, ?, ?, ?)',
      [5, 0, 0.00, today, now]
    );
    console.log('销售漏斗数据已重置');

    
    // 只在文件分类数据不存在时添加
    const [existingFileCategories] = await connection.execute('SELECT * FROM file_categories');
    if (existingFileCategories.length === 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const fileCategories = [
        { name: '综合平台', description: '综合类平台文件' },
        { name: '三位一体', description: '三位一体相关文件' },
        { name: '智慧农业', description: '智慧农业相关文件' },
        { name: '乡村振兴', description: '乡村振兴相关文件' },
        { name: '其他', description: '其他类型文件' }
      ];
      for (const category of fileCategories) {
        await connection.execute(
          'INSERT INTO file_categories (name, description, createdAt) VALUES (?, ?, ?)',
          [category.name, category.description, now]
        );
      }
      console.log('默认文件分类数据添加成功');
    }
    
    // 只在文件数据不存在时添加
    const [existingFiles] = await connection.execute('SELECT * FROM files');
    if (existingFiles.length === 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const filesData = [
        { name: '综合平台方案.pdf', size: 1024000, type: 'application/pdf', url: 'https://example.com/files/1.pdf', uploaderId: 1, categoryId: 1 },
        { name: '三位一体实施计划.docx', size: 512000, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', url: 'https://example.com/files/2.docx', uploaderId: 1, categoryId: 2 },
        { name: '智慧农业技术手册.pdf', size: 1536000, type: 'application/pdf', url: 'https://example.com/files/3.pdf', uploaderId: 1, categoryId: 3 },
        { name: '乡村振兴规划.pptx', size: 2048000, type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', url: 'https://example.com/files/4.pptx', uploaderId: 1, categoryId: 4 },
        { name: '项目总结报告.pdf', size: 819200, type: 'application/pdf', url: 'https://example.com/files/5.pdf', uploaderId: 1, categoryId: 5 },
        { name: '综合平台技术文档.docx', size: 614400, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', url: 'https://example.com/files/6.docx', uploaderId: 1, categoryId: 1 },
        { name: '三位一体项目方案.pdf', size: 1228800, type: 'application/pdf', url: 'https://example.com/files/7.pdf', uploaderId: 1, categoryId: 2 },
        { name: '智慧农业设备清单.xlsx', size: 409600, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', url: 'https://example.com/files/8.xlsx', uploaderId: 1, categoryId: 3 },
        { name: '乡村振兴资金申请报告.docx', size: 716800, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', url: 'https://example.com/files/9.docx', uploaderId: 1, categoryId: 4 },
        { name: '会议记录.txt', size: 102400, type: 'text/plain', url: 'https://example.com/files/10.txt', uploaderId: 1, categoryId: 5 },
        { name: '综合平台测试报告.pdf', size: 921600, type: 'application/pdf', url: 'https://example.com/files/11.pdf', uploaderId: 1, categoryId: 1 },
        { name: '三位一体培训材料.pptx', size: 1843200, type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', url: 'https://example.com/files/12.pptx', uploaderId: 1, categoryId: 2 },
        { name: '智慧农业数据统计.xlsx', size: 512000, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', url: 'https://example.com/files/13.xlsx', uploaderId: 1, categoryId: 3 },
        { name: '乡村振兴案例分析.pdf', size: 1126400, type: 'application/pdf', url: 'https://example.com/files/14.pdf', uploaderId: 1, categoryId: 4 },
        { name: '技术方案讨论稿.docx', size: 614400, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', url: 'https://example.com/files/15.docx', uploaderId: 1, categoryId: 5 }
      ];
      for (const file of filesData) {
        await connection.execute(
          'INSERT INTO files (name, size, type, url, uploaderId, categoryId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [file.name, file.size, file.type, file.url, file.uploaderId, file.categoryId, now]
        );
      }
      console.log('默认文件数据添加成功');
    }
    
    // 不自动添加模拟数据，等待用户手动录入真实数据
    
    // 只在员工数据不存在时添加
    const [existingEmployees] = await connection.execute('SELECT * FROM employees');
    if (existingEmployees.length === 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await connection.execute(
        'INSERT INTO employees (name, department, position, email, phone, entryDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['张三', '技术部', '工程师', 'zhangsan@example.com', '13800138001', now, now]
      );
      await connection.execute(
        'INSERT INTO employees (name, department, position, email, phone, entryDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['李四', '市场部', '经理', 'lisi@example.com', '13800138002', now, now]
      );
      await connection.execute(
        'INSERT INTO employees (name, department, position, email, phone, entryDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['王五', '人力资源部', '专员', 'wangwu@example.com', '13800138003', now, now]
      );
      await connection.execute(
        'INSERT INTO employees (name, department, position, email, phone, entryDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['赵六', '财务部', '会计', 'zhaoliu@example.com', '13800138004', now, now]
      );
      await connection.execute(
        'INSERT INTO employees (name, department, position, email, phone, entryDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['潘伟', '技术部', '主管', 'panwei@example.com', '13800138005', now, now]
      );
      await connection.execute(
        'INSERT INTO employees (name, department, position, email, phone, entryDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['陈东', '技术部', '工程师', 'chendong@example.com', '13800138006', now, now]
      );
      
      // 为每个员工创建对应的用户账户
      const [employees] = await connection.execute('SELECT * FROM employees');
      for (const employee of employees) {
        // 只在用户账户不存在时创建
        const [existingUser] = await connection.execute('SELECT * FROM users WHERE username = ?', [employee.name]);
        if (existingUser.length === 0) {
          await connection.execute(
            'INSERT INTO users (username, password, createdAt) VALUES (?, ?, ?)',
            [employee.name, '123456', now]
          );
        }
      }
      console.log('默认员工数据添加成功');
    }
    
    // 同步所有员工到users表（确保每个员工都有登录账户）
    console.log('开始同步员工到users表...');
    const [allEmployees] = await connection.execute('SELECT * FROM employees');
    console.log(`找到 ${allEmployees.length} 个员工`);
    const syncNow = new Date().toISOString().slice(0, 19).replace('T', ' ');
    for (const employee of allEmployees) {
      console.log(`检查员工: ${employee.name}`);
      const [existingUser] = await connection.execute('SELECT * FROM users WHERE username = ?', [employee.name]);
      console.log(`  users表中存在: ${existingUser.length > 0}`);
      if (existingUser.length === 0) {
        await connection.execute(
          'INSERT INTO users (username, password, createdAt) VALUES (?, ?, ?)',
          [employee.name, '123456', syncNow]
        );
        console.log(`  -> 为员工 ${employee.name} 创建登录账户`);
      }
    }
    console.log('员工同步完成');
    
    // 只在公共聊天不存在时添加
    const [existingChats] = await connection.execute('SELECT * FROM chats WHERE id = ?', [1]);
    if (existingChats.length === 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const currentTime = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      // 创建公共聊天
      await connection.execute(
        'INSERT INTO chats (id, name, lastMessage, time) VALUES (?, ?, ?, ?)',
        [1, '公共聊天', '欢迎大家加入公共聊天！', currentTime]
      );
      // 添加系统欢迎消息
      await connection.execute(
        'INSERT INTO messages (chatId, senderId, text, time, isOwn) VALUES (?, ?, ?, ?, ?)',
        [1, 0, '欢迎大家加入公共聊天！', currentTime, false]
      );
      console.log('公共聊天创建成功');
    }
    

    
    connection.release();
    console.log('数据库表结构初始化成功');
  } catch (error) {
    console.error('数据库表结构初始化失败:', error);
  }
};

// API路由



// 创建HTTP服务器
const server = createServer(app);

// 创建Socket.io服务器
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

// 跟踪在线用户数和在线员工ID
let onlineUserCount = 0;
const onlineEmployeeIds = new Set();

// 监听Socket连接
io.on('connection', (socket) => {
  // 增加在线用户数
  onlineUserCount++;
  console.log('新用户连接:', socket.id);
  console.log('当前在线用户数:', onlineUserCount);
  
  // 广播在线用户数
  io.emit('onlineUsers', onlineUserCount);
  
  // 接收员工ID
  socket.on('setEmployeeId', (employeeId) => {
    console.log(`用户 ${socket.id} 设置员工ID: ${employeeId}`);
    // 存储员工ID与socket的映射
    socket.employeeId = employeeId;
    // 添加到在线员工集合
    onlineEmployeeIds.add(employeeId);
    // 广播在线员工ID列表
    io.emit('onlineEmployeeIds', Array.from(onlineEmployeeIds));
  });
  
  // 接收用户登录状态，用于单设备登录限制
  socket.on('setUserLogin', (username) => {
    console.log(`用户 ${socket.id} 登录: ${username}`);
    // 存储用户名与socket的映射
    socket.username = username;
    // 更新用户会话
    userSessions.set(username, socket.id);
  });
  
  // 加入聊天室
  socket.on('joinChat', (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`用户 ${socket.id} 加入聊天室 ${chatId}`);
  });
  
  // 离开聊天室
  socket.on('leaveChat', (chatId) => {
    socket.leave(`chat_${chatId}`);
    console.log(`用户 ${socket.id} 离开聊天室 ${chatId}`);
  });
  
  // 断开连接
  socket.on('disconnect', () => {
    // 减少在线用户数
    onlineUserCount--;
    if (onlineUserCount < 0) onlineUserCount = 0;
    console.log('用户断开连接:', socket.id);
    
    // 如果有员工ID，从在线员工集合中移除
    if (socket.employeeId) {
      onlineEmployeeIds.delete(socket.employeeId);
      console.log(`员工 ${socket.employeeId} 离线`);
      // 广播在线员工ID列表
      io.emit('onlineEmployeeIds', Array.from(onlineEmployeeIds));
    }
    
    // 如果有用户名，从用户会话中移除
    if (socket.username) {
      console.log(`用户 ${socket.username} 离线`);
      userSessions.delete(socket.username);
    }
    
    console.log('当前在线用户数:', onlineUserCount);
    console.log('当前在线员工数:', onlineEmployeeIds.size);
    console.log('当前在线用户会话数:', userSessions.size);
    
    // 广播在线用户数
    io.emit('onlineUsers', onlineUserCount);
  });
});

// 发送消息的函数，用于在API中调用
const sendMessageToChat = (chatId, message) => {
  // 只向特定聊天室广播消息
  io.to(`chat_${chatId}`).emit('newMessage', message);
  
  // 广播消息已送达状态
  io.to(`chat_${chatId}`).emit('messageDelivered', {
    messageId: message.id,
    chatId: message.chatId
  });
};







// ==================== 项目申请和出差申请API ====================

// 创建项目申请表
const createProjectTable = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS project_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
        project_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        applicant_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        applicant_name VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        department VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        project_type VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        priority VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        budget DECIMAL(15,2) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        objectives TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        team_members TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        resources TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        attachments TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        project_link VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
        current_step INT DEFAULT 1,
        current_approvers TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        approval_history TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        comment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_applicant (applicant_id),
        INDEX idx_status (status),
        INDEX idx_department (department)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 如果表已存在，尝试添加 project_link 字段（忽略已存在的错误）
    try {
      await connection.execute(`
        ALTER TABLE project_applications ADD COLUMN project_link VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
    } catch (alterError) {
      // 如果字段已存在，忽略错误
      console.log('project_link字段可能已存在:', alterError.message);
    }
    
    connection.release();
    console.log('项目申请表创建成功');
  } catch (error) {
    console.log('项目申请表已存在或创建失败:', error.message);
  }
};

// 创建出差申请表
const createBusinessTripTable = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS business_trip_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        trip_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
        applicant_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        applicant_name VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        department VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        destination VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        trip_type VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        days INT NOT NULL,
        purpose TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        itinerary TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        estimated_cost DECIMAL(12,2) NOT NULL,
        cost_breakdown TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        accommodation VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        transport VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        accompany_persons TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        customer_info TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
        current_step INT DEFAULT 1,
        current_approvers TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        approval_history TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        is_urgent TINYINT DEFAULT 0,
        comment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_applicant (applicant_id),
        INDEX idx_status (status),
        INDEX idx_dates (start_date, end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    connection.release();
    console.log('出差申请表创建成功');
  } catch (error) {
    console.log('出差申请表已存在或创建失败:', error.message);
  }
};

// 创建流程相关表
const createWorkflowTables = async () => {
  const connection = await pool.getConnection();
  try {
    // 流程定义表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS process_definitions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
        name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        category VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        version INT DEFAULT 1,
        status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
        nodes TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        edges TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        form_schema TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        created_by VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 流程实例表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS process_instances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        definition_id INT NOT NULL,
        business_key VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        business_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        title VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        applicant_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        applicant_name VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'running',
        current_nodes TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        variables TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        active_multi_tasks TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        branch_contexts TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        INDEX idx_definition (definition_id),
        INDEX idx_applicant (applicant_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 流程任务表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS process_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        instance_id INT NOT NULL,
        node_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        node_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        node_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        assignee_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        assignee_name VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
        action VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        comment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        parent_task_id INT,
        is_multi_node TINYINT DEFAULT 0,
        multi_node_strategy TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        due_date DATETIME,
        INDEX idx_instance (instance_id),
        INDEX idx_assignee (assignee_id),
        INDEX idx_status (status),
        INDEX idx_parent (parent_task_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 审批历史表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS approval_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        business_id INT NOT NULL,
        step INT NOT NULL,
        node_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        approver_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        approver_name VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        approver_role VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        action VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        comment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_business (business_type, business_id),
        INDEX idx_approver (approver_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 分支上下文表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS branch_contexts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        instance_id INT NOT NULL,
        branch_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        gateway_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        variables TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        INDEX idx_instance (instance_id),
        INDEX idx_gateway (gateway_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 员工角色表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS employee_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        role VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        department VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_emp_role (employee_id, role, department)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('流程相关表创建成功');
  } catch (error) {
    console.log('流程表创建失败:', error.message);
  } finally {
    connection.release();
  }
};





// 初始化流程表
(async () => {
  await createProjectTable();
  await createBusinessTripTable();
  await createWorkflowTables();
})();

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('未捕获的错误:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误'
  });
});

// 启动服务器
server.listen(port, '0.0.0.0', async () => {
  console.log(`后端服务器运行在 http://0.0.0.0:${port}`);
  console.log(`可以通过 http://localhost:${port} 或 http://服务器IP:${port} 访问`);
  // 无论连接是否成功，都先尝试创建数据库（删除并重新创建）
  const dbCreated = await createDatabase();
  if (dbCreated) {
    // 测试数据库连接
    const connected = await testConnection();
    if (connected) {
      // 初始化工作流引擎
      initWorkflowEngine(pool);
      // 初始化数据库表结构
      await initDatabase();
    }
  }
});