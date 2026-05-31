<template>
  <div class="employee-chat-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友软件</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/employee-chat" class="nav-item active">员工交流</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="chat-container">
        <!-- 左侧聊天列表 -->
        <div class="chat-sidebar">
          <div class="sidebar-header">
            <h3 class="sidebar-title">聊天</h3>
          </div>
          <div class="employee-list">
            <!-- 公共聊天 -->
            <div
              class="employee-item"
              :class="{ active: activeChatId === 1 }"
              @click="selectEmployeeChat(1, '公共聊天', true)"
            >
              <div class="employee-avatar">
                <span class="avatar-text">公</span>
                <span class="status-indicator online"></span>
              </div>
              <div class="employee-info">
                <div class="employee-name">公共聊天</div>
                <div class="employee-status">{{ onlineUsers }}人在线</div>
              </div>
              <el-badge v-if="unreadCount[1]" :value="unreadCount[1]" type="danger" class="badge" />
            </div>
          </div>
        </div>

        <!-- 右侧聊天内容 -->
        <div class="chat-content">
          <div v-if="activeChat" class="chat-header">
            <div class="chat-title">
              {{ activeChat.name }}
              <span v-if="activeChat.isPublic" class="online-count">
                ({{ onlineUsers }}人在线)
              </span>
            </div>
            <div class="chat-actions">
              <el-button size="small" class="action-btn">
                <el-icon><More /></el-icon>
              </el-button>
            </div>
          </div>
          <div v-else class="empty-chat">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z"/>
              </svg>
            </div>
            <p class="empty-text">选择一个员工开始聊天</p>
          </div>

          <div v-if="activeChat" class="message-list" ref="messageListRef">
            <div
              v-for="message in activeChat.messages"
              :key="message.id"
              class="message-item"
              :class="{ 'own-message': message.isOwn }"
            >
              <div class="message-avatar">
                <span class="avatar-text">{{ message.isOwn ? '我' : message.senderName?.charAt(0) || activeChat.name.charAt(0) }}</span>
              </div>
              <div class="message-content">
                <div class="message-sender">{{ message.isOwn ? '我' : message.senderName || activeChat.name }}</div>
                <div class="message-text">{{ message.text }}</div>
                <div class="message-footer">
                  <span class="message-time">{{ message.time }}</span>
                  <span v-if="message.isOwn" class="message-status" :class="message.status">
                    {{ message.status === 'sent' ? '已发送' : message.status === 'delivered' ? '已送达' : message.status === 'read' ? '已读' : '' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activeChat" class="message-input" @drop="handleFileDrop" @dragover.prevent>
            <div class="input-tools">
              <el-button size="small" @click="triggerFileInput" class="tool-btn" title="发送文件">
                <el-icon><Paperclip /></el-icon>
              </el-button>
              <input 
                ref="fileInputRef" 
                type="file" 
                multiple 
                class="file-input" 
                @change="handleFileUpload"
              />
            </div>
            <el-input
              v-model="messageText"
              placeholder="输入消息，按 Enter 发送，Shift + Enter 换行..."
              type="textarea"
              :rows="1"
              resize="none"
              class="input-field"
              @keydown="handleKeyDown"
            />
            <el-button 
              type="primary" 
              @click="sendMessage" 
              class="send-btn"
              :disabled="!messageText.trim()"
              title="发送消息"
            >
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <p>© 2026 企业管理系统 | 科技赋能未来</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, More, ArrowRight, UserFilled, Bell, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElDialog, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElBadge, ElMessageBox } from 'element-plus'
import { getChats, addMessage, getEmployees } from '../services/api'
import websocketService from '../services/websocket'

const router = useRouter()

const handleBack = () => {
  // 返回上一�?
  router.back()
}

interface Employee {
  id: number
  name: string
  department: string
  position: string
  email: string
  phone: string
  entryDate: string
  createdAt: string
}

interface Message {
  id: number
  text: string
  time: string
  isOwn: boolean
  chatId: number
  senderId: number | string
  senderName?: string
  status?: 'sent' | 'delivered' | 'read'
}

interface Chat {
  id: number
  name: string
  lastMessage: string
  time: string
  messages: Message[]
  employeeId?: number
  employeeIds?: number[]
  isPublic?: boolean
  isGroup?: boolean
}

const activeChatId = ref<number | null>(null)
const messageText = ref('')
const chats = ref<Chat[]>([])
const employees = ref<Employee[]>([])
const loading = ref(false)
const createChatDialogVisible = ref(false)
const createChatForm = ref({
  chatType: 'single', // 'single' �?'group'
  employeeId: 0,
  employeeIds: [] as number[],
  groupName: ''
})
const fileInputRef = ref<HTMLInputElement | null>(null)
const messageListRef = ref<HTMLElement | null>(null)

// WebSocket相关
const unreadCount = ref<Record<number, number>>({})
const notifications = ref<Array<{chatId: number, message: string, time: string}>>([])
const onlineUsers = ref<number>(0)
const onlineEmployeeIds = ref<Set<string>>(new Set())

// 从API加载员工数据
const loadEmployees = async () => {
  try {
    const response = await getEmployees();
    if (response.success) {
      employees.value = response.data;
    } else {
      ElMessage.error('加载员工数据失败')
    }
  } catch (error) {
    console.error('加载员工数据失败:', error)
    ElMessage.error('加载员工数据失败')
  }
}

// 从本地存储加载聊天数�?
const loadChatsFromLocalStorage = () => {
  try {
    const storedChats = localStorage.getItem('chats');
    if (storedChats) {
      console.log('从本地存储加载聊天数据', storedChats);
      chats.value = JSON.parse(storedChats);
      return true;
    } else {
      console.log('本地存储中没有聊天数据');
    }
  } catch (error) {
    console.error('从本地存储加载聊天数据失败', error);
  }
  return false;
};

// 清理不存在员工的聊天
const cleanupInvalidChats = () => {
  if (employees.value.length === 0) return;
  
  console.log('清理前的聊天列表:', chats.value);
  
  // 保留公共聊天和有效的员工聊天
  const validChats = chats.value.filter(chat => {
    // 保留公共聊天
    if (chat.isPublic) return true;
    
    // 检查单聊是否对应存在的员工
    if (!chat.isGroup && chat.employeeId) {
      const employeeExists = employees.value.some(emp => emp.id === chat.employeeId);
      console.log(`检查员工ID ${chat.employeeId} 是否存在: ${employeeExists}`);
      return employeeExists;
    }
    
    // 检查群聊是否至少有一个存在的员工
    if (chat.isGroup && chat.employeeIds) {
      const hasValidEmployee = chat.employeeIds.some(empId => 
        employees.value.some(emp => emp.id === empId)
      );
      console.log(`检查群�?${chat.name} 是否有有效员�? ${hasValidEmployee}`);
      return hasValidEmployee;
    }
    
    return true;
  });
  
  console.log('清理后的聊天列表:', validChats);
  
  // 如果有变化，更新聊天列表并保存到本地存储
  if (validChats.length !== chats.value.length) {
    chats.value = validChats;
    saveChatsToLocalStorage();
    console.log('已清理无效聊天');
  }
};

// 保存聊天数据到本地存储
const saveChatsToLocalStorage = () => {
  try {
    localStorage.setItem('chats', JSON.stringify(chats.value));
  } catch (error) {
    console.error('保存聊天数据到本地存储失�?', error);
  }
};

// 从API加载聊天数据
const loadChats = async () => {
  loading.value = true
  try {
    // 确保员工数据已加�?
    await loadEmployees();
    
    // 从API获取聊天数据
    const response = await getChats();
    if (response.success) {
      console.log('从API获取聊天数据成功:', response);
      
      // 处理聊天数据
      if (response.chats && response.messages) {
        // 构建聊天列表
        const chatList = response.chats.map((chat: any) => {
          // 找到该聊天的所有消�?
          const chatMessages = response.messages
            .filter((msg: any) => msg.chatId === chat.id)
            .map((msg: any) => ({
              id: msg.id,
              text: msg.text,
              time: msg.time,
              isOwn: msg.senderId === parseInt(localStorage.getItem('userId') || '1'),
              chatId: msg.chatId,
              senderId: msg.senderId,
              senderName: employees.value.find(emp => emp.id === msg.senderId)?.name || '未知用户'
            }));
          
          return {
            id: chat.id,
            name: chat.name,
            lastMessage: chat.lastMessage,
            time: chat.time,
            messages: chatMessages,
            isPublic: chat.id === 1, // 假设ID�?的是公共聊天
            isGroup: true
          };
        });
        
        // 如果没有公共聊天，创建一�?
        if (!chatList.some((chat: any) => chat.id === 1)) {
          chatList.push({
            id: 1,
            name: '公共聊天',
            lastMessage: '欢迎大家加入公共聊天',
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            messages: [
              {
                id: Date.now(),
                text: '欢迎大家加入公共聊天',
                time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
                isOwn: false,
                chatId: 1,
                senderId: 0,
                senderName: '系统'
              }
            ],
            isPublic: true,
            isGroup: true
          });
        }
        
        chats.value = chatList;
      } else {
        // 如果API返回的数据格式不正确，使用默认聊天数�?
        chats.value = [
          {
            id: 1,
            name: '公共聊天',
            lastMessage: '欢迎大家加入公共聊天',
            time: '10:00',
            messages: [
              {
                id: 1,
                text: '欢迎大家加入公共聊天',
                time: '10:00',
                isOwn: false,
                chatId: 1,
                senderId: 0,
                senderName: '系统'
              }
            ],
            isPublic: true,
            isGroup: true
          }
        ];
      }
    } else {
      // API调用失败，使用默认聊天数�?
      chats.value = [
        {
          id: 1,
          name: '公共聊天',
          lastMessage: '欢迎大家加入公共聊天',
          time: '10:00',
          messages: [
            {
              id: 1,
              text: '欢迎大家加入公共聊天',
              time: '10:00',
              isOwn: false,
              chatId: 1,
              senderId: 0,
              senderName: '系统'
            }
          ],
          isPublic: true,
          isGroup: true
        }
      ];
    }
    
    // 设置默认选中的聊�?
    activeChatId.value = 1;
    
    // 保存到本地存�?
    saveChatsToLocalStorage();
    
    console.log('聊天数据加载完成');
    // 确保WebSocket连接
    if (websocketService.isConnected()) {
      // 加入公共聊天
      joinChat(1);
    } else {
      // 重新连接WebSocket
      reconnectWebSocket();
    }
  } catch (error) {
    console.error('加载聊天数据失败:', error)
    console.log('使用默认聊天数据');
    // 使用默认聊天数据
    chats.value = [
      {
        id: 1,
        name: '公共聊天',
        lastMessage: '欢迎大家加入公共聊天',
        time: '10:00',
        messages: [
          {
            id: 1,
            text: '欢迎大家加入公共聊天',
            time: '10:00',
            isOwn: false,
            chatId: 1,
            senderId: 0,
            senderName: '系统'
          }
        ],
        isPublic: true,
        isGroup: true
      }
    ];
    
    // 设置默认选中的聊�?
    activeChatId.value = 1;
    // 保存到本地存�?
    saveChatsToLocalStorage();
  } finally {
    // 确保WebSocket连接
    if (websocketService.isConnected()) {
      // 加入公共聊天
      joinChat(1);
    } else {
      // 重新连接WebSocket
      reconnectWebSocket();
    }
    loading.value = false
  }
}

// 连接WebSocket
const connectWebSocket = () => {
  try {
    console.log('正在连接WebSocket服务�?..');
    // 连接到WebSocket服务�?
    websocketService.connect();
    
    // 发送员工ID
    const userId = localStorage.getItem('username') || '1';
    console.log(`发送员工ID: ${userId}`);
    websocketService.emit('setEmployeeId', userId);
    // 发送用户登录状�?
    const username = localStorage.getItem('username');
    if (username) {
      console.log(`发送用户登录状�? ${username}`);
      websocketService.emit('setUserLogin', username);
    }
    // 加入公共聊天
    console.log('加入公共聊天');
    websocketService.emit('joinChat', 1);
    
    // 接收新消息
    websocketService.on('newMessage', (message: any) => {
      console.log('收到新消息', message);
      
      // 确保员工数据已加载
      if (employees.value.length === 0) {
        console.log('员工数据未加载，正在加载...');
        loadEmployees().then(() => {
          console.log('员工数据加载完成，更新消息发送者姓名');
            // 更新所有消息的发送者姓名
          updateMessageSenderNames();
        });
      }
      
      // 只处理公共聊天的消息
      if (message.chatId === 1) {
        console.log('处理公共聊天消息');
        // 查找公共聊天
        const chatIndex = chats.value.findIndex(chat => chat.id === 1);
        if (chatIndex !== -1) {
          // 检查是否是自己发送的消息
          const isOwnMessage = message.senderId === (localStorage.getItem('username') || '1');
          
          // 检查是否有临时ID
          if (message.tempId) {
            // 查找临时消息并替换它
            const tempMessageIndex = chats.value[chatIndex].messages.findIndex(msg => msg.id === message.tempId);
            if (tempMessageIndex !== -1) {
              // 替换临时消息
              chats.value[chatIndex].messages[tempMessageIndex] = {
                id: message.id,
                text: message.text,
                time: message.time,
                isOwn: isOwnMessage,
                chatId: message.chatId,
                senderId: message.senderId,
                senderName: message.senderId === 0 ? '系统' : employees.value.find(emp => emp.name === message.senderId)?.name || '未知用户',
                status: 'delivered'
              };
              
              console.log('替换临时消息:', message.tempId, '->', message.id);
            }
          } else {
            // 检查消息是否已经存在（避免重复�?
            const messageExists = chats.value[chatIndex].messages.some(msg => msg.id === message.id);
            if (!messageExists) {
              // 添加消息到聊天记�?
              chats.value[chatIndex].messages.push({
                id: message.id,
                text: message.text,
                time: message.time,
                isOwn: isOwnMessage,
                chatId: message.chatId,
                senderId: message.senderId,
                senderName: message.senderId === 0 ? '系统' : employees.value.find(emp => emp.name === message.senderId)?.name || '未知用户'
              });
              
              // 更新聊天的最后消息和时间
              chats.value[chatIndex].lastMessage = message.text;
              chats.value[chatIndex].time = message.time;
              
              // 如果不是自己发送的消息，增加未读消息计�?
              if (!isOwnMessage && activeChatId.value !== message.chatId) {
                unreadCount.value[message.chatId] = (unreadCount.value[message.chatId] || 0) + 1;
              }
            } else {
              console.log('消息已存在，跳过重复添加:', message.id);
            }
          }
          
          // 保存到本地存�?
          saveChatsToLocalStorage();
          
          // 如果当前正在查看该聊天，滚动到最新消�?
          if (activeChatId.value === message.chatId) {
            scrollToLatestMessage();
            // 重置未读消息计数
            delete unreadCount.value[message.chatId];
          }
        }
      }
    });
    
    // 接收在线用户�?
    websocketService.on('onlineUsers', (count: number) => {
      console.log('在线用户�?', count);
      onlineUsers.value = count;
    });
    
    // 接收在线员工ID列表
    websocketService.on('onlineEmployeeIds', (employeeIds: string[]) => {
      console.log('在线员工ID列表:', employeeIds);
      onlineEmployeeIds.value = new Set(employeeIds);
    });
    
    // 接收消息已送达状�?
    websocketService.on('messageDelivered', (data: { messageId: number, chatId: number }) => {
      console.log('消息已送达:', data);
      // 查找对应聊天和消�?
      const chatIndex = chats.value.findIndex(chat => chat.id === data.chatId);
      if (chatIndex !== -1) {
        const messageIndex = chats.value[chatIndex].messages.findIndex(msg => msg.id === data.messageId);
        if (messageIndex !== -1) {
          // 更新消息状态为'delivered'
          chats.value[chatIndex].messages[messageIndex].status = 'delivered';
          // 保存到本地存�?
          saveChatsToLocalStorage();
        }
      }
    });
    
    // 接收消息已读状�?
    websocketService.on('messageRead', (data: { messageId: number, chatId: number }) => {
      console.log('消息已读:', data);
      // 查找对应聊天和消�?
      const chatIndex = chats.value.findIndex(chat => chat.id === data.chatId);
      if (chatIndex !== -1) {
        const messageIndex = chats.value[chatIndex].messages.findIndex(msg => msg.id === data.messageId);
        if (messageIndex !== -1) {
          // 更新消息状态为'read'
          chats.value[chatIndex].messages[messageIndex].status = 'read';
          // 保存到本地存�?
          saveChatsToLocalStorage();
        }
      }
    });
    
  } catch (error) {
    console.error('WebSocket连接失败:', error);
  }
};

// 重新连接WebSocket
const reconnectWebSocket = () => {
  connectWebSocket();
};

// 滚动到最新消�?
const scrollToLatestMessage = () => {
  setTimeout(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  }, 100);
};

