import { v4 as uuidv4 } from 'uuid';
import { db } from './config';
import { chatSessions, chatMessages, NewChatSession, NewChatMessage } from './schema';
import { eq, desc, asc } from 'drizzle-orm';
import { Message } from '../types';

// 会话相关操作
export const sessions = {
  // 获取所有会话
  getAll: async () => {
    return await db.select().from(chatSessions).orderBy(desc(chatSessions.updatedAt));
  },

  // 获取单个会话
  getById: async (id: string) => {
    const result = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return result.length > 0 ? result[0] : null;
  },

  // 创建会话
  create: async (title: string = '') => {
    const sessionId = uuidv4();
    const newSession: NewChatSession = {
      id: sessionId,
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.insert(chatSessions).values(newSession);
    return { id: sessionId, title, createdAt: newSession.createdAt, updatedAt: newSession.updatedAt };
  },

  // 更新会话
  update: async (id: string, title: string) => {
    await db.update(chatSessions)
      .set({ 
        title,
        updatedAt: new Date()
      })
      .where(eq(chatSessions.id, id));
    
    return await sessions.getById(id);
  },

  // 删除会话
  delete: async (id: string) => {
    // 首先删除所有相关消息
    await db.delete(chatMessages).where(eq(chatMessages.sessionId, id));
    // 然后删除会话
    await db.delete(chatSessions).where(eq(chatSessions.id, id));
    return true;
  }
};

// 消息相关操作
export const messages = {
  // 获取会话的所有消息
  getBySessionId: async (sessionId: string) => {
    const dbMessages = await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt));
    
    // 处理每条消息的内容，尝试解析JSON格式的内容
    return dbMessages.map(msg => {
      let content = msg.content;
      // 尝试解析可能的JSON内容
      try {
        if (content.startsWith('[') || content.startsWith('{')) {
          const parsed = JSON.parse(content);
          content = parsed;
        }
      } catch (e) {
        // 解析失败，保持原始内容不变
        console.error('解析消息内容失败:', e);
      }
      
      return {
        ...msg,
        content
      };
    });
  },

  // 创建消息
  create: async (sessionId: string, role: string, content: string | any) => {
    const messageId = uuidv4();
    const newMessage: NewChatMessage = {
      id: messageId,
      sessionId,
      role,
      // 如果内容不是字符串，则将其序列化为JSON字符串
      content: typeof content === 'string' ? content : JSON.stringify(content),
      createdAt: new Date(),
    };
    
    await db.insert(chatMessages).values(newMessage);
    
    // 更新会话的更新时间
    await db.update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId));
    
    return { id: messageId, sessionId, role, content, createdAt: newMessage.createdAt };
  },

  // 批量创建消息
  createMany: async (sessionId: string, messages: Message[]) => {
    if (messages.length === 0) return [];
    
    const newMessages = messages.map(msg => {
      // 确保创建日期是有效的Date对象
      let createdAt: Date;
      if (msg.createdAt instanceof Date) {
        createdAt = msg.createdAt;
      } else if (typeof msg.createdAt === 'string') {
        createdAt = new Date(msg.createdAt);
      } else {
        createdAt = new Date();
      }
      
      // 序列化非字符串内容
      const content = typeof msg.content === 'string' 
        ? msg.content 
        : JSON.stringify(msg.content);
      
      return {
        id: msg.id || uuidv4(),
        sessionId,
        role: msg.role,
        content,
        createdAt: createdAt,
      };
    });
    
    await db.insert(chatMessages).values(newMessages);
    
    // 更新会话的更新时间
    await db.update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId));
    
    return newMessages;
  },

  // 删除消息
  delete: async (id: string) => {
    await db.delete(chatMessages).where(eq(chatMessages.id, id));
    return true;
  },
  
  // 删除会话的所有消息
  deleteBySessionId: async (sessionId: string) => {
    await db.delete(chatMessages).where(eq(chatMessages.sessionId, sessionId));
    return true;
  }
}; 