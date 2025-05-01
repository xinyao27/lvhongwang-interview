import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`mb-5 ${isUser ? 'flex justify-end' : 'flex justify-start'}`}>
      {/* 用户消息 */}
      {isUser ? (
        <div className="message user-message max-w-[70%] ml-auto rounded-[15px] rounded-br-[5px] px-5 py-4 bg-[#007bff] text-white shadow-sm">
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      ) : (
        /* AI消息 */
        <div className="message ai-message max-w-[70%] mr-auto rounded-[15px] rounded-bl-[5px] px-5 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white shadow-sm">
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageItem; 