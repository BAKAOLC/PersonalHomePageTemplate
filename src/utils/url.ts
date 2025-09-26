/**
 * URL处理工具函数
 */

/**
 * 判断URL是否为外部链接（包含协议的完整URL）
 * @param url - 要检查的URL字符串
 * @returns 如果是外部URL返回true，否则返回false
 */
export const isExternalUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * 将相对路径转换为完整URL（仅用于需要完整URL的场景，如友链信息）
 * @param url - 图片URL路径
 * @param baseUrl - 基础URL（默认为当前域名）
 * @returns 处理后的完整URL
 */
export const toAbsoluteUrl = (url: string, baseUrl?: string): string => {
  if (isExternalUrl(url)) {
    return url;
  }

  const base = baseUrl ?? window.location.origin;
  return `${base}${url}`;
};
