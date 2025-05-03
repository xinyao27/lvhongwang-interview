import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, MessageContent } from '../types';

interface ChatMessagesProps {
  messages: Message[];
  streamingMessage: string | null;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, streamingMessage }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingMessage]);

  // 格式化日期
  const formatDate = (date: Date) => {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // 渲染消息内容，支持Markdown
  const renderContent = (content: string) => {
    return (
      <ReactMarkdown>
        {content}
      </ReactMarkdown>
    );
  };

  // 渲染复杂消息内容（可能包含图片）
  const renderComplexContent = (content: MessageContent[]) => {
    return (
      <div>
        {content.map((item, index) => {
          if (item.type === 'text' && item.text) {
            return (
              <div key={index} className="mb-2">
                {renderContent(item.text)}
              </div>
            );
          } else if (item.type === 'image_url' && item.image_url) {
            return (
              <div key={index} className="my-3">
                <div className="relative group">
                  <img 
                    src={item.image_url.url} 
                    alt="用户上传的图片" 
                    className="max-w-full max-h-64 rounded-lg shadow-sm cursor-pointer"
                    onClick={() => window.open(item.image_url!.url, '_blank')}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center rounded-lg">
                    <div className="opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                      点击查看原图
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  // 用户消息样式
  const renderUserMessage = (message: Message) => (
    <div className="flex justify-end mb-4">
      <div className="flex flex-col max-w-[75%]">
        <div className="bg-blue-600 text-white p-3 rounded-lg rounded-tr-none shadow">
          <div className="prose prose-sm prose-invert max-w-none text-left">
            {typeof message.content === 'string' 
              ? renderContent(message.content)
              : renderComplexContent(message.content as MessageContent[])}
          </div>
        </div>
        <span className="text-xs text-gray-500 mt-1 self-end">
          {formatDate(message.createdAt)}
        </span>
      </div>
    </div>
  );

  // AI消息样式
  const renderAssistantMessage = (message: Message) => (
    <div className="flex justify-start mb-4">
      <div className="flex flex-col max-w-[75%]">
        <div className="bg-gray-100 p-3 rounded-lg rounded-tl-none shadow">
          <div className="prose prose-sm max-w-none text-left">
            {typeof message.content === 'string'
              ? renderContent(message.content)
              : renderComplexContent(message.content as MessageContent[])}
          </div>
        </div>
        <span className="text-xs text-gray-500 mt-1">
          {formatDate(message.createdAt)}
        </span>
      </div>
    </div>
  );

  // 流式消息样式 - 去掉背景，让光标效果更好
  const renderStreamingMessage = () => (
    <div className="flex justify-start mb-4">
      <div className="flex flex-col max-w-[75%]">
        <div className="p-3">
          <div className="prose prose-sm max-w-none text-left">
            {streamingMessage && renderContent(streamingMessage)}
            <span className="inline-block ml-1 animate-pulse">▋</span>
          </div>
        </div>
        <span className="text-xs text-gray-500 mt-1">
          {formatDate(new Date())}
        </span>
      </div>
    </div>
  );

  // 欢迎消息
  const renderWelcomeMessage = () => (
    <div className="flex justify-start mb-4">
      <div className="flex flex-col max-w-[75%]">
        <div className="bg-gray-100 p-3 rounded-lg rounded-tl-none shadow">
          <div className="prose prose-sm max-w-none">
            <p>👋 你好！我是AI助手，有什么可以帮你的？</p>
            <p>现在支持上传图片功能，点击左下角图标上传图片。</p>
          </div>
        </div>
        <span className="text-xs text-gray-500 mt-1">
          {formatDate(new Date())}
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-4xl mx-auto">
        {messages.length === 0 ? (
          renderWelcomeMessage()
        ) : (
          messages.map((message) => (
            <div key={message.id}>
              {message.role === 'user' 
                ? renderUserMessage(message) 
                : renderAssistantMessage(message)
              }
            </div>
          ))
        )}

        {streamingMessage !== null && renderStreamingMessage()}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatMessages;