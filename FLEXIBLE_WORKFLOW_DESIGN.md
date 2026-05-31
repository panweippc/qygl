# 灵活可配置审批流程设计说明

## 一、设计目标

实现一个完全灵活可配置的审批流程系统，支持：
- **动态节点配置**：通过可视化界面拖拽配置审批节点
- **灵活条件规则**：支持复杂的多条件组合判断
- **参数化配置**：所有阈值、角色、规则均可动态调整
- **实时生效**：配置修改后即时生效，无需重启服务
- **版本管理**：支持流程版本控制和灰度发布

---

## 二、系统架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            灵活审批流程系统架构                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         可视化流程设计器                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │ 节点拖拽  │  │ 条件配置  │  │ 规则设置  │  │ 预览测试  │           │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         流程配置中心                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │ 流程定义  │  │ 节点模板  │  │ 条件库   │  │ 参数配置  │           │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         流程执行引擎                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │ 路径计算  │  │ 节点执行  │  │ 条件评估  │  │ 状态管理  │           │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         数据存储层                                    │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │ 流程定义  │  │ 节点配置  │  │ 实例数据  │  │ 历史记录  │           │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 三、核心数据模型

### 3.1 流程定义表（flexible_flows）

```sql
CREATE TABLE flexible_flows (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(100) UNIQUE NOT NULL COMMENT '流程编码',
  name VARCHAR(255) NOT NULL COMMENT '流程名称',
  description TEXT COMMENT '流程描述',
  category VARCHAR(100) COMMENT '流程分类',
  
  -- 版本控制
  version INT DEFAULT 1 COMMENT '版本号',
  is_published TINYINT DEFAULT 0 COMMENT '是否已发布',
  is_active TINYINT DEFAULT 1 COMMENT '是否启用',
  
  -- 表单配置
  form_schema JSON COMMENT '表单字段配置',
  form_layout JSON COMMENT '表单布局配置',
  
  -- 流程配置
  node_config JSON COMMENT '节点配置',
  condition_config JSON COMMENT '条件配置',
  variable_config JSON COMMENT '变量配置',
  
  -- 高级设置
  settings JSON COMMENT '流程设置',
  
  created_by VARCHAR(255) COMMENT '创建人',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255) COMMENT '更新人',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_at DATETIME COMMENT '发布时间'
) COMMENT='灵活流程定义表';
```

### 3.2 节点定义表（flexible_flow_nodes）

```sql
CREATE TABLE flexible_flow_nodes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  flow_id INT NOT NULL COMMENT '流程ID',
  node_id VARCHAR(100) NOT NULL COMMENT '节点ID',
  node_name VARCHAR(255) COMMENT '节点名称',
  node_type VARCHAR(50) COMMENT '节点类型',
  
  -- 位置信息（用于可视化设计器）
  position_x INT COMMENT 'X坐标',
  position_y INT COMMENT 'Y坐标',
  
  -- 节点配置
  config JSON COMMENT '节点配置',
  
  -- 审批人配置
  approver_config JSON COMMENT '审批人配置',
  
  -- 条件配置
  condition_config JSON COMMENT '进入条件配置',
  
  -- 动作配置
  action_config JSON COMMENT '节点动作配置',
  
  -- 样式配置
  style_config JSON COMMENT '样式配置',
  
  sort_order INT DEFAULT 0 COMMENT '排序',
  is_start TINYINT DEFAULT 0 COMMENT '是否开始节点',
  is_end TINYINT DEFAULT 0 COMMENT '是否结束节点',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (flow_id) REFERENCES flexible_flows(id)
) COMMENT='流程节点定义表';
```

### 3.3 连线定义表（flexible_flow_connections）

```sql
CREATE TABLE flexible_flow_connections (
  id INT PRIMARY KEY AUTO_INCREMENT,
  flow_id INT NOT NULL COMMENT '流程ID',
  connection_id VARCHAR(100) COMMENT '连线ID',
  
  -- 连接信息
  source_node_id VARCHAR(100) COMMENT '源节点ID',
  target_node_id VARCHAR(100) COMMENT '目标节点ID',
  
  -- 条件配置
  condition_config JSON COMMENT '连线条件配置',
  
  -- 样式配置
  style_config JSON COMMENT '样式配置',
  
  label VARCHAR(255) COMMENT '连线标签',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (flow_id) REFERENCES flexible_flows(id)
) COMMENT='流程连线定义表';
```

### 3.4 流程参数表（flexible_flow_params）

```sql
CREATE TABLE flexible_flow_params (
  id INT PRIMARY KEY AUTO_INCREMENT,
  flow_id INT NOT NULL COMMENT '流程ID',
  param_key VARCHAR(100) NOT NULL COMMENT '参数键',
  param_name VARCHAR(255) COMMENT '参数名称',
  param_type VARCHAR(50) COMMENT '参数类型：string/number/boolean/array/object',
  default_value TEXT COMMENT '默认值',
  current_value TEXT COMMENT '当前值',
  description TEXT COMMENT '参数说明',
  is_editable TINYINT DEFAULT 1 COMMENT '是否可编辑',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (flow_id) REFERENCES flexible_flows(id)
) COMMENT='流程参数表';
```

### 3.5 流程实例表（flexible_flow_instances）

