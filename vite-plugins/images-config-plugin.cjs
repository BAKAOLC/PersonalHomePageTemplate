const fs = require('fs');
const path = require('path');

/**
 * Vite 插件：自动合并图片配置文件
 */
function imagesConfigPlugin() {
  const CONFIG = {
    imagesDir: path.resolve(process.cwd(), 'src/config/images'),
    outputFile: path.resolve(process.cwd(), 'src/config/images.json'),
  };

  /**
   * 验证图片对象是否有效
   */
  function isValidImageObject(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (!obj.id || typeof obj.id !== 'string') return false;
    if (!obj.src && !obj.childImages) return false;
    if (obj.src && typeof obj.src !== 'string') return false;
    if (obj.childImages && !Array.isArray(obj.childImages)) return false;
    if (obj.tags && !Array.isArray(obj.tags)) return false;
    if (obj.characters && !Array.isArray(obj.characters)) return false;
    return true;
  }

  /**
   * 合并图片配置文件
   */
  function mergeImagesConfig() {
    try {
      // 检查 images 目录是否存在
      if (!fs.existsSync(CONFIG.imagesDir)) {
        console.log('📁 [images-config] images 目录不存在，跳过合并');
        return false;
      }

      // 读取所有 JSON 文件
      const files = fs.readdirSync(CONFIG.imagesDir)
        .filter(file => {
          if (!file.endsWith('.json')) return false;
          if (file.startsWith('.')) return false;
          if (file.includes('.backup') || file.includes('.bak')) return false;
          if (file.includes('.tmp') || file.includes('.temp')) return false;
          return true;
        })
        .sort();

      if (files.length === 0) {
        console.log('📁 [images-config] 没有找到 JSON 文件，跳过合并');
        return false;
      }

      let allImages = [];
      let hasChanges = false;

      // 检查是否需要重新生成
      const outputExists = fs.existsSync(CONFIG.outputFile);
      if (outputExists) {
        const outputStat = fs.statSync(CONFIG.outputFile);
        const needsUpdate = files.some(file => {
          const filePath = path.join(CONFIG.imagesDir, file);
          const fileStat = fs.statSync(filePath);
          return fileStat.mtime > outputStat.mtime;
        });

        if (!needsUpdate) {
          console.log('📁 [images-config] 配置文件是最新的，跳过合并');
          return false;
        }
      }

      // 合并所有文件
      for (const file of files) {
        const filePath = path.join(CONFIG.imagesDir, file);
        const fileName = path.basename(file, '.json');

        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);

          if (Array.isArray(data)) {
            const validImages = data.filter(item => isValidImageObject(item));
            if (validImages.length !== data.length) {
              console.warn(`⚠️  [images-config] ${fileName}.json 中有 ${data.length - validImages.length} 个无效图片对象被跳过`);
            }
            allImages = allImages.concat(validImages);
            hasChanges = true;
          } else if (typeof data === 'object' && data !== null) {
            if (isValidImageObject(data)) {
              allImages.push(data);
              hasChanges = true;
            } else {
              console.warn(`⚠️  [images-config] 跳过 ${file}: 图片对象格式无效`);
            }
          } else {
            console.warn(`⚠️  [images-config] 跳过 ${file}: 不是有效的图片数据格式`);
          }
        } catch (error) {
          console.error(`❌ [images-config] 读取 ${file} 失败:`, error.message);
        }
      }

      if (!hasChanges) {
        return false;
      }

      // 去重
      const uniqueImages = [];
      const seenIds = new Set();

      for (const image of allImages) {
        if (image.id && seenIds.has(image.id)) {
          console.warn(`⚠️  [images-config] 发现重复 ID: ${image.id}，跳过重复项`);
          continue;
        }
        if (image.id) {
          seenIds.add(image.id);
        }
        uniqueImages.push(image);
      }

      // 按日期排序
      uniqueImages.sort((a, b) => {
        const dateA = new Date(a.date || '1970-01-01');
        const dateB = new Date(b.date || '1970-01-01');
        return dateB - dateA;
      });

      // 写入合并后的文件
      fs.writeFileSync(CONFIG.outputFile, JSON.stringify(uniqueImages, null, 2), 'utf8');
      console.log(`✅ [images-config] 成功合并 ${files.length} 个文件，共 ${uniqueImages.length} 个图片`);

      return true;
    } catch (error) {
      console.error('❌ [images-config] 合并失败:', error.message);
      return false;
    }
  }

  return {
    name: 'images-config',
    buildStart() {
      // 在构建开始时合并配置
      mergeImagesConfig();
    },
    configureServer(server) {
      // 在开发模式下监听文件变化
      const { watcher } = server;

      watcher.add(CONFIG.imagesDir);

      watcher.on('change', (filePath) => {
        if (filePath.startsWith(CONFIG.imagesDir) && filePath.endsWith('.json')) {
          console.log(`🔄 [images-config] 检测到配置文件变化: ${path.basename(filePath)}`);
          if (mergeImagesConfig()) {
            // 触发热重载
            server.ws.send({
              type: 'full-reload',
            });
          }
        }
      });

      watcher.on('add', (filePath) => {
        if (filePath.startsWith(CONFIG.imagesDir) && filePath.endsWith('.json')) {
          console.log(`➕ [images-config] 检测到新配置文件: ${path.basename(filePath)}`);
          if (mergeImagesConfig()) {
            server.ws.send({
              type: 'full-reload',
            });
          }
        }
      });

      watcher.on('unlink', (filePath) => {
        if (filePath.startsWith(CONFIG.imagesDir) && filePath.endsWith('.json')) {
          console.log(`🗑️  [images-config] 检测到配置文件删除: ${path.basename(filePath)}`);
          if (mergeImagesConfig()) {
            server.ws.send({
              type: 'full-reload',
            });
          }
        }
      });
    },
  };
}

module.exports = imagesConfigPlugin;
