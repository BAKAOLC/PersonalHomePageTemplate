const path = require('path');
const { main: generateThumbnails } = require(path.resolve(__dirname, '../scripts/generate-thumbnails.cjs'));

/**
 * Vite插件：自动生成缩略图
 */
function thumbnailPlugin() {
  return {
    name: 'thumbnail-generator',
    buildStart: async () => {
      console.log('🖼️  正在生成缩略图...');
      try {
        await generateThumbnails();
        console.log('✅ 缩略图生成完成');
      } catch (error) {
        console.error('❌ 缩略图生成失败:', error);
        throw error;
      }
    },
  };
}

module.exports = { thumbnailPlugin };