```sql
CREATE TABLE flexible_flow_instances (
  id INT PRIMARY KEY AUTO_INCREMENT,
  flow_id INT NOT NULL COMMENT '流程定义ID',
  flow_version INT COMMENT '流程版本',
  
  -- 业务信息
  business_type VARCHAR(50) COMMENT '业务类型',
  business_id INT COMMENT '业务ID',
  
  -- 申请人信息
  applicant_id VARCHAR(255) COMMENT '申请人ID',
  applicant_name VARCHAR(255) COMMENT '申请人名称',
  applicant_dept VARCHAR(255) COMMENT '申请人部门',
  
  -- 流程状态
  status VARCHAR(50) DEFAULT 'running' COMMENT '流程状态',
  current_node_ids JSON COMMENT '当前节点ID列表',
  
  -- 数据
  form_data JSON COMMENT '表单数据',
  variable_values JSON COMMENT '变量值',
  
  -- 时间
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME COMMENT '完成时间',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (flow_id) REFERENCES flexible_flows(id)
) COMMENT='流程实例表';
```

### 3.6 节点实例表（flexible_node_instances）

```sql
CREATE TABLE flexible_node_instances (
  id INT PRIMARY KEY AUTO_INCREMENT,
  instance_id INT NOT NULL COMMENT '流程实例ID',
  node_id VARCHAR(100) COMMENT '节点定义ID',
  node_name VARCHAR(255) COMMENT '节点名称',
  node_type VARCHAR(50) COMMENT '节点类型',
  
  -- 状态
  status VARCHAR(50) DEFAULT 'waiting' COMMENT '节点状态',
  result VARCHAR(50) COMMENT '处理结果',
  
  -- 审批人
  approvers JSON COMMENT '审批人列表',
  approver_results JSON COMMENT '审批人结果',
  
  -- 时间
  started_at DATETIME COMMENT '开始时间',
  completed_at DATETIME COMMENT '完成时间',
  
  -- 数据
  form_data_snapshot JSON COMMENT '表单数据快照',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instance_id) REFERENCES flexible_flow_instances(id)
) COMMENT='节点实例表';
```

---

## 四、灵活配置模型

### 4.1 节点类型定义

```typescript
// 节点类型注册表
const NodeTypeRegistry = {
  // 开始节点
  start: {
    name: '开始',
    icon: 'PlayCircle',
    color: '#52c41a',
    configSchema: {
      fields: []
    }
  },
  
  // 审批节点（串行）
  approval: {
    name: '审批节点',
    icon: 'UserCheck',
    color: '#1890ff',
    configSchema: {
      fields: [
        { key: 'approverType', label: '审批人类型', type: 'select', 
          options: ['指定人员', '指定角色', '直属上级', '部门负责人', '发起人自己', '动态计算'] },
        { key: 'approvers', label: '审批人', type: 'approverSelector', 
          visibleWhen: { approverType: ['指定人员', '指定角色'] } },
        { key: 'allowTransfer', label: '允许转交', type: 'switch', default: true },
        { key: 'allowAddApprover', label: '允许加签', type: 'switch', default: false },
        { key: 'allowRollback', label: '允许回退', type: 'switch', default: false },
        { key: 'timeout', label: '超时时间(小时)', type: 'number', default: 24 },
        { key: 'timeoutAction', label: '超时动作', type: 'select', 
          options: ['自动通过', '自动拒绝', '提醒', '转交上级'], default: '提醒' },
        { key: 'remindInterval', label: '提醒间隔(小时)', type: 'number', default: 4 }
      ]
    }
  },
  
  // 并行审批节点
  parallel: {
    name: '并行审批',
    icon: 'Users',
    color: '#722ed1',
    configSchema: {
      fields: [
        { key: 'parallelType', label: '并行类型', type: 'select', 
          options: [{ label: '会签(全部通过)', value: 'and' }, { label: '或签(任一通过)', value: 'or' }] },
        { key: 'approvers', label: '审批人列表', type: 'approverList', required: true },
        { key: 'timeout', label: '超时时间(小时)', type: 'number', default: 24 },
        { key: 'timeoutAction', label: '超时动作', type: 'select', 
          options: ['自动通过', '自动拒绝', '提醒'] }
      ]
    }
  },
  
  // 条件分支节点
  condition: {
    name: '条件分支',
    icon: 'Fork',
    color: '#fa8c16',
    configSchema: {
      fields: [
        { key: 'conditions', label: '分支条件', type: 'conditionBuilder', required: true }
      ]
    }
  },
  
  // 抄送节点
  cc: {
    name: '抄送',
    icon: 'Send',
    color: '#13c2c2',
    configSchema: {
      fields: [
        { key: 'ccType', label: '抄送类型', type: 'select', 
          options: ['固定人员', '动态计算', '表单字段'] },
        { key: 'ccList', label: '抄送人员', type: 'approverSelector' },
        { key: 'ccField', label: '抄送字段', type: 'fieldSelector', 
          visibleWhen: { ccType: '表单字段' } }
      ]
    }
  },
  
  // 子流程节点
  subflow: {
    name: '子流程',
    icon: 'Apartment',
    color: '#eb2f96',
    configSchema: {
      fields: [
        { key: 'subFlowCode', label: '子流程', type: 'flowSelector', required: true },
        { key: 'dataMapping', label: '数据映射', type: 'dataMapping' },
        { key: 'waitForComplete', label: '等待完成', type: 'switch', default: true }
      ]
    }
  },
  
  // 自动处理节点
  auto: {
    name: '自动处理',
    icon: 'Robot',
    color: '#f5222d',
    configSchema: {
      fields: [
        { key: 'actionType', label: '动作类型', type: 'select', 
          options: ['自动通过', '自动拒绝', '调用接口', '执行脚本', '发送通知'] },
        { key: 'actionConfig', label: '动作配置', type: 'actionConfig', 
          visibleWhen: { actionType: ['调用接口', '执行脚本', '发送通知'] } }
      ]
    }
  },
  
  // 结束节点
  end: {
    name: '结束',
    icon: 'CheckCircle',
    color: '#52c41a',
    configSchema: {
      fields: [
        { key: 'endType', label: '结束类型', type: 'select', 
          options: ['通过结束', '拒绝结束', '撤销结束'] },
        { key: 'notifyApplicant', label: '通知申请人', type: 'switch', default: true }
      ]
    }
  }
};
```

