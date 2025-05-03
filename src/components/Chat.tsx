import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatInput from './ChatInput';
import ChatMessages from './ChatMessages';
import { Message, MessageContent } from '../types';
import { messagesApi, agentApi } from '../utils/api';

interface ChatProps {
  sessionId: string | null;
}

const Chat: React.FC<ChatProps> = ({ sessionId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 加载消息
  useEffect(() => {
    if (!sessionId) return;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const data = await messagesApi.getBySessionId(sessionId);
        setMessages(data);
        setError(null);
      } catch (err) {
        console.error('加载消息失败:', err);
        setError('无法加载消息');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [sessionId]);

  // 处理发送消息
  const handleSendMessage = async (content: string, imageUrl?: string) => {
    if (!sessionId) return;
    
    // 准备消息内容
    let messageContent: string | MessageContent[];
    
    if (imageUrl) {
      // 如果有图片，使用新的消息格式
      messageContent = [
        { type: 'text', text: content || '请描述这张图片' },
        { 
          type: 'image_url', 
          image_url: { 
            url: imageUrl 
          } 
        }
      ];
    } else {
      // 纯文本消息
      messageContent = content;
    }
    
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: messageContent,
      createdAt: new Date(),
    };

    // 更新本地消息列表
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    setIsGenerating(true);
    setStreamingMessage('');
    abortControllerRef.current = new AbortController();

    try {
      // 使用流式API获取响应
      const stream = await agentApi.sendMessage(updatedMessages, sessionId);
      
      if (!stream) {
        throw new Error('无法获取响应流');
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let responseContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value, { stream: true });
        responseContent += text;
        setStreamingMessage(responseContent);
      }

      // 添加AI回复到消息列表
      if (responseContent) {
        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: responseContent,
          createdAt: new Date(),
        };

        setMessages([...updatedMessages, assistantMessage]);
      }
    } catch (error) {
      console.error('生成回复时出错:', error);
      
      // 如果是手动中断，添加中断标记
      if (error instanceof DOMException && error.name === 'AbortError') {
        const partialResponse = streamingMessage || '';
        if (partialResponse) {
          const assistantMessage: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: partialResponse + ' [已中断]',
            createdAt: new Date(),
          };
          
          setMessages([...updatedMessages, assistantMessage]);
        }
      } else {
        setError('AI响应生成失败');
      }
    } finally {
      setIsGenerating(false);
      setStreamingMessage(null);
      abortControllerRef.current = null;
    }
  };

  // 停止生成
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">未选择会话</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-md">
        <h1 className="text-xl md:text-2xl font-bold text-center">AI 聊天助手</h1>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-500">加载消息中...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              重新加载
            </button>
          </div>
        </div>
      ) : (
        <>
          <ChatMessages 
            messages={messages} 
            streamingMessage={streamingMessage} 
          />
          
          <ChatInput 
            onSendMessage={handleSendMessage} 
            onStopGeneration={handleStopGeneration}
            isGenerating={isGenerating}
          />
        </>
      )}
    </div>
  );
};

export default Chat; 