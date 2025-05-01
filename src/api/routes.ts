import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { v4 as uuidv4 } from 'uuid';
import { sessions, messages } from '../db/repository';
import { generateChatResponse } from '../utils/ai';
import { Message } from '../types';

// 创建Hono应用
const app = new Hono();

// 会话相关路由
app
  .get('/sessions', async (c) => {
    try {
      const allSessions = await sessions.getAll();
      return c.json(allSessions);
    } catch (error) {
      console.error('获取会话失败:', error);
      return c.json({ error: '获取会话失败' }, { status: 500 });
    }
  })
  .post('/sessions', async (c) => {
    try {
      const { title } = await c.req.json();
      const newSession = await sessions.create(title || '');
      return c.json(newSession);
    } catch (error) {
      console.error('创建会话失败:', error);
      return c.json({ error: '创建会话失败' }, { status: 500 });
    }
  })
  .get('/sessions/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const session = await sessions.getById(id);
      
      if (!session) {
        return c.json({ error: '会话不存在' }, { status: 404 });
      }
      
      return c.json(session);
    } catch (error) {
      console.error('获取会话详情失败:', error);
      return c.json({ error: '获取会话详情失败' }, { status: 500 });
    }
  })
  .put('/sessions/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const { title } = await c.req.json();
      
      const session = await sessions.getById(id);
      if (!session) {
        return c.json({ error: '会话不存在' }, { status: 404 });
      }
      
      const updatedSession = await sessions.update(id, title);
      return c.json(updatedSession);
    } catch (error) {
      console.error('更新会话失败:', error);
      return c.json({ error: '更新会话失败' }, { status: 500 });
    }
  })
  .delete('/sessions/:id', async (c) => {
    try {
      const id = c.req.param('id');
      
      const session = await sessions.getById(id);
      if (!session) {
        return c.json({ error: '会话不存在' }, { status: 404 });
      }
      
      await sessions.delete(id);
      return c.json({ success: true });
    } catch (error) {
      console.error('删除会话失败:', error);
      return c.json({ error: '删除会话失败' }, { status: 500 });
    }
  });

// 消息相关路由
app
  .get('/sessions/:sessionId/messages', async (c) => {
    try {
      const sessionId = c.req.param('sessionId');
      
      // 检查会话是否存在
      const session = await sessions.getById(sessionId);
      if (!session) {
        return c.json({ error: '会话不存在' }, { status: 404 });
      }
      
      const messagesData = await messages.getBySessionId(sessionId);
      return c.json(messagesData);
    } catch (error) {
      console.error('获取消息失败:', error);
      return c.json({ error: '获取消息失败' }, { status: 500 });
    }
  })
  .post('/sessions/:sessionId/messages', zValidator('json', z.object({
    role: z.string(),
    content: z.string(),
  })), async (c) => {
    try {
      const sessionId = c.req.param('sessionId');
      const { role, content } = await c.req.json();
      
      // 检查会话是否存在
      const session = await sessions.getById(sessionId);
      if (!session) {
        return c.json({ error: '会话不存在' }, { status: 404 });
      }
      
      const newMessage = await messages.create(sessionId, role, content);
      
      // 如果是用户消息，获取AI响应
      if (role === 'user') {
        // 获取会话的所有消息
        const sessionMessages = await messages.getBySessionId(sessionId);
        
        // 转换为AI处理需要的格式
        const formattedMessages = sessionMessages.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          createdAt: msg.createdAt
        }));
        
        try {
          // 获取AI响应
          const stream = await generateChatResponse(formattedMessages);
          
          let responseContent = '';
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            responseContent += content;
          }
          
          // 保存AI响应
          if (responseContent) {
            await messages.create(sessionId, 'assistant', responseContent);
          }
          
          // 更新会话标题（如果是第一条消息）
          if (!session.title && role === 'user') {
            // 使用用户的第一条消息作为标题（最多20个字符）
            const title = content.length > 20 ? content.substring(0, 20) + '...' : content;
            await sessions.update(sessionId, title);
          }
          
          // 获取更新后的消息列表
          const updatedMessages = await messages.getBySessionId(sessionId);
          return c.json(updatedMessages);
        } catch (error) {
          console.error('AI响应生成失败:', error);
          // 即使AI响应失败，也返回保存的用户消息
          return c.json({ 
            message: newMessage,
            error: 'AI响应生成失败'
          });
        }
      } else {
        return c.json(newMessage);
      }
    } catch (error) {
      console.error('创建消息失败:', error);
      return c.json({ error: '创建消息失败' }, { status: 500 });
    }
  });

