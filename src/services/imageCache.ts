// 图片缓存服务

import { getTimerService } from '@/services/timerService';
import type { CacheStats } from '@/types';

// LoadPriority 枚举
enum LoadPriority {
  OTHER_IMAGE = 1, // 当前不在看的所有图片（最低优先级）
  OTHER_THUMBNAIL = 2, // 其他所有缩略图
  CURRENT_IMAGE = 3, // 当前正在看的图片本身
  CURRENT_THUMBNAIL = 4, // 当前正在看的图片的缩略图（最高优先级）
}

interface CachedImage {
  url: string;
  objectUrl: string;
  loaded: boolean;
  loading: boolean;
  error: boolean;
  loadingProgress: number;
  priority: LoadPriority;
  isThumbnail: boolean; // 是否是缩略图
  xhr?: XMLHttpRequest;
  loadPromise?: Promise<string>;
}

class ImageCacheService {
  private cache = new Map<string, CachedImage>();
  private maxCacheSize = 50; // 最大缓存数量
  private accessOrder: string[] = []; // 访问顺序，用于LRU清理
  private pausedRequests = new Set<string>(); // 暂停的请求
  private currentImageSrc: string | null = null; // 当前正在查看的图片
  private currentThumbnailSrc: string | null = null; // 当前正在查看的图片的缩略图

  // 设置当前查看的图片
  setCurrentImage(imageSrc: string, thumbnailSrc?: string): void {
    const oldImageSrc = this.currentImageSrc;
    const oldThumbnailSrc = this.currentThumbnailSrc;

    this.currentImageSrc = imageSrc;
    this.currentThumbnailSrc = thumbnailSrc ?? null;

    // 重新评估所有图片的优先级
    this.reevaluateAllPriorities();

    // 如果当前图片改变了，暂停低优先级请求并优先加载当前图片
    if (oldImageSrc !== imageSrc || oldThumbnailSrc !== thumbnailSrc) {
      this.pauseLowPriorityRequests();

      // 立即开始加载当前图片的缩略图（如果有）
      if (thumbnailSrc) {
        this.loadImage(thumbnailSrc, LoadPriority.CURRENT_THUMBNAIL, undefined, true).catch(() => {
          // 忽略缩略图加载错误
        });
      }

      // 然后加载当前图片本身
      this.loadImage(imageSrc, LoadPriority.CURRENT_IMAGE, undefined, false).catch(() => {
        // 忽略图片加载错误
      });
    }
  }

  // 重新评估所有图片的优先级
  private reevaluateAllPriorities(): void {
    for (const [url, cached] of this.cache) {
      const newPriority = this.calculatePriority(url, cached.isThumbnail);
      if (cached.priority !== newPriority) {
        cached.priority = newPriority;
      }
    }
  }

  // 计算图片的优先级
  private calculatePriority(url: string, isThumbnail: boolean): LoadPriority {
    if (isThumbnail && url === this.currentThumbnailSrc) {
      return LoadPriority.CURRENT_THUMBNAIL;
    }
    if (!isThumbnail && url === this.currentImageSrc) {
      return LoadPriority.CURRENT_IMAGE;
    }
    if (isThumbnail) {
      return LoadPriority.OTHER_THUMBNAIL;
    }
    return LoadPriority.OTHER_IMAGE;
  }

  // 获取缓存的图片
  getCachedImage(url: string): CachedImage | null {
    const cached = this.cache.get(url);
    if (cached) {
      // 更新访问顺序
      this.updateAccessOrder(url);
      return cached;
    }
    return null;
  }