// 更新所有消息的发送者姓名
  const updateMessageSenderNames = () => {
    console.log('更新所有消息的发送者姓名');
  chats.value.forEach(chat => {
    chat.messages.forEach(message => {
      if (!message.isOwn) {
        const employee = employees.value.find(emp => emp.id === message.senderId);
        if (employee) {
          message.senderName = employee.name;
        }
      }
    });
  });
  // 保存到本地存储
    saveChatsToLocalStorage();
    console.log('消息发送者姓名更新完成');
};

// 播放通知声音
const playNotificationSound = () => {
  try {
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAD';
    audio.play();
  } catch (error) {
    console.error('播放通知声音失败:', error);
  }
};

// 加入聊天�?
const joinChat = (chatId: number) => {
  console.log(`发送joinChat事件到服务器，chatId: ${chatId}`);
  if (websocketService.isConnected()) {
    websocketService.emit('joinChat', chatId);
  } else {
    // 如果WebSocket未连接，先重新连�?
    reconnectWebSocket();
    // 连接成功后加入聊天室
    setTimeout(() => {
      if (websocketService.isConnected()) {
        websocketService.emit('joinChat', chatId);
      }
    }, 1000);
  }
  // 重置未读计数
  delete unreadCount.value[chatId];
};

// 离开聊天�?
const leaveChat = (chatId: number) => {
  console.log(`发送leaveChat事件到服务器，chatId: ${chatId}`);
  websocketService.emit('leaveChat', chatId);
};

