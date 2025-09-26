/* eslint-disable no-restricted-syntax */
// 定时器管理服务 - 使用原生 window 监听器

interface TimerManager {
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (id: number) => void;
  setInterval: (callback: () => void, delay: number) => number;
  clearInterval: (id: number) => void;
  requestAnimationFrame: (callback: (time: number) => void) => number;
  cancelAnimationFrame: (id: number) => void;
  clearAll: () => void;
  getActiveTimersCount: () => number;
}

class TimerService implements TimerManager {
  private timeouts = new Set<number>();
  private intervals = new Set<number>();
  private animationFrames = new Set<number>();
  private isDestroyed = false;

  constructor() {
    // 页面卸载时清理所有定时器
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.clearAll.bind(this));
    }
  }

  // 检查是否已销毁
  private checkDestroyed(): void {
    if (this.isDestroyed) {
      throw new Error('TimerService has been destroyed.');
    }
  }

  setTimeout(callback: () => void, delay: number): number {
    this.checkDestroyed();

    const id = window.setTimeout(() => {
      this.timeouts.delete(id);
      callback();
    }, delay);

    this.timeouts.add(id);
    return id;
  }

  clearTimeout(id: number): void {
    this.checkDestroyed();

    window.clearTimeout(id);
    this.timeouts.delete(id);
  }

  setInterval(callback: () => void, delay: number): number {
    this.checkDestroyed();

    const id = window.setInterval(callback, delay);
    this.intervals.add(id);
    return id;
  }

  clearInterval(id: number): void {
    this.checkDestroyed();

    window.clearInterval(id);
    this.intervals.delete(id);
  }

  requestAnimationFrame(callback: (time: number) => void): number {
    this.checkDestroyed();

    const id = window.requestAnimationFrame((time: number) => {
      this.animationFrames.delete(id);
      callback(time);
    });

    this.animationFrames.add(id);
    return id;
  }

  cancelAnimationFrame(id: number): void {
    this.checkDestroyed();

    window.cancelAnimationFrame(id);
    this.animationFrames.delete(id);
  }

  clearAll(): void {
    this.checkDestroyed();

    // 清理所有定时器
    this.timeouts.forEach(id => {
      window.clearTimeout(id);
    });
    this.timeouts.clear();

    this.intervals.forEach(id => {
      window.clearInterval(id);
    });
    this.intervals.clear();

    this.animationFrames.forEach(id => {
      window.cancelAnimationFrame(id);
    });
    this.animationFrames.clear();
  }

  getActiveTimersCount(): number {
    this.checkDestroyed();
    return this.timeouts.size + this.intervals.size + this.animationFrames.size;
  }

  // 销毁服务
  destroy(): void {
    this.clearAll();
    this.isDestroyed = true;
  }
}

// 创建全局单例
const timerService = new TimerService();

// 获取实例
export const getTimerService = (): TimerService => {
  return timerService;
};

// 导出类型
export type { TimerManager };
