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
import { validateSiteConfig } from './validation';

export const siteConfig = validateSiteConfig({
  app: appConfig,
  personal: personalConfig,
  characters: charactersConfig,
  tags: tagsConfig,
  images: imagesConfig,
  giscus: giscusConfig,
  fontawesome: fontawesomeConfig,
  features: featuresConfig,
  live2d: live2dConfig,
});
