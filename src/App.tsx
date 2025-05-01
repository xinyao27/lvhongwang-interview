import React, { useState, useEffect } from 'react'
import './App.css'
import Chat from './components/Chat'
import { ChatSession } from './types'
import { sessionsApi } from './utils/api'
import { v4 as uuidv4 } from 'uuid';

function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 加载会话列表，并处理会话选择
   * 会话选择策略：
   * 1. 优先保持用户当前选择的会话
   * 2. 如果当前没有选择会话，才会选择第一个会话
   * 3. 如果当前选择的会话已被删除，才会切换到其他会话
   * 这样避免了轮询时强制切换到最新会话的问题
   */
  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await sessionsApi.getAll();
      
      // 在更新会话列表前保存当前会话ID，避免轮询更新后丢失选择
      const previousSessionId = currentSession;
      
      setSessions(data);
      
      // 仅在以下情况设置当前会话:
      // 1. 如果没有当前选择的会话，并且有可用会话
      // 2. 如果当前选择的会话不再存在于更新后的会话列表中
      if (data.length > 0) {
        if (!previousSessionId) {
          // 没有选择任何会话时，选择第一个
          setCurrentSession(data[0].id);
        } else if (!data.some(session => session.id === previousSessionId)) {
          // 如果之前选择的会话已被删除，选择新的第一个会话
          setCurrentSession(data[0].id);
        }
        // 其他情况保持当前选择不变，确保轮询不会干扰用户的会话选择
      }
      
      setError(null);
    } catch (err) {
      console.error('加载会话失败:', err);
      setError('无法加载会话列表');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 初次加载会话列表
    loadSessions();
    
    // 定期刷新会话列表，不影响用户当前选择的会话
    // 这允许在保持当前会话的同时，查看其他客户端可能创建的新会话
    const interval = setInterval(loadSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  // 创建新会话
  const createNewSession = async () => {
    try {
      const newSession = await sessionsApi.create();
      setSessions([newSession, ...sessions]);
      // 创建新会话后自动选择它
      setCurrentSession(newSession.id);
    } catch (err) {
      console.error('创建会话失败:', err);
      setError('创建新会话失败');
    }
  };

  // 删除会话
  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm('确定要删除这个会话吗？')) {
      return;
    }
    
    try {
      await sessionsApi.delete(id);
      setSessions(sessions.filter(s => s.id !== id));
      
      // 如果删除的是当前选中的会话，则选择另一个会话
      if (currentSession === id) {
        setCurrentSession(sessions.length > 1 ? 
          sessions.find(s => s.id !== id)?.id || null : 
          null);
      }
    } catch (err) {
      console.error('删除会话失败:', err);
      setError('删除会话失败');
    }
  };

  // 格式化日期显示
  const formatDate = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    
    // 如果是今天的消息
    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 如果是昨天的消息
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return `昨天 ${messageDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // 其他时间显示日期
    return messageDate.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  };

  return (
    <div className="app-container">
      {/* 侧边栏 */}
      <div className="sidebar">
        <div className="flex items-center justify-between mb-4">
          <div className="history-title">聊天记录</div>
          <button 
            onClick={createNewSession}
            className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            新对话
          </button>
        </div>
        
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <svg className="animate-spin h-5 w-5 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            加载中...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">
            {error}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-gray-500 text-sm p-2 text-center">
            暂无聊天记录
            <button 
              onClick={createNewSession}
              className="mt-2 w-full px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
            >
              开始新对话
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
            {sessions.map(session => (
              <div 
                key={session.id}
                className={`history-item relative group ${session.id === currentSession ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
                onClick={() => setCurrentSession(session.id)}
              >
                <div className="pr-6">
                  <div className="font-medium truncate">
                    {session.title || '新对话'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatDate(new Date(session.updatedAt))}
                  </div>
                </div>
                
                <button 
                  onClick={(e) => deleteSession(session.id, e)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 主聊天区域 */}
      <div className="chat-container">
        {currentSession ? (
          <Chat sessionId={currentSession} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">没有选择聊天</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                选择一个现有对话或创建一个新对话开始聊天
              </p>
              <button 
                onClick={createNewSession}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                开始新对话
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
