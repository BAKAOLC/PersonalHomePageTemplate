import type { Component } from 'vue';

import { useModalStore, type ModalConfig, type ModalInstance, type ModalOptions } from '@/stores/modal';

export type { ModalConfig, ModalInstance, ModalOptions };

interface ModalManagerComposable {
  open: (config: ModalConfig) => string;
  close: (id: string) => void;
  closeAll: () => void;
  getModal: (id: string) => ModalInstance | undefined;
  getVisibleModals: () => ModalInstance[];
  getTopModal: () => ModalInstance | null;
  isModalOpen: (id: string) => boolean;
  openModal: (component: Component, props?: Record<string, any>, options?: ModalOptions) => string;
}

export function useModalManager(): ModalManagerComposable {
  const modalStore = useModalStore();

  const open = (config: ModalConfig): string => {
    return modalStore.open(config);
  };

  const close = (id: string): void => {
    modalStore.close(id);
  };

  const closeAll = (): void => {
    modalStore.closeAll();
  };

  const getModal = (id: string): ModalInstance | undefined => {
    return modalStore.getModal(id);
  };

  const getVisibleModals = (): ModalInstance[] => {
    return modalStore.visibleModals;
  };

  const getTopModal = (): ModalInstance | null => {
    return modalStore.topModal;
  };

  const isModalOpen = (id: string): boolean => {
    return modalStore.isModalOpen(id);
  };

  // 便捷方法
  const openModal = (component: Component, props?: Record<string, any>, options?: ModalOptions): string => {
    const id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return open({
      id,
      component,
      props,
      options,
    });
  };

  return {
    open,
    close,
    closeAll,
    getModal,
    getVisibleModals,
    getTopModal,
    isModalOpen,
    openModal,
  };
}
