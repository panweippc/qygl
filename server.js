import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3005;

// 跟踪用户登录状态，用于单设备登录限制
const userSessions = new Map(); // 键: 用户名, 值: socket.id

// 导入工作流路由
import workflowRouter, { initWorkflowEngine } from './server/routes/workflow.js';

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

// 挂载工作流路由
app.use('/api', workflowRouter);

// 创建数据库连接池
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root123456',
  database: 'qygl',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// 将数据库连接池设置到app.locals，供路由使用
app.locals.pool = pool;

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
    await connection.execute('CREATE DATABASE IF NOT EXISTS qygl CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
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

      // 添加OA审批中心菜单
      await connection.execute(
        'INSERT INTO menus (parentId, name, path, component, icon, sort, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [0, 'OA审批中心', '/oa-approval', 'OAApprovalView', '✅', 2, '启用', now, now]
      );

      console.log('默认菜单数据添加成功');
    }

    // 检查并添加OA审批中心菜单（如果不存在）
    try {
      const [oaMenu] = await connection.execute('SELECT * FROM menus WHERE path = ?', ['/oa-approval']);
      if (oaMenu.length === 0) {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await connection.execute(
          'INSERT INTO menus (parentId, name, path, component, icon, sort, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [0, 'OA审批中心', '/oa-approval', 'OAApprovalView', '✅', 2, '启用', now, now]
        );
        console.log('OA审批中心菜单添加成功');
      }
    } catch (error) {
      console.log('检查/添加OA审批中心菜单:', error.message);
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

// 认证相关
app.post('/api/login', async (req, res) => {
  let { username, password } = req.body;
  // 处理编码问题，确保用户名正确
  console.log(`登录请求: username=${username}, password=${password}`);
  console.log(`请求体: ${JSON.stringify(req.body)}`);
  try {
    // 处理编码问题，尝试多种查询方式
    let users = [];
    
    // 1. 直接查询
    try {
      [users] = await pool.execute('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
      console.log(`直接查询users表结果: ${users.length} 条记录`);
    } catch (error) {
      console.log('直接查询失败:', error.message);
    }
    
    // 2. 如果直接查询失败，尝试使用LIKE查询
    if (users.length === 0) {
      try {
        [users] = await pool.execute('SELECT * FROM users WHERE username LIKE ? AND password = ?', [`%${username}%`, password]);
        console.log(`LIKE查询users表结果: ${users.length} 条记录`);
      } catch (error) {
        console.log('LIKE查询失败:', error.message);
      }
    }
    
    // 3. 如果仍然失败，尝试查询所有用户并在内存中匹配
    if (users.length === 0) {
      try {
        const [allUsers] = await pool.execute('SELECT * FROM users');
        console.log(`查询所有用户: ${allUsers.length} 条记录`);
        // 在内存中匹配用户名和密码
        users = allUsers.filter(user => {
          const match = user.username === username && user.password === password;
          if (match) {
            console.log(`找到匹配用户: ${user.username}`);
          }
          return match;
        });
        console.log(`内存匹配结果: ${users.length} 条记录`);
      } catch (error) {
        console.log('查询所有用户失败:', error.message);
      }
    }
    
    // 4. 如果仍然失败，尝试通过员工姓名登录
    if (users.length === 0) {
      try {
        // 先根据姓名查找员工
        const [employees] = await pool.execute('SELECT * FROM employees WHERE name = ?', [username]);
        console.log(`查询employees表: name=${username}, 找到 ${employees.length} 条记录`);
        if (employees.length > 0) {
          console.log(`找到员工: ${JSON.stringify(employees[0])}`);
          // 查找与该员工关联的用户账户，先查找用户名等于员工姓名的账户
          [users] = await pool.execute('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
          // 如果没找到，再查找格式为emp_{name}_%的账户
          if (users.length === 0) {
            [users] = await pool.execute('SELECT * FROM users WHERE username LIKE ? AND password = ?', [`emp_${username}_%`, password]);
          }
        }
      } catch (error) {
        console.log('员工查询失败:', error.message);
      }
    }
    
    // 5. 特殊处理：直接检查是否是总经理用户登录
    if (users.length === 0 && password === '999999') {
      try {
        // 直接查询用户名为"总经理"的用户
        [users] = await pool.execute('SELECT * FROM users WHERE username = ? AND password = ?', ['总经理', password]);
        console.log(`特殊处理：查询总经理用户结果: ${users.length} 条记录`);
      } catch (error) {
        console.log('特殊处理查询失败:', error.message);
      }
    }
    
    // 6. 特殊处理：如果用户名是"总经理"，直接登录
    if (users.length === 0 && (username === '总经理' || username === '???') && password === '999999') {
      try {
        // 直接查询用户名为"总经理"的用户
        [users] = await pool.execute('SELECT * FROM users WHERE username = ? AND password = ?', ['总经理', password]);
        console.log(`特殊处理：用户名是总经理，查询结果: ${users.length} 条记录`);
      } catch (error) {
        console.log('特殊处理查询失败:', error.message);
      }
    }
    
    if (users.length > 0) {
      const user = users[0];
      
      // 检查是否已有其他设备登录
if (userSessions.has(user.username)) {
  const oldSocketId = userSessions.get(user.username);
  // 通知旧设备被挤下线
  if (oldSocketId) {
    console.log(`用户 ${user.username} 在其他设备登录，通知旧设备 ${oldSocketId} 被挤下线`);
    io.to(oldSocketId).emit('kickedOut', { message: '您的账号在其他设备登录，已被强制退出' });
  } else {
    console.log(`用户 ${user.username} 已有登录会话，但没有关联的socketId`);
  }
}

// 记录新的登录会话
userSessions.set(user.username, null); // 暂时设置为null，等待Socket连接后更新
      
      // 获取用户的权限（通过role_permissions表，使用用户ID作为roleId查询）
      let permissions = [];
      let department = '';
      let position = '';
      try {
        // 查询用户直接分配的权限（用户ID作为roleId）
        const [userPermissions] = await pool.execute(
          `SELECT m.id, m.name, m.path, m.component, m.icon 
           FROM role_permissions rp 
           JOIN menus m ON rp.menuId = m.id 
           WHERE rp.roleId = ?`,
          [user.id]
        );
        permissions = userPermissions;
        console.log(`用户 ${user.username} (ID: ${user.id}) 的权限:`, permissions.map(p => p.name));
        
        // 如果没有找到权限，尝试查找该用户关联的员工，并获取对应角色的权限
        if (permissions.length === 0) {
          // 查找员工姓名（从用户名中提取，格式可能是 emp_姓名_时间戳 或直接是姓名）
          let employeeName = user.username;
          if (user.username.startsWith('emp_')) {
            // 从 emp_姓名_时间戳 格式中提取姓名
            const parts = user.username.split('_');
            if (parts.length >= 2) {
              employeeName = parts[1];
            }
          }
          
          // 查找员工信息
          const [employees] = await pool.execute(
            'SELECT * FROM employees WHERE name = ?',
            [employeeName]
          );
          
          if (employees.length > 0) {
            const employee = employees[0];
            department = employee.department;
            position = employee.position;
            console.log(`找到员工: ${employee.name}, 部门: ${employee.department}, 职位: ${employee.position}`);
            
            // 根据部门和职位查找对应的角色
            let roleName = '';
            if (employee.department === '管理部门' && employee.position === '总经理') {
              roleName = '总经理';
            } else if (employee.department === '技术部') {
              roleName = '技术部员工';
            } else if (employee.department === '销售部') {
              roleName = '销售';
            } else if (employee.department === '财务部') {
              // 财务部根据职位区分角色
              if (employee.position === '财务总监') {
                roleName = '财务总监';
              } else {
                roleName = '财务';
              }
            } else if (employee.department === '人力资源部') {
              roleName = '人事经理';
            }
            
            if (roleName) {
              // 查找角色ID
              const [roles] = await pool.execute(
                'SELECT * FROM roles WHERE name = ?',
                [roleName]
              );
              
              if (roles.length > 0) {
                const roleId = roles[0].id;
                console.log(`找到角色: ${roleName}, ID: ${roleId}`);
                
                // 获取该角色的权限
                const [rolePerms] = await pool.execute(
                  `SELECT m.id, m.name, m.path, m.component, m.icon 
                   FROM role_permissions rp 
                   JOIN menus m ON rp.menuId = m.id 
                   WHERE rp.roleId = ?`,
                  [roleId]
                );
                
                if (rolePerms.length > 0) {
                  permissions = rolePerms;
                  console.log(`从角色 ${roleName} 获取权限:`, permissions.map(p => p.name));
                }
              }
            }
          }
        }
      } catch (permError) {
        console.error('获取用户权限失败:', permError.message);
      }
      
      res.json({ success: true, user: { ...user, permissions, department, position } });
    } else {
      res.json({ success: false, message: '用户名或密码错误' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '登录失败' });
  }
});



// 员工管理
app.get('/api/employees', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // 设置字符编码
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');
    
    // 查询员工数据，包括角色名称
    const [employees] = await connection.execute(`
      SELECT e.*, r.name as role 
      FROM employees e 
      LEFT JOIN roles r ON e.roleId = r.id
    `);
    
    connection.release();
    res.json({ success: true, data: employees });
  } catch (error) {
    console.error('获取员工数据失败:', error);
    res.status(500).json({ success: false, message: '获取员工数据失败' });
  }
});

app.post('/api/employees', async (req, res) => {
  const { name, department, position, email, phone, entryDate, password, role, roleId: directRoleId, status, employeeType, education, birthDate, idCard, address, emergencyContact, emergencyPhone } = req.body;
  try {
    const connection = await pool.getConnection();
    
    // 设置字符编码
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');
    
    // 格式化日期
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
    const formattedEntryDate = entryDate ? new Date(entryDate).toISOString().slice(0, 19).replace('T', ' ') : formattedDate;
    const formattedBirthDate = birthDate ? new Date(birthDate).toISOString().slice(0, 19).replace('T', ' ') : null;
    
    // 查找角色ID：优先使用直接传入的roleId，否则通过角色名查找
    let roleId = directRoleId || null;
    if (!roleId && role) {
      const [roles] = await connection.execute('SELECT id FROM roles WHERE name = ?', [role]);
      if (roles.length > 0) {
        roleId = roles[0].id;
      }
    }
    
    // 插入员工数据
    await connection.execute(
      'INSERT INTO employees (name, department, position, email, phone, entryDate, roleId, status, employeeType, education, birthDate, idCard, address, emergencyContact, emergencyPhone, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, department, position, email, phone, formattedEntryDate, roleId, status || '在职', employeeType || '正式员工', education || '', formattedBirthDate, idCard || '', address || '', emergencyContact || '', emergencyPhone || '', formattedDate]
    );
    
    // 获取新添加的员工数据
    const [newEmployee] = await connection.execute(
      'SELECT * FROM employees WHERE name = ?',
      [name]
    );
    
    // 如果设置了密码，创建对应的用户账户
    if (password) {
      // 生成一个基于员工姓名和时间戳的唯一用户名
      const username = `emp_${name}_${Date.now()}`;
      await connection.execute(
        'INSERT INTO users (username, password, createdAt) VALUES (?, ?, ?)',
        [username, password, formattedDate]
      );
      
      // 检查以员工姓名为用户名的账户是否已存在
      const [existingUsers] = await connection.execute('SELECT * FROM users WHERE username = ?', [name]);
      let userId = null;
      if (existingUsers.length === 0) {
        // 只有当用户名不存在时才创建以员工姓名为用户名的账户
        const [result] = await connection.execute(
          'INSERT INTO users (username, password, createdAt) VALUES (?, ?, ?)',
          [name, password, formattedDate]
        );
        userId = result.insertId;
      } else {
        userId = existingUsers[0].id;
      }
      
      // 如果指定了角色，为用户分配角色权限
      if (role && userId) {
        try {
          // 根据角色名称获取角色ID
          const [roles] = await connection.execute(
            'SELECT id FROM roles WHERE name = ?',
            [role]
          );
          
          if (roles.length > 0) {
            const roleId = roles[0].id;
            // 获取该角色的所有菜单权限
            const [rolePermissions] = await connection.execute(
              'SELECT menuId FROM role_permissions WHERE roleId = ?',
              [roleId]
            );
            
            // 为用户分配相同的权限
            for (const perm of rolePermissions) {
              await connection.execute(
                'INSERT INTO role_permissions (roleId, menuId, createdAt) VALUES (?, ?, ?)',
                [userId, perm.menuId, formattedDate]
              );
            }
            console.log(`为用户 ${name} 分配了角色 ${role} 的权限`);
          }
        } catch (permError) {
          console.error('分配权限失败:', permError.message);
        }
      }
    }
    
    connection.release();
    res.json({ success: true, message: '员工添加成功', data: newEmployee[0] });
  } catch (error) {
    console.error('添加员工失败:', error);
    res.status(500).json({ success: false, message: '添加员工失败' });
  }
});

app.delete('/api/employees/:name', async (req, res) => {
  const { name } = req.params;
  try {
    await pool.execute('DELETE FROM employees WHERE name = ?', [name]);
    res.json({ success: true, message: '员工删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除员工失败' });
  }
});

app.put('/api/employees/:name', async (req, res) => {
  const { name } = req.params;
  const { department, position, email, phone, entryDate, password, role, roleId: directRoleId, status, employeeType, education, birthDate, idCard, address, emergencyContact, emergencyPhone } = req.body;
  try {
    const connection = await pool.getConnection();
    
    // 设置字符编码
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');
    
    // 格式化日期
    const formattedEntryDate = entryDate ? new Date(entryDate).toISOString().slice(0, 19).replace('T', ' ') : null;
    const formattedBirthDate = birthDate ? new Date(birthDate).toISOString().slice(0, 19).replace('T', ' ') : null;
    
    // 查找角色ID：优先使用直接传入的roleId，否则通过角色名查找
    let roleId = directRoleId || null;
    if (!roleId && role) {
      const [roles] = await connection.execute('SELECT id FROM roles WHERE name = ?', [role]);
      if (roles.length > 0) {
        roleId = roles[0].id;
      }
    }
    
    // 更新员工数据
    const [result] = await connection.execute(
      'UPDATE employees SET department = ?, position = ?, email = ?, phone = ?, roleId = ?, status = ?, employeeType = ?, education = ?, birthDate = ?, idCard = ?, address = ?, emergencyContact = ?, emergencyPhone = ? WHERE name = ?',
      [department, position, email, phone, roleId, status || '在职', employeeType || '正式员工', education || '', formattedBirthDate, idCard || '', address || '', emergencyContact || '', emergencyPhone || '', name]
    );
    
    if (result.affectedRows === 0) {
      console.warn(`[警告] 更新员工 ${name}: 未找到匹配记录或数据未变化`);
    } else {
      console.log(`[成功] 更新员工 ${name}: roleId=${roleId}, affectedRows=${result.affectedRows}`);
    }
    
    // 如果设置了密码，更新对应的用户账户
    if (password) {
      const [users] = await connection.execute('SELECT * FROM users WHERE username = ?', [name]);
      if (users.length > 0) {
        await connection.execute(
          'UPDATE users SET password = ? WHERE username = ?',
          [password, name]
        );
      }
    }
    
    connection.release();
    res.json({ success: true, message: '员工更新成功' });
  } catch (error) {
    console.error('更新员工失败:', error);
    res.status(500).json({ success: false, message: '更新员工失败: ' + error.message });
  }
});

// 员工导出API
app.get('/api/employees/export', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // 设置字符编码
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');
    
    // 查询所有员工数据
    const [employees] = await connection.execute('SELECT * FROM employees');
    connection.release();
    
    // 准备Excel数据
    const excelData = employees.map(emp => ({
      '姓名': emp.name,
      '部门': emp.department,
      '职位': emp.position,
      '邮箱': emp.email,
      '电话': emp.phone,
      '入职日期': emp.entryDate ? new Date(emp.entryDate).toLocaleDateString() : '',
      '状态': emp.status || '在职',
      '员工类型': emp.employeeType || '正式员工',
      '学历': emp.education || '',
      '出生日期': emp.birthDate ? new Date(emp.birthDate).toLocaleDateString() : '',
      '身份证号': emp.idCard || '',
      '联系地址': emp.address || '',
      '紧急联系人': emp.emergencyContact || '',
      '紧急联系电话': emp.emergencyPhone || ''
    }));
    
    // 创建工作簿和工作表
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(excelData);
    
    // 调整列宽
    worksheet['!cols'] = [
      { wch: 15 },  // 姓名
      { wch: 15 },  // 部门
      { wch: 20 },  // 职位
      { wch: 30 },  // 邮箱
      { wch: 15 },  // 电话
      { wch: 15 },  // 入职日期
      { wch: 10 },  // 状态
      { wch: 10 },  // 员工类型
      { wch: 10 },  // 学历
      { wch: 15 },  // 出生日期
      { wch: 20 },  // 身份证号
      { wch: 30 },  // 联系地址
      { wch: 15 },  // 紧急联系人
      { wch: 15 }   // 紧急联系电话
    ];
    
    // 将工作表添加到工作簿
    xlsx.utils.book_append_sheet(workbook, worksheet, '员工数据');
    
    // 生成Excel文件
    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    // 生成安全的文件名，避免无效字符
    const safeDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader('Content-Disposition', `attachment; filename=employee_data_${safeDate}.xlsx`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    // 发送Excel文件
    res.send(excelBuffer);
  } catch (error) {
    console.error('导出员工数据失败:', error);
    res.status(500).json({ success: false, message: '导出员工数据失败' });
  }
});

// 部门管理API
app.get('/api/departments', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // 设置字符编码
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');
    
    const [departments] = await connection.execute('SELECT * FROM departments WHERE status = ?', ['启用']);
    connection.release();
    res.json({ success: true, data: departments });
  } catch (error) {
    console.error('获取部门数据失败:', error);
    res.status(500).json({ success: false, message: '获取部门数据失败' });
  }
});

