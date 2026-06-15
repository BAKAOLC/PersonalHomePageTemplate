import { getBrowserDocument } from '@/utils/browser';

const activeLocks = new Set<string>();
let previousBodyOverflow: string | null = null;

export const lockBodyScroll = (lockId: string): void => {
  const body = getBrowserDocument()?.body;
  if (!body) return;

  if (activeLocks.size === 0) {
    previousBodyOverflow = body.style.overflow;
  }

  activeLocks.add(lockId);
  body.style.overflow = 'hidden';
};

export const unlockBodyScroll = (lockId: string): void => {
  const body = getBrowserDocument()?.body;
  if (!body) return;

  activeLocks.delete(lockId);

  if (activeLocks.size === 0 && previousBodyOverflow !== null) {
    body.style.overflow = previousBodyOverflow;
    previousBodyOverflow = null;
  }
};
