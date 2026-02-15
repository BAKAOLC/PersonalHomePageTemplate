declare module '@zumer/snapdom' {
  export interface SnapOptions {
    type?: 'png' | 'jpeg' | 'webp' | 'svg';
    quality?: number;
    scale?: number;
    backgroundColor?: string;
    width?: number;
    height?: number;
    embedFonts?: boolean;
    fast?: boolean;
  }

  export interface SnapResult {
    url: string;
    toRaw(): string;
    toImg(): Promise<HTMLImageElement>;
    toSvg(): Promise<HTMLImageElement>;
    toCanvas(): Promise<HTMLCanvasElement>;
    toBlob(options?: { type?: 'svg' | 'png' | 'jpeg' | 'jpg' | 'webp'; quality?: number }): Promise<Blob>;
    toPng(options?: SnapOptions): Promise<HTMLImageElement>;
    toJpg(options?: SnapOptions): Promise<HTMLImageElement>;
    toWebp(options?: SnapOptions): Promise<HTMLImageElement>;
    download(options?: { format?: 'png' | 'jpeg' | 'jpg' | 'webp' | 'svg'; filename?: string; quality?: number }): Promise<void>;
  }

  export function snapdom(element: HTMLElement, options?: SnapOptions): Promise<SnapResult>;

  export namespace snapdom {
    function toImg(element: HTMLElement, options?: SnapOptions): Promise<HTMLImageElement>;
    function toSvg(element: HTMLElement, options?: SnapOptions): Promise<HTMLImageElement>;
    function toCanvas(element: HTMLElement, options?: SnapOptions): Promise<HTMLCanvasElement>;
    function toBlob(element: HTMLElement, options?: { type?: 'svg' | 'png' | 'jpeg' | 'jpg' | 'webp'; quality?: number }): Promise<Blob>;
    function toPng(element: HTMLElement, options?: SnapOptions): Promise<HTMLImageElement>;
    function toJpg(element: HTMLElement, options?: SnapOptions): Promise<HTMLImageElement>;
    function toWebp(element: HTMLElement, options?: SnapOptions): Promise<HTMLImageElement>;
    function download(element: HTMLElement, options?: { format?: 'png' | 'jpeg' | 'jpg' | 'webp' | 'svg'; filename?: string; quality?: number }): Promise<void>;
  }
}
