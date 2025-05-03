import COS from 'cos-nodejs-sdk-v5';
import { cosConfig } from './config';

// 定义COS错误类型
type CosError = Error | null | any;
type PutObjectResult = any;

/**
 * 上传文件到腾讯云COS
 * @param file 要上传的文件
 * @returns 返回上传成功后的文件URL
 */
export const uploadImageToCOS = async (file: File): Promise<string> => {
  try {
    // 创建COS实例
    const cos = new COS({
      SecretId: cosConfig.SecretId,
      SecretKey: cosConfig.SecretKey,
    });

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${cosConfig.Folder}/${timestamp}-${randomStr}-${file.name}`;

    // 将File对象转换为ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传到COS
    return new Promise<string>((resolve, reject) => {
      cos.putObject({
        Bucket: `${cosConfig.Bucket}`,
        Region: cosConfig.Region,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      }, (err: CosError, data: PutObjectResult) => {
        if (err) {
          console.error('上传到腾讯云COS失败:', err);
          reject(new Error(`上传图片失败: ${err.message || '未知错误'}`));
        } else {
          // 构建并返回文件URL
          const fileUrl = `https://${cosConfig.Bucket}.cos.${cosConfig.Region}.myqcloud.com/${fileName}`;
          resolve(fileUrl);
        }
      });
    });
  } catch (error) {
    console.error('上传到腾讯云COS失败:', error);
    throw new Error(`上传图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}; 