### 4.2 条件构建器配置

```typescript
// 条件构建器
interface ConditionBuilderConfig {
  // 条件组
  groups: ConditionGroup[];
  
  // 逻辑关系
  logic: 'and' | 'or';
}

interface ConditionGroup {
  id: string;
  name: string;
  conditions: Condition[];
  logic: 'and' | 'or';
  targetNodeId: string;  // 满足条件后流向的节点
}

interface Condition {
  id: string;
  field: string;           // 字段
  operator: string;        // 操作符
  value: any;              // 值
  valueType: string;       // 值类型
}

// 操作符定义
const Operators = {
  string: [
    { value: 'eq', label: '等于' },
    { value: 'ne', label: '不等于' },
    { value: 'contains', label: '包含' },
    { value: 'notContains', label: '不包含' },
    { value: 'startsWith', label: '开头是' },
    { value: 'endsWith', label: '结尾是' },
    { value: 'isEmpty', label: '为空' },
    { value: 'isNotEmpty', label: '不为空' }
  ],
  number: [
    { value: 'eq', label: '等于' },
    { value: 'ne', label: '不等于' },
    { value: 'gt', label: '大于' },
    { value: 'gte', label: '大于等于' },
    { value: 'lt', label: '小于' },
    { value: 'lte', label: '小于等于' },
    { value: 'between', label: '介于' }
  ],
  date: [
    { value: 'eq', label: '等于' },
    { value: 'ne', label: '不等于' },
    { value: 'before', label: '早于' },
    { value: 'after', label: '晚于' },
    { value: 'between', label: '介于' }
  ],
  array: [
    { value: 'in', label: '包含于' },
    { value: 'notIn', label: '不包含于' },
    { value: 'contains', label: '包含' },
    { value: 'isEmpty', label: '为空' }
  ]
};
```

### 4.3 审批人选择器配置

```typescript
// 审批人配置
interface ApproverConfig {
  type: 'user' | 'role' | 'supervisor' | 'department' | 'self' | 'dynamic' | 'formField';
  value?: string | string[];
  dynamicRule?: DynamicRule;
  formField?: string;
}

// 动态规则
interface DynamicRule {
  type: 'orgTree' | 'script' | 'api';
  config: {
    // 组织树规则
    level?: number;           // 向上几级
    role?: string;            // 指定角色
    
    // 脚本规则
    script?: string;          // JavaScript脚本
    
    // API规则
    apiUrl?: string;          // API地址
    method?: string;          // 请求方法
    params?: object;          // 请求参数
    dataPath?: string;        // 数据路径
  };
}

// 审批人选择器组件配置
const ApproverSelectorConfig = {
  // 指定人员
  user: {
    component: 'UserSelector',
    multiple: true,
    props: {
      searchable: true,
      deptFilter: true
    }
  },
  
  // 指定角色
  role: {
    component: 'RoleSelector',
    multiple: true,
    props: {
      roleTypes: ['dept_manager', 'finance', 'hr', 'admin', 'gm']
    }
  },
  
  // 直属上级
  supervisor: {
    component: 'SupervisorConfig',
    props: {
      levels: [1, 2, 3, 4, 5],  // 向上几级
      skipIfEmpty: true         // 找不到时是否跳过
    }
  },
  
  // 部门负责人
  department: {
    component: 'DepartmentConfig',
    props: {
      useApplicantDept: true,   // 使用申请人部门
      specifyDept: false        // 指定部门
    }
  },
  
  // 动态计算
  dynamic: {
    component: 'DynamicRuleBuilder',
    props: {
      ruleTypes: ['orgTree', 'script', 'api']
    }
  },
  
  // 表单字段
  formField: {
    component: 'FieldSelector',
    props: {
      fieldTypes: ['user', 'users']
    }
  }
};
```

---

## 五、可视化流程设计器

### 5.1 设计器界面

