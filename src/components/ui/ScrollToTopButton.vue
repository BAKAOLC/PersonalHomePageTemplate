<template>
  <Transition name="scroll-top-tab">
    <button
      v-if="visible"
      type="button"
      class="scroll-to-top-tab"
      :aria-label="ariaLabel"
      @click="$emit('click')"
    >
      <i class="fas fa-chevron-up scroll-top-icon" aria-hidden="true"></i>
      <span class="scroll-top-text">TOP</span>
    </button>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  ariaLabel?: string;
}>();

defineEmits<{
  (e: 'click'): void;
}>();
</script>

<style scoped>
/*
 * 竖向条带式回到顶部按钮
 * 贴靠视口右侧边缘（滚动条外侧），左侧圆角，形如从右边延伸出来的标签页。
 * 不与页面角落的 Live2D 挂件及其他悬浮按钮重叠。
 */
.scroll-to-top-tab {
  position: fixed;
  right: 0;
  /* 垂直居中偏下，触摸友好区域 */
  top: 55%;
  transform: translateY(-50%);

  /* 宽度较窄但足够点击；高度形成条带感 */
  width: 36px;
  height: 88px;

  /* 左侧圆角，右侧贴边 */
  border-radius: 8px 0 0 8px;

  background: rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.92);

  /* 仅左、上、下边框 */
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-right: none;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;

  cursor: pointer;
  user-select: none;

  /* 较高 z-index 确保可见，但低于导航栏（通常 1000+）  */
  z-index: 50;

  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.15);

  transition:
    transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
    background 0.18s ease,
    box-shadow 0.18s ease;

  /* 默认略微缩进，hover 时滑出 */
  transform: translateY(-50%) translateX(4px);
}

/* 深色模式 */
.dark .scroll-to-top-tab {
  background: rgba(255, 255, 255, 0.10);
  border-color: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.82);
}

.scroll-to-top-tab:hover {
  transform: translateY(-50%) translateX(0);
  background: rgba(0, 0, 0, 0.56);
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.22);
}

.dark .scroll-to-top-tab:hover {
  background: rgba(255, 255, 255, 0.20);
}

.scroll-to-top-tab:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-radius: 8px 0 0 8px;
}

/* 图标：稍大以便移动端点击 */
.scroll-top-icon {
  font-size: 0.875rem;
  line-height: 1;
}

/* 竖排 "TOP" 文字 */
.scroll-top-text {
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  line-height: 1;
  writing-mode: vertical-rl;
  text-orientation: upright;
  /* 垂直方向：字母整立排列 */
  text-transform: uppercase;
  opacity: 0.75;
}

/* ── 进入 / 离开过渡 ──────────────────────────────────────────── */
.scroll-top-tab-enter-active {
  transition: opacity 0.25s ease, transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.scroll-top-tab-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.scroll-top-tab-enter-from {
  opacity: 0;
  transform: translateY(-50%) translateX(36px);
}
.scroll-top-tab-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(36px);
}

/* ── 减少动画偏好 ──────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .scroll-to-top-tab,
  .scroll-top-tab-enter-active,
  .scroll-top-tab-leave-active {
    transition: none !important;
  }
  .scroll-to-top-tab {
    transform: translateY(-50%) !important;
  }
}
</style>