app.post('/api/departments', async (req, res) => {
  const { name, code, description } = req.body;
  try {
    const connection = await pool.getConnection();
    
    // 设置字符编码
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');
    
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await connection.execute(
      'INSERT INTO departments (name, code, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [name, code, description || '', '启用', now, now]
    );
    
    connection.release();
    res.json({ success: true, message: '部门添加成功' });
  } catch (error) {
    console.error('添加部门失败:', error);
    res.status(500).json({ success: false, message: '添加部门失败' });
  }
});

app.put('/api/departments/:id', async (req, res) => {
  const { id } = req.params;
  const { name, code, description, status } = req.body;
  try {
    const connection = await pool.getConnection();
    
    // 设置字符编码
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');
    
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await connection.execute(
      'UPDATE departments SET name = ?, code = ?, description = ?, status = ?, updatedAt = ? WHERE id = ?',
      [name, code, description || '', status || '启用', now, id]
    );
    
    connection.release();
    res.json({ success: true, message: '部门更新成功' });
  } catch (error) {
    console.error('更新部门失败:', error);
    res.status(500).json({ success: false, message: '更新部门失败' });
  }
});

app.delete('/api/departments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await pool.getConnection();
    
    // 检查是否有员工属于该部门
    const [employees] = await connection.execute('SELECT * FROM employees WHERE department = (SELECT name FROM departments WHERE id = ?)', [id]);
    if (employees.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: '该部门下有员工，无法删除' });
    }
    
    await connection.execute('DELETE FROM departments WHERE id = ?', [id]);
    connection.release();
    res.json({ success: true, message: '部门删除成功' });
  } catch (error) {
    console.error('删除部门失败:', error);
    res.status(500).json({ success: false, message: '删除部门失败' });
  }
});

// 周报管理
app.get('/api/weekly-reports', async (req, res) => {
  try {
    const [reports] = await pool.execute('SELECT * FROM weeklyReports');
    // 将存储的JSON字符串转换回文件数组
    const reportsWithFiles = reports.map((report) => ({
      ...report,
      files: report.files ? JSON.parse(report.files) : []
    }));
    res.json({ success: true, data: reportsWithFiles });
  } catch (error) {
    console.error('获取周报数据失败:', error);
    res.status(500).json({ success: false, message: '获取周报数据失败' });
  }
});

app.post('/api/weekly-reports', async (req, res) => {
  const { title, content, plan, userId, files, date } = req.body;
  try {
    // 将文件数组转换为JSON字符串存储
    const filesJson = files ? JSON.stringify(files) : null;
    await pool.execute(
      'INSERT INTO weeklyReports (title, content, plan, files, userId, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, content, plan || '', filesJson, userId, date || null, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    res.json({ success: true, message: '月报上传成功' });
  } catch (error) {
    console.error('上传月报失败:', error);
    res.status(500).json({ success: false, message: '上传月报失败' });
  }
});

app.put('/api/weekly-reports/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, plan, userId, files, date } = req.body;
  try {
    // 将文件数组转换为JSON字符串存储
    const filesJson = files ? JSON.stringify(files) : null;
    await pool.execute(
      'UPDATE weeklyReports SET title = ?, content = ?, plan = ?, files = ?, date = ? WHERE id = ? AND userId = ?',
      [title, content, plan || '', filesJson, date || null, id, userId]
    );
    res.json({ success: true, message: '月报更新成功' });
  } catch (error) {
    console.error('更新月报失败:', error);
    res.status(500).json({ success: false, message: '更新月报失败' });
  }
});

// 文件分类管理
app.get('/api/file-categories', async (req, res) => {
  try {
    const [categories] = await pool.execute('SELECT * FROM file_categories');
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取文件分类失败' });
  }
});

app.post('/api/file-categories', async (req, res) => {
  const { name, description } = req.body;
  try {
    await pool.execute(
      'INSERT INTO file_categories (name, description, createdAt) VALUES (?, ?, ?)',
      [name, description || '', new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    res.json({ success: true, message: '文件分类创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建文件分类失败' });
  }
});

app.delete('/api/file-categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 先删除该分类下的文件
    await pool.execute('DELETE FROM files WHERE categoryId = ?', [id]);
    // 再删除分类
    await pool.execute('DELETE FROM file_categories WHERE id = ?', [id]);
    res.json({ success: true, message: '文件分类删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除文件分类失败' });
  }
});

// 文件管理
app.get('/api/files', async (req, res) => {
  try {
    const [files] = await pool.execute(`
      SELECT f.*, fc.name as category 
      FROM files f 
      LEFT JOIN file_categories fc ON f.categoryId = fc.id
    `);
    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取文件数据失败' });
  }
});

app.post('/api/files', async (req, res) => {
  const { name, size, type, url, uploaderId, categoryId } = req.body;
  try {
    await pool.execute(
      'INSERT INTO files (name, size, type, url, uploaderId, categoryId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, size, type, url, uploaderId, categoryId || null, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    res.json({ success: true, message: '文件上传成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '上传文件失败' });
  }
});

app.delete('/api/files/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM files WHERE id = ?', [id]);
    res.json({ success: true, message: '文件删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除文件失败' });
  }
});

// 聊天管理
// 获取聊天列表和消息
app.get('/api/chats', async (req, res) => {
  try {
    // 检查是否存在公共聊天室（id=1），如果不存在则创建
    const [existingChats] = await pool.execute('SELECT * FROM chats WHERE id = ?', [1]);
    if (existingChats.length === 0) {
      // 创建默认的公共聊天室
      await pool.execute(
        'INSERT INTO chats (id, name, lastMessage, time, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [1, '公共聊天', '欢迎大家加入公共聊天！', new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })]
      );
      console.log('创建默认公共聊天室成功');
    }
    
    // 获取所有聊天室
    const [chats] = await pool.execute('SELECT * FROM chats ORDER BY createdAt ASC');
    
    // 获取所有消息（限制最近100条，按时间排序）
    const [messages] = await pool.execute(
      'SELECT * FROM messages ORDER BY createdAt ASC LIMIT 1000'
    );
    
    res.json({ success: true, chats, messages });
  } catch (error) {
    console.error('获取聊天数据失败:', error);
    res.status(500).json({ success: false, message: '获取聊天数据失败' });
  }
});

// 获取指定聊天的消息
app.get('/api/chats/:chatId/messages', async (req, res) => {
  const { chatId } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  
  try {
    const [messages] = await pool.execute(
      'SELECT * FROM messages WHERE chatId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
      [chatId, parseInt(limit), parseInt(offset)]
    );
    
    res.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    console.error('获取消息失败:', error);
    res.status(500).json({ success: false, message: '获取消息失败' });
  }
});