// 组件挂载时加载数�?
onMounted(async () => {
  // 先加载员工数�?
  await loadEmployees();
  // 然后加载聊天数据
  await loadChats();
  // 确保在加载聊天数据后，再连接WebSocket
  connectWebSocket();
});

// 组件卸载时清�?
onUnmounted(() => {
  // 不需要断开WebSocket连接，因为它是单例的
});

const activeChat = computed(() => {
  return chats.value.find(chat => chat.id === activeChatId.value) || null
})

// 获取员工聊天ID
const getChatIdForEmployee = (employeeId: string): number => {
  const currentUserId = localStorage.getItem('username') || '1';
  // 使用员工ID的组合作为聊天ID，确保一致�?
  // 确保较小的ID在前，较大的ID在后，这样无论谁发起聊天，都会生成相同的聊天ID
  const id1 = currentUserId < employeeId ? currentUserId : employeeId;
  const id2 = currentUserId < employeeId ? employeeId : currentUserId;
  return parseInt(`${id1}${id2}`);
};

// 检查员工是否在�?
const isEmployeeOnline = (employeeId: string): boolean => {
  return onlineEmployeeIds.value.has(employeeId);
};

// 获取员工在线状�?
const getEmployeeStatus = (employeeId: string): string => {
  if (onlineEmployeeIds.value.has(employeeId)) {
    return '在线';
  } else {
    return '离线';
  }
};

