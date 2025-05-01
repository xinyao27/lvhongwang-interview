import { Message } from '../types';
import { getFunctionResponse } from '../utils/ai';

// 检查消息是否包含函数调用命令
function checkForFunctionCall(content: string): { 
  hasFunctionCall: boolean; 
  functionName?: string; 
  args?: any;
} {
  // 简单的函数调用格式: @function(arg1, arg2, ...)
  const functionCallRegex = /@([a-zA-Z0-9_]+)\((.*)\)/;
  const match = content.match(functionCallRegex);
  
  if (match) {
    const functionName = match[1];
    const argsStr = match[2];
    let args = {};
    
    try {
      // 尝试解析参数 (简化的实现)
      if (argsStr) {
        args = JSON.parse(`{${argsStr}}`);
      }
    } catch (e) {
      console.error('解析函数参数时出错:', e);
    }
    
    return {
      hasFunctionCall: true,
      functionName,
      args
    };
  }
  
  return { hasFunctionCall: false };
}

// 处理智能体请求
export async function handleAgentRequest(
  messages: Message[]
): Promise<{ content: string; functionCall?: any }> {
  // 获取最后一条消息
  const lastMessage = messages[messages.length - 1];
  
  if (!lastMessage) {
    return { content: '没有提供消息' };
  }
  
  // 检查是否包含函数调用
  const { hasFunctionCall, functionName, args } = checkForFunctionCall(lastMessage.content);
  
  if (hasFunctionCall && functionName) {
    try {
      const functionResponse = await getFunctionResponse(functionName, args);
      return {
        content: `函数 ${functionName} 的结果: ${JSON.stringify(functionResponse)}`,
        functionCall: {
          name: functionName,
          args,
          result: functionResponse
        }
      };
    } catch (error) {
      return {
        content: `执行函数 ${functionName} 时出错: ${error}`
      };
    }
  }
  
  // 如果不是函数调用，则通过AI生成回复
  return {
    content: '您好，我是聊天助手，有什么我可以帮助您的？'
  };
} 