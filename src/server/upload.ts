import { IncomingMessage, ServerResponse } from 'http';
import formidable from 'formidable';
import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { cosConfig } from '../utils/config';

// 创建COS实例
const cos = new COS({
  SecretId: cosConfig.SecretId,
  SecretKey: cosConfig.SecretKey,
});

/**
 * 处理图片上传请求
 */
export const handleImageUpload = async (req: IncomingMessage, res: ServerResponse) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  
  // 只允许POST请求
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: '方法不允许' }));
    return;
  }
  
  try {
    // 使用formidable解析multipart/form-data
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB
      maxTotalFileSize: 5 * 1024 * 1024,
      keepExtensions: true,
      filter: part => {
        // 只允许上传图片文件
        return part.name === 'image' && part.mimetype?.startsWith('image/') || false;
      }
    });
    
    // 解析请求体
    const [fields, files] = await new Promise<[formidable.Fields<string>, formidable.Files<string>]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('解析表单数据失败:', err);
          reject(err);
          return;
        }
        resolve([fields, files]);
      });
    });
    
    // 获取上传的图片文件
    const imageFile = files.image?.[0];
    
    if (!imageFile) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: '未找到有效的图片文件' }));
      return;
    }
    
    const filePath = imageFile.filepath;
    const fileType = imageFile.mimetype || 'image/jpeg';
    const originalName = imageFile.originalFilename || 'image.jpg';
    
    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${cosConfig.Folder}/${timestamp}-${randomStr}-${originalName}`;
    
    // 上传到腾讯云COS
    cos.putObject({
      Bucket: `${cosConfig.Bucket}-${cosConfig.AppId}`,
      Region: cosConfig.Region,
      Key: fileName,
      Body: fs.createReadStream(filePath),
      ContentType: fileType,
    }, (err, data) => {
      // 删除临时文件
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('删除临时文件失败:', e);
      }
      
      if (err) {
        console.error('上传到腾讯云COS失败:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: '上传图片失败' }));
      } else {
        // 构建文件URL并返回
        const imageUrl = `https://${cosConfig.Bucket}-${cosConfig.AppId}.cos.${cosConfig.Region}.myqcloud.com/${fileName}`;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ 
          success: true, 
          imageUrl 
        }));
      }
    });
  } catch (error) {
    console.error('处理图片上传请求失败:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: '图片上传失败' }));
  }
}; 