import OpenAI from "openai";
import { Message } from "../types";

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: 'sk-9721a61d9f0644c7b4e8c9f7ba78a88d',
  dangerouslyAllowBrowser: true
});

export async function generateStreamResponse(messages: Message[]) {
  const formattedMessages = messages.map(message => ({
    role: message.role,
    content: message.content
  }));

  const stream = await openai.chat.completions.create({
    messages: formattedMessages,
    model: "deepseek-chat",
    stream: true,
  });

  return stream;
}

export async function generateCompletion(messages: Message[]) {
  const formattedMessages = messages.map(message => ({
    role: message.role,
    content: message.content
  }));

  const completion = await openai.chat.completions.create({
    messages: formattedMessages,
    model: "deepseek-chat",
    stream: false,
  });

  return completion.choices[0].message.content;
} 