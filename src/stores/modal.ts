import { defineStore } from 'pinia';
import { computed, markRaw, nextTick, ref, type Component } from 'vue';

import { useTimers } from '@/composables/useTimers';

export interface ModalOptions {
  closable?: boolean; // 是否可关闭
  maskClosable?: boolean; // 点击遮罩是否关闭
  escClosable?: boolean; // 按ESC是否关闭
  destroyOnClose?: boolean; // 关闭时是否销毁
  zIndex?: number; // 自定义层级
  className?: string; // 自定义样式类
  width?: string | number; // 宽度
  height?: string | number; // 高度
  fullscreen?: boolean; // 是否全屏
  centered?: boolean; // 是否居中
}

export interface ModalConfig {
  id: string;
  component: Component;
  props?: Record<string, any>;
  options?: ModalOptions;
  onClose?: () => void;
  onDestroy?: () => void;
  onNavigate?: (...args: any[]) => void;
}

export interface ModalInstance extends ModalConfig {
  visible: boolean;
  zIndex: number;
  parentId?: string; // 父弹窗ID，用于层级管理
  children: Set<string>; // 子弹窗ID集合
  createdAt: number; // 创建时间戳
}

export const useModalStore = defineStore('modal', () => {
  const modals = ref<Map<string, ModalInstance>>(new Map());
  const baseZIndex = ref(2000);
  const currentZIndex = ref(2000);
  const activeModalStack = ref<string[]>([]); // 活跃弹窗栈
  const { setTimeout } = useTimers();

  // 获取可见弹窗
  const visibleModals = computed(() => {
    return Array.from(modals.value.values())
      .filter(modal => modal.visible)
      .sort((a, b) => a.zIndex - b.zIndex);
  });

  // 获取顶层弹窗
  const topModal = computed(() => {
    const visible = visibleModals.value;
    return visible.length > 0 ? visible[visible.length - 1] : null;
  });

  // 打开弹窗
  const open = (config: ModalConfig): string => {
    const modal: ModalInstance = {
      ...config,
      component: markRaw(config.component), // 使用markRaw避免组件被响应式化
      visible: true,
      zIndex: ++currentZIndex.value,
      children: new Set(),
      createdAt: Date.now(),
      options: {
        closable: true,
        maskClosable: true,
        escClosable: true,
        destroyOnClose: false,
        centered: true,
        ...config.options,
      },
    };

    // 如果有活跃的弹窗，建立父子关系
    if (activeModalStack.value.length > 0) {
      const parentId = activeModalStack.value[activeModalStack.value.length - 1];
      const parentModal = modals.value.get(parentId);
      if (parentModal) {
        modal.parentId = parentId;
        parentModal.children.add(config.id);
      }
    }

    modals.value.set(config.id, modal);
    activeModalStack.value.push(config.id);

    // 阻止背景滚动
    updateBodyOverflow();

    return config.id;
  };

  // 关闭弹窗
  const close = (id: string): void => {
    const modal = modals.value.get(id);
    if (!modal?.visible) return;

    // 先关闭所有子弹窗
    const childrenToClose = Array.from(modal.children);
    childrenToClose.forEach(childId => {
      close(childId);
    });

    // 设置为不可见
    modal.visible = false;

    // 从活跃栈中移除
    const stackIndex = activeModalStack.value.indexOf(id);
    if (stackIndex !== -1) {
      activeModalStack.value.splice(stackIndex, 1);
    }

    // 从父弹窗的子集合中移除
    if (modal.parentId) {
      const parentModal = modals.value.get(modal.parentId);
      if (parentModal) {
        parentModal.children.delete(id);
      }
    }

    // 调用关闭回调
    if (modal.onClose) {
      modal.onClose();
    }

    // 延迟销毁，等待动画完成
    setTimeout(() => {
      if (modal.options?.destroyOnClose !== false) {
        modals.value.delete(id);

        // 调用销毁回调
        if (modal.onDestroy) {
          modal.onDestroy();
        }
      }

      // 更新body滚动状态
      updateBodyOverflow();
    }, 300);
  };

  // 关闭所有弹窗
  const closeAll = (): void => {
    const modalIds = Array.from(modals.value.keys());
    modalIds.forEach(id => {
      close(id);
    });
  };

  // 获取指定弹窗
  const getModal = (id: string): ModalInstance | undefined => {
    return modals.value.get(id);
  };

  // 检查弹窗是否打开
  const isModalOpen = (id: string): boolean => {
    const modal = modals.value.get(id);
    return modal ? modal.visible : false;
  };

  // 更新body滚动状态
  const updateBodyOverflow = (): void => {
    nextTick(() => {
      const hasVisibleModals = visibleModals.value.length > 0;
      if (typeof document !== 'undefined') {
        document.body.style.overflow = hasVisibleModals ? 'hidden' : '';
      }
    });
  };

  // 设置基础z-index
  const setBaseZIndex = (zIndex: number): void => {
    baseZIndex.value = zIndex;
    currentZIndex.value = zIndex;
  };

  return {
    modals,
    visibleModals,
    topModal,
    activeModalStack,
    open,
    close,
    closeAll,
    getModal,
    isModalOpen,
    setBaseZIndex,
  };
});
