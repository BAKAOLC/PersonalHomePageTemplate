// 缓存统计信息
export interface CacheStats {
  size: number;
  maxSize: number;
  items: Array<{
    url: string;
    loaded: boolean;
    loading: boolean;
    error: boolean;
    progress: number;
  }>;
}