```vue
<!-- FlowDesigner.vue -->
<template>
  <div class="flow-designer">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button-group>
        <el-button @click="saveFlow">保存</el-button>
        <el-button @click="publishFlow">发布</el-button>
        <el-button @click="previewFlow">预览</el-button>
        <el-button @click="testFlow">测试</el-button>
      </el-button-group>
      
      <el-divider direction="vertical" />
      
      <el-button-group>
        <el-button @click="undo" :disabled="!canUndo">撤销</el-button>
        <el-button @click="redo" :disabled="!canRedo">重做</el-button>
      </el-button-group>
      
      <el-divider direction="vertical" />
      
      <el-button @click="showParamsConfig">参数配置</el-button>
      <el-button @click="showFormConfig">表单配置</el-button>
    </div>
    
    <div class="designer-body">
      <!-- 左侧：节点工具箱 -->
      <div class="node-palette">
        <div class="palette-title">节点工具箱</div>
        <draggable 
          :list="nodeTypes" 
          :clone="cloneNode"
          :group="{ name: 'nodes', pull: 'clone', put: false }"
        >
          <div 
            v-for="node in nodeTypes" 
            :key="node.type"
            class="node-item"
            :style="{ borderColor: node.color }"
          >
            <el-icon :style="{ color: node.color }">
              <component :is="node.icon" />
            </el-icon>
            <span>{{ node.name }}</span>
          </div>
        </draggable>
      </div>
      
      <!-- 中间：画布 -->
      <div class="canvas-container" ref="canvasRef">
        <vue-flow
          v-model="elements"
          :default-zoom="1"
          :min-zoom="0.2"
          :max-zoom="4"
          @connect="onConnect"
          @node-click="onNodeClick"
          @edge-click="onEdgeClick"
        >
          <template #node-custom="props">
            <flow-node 
              :data="props.data"
              :selected="props.selected"
              @delete="deleteNode(props.id)"
              @copy="copyNode(props.id)"
            />
          </template>
          
          <background pattern-color="#aaa" :gap="20" />
          <mini-map />
          <controls />
        </vue-flow>
      </div>
      
      <!-- 右侧：属性面板 -->
      <div class="property-panel">
        <template v-if="selectedNode">
          <node-config-panel 
            :node="selectedNode"
            :form-fields="formFields"
            @update="updateNodeConfig"
          />
        </template>
        <template v-else-if="selectedEdge">
          <edge-config-panel
            :edge="selectedEdge"
            :form-fields="formFields"
            @update="updateEdgeConfig"
          />
        </template>
        <template v-else>
          <flow-config-panel
            :flow="currentFlow"
            @update="updateFlowConfig"
          />
        </template>
      </div>
    </div>
    
    <!-- 参数配置对话框 -->
    <params-config-dialog
      v-model="paramsDialogVisible"
      :params="flowParams"
      @save="saveParams"
    />
    
    <!-- 表单配置对话框 -->
    <form-config-dialog
      v-model="formDialogVisible"
      :schema="formSchema"
      @save="saveFormSchema"
    />
  </div>
</template>
```

### 5.2 节点配置面板

```vue
<!-- NodeConfigPanel.vue -->
<template>
  <div class="node-config-panel">
    <div class="panel-header">
      <h3>{{ nodeTypeName }}配置</h3>
    </div>
    
    <el-form :model="config" label-position="top">
      <!-- 基础信息 -->
      <el-form-item label="节点名称">
        <el-input v-model="config.name" placeholder="请输入节点名称" />
      </el-form-item>
      
      <!-- 动态渲染配置字段 -->
      <template v-for="field in configFields" :key="field.key">
        <el-form-item 
          :label="field.label"
          v-if="isFieldVisible(field)"
        >
          <!-- 文本输入 -->
          <el-input 
            v-if="field.type === 'text'"
            v-model="config[field.key]"
            :placeholder="field.placeholder"
          />
          
          <!-- 数字输入 -->
          <el-input-number 
            v-else-if="field.type === 'number'"
            v-model="config[field.key]"
            :min="field.min"
            :max="field.max"
            :default-value="field.default"
          />
          
          <!-- 下拉选择 -->
          <el-select 
            v-else-if="field.type === 'select'"
            v-model="config[field.key]"
            :multiple="field.multiple"
          >
            <el-option 
              v-for="opt in field.options" 
              :key="opt.value || opt"
              :label="opt.label || opt"
              :value="opt.value || opt"
            />
          </el-select>
          
          <!-- 开关 -->
          <el-switch 
            v-else-if="field.type === 'switch'"
            v-model="config[field.key]"
            :default-value="field.default"
          />
          
          <!-- 审批人选择器 -->
          <approver-selector
            v-else-if="field.type === 'approverSelector'"
            v-model="config[field.key]"
            :type="config.approverType"
            :form-fields="formFields"
          />
          
          <!-- 审批人列表 -->
          <approver-list
            v-else-if="field.type === 'approverList'"
            v-model="config[field.key]"
            :form-fields="formFields"
          />
          
          <!-- 条件构建器 -->
          <condition-builder
            v-else-if="field.type === 'conditionBuilder'"
            v-model="config[field.key]"
            :form-fields="formFields"
          />
          
          <!-- 字段选择器 -->
          <field-selector
            v-else-if="field.type === 'fieldSelector'"
            v-model="config[field.key]"
            :fields="formFields"
            :field-types="field.fieldTypes"
          />
          
          <!-- 数据映射 -->
          <data-mapping
            v-else-if="field.type === 'dataMapping'"
            v-model="config[field.key]"
            :source-fields="formFields"
          />
          
          <!-- 动作配置 -->
          <action-config
            v-else-if="field.type === 'actionConfig'"
            v-model="config[field.key]"
            :action-type="config.actionType"
          />
        </el-form-item>
      </template>
    </el-form>
  </div>
</template>
```

