<template>
  <div class="loading-screen" :class="{ 'fade-out': fadeOut }">
    <div class="loading-container">
      <div class="loading-logo">
        <div class="logo-circle">
          <div class="logo-inner"></div>
        </div>
      </div>

      <div class="loading-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
      </div>

      <div class="loading-animation">
        <div class="dot dot-1"></div>
        <div class="dot dot-2"></div>
        <div class="dot dot-3"></div>
      </div>
    </div>
    <div class="loading-background"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

import { useTimers } from '@/composables/useTimers';

const props = defineProps<{
  onComplete?: () => void;
}>();

const emit = defineEmits<{
  complete: [];
}>();

const fadeOut = ref(false);
const progress = ref(0);
const animationFrameId = ref<number | null>(null);
const { setTimeout, requestAnimationFrame, cancelAnimationFrame } = useTimers();

// 伪加载进度函数
const updateProgress = (startTime: number): void => {
  const now = Date.now();
  const elapsedTime = now - startTime;
  const progressValue = Math.min(100, (elapsedTime / 2000) * 100); // 2秒内完成进度

  progress.value = progressValue;

  if (progressValue < 100) {
    // 继续更新进度
    animationFrameId.value = requestAnimationFrame(() => updateProgress(startTime));
  } else {
    // 进度达到100%，等待0.5秒后开始淡出
    setTimeout(() => {
      fadeOut.value = true;
      setTimeout(() => {
        emit('complete');
        if (props.onComplete) props.onComplete();
      }, 500); // 500ms是淡出动画的时间
    }, 500); // 等待0.5秒
  }
};

// 初始化加载
onMounted(() => {
  document.body.style.overflow = 'hidden';

  // 延迟0.5秒后开始填充进度条
  setTimeout(() => {
    const startTime = Date.now();
    // 开始伪进度加载
    animationFrameId.value = requestAnimationFrame(() => updateProgress(startTime));
  }, 500); // 延迟0.5秒开始
});

// 清理
onBeforeUnmount(() => {
  document.body.style.overflow = '';
  if (animationFrameId.value !== null) {
    cancelAnimationFrame(animationFrameId.value);
  }
});
</script>

<style scoped>
@reference "@/assets/styles/main.css";

.loading-screen {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
  transition: opacity 500ms;
}

:global(.dark) .loading-screen {
  background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
}

.loading-screen.fade-out {
  opacity: 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 24rem;
  gap: 2rem;
}

/* 加载图标 */
.loading-logo {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
}

.logo-circle {
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  animation: pulse 2s infinite;
}

.logo-inner {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background-color: rgba(59, 130, 246, 0.7);
  position: relative;
  overflow: hidden;
}

.logo-inner::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(transparent, rgba(255, 255, 255, 0.5), transparent 30%);
  animation: rotate 3s linear infinite;
}

/* 进度条 */
.loading-progress {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.progress-bar {
  width: 100%;
  height: 0.5rem;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #3b82f6;
  border-radius: 9999px;
  transition: width 300ms ease-out;
}

/* 加载动画 */
.loading-animation {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background-color: #3b82f6;
}

.dot-1 {
  animation: bounce 1.4s ease infinite 0s;
}

.dot-2 {
  animation: bounce 1.4s ease infinite 0.2s;
}

.dot-3 {
  animation: bounce 1.4s ease infinite 0.4s;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
  }
  70% {
    box-shadow: 0 0 0 1rem rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-0.75rem);
  }
}
</style>
