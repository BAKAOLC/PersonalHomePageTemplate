/**
 * 动画工具函数 - 从CSS读取动画时长避免硬编码魔数
 */

/**
 * 从CSS transition-duration属性获取动画时长（毫秒）
 * @param element - DOM元素
 * @param property - 可选，指定transition属性名
 * @returns 动画时长（毫秒）
 */
export const getTransitionDuration = (element: HTMLElement, property?: string): number => {
  const computedStyle = window.getComputedStyle(element);
  const { transitionDuration } = computedStyle;

  if (!transitionDuration || transitionDuration === '0s') {
    return 0;
  }

  // 处理多个动画时长，如 "0.3s, 0.2s"
  const durations = transitionDuration.split(',').map(d => d.trim());

  if (property) {
    // 如果指定了属性，尝试找到对应的时长
    const properties = computedStyle.transitionProperty?.split(',').map(p => p.trim()) || [];
    const index = properties.indexOf(property);
    if (index >= 0 && index < durations.length) {
      return parseDuration(durations[index]);
    }
  }

  // 取第一个或最长的动画时长
  const maxDuration = durations.reduce((max, current) => {
    const currentMs = parseDuration(current);
    const maxMs = parseDuration(max);
    return currentMs > maxMs ? current : max;
  });

  return parseDuration(maxDuration);
};

/**
 * 从CSS类名获取动画时长
 * @param className - CSS类名
 * @param property - 可选，指定transition属性名
 * @returns 动画时长（毫秒）
 */
export const getTransitionDurationByClass = (className: string, property?: string): number => {
  // 创建临时元素来读取CSS
  const tempElement = document.createElement('div');
  tempElement.className = className;
  tempElement.style.position = 'absolute';
  tempElement.style.visibility = 'hidden';
  tempElement.style.pointerEvents = 'none';

  document.body.appendChild(tempElement);
  const duration = getTransitionDuration(tempElement, property);
  document.body.removeChild(tempElement);

  return duration;
};

/**
 * 解析CSS时长字符串为毫秒数
 * @param duration - CSS时长字符串 (如 "0.3s", "300ms")
 * @returns 毫秒数
 */
const parseDuration = (duration: string): number => {
  const trimmed = duration.trim();

  if (trimmed.endsWith('ms')) {
    return parseFloat(trimmed.slice(0, -2)) || 0;
  }

  if (trimmed.endsWith('s')) {
    return (parseFloat(trimmed.slice(0, -1)) || 0) * 1000;
  }

  return 0;
};

/**
 * 等待元素的transition动画完成
 * @param element - DOM元素
 * @param property - 可选，指定transition属性名
 * @returns Promise
 */
export const waitForTransition = (element: HTMLElement, property?: string): Promise<void> => {
  const duration = getTransitionDuration(element, property);

  if (duration === 0) {
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    const handler = (event: TransitionEvent): void => {
      if (!property || event.propertyName === property) {
        element.removeEventListener('transitionend', handler);
        resolve();
      }
    };

    element.addEventListener('transitionend', handler);

    // 后备超时，防止transitionend事件未触发
    setTimeout(() => {
      element.removeEventListener('transitionend', handler);
      resolve();
    }, duration + 50);
  });
};

/**
 * 预定义的动画时长获取器
 */
export const AnimationDurations = {
  // 获取全屏查看器的过渡动画时长
  getViewerTransition: (): number => {
    return getTransitionDurationByClass('fullscreen-viewer transition-active', 'opacity');
  },

  // 获取信息面板的滑动动画时长
  getInfoPanelTransition: (): number => {
    return getTransitionDurationByClass('slide-fade-enter-active');
  },

  // 获取缩略图滚动动画时长
  getThumbnailScrollTransition: (): number => {
    return getTransitionDurationByClass('image-thumbnails', 'transform');
  },

  // 获取图片淡入淡出时长
  getImageFadeTransition: (): number => {
    return getTransitionDurationByClass('fade-enter-active', 'opacity');
  },

  // 获取ProgressiveImage的各种动画时长
  getProgressiveImageTransitions: () => {
    return {
      // 主图片淡入 (0.3s)
      mainImageFade: getTransitionDurationByClass('progressive-main-image', 'opacity'),
      // 缩略图淡出 (0.2s)
      thumbnailFade: getTransitionDurationByClass('progressive-thumbnail', 'opacity'),
      // 加载器淡入 (0.5s)
      loaderFade: getTransitionDurationByClass('progressive-loader', 'opacity'),
      // 进度条 (0.2s)
      progressBar: getTransitionDurationByClass('progress-bar', 'width'),
    };
  },
};