// 发送消息
app.post('/api/messages', async (req, res) => {
  const { chatId, senderId, text, time, tempId } = req.body;
  
  // 参数验证
  if (!chatId || !senderId || !text) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }
  
  try {
    // 检查聊天室是否存在，如果不存在则自动创建
    const [chats] = await pool.execute('SELECT * FROM chats WHERE id = ?', [chatId]);
    if (chats.length === 0) {
      // 自动创建聊天室
      await pool.execute(
        'INSERT INTO chats (id, name, lastMessage, time, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [chatId, chatId == 1 ? '公共聊天' : `聊天室${chatId}`, '新聊天室', time || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })]
      );
      console.log(`自动创建聊天室: ${chatId}`);
    }
    
    // 插入消息数据
    const [result] = await pool.execute(
      'INSERT INTO messages (chatId, senderId, text, time, isOwn, createdAt) VALUES (?, ?, ?, ?, ?, NOW())',
      [chatId, senderId, text, time || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), true]
    );
    
    // 更新聊天的最后消息和时间
    await pool.execute(
      'UPDATE chats SET lastMessage = ?, time = ?, updatedAt = NOW() WHERE id = ?',
      [text, time || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), chatId]
    );
    
    // 构建消息对象
    const message = {
      id: result.insertId,
      tempId: tempId,
      chatId: parseInt(chatId),
      senderId,
      text,
      time: time || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      isOwn: false // 广播给其他用户时标记为不是自己的消息
    };
    
    // 通过WebSocket广播消息
    sendMessageToChat(chatId, message);
    
    res.json({ 
      success: true, 
      message: '消息发送成功',
      data: { id: result.insertId, tempId }
    });
  } catch (error) {
    console.error('发送消息失败:', error);
    res.status(500).json({ success: false, message: '发送消息失败: ' + error.message });
  }
});

// 创建聊天室
app.post('/api/chats', async (req, res) => {
  const { name, lastMessage = '', time = '' } = req.body;
  
  if (!name) {
    return res.status(400).json({ success: false, message: '聊天室名称不能为空' });
  }
  
  try {
    const [result] = await pool.execute(
      'INSERT INTO chats (name, lastMessage, time, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
      [name, lastMessage, time]
    );
    
    res.json({ 
      success: true, 
      message: '聊天室创建成功',
      data: { id: result.insertId, name }
    });
  } catch (error) {
    console.error('创建聊天室失败:', error);
    res.status(500).json({ success: false, message: '创建聊天室失败' });
  }
});

// 删除聊天室
app.delete('/api/chats/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // 删除聊天室的所有消息
    await pool.execute('DELETE FROM messages WHERE chatId = ?', [id]);
    
    // 删除聊天室
    await pool.execute('DELETE FROM chats WHERE id = ?', [id]);
    
    res.json({ success: true, message: '聊天室删除成功' });
  } catch (error) {
    console.error('删除聊天室失败:', error);
    res.status(500).json({ success: false, message: '删除聊天室失败' });
  }
});

// 项目分类管理
app.get('/api/project-categories', async (req, res) => {
  try {
    const [projects] = await pool.execute('SELECT * FROM projects');
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取项目数据失败' });
  }
});

app.post('/api/project-categories', async (req, res) => {
  const { name, category, description, manager, link } = req.body;
  try {
    await pool.execute(
      'INSERT INTO projects (name, category, description, manager, link, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [name, category, description, manager || '', link || '', new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    res.json({ success: true, message: '项目分类添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加项目分类失败' });
  }
});

app.delete('/api/project-categories/:category', async (req, res) => {
  const { category } = req.params;
  try {
    await pool.execute('DELETE FROM project_applications WHERE project_type = ?', [category]);
    res.json({ success: true, message: '项目分类删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除项目分类失败' });
  }
});

// 批量更新项目类型（用于重命名分类）
app.put('/api/project-categories/update-type', async (req, res) => {
  const { oldType, newType } = req.body;
  try {
    await pool.execute(
      'UPDATE project_applications SET project_type = ? WHERE project_type = ?',
      [newType, oldType]
    );
    res.json({ success: true, message: '项目类型更新成功' });
  } catch (error) {
    console.error('更新项目类型失败:', error);
    res.status(500).json({ success: false, message: '更新项目类型失败' });
  }
});

app.put('/api/project-categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, link } = req.body;
  console.log('更新项目请求:', { id, name, description, link });
  try {
    await pool.execute(
      'UPDATE projects SET name = ?, description = ?, link = ? WHERE id = ?',
      [name, description, link, id]
    );
    console.log('项目更新成功:', id);
    res.json({ success: true, message: '项目更新成功' });
  } catch (error) {
    console.error('更新项目失败:', error);
    res.status(500).json({ success: false, message: '更新项目失败' });
  }
});

// 工具管理
app.get('/api/tools', async (req, res) => {
  try {
    const [tools] = await pool.execute('SELECT * FROM tools');
    res.json({ success: true, data: tools });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取工具数据失败' });
  }
});

app.post('/api/tools', async (req, res) => {
  const { name, category, quantity, price, supplier, location, status, entryDate } = req.body;
  try {
    await pool.execute(
      'INSERT INTO tools (name, category, quantity, price, supplier, location, status, entryDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, category, quantity, price, supplier, location, status, (entryDate || new Date().toISOString()).replace('T', ' ').replace('Z', '')]
    );
    res.json({ success: true, message: '工具添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加工具失败' });
  }
});

app.delete('/api/tools/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM tools WHERE id = ?', [id]);
    res.json({ success: true, message: '工具删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除工具失败' });
  }
});

app.put('/api/tools/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, quantity, price, supplier, location, status, entryDate } = req.body;
  try {
    console.log('更新工具请求:', { id, name, category, quantity, price, supplier, location, status, entryDate });
    await pool.execute(
      'UPDATE tools SET name = ?, category = ?, quantity = ?, price = ?, supplier = ?, location = ?, status = ?, entryDate = ? WHERE id = ?',
      [name, category, quantity, price, supplier, location, status, (entryDate || new Date().toISOString()).replace('T', ' ').replace('Z', ''), id]
    );
    console.log('工具更新成功:', id);
    res.json({ success: true, message: '工具更新成功' });
  } catch (error) {
    console.error('更新工具失败:', error);
    res.status(500).json({ success: false, message: '更新工具失败' });
  }
});

// 客户管理
app.get('/api/customers', async (req, res) => {
  try {
    const [customers] = await pool.execute('SELECT * FROM customers');
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取客户数据失败' });
  }
});

app.post('/api/customers', async (req, res) => {
  const { name, contact, phone, email, address, tags, status } = req.body;
  try {
    await pool.execute(
      'INSERT INTO customers (name, contact, phone, email, address, tags, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, contact, phone, email, address, tags, status, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    res.json({ success: true, message: '客户添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加客户失败' });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, contact, phone, email, address, tags, status } = req.body;
  try {
    await pool.execute(
      'UPDATE customers SET name = ?, contact = ?, phone = ?, email = ?, address = ?, tags = ?, status = ? WHERE id = ?',
      [name, contact, phone, email, address, tags, status, id]
    );
    res.json({ success: true, message: '客户更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新客户失败' });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ success: true, message: '客户删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除客户失败' });
  }
});

// 客户跟进记录
app.get('/api/customer-activities/:customerId', async (req, res) => {
  const { customerId } = req.params;
  try {
    const [activities] = await pool.execute('SELECT * FROM customer_activities WHERE customerId = ?', [customerId]);
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取客户跟进记录失败' });
  }
});

