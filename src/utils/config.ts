import dotenv from 'dotenv';
import path from 'path';

// 加载.env文件
dotenv.config();

// 腾讯云COS配置
export const cosConfig = {
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY,
  Region: process.env.COS_REGION || 'ap-shanghai',
  Bucket: process.env.COS_BUCKET || 'stone-1317531803',
  AppId: process.env.COS_APP_ID || '1317531803',
  Folder: process.env.COS_FOLDER || 'chatai'
}; 