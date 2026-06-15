import { ref, type Ref } from 'vue';

interface ScrollToTopController {
  showScrollToTop: Ref<boolean>;
  handleScroll: () => void;
  scrollToTop: () => void;
}

export const useScrollToTop = <T extends HTMLElement>(
  scrollContainer: Ref<T | null>,
  threshold = 200,
): ScrollToTopController => {
  const showScrollToTop = ref(false);

  const handleScroll = (): void => {
    const container = scrollContainer.value;
    if (!container) return;

    showScrollToTop.value = container.scrollTop > threshold;
  };

  const scrollToTop = (): void => {
    scrollContainer.value?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return {
    showScrollToTop,
    handleScroll,
    scrollToTop,
  };
};
