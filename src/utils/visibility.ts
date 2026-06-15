export interface VisibilityConfig {
  hidden?: boolean;
}

export const isVisible = <T extends VisibilityConfig>(item: T | null | undefined): item is T => {
  return !!item && item.hidden !== true;
};

export const filterVisible = <T extends VisibilityConfig>(items: readonly T[]): T[] => {
  return items.filter(isVisible);
};
