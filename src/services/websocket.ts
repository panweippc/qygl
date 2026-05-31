import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public connect() {
    if (this.socket && this.socket.connected) {
      return;
    }

    try {
      console.log('正在连接WebSocket服务器...');
      
      // 断开现有连接
      if (this.socket) {
        this.socket.disconnect();
      }

      // 连接到WebSocket服务器，使用相对路径
      this.socket = io({ 
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 5000,
        autoConnect: true
      });

      // 连接成功
      this.socket.on('connect', () => {
        console.log('WebSocket连接成功');
        // 发送用户登录状态
        const username = localStorage.getItem('username');
        if (username) {
          console.log(`发送用户登录状态: ${username}`);
          this.socket?.emit('setUserLogin', username);
        }
      });

      // 连接错误
      this.socket.on('connect_error', (error) => {
        console.error('WebSocket连接错误:', error);
      });

      // 断开连接
      this.socket.on('disconnect', () => {
        console.log('WebSocket断开连接');
      });

    } catch (error) {
      console.error('WebSocket连接失败:', error);
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public emit(event: string, data: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }

  public on(event: string, callback: Function) {
    if (this.socket) {
      // 存储监听器
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event)?.push(callback);

      // 添加事件监听
      this.socket.on(event, callback);
    }
  }

  public off(event: string, callback: Function) {
    if (this.socket) {
      // 移除监听器
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }

      // 移除事件监听
      this.socket.off(event, callback);
    }
  }

  public isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }
}

export default WebSocketService.getInstance();
