import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

// 创建MySQL连接池
const connection = mysql.createPool({
  host: '124.222.210.238',
  user: 'root',
  password: 'lhw314159',
  database: 'demo',
  port: 3306,
});

// 创建Drizzle ORM实例
export const db = drizzle(connection);

// 数据库连接测试函数
export async function testConnection() {
  try {
    const result = await connection.query('SELECT 1+1');
    console.log('数据库连接成功:', result[0]);
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return false;
  }
} 