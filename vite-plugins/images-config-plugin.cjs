const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Vite 插件：自动合并图片配置文件
 */
function imagesConfigPlugin() {
  const CONFIG = {
    imagesDir: path.resolve(process.cwd(), 'src/config/images'),
    outputFile: path.resolve(process.cwd(), 'src/config/images.json'),
    cacheFile: path.resolve(process.cwd(), '.images-cache.json'),
  };

  /**
   * 计算文件的哈希值
   * @param {string} filePath - 文件路径
   * @returns {Promise<string|null>} 文件哈希值或null
   */
  async function getFileHash(filePath) {
    try {
      const fileBuffer = await fs.promises.readFile(filePath);
      return crypto.createHash('md5').update(fileBuffer).digest('hex');
    } catch {
      return null;
    }
  }

  /**
   * 加载缓存数据
   * @returns {Promise<Record<string, string>>} 缓存对象
   */
  async function loadCache() {
    try {
      const cacheData = await fs.promises.readFile(CONFIG.cacheFile, 'utf8');
      return JSON.parse(cacheData);
    } catch {
      return {};
    }
  }

  /**
   * 保存缓存数据
   * @param {Record<string, string>} cache - 缓存对象
   * @returns {Promise<void>}
   */
  async function saveCache(cache) {
    await fs.promises.writeFile(CONFIG.cacheFile, JSON.stringify(cache, null, 2));
  }

  /**
   * 计算目录中所有文件的联合哈希
   * @param {string[]} filePaths - 文件路径数组
   * @returns {Promise<string>} 联合哈希值
   */
  async function calculateDirectoryHash(filePaths) {
    const sortedPaths = filePaths.slice().sort();
    const hashes = [];

    for (const filePath of sortedPaths) {
      const hash = await getFileHash(filePath);
      if (hash) {
        hashes.push(`${path.basename(filePath)}:${hash}`);
      }
    }

    return crypto.createHash('md5').update(hashes.join('|')).digest('hex');
  }

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
  async function mergeImagesConfig() {
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
        console.log('📁 [images-config] 没有找到 JSON 文件，创建空的 images.json');
        // 创建空的配置文件
        fs.writeFileSync(CONFIG.outputFile, JSON.stringify([], null, 2), 'utf8');
        console.log('✅ [images-config] 已创建空的 images.json 文件');
        // 清空缓存，因为没有文件
        await saveCache({});
        return true;
      }

      // 加载缓存
      const cache = await loadCache();
      
      // 计算所有配置文件的路径
      const filePaths = files.map(file => path.join(CONFIG.imagesDir, file));
      
      // 计算当前目录的哈希
      const currentHash = await calculateDirectoryHash(filePaths);
      const cacheKey = 'images_directory_hash';
      const cachedHash = cache[cacheKey];

      // 检查是否需要重新生成
      const outputExists = fs.existsSync(CONFIG.outputFile);
      if (outputExists && cachedHash === currentHash) {
        console.log('📁 [images-config] 配置文件是最新的，跳过合并');
        return false;
      }

      let allImages = [];
      let hasChanges = false;

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
        console.log('📁 [images-config] 没有找到有效的图片配置，创建空的 images.json');
        // 即使没有有效配置，也要创建空的配置文件
        fs.writeFileSync(CONFIG.outputFile, JSON.stringify([], null, 2), 'utf8');
        console.log('✅ [images-config] 已创建空的 images.json 文件');
        // 更新缓存
        cache[cacheKey] = currentHash;
        await saveCache(cache);
        return true;
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

      // 更新缓存
      cache[cacheKey] = currentHash;
      await saveCache(cache);

      return true;
    } catch (error) {
      console.error('❌ [images-config] 合并失败:', error.message);
      return false;
    }
  }

  return {
    name: 'images-config',
    async buildStart() {
      // 检查是否跳过构建时处理（CI模式下已经预处理过）
      if (process.env.VITE_SKIP_PREBUILD === 'true') {
        console.log('⏭️  [images-config] CI模式：跳过构建时处理');
        return;
      }
      // 在构建开始时执行合并
      console.log('🔧 [images-config] 构建时合并图片配置...');
      await mergeImagesConfig();
    },
    configureServer(server) {
      // 在开发模式下监听文件变化
      const { watcher } = server;

      watcher.add(CONFIG.imagesDir);

      watcher.on('change', async (filePath) => {
        if (filePath.startsWith(CONFIG.imagesDir) && filePath.endsWith('.json')) {
          console.log(`🔄 [images-config] 检测到配置文件变化: ${path.basename(filePath)}`);
          if (await mergeImagesConfig()) {
            // 触发热重载
            server.ws.send({
              type: 'full-reload',
            });
          }
        }
      });

      watcher.on('add', async (filePath) => {
        if (filePath.startsWith(CONFIG.imagesDir) && filePath.endsWith('.json')) {
          console.log(`➕ [images-config] 检测到新配置文件: ${path.basename(filePath)}`);
          if (await mergeImagesConfig()) {
            server.ws.send({
              type: 'full-reload',
            });
          }
        }
      });

      watcher.on('unlink', async (filePath) => {
        if (filePath.startsWith(CONFIG.imagesDir) && filePath.endsWith('.json')) {
          console.log(`🗑️  [images-config] 检测到配置文件删除: ${path.basename(filePath)}`);
          if (await mergeImagesConfig()) {
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
