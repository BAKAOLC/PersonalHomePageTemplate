import { onBeforeUnmount, ref, type Ref } from 'vue';

import { lockBodyScroll, unlockBodyScroll } from '@/utils/bodyScrollLock';

interface MobileFilterOverlayController {
  isOpen: Ref<boolean>;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useMobileFilterOverlay = (scrollLockId: string): MobileFilterOverlayController => {
  const isOpen = ref(false);

  const open = (): void => {
    isOpen.value = true;
    lockBodyScroll(scrollLockId);
  };

  const close = (): void => {
    isOpen.value = false;
    unlockBodyScroll(scrollLockId);
  };

  const toggle = (): void => {
    if (isOpen.value) {
      close();
    } else {
      open();
    }
  };

  onBeforeUnmount(() => {
    unlockBodyScroll(scrollLockId);
  });

  return {
    isOpen,
    open,
    close,
    toggle,
  };
};
