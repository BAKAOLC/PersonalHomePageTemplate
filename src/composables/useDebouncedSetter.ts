import { ref } from 'vue';

import { useTimers } from '@/composables/useTimers';

export const useDebouncedSetter = <T>(
  applyValue: (value: T) => void,
  delay = 300,
): {
  setDebouncedValue: (value: T) => void;
  setValueImmediately: (value: T) => void;
  cancelPendingValue: () => void;
} => {
  const { setTimeout, clearTimeout } = useTimers();
  const pendingTimeout = ref<number | null>(null);

  const cancelPendingValue = (): void => {
    if (pendingTimeout.value === null) return;

    clearTimeout(pendingTimeout.value);
    pendingTimeout.value = null;
  };

  const setDebouncedValue = (value: T): void => {
    cancelPendingValue();

    pendingTimeout.value = setTimeout(() => {
      applyValue(value);
      pendingTimeout.value = null;
    }, delay);
  };

  const setValueImmediately = (value: T): void => {
    cancelPendingValue();
    applyValue(value);
  };

  return {
    setDebouncedValue,
    setValueImmediately,
    cancelPendingValue,
  };
};