// 选择员工聊天
const selectEmployeeChat = (chatId: number, chatName: string, isPublic: boolean, employeeId?: string) => {
  // 确保只处理公共聊�?
  if (chatId === 1) {
    // 离开当前聊天�?
    if (activeChatId.value) {
      console.log(`离开聊天�?${activeChatId.value}`);
      leaveChat(activeChatId.value);
    }
    
    // 选择公共聊天
    activeChatId.value = 1;
    
    // 加入公共聊天
    console.log('加入公共聊天');
    joinChat(1);
    
    // 重置未读消息计数
    delete unreadCount.value[chatId];
    
    // 滚动到最新消�?
    scrollToLatestMessage();
  }
};

const sendMessage = async () => {
  if (!messageText.value || !activeChat.value) return
  
  // 保存当前聊天ID和消息内�?
  const currentChatId = activeChat.value.id
  const messageContent = messageText.value
  
  try {
    const userId = localStorage.getItem('username') || '1'
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    
    // 创建临时消息ID
    const tempMessageId = Date.now()
    
    // 查找当前聊天
    const chatIndex = chats.value.findIndex(chat => chat.id === currentChatId);
    if (chatIndex !== -1) {
      // 创建新消息对象，初始状态为'sent'
      const newMessage = {
        id: tempMessageId, // 使用时间戳作为临时消息ID
        text: messageContent,
        time: time,
        isOwn: true,
        chatId: currentChatId,
        senderId: userId,
        senderName: '我',
        status: 'sent' as 'sent' | 'delivered' | 'read'
      };
      
      // 添加消息到本地聊天记录
      chats.value[chatIndex].messages.push(newMessage);
      
      // 更新聊天的最后消息和时间
      chats.value[chatIndex].lastMessage = messageContent;
      chats.value[chatIndex].time = time;
      
      // 滚动到最新消�?
      scrollToLatestMessage();
    }
    
    // 清空输入�?
    messageText.value = ''
    
    // 确保WebSocket连接
    if (!websocketService.isConnected()) {
      console.log('WebSocket未连接，正在重新连接...');
      websocketService.connect();
    }
    
    // 调用API发送消�?
    const response = await addMessage({
      chatId: currentChatId,
      senderId: userId,
      text: messageContent,
      time: time,
      tempId: tempMessageId
    });
    
    if (response.success) {
      // 消息状态会通过WebSocket更新，不需要在这里手动更新
    } else {
      throw new Error('发送消息失败');
    }
  } catch (error) {
    console.error('发送消息失败', error)
    ElMessage.error('发送消息失败')
  }
}

