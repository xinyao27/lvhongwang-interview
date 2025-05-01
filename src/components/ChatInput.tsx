import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onStopGeneration: () => void;
  isGenerating: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  onStopGeneration,
  isGenerating 
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !isGenerating) {
      onSendMessage(message.trim());
      setMessage('');
      
      // 重置输入框高度
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex-grow relative flex items-center">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
            style={{ 
              height: '46px', 
              minHeight: '46px', 
              lineHeight: '1.5',
              paddingTop: '10px',
              paddingBottom: '10px'
            }}
            rows={1}
            disabled={isGenerating}
          />
        </div>
        
        {isGenerating ? (
          <button
            type="button"
            onClick={onStopGeneration}
            className="px-4 py-0 bg-red-500 text-white rounded-lg font-medium flex items-center justify-center min-w-[90px] h-[46px]"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            停止
          </button>
        ) : (
          <button
            type="submit"
            disabled={!message.trim()}
            className={`px-4 py-0 bg-blue-600 text-white rounded-lg font-medium min-w-[90px] h-[46px] ${
              !message.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
          >
            发送
          </button>
        )}
      </form>
    </div>
  );
};

export default ChatInput; 