  // 开始加载图片
  loadImage(
    url: string,
    priority?: LoadPriority,
    onProgress?: (progress: number) => void,
    isThumbnail: boolean = false,
  ): Promise<string> {
    // 如果没有指定优先级，根据当前状态自动计算
    priority ??= this.calculatePriority(url, isThumbnail);

    let cached = this.getCachedImage(url);

    if (cached) {
      // 更新缩略图标记
      cached.isThumbnail = isThumbnail;

      // 重新计算优先级
      const newPriority = this.calculatePriority(url, isThumbnail);
      if (newPriority > cached.priority) {
        cached.priority = newPriority;
      }

      // 如果已经加载完成，直接返回
      if (cached.loaded && !cached.error) {
        return Promise.resolve(cached.objectUrl);
      }

      // 如果正在加载，返回现有的Promise
      if (cached.loading && cached.loadPromise) {
        // 如果有新的进度回调，添加到现有的xhr中
        if (onProgress && cached.xhr) {
          const originalOnProgress = cached.xhr.onprogress;
          cached.xhr.onprogress = (event) => {
            if (originalOnProgress && cached?.xhr) {
              originalOnProgress.call(cached.xhr, event);
            }
            if (event.lengthComputable && cached) {
              const progress = (event.loaded / event.total) * 100;
              cached.loadingProgress = progress;
              onProgress(progress);
            }
          };
        }
        return cached.loadPromise;
      }

      // 如果之前加载失败，重新加载
      if (cached.error) {
        this.clearCachedImage(url);
        cached = null;
      }
    }

    // 如果是高优先级请求（当前图片或当前缩略图），暂停低优先级请求
    if (priority >= LoadPriority.CURRENT_IMAGE) {
      this.pauseLowPriorityRequests();
    }

    // 创建新的缓存项
    if (!cached) {
      cached = {
        url,
        objectUrl: '',
        loaded: false,
        loading: true,
        error: false,
        loadingProgress: 0,
        priority,
        isThumbnail,
      };
      this.cache.set(url, cached);
      this.updateAccessOrder(url);
    }

    // 开始加载
    cached.loading = true;
    cached.error = false;
    cached.loadingProgress = 0;
    cached.priority = priority;
    cached.isThumbnail = isThumbnail;

    const loadPromise = new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      cached.xhr = xhr;

      xhr.open('GET', url, true);
      xhr.responseType = 'blob';

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          cached.loadingProgress = progress;
          if (onProgress) {
            onProgress(progress);
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          cached.loadingProgress = 100;
          const blob = xhr.response;
          const objectUrl = URL.createObjectURL(blob);
          cached.objectUrl = objectUrl;
          cached.loaded = true;
          cached.loading = false;

          // 如果是高优先级图片加载完成，恢复被暂停的低优先级请求
          if (cached.priority >= LoadPriority.CURRENT_IMAGE) {
            getTimerService().setTimeout(() => {
              this.resumePausedRequests();
            }, 100); // 稍微延迟以确保当前图片开始显示
          }

          resolve(objectUrl);
        } else {
          cached.error = true;
          cached.loading = false;
          reject(new Error(`HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        cached.error = true;
        cached.loading = false;
        reject(new Error('Network error'));
      };

      xhr.onabort = () => {
        cached.loading = false;
        reject(new Error('Request aborted'));
      };

      xhr.send();
    });

    cached.loadPromise = loadPromise;

    // 清理缓存如果超过限制
    this.cleanupCache();

    return loadPromise;
  }

  // 取消加载
  cancelLoad(url: string): void {
    const cached = this.cache.get(url);
    if (cached?.xhr && cached.loading) {
      cached.xhr.abort();
      cached.loading = false;
    }
  }

  // 暂停低优先级的请求
  pauseLowPriorityRequests(): void {
    for (const [url, cached] of this.cache) {
      if (cached.loading && cached.priority < LoadPriority.CURRENT_IMAGE && cached.xhr) {
        cached.xhr.abort();
        cached.loading = false;
        this.pausedRequests.add(url);
      }
    }
  }

  // 恢复被暂停的请求
  resumePausedRequests(): void {
    const pausedUrls = Array.from(this.pausedRequests);
    this.pausedRequests.clear();

    pausedUrls.forEach(url => {
      const cached = this.cache.get(url);
      if (cached && !cached.loaded && !cached.error) {
        // 重新开始加载，使用适当的优先级
        const priority = this.calculatePriority(url, cached.isThumbnail);
        this.loadImage(url, priority, undefined, cached.isThumbnail).catch(() => {
          // 预加载失败不影响主要功能
        });
      }
    });
  }

  // 清理指定图片的缓存
  clearCachedImage(url: string): void {
    const cached = this.cache.get(url);
    if (cached) {
      if (cached.xhr) {
        if (cached.loading) {
          cached.xhr.abort();
        }
        // 完全清理XMLHttpRequest对象的所有回调引用
        cached.xhr.onload = null;
        cached.xhr.onerror = null;
        cached.xhr.onprogress = null;
        cached.xhr.onabort = null;
        cached.xhr = undefined;
      }
      if (cached.objectUrl) {
        URL.revokeObjectURL(cached.objectUrl);
      }
      this.cache.delete(url);
      const index = this.accessOrder.indexOf(url);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
  }

  // 更新访问顺序
  private updateAccessOrder(url: string): void {
    const index = this.accessOrder.indexOf(url);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(url);
  }

  // 清理缓存（LRU策略）
  private cleanupCache(): void {
    while (this.cache.size > this.maxCacheSize && this.accessOrder.length > 0) {
      const oldestUrl = this.accessOrder.shift();
      if (oldestUrl) {
        this.clearCachedImage(oldestUrl);
      }
    }
  }

  // 预加载图片
  preloadImage(
    url: string,
    priority: LoadPriority = LoadPriority.OTHER_IMAGE,
    isThumbnail: boolean = false,
  ): Promise<string> {
    return this.loadImage(url, priority, undefined, isThumbnail);
  }

  // 批量预加载
  preloadImages(
    urls: string[],
    priority: LoadPriority = LoadPriority.OTHER_IMAGE,
    isThumbnail: boolean = false,
  ): Promise<string[]> {
    return Promise.all(urls.map(url => this.preloadImage(url, priority, isThumbnail)));
  }

  // 清理所有缓存
  clearAllCache(): void {
    // 使用数组副本避免在迭代过程中修改Map
    const urlsToClean = Array.from(this.cache.keys());
    urlsToClean.forEach(url => {
      this.clearCachedImage(url);
    });
  }

  // 获取缓存统计信息
  getCacheStats(): CacheStats {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      items: Array.from(this.cache.entries()).map(([url, cached]) => ({
        url,
        loaded: cached.loaded,
        loading: cached.loading,
        error: cached.error,
        progress: cached.loadingProgress,
      })),
    };
  }
}

// 创建全局单例
const imageCache = new ImageCacheService();

// 获取实例
export const getImageCache = (): ImageCacheService => {
  return imageCache;
};

// 导出类型和枚举
export { LoadPriority };
export type { CachedImage };