// 触发文件输入
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

// 处理文件上传
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    processFiles(Array.from(target.files))
  }
  // 重置文件输入，以便可以重复上传同一文件
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// 处理文件拖拽上传
const handleFileDrop = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    processFiles(Array.from(event.dataTransfer.files))
  }
}

// 处理文件
const processFiles = (files: File[]) => {
  if (!activeChat.value) return
  
  const currentChatId = activeChat.value.id
  const userId = parseInt(localStorage.getItem('userId') || '1')
  const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const currentUser = employees.value.find(emp => emp.id === userId)
  
  files.forEach(file => {
    // 生成文件URL
    const fileUrl = URL.createObjectURL(file)
    
    // 创建文件消息
    const fileMessage: Message = {
      id: Date.now() + Math.random(), // 使用时间戳和随机数作为唯一ID
      text: `[文件] ${file.name}`,
      time: time,
      isOwn: true,
      chatId: currentChatId,
      senderId: userId,
      senderName: currentUser ? currentUser.name : '未知用户'
    }
    
    // 更新本地聊天数据
    const chatIndex = chats.value.findIndex(chat => chat.id === currentChatId)
    if (chatIndex !== -1) {
      chats.value[chatIndex].messages.push(fileMessage)
      chats.value[chatIndex].lastMessage = `[文件] ${file.name}`
      chats.value[chatIndex].time = time
    }
  })
  
  ElMessage.success(`成功上传 ${files.length} 个文件`)
  
  // 保存到本地存�?
  saveChatsToLocalStorage()
}