app.post('/api/customer-activities', async (req, res) => {
  const { customerId, content, followUpMethod, followUpTime } = req.body;
  try {
    await pool.execute(
      'INSERT INTO customer_activities (customerId, content, followUpMethod, followUpTime, createdAt) VALUES (?, ?, ?, ?, ?)',
      [customerId, content, followUpMethod, followUpTime, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    res.json({ success: true, message: '跟进记录添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加跟进记录失败' });
  }
});

// 销售漏斗API

// 获取销售漏斗阶段
app.get('/api/sales-funnel/stages', async (req, res) => {
  try {
    const [stages] = await pool.execute('SELECT * FROM sales_funnel_stages ORDER BY orderIndex');
    res.json({ success: true, data: stages });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取销售漏斗阶段失败' });
  }
});

// 获取销售漏斗数据
app.get('/api/sales-funnel/data', async (req, res) => {
  try {
    const [data] = await pool.execute('SELECT sfd.*, sfs.name FROM sales_funnel_data sfd JOIN sales_funnel_stages sfs ON sfd.stageId = sfs.id ORDER BY sfs.orderIndex');
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取销售漏斗数据失败' });
  }
});

// 更新销售漏斗数据
app.put('/api/sales-funnel/data/:id', async (req, res) => {
  const { id } = req.params;
  const { count, amount } = req.body;
  try {
    await pool.execute(
      'UPDATE sales_funnel_data SET count = ?, amount = ? WHERE id = ?',
      [count, amount, id]
    );
    res.json({ success: true, message: '销售漏斗数据更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新销售漏斗数据失败' });
  }
});

// 盟市销售数据API

// 获取盟市销售数据
app.get('/api/city-sales', async (req, res) => {
  try {
    const [data] = await pool.execute('SELECT * FROM city_sales');
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取盟市销售数据失败' });
  }
});

// 获取单个盟市销售数据
app.get('/api/city-sales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [data] = await pool.execute('SELECT * FROM city_sales WHERE id = ?', [id]);
    res.json({ success: true, data: data[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取盟市销售数据失败' });
  }
});

// 添加盟市销售数据
app.post('/api/city-sales', async (req, res) => {
  const { name, sales, customers, growthRate } = req.body;
  try {
    await pool.execute(
      'INSERT INTO city_sales (name, sales, customers, growthRate, createdAt) VALUES (?, ?, ?, ?, ?)',
      [name, sales, customers, growthRate, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    res.json({ success: true, message: '盟市销售数据添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加盟市销售数据失败' });
  }
});

// 更新盟市销售数据
app.put('/api/city-sales/:id', async (req, res) => {
  const { id } = req.params;
  const { name, sales, customers, growthRate } = req.body;
  try {
    await pool.execute(
      'UPDATE city_sales SET name = ?, sales = ?, customers = ?, growthRate = ? WHERE id = ?',
      [name, sales, customers, growthRate, id]
    );
    res.json({ success: true, message: '盟市销售数据更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新盟市销售数据失败' });
  }
});

// 删除盟市销售数据
app.delete('/api/city-sales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM city_sales WHERE id = ?', [id]);
    res.json({ success: true, message: '盟市销售数据删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除盟市销售数据失败' });
  }
});

// 旗县销售数据API

// 获取旗县销售数据
app.get('/api/county-sales/:cityId', async (req, res) => {
  const { cityId } = req.params;
  try {
    const [data] = await pool.execute('SELECT * FROM county_sales WHERE cityId = ?', [cityId]);
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取旗县销售数据失败' });
  }
});

// 添加旗县销售数据
app.post('/api/county-sales', async (req, res) => {
  const { cityId, name, sales = 100000, customers = 5 } = req.body;
  try {
    await pool.execute(
      'INSERT INTO county_sales (cityId, name, sales, customers, createdAt) VALUES (?, ?, ?, ?, ?)',
      [cityId, name, sales, customers, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    res.json({ success: true, message: '旗县销售数据添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加旗县销售数据失败' });
  }
});

// 更新旗县销售数据
app.put('/api/county-sales/:id', async (req, res) => {
  const { id } = req.params;
  const { name, sales, customers } = req.body;
  try {
    // 构建更新语句
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (sales !== undefined) {
      updates.push('sales = ?');
      values.push(sales);
    }
    if (customers !== undefined) {
      updates.push('customers = ?');
      values.push(customers);
    }
    
    if (updates.length === 0) {
      res.json({ success: true, message: '没有需要更新的字段' });
      return;
    }
    
    values.push(id);
    
    await pool.execute(
      `UPDATE county_sales SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    res.json({ success: true, message: '旗县销售数据更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新旗县销售数据失败' });
  }
});

// 删除旗县销售数据
app.delete('/api/county-sales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM county_sales WHERE id = ?', [id]);
    res.json({ success: true, message: '旗县销售数据删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除旗县销售数据失败' });
  }
});

// 乡镇销售数据API

// 获取乡镇销售数据
app.get('/api/town-sales/:countyId', async (req, res) => {
  const { countyId } = req.params;
  try {
    const [data] = await pool.execute('SELECT * FROM town_sales WHERE countyId = ?', [countyId]);
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取乡镇销售数据失败' });
  }
});

// 添加乡镇销售数据
app.post('/api/town-sales', async (req, res) => {
  const { countyId, name, contactPerson, contactPhone, manager = '', intention, requirement = '', isDealed = false } = req.body;
  // 将isDealed转换为整数类型（0或1），处理字符串类型的'false'值
  const dealStatus = (isDealed === true || isDealed === 'true') ? 1 : 0;
  try {
    await pool.execute(
      'INSERT INTO town_sales (countyId, name, contactPerson, contactPhone, manager, intention, requirement, isDealed, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [countyId, name, contactPerson, contactPhone, manager, intention, requirement, dealStatus, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    res.json({ success: true, message: '乡镇销售数据添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加乡镇销售数据失败' });
  }
});

// 更新乡镇销售数据
app.put('/api/town-sales/:id', async (req, res) => {
  const { id } = req.params;
  const { name, contactPerson, contactPhone, manager = '', intention, requirement = '', isDealed = false } = req.body;
  // 将isDealed转换为整数类型（0或1），处理字符串类型的'false'值
  const dealStatus = (isDealed === true || isDealed === 'true') ? 1 : 0;
  console.log(`更新乡镇销售数据: id=${id}, isDealed=${isDealed}, type=${typeof isDealed}, dealStatus=${dealStatus}`);
  try {
    const result = await pool.execute(
      'UPDATE town_sales SET name = ?, contactPerson = ?, contactPhone = ?, manager = ?, intention = ?, requirement = ?, isDealed = ? WHERE id = ?',
      [name, contactPerson, contactPhone, manager, intention, requirement, dealStatus, id]
    );
    console.log(`更新结果: ${JSON.stringify(result)}`);
    res.json({ success: true, message: '乡镇销售数据更新成功' });
  } catch (error) {
    console.error('更新乡镇销售数据失败:', error);
    res.status(500).json({ success: false, message: '更新乡镇销售数据失败' });
  }
});

// 删除乡镇销售数据
app.delete('/api/town-sales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM town_sales WHERE id = ?', [id]);
    res.json({ success: true, message: '乡镇销售数据删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除乡镇销售数据失败' });
  }
});

// 请假申请管理
app.get('/api/leave-applications', async (req, res) => {
  try {
    const [applications] = await pool.execute('SELECT * FROM leave_applications');
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('获取请假申请失败:', error);
    res.status(500).json({ success: false, message: '获取请假申请失败' });
  }
});

app.post('/api/leave-applications', async (req, res) => {
  const { applicant, leaveType, startDate, endDate, days, reason, approver } = req.body;
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO leave_applications (applicant, leaveType, startDate, endDate, days, reason, approver, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [applicant, leaveType, startDate, endDate, days, reason, approver, '审批中', now]
    );
    res.json({ success: true, message: '请假申请提交成功' });
  } catch (error) {
    console.error('提交请假申请失败:', error);
    res.status(500).json({ success: false, message: '提交请假申请失败' });
  }
});

app.put('/api/leave-applications/:id', async (req, res) => {
  const { id } = req.params;
  const { comment, result, nextApprover } = req.body;
  try {
    // 根据审批结果更新状态
    let status;
    if (result === '批准') {
      status = '已批准';
    } else if (result === '拒绝') {
      status = '已拒绝';
    } else if (result === '取消') {
      status = '已取消';
    } else {
      status = '审批中';
    }
    await pool.execute(
      'UPDATE leave_applications SET comment = ?, result = ?, status = ?, nextApprover = ? WHERE id = ?',
      [comment || null, result || null, status, nextApprover || null, id]
    );
    res.json({ success: true, message: '请假申请更新成功' });
  } catch (error) {
    console.error('更新请假申请失败:', error);
    res.status(500).json({ success: false, message: '更新请假申请失败' });
  }
});

app.get('/api/leave-applications/pending/:approver', async (req, res) => {
  const { approver } = req.params;
  try {
    const [applications] = await pool.execute('SELECT * FROM leave_applications WHERE approver = ? AND status = ?', [approver, '审批中']);
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('获取待审批请假申请失败:', error);
    res.status(500).json({ success: false, message: '获取待审批请假申请失败' });
  }
});

// 报销管理API
app.get('/api/reimbursements', async (req, res) => {
  try {
    const [reimbursements] = await pool.execute('SELECT * FROM reimbursements');
    res.json({ success: true, data: reimbursements });
  } catch (error) {
    console.error('获取报销记录失败:', error);
    res.status(500).json({ success: false, message: '获取报销记录失败' });
  }
});

app.post('/api/reimbursements', async (req, res) => {
  const { applicant, reimburseType, amount, reimburseDate, reason, approver } = req.body;
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO reimbursements (applicant, reimburseType, amount, reimburseDate, reason, approver, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [applicant, reimburseType, amount, reimburseDate, reason, approver, '审批中', now]
    );
    res.json({ success: true, message: '报销申请提交成功' });
  } catch (error) {
    console.error('提交报销申请失败:', error);
    res.status(500).json({ success: false, message: '提交报销申请失败' });
  }
});

// 获取乡镇的拜访记录
app.get('/api/visit-records/:townId', async (req, res) => {
  const { townId } = req.params;
  try {
    const [data] = await pool.execute('SELECT * FROM visit_records WHERE townId = ? ORDER BY visitDate DESC', [townId]);
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取拜访记录失败' });
  }
});

// 添加拜访记录
app.post('/api/visit-records', async (req, res) => {
  const { townId, customerName, address, visitDate, visitPerson, visitContent, nextPlan } = req.body;
  try {
    await pool.execute(
      'INSERT INTO visit_records (townId, customerName, address, visitDate, visitPerson, visitContent, nextPlan, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [townId, customerName, address, visitDate, visitPerson, visitContent, nextPlan || null, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    res.json({ success: true, message: '拜访记录添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加拜访记录失败' });
  }
});

// 更新拜访记录
app.put('/api/visit-records/:id', async (req, res) => {
  const { id } = req.params;
  const { customerName, address, visitDate, visitPerson, visitContent, nextPlan } = req.body;
  try {
    await pool.execute(
      'UPDATE visit_records SET customerName = ?, address = ?, visitDate = ?, visitPerson = ?, visitContent = ?, nextPlan = ? WHERE id = ?',
      [customerName, address, visitDate, visitPerson, visitContent, nextPlan || null, id]
    );
    res.json({ success: true, message: '拜访记录更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新拜访记录失败' });
  }
});

// 删除拜访记录
app.delete('/api/visit-records/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM visit_records WHERE id = ?', [id]);
    res.json({ success: true, message: '拜访记录删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除拜访记录失败' });
  }
});

app.put('/api/reimbursements/:id', async (req, res) => {
  const { id } = req.params;
  const { comment, result } = req.body;
  try {
    // 根据审批结果更新状态
    const status = result === '批准' ? '已批准' : result === '拒绝' ? '已拒绝' : '审批中';
    await pool.execute(
      'UPDATE reimbursements SET comment = ?, result = ?, status = ? WHERE id = ?',
      [comment || null, result || null, status, id]
    );
    res.json({ success: true, message: '报销申请更新成功' });
  } catch (error) {
    console.error('更新报销申请失败:', error);
    res.status(500).json({ success: false, message: '更新报销申请失败' });
  }
});

app.get('/api/reimbursements/pending/:approver', async (req, res) => {
  const { approver } = req.params;
  try {
    const [reimbursements] = await pool.execute('SELECT * FROM reimbursements WHERE approver = ? AND status = ?', [approver, '审批中']);
    res.json({ success: true, data: reimbursements });
  } catch (error) {
    console.error('获取待审批报销申请失败:', error);
    res.status(500).json({ success: false, message: '获取待审批报销申请失败' });
  }
});

// 会议管理API
app.get('/api/meetings', async (req, res) => {
  try {
    const [meetings] = await pool.execute('SELECT * FROM meetings');
    res.json({ success: true, data: meetings });
  } catch (error) {
    console.error('获取会议记录失败:', error);
    res.status(500).json({ success: false, message: '获取会议记录失败' });
  }
});

app.post('/api/meetings', async (req, res) => {
  const { title, organizer, meetingDate, meetingTime, location, participants, agenda, approver } = req.body;
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO meetings (title, organizer, meetingDate, meetingTime, location, participants, agenda, approver, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, organizer, meetingDate, meetingTime, location, participants, agenda, approver, '待审批', now]
    );
    res.json({ success: true, message: '会议创建成功' });
  } catch (error) {
    console.error('创建会议失败:', error);
    res.status(500).json({ success: false, message: '创建会议失败' });
  }
});

app.put('/api/meetings/:id', async (req, res) => {
  const { id } = req.params;
  const { comment, result } = req.body;
  try {
    // 根据审批结果更新状态
    const status = result === '批准' ? '已批准' : result === '拒绝' ? '已拒绝' : '待审批';
    await pool.execute(
      'UPDATE meetings SET comment = ?, result = ?, status = ? WHERE id = ?',
      [comment || null, result || null, status, id]
    );
    res.json({ success: true, message: '会议审批更新成功' });
  } catch (error) {
    console.error('更新会议审批失败:', error);
    res.status(500).json({ success: false, message: '更新会议审批失败' });
  }
});

app.get('/api/meetings/pending/:approver', async (req, res) => {
  const { approver } = req.params;
  try {
    const [meetings] = await pool.execute('SELECT * FROM meetings WHERE approver = ? AND status = ?', [approver, '待审批']);
    res.json({ success: true, data: meetings });
  } catch (error) {
    console.error('获取待审批会议失败:', error);
    res.status(500).json({ success: false, message: '获取待审批会议失败' });
  }
});

// 办公用品申请API
app.get('/api/office-supplies', async (req, res) => {
  try {
    const [applications] = await pool.execute('SELECT * FROM office_supplies_applications');
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('获取办公用品申请失败:', error);
    res.status(500).json({ success: false, message: '获取办公用品申请失败' });
  }
});

// 项目申请管理API
app.get('/api/projects', async (req, res) => {
  try {
    const { applicantId, status, page = 1, pageSize = 10 } = req.query;
    
    let sql = 'SELECT * FROM project_applications WHERE 1=1';
    const params = [];
    
    if (applicantId) {
      sql += ' AND applicant_id = ?';
      params.push(applicantId);
    }
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const pageSizeInt = parseInt(pageSize, 10);
    const offset = (parseInt(page, 10) - 1) * pageSizeInt;
    params.push(pageSizeInt, offset);
    
    const [projects] = await pool.query(sql, params);
    
    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM project_applications WHERE 1=1';
    const countParams = [];
    
    if (applicantId) {
      countSql += ' AND applicant_id = ?';
      countParams.push(applicantId);
    }
    
    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    
    const [countResult] = await pool.execute(countSql, countParams);
    
    res.json({
      success: true,
      data: {
        list: projects,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: countResult[0].total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/office-supplies', async (req, res) => {
  const { applicant, itemName, quantity, reason, approver } = req.body;
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO office_supplies_applications (applicant, itemName, quantity, reason, approver, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [applicant, itemName, quantity, reason, approver, '审批中', now]
    );
    res.json({ success: true, message: '办公用品申请提交成功' });
  } catch (error) {
    console.error('提交办公用品申请失败:', error);
    res.status(500).json({ success: false, message: '提交办公用品申请失败' });
  }
});

app.put('/api/office-supplies/:id', async (req, res) => {
  const { id } = req.params;
  const { comment, result } = req.body;
  try {
    await pool.execute(
      'UPDATE office_supplies_applications SET comment = ?, result = ? WHERE id = ?',
      [comment, result, id]
    );
    res.json({ success: true, message: '办公用品申请更新成功' });
  } catch (error) {
    console.error('更新办公用品申请失败:', error);
    res.status(500).json({ success: false, message: '更新办公用品申请失败' });
  }
});

app.get('/api/office-supplies/pending/:approver', async (req, res) => {
  const { approver } = req.params;
  try {
    const [applications] = await pool.execute('SELECT * FROM office_supplies_applications WHERE approver = ? AND status = ?', [approver, '审批中']);
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('获取待审批办公用品申请失败:', error);
    res.status(500).json({ success: false, message: '获取待审批办公用品申请失败' });
  }
});

// 成交项目管理
app.get('/api/closing-projects', async (req, res) => {
  try {
    const [projects] = await pool.execute('SELECT * FROM closing_projects');
    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('获取成交项目数据失败:', error);
    res.status(500).json({ success: false, message: '获取成交项目数据失败' });
  }
});

app.post('/api/closing-projects', async (req, res) => {
  try {
    const { name, description, status, dealTime, price, serviceEndTime, nextYearFeeStatus, contractFeeStatus, remainingAmount, provinceId, cityId, countyId } = req.body;
    
    console.log('接收到的请求数据:', req.body);
    
    // 转换日期格式为YYYY-MM-DD
    function formatDate(dateString) {
      if (!dateString) return null;
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    const formattedDealTime = formatDate(dealTime);
    const formattedServiceEndTime = formatDate(serviceEndTime);
    // 使用dealTime作为startDate
    const formattedStartDate = formattedDealTime;
    
    console.log('格式化后的日期:', {
      startDate: formattedStartDate,
      dealTime: formattedDealTime,
      serviceEndTime: formattedServiceEndTime
    });
    
    const query = `INSERT INTO closing_projects (name, description, status, startDate, dealTime, price, serviceEndTime, nextYearFeeStatus, contractFeeStatus, remainingAmount, provinceId, cityId, countyId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [name, description, status, formattedStartDate, formattedDealTime, price, formattedServiceEndTime, nextYearFeeStatus, contractFeeStatus || '未结', remainingAmount || 0, provinceId, cityId, countyId, new Date().toISOString().replace('T', ' ').replace('Z', '')];
    
    console.log('SQL查询:', query);
    console.log('SQL参数:', values);
    
    await pool.execute(query, values);
    res.json({ success: true, message: '成交项目添加成功' });
  } catch (error) {
    console.error('添加成交项目失败:', error);
    res.status(500).json({ success: false, message: '添加成交项目失败' });
  }
});

app.put('/api/closing-projects/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, status, dealTime, price, serviceEndTime, nextYearFeeStatus, contractFeeStatus, remainingAmount, provinceId, cityId, countyId } = req.body;
  try {
    // 转换日期格式为YYYY-MM-DD
    const formatDate = (dateString) => {
      if (!dateString) return null;
      return new Date(dateString).toISOString().split('T')[0];
    };
    
    // 使用dealTime作为startDate
    const formattedStartDate = formatDate(dealTime);
    
    await pool.execute(
      'UPDATE closing_projects SET name = ?, description = ?, status = ?, startDate = ?, dealTime = ?, price = ?, serviceEndTime = ?, nextYearFeeStatus = ?, contractFeeStatus = ?, remainingAmount = ?, provinceId = ?, cityId = ?, countyId = ? WHERE id = ?',
      [name, description, status, formattedStartDate, formatDate(dealTime), price, formatDate(serviceEndTime), nextYearFeeStatus, contractFeeStatus || '未结', remainingAmount || 0, provinceId, cityId, countyId, id]
    );
    res.json({ success: true, message: '成交项目更新成功' });
  } catch (error) {
    console.error('更新成交项目失败:', error);
    res.status(500).json({ success: false, message: '更新成交项目失败' });
  }
});

app.delete('/api/closing-projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM closing_projects WHERE id = ?', [id]);
    res.json({ success: true, message: '成交项目删除成功' });
  } catch (error) {
    console.error('删除成交项目失败:', error);
    res.status(500).json({ success: false, message: '删除成交项目失败' });
  }
});

app.get('/api/closing-projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [projects] = await pool.execute('SELECT * FROM closing_projects WHERE id = ?', [id]);
    if (projects.length > 0) {
      res.json({ success: true, data: projects[0] });
    } else {
      res.json({ success: false, message: '项目不存在' });
    }
  } catch (error) {
    console.error('获取成交项目详情失败:', error);
    res.status(500).json({ success: false, message: '获取成交项目详情失败' });
  }
});

