import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import apiRoutes from './api/routes';
import { testConnection } from './db/config';
import { createTablesSQL } from './db/schema';
import { db } from './db/config';
import mysql from 'mysql2/promise';

const app = new Hono();

// 启用CORS
app.use('*', cors({
  origin: '*',  // 允许所有来源
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
}));

// 请求日志中间件
app.use('*', async (c, next) => {
  console.log(`${new Date().toISOString()} | ${c.req.method} ${c.req.url}`);
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${new Date().toISOString()} | ${c.req.method} ${c.req.url} - ${c.res.status} - ${ms}ms`);
});

// 健康检查
app.get('/ping', (c) => {
  console.log('健康检查 ping');
  return c.text('pong');
});

// 数据库状态
app.get('/db-status', async (c) => {
  console.log('检查数据库连接状态');
  const isConnected = await testConnection();
  console.log(`数据库连接状态: ${isConnected ? '已连接' : '未连接'}`);
  return c.json({ connected: isConnected });
});

// 初始化数据库
app.get('/init-db', async (c) => {
  console.log('开始初始化数据库...');
  try {
    // 创建数据库连接
    const connection = await mysql.createConnection({
      host: '124.222.210.238',
      user: 'root',
      password: 'lhw314159',
      database: 'demo',
      port: 3306,
    });
    console.log('数据库连接成功');

    // 执行建表SQL
    const statements = createTablesSQL.split(';').filter(stmt => stmt.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        console.log(`执行SQL: ${stmt.trim().substring(0, 50)}...`);
        await connection.execute(stmt + ';');
      }
    }

    await connection.end();
    console.log('数据库初始化完成');
    return c.json({ success: true, message: '数据库初始化成功' });
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return c.json({ success: false, error: String(error) }, { status: 500 });
  }
});

// 全局错误处理
app.onError((err, c) => {
  console.error(`发生错误: ${err.message}`, err.stack);
  return c.json({ error: '服务器内部错误', message: err.message }, { status: 500 });
});

// 挂载API路由
app.route('/api', apiRoutes);

// 启动服务器
const PORT = process.env.PORT || 3030;
console.log(`启动服务器，监听端口 ${PORT}...`);

const server = serve({
  fetch: app.fetch,
  port: Number(PORT)
});

console.log(`服务器已启动，监听 localhost:${PORT}`);
console.log(`API地址: http://localhost:${PORT}/api`);
console.log(`健康检查: http://localhost:${PORT}/ping`);
console.log(`数据库状态: http://localhost:${PORT}/db-status`);

// 导出Hono应用实例，用于测试或其他用途
export default app; 