// 处理键盘事件
const handleKeyDown = (e: KeyboardEvent) => {
  // Enter 发送消息，Shift + Enter 换行
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (messageText.value.trim()) {
      sendMessage()
    }
  }
}


</script>

<style scoped>
.employee-chat-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: #E4EDF2;
}

/* 顶部导航 */
.header {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(100, 149, 237, 0.3);
  padding: 0 2rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.logo {
  position: relative;
  display: flex;
  align-items: center;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.logo-glow {
  position: absolute;
  top: -50%;
  left: -20%;
  width: 140%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(100, 149, 237, 0.3), transparent);
  filter: blur(20px);
  animation: glow 3s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

.nav {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  max-width: 400px;
}

.nav-item {
  color: rgba(51, 51, 51, 0.8);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(100, 149, 237, 0.2), transparent);
  transition: left 0.3s ease;
}

.nav-item:hover::before,
.nav-item.active::before {
  left: 100%;
}

.nav-item:hover,
.nav-item.active {
  color: #333;
  background: rgba(100, 149, 237, 0.2);
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.logout-btn {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
}

.logout-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(244, 67, 54, 0.2), transparent);
  transition: left 0.3s ease;
}

.logout-btn:hover::before {
  left: 100%;
}

.logout-btn:hover {
  background: rgba(244, 67, 54, 0.2);
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.3);
}