### 5.3 条件构建器组件

```vue
<!-- ConditionBuilder.vue -->
<template>
  <div class="condition-builder">
    <div class="condition-groups">
      <div 
        v-for="(group, groupIndex) in conditionGroups" 
        :key="group.id"
        class="condition-group"
      >
        <div class="group-header">
          <span class="group-label">条件组 {{ groupIndex + 1 }}</span>
          <el-input 
            v-model="group.name" 
            size="small" 
            placeholder="条件组名称"
          />
          <el-select v-model="group.targetNodeId" size="small" placeholder="流向节点">
            <el-option 
              v-for="node in availableNodes" 
              :key="node.id"
              :label="node.name"
              :value="node.id"
            />
          </el-select>
          <el-button 
            type="danger" 
            size="small" 
            @click="removeGroup(groupIndex)"
          >
            删除
          </el-button>
        </div>
        
        <div class="conditions">
          <div 
            v-for="(condition, condIndex) in group.conditions" 
            :key="condition.id"
            class="condition-row"
          >
            <!-- 字段选择 -->
            <el-select v-model="condition.field" size="small" placeholder="选择字段">
              <el-option-group 
                v-for="group in fieldGroups" 
                :key="group.label"
                :label="group.label"
              >
                <el-option 
                  v-for="field in group.fields" 
                  :key="field.key"
                  :label="field.label"
                  :value="field.key"
                />
              </el-option-group>
            </el-select>
            
            <!-- 操作符选择 -->
            <el-select 
              v-model="condition.operator" 
              size="small" 
              placeholder="操作符"
              style="width: 120px"
            >
              <el-option 
                v-for="op in getOperators(condition.field)" 
                :key="op.value"
                :label="op.label"
                :value="op.value"
              />
            </el-select>
            
            <!-- 值输入 -->
            <template v-if="!['isEmpty', 'isNotEmpty'].includes(condition.operator)">
              <field-value-input
                v-model="condition.value"
                :field="getField(condition.field)"
                :operator="condition.operator"
                size="small"
              />
            </template>
            
            <el-button 
              type="danger" 
              size="small" 
              @click="removeCondition(groupIndex, condIndex)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          
          <el-button 
            type="primary" 
            size="small" 
            @click="addCondition(groupIndex)"
          >
            + 添加条件
          </el-button>
        </div>
        
        <div class="group-logic" v-if="group.conditions.length > 1">
          <span>组内条件关系：</span>
          <el-radio-group v-model="group.logic" size="small">
            <el-radio-button label="and">且</el-radio-button>
            <el-radio-button label="or">或</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </div>
    
    <div class="global-logic" v-if="conditionGroups.length > 1">
      <span>条件组之间的关系：</span>
      <el-radio-group v-model="globalLogic" size="small">
        <el-radio-button label="and">全部满足</el-radio-button>
        <el-radio-button label="or">满足任一</el-radio-button>
      </el-radio-group>
    </div>
    
    <el-button type="primary" @click="addGroup">+ 添加条件组</el-button>
  </div>
</template>
```

---

## 六、动态参数配置

### 6.1 参数配置界面

```vue
<!-- ParamsConfigDialog.vue -->
<template>
  <el-dialog 
    v-model="visible" 
    title="流程参数配置" 
    width="800px"
    :close-on-click-modal="false"
  >
    <div class="params-config">
      <div class="params-toolbar">
        <el-button type="primary" @click="addParam">+ 添加参数</el-button>
        <el-button @click="importParams">导入</el-button>
        <el-button @click="exportParams">导出</el-button>
      </div>
      
      <el-table :data="params" style="width: 100%">
        <el-table-column type="index" width="50" />
        
        <el-table-column label="参数键" width="150">
          <template #default="{ row, $index }">
            <el-input 
              v-model="row.paramKey" 
              size="small"
              placeholder="唯一标识"
              :disabled="!row.isNew"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="参数名称" width="150">
          <template #default="{ row }">
            <el-input v-model="row.paramName" size="small" placeholder="显示名称" />
          </template>
        </el-table-column>
        
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-select v-model="row.paramType" size="small">
              <el-option label="字符串" value="string" />
              <el-option label="数字" value="number" />
              <el-option label="布尔" value="boolean" />
              <el-option label="数组" value="array" />
              <el-option label="对象" value="object" />
            </el-select>
          </template>
        </el-table-column>
        
        <el-table-column label="默认值">
          <template #default="{ row }">
            <param-value-input 
              v-model="row.defaultValue"
              :type="row.paramType"
              size="small"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="当前值">
          <template #default="{ row }">
            <param-value-input 
              v-model="row.currentValue"
              :type="row.paramType"
              size="small"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="说明">
          <template #default="{ row }">
            <el-input v-model="row.description" size="small" placeholder="参数说明" />
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="100">
          <template #default="{ $index }">
            <el-button 
              type="danger" 
              size="small" 
              @click="removeParam($index)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="params-tips">
        <h4>使用说明：</h4>
        <ul>
          <li>参数可在条件判断、审批人计算、通知模板中使用</li>
          <li>使用 <code>{{paramKey}}</code> 语法引用参数值</li>
          <li>修改当前值后即时生效，无需重新发布流程</li>
        </ul>
      </div>
    </div>
    
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>
```

### 6.2 参数使用示例

```json
{
  "params": [
    {
      "paramKey": "leaveMaxDays",
      "paramName": "请假最大天数",
      "paramType": "number",
      "defaultValue": 3,
      "currentValue": 5,
      "description": "直属上级可审批的最大请假天数"
    },
    {
      "paramKey": "reimburseThreshold",
      "paramName": "报销审批阈值",
      "paramType": "number",
      "defaultValue": 5000,
      "currentValue": 3000,
      "description": "超过此金额需要多级审批"
    },
    {
      "paramKey": "meetingAutoPassTypes",
      "paramName": "自动通过的会议类型",
      "paramType": "array",
      "defaultValue": ["内部会议"],
      "currentValue": ["内部会议", "部门例会"],
      "description": "这些类型的会议自动通过审批"
    },
    {
      "paramKey": "notifyChannels",
      "paramName": "通知渠道",
      "paramType": "array",
      "defaultValue": ["web"],
      "currentValue": ["web", "email", "sms"],
      "description": "审批通知的发送渠道"
    }
  ]
}
```

---

## 七、流程执行引擎

### 7.1 动态流程执行器

```typescript
// FlexibleFlowEngine.ts
class FlexibleFlowEngine {
  private flowCache: Map<string, FlowDefinition> = new Map();
  private paramCache: Map<string, Map<string, any>> = new Map();
  
  // 加载流程定义（带缓存）
  async loadFlow(flowCode: string): Promise<FlowDefinition> {
    // 检查缓存
    if (this.flowCache.has(flowCode)) {
      return this.flowCache.get(flowCode)!;
    }
    
    // 从数据库加载
    const flow = await db.query(
      'SELECT * FROM flexible_flows WHERE code = ? AND is_active = 1 ORDER BY version DESC LIMIT 1',
      [flowCode]
    );
    
    if (!flow) {
      throw new Error(`流程 ${flowCode} 不存在或未启用`);
    }
    
    // 解析配置
    const flowDef: FlowDefinition = {
      id: flow.id,
      code: flow.code,
      name: flow.name,
      version: flow.version,
      nodes: JSON.parse(flow.node_config),
      connections: await this.loadConnections(flow.id),
      params: await this.loadParams(flow.id),
      formSchema: JSON.parse(flow.form_schema)
    };
    
    // 缓存
    this.flowCache.set(flowCode, flowDef);
    this.paramCache.set(flowCode, new Map(Object.entries(flowDef.params)));
    
    return flowDef;
  }
  
  // 启动流程实例
  async startInstance(
    flowCode: string, 
    formData: object, 
    applicant: UserInfo
  ): Promise<FlowInstance> {
    const flow = await this.loadFlow(flowCode);
    
    // 创建实例
    const instance = await db.query(
      `INSERT INTO flexible_flow_instances 
       (flow_id, flow_version, business_type, applicant_id, applicant_name, 
        applicant_dept, status, form_data, variable_values, current_node_ids)
       VALUES (?, ?, ?, ?, ?, ?, 'running', ?, ?, ?)`,
      [flow.id, flow.version, flowCode, applicant.id, applicant.name, 
       applicant.dept, JSON.stringify(formData), JSON.stringify({}), 
       JSON.stringify([this.getStartNode(flow).id])]
    );
    
    // 执行开始节点
    await this.executeNode(instance.insertId, flow, this.getStartNode(flow), formData);
    
    return this.getInstance(instance.insertId);
  }
  
  // 执行节点
  async executeNode(
    instanceId: number,
    flow: FlowDefinition,
    node: FlowNode,
    formData: object
  ): Promise<void> {
    // 创建节点实例
    const nodeInstance = await this.createNodeInstance(instanceId, node, formData);
    
    // 根据节点类型执行
    switch (node.type) {
      case 'start':
        await this.executeStartNode(nodeInstance, flow, formData);
        break;
      case 'approval':
        await this.executeApprovalNode(nodeInstance, flow, formData);
        break;
      case 'parallel':
        await this.executeParallelNode(nodeInstance, flow, formData);
        break;
      case 'condition':
        await this.executeConditionNode(nodeInstance, flow, formData);
        break;
      case 'auto':
        await this.executeAutoNode(nodeInstance, flow, formData);
        break;
      case 'end':
        await this.executeEndNode(nodeInstance, flow, formData);
        break;
    }
  }
  
  // 执行条件节点
  async executeConditionNode(
    nodeInstance: NodeInstance,
    flow: FlowDefinition,
    formData: object
  ): Promise<void> {
    const node = flow.nodes.find(n => n.id === nodeInstance.nodeId);
    const conditions = node.config.conditions;
    
    // 评估所有条件组
    for (const group of conditions.groups) {
      const matched = this.evaluateConditionGroup(group, formData, flow.params);
      
      if (matched) {
        // 找到匹配的流向
        const targetNode = flow.nodes.find(n => n.id === group.targetNodeId);
        await this.transitionToNode(nodeInstance.instanceId, flow, targetNode, formData);
        return;
      }
    }
    
    // 默认流向（最后一个）
    const defaultTarget = conditions.groups[conditions.groups.length - 1]?.targetNodeId;
    if (defaultTarget) {
      const targetNode = flow.nodes.find(n => n.id === defaultTarget);
      await this.transitionToNode(nodeInstance.instanceId, flow, targetNode, formData);
    }
  }
  
  // 评估条件组
  evaluateConditionGroup(
    group: ConditionGroup,
    formData: object,
    params: Map<string, any>
  ): boolean {
    const results = group.conditions.map(cond => 
      this.evaluateSingleCondition(cond, formData, params)
    );
    
    if (group.logic === 'and') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }
  
  // 评估单个条件
  evaluateSingleCondition(
    condition: Condition,
    formData: object,
    params: Map<string, any>
  ): boolean {
    // 获取字段值（支持表单字段和参数）
    let fieldValue = this.getFieldValue(condition.field, formData, params);
    let compareValue = condition.value;
    
    // 如果值是参数引用，解析参数
    if (typeof compareValue === 'string' && compareValue.startsWith('{{') && compareValue.endsWith('}}')) {
      const paramKey = compareValue.slice(2, -2);
      compareValue = params.get(paramKey);
    }
    
    // 执行比较
    switch (condition.operator) {
      case 'eq': return fieldValue == compareValue;
      case 'ne': return fieldValue != compareValue;
      case 'gt': return fieldValue > compareValue;
      case 'gte': return fieldValue >= compareValue;
      case 'lt': return fieldValue < compareValue;
      case 'lte': return fieldValue <= compareValue;
      case 'contains': return String(fieldValue).includes(compareValue);
      case 'in': return compareValue.includes(fieldValue);
      case 'isEmpty': return !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0);
      case 'isNotEmpty': return !!fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0);
      default: return false;
    }
  }
  
  // 获取字段值
  getFieldValue(field: string, formData: object, params: Map<string, any>): any {
    // 参数引用
    if (field.startsWith('params.')) {
      return params.get(field.slice(7));
    }
    
    // 表单字段
    return formData[field];
  }
  
  // 动态计算审批人
  async resolveApprovers(
    approverConfig: ApproverConfig,
    formData: object,
    applicant: UserInfo
  ): Promise<string[]> {
    switch (approverConfig.type) {
      case 'user':
        return Array.isArray(approverConfig.value) ? approverConfig.value : [approverConfig.value];
        
      case 'role':
        return await this.getUsersByRole(approverConfig.value);
        
      case 'supervisor':
        return await this.getSupervisor(applicant.id, approverConfig.level || 1);
        
      case 'department':
        return await getDepartmentManager(applicant.dept);
        
      case 'dynamic':
        return await this.resolveDynamicApprover(approverConfig.dynamicRule, formData, applicant);
        
      case 'formField':
        return formData[approverConfig.formField] || [];
        
      default:
        return [];
    }
  }
  
  // 刷新参数（实时生效）
  async refreshParams(flowCode: string): Promise<void> {
    const params = await this.loadParamsFromDB(flowCode);
    this.paramCache.set(flowCode, new Map(Object.entries(params)));
  }
}
```