// 省市区划API
// 获取所有省份（带项目数量统计）
app.get('/api/provinces', async (req, res) => {
  try {
    const [provinces] = await pool.execute(`
      SELECT p.id, p.name, p.code, COUNT(cp.id) as projectCount
      FROM provinces p
      LEFT JOIN closing_projects cp ON p.id = cp.provinceId
      GROUP BY p.id, p.name, p.code
      ORDER BY p.id
    `);
    res.json({ success: true, data: provinces });
  } catch (error) {
    console.error('获取省份数据失败:', error);
    res.status(500).json({ success: false, message: '获取省份数据失败' });
  }
});

// 获取省份下的城市（带项目数量统计）
app.get('/api/provinces/:provinceId/cities', async (req, res) => {
  const { provinceId } = req.params;
  try {
    const [cities] = await pool.execute(`
      SELECT c.id, c.name, c.code, COUNT(cp.id) as projectCount
      FROM cities c
      LEFT JOIN counties co ON c.id = co.cityId
      LEFT JOIN closing_projects cp ON co.id = cp.countyId
      WHERE c.provinceId = ?
      GROUP BY c.id, c.name, c.code
      ORDER BY c.id
    `, [provinceId]);
    res.json({ success: true, data: cities });
  } catch (error) {
    console.error('获取城市数据失败:', error);
    res.status(500).json({ success: false, message: '获取城市数据失败' });
  }
});

// 获取城市下的旗县（带项目数量统计）
app.get('/api/cities/:cityId/counties', async (req, res) => {
  const { cityId } = req.params;
  try {
    const [counties] = await pool.execute(`
      SELECT c.id, c.name, c.code, COUNT(cp.id) as projectCount
      FROM counties c
      LEFT JOIN closing_projects cp ON c.id = cp.countyId
      WHERE c.cityId = ?
      GROUP BY c.id, c.name, c.code
      ORDER BY c.id
    `, [cityId]);
    res.json({ success: true, data: counties });
  } catch (error) {
    console.error('获取旗县数据失败:', error);
    res.status(500).json({ success: false, message: '获取旗县数据失败' });
  }
});

// 获取旗县下的项目列表
app.get('/api/counties/:countyId/projects', async (req, res) => {
  const { countyId } = req.params;
  try {
    const [projects] = await pool.execute(`
      SELECT cp.*, p.name as provinceName, c.name as cityName, co.name as countyName
      FROM closing_projects cp
      LEFT JOIN provinces p ON cp.provinceId = p.id
      LEFT JOIN cities c ON cp.cityId = c.id
      LEFT JOIN counties co ON cp.countyId = co.id
      WHERE cp.countyId = ?
      ORDER BY cp.createdAt DESC
    `, [countyId]);
    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('获取项目列表失败:', error);
    res.status(500).json({ success: false, message: '获取项目列表失败' });
  }
});

// 根据省份ID获取省份信息
app.get('/api/provinces/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [provinces] = await pool.execute('SELECT * FROM provinces WHERE id = ?', [id]);
    if (provinces.length > 0) {
      res.json({ success: true, data: provinces[0] });
    } else {
      res.json({ success: false, message: '省份不存在' });
    }
  } catch (error) {
    console.error('获取省份信息失败:', error);
    res.status(500).json({ success: false, message: '获取省份信息失败' });
  }
});

// 根据城市ID获取城市信息
app.get('/api/cities/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [cities] = await pool.execute('SELECT * FROM cities WHERE id = ?', [id]);
    if (cities.length > 0) {
      res.json({ success: true, data: cities[0] });
    } else {
      res.json({ success: false, message: '城市不存在' });
    }
  } catch (error) {
    console.error('获取城市信息失败:', error);
    res.status(500).json({ success: false, message: '获取城市信息失败' });
  }
});

// 根据旗县ID获取旗县信息
app.get('/api/counties/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [counties] = await pool.execute('SELECT * FROM counties WHERE id = ?', [id]);
    if (counties.length > 0) {
      res.json({ success: true, data: counties[0] });
    } else {
      res.json({ success: false, message: '旗县不存在' });
    }
  } catch (error) {
    console.error('获取旗县信息失败:', error);
    res.status(500).json({ success: false, message: '获取旗县信息失败' });
  }
});

// 创建省份
app.post('/api/provinces', async (req, res) => {
  const { name, code } = req.body;
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.execute(
      'INSERT INTO provinces (name, code, createdAt) VALUES (?, ?, ?)',
      [name, code, now]
    );
    res.json({ success: true, message: '省份创建成功', data: { id: result.insertId, name, code } });
  } catch (error) {
    console.error('创建省份失败:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: '省份名称或代码已存在' });
    } else {
      res.status(500).json({ success: false, message: '创建省份失败' });
    }
  }
});

// 编辑省份
app.put('/api/provinces/:id', async (req, res) => {
  const { id } = req.params;
  const { name, code } = req.body;
  try {
    // 检查省份是否存在
    const [existingProvinces] = await pool.execute('SELECT id FROM provinces WHERE id = ?', [id]);
    if (existingProvinces.length === 0) {
      return res.json({ success: false, message: '省份不存在' });
    }
    
    // 检查省份名称是否已被其他省份使用
    const [existingNames] = await pool.execute('SELECT id FROM provinces WHERE name = ? AND id != ?', [name, id]);
    if (existingNames.length > 0) {
      return res.json({ success: false, message: '省份名称已存在' });
    }
    
    // 检查省份代码是否已被其他省份使用
    const [existingCodes] = await pool.execute('SELECT id FROM provinces WHERE code = ? AND id != ?', [code, id]);
    if (existingCodes.length > 0) {
      return res.json({ success: false, message: '省份代码已存在' });
    }
    
    await pool.execute('UPDATE provinces SET name = ?, code = ? WHERE id = ?', [name, code, id]);
    res.json({ success: true, message: '省份编辑成功' });
  } catch (error) {
    console.error('编辑省份失败:', error);
    res.status(500).json({ success: false, message: '编辑省份失败' });
  }
});

// 删除省份
app.delete('/api/provinces/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 查找该省份下的所有城市
      const [cities] = await connection.execute('SELECT id FROM cities WHERE provinceId = ?', [id]);
      const cityIds = cities.map((city) => city.id);
      
      if (cityIds.length > 0) {
        // 查找这些城市下的所有旗县
        const placeholders = cityIds.map(() => '?').join(',');
        const [counties] = await connection.execute(
          `SELECT id FROM counties WHERE cityId IN (${placeholders})`,
          cityIds
        );
        const countyIds = counties.map((county) => county.id);
        
        if (countyIds.length > 0) {
          // 删除这些旗县下的所有项目
          const countyPlaceholders = countyIds.map(() => '?').join(',');
          await connection.execute(
            `DELETE FROM closing_projects WHERE countyId IN (${countyPlaceholders})`,
            countyIds
          );
        }
        
        // 删除这些城市下的所有旗县
        await connection.execute(
          `DELETE FROM counties WHERE cityId IN (${placeholders})`,
          cityIds
        );
      }
      
      // 删除该省份下的所有城市
      await connection.execute('DELETE FROM cities WHERE provinceId = ?', [id]);
      
      // 删除省份
      await connection.execute('DELETE FROM provinces WHERE id = ?', [id]);
      
      // 提交事务
      await connection.commit();
      connection.release();
      
      res.json({ success: true, message: '省份删除成功' });
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('删除省份失败:', error);
    res.status(500).json({ success: false, message: '删除省份失败' });
  }
});

// 创建城市
app.post('/api/cities', async (req, res) => {
  const { name, code, provinceId } = req.body;
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.execute(
      'INSERT INTO cities (name, code, provinceId, createdAt) VALUES (?, ?, ?, ?)',
      [name, code, provinceId, now]
    );
    res.json({ success: true, message: '城市创建成功', data: { id: result.insertId, name, code, provinceId } });
  } catch (error) {
    console.error('创建城市失败:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: '该省份下已存在同名城市' });
    } else {
      res.status(500).json({ success: false, message: '创建城市失败' });
    }
  }
});

// 编辑城市
app.put('/api/cities/:id', async (req, res) => {
  const { id } = req.params;
  const { name, code, provinceId } = req.body;
  try {
    // 检查城市是否存在
    const [existingCities] = await pool.execute('SELECT id FROM cities WHERE id = ?', [id]);
    if (existingCities.length === 0) {
      return res.json({ success: false, message: '城市不存在' });
    }
    
    // 检查城市名称是否已被其他城市使用
    const [existingNames] = await pool.execute('SELECT id FROM cities WHERE name = ? AND id != ?', [name, id]);
    if (existingNames.length > 0) {
      return res.json({ success: false, message: '城市名称已存在' });
    }
    
    // 检查城市代码是否已被其他城市使用
    const [existingCodes] = await pool.execute('SELECT id FROM cities WHERE code = ? AND id != ?', [code, id]);
    if (existingCodes.length > 0) {
      return res.json({ success: false, message: '城市代码已存在' });
    }
    
    // 准备更新参数
    const updateParams = [name, code];
    let updateQuery = 'UPDATE cities SET name = ?, code = ?';
    
    // 如果提供了provinceId，则更新省份ID
    if (provinceId !== undefined) {
      updateQuery += ', provinceId = ?';
      updateParams.push(provinceId);
    }
    
    updateQuery += ' WHERE id = ?';
    updateParams.push(id);
    
    await pool.execute(updateQuery, updateParams);
    res.json({ success: true, message: '城市编辑成功' });
  } catch (error) {
    console.error('编辑城市失败:', error);
    res.status(500).json({ success: false, message: '编辑城市失败' });
  }
});

