import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '../types';

interface ChatMessagesProps {
  messages: Message[];
  streamingMessage: string | null;
}

// 定义代码块组件的类型
interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
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
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: CodeProps) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={nord}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={`bg-gray-100 dark:bg-gray-800 px-1 rounded ${className}`} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  // 用户消息样式
  const renderUserMessage = (message: Message) => (
    <div className="flex justify-end mb-4">
      <div className="flex flex-col max-w-[75%]">
        <div className="bg-blue-600 text-white p-3 rounded-lg rounded-tr-none shadow">
          <div className="prose prose-sm prose-invert max-w-none">
            {renderContent(message.content)}
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
          <div className="prose prose-sm max-w-none">
            {renderContent(message.content)}
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
          <div className="prose prose-sm max-w-none">
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