### 7.2 参数实时更新接口

```javascript
// server.js 参数管理接口

// 获取流程参数
app.get('/api/flexible-flows/:code/params', async (req, res) => {
  const { code } = req.params;
  const params = await db.query(
    'SELECT * FROM flexible_flow_params WHERE flow_code = ? ORDER BY sort_order',
    [code]
  );
  res.json({ success: true, data: params });
});

// 更新流程参数（实时生效）
app.put('/api/flexible-flows/:code/params', async (req, res) => {
  const { code } = req.params;
  const { params } = req.body;
  
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    for (const param of params) {
      await conn.query(
        `UPDATE flexible_flow_params 
         SET current_value = ?, updated_at = NOW()
         WHERE flow_code = ? AND param_key = ?`,
        [param.currentValue, code, param.paramKey]
      );
    }
    
    await conn.commit();
    
    // 刷新引擎缓存
    flowEngine.refreshParams(code);
    
    res.json({ success: true, message: '参数已更新并生效' });
  } catch (error) {
    await conn.rollback();
    res.json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// 发布流程新版本
app.post('/api/flexible-flows/:code/publish', async (req, res) => {
  const { code } = req.params;
  const { versionNote } = req.body;
  
  const flow = await db.query(
    'SELECT * FROM flexible_flows WHERE code = ? AND is_published = 0',
    [code]
  );
  
  if (!flow) {
    return res.json({ success: false, message: '没有待发布的流程' });
  }
  
  // 增加版本号
  const newVersion = flow.version + 1;
  
  await db.query(
    `UPDATE flexible_flows 
     SET version = ?, is_published = 1, published_at = NOW(), version_note = ?
     WHERE id = ?`,
    [newVersion, versionNote, flow.id]
  );
  
  // 清除缓存
  flowEngine.clearCache(code);
  
  res.json({ success: true, message: `流程已发布，版本号：${newVersion}` });
});
```

---

## 八、使用示例

### 8.1 配置请假审批流程

