import OpenAI from "openai";
import { Message, MessageContent } from "../types";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: "sk-9721a61d9f0644c7b4e8c9f7ba78a88d",
  dangerouslyAllowBrowser: true,
});

export async function generateChatResponse(messages: Message[]) {
  // 根据Deepseek API要求格式化消息
  const formattedMessages = messages.map((message) => {
    // 对于字符串内容，保持简单格式
    if (typeof message.content === "string") {
      return {
        role: message.role,
        content: message.content,
      };
    }
    // 对于带图片的消息，需要进行特殊处理
    else if (Array.isArray(message.content)) {
      // 提取所有文本部分并合并
      const textParts = message.content
        .filter((part) => part.type === "text" && part.text)
        .map((part) => (part as any).text)
        .join("\n");

      // 提取所有图片URL并合并成文本描述
      const imageParts = message.content
        .filter((part) => part.type === "image_url" && part.image_url?.url)
        .map((part) => `[图片URL: ${(part as any).image_url.url}]`)
        .join("\n");

      // 组合成一个文本消息
      const combinedContent = [textParts, imageParts]
        .filter(Boolean)
        .join("\n\n");

      // 由于Deepseek API可能不支持图片消息格式，我们将其转换为纯文本
      return {
        role: message.role,
        content: combinedContent,
      };
    }

    // 默认情况下返回空字符串
    return {
      role: message.role,
      content: "",
    };
  });

  console.log("发送到AI的消息格式:", JSON.stringify(formattedMessages));

  const stream = await openai.chat.completions.create({
    messages: formattedMessages,
    model: "deepseek-chat",
    stream: true,
  });
  console.log("AI返回的消息:", stream, typeof stream);

  return stream;
}

export async function getFunctionResponse(functionName: string, args: any) {
  switch (functionName) {
    case "getCurrentTime":
      return {
        result: new Date().toLocaleString(),
      };
    default:
      return {
        error: `Function ${functionName} not found`,
      };
  }
}
