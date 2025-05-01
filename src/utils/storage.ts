import { ChatSession, Message } from "../types";

// 保存聊天会话到本地存储
export function saveChatSession(session: ChatSession): void {
  try {
    const sessions = getChatSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    
    localStorage.setItem('chatSessions', JSON.stringify(sessions));
  } catch (error) {
    console.error('保存聊天会话失败:', error);
  }
}

// 获取所有聊天会话
export function getChatSessions(): ChatSession[] {
  try {
    const sessions = localStorage.getItem('chatSessions');
    return sessions ? JSON.parse(sessions) : [];
  } catch (error) {
    console.error('获取聊天会话失败:', error);
    return [];
  }
}

// 获取特定的聊天会话
export function getChatSession(id: string): ChatSession | undefined {
  try {
    const sessions = getChatSessions();
    return sessions.find(session => session.id === id);
  } catch (error) {
    console.error('获取特定聊天会话失败:', error);
    return undefined;
  }
}

// 删除聊天会话
export function deleteChatSession(id: string): void {
  try {
    const sessions = getChatSessions();
    const updatedSessions = sessions.filter(session => session.id !== id);
    localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));
  } catch (error) {
    console.error('删除聊天会话失败:', error);
  }
} 