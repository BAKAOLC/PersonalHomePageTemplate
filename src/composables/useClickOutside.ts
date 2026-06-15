import { onMounted, type Ref } from 'vue';

import { useEventManager } from '@/composables/useEventManager';
import { getBrowserDocument } from '@/utils/browser';

interface UseClickOutsideOptions {
  targets: Ref<HTMLElement | null>[];
  enabled?: () => boolean;
  onClickOutside: (event: MouseEvent) => void;
}

export const useClickOutside = ({
  targets,
  enabled,
  onClickOutside,
}: UseClickOutsideOptions): void => {
  const { addEventListener } = useEventManager();

  const handleDocumentClick = (event: MouseEvent): void => {
    if (enabled && !enabled()) return;
    if (!(event.target instanceof Node)) return;

    const clickedInside = targets.some(target => target.value?.contains(event.target as Node));
    if (!clickedInside) {
      onClickOutside(event);
    }
  };

  onMounted(() => {
    const browserDocument = getBrowserDocument();
    if (!browserDocument) return;

    addEventListener('click', handleDocumentClick, undefined, browserDocument);
  });
};
