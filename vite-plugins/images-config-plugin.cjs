const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const JSON5 = require('json5');

const { writeJSON5FileSync } = require(path.resolve(__dirname, '../scripts/json5-writer.cjs'));

/**
 * Vite 插件：自动合并图片配置文件
 */
function imagesConfigPlugin() {
  const CONFIG = {
    imagesDir: path.resolve(process.cwd(), 'src/config/images'),
    outputFile: path.resolve(process.cwd(), 'src/config/images.json5'),
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
      return JSON5.parse(cacheData);
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
    // eslint-disable-next-line no-restricted-properties
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
   * 递归读取目录中的所有 JSON5 文件
   * @param {string} dir - 目录路径
   * @param {string} baseDir - 基础目录路径（用于计算相对路径）
   * @returns {{ filePath: string, relativePath: string }[]} 文件路径和相对路径对象数组
   */
  function getAllJsonFiles(dir, baseDir = dir) {
    const results = [];

    if (!fs.existsSync(dir)) {
      return results;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // 排除隐藏目录
        if (!entry.name.startsWith('.')) {
          results.push(...getAllJsonFiles(fullPath, baseDir));
        }
      } else if (entry.isFile()) {
        // 只处理 .json5 文件
        if (!entry.name.endsWith('.json5')) continue;
        // 排除隐藏文件（以 . 开头）
        if (entry.name.startsWith('.')) continue;
        // 排除备份文件
        if (entry.name.includes('.backup') || entry.name.includes('.bak')) continue;
        // 排除临时文件
        if (entry.name.includes('.tmp') || entry.name.includes('.temp')) continue;

        const relativePath = path.relative(baseDir, fullPath);
        results.push({ filePath: fullPath, relativePath });
      }
    }

    return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
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
    if (obj.hidden !== undefined && typeof obj.hidden !== 'boolean') return false;
    if (obj.childImages && obj.childImages.some(child => (
      !child
      || typeof child !== 'object'
      || (child.hidden !== undefined && typeof child.hidden !== 'boolean')
    ))) {
      return false;
    }
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

      // 读取所有 JSON 文件（包括子目录）
      const fileObjects = getAllJsonFiles(CONFIG.imagesDir);

      if (fileObjects.length === 0) {
        console.log('📁 [images-config] 没有找到 JSON 文件，创建空的 images.json5');
        // 创建空的配置文件
        writeJSON5FileSync(CONFIG.outputFile, [], 'images');
        console.log('✅ [images-config] 已创建空的 images.json5 文件');
        // 清空缓存，因为没有文件
        await saveCache({});
        return true;
      }

      // 加载缓存
      const cache = await loadCache();

      // 计算所有配置文件的路径
      const filePaths = fileObjects.map(obj => obj.filePath);

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
      for (const { filePath, relativePath } of fileObjects) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON5.parse(content);

          if (Array.isArray(data)) {
            // 验证数组中的每个对象并添加元数据
            const validImages = data.filter(item => isValidImageObject(item)).map(item => {
              const processed = { ...item };
              if (!processed.$meta) {
                processed.$meta = {};
              }
              processed.$meta.sourceFile = relativePath;
              return processed;
            });
            if (validImages.length !== data.length) {
              console.warn(`⚠️  [images-config] ${relativePath} 中有 ${data.length - validImages.length} 个无效图片对象被跳过`);
            }
            allImages = allImages.concat(validImages);
            hasChanges = true;
          } else if (typeof data === 'object' && data !== null) {
            if (isValidImageObject(data)) {
              const processed = { ...data };
              if (!processed.$meta) {
                processed.$meta = {};
              }
              processed.$meta.sourceFile = relativePath;
              allImages.push(processed);
              hasChanges = true;
            } else {
              console.warn(`⚠️  [images-config] 跳过 ${relativePath}: 图片对象格式无效`);
            }
          } else {
            console.warn(`⚠️  [images-config] 跳过 ${relativePath}: 不是有效的图片数据格式`);
          }
        } catch (error) {
          console.error(`❌ [images-config] 读取 ${relativePath} 失败:`, error.message);
        }
      }

      if (!hasChanges) {
        console.log('📁 [images-config] 没有找到有效的图片配置，创建空的 images.json5');
        // 即使没有有效配置，也要创建空的配置文件
        writeJSON5FileSync(CONFIG.outputFile, [], 'images');
        console.log('✅ [images-config] 已创建空的 images.json5 文件');
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

      // 写入合并后的配置到输出文件
      writeJSON5FileSync(CONFIG.outputFile, uniqueImages, 'images');
      console.log(`✅ [images-config] 成功合并 ${fileObjects.length} 个文件，共 ${uniqueImages.length} 个图片`);

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
        if (filePath.startsWith(CONFIG.imagesDir) && filePath.endsWith('.json5')) {
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
        if (filePath.startsWith(CONFIG.imagesDir) && filePath.endsWith('.json5')) {
          console.log(`➕ [images-config] 检测到新配置文件: ${path.basename(filePath)}`);
          if (await mergeImagesConfig()) {
            server.ws.send({
              type: 'full-reload',
            });
          }
        }
      });

      watcher.on('unlink', async (filePath) => {
        if (filePath.startsWith(CONFIG.imagesDir) && filePath.endsWith('.json5')) {
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