// 删除城市
app.delete('/api/cities/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 查找该城市下的所有旗县
      const [counties] = await connection.execute('SELECT id FROM counties WHERE cityId = ?', [id]);
      const countyIds = counties.map((county) => county.id);
      
      if (countyIds.length > 0) {
        // 删除这些旗县下的所有项目
        const countyPlaceholders = countyIds.map(() => '?').join(',');
        await connection.execute(
          `DELETE FROM closing_projects WHERE countyId IN (${countyPlaceholders})`,
          countyIds
        );
        
        // 删除这些旗县
        await connection.execute(
          `DELETE FROM counties WHERE cityId IN (?)`,
          [id]
        );
      }
      
      // 删除城市
      await connection.execute('DELETE FROM cities WHERE id = ?', [id]);
      
      // 提交事务
      await connection.commit();
      connection.release();
      
      res.json({ success: true, message: '城市删除成功' });
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('删除城市失败:', error);
    res.status(500).json({ success: false, message: '删除城市失败' });
  }
});

// 创建旗县
app.post('/api/counties', async (req, res) => {
  const { name, code, cityId } = req.body;
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.execute(
      'INSERT INTO counties (name, code, cityId, createdAt) VALUES (?, ?, ?, ?)',
      [name, code, cityId, now]
    );
    res.json({ success: true, message: '旗县创建成功', data: { id: result.insertId, name, code, cityId } });
  } catch (error) {
    console.error('创建旗县失败:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: '该城市下已存在同名旗县' });
    } else {
      res.status(500).json({ success: false, message: '创建旗县失败' });
    }
  }
});




// 创建HTTP服务器
const server = createServer(app);

// 创建Socket.io服务器
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

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

// ==================== 系统管理 API ====================

// 角色管理 API

// 获取所有角色
app.get('/api/roles', async (req, res) => {
  try {
    const [roles] = await pool.execute('SELECT * FROM roles ORDER BY id');
    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('获取角色列表失败:', error);
    res.status(500).json({ success: false, message: '获取角色列表失败' });
  }
});

// 获取单个角色
app.get('/api/roles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [roles] = await pool.execute('SELECT * FROM roles WHERE id = ?', [id]);
    if (roles.length === 0) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    res.json({ success: true, data: roles[0] });
  } catch (error) {
    console.error('获取角色失败:', error);
    res.status(500).json({ success: false, message: '获取角色失败' });
  }
});

// 创建角色
app.post('/api/roles', async (req, res) => {
  const { name, code, description, status } = req.body;
  try {
    // 检查必填字段
    if (!name || !code) {
      return res.status(400).json({ success: false, message: '角色名称和编码不能为空' });
    }
    
    // 检查code是否已存在
    const [existingRoles] = await pool.execute('SELECT * FROM roles WHERE code = ?', [code]);
    if (existingRoles.length > 0) {
      return res.status(400).json({ success: false, message: '角色编码已存在' });
    }
    
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.execute(
      'INSERT INTO roles (name, code, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [name, code, description || '', status || '启用', now, now]
    );
    res.json({ success: true, message: '角色创建成功', data: { id: result.insertId } });
  } catch (error) {
    console.error('创建角色失败:', error);
    res.status(500).json({ success: false, message: '创建角色失败: ' + error.message });
  }
});

// 更新角色
app.put('/api/roles/:id', async (req, res) => {
  const { id } = req.params;
  const { name, code, description, status } = req.body;
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'UPDATE roles SET name = ?, code = ?, description = ?, status = ?, updatedAt = ? WHERE id = ?',
      [name, code, description || '', status || '启用', now, id]
    );
    res.json({ success: true, message: '角色更新成功' });
  } catch (error) {
    console.error('更新角色失败:', error);
    res.status(500).json({ success: false, message: '更新角色失败' });
  }
});

// 删除角色
app.delete('/api/roles/:id', async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    console.log(`开始删除角色 ID: ${id}`);
    
    // 先删除角色关联的权限记录
    const [permResult] = await connection.execute('DELETE FROM role_permissions WHERE roleId = ?', [id]);
    console.log(`删除权限记录: ${permResult.affectedRows} 条`);
    
    // 再删除角色
    const [roleResult] = await connection.execute('DELETE FROM roles WHERE id = ?', [id]);
    console.log(`删除角色: ${roleResult.affectedRows} 条`);
    
    await connection.commit();
    console.log('事务提交成功');
    res.json({ success: true, message: '角色删除成功' });
  } catch (error) {
    await connection.rollback();
    console.error('删除角色失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误码:', error.code);
    console.error('SQL状态:', error.sqlState);
    res.status(500).json({ success: false, message: '删除角色失败: ' + error.message });
  } finally {
    connection.release();
  }
});

// 菜单管理 API

// 获取所有菜单（树形结构）
app.get('/api/menus', async (req, res) => {
  try {
    const [menus] = await pool.execute('SELECT * FROM menus ORDER BY sort, id');
    
    // 构建树形结构
    const buildTree = (menus, parentId = 0) => {
      return menus
        .filter(menu => menu.parentId === parentId)
        .map(menu => ({
          ...menu,
          children: buildTree(menus, menu.id)
        }));
    };
    
    const menuTree = buildTree(menus);
    res.json({ success: true, data: menuTree });
  } catch (error) {
    console.error('获取菜单列表失败:', error);
    res.status(500).json({ success: false, message: '获取菜单列表失败' });
  }
});

// 获取单个菜单
app.get('/api/menus/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [menus] = await pool.execute('SELECT * FROM menus WHERE id = ?', [id]);
    if (menus.length === 0) {
      return res.status(404).json({ success: false, message: '菜单不存在' });
    }
    res.json({ success: true, data: menus[0] });
  } catch (error) {
    console.error('获取菜单失败:', error);
    res.status(500).json({ success: false, message: '获取菜单失败' });
  }
});

// 创建菜单
app.post('/api/menus', async (req, res) => {
  const { parentId, name, path, component, icon, sort, status } = req.body;
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.execute(
      'INSERT INTO menus (parentId, name, path, component, icon, sort, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [parentId || 0, name, path, component || '', icon || '', sort || 0, status || '启用', now, now]
    );
    res.json({ success: true, message: '菜单创建成功', data: { id: result.insertId } });
  } catch (error) {
    console.error('创建菜单失败:', error);
    res.status(500).json({ success: false, message: '创建菜单失败' });
  }
});

// 更新菜单
app.put('/api/menus/:id', async (req, res) => {
  const { id } = req.params;
  const { parentId, name, path, component, icon, sort, status } = req.body;
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'UPDATE menus SET parentId = ?, name = ?, path = ?, component = ?, icon = ?, sort = ?, status = ?, updatedAt = ? WHERE id = ?',
      [parentId || 0, name, path, component || '', icon || '', sort || 0, status || '启用', now, id]
    );
    res.json({ success: true, message: '菜单更新成功' });
  } catch (error) {
    console.error('更新菜单失败:', error);
    res.status(500).json({ success: false, message: '更新菜单失败' });
  }
});

// 删除菜单
app.delete('/api/menus/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 先删除子菜单
    await pool.execute('DELETE FROM menus WHERE parentId = ?', [id]);
    // 再删除当前菜单
    await pool.execute('DELETE FROM menus WHERE id = ?', [id]);
    res.json({ success: true, message: '菜单删除成功' });
  } catch (error) {
    console.error('删除菜单失败:', error);
    res.status(500).json({ success: false, message: '删除菜单失败' });
  }
});

// 角色权限管理 API

// 获取角色的权限
app.get('/api/roles/:id/permissions', async (req, res) => {
  const { id } = req.params;
  try {
    const [permissions] = await pool.execute(
      'SELECT menuId FROM role_permissions WHERE roleId = ?',
      [id]
    );
    res.json({ success: true, data: permissions.map(p => p.menuId) });
  } catch (error) {
    console.error('获取角色权限失败:', error);
    res.status(500).json({ success: false, message: '获取角色权限失败' });
  }
});

// 分配角色权限
app.post('/api/roles/:id/permissions', async (req, res) => {
  const { id } = req.params;
  const { menuIds } = req.body;
  const connection = await pool.getConnection();
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    await connection.beginTransaction();
    
    // 先删除原有权限
    await connection.execute('DELETE FROM role_permissions WHERE roleId = ?', [id]);
    console.log(`删除角色 ${id} 的所有权限`);
    
    // 添加新权限 - 不指定id，让数据库自动生成
    if (menuIds && menuIds.length > 0) {
      for (const menuId of menuIds) {
        try {
          console.log(`插入权限: roleId=${id}, menuId=${menuId}`);
          await connection.execute(
            'INSERT INTO role_permissions (roleId, menuId, createdAt) VALUES (?, ?, ?)',
            [id, menuId, now]
          );
        } catch (insertError) {
          console.error('插入权限记录失败:', insertError.message);
          // 继续处理下一个
        }
      }
    }
    
    await connection.commit();
    console.log('权限分配成功');
    res.json({ success: true, message: '权限分配成功' });
  } catch (error) {
    await connection.rollback();
    console.error('分配权限失败:', error);
    res.status(500).json({ success: false, message: '分配权限失败: ' + error.message });
  } finally {
    connection.release();
  }
});

// ==================== OA审批系统API接口 ====================

// 获取审批流程列表
app.get('/api/oa/flows', async (req, res) => {
  try {
    const [flows] = await pool.execute('SELECT * FROM oa_approval_flows WHERE status = ?', ['启用']);
    res.json({ success: true, data: flows });
  } catch (error) {
    console.error('获取审批流程列表失败:', error);
    res.status(500).json({ success: false, message: '获取审批流程列表失败: ' + error.message });
  }
});

// 生成审批路径
app.post('/api/oa/generate-approval-path', async (req, res) => {
  try {
    const { applicantId, applicantName, applicantDept, applicantPosition } = req.body;
    
    // 查找直接上级
    const [approverConfigs] = await pool.execute(
      'SELECT * FROM oa_approver_configs WHERE department = ? AND position = ?',
      [applicantDept, applicantPosition]
    );
    
    if (approverConfigs.length === 0) {
      return res.status(400).json({ success: false, message: '未找到申请人的职位配置' });
    }
    
    const config = approverConfigs[0];
    const approvalPath = [];
    let order = 1;
    
    // 1. 查找直接上级
    if (config.superiorPosition) {
      const [superior] = await pool.execute(
        'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.department = ? AND c.position = ?',
        [applicantDept, config.superiorPosition]
      );
      
      if (superior.length > 0) {
        approvalPath.push({
          order: order++,
          type: 'direct_superior',
          position: config.superiorPosition,
          name: superior[0].name,
          userId: superior[0].id
        });
      }
    }
    
    // 2. 查找部门负责人（如果直接上级不是部门负责人）
    if (!config.isDeptManager) {
      const [deptManager] = await pool.execute(
        'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.department = ? AND c.isDeptManager = ?',
        [applicantDept, true]
      );
      
      if (deptManager.length > 0) {
        // 避免重复添加
        const existingIndex = approvalPath.findIndex(p => p.userId === deptManager[0].id);
        if (existingIndex === -1) {
          approvalPath.push({
            order: order++,
            type: 'dept_manager',
            position: deptManager[0].position,
            name: deptManager[0].name,
            userId: deptManager[0].id
          });
        }
      }
    }
    
    // 3. 如果直接上级不存在，直接到最高管理者
    if (approvalPath.length === 0) {
      const [topManager] = await pool.execute(
        'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.isTopManager = ?',
        [true]
      );
      
      if (topManager.length > 0) {
        approvalPath.push({
          order: order++,
          type: 'top_manager',
          position: topManager[0].position,
          name: topManager[0].name,
          userId: topManager[0].id,
          note: '直接上级缺失，直达最高管理者'
        });
      }
    } else {
      // 4. 查找最高管理者
      const [topManager] = await pool.execute(
        'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.isTopManager = ?',
        [true]
      );
      
      if (topManager.length > 0) {
        approvalPath.push({
          order: order++,
          type: 'top_manager',
          position: topManager[0].position,
          name: topManager[0].name,
          userId: topManager[0].id
        });
      }
    }
    
    // 5. 查找财务总监
    const [financeDirector] = await pool.execute(
      'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.isFinanceDirector = ?',
      [true]
    );
    
    if (financeDirector.length > 0) {
      approvalPath.push({
        order: order++,
        type: 'finance_director',
        position: financeDirector[0].position,
        name: financeDirector[0].name,
        userId: financeDirector[0].id
      });
    }
    
    res.json({ success: true, data: approvalPath });
  } catch (error) {
    console.error('生成审批路径失败:', error);
    res.status(500).json({ success: false, message: '生成审批路径失败: ' + error.message });
  }
});

