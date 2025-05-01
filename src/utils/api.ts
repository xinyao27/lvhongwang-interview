import { Message, ChatSession } from '../types';

const API_BASE_URL = 'http://localhost:3030/api';

// 会话管理
export const sessionsApi = {
  // 获取所有会话
  getAll: async (): Promise<ChatSession[]> => {
    const response = await fetch(`${API_BASE_URL}/sessions`);
    
    if (!response.ok) {
      throw new Error('获取会话列表失败');
    }
    
    return await response.json();
  },
  
  // 获取单个会话
  getById: async (id: string): Promise<ChatSession> => {
    const response = await fetch(`${API_BASE_URL}/sessions/${id}`);
    
    if (!response.ok) {
      throw new Error('获取会话详情失败');
    }
    
    return await response.json();
  },
  
  // 创建会话
  create: async (title: string = ''): Promise<ChatSession> => {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    
    if (!response.ok) {
      throw new Error('创建会话失败');
    }
    
    return await response.json();
  },
  
  // 更新会话
  update: async (id: string, title: string): Promise<ChatSession> => {
    const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    
    if (!response.ok) {
      throw new Error('更新会话失败');
    }
    
    return await response.json();
  },
  
  // 删除会话
  delete: async (id: string): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('删除会话失败');
    }
    
    return true;
  },
};

// 消息管理
export const messagesApi = {
  // 获取会话的所有消息
  getBySessionId: async (sessionId: string): Promise<Message[]> => {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages`);
    
    if (!response.ok) {
      throw new Error('获取消息列表失败');
    }
    
    const messages = await response.json();
    return messages.map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: new Date(msg.createdAt),
    }));
  },
  
  // 发送消息
  send: async (sessionId: string, content: string): Promise<Message[]> => {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'user',
        content,
      }),
    });
    
    if (!response.ok) {
      throw new Error('发送消息失败');
    }
    
    const messages = await response.json();
    if (Array.isArray(messages)) {
      return messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: new Date(msg.createdAt),
      }));
    }
    
    return [];
  },
};

// Agent API - 流式响应
export const agentApi = {
  // 发送消息并返回流式响应
  sendMessage: async (messages: Message[], sessionId?: string): Promise<ReadableStream> => {
    const response = await fetch(`${API_BASE_URL}/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        sessionId,
      }),
    });
    
    if (!response.ok) {
      throw new Error('发送消息失败');
    }
    
    // 确保响应是一个流
    if (response.body === null) {
      throw new Error('服务器返回的不是流式响应');
    }
    
    return response.body;
  },
}; 