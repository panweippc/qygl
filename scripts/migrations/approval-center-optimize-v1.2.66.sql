-- 审批中心优化迁移
-- 1) 历史数据归一化：meetings 早期提交写入「待审批」，统一为「审批中」（与其余 5 类申请一致）
UPDATE meetings SET status = '审批中' WHERE status = '待审批';

-- 2) 聚合接口（/home/approval-summary）加速索引：审批人+状态、申请人+状态
--    两列 VARCHAR(255) utf8mb4 全索引约 2040 字节，未超 InnoDB 3072 上限，故不使用前缀（ENUM 列不支持前缀）
SET @idx_name = 'idx_leave_approver_status';
SET @table_name = 'leave_applications';
SET @idx_cols = 'approver, status';
SET @create_sql = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = @table_name
      AND INDEX_NAME = @idx_name
  ), 'SELECT 1',
  CONCAT('CREATE INDEX ', @idx_name, ' ON ', @table_name, ' (', @idx_cols, ')')
));
PREPARE _idx_stmt FROM @create_sql;
EXECUTE _idx_stmt;
DEALLOCATE PREPARE _idx_stmt;

SET @idx_name = 'idx_leave_applicant_status';
SET @table_name = 'leave_applications';
SET @idx_cols = 'applicant, status';
SET @create_sql = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = @table_name
      AND INDEX_NAME = @idx_name
  ), 'SELECT 1',
  CONCAT('CREATE INDEX ', @idx_name, ' ON ', @table_name, ' (', @idx_cols, ')')
));
PREPARE _idx_stmt FROM @create_sql;
EXECUTE _idx_stmt;
DEALLOCATE PREPARE _idx_stmt;

SET @idx_name = 'idx_reimburse_approver_status';
SET @table_name = 'reimbursements';
SET @idx_cols = 'approver, status';
SET @create_sql = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = @table_name
      AND INDEX_NAME = @idx_name
  ), 'SELECT 1',
  CONCAT('CREATE INDEX ', @idx_name, ' ON ', @table_name, ' (', @idx_cols, ')')
));
PREPARE _idx_stmt FROM @create_sql;
EXECUTE _idx_stmt;
DEALLOCATE PREPARE _idx_stmt;

SET @idx_name = 'idx_reimburse_applicant_status';
SET @table_name = 'reimbursements';
SET @idx_cols = 'applicant, status';
SET @create_sql = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = @table_name
      AND INDEX_NAME = @idx_name
  ), 'SELECT 1',
  CONCAT('CREATE INDEX ', @idx_name, ' ON ', @table_name, ' (', @idx_cols, ')')
));
PREPARE _idx_stmt FROM @create_sql;
EXECUTE _idx_stmt;
DEALLOCATE PREPARE _idx_stmt;

SET @idx_name = 'idx_meetings_approver_status';
SET @table_name = 'meetings';
SET @idx_cols = 'approver, status';
SET @create_sql = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = @table_name
      AND INDEX_NAME = @idx_name
  ), 'SELECT 1',
  CONCAT('CREATE INDEX ', @idx_name, ' ON ', @table_name, ' (', @idx_cols, ')')
));
PREPARE _idx_stmt FROM @create_sql;
EXECUTE _idx_stmt;
DEALLOCATE PREPARE _idx_stmt;

SET @idx_name = 'idx_meetings_organizer_status';
SET @table_name = 'meetings';
SET @idx_cols = 'organizer, status';
SET @create_sql = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = @table_name
      AND INDEX_NAME = @idx_name
  ), 'SELECT 1',
  CONCAT('CREATE INDEX ', @idx_name, ' ON ', @table_name, ' (', @idx_cols, ')')
));
PREPARE _idx_stmt FROM @create_sql;
EXECUTE _idx_stmt;
DEALLOCATE PREPARE _idx_stmt;

