import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { v4 as uuidv4 } from 'uuid';
import { sessions, messages } from '../db/repository';
import { generateChatResponse } from '../utils/ai';
import { Message } from '../types';
import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import os from 'os';
import formidable from 'formidable';
import { cosConfig } from '../utils/config';

// 创建COS实例
const cos = new COS({
  SecretId: cosConfig.SecretId,
  SecretKey: cosConfig.SecretKey,
});

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
    
    console.log('收到Agent请求，消息数量:', reqMessages.length);
    
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
        content: msg.content, // 内容可以是字符串或对象，由数据库代码处理序列化
        createdAt: createdAt,
      };
    });
    
    console.log('处理Agent请求，格式化后的消息示例:', 
                formattedMessages.length > 0 
                ? JSON.stringify(formattedMessages[formattedMessages.length - 1]) 
                : '无消息');
    
    // 检查消息是否已存在并仅保存新消息
    const existingMessages = await messages.getBySessionId(chatSessionId);
    const existingIds = new Set(existingMessages.map(msg => msg.id));

    // 只保存数据库中不存在的消息
    const newMessages = formattedMessages.filter(msg => !existingIds.has(msg.id));

    if (newMessages.length > 0) {
      // 保存新消息到数据库
      await messages.createMany(chatSessionId, newMessages);
    }
    
    // 在API请求中，确保所有消息内容都是字符串，这对OpenAI API是必要的
    const apiMessages = formattedMessages.map(msg => {
      if (typeof msg.content === 'string') {
        return msg;
      } else {
        // 如果msg.content是数组，则返回原始对象，让OpenAI API处理
        return msg;
      }
    });
    
    // 获取AI响应并直接返回
    const aiStream = await generateChatResponse(apiMessages);
    
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
                  // 提取文本内容作为标题
                  let titleText = '';
                  if (typeof userMsg.content === 'string') {
                    titleText = userMsg.content;
                  } else if (Array.isArray(userMsg.content)) {
                    // 尝试从复杂消息中提取文本部分
                    const textContent = userMsg.content.find(c => c.type === 'text');
                    if (textContent && textContent.text) {
                      titleText = textContent.text;
                    }
                  }
                  
                  const title = titleText.length > 20 
                    ? titleText.substring(0, 20) + '...' 
                    : titleText;
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

// 图片上传API
app.post('/upload', async (c) => {
  console.log('收到图片上传请求');
  
  try {
    // 手动处理multipart/form-data
    const formData = await c.req.formData();
    console.log('解析表单数据成功, 字段:', Array.from(formData.keys()));

    // 获取图片文件
    const image = formData.get('image') as File | null;
    
    if (!image) {
      console.error('未找到图片文件');
      return c.json({ error: '未找到图片文件' }, { status: 400 });
    }
    
    console.log('收到图片文件:', image.name, image.type, image.size);
    
    // 检查文件类型
    if (!image.type.startsWith('image/')) {
      console.error('无效的文件类型:', image.type);
      return c.json({ error: '只能上传图片文件' }, { status: 400 });
    }
    
    // 检查文件大小（限制为5MB）
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (image.size > MAX_SIZE) {
      console.error('文件太大:', image.size);
      return c.json({ error: '图片大小不能超过5MB' }, { status: 400 });
    }
    
    try {
      // 读取文件内容
      const buffer = await image.arrayBuffer();
      console.log('读取图片文件成功, 大小:', buffer.byteLength);
      
      // 生成唯一文件名
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const fileName = `${cosConfig.Folder}/${timestamp}-${randomStr}-${image.name}`;
      
      console.log('上传到COS, Bucket:', cosConfig.Bucket, 'Region:', cosConfig.Region, 'Key:', fileName);
    
      // 上传到腾讯云COS
      return new Promise((resolve) => {
        cos.putObject({
          Bucket: cosConfig.Bucket,
          Region: cosConfig.Region,
          Key: fileName,
          Body: Buffer.from(buffer),
          ContentType: image.type,
        }, (err, data) => {
          if (err) {
            console.error('上传到腾讯云COS失败:', err, JSON.stringify(err));
            resolve(c.json({ error: '上传图片失败: ' + err.message }, { status: 500 }));
          } else {
            console.log('上传到COS成功:', data);
            // 构建文件URL并返回
            const imageUrl = `https://${cosConfig.Bucket}.cos.${cosConfig.Region}.myqcloud.com/${fileName}`;
            console.log('生成的图片URL:', imageUrl);
            resolve(c.json({ 
              success: true, 
              imageUrl 
            }));
          }
        });
      });
    } catch (error) {
      console.error('处理图片文件失败:', error);
      return c.json({ error: '处理图片文件失败' }, { status: 500 });
    }
  } catch (error) {
    console.error('处理图片上传请求失败:', error);
    return c.json({ error: '图片上传失败: ' + (error instanceof Error ? error.message : '未知错误') }, { status: 500 });
  }
});

export default app; 