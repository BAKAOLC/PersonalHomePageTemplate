import { nextTick, onBeforeUnmount, onMounted } from 'vue';

import { getBrowserDocument, getResizeObserverConstructor } from '@/utils/browser';

interface ElementHeightTarget {
  selector: string;
  variable: `--${string}`;
}

const baseHeightTargets: ElementHeightTarget[] = [
  { selector: '.header', variable: '--app-header-height' },
  { selector: '.footer', variable: '--app-footer-height' },
];

export const useDynamicElementHeights = (
  targets: ElementHeightTarget[],
): {
  updateDynamicHeights: () => void;
  updateDynamicHeightsAfterRender: () => void;
} => {
  const heightTargets = [...baseHeightTargets, ...targets];
  const knownHeights = new Map<string, number>();
  let resizeObserver: ResizeObserver | null = null;

  const getTargetElement = ({ selector }: ElementHeightTarget): HTMLElement | null => {
    return getBrowserDocument()?.querySelector<HTMLElement>(selector) ?? null;
  };

  const setElementHeightVariable = (target: ElementHeightTarget): void => {
    const browserDocument = getBrowserDocument();
    if (!browserDocument) return;

    const element = getTargetElement(target);
    if (!element) return;

    const height = element.offsetHeight;
    if (knownHeights.get(target.variable) === height) {
      return;
    }

    knownHeights.set(target.variable, height);
    browserDocument.documentElement.style.setProperty(target.variable, `${height}px`);
  };

  const updateDynamicHeights = (): void => {
    heightTargets.forEach(setElementHeightVariable);
  };

  const updateDynamicHeightsAfterRender = (): void => {
    nextTick(updateDynamicHeights);
  };

  const disconnectResizeObserver = (): void => {
    resizeObserver?.disconnect();
    resizeObserver = null;
  };

  const observeDynamicHeightTargets = (): void => {
    disconnectResizeObserver();

    const ResizeObserverConstructor = getResizeObserverConstructor();
    if (!ResizeObserverConstructor) {
      return;
    }

    resizeObserver = new ResizeObserverConstructor(() => {
      updateDynamicHeights();
    });

    heightTargets.forEach((target) => {
      const element = getTargetElement(target);
      if (element) {
        resizeObserver?.observe(element);
      }
    });
  };

  onMounted(() => {
    updateDynamicHeightsAfterRender();
    nextTick(observeDynamicHeightTargets);
  });

  onBeforeUnmount(() => {
    disconnectResizeObserver();
    knownHeights.clear();
  });

  return {
    updateDynamicHeights,
    updateDynamicHeightsAfterRender,
  };
};
