// 导入JSON配置文件
import charactersConfig from './characters.json';
import fontawesomeConfig from './fontawesome.json';
import giscusConfig from './giscus.json';
import imagesConfig from './images.json';
import personalConfig from './personal.json';
import tagsConfig from './tags.json';

import type { SiteConfig, PersonalInfo, Character, ImageTag, CharacterImage, GiscusConfig, FontAwesomeConfig } from '@/types';

export const siteConfig: SiteConfig = {
  personal: personalConfig as PersonalInfo,
  characters: charactersConfig as Character[],
  tags: tagsConfig as ImageTag[],
  images: imagesConfig as CharacterImage[],
  giscus: giscusConfig as GiscusConfig,
  fontawesome: fontawesomeConfig as FontAwesomeConfig,
};
