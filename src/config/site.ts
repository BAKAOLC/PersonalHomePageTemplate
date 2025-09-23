// 导入JSON配置文件
import appConfig from './app.json';
import charactersConfig from './characters.json';
import featuresConfig from './features.json';
import fontawesomeConfig from './fontawesome.json';
import giscusConfig from './giscus.json';
import imagesConfig from './images.json';
import personalConfig from './personal.json';
import tagsConfig from './tags.json';

import type { SiteConfig, AppConfig, PersonalInfo, Character, ImageTag, CharacterImage, GiscusConfig, FontAwesomeConfig, FeaturesConfig } from '@/types';

export const siteConfig: SiteConfig = {
  app: appConfig as AppConfig,
  personal: personalConfig as PersonalInfo,
  characters: charactersConfig as Character[],
  tags: tagsConfig as ImageTag[],
  images: imagesConfig as CharacterImage[],
  giscus: giscusConfig as GiscusConfig,
  fontawesome: fontawesomeConfig as FontAwesomeConfig,
  features: featuresConfig as FeaturesConfig,
};