```javascript
// 通过API创建灵活流程
const leaveFlow = {
  code: 'FLEXIBLE_LEAVE',
  name: '灵活请假审批',
  description: '支持动态配置的请假审批流程',
  
  // 表单配置
  formSchema: {
    fields: [
      { key: 'leaveType', label: '请假类型', type: 'select', required: true,
        options: ['年假', '病假', '婚假', '产假', '事假'] },
      { key: 'startDate', label: '开始日期', type: 'date', required: true },
      { key: 'endDate', label: '结束日期', type: 'date', required: true },
      { key: 'days', label: '请假天数', type: 'number', required: true },
      { key: 'reason', label: '请假原因', type: 'textarea', required: true }
    ]
  },
  
  // 节点配置
  nodes: [
    {
      id: 'start',
      type: 'start',
      position: { x: 100, y: 100 }
    },
    {
      id: 'condition_type',
      type: 'condition',
      name: '请假类型判断',
      position: { x: 300, y: 100 },
      config: {
        conditions: {
          groups: [
            {
              id: 'g1',
              name: '特殊假期',
              conditions: [
                { field: 'leaveType', operator: 'in', value: ['病假', '婚假', '产假'] }
              ],
              logic: 'and',
              targetNodeId: 'hr_approval'
            },
            {
              id: 'g2',
              name: '普通年假',
              conditions: [
                { field: 'leaveType', operator: 'eq', value: '年假' },
                { field: 'days', operator: 'lte', value: '{{leaveMaxDays}}' }
              ],
              logic: 'and',
              targetNodeId: 'supervisor_simple'
            },
            {
              id: 'g3',
              name: '长假年假',
              conditions: [
                { field: 'leaveType', operator: 'eq', value: '年假' },
                { field: 'days', operator: 'gt', value: '{{leaveMaxDays}}' }
              ],
              logic: 'and',
              targetNodeId: 'supervisor_complex'
            }
          ],
          logic: 'or'
        }
      }
    },
    {
      id: 'supervisor_simple',
      type: 'approval',
      name: '直属上级审批',
      position: { x: 500, y: 50 },
      config: {
        approverType: 'supervisor',
        approvers: [{ type: 'supervisor', level: 1 }],
        timeout: 24,
        timeoutAction: 'remind'
      }
    },
    {
      id: 'supervisor_complex',
      type: 'approval',
      name: '直属上级审批',
      position: { x: 500, y: 150 },
      config: {
        approverType: 'supervisor',
        approvers: [{ type: 'supervisor', level: 1 }]
      }
    },
    {
      id: 'manager_approval',
      type: 'approval',
      name: '部门经理审批',
      position: { x: 700, y: 150 },
      config: {
        approverType: 'role',
        approvers: [{ type: 'role', value: 'dept_manager' }]
      }
    },
    {
      id: 'hr_approval',
      type: 'approval',
      name: 'HR审批',
      position: { x: 500, y: 250 },
      config: {
        approverType: 'role',
        approvers: [{ type: 'role', value: 'hr' }]
      }
    },
    {
      id: 'end',
      type: 'end',
      name: '结束',
      position: { x: 900, y: 100 }
    }
  ],
  
  // 连线配置
  connections: [
    { source: 'start', target: 'condition_type' },
    { source: 'supervisor_simple', target: 'end' },
    { source: 'supervisor_complex', target: 'manager_approval' },
    { source: 'manager_approval', target: 'end' },
    { source: 'hr_approval', target: 'end' }
  ],
  
  // 参数配置
  params: [
    {
      paramKey: 'leaveMaxDays',
      paramName: '请假最大天数',
      paramType: 'number',
      defaultValue: 3,
      currentValue: 3,
      description: '直属上级可审批的最大请假天数'
    }
  ]
};

// 创建流程
await fetch('/api/flexible-flows', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(leaveFlow)
});
```

### 8.2 动态调整参数示例

```javascript
// 修改请假最大天数（即时生效）
await fetch('/api/flexible-flows/FLEXIBLE_LEAVE/params', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    params: [
      { paramKey: 'leaveMaxDays', currentValue: 5 }
    ]
  })
});

// 修改后，3天和5天的年假将走不同的审批路径
// 无需重新发布流程，即时生效
```

---

## 九、总结

本设计实现了一个完全灵活可配置的审批流程系统：

### 核心特性

1. **可视化设计器**：拖拽式节点配置，所见即所得
2. **动态条件**：支持复杂的多条件组合判断
3. **参数化配置**：所有阈值、规则均可动态调整
4. **实时生效**：参数修改后即时生效，无需重启
5. **版本管理**：支持流程版本控制和灰度发布

### 灵活配置能力

| 配置项 | 灵活度 | 说明 |
|--------|--------|------|
| **审批节点** | ⭐⭐⭐⭐⭐ | 可自由添加、删除、拖拽布局 |
| **审批人** | ⭐⭐⭐⭐⭐ | 支持6种类型，可动态计算 |
| **条件规则** | ⭐⭐⭐⭐⭐ | 支持多条件组、嵌套逻辑 |
| **流程参数** | ⭐⭐⭐⭐⭐ | 所有数值可配置，实时生效 |
| **通知方式** | ⭐⭐⭐⭐ | 支持多渠道，可配置模板 |
| **表单字段** | ⭐⭐⭐⭐⭐ | 完全自定义表单结构 |

### 实施建议

1. **第一阶段**：搭建基础框架和可视化设计器
2. **第二阶段**：实现核心节点类型和条件引擎
3. **第三阶段**：添加参数配置和实时生效机制
4. **第四阶段**：完善版本管理和灰度发布

**文档版本**: v1.0.0  
**最后更新**: 2026-03-14