// 提交审批申请
app.post('/api/oa/submit', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { flowCode, applicantId, applicantName, applicantDept, applicantPosition, businessType, businessData } = req.body;
    
    // 生成审批路径
    const [approverConfigs] = await connection.execute(
      'SELECT * FROM oa_approver_configs WHERE department = ? AND position = ?',
      [applicantDept, applicantPosition]
    );
    
    if (approverConfigs.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: '未找到申请人的职位配置' });
    }
    
    const config = approverConfigs[0];
    const approvalPath = [];
    let order = 1;
    
    // 1. 查找直接上级
    if (config.superiorPosition) {
      const [superior] = await connection.execute(
        'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.department = ? AND c.position = ?',
        [applicantDept, config.superiorPosition]
      );
      
      if (superior.length > 0) {
        approvalPath.push({
          order: order++,
          type: 'direct_superior',
          position: config.superiorPosition,
          name: superior[0].name,
          userId: superior[0].id
        });
      }
    }
    
    // 2. 查找部门负责人
    if (!config.isDeptManager) {
      const [deptManager] = await connection.execute(
        'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.department = ? AND c.isDeptManager = ?',
        [applicantDept, true]
      );
      
      if (deptManager.length > 0) {
        const existingIndex = approvalPath.findIndex(p => p.userId === deptManager[0].id);
        if (existingIndex === -1) {
          approvalPath.push({
            order: order++,
            type: 'dept_manager',
            position: deptManager[0].position,
            name: deptManager[0].name,
            userId: deptManager[0].id
          });
        }
      }
    }
    
    // 3. 如果直接上级不存在，直接到最高管理者
    if (approvalPath.length === 0) {
      const [topManager] = await connection.execute(
        'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.isTopManager = ?',
        [true]
      );
      
      if (topManager.length > 0) {
        approvalPath.push({
          order: order++,
          type: 'top_manager',
          position: topManager[0].position,
          name: topManager[0].name,
          userId: topManager[0].id,
          note: '直接上级缺失，直达最高管理者'
        });
      }
    } else {
      // 4. 查找最高管理者
      const [topManager] = await connection.execute(
        'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.isTopManager = ?',
        [true]
      );
      
      if (topManager.length > 0) {
        approvalPath.push({
          order: order++,
          type: 'top_manager',
          position: topManager[0].position,
          name: topManager[0].name,
          userId: topManager[0].id
        });
      }
    }
    
    // 5. 查找财务总监
    const [financeDirector] = await connection.execute(
      'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.isFinanceDirector = ?',
      [true]
    );
    
    if (financeDirector.length > 0) {
      approvalPath.push({
        order: order++,
        type: 'finance_director',
        position: financeDirector[0].position,
        name: financeDirector[0].name,
        userId: financeDirector[0].id
      });
    }
    
    if (approvalPath.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: '无法生成审批路径，请检查组织架构配置' });
    }
    
    // 获取第一个审批人
    const firstApprover = approvalPath[0];
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // 创建审批实例
    const [result] = await connection.execute(
      'INSERT INTO oa_approval_instances (flowCode, applicantId, applicantName, applicantDept, applicantPosition, businessType, businessData, currentApproverType, currentApproverId, currentApproverName, approvalPath, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [flowCode, applicantId, applicantName, applicantDept, applicantPosition, businessType, JSON.stringify(businessData), firstApprover.type, firstApprover.userId, firstApprover.name, JSON.stringify(approvalPath), '审批中', now]
    );
    
    await connection.commit();
    
    res.json({ 
      success: true, 
      message: '申请提交成功',
      data: {
        instanceId: result.insertId,
        approvalPath: approvalPath,
        currentApprover: firstApprover
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('提交审批申请失败:', error);
    res.status(500).json({ success: false, message: '提交审批申请失败: ' + error.message });
  } finally {
    connection.release();
  }
});

// 获取我的待办审批列表
app.get('/api/oa/todo/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [instances] = await pool.execute(
      'SELECT * FROM oa_approval_instances WHERE currentApproverId = ? AND status = ? ORDER BY createdAt DESC',
      [userId, '审批中']
    );
    
    // 解析businessData和approvalPath
    const formattedInstances = instances.map(instance => ({
      ...instance,
      businessData: JSON.parse(instance.businessData || '{}'),
      approvalPath: JSON.parse(instance.approvalPath || '[]')
    }));
    
    res.json({ success: true, data: formattedInstances });
  } catch (error) {
    console.error('获取待办审批列表失败:', error);
    res.status(500).json({ success: false, message: '获取待办审批列表失败: ' + error.message });
  }
});

// 获取我的已办审批列表
app.get('/api/oa/done/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [histories] = await pool.execute(
      `SELECT h.*, i.flowCode, i.applicantName, i.applicantDept, i.businessType, i.businessData, i.status as instanceStatus 
       FROM oa_approval_history h 
       JOIN oa_approval_instances i ON h.instanceId = i.id 
       WHERE h.approverId = ? 
       ORDER BY h.createdAt DESC`,
      [userId]
    );
    
    // 解析businessData
    const formattedHistories = histories.map(history => ({
      ...history,
      businessData: JSON.parse(history.businessData || '{}')
    }));
    
    res.json({ success: true, data: formattedHistories });
  } catch (error) {
    console.error('获取已办审批列表失败:', error);
    res.status(500).json({ success: false, message: '获取已办审批列表失败: ' + error.message });
  }
});

// 获取我发起的审批列表
app.get('/api/oa/my-applications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [instances] = await pool.execute(
      'SELECT * FROM oa_approval_instances WHERE applicantId = ? ORDER BY createdAt DESC',
      [userId]
    );
    
    // 解析businessData和approvalPath
    const formattedInstances = instances.map(instance => ({
      ...instance,
      businessData: JSON.parse(instance.businessData || '{}'),
      approvalPath: JSON.parse(instance.approvalPath || '[]')
    }));
    
    res.json({ success: true, data: formattedInstances });
  } catch (error) {
    console.error('获取我的申请列表失败:', error);
    res.status(500).json({ success: false, message: '获取我的申请列表失败: ' + error.message });
  }
});

// 获取审批详情
app.get('/api/oa/detail/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    
    // 获取审批实例
    const [instances] = await pool.execute(
      'SELECT * FROM oa_approval_instances WHERE id = ?',
      [instanceId]
    );
    
    if (instances.length === 0) {
      return res.status(404).json({ success: false, message: '审批实例不存在' });
    }
    
    const instance = instances[0];
    
    // 获取审批历史
    const [histories] = await pool.execute(
      'SELECT * FROM oa_approval_history WHERE instanceId = ? ORDER BY nodeOrder ASC',
      [instanceId]
    );
    
    res.json({
      success: true,
      data: {
        ...instance,
        businessData: JSON.parse(instance.businessData || '{}'),
        approvalPath: JSON.parse(instance.approvalPath || '[]'),
        histories: histories
      }
    });
  } catch (error) {
    console.error('获取审批详情失败:', error);
    res.status(500).json({ success: false, message: '获取审批详情失败: ' + error.message });
  }
});

// 处理审批
app.post('/api/oa/process', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { instanceId, approverId, approverName, approverPosition, action, comment } = req.body;
    
    // 获取审批实例
    const [instances] = await connection.execute(
      'SELECT * FROM oa_approval_instances WHERE id = ?',
      [instanceId]
    );
    
    if (instances.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '审批实例不存在' });
    }
    
    const instance = instances[0];
    
    // 验证审批人权限
    if (instance.currentApproverId !== approverId) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: '您不是当前审批人，无权处理' });
    }
    
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const approvalPath = JSON.parse(instance.approvalPath || '[]');
    const currentNodeOrder = approvalPath.findIndex(p => p.userId === approverId) + 1;
    
    // 记录审批历史
    await connection.execute(
      'INSERT INTO oa_approval_history (instanceId, nodeOrder, approverType, approverId, approverName, approverPosition, action, comment, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [instanceId, currentNodeOrder, instance.currentApproverType, approverId, approverName, approverPosition, action, comment, now]
    );
    
    // 根据操作处理
    if (action === 'agree') {
      // 查找下一个审批节点
      const currentIndex = approvalPath.findIndex(p => p.userId === approverId);
      const nextNode = approvalPath[currentIndex + 1];
      
      if (!nextNode) {
        // 没有下一个节点，流程结束
        await connection.execute(
          'UPDATE oa_approval_instances SET status = ?, completedAt = ? WHERE id = ?',
          ['已批准', now, instanceId]
        );
      } else {
        // 更新当前审批人为下一个审批人
        await connection.execute(
          'UPDATE oa_approval_instances SET currentApproverType = ?, currentApproverId = ?, currentApproverName = ? WHERE id = ?',
          [nextNode.type, nextNode.userId, nextNode.name, instanceId]
        );
      }
    } else if (action === 'reject') {
      // 驳回，流程结束
      await connection.execute(
        'UPDATE oa_approval_instances SET status = ?, completedAt = ? WHERE id = ?',
        ['已驳回', now, instanceId]
      );
    } else if (action === 'return') {
      // 退回给申请人
      await connection.execute(
        'UPDATE oa_approval_instances SET status = ?, currentApproverType = NULL, currentApproverId = NULL, currentApproverName = NULL WHERE id = ?',
        ['已退回', instanceId]
      );
    }
    
    await connection.commit();
    
    res.json({ success: true, message: '审批处理成功' });
  } catch (error) {
    await connection.rollback();
    console.error('处理审批失败:', error);
    res.status(500).json({ success: false, message: '处理审批失败: ' + error.message });
  } finally {
    connection.release();
  }
});

// 撤回申请
app.post('/api/oa/withdraw', async (req, res) => {
  try {
    const { instanceId, applicantId } = req.body;
    
    // 验证申请人是本人且状态为审批中
    const [instances] = await pool.execute(
      'SELECT * FROM oa_approval_instances WHERE id = ? AND applicantId = ? AND status = ?',
      [instanceId, applicantId, '审批中']
    );
    
    if (instances.length === 0) {
      return res.status(400).json({ success: false, message: '申请不存在或无法撤回' });
    }
    
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'UPDATE oa_approval_instances SET status = ?, completedAt = ? WHERE id = ?',
      ['已撤回', now, instanceId]
    );
    
    res.json({ success: true, message: '申请撤回成功' });
  } catch (error) {
    console.error('撤回申请失败:', error);
    res.status(500).json({ success: false, message: '撤回申请失败: ' + error.message });
  }
});

// 获取审批人配置列表
app.get('/api/oa/approver-configs', async (req, res) => {
  try {
    const [configs] = await pool.execute('SELECT * FROM oa_approver_configs ORDER BY department, position');
    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('获取审批人配置失败:', error);
    res.status(500).json({ success: false, message: '获取审批人配置失败: ' + error.message });
  }
});

// 更新审批人配置
app.put('/api/oa/approver-config/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { superiorPosition, isDeptManager, isTopManager, isFinanceDirector } = req.body;
    
    await pool.execute(
      'UPDATE oa_approver_configs SET superiorPosition = ?, isDeptManager = ?, isTopManager = ?, isFinanceDirector = ? WHERE id = ?',
      [superiorPosition, isDeptManager, isTopManager, isFinanceDirector, id]
    );
    
    res.json({ success: true, message: '审批人配置更新成功' });
  } catch (error) {
    console.error('更新审批人配置失败:', error);
    res.status(500).json({ success: false, message: '更新审批人配置失败: ' + error.message });
  }
});

// ==================== 下发记录管理API ====================

// 获取所有下发记录列表（管理员用）- 注意：这个路由必须在带参数的路由之前定义
app.get('/api/distributed-records', async (req, res) => {
  try {
    console.log('收到获取所有下发记录请求');
    const [records] = await pool.execute(
      'SELECT * FROM distributed_records ORDER BY createdAt DESC'
    );
    console.log('查询到下发记录数量:', records.length);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取所有下发记录失败:', error);
    res.status(500).json({ success: false, message: '获取所有下发记录失败: ' + error.message });
  }
});

// 获取下发记录列表（根据目标用户）- 这个路由在特定路由之后定义
app.get('/api/distributed-records/user/:targetUser', async (req, res) => {
  try {
    let { targetUser } = req.params;
    console.log('接收到的targetUser:', targetUser);
    
    // 提取真实姓名（从emp_姓名_时间戳格式中）
    const match = targetUser.match(/^emp_(.+?)_\d+$/);
    if (match) {
      targetUser = match[1];
      console.log('提取后的真实姓名:', targetUser);
    }
    
    const [records] = await pool.execute(
      'SELECT * FROM distributed_records WHERE targetUser = ? ORDER BY createdAt DESC',
      [targetUser]
    );
    
    console.log('查询到的下发记录数量:', records.length);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取下发记录失败:', error);
    res.status(500).json({ success: false, message: '获取下发记录失败: ' + error.message });
  }
});

// 添加下发记录
app.post('/api/distributed-records', async (req, res) => {
  try {
    const { applicationId, applicationType, applicant, distributedBy, targetUser, comment, status } = req.body;
    
    console.log('收到下发记录请求:', req.body);
    
    // 验证必填字段
    if (!applicationId || !applicationType || !applicant || !distributedBy || !targetUser) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少必填字段',
        required: ['applicationId', 'applicationType', 'applicant', 'distributedBy', 'targetUser'],
        received: { applicationId, applicationType, applicant, distributedBy, targetUser }
      });
    }
    
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const [result] = await pool.execute(
      'INSERT INTO distributed_records (applicationId, applicationType, applicant, distributedBy, targetUser, comment, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [applicationId, applicationType, applicant, distributedBy, targetUser, comment || '', status || '待处理', now]
    );
    
    console.log('下发记录添加成功, ID:', result.insertId);
    res.json({ success: true, message: '下发记录添加成功', data: { id: result.insertId } });
  } catch (error) {
    console.error('添加下发记录失败:', error);
    res.status(500).json({ success: false, message: '添加下发记录失败: ' + error.message });
  }
});

// 更新下发记录
app.put('/api/distributed-records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment, processComment } = req.body;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // 构建动态更新SQL
    const updates = [];
    const params = [];
    
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (comment !== undefined) {
      updates.push('comment = ?');
      params.push(comment);
    }
    if (processComment !== undefined) {
      updates.push('processComment = ?');
      params.push(processComment);
    }
    
    // 始终更新updatedAt
    updates.push('updatedAt = ?');
    params.push(now);
    
    // 添加WHERE条件参数
    params.push(id);
    
    const sql = `UPDATE distributed_records SET ${updates.join(', ')} WHERE id = ?`;
    await pool.execute(sql, params);
    
    res.json({ success: true, message: '下发记录更新成功' });
  } catch (error) {
    console.error('更新下发记录失败:', error);
    res.status(500).json({ success: false, message: '更新下发记录失败: ' + error.message });
  }
});

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

// 项目申请API
// 获取项目列表
app.get('/api/projects', async (req, res) => {
  try {
    const { applicantId, status, page = 1, pageSize = 10 } = req.query;
    
    let sql = 'SELECT * FROM project_applications WHERE 1=1';
    const params = [];
    
    if (applicantId) {
      sql += ' AND applicant_id = ?';
      params.push(applicantId);
    }
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const pageSizeInt2 = parseInt(pageSize, 10);
    const offset2 = (parseInt(page, 10) - 1) * pageSizeInt2;
    params.push(pageSizeInt2, offset2);
    
    const [projects] = await pool.query(sql, params);
    
    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM project_applications WHERE 1=1';
    const countParams = [];
    
    if (applicantId) {
      countSql += ' AND applicant_id = ?';
      countParams.push(applicantId);
    }
    
    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    
    const [countResult] = await pool.execute(countSql, countParams);
    
    res.json({
      success: true,
      data: {
        list: projects,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: countResult[0].total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建项目申请
app.post('/api/projects', async (req, res) => {
  try {
    console.log('前端提交的参数:', req.body);
    const {
      projectName, projectType, priority, budget, startDate, endDate,
      description, objectives, teamMembers, resources, applicantId
    } = req.body;
    
    // 验证必填参数
    if (!projectName || !projectType || !priority || budget === undefined || !startDate || !endDate || !description || !objectives || !resources || !applicantId) {
      console.log('缺少的必填参数:', {
        projectName: !projectName,
        projectType: !projectType,
        priority: !priority,
        budget: budget === undefined,
        startDate: !startDate,
        endDate: !endDate,
        description: !description,
        objectives: !objectives,
        resources: !resources,
        applicantId: !applicantId
      });
      return res.status(400).json({ success: false, message: '缺少必填参数' });
    }
    
    // 获取申请人信息
    const [employees] = await pool.execute(
      'SELECT * FROM employees WHERE id = ?',
      [applicantId]
    );
    
    if (employees.length === 0) {
      return res.status(400).json({ success: false, message: '申请人不存在' });
    }
    
    const applicant = employees[0];
    
    // 生成项目编号
    const date = new Date();
    const year = date.getFullYear();
    let projectCode;
    let sequence = 1;
    
    // 循环生成唯一的项目编号
    while (true) {
      projectCode = `PRJ-${year}-${String(sequence).padStart(4, '0')}`;
      const [existingProjects] = await pool.execute(
        'SELECT * FROM project_applications WHERE project_code = ?',
        [projectCode]
      );
      if (existingProjects.length === 0) {
        break;
      }
      sequence++;
    }
    
    // 创建项目申请
    const [result] = await pool.execute(
      `INSERT INTO project_applications 
       (project_code, project_name, applicant_id, applicant_name, department, 
        project_type, priority, budget, start_date, end_date, description, objectives,
        team_members, resources, status, current_step, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, NOW(), NOW())`,
      [
        projectCode, projectName, applicantId, applicant.name, applicant.department,
        projectType, priority, budget, startDate, endDate, description, objectives,
        JSON.stringify(teamMembers || []), resources
      ]
    );
    
    res.json({
      success: true,
      data: {
        id: result.insertId,
        projectCode,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('添加项目申请失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取项目详情
app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [projects] = await pool.execute(
      'SELECT * FROM project_applications WHERE id = ?',
      [id]
    );
    
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }
    
    const project = projects[0];
    project.team_members = JSON.parse(project.team_members || '[]');
    project.current_approvers = JSON.parse(project.current_approvers || '[]');
    project.approval_history = JSON.parse(project.approval_history || '[]');
    
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 审批项目
app.post('/api/projects/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment, approverId } = req.body;
    
    const [projects] = await pool.execute(
      'SELECT * FROM project_applications WHERE id = ?',
      [id]
    );
    
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }
    
    const project = projects[0];
    
    const [approvers] = await pool.execute(
      'SELECT * FROM employees WHERE id = ?',
      [approverId]
    );
    
    if (approvers.length === 0) {
      return res.status(400).json({ success: false, message: '审批人不存在' });
    }
    
    const approver = approvers[0];
    
    const historyRecord = {
      step: project.current_step,
      nodeName: '审批节点',
      approverId,
      approverName: approver.name,
      approverRole: approver.position,
      action,
      comment,
      createdAt: new Date()
    };
    
    const currentHistory = JSON.parse(project.approval_history || '[]');
    currentHistory.push(historyRecord);
    
    let newStatus = project.status;
    let newStep = project.current_step + 1;
    
    if (action === 'reject') {
      newStatus = 'rejected';
    } else if (action === 'agree') {
      newStatus = 'approved';
    }
    
    await pool.execute(
      `UPDATE project_applications 
       SET status = ?, current_step = ?, approval_history = ?, comment = ?, updated_at = NOW() 
       WHERE id = ?`,
      [newStatus, newStep, JSON.stringify(currentHistory), comment, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除项目申请
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [projects] = await pool.execute(
      'SELECT * FROM project_applications WHERE id = ?',
      [id]
    );
    
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }
    
    await pool.execute(
      'DELETE FROM project_applications WHERE id = ?',
      [id]
    );
    
    res.json({ success: true, message: '项目删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新项目申请
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { project_name, description, project_link } = req.body;
    
    const [projects] = await pool.execute(
      'SELECT * FROM project_applications WHERE id = ?',
      [id]
    );
    
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }
    
    await pool.execute(
      'UPDATE project_applications SET project_name = ?, description = ?, project_link = ?, updated_at = NOW() WHERE id = ?',
      [project_name, description, project_link, id]
    );
    
    res.json({ success: true, message: '项目更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 出差申请API
// 获取出差列表
app.get('/api/business-trips', async (req, res) => {
  try {
    const { applicantId, status, page = 1, pageSize = 10 } = req.query;
    
    let sql = 'SELECT * FROM business_trip_applications WHERE 1=1';
    const params = [];
    
    if (applicantId) {
      sql += ' AND applicant_id = ?';
      params.push(applicantId);
    }
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
    
    const [trips] = await pool.query(sql, params);
    
    let countSql = 'SELECT COUNT(*) as total FROM business_trip_applications WHERE 1=1';
    const countParams = [];
    
    if (applicantId) {
      countSql += ' AND applicant_id = ?';
      countParams.push(applicantId);
    }
    
    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    
    const [countResult] = await pool.execute(countSql, countParams);
    
    res.json({
      success: true,
      data: {
        list: trips,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: countResult[0].total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建出差申请
app.post('/api/business-trips', async (req, res) => {
  try {
    const {
      destination, tripType, startDate, endDate, purpose, itinerary,
      estimatedCost, costBreakdown, accommodation, transport,
      accompanyPersons, isUrgent, applicantId
    } = req.body;
    
    const [employees] = await pool.execute(
      'SELECT * FROM employees WHERE id = ?',
      [applicantId]
    );
    
    if (employees.length === 0) {
      return res.status(400).json({ success: false, message: '申请人不存在' });
    }
    
    const applicant = employees[0];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    const date = new Date();
    const year = date.getFullYear();
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM business_trip_applications WHERE YEAR(created_at) = ?',
      [year]
    );
    const sequence = String(countResult[0].count + 1).padStart(4, '0');
    const tripCode = `TRIP-${year}-${sequence}`;
    
    const [result] = await pool.execute(
      `INSERT INTO business_trip_applications 
       (trip_code, applicant_id, applicant_name, department, destination, trip_type,
        start_date, end_date, days, purpose, itinerary, estimated_cost, cost_breakdown,
        accommodation, transport, accompany_persons, is_urgent, status, current_step, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, NOW(), NOW())`,
      [
        tripCode, applicantId, applicant.name, applicant.department, destination, tripType,
        startDate, endDate, days, purpose, JSON.stringify(itinerary || []), estimatedCost,
        JSON.stringify(costBreakdown || {}), accommodation, transport,
        JSON.stringify(accompanyPersons || []), isUrgent ? 1 : 0
      ]
    );
    
    res.json({
      success: true,
      data: {
        id: result.insertId,
        tripCode,
        status: 'pending'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取出差详情
app.get('/api/business-trips/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [trips] = await pool.execute(
      'SELECT * FROM business_trip_applications WHERE id = ?',
      [id]
    );
    
    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: '出差申请不存在' });
    }
    
    const trip = trips[0];
    
    // 安全解析JSON字段
    const safeJSONParse = (str, defaultValue) => {
      try {
        if (!str || str === 'null' || str === 'undefined') return defaultValue;
        return JSON.parse(str);
      } catch (e) {
        console.log('JSON解析失败:', str, e.message);
        return defaultValue;
      }
    };
    
    trip.itinerary = safeJSONParse(trip.itinerary, []);
    trip.cost_breakdown = safeJSONParse(trip.cost_breakdown, {});
    trip.accompany_persons = safeJSONParse(trip.accompany_persons, []);
    trip.current_approvers = safeJSONParse(trip.current_approvers, []);
    trip.approval_history = safeJSONParse(trip.approval_history, []);
    
    res.json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 审批出差申请
app.post('/api/business-trips/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment, approverId } = req.body;
    
    const [trips] = await pool.execute(
      'SELECT * FROM business_trip_applications WHERE id = ?',
      [id]
    );
    
    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: '出差申请不存在' });
    }
    
    const trip = trips[0];
    
    const [approvers] = await pool.execute(
      'SELECT * FROM employees WHERE id = ?',
      [approverId]
    );
    
    if (approvers.length === 0) {
      return res.status(400).json({ success: false, message: '审批人不存在' });
    }
    
    const approver = approvers[0];
    
    const historyRecord = {
      step: trip.current_step,
      nodeName: '审批节点',
      approverId,
      approverName: approver.name,
      approverRole: approver.position,
      action,
      comment,
      createdAt: new Date()
    };
    
    const currentHistory = JSON.parse(trip.approval_history || '[]');
    currentHistory.push(historyRecord);
    
    let newStatus = trip.status;
    let newStep = trip.current_step + 1;
    
    if (action === 'reject') {
      newStatus = 'rejected';
    } else if (action === 'agree') {
      newStatus = 'approved';
    }
    
    await pool.execute(
      `UPDATE business_trip_applications 
       SET status = ?, current_step = ?, approval_history = ?, comment = ?, updated_at = NOW() 
       WHERE id = ?`,
      [newStatus, newStep, JSON.stringify(currentHistory), comment, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除出差申请
app.delete('/api/business-trips/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [trips] = await pool.execute(
      'SELECT * FROM business_trip_applications WHERE id = ?',
      [id]
    );
    
    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: '出差申请不存在' });
    }
    
    await pool.execute(
      'DELETE FROM business_trip_applications WHERE id = ?',
      [id]
    );
    
    res.json({ success: true, message: '出差申请删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 初始化流程表
(async () => {
  await createProjectTable();
  await createBusinessTripTable();
  await createWorkflowTables();
})();

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