SET @idx_name = 'idx_project_approver_status';
SET @table_name = 'project_applications';
SET @idx_cols = 'approver, status';
SET @create_sql = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = @table_name
      AND INDEX_NAME = @idx_name
  ), 'SELECT 1',
  CONCAT('CREATE INDEX ', @idx_name, ' ON ', @table_name, ' (', @idx_cols, ')')
));
PREPARE _idx_stmt FROM @create_sql;
EXECUTE _idx_stmt;
DEALLOCATE PREPARE _idx_stmt;

SET @idx_name = 'idx_project_applicant_status';
SET @table_name = 'project_applications';
SET @idx_cols = 'applicant_name, status';
SET @create_sql = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = @table_name
      AND INDEX_NAME = @idx_name
  ), 'SELECT 1',
  CONCAT('CREATE INDEX ', @idx_name, ' ON ', @table_name, ' (', @idx_cols, ')')
));
PREPARE _idx_stmt FROM @create_sql;
EXECUTE _idx_stmt;
DEALLOCATE PREPARE _idx_stmt;

SET @idx_name = 'idx_entertain_approver_status';
SET @table_name = 'entertainment_expenses';
SET @idx_cols = 'approver, status';
SET @create_sql = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = @table_name
      AND INDEX_NAME = @idx_name
  ), 'SELECT 1',
  CONCAT('CREATE INDEX ', @idx_name, ' ON ', @table_name, ' (', @idx_cols, ')')
));
PREPARE _idx_stmt FROM @create_sql;
EXECUTE _idx_stmt;
DEALLOCATE PREPARE _idx_stmt;

SET @idx_name = 'idx_entertain_applicant_status';
SET @table_name = 'entertainment_expenses';
SET @idx_cols = 'applicant, status';
SET @create_sql = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = @table_name
      AND INDEX_NAME = @idx_name
  ), 'SELECT 1',
  CONCAT('CREATE INDEX ', @idx_name, ' ON ', @table_name, ' (', @idx_cols, ')')
));
PREPARE _idx_stmt FROM @create_sql;
EXECUTE _idx_stmt;
DEALLOCATE PREPARE _idx_stmt;

SET @idx_name = 'idx_office_approver_status';
SET @table_name = 'office_supplies_applications';
SET @idx_cols = 'approver, status';
SET @create_sql = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = @table_name
      AND INDEX_NAME = @idx_name
  ), 'SELECT 1',
  CONCAT('CREATE INDEX ', @idx_name, ' ON ', @table_name, ' (', @idx_cols, ')')
));
PREPARE _idx_stmt FROM @create_sql;
EXECUTE _idx_stmt;
DEALLOCATE PREPARE _idx_stmt;

SET @idx_name = 'idx_office_applicant_status';
SET @table_name = 'office_supplies_applications';
SET @idx_cols = 'applicant, status';
SET @create_sql = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = @table_name
      AND INDEX_NAME = @idx_name
  ), 'SELECT 1',
  CONCAT('CREATE INDEX ', @idx_name, ' ON ', @table_name, ' (', @idx_cols, ')')
));
PREPARE _idx_stmt FROM @create_sql;
EXECUTE _idx_stmt;
DEALLOCATE PREPARE _idx_stmt;

SET @idx_name = 'idx_btrip_approver_status';
SET @table_name = 'business_trip_applications';
SET @idx_cols = 'approver, status';
SET @create_sql = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = @table_name
      AND INDEX_NAME = @idx_name
  ), 'SELECT 1',
  CONCAT('CREATE INDEX ', @idx_name, ' ON ', @table_name, ' (', @idx_cols, ')')
));
PREPARE _idx_stmt FROM @create_sql;
EXECUTE _idx_stmt;
DEALLOCATE PREPARE _idx_stmt;

SET @idx_name = 'idx_btrip_applicant_status';
SET @table_name = 'business_trip_applications';
SET @idx_cols = 'applicant_name, status';
SET @create_sql = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = @table_name
      AND INDEX_NAME = @idx_name
  ), 'SELECT 1',
  CONCAT('CREATE INDEX ', @idx_name, ' ON ', @table_name, ' (', @idx_cols, ')')
));
PREPARE _idx_stmt FROM @create_sql;
EXECUTE _idx_stmt;
DEALLOCATE PREPARE _idx_stmt;

