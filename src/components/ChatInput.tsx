import React, { useState, useRef, useEffect } from 'react';
import { uploadImage, createImageMarkdown, fileToBase64 } from '../utils/imageUploader';
import { MessageContent } from '../types';

interface ChatInputProps {
  onSendMessage: (message: string, imageUrl?: string) => void;
  onStopGeneration: () => void;
  isGenerating: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  onStopGeneration,
  isGenerating 
}) => {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((message.trim() || imageFile) && !isGenerating && !isUploading) {
      if (imageFile) {
        try {
          setIsUploading(true);
          // 上传图片并获取URL
          const imageUrl = await uploadImage(imageFile);
          // 发送消息和图片URL
          onSendMessage(message.trim(), imageUrl);
        } catch (error) {
          console.error('图片上传失败:', error);
          alert('图片上传失败: ' + (error instanceof Error ? error.message : '未知错误'));
          return;
        } finally {
          setIsUploading(false);
        }
      } else {
        // 仅发送文本消息
        onSendMessage(message.trim());
      }
      
      // 清空输入和图片预览
      setMessage('');
      clearImage();
      
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

  const handleImageButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    try {
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        throw new Error('只能上传图片文件');
      }
      
      // 检查文件大小（限制为5MB）
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_SIZE) {
        throw new Error('图片大小不能超过5MB');
      }

      // 生成预览
      const base64 = await fileToBase64(file);
      setPreviewImage(base64);
      setImageFile(file);
      
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('处理图片失败:', error);
      alert('处理图片失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const clearImage = () => {
    setPreviewImage(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      {/* 图片预览区域 */}
      {previewImage && (
        <div className="mb-4 relative">
          <div className="relative rounded-lg overflow-hidden border border-gray-300 inline-block max-w-xs">
            <img 
              src={previewImage} 
              alt="预览" 
              className="max-h-48 max-w-full object-contain"
            />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 text-white rounded-full p-1 hover:bg-opacity-100"
              type="button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
        
        <div className="flex-grow relative flex items-center">
          {/* 图片上传按钮 */}
          <button
            type="button"
            onClick={handleImageButtonClick}
            disabled={isGenerating || isUploading}
            className={`absolute left-2 z-10 p-1.5 text-gray-500 rounded-full hover:bg-gray-100 
              ${(isGenerating || isUploading) ? 'opacity-50 cursor-not-allowed' : 'hover:text-gray-700'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={imageFile ? "添加描述..." : "输入消息..."}
            className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
            style={{ 
              height: '46px', 
              minHeight: '46px', 
              lineHeight: '1.5',
              paddingTop: '10px',
              paddingBottom: '10px'
            }}
            rows={1}
            disabled={isGenerating || isUploading}
          />
          
          {/* 上传中指示器 */}
          {isUploading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
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
            disabled={(!message.trim() && !imageFile) || isUploading}
            className={`px-4 py-0 bg-blue-600 text-white rounded-lg font-medium min-w-[90px] h-[46px] ${
              ((!message.trim() && !imageFile) || isUploading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
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