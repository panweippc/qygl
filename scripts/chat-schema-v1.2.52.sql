-- 聊天功能数据模型（私聊 + 群聊 IM）
-- 清理旧的占位"公共聊天室"表（仅被废弃的 chats.js 使用，无前端、无跨模块引用）
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_members;
DROP TABLE IF EXISTS chat_conversations;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chats;

-- 会话表
CREATE TABLE chat_conversations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('single', 'group') NOT NULL DEFAULT 'single',
  title VARCHAR(100) DEFAULT NULL COMMENT '群聊名称；单聊为 NULL（前端显示对方姓名）',
  avatar VARCHAR(512) DEFAULT NULL,
  created_by INT DEFAULT NULL COMMENT 'employees.id',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_message_id BIGINT NOT NULL DEFAULT 0,
  INDEX idx_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='聊天会话';

-- 会话成员表（含未读指针）
CREATE TABLE chat_members (
  conversation_id INT NOT NULL,
  user_id INT NOT NULL COMMENT 'employees.id',
  username VARCHAR(100) DEFAULT NULL,
  role ENUM('owner', 'member') NOT NULL DEFAULT 'member',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_read_message_id BIGINT NOT NULL DEFAULT 0,
  deleted_at DATETIME DEFAULT NULL COMMENT '退出/删除会话（软删），非 NULL 表示不在会话中',
  PRIMARY KEY (conversation_id, user_id),
  INDEX idx_user (user_id),
  INDEX idx_last_read (last_read_message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='聊天会话成员';

-- 消息表
CREATE TABLE chat_messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  sender_id INT DEFAULT NULL COMMENT 'employees.id',
  sender_name VARCHAR(100) DEFAULT NULL,
  msg_type ENUM('text', 'image', 'file', 'system') NOT NULL DEFAULT 'text',
  content TEXT DEFAULT NULL COMMENT '文本内容 / 图片说明',
  attachment_url VARCHAR(512) DEFAULT NULL,
  attachment_name VARCHAR(255) DEFAULT NULL,
  attachment_size INT DEFAULT NULL,
  deleted_at DATETIME DEFAULT NULL COMMENT '撤回（软删），非 NULL 表示已撤回',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_conversation (conversation_id, id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='聊天消息';
