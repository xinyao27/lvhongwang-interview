/**
 * 将图片文件转换为base64字符串
 * @param file 图片文件
 * @returns Promise<string> 包含base64编码的Promise
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * 上传图片文件到服务器
 * @param file 要上传的图片文件
 * @returns Promise<string> 包含上传后图片URL的Promise
 */
export const uploadImage = async (file: File): Promise<string> => {
  try {
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      throw new Error('只能上传图片文件');
    }
    
    // 检查文件大小（限制为5MB）
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      throw new Error('图片大小不能超过5MB');
    }
    
    console.log('准备上传图片:', file.name, file.type, file.size);
    
    // 使用FormData上传
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('http://localhost:3030/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    // 读取响应
    const text = await response.text();
    console.log('服务器响应:', text);
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('解析响应JSON失败:', e);
      throw new Error('服务器返回了无效的响应格式');
    }
    
    if (!response.ok) {
      throw new Error(data.error || `上传失败: ${response.status}`);
    }
    
    if (!data.imageUrl) {
      throw new Error('服务器返回的响应中没有图片URL');
    }
    
    console.log('图片上传成功, URL:', data.imageUrl);
    return data.imageUrl;
  } catch (error) {
    console.error('图片上传失败:', error);
    throw new Error(`上传图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

/**
 * 在消息中插入图片的Markdown语法
 * @param imageUrl 图片URL
 * @returns string 图片的Markdown语法
 */
export const createImageMarkdown = (imageUrl: string): string => {
  return `![图片](${imageUrl})`;
}; 