// Agent API路由
app.post('/agent', async (c) => {
  try {
    const { messages: reqMessages, sessionId } = await c.req.json();
    
    if (!reqMessages || !Array.isArray(reqMessages)) {
      return c.json({ error: '无效的消息格式' }, { status: 400 });
    }
    
    // 保存会话和消息到数据库
    let chatSessionId = sessionId;
    
    if (!chatSessionId) {
      // 创建新会话
      const newSession = await sessions.create();
      chatSessionId = newSession.id;
    } else {
      // 验证会话是否存在
      const existingSession = await sessions.getById(chatSessionId);
      if (!existingSession) {
        return c.json({ error: '指定的会话不存在' }, { status: 404 });
      }
    }
    
    // 格式化消息，确保日期是Date对象
    const formattedMessages: Message[] = reqMessages.map((msg: any) => {
      // 确保创建日期是有效的Date对象
      let createdAt: Date;
      if (msg.createdAt) {
        createdAt = new Date(msg.createdAt);
      } else {
        createdAt = new Date();
      }
      
      return {
        id: msg.id || uuidv4(),
        role: msg.role,
        content: msg.content,
        createdAt: createdAt,
      };
    });
    
    // 检查消息是否已存在并仅保存新消息
    const existingMessages = await messages.getBySessionId(chatSessionId);
    const existingIds = new Set(existingMessages.map(msg => msg.id));

    // 只保存数据库中不存在的消息
    const newMessages = formattedMessages.filter(msg => !existingIds.has(msg.id));

    if (newMessages.length > 0) {
      // 保存新消息到数据库
      await messages.createMany(chatSessionId, newMessages);
    }
    
    // 获取AI响应并直接返回
    const aiStream = await generateChatResponse(formattedMessages);
    
    // 手动设置响应头
    c.header('Content-Type', 'text/plain; charset=utf-8');
    c.header('Transfer-Encoding', 'chunked');
    
    // 收集完整响应
    let fullResponse = '';
    
    // 流式响应处理
    return c.body(
      new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of aiStream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                fullResponse += content;
                controller.enqueue(new TextEncoder().encode(content));
              }
            }
            controller.close();
            
            // 响应完成后，保存AI回复
            if (fullResponse) {
              const aiMessage: Message = {
                id: uuidv4(),
                role: 'assistant',
                content: fullResponse,
                createdAt: new Date(),
              };
              await messages.create(chatSessionId, aiMessage.role, aiMessage.content);
              
              // 如果是新会话且没有标题，使用第一条用户消息作为标题
              const session = await sessions.getById(chatSessionId);
              if (session && !session.title) {
                const userMsg = formattedMessages.find(m => m.role === 'user');
                if (userMsg) {
                  const title = userMsg.content.length > 20 
                    ? userMsg.content.substring(0, 20) + '...' 
                    : userMsg.content;
                  await sessions.update(chatSessionId, title);
                }
              }
            }
          } catch (error) {
            console.error('Stream处理错误:', error);
            controller.error(error);
          }
        }
      })
    );
  } catch (error) {
    console.error('Agent处理失败:', error);
    return c.json({ error: '处理请求失败' }, { status: 500 });
  }
});

export default app; 