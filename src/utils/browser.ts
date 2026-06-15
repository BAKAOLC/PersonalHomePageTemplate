export const canUseWindow = (): boolean => typeof window !== 'undefined';

export const canUseDocument = (): boolean => typeof document !== 'undefined';

export const getBrowserWindow = (): Window | null => {
  return canUseWindow() ? window : null;
};

export const getBrowserDocument = (): Document | null => {
  return canUseDocument() ? document : null;
};

const getGlobalBrowserWindow = (): (Window & typeof globalThis) | null => {
  return getBrowserWindow() as (Window & typeof globalThis) | null;
};

export const getLocalStorageItem = (key: string): string | null => {
  const browserWindow = getBrowserWindow();
  if (!browserWindow) return null;

  try {
    return browserWindow.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const setLocalStorageItem = (key: string, value: string): void => {
  const browserWindow = getBrowserWindow();
  if (!browserWindow) return;

  try {
    browserWindow.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private browsing or restricted embeds.
  }
};

export const getMediaQuery = (query: string): MediaQueryList | null => {
  const browserWindow = getBrowserWindow();
  if (!browserWindow || typeof browserWindow.matchMedia !== 'function') {
    return null;
  }

  return browserWindow.matchMedia(query);
};

export const getBrowserLanguage = (): string | null => {
  return getBrowserWindow()?.navigator.language ?? null;
};

export const getMediaSession = (): MediaSession | null => {
  const navigator = getBrowserWindow()?.navigator;
  if (!navigator || !('mediaSession' in navigator)) {
    return null;
  }

  return navigator.mediaSession;
};

export const writeClipboardText = async (text: string): Promise<boolean> => {
  const clipboard = getBrowserWindow()?.navigator.clipboard;
  if (!clipboard?.writeText) {
    return false;
  }

  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const writeClipboardTextWithFallback = async (text: string): Promise<boolean> => {
  if (await writeClipboardText(text)) {
    return true;
  }

  const browserDocument = getBrowserDocument();
  if (!browserDocument?.body) {
    return false;
  }

  const textArea = browserDocument.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  browserDocument.body.appendChild(textArea);

  try {
    textArea.select();
    return browserDocument.execCommand('copy');
  } finally {
    browserDocument.body.removeChild(textArea);
  }
};

export const getCurrentOrigin = (): string | null => {
  return getBrowserWindow()?.location.origin ?? null;
};

export const getCurrentSiteBaseUrl = (): string | null => {
  const location = getBrowserWindow()?.location;
  if (!location) return null;

  return `${location.origin}${location.pathname}`;
};

export const getXMLHttpRequestConstructor = (): typeof XMLHttpRequest | null => {
  return getGlobalBrowserWindow()?.XMLHttpRequest ?? null;
};

export const getURLConstructor = (): typeof URL | null => {
  return getGlobalBrowserWindow()?.URL ?? null;
};

export const getMediaMetadataConstructor = (): typeof MediaMetadata | null => {
  return getGlobalBrowserWindow()?.MediaMetadata ?? null;
};

export const getResizeObserverConstructor = (): typeof ResizeObserver | null => {
  return getGlobalBrowserWindow()?.ResizeObserver ?? null;
};

export const getAbortControllerConstructor = (): typeof AbortController | null => {
  return getGlobalBrowserWindow()?.AbortController ?? null;
};

export const scrollWindowToTop = (): void => {
  const browserWindow = getBrowserWindow();
  if (!browserWindow) {
    return;
  }

  browserWindow.scrollTo(0, 0);
};