/* 主内容区 */
.main-content {
  flex: 1;
  overflow: hidden;
}

.chat-container {
  display: flex;
  height: 100%;
}

/* 左侧聊天列表 */
.chat-sidebar {
  width: 300px;
  background: rgba(255, 255, 255, 0.9);
  border-right: 1px solid rgba(100, 149, 237, 0.3);
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid rgba(100, 149, 237, 0.2);
}

.sidebar-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.clear-btn {
  background: rgba(244, 67, 54, 0.1) !important;
  color: #f44336 !important;
  border: 1px solid rgba(244, 67, 54, 0.3) !important;
  border-radius: 50% !important;
  width: 32px !important;
  height: 32px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.3s ease !important;
}

.clear-btn:hover {
  background: rgba(244, 67, 54, 0.2) !important;
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.3) !important;
}

.create-btn {
  background: rgba(100, 149, 237, 0.2) !important;
  color: #6495ED !important;
  border: 1px solid rgba(100, 149, 237, 0.4) !important;
  border-radius: 50% !important;
  width: 32px !important;
  height: 32px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.3s ease !important;
}

.create-btn:hover {
  background: rgba(100, 149, 237, 0.3) !important;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.4) !important;
}

.employee-list {
  flex: 1;
  overflow-y: auto;
}

.employee-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  transition: all 0.3s ease;
  border-bottom: 1px solid rgba(100, 149, 237, 0.2);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.employee-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(100, 149, 237, 0.1), transparent);
  transition: left 0.3s ease;
}

.employee-item:hover::before,
.employee-item.active::before {
  left: 100%;
}

.employee-item:hover,
.employee-item.active {
  background: rgba(100, 149, 237, 0.1);
}

.employee-item.active {
  border-left: 3px solid #6495ED;
}

.employee-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(45deg, #6495ED, #87CEFA);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  margin-right: 1rem;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(100, 149, 237, 0.4);
  position: relative;
}

.status-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #64748b;
  border: 2px solid #fff;
  transition: all 0.3s ease;
}

.status-indicator.online {
  background: #10b981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.6);
}

.employee-info {
  flex: 1;
  min-width: 0;
}

.employee-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.employee-status {
  font-size: 0.75rem;
  color: rgba(51, 51, 51, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  position: absolute;
  top: -5px;
  right: -5px;
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-last-message {
  font-size: 0.875rem;
  color: rgba(51, 51, 51, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-time {
  font-size: 0.75rem;
  color: rgba(100, 149, 237, 0.8);
  margin-left: 1rem;
  flex-shrink: 0;
}

/* 右侧聊天内容 */
.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.9);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid rgba(100, 149, 237, 0.3);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.chat-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.online-count {
  font-size: 0.8rem;
  color: rgba(100, 149, 237, 0.8);
  font-weight: normal;
  margin-left: 0.5rem;
}

.chat-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: rgba(100, 149, 237, 0.2) !important;
  color: #6495ED !important;
  border: 1px solid rgba(100, 149, 237, 0.4) !important;
  border-radius: 50% !important;
  width: 32px !important;
  height: 32px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.3s ease !important;
}

.action-btn:hover {
  background: rgba(100, 149, 237, 0.3) !important;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.4) !important;
}

.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(51, 51, 51, 0.6);
}

.empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(100, 149, 237, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  color: rgba(100, 149, 237, 0.6);
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}

.empty-icon svg {
  width: 40px;
  height: 40px;
}

.empty-text {
  font-size: 1.1rem;
  margin: 0;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.message-item.own-message {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(45deg, #6495ED, #87CEFA);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(100, 149, 237, 0.4);
}

.message-item.own-message .message-avatar {
  background: linear-gradient(45deg, #10b981, #34d399);
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.message-item.own-message .message-content {
  align-items: flex-end;
}

.message-text {
  padding: 0.75rem 1rem;
  border-radius: 18px;
  background: rgba(100, 149, 237, 0.2);
  color: #333;
  line-height: 1.4;
  word-wrap: break-word;
}

.message-item.own-message .message-text {
  background: linear-gradient(45deg, #6495ED, #87CEFA);
  color: #fff;
}

.message-sender {
  font-size: 0.75rem;
  color: rgba(100, 149, 237, 0.8);
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.25rem;
}

.message-time {
  font-size: 0.75rem;
  color: rgba(51, 51, 51, 0.6);
}

.message-status {
  font-size: 0.75rem;
  margin-left: 0.5rem;
}

.message-status.sent {
  color: rgba(100, 149, 237, 0.8);
}

.message-status.delivered {
  color: rgba(16, 185, 129, 0.8);
}

.message-status.read {
  color: rgba(139, 92, 246, 0.8);
}

.message-input {
  padding: 1rem;
  border-top: 1px solid rgba(100, 149, 237, 0.3);
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  position: relative;
  box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.05);
}

.input-tools {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tool-btn {
  background: rgba(100, 149, 237, 0.2) !important;
  color: #6495ED !important;
  border: 1px solid rgba(100, 149, 237, 0.4) !important;
  border-radius: 50% !important;
  width: 32px !important;
  height: 32px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.3s ease !important;
}

.tool-btn:hover {
  background: rgba(100, 149, 237, 0.3) !important;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.4) !important;
}

.file-input {
  display: none;
}

.input-field {
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  background: rgba(255, 255, 255, 0.8) !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 20px !important;
  padding: 0.5rem 1rem !important;
  color: #333 !important;
  resize: none !important;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.input-field::placeholder {
  color: rgba(51, 51, 51, 0.4) !important;
}

.send-btn {
  background: linear-gradient(45deg, #6495ED, #87CEFA) !important;
  border: none !important;
  border-radius: 50% !important;
  width: 40px !important;
  height: 40px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: 0 4px 10px rgba(100, 149, 237, 0.4) !important;
  transition: all 0.3s ease !important;
  flex-shrink: 0;
}

.send-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 15px rgba(100, 149, 237, 0.6) !important;
}

/* 页脚 */
.footer {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(100, 149, 237, 0.3);
  padding: 1rem 2rem;
  text-align: center;
  color: rgba(51, 51, 51, 0.6);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 滚动条样�?*/
.chat-list::-webkit-scrollbar,
.message-list::-webkit-scrollbar {
  width: 6px;
}

.chat-list::-webkit-scrollbar-track,
.message-list::-webkit-scrollbar-track {
  background: rgba(100, 149, 237, 0.1);
  border-radius: 3px;
}

.chat-list::-webkit-scrollbar-thumb,
.message-list::-webkit-scrollbar-thumb {
  background: rgba(100, 149, 237, 0.5);
  border-radius: 3px;
}

.chat-list::-webkit-scrollbar-thumb:hover,
.message-list::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 149, 237, 0.7);
}
</style>
