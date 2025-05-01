# 简易聊天组件

这是一个基于React和TypeScript的简易聊天组件，支持与AI助手对话，并具有以下功能：

## 功能特点

- 用户可以在文本区域中输入消息并发送
- 聊天历史记录会被显示在聊天容器中
- 支持AI回复的流式输出
- 聊天数据会被持久化存储在本地
- 支持中断正在生成的回复
- 支持Markdown渲染
- 支持函数调用功能（如获取当前时间）

## 技术栈

- React + TypeScript
- Vite
- Tailwind CSS
- OpenAI API (Deepseek)
- UUID
- React Markdown

## 开始使用

1. 安装依赖：

```bash
npm install
```

2. 启动开发服务器：

```bash
npm run dev
```

3. 构建生产版本：

```bash
npm run build
```

## 项目结构

- `src/components/` - 聊天相关组件
- `src/utils/` - 工具函数和API服务
- `src/types/` - TypeScript类型定义
- `src/api/` - API请求处理
- `src/server/` - 服务器端处理

## 功能使用说明

- **发送消息**：在输入框中输入消息，然后点击"发送"按钮或按回车键发送
- **停止生成**：在AI回复生成过程中，可以点击"停止"按钮中断生成
- **函数调用**：可以使用特殊格式调用函数，例如 `@getCurrentTime()`
