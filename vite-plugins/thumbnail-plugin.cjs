const path = require('path');
const { main: generateThumbnails } = require(path.resolve(__dirname, '../scripts/generate-thumbnails.cjs'));

/**
 * Vite插件：自动生成缩略图
 */
function thumbnailPlugin() {
  const CONFIG = {
    assetsDir: path.resolve(process.cwd(), 'public/assets'),
    thumbnailsDir: path.resolve(process.cwd(), 'public/assets/thumbnails'),
  };

  return {
    name: 'thumbnail-generator',
    configureServer(server) {
      // 在开发模式下监听图片文件变化
      const { watcher } = server;

      watcher.add(CONFIG.assetsDir);

      // 监听图片文件的变化
      const handleImageChange = async (filePath) => {
        // 检查是否是图片文件
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        const ext = path.extname(filePath).toLowerCase();

        if (imageExtensions.includes(ext) && !filePath.includes('thumbnails')) {
          console.log(`🖼️  [thumbnail-generator] 检测到图片文件变化: ${path.basename(filePath)}`);
          try {
            await generateThumbnails();
            console.log('✅ 缩略图重新生成完成');
            // 触发热重载
            server.ws.send({
              type: 'full-reload',
            });
          } catch (error) {
            console.error('❌ 缩略图生成失败:', error);
          }
        }
      };

      watcher.on('change', handleImageChange);
      watcher.on('add', handleImageChange);

      watcher.on('unlink', async (filePath) => {
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        const ext = path.extname(filePath).toLowerCase();

        if (imageExtensions.includes(ext) && !filePath.includes('thumbnails')) {
          console.log(`🗑️  [thumbnail-generator] 检测到图片文件删除: ${path.basename(filePath)}`);
          try {
            await generateThumbnails();
            console.log('✅ 缩略图重新生成完成');
            server.ws.send({
              type: 'full-reload',
            });
          } catch (error) {
            console.error('❌ 缩略图生成失败:', error);
          }
        }
      });
    },
  };
}

module.exports = { thumbnailPlugin };
