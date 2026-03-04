import type { I18nText } from './language';

export interface BgmMediaImage {
  src: I18nText;
  sizes?: string;
  type?: string;
}

// BGM配置类型定义
export interface BgmTrack {
  name: I18nText;
  url?: I18nText;
  dualFile?: {
    intro: I18nText; // intro文件URL
    loop: I18nText; // loop文件URL
  };
  artist?: I18nText; // 艺术家名称
  album?: I18nText; // 专辑名称
  artwork?: BgmMediaImage[]; // 封面图片列表
  loop?: {
    start: number; // 循环开始时间（秒）
    end: number; // 循环结束时间（秒）
  };
}

export type PlayMode = 'single-loop' | 'list-order' | 'list-shuffle';

export interface BgmConfig {
  enabled: boolean;
  autoplay: boolean; // 是否根据浏览器记忆自动播放
  volume: number; // 音量 0-1
  tracks: BgmTrack[];
  mode: PlayMode; // 播放模式：single-loop(单曲循环) | list-order(顺序播放) | list-shuffle(列表随机)
}
