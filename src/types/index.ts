export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | MessageContent[];
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  title?: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
} 