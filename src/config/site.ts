// 导入JSON5配置文件（支持注释）
import appConfig from './app.json5';
import charactersConfig from './characters.json5';
import featuresConfig from './features.json5';
import fontawesomeConfig from './fontawesome.json5';
import giscusConfig from './giscus.json5';
import imagesConfig from './images.json5';
import live2dConfig from './live2d.json5';
import personalConfig from './personal.json5';
import tagsConfig from './tags.json5';

import type { AppConfig, Character, FeaturesConfig, FontAwesomeConfig, GiscusConfig, GroupImage, ImageTag, PersonalInfo, SiteConfig } from '@/types';
import type { Live2DWidgetConfig } from '@/types/live2d';

export const siteConfig: SiteConfig = {
  app: appConfig as AppConfig,
  personal: personalConfig as PersonalInfo,
  characters: charactersConfig as Character[],
  tags: tagsConfig as ImageTag[],
  images: imagesConfig as GroupImage[],
  giscus: giscusConfig as GiscusConfig,
  fontawesome: fontawesomeConfig as FontAwesomeConfig,
  features: featuresConfig as FeaturesConfig,
  live2d: live2dConfig as Live2DWidgetConfig,
};
