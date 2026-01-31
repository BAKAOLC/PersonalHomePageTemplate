const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const JSON5 = require('json5');

const { writeJSON5FileSync } = require('./json5-writer.cjs');

// 配置
const CONFIG = {
  imagesDir: path.join(__dirname, '../src/config/images'),
  outputFile: path.join(__dirname, '../src/config/images.json5'),
  backupFile: path.join(__dirname, '../src/config/images.json5.backup'),
  cacheFile: path.join(__dirname, '../.images-cache.json'),
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

  // 必须有 id
  if (!obj.id || typeof obj.id !== 'string') return false;

  // 必须有 src 或 childImages
  if (!obj.src && !obj.childImages) return false;

  // 如果有 src，必须是字符串
  if (obj.src && typeof obj.src !== 'string') return false;

  // 如果有 childImages，必须是数组
  if (obj.childImages && !Array.isArray(obj.childImages)) return false;

  // 如果有 tags，必须是数组
  if (obj.tags && !Array.isArray(obj.tags)) return false;

  // 如果有 characters，必须是数组
  if (obj.characters && !Array.isArray(obj.characters)) return false;

  return true;
}

/**
 * 读取 images 目录下的所有 JSON 文件并合并
 */
async function mergeImages() {
  try {
    // 检查 images 目录是否存在
    if (!fs.existsSync(CONFIG.imagesDir)) {
      console.log('📁 images 目录不存在，跳过合并');
      return;
    }

    // 读取所有 JSON 文件（包括子目录），排除隐藏文件和特殊文件
    const fileObjects = getAllJsonFiles(CONFIG.imagesDir);

    if (fileObjects.length === 0) {
      console.log('📁 没有找到 JSON5 文件，创建空的 images.json5');
      // 创建空的配置文件
      writeJSON5FileSync(CONFIG.outputFile, [], 'images');
      console.log('✅ 已创建空的 images.json5 文件');
      // 清空缓存，因为没有文件
      await saveCache({});
      return;
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
      console.log('📁 配置文件是最新的，跳过合并');
      return;
    }

    // 备份现有文件
    if (fs.existsSync(CONFIG.outputFile)) {
      fs.copyFileSync(CONFIG.outputFile, CONFIG.backupFile);
      console.log('💾 已备份现有的 images.json5');
    }

    let allImages = [];
    let totalCount = 0;

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
            console.warn(`⚠️  ${relativePath} 中有 ${data.length - validImages.length} 个无效图片对象被跳过`);
          }
          allImages = allImages.concat(validImages);
          console.log(`✅ 已合并 ${relativePath} (${validImages.length} 个图片)`);
          totalCount += validImages.length;
        } else if (typeof data === 'object' && data !== null) {
          // 如果是单个对象，验证并包装成数组
          if (isValidImageObject(data)) {
            const processed = { ...data };
            if (!processed.$meta) {
              processed.$meta = {};
            }
            processed.$meta.sourceFile = relativePath;
            allImages.push(processed);
            console.log(`✅ 已合并 ${relativePath} (1 个图片)`);
            totalCount += 1;
          } else {
            console.warn(`⚠️  跳过 ${relativePath}: 图片对象格式无效`);
          }
        } else {
          console.warn(`⚠️  跳过 ${relativePath}: 不是有效的图片数据格式`);
        }
      } catch (error) {
        console.error(`❌ 读取 ${relativePath} 失败:`, error.message);
      }
    }

    // 去重（基于 id）
    const uniqueImages = [];
    const seenIds = new Set();

    for (const image of allImages) {
      if (image.id && seenIds.has(image.id)) {
        console.warn(`⚠️  发现重复 ID: ${image.id}，跳过重复项`);
        continue;
      }
      if (image.id) {
        seenIds.add(image.id);
      }
      uniqueImages.push(image);
    }

    // 按日期排序（最新的在前）
    uniqueImages.sort((a, b) => {
      const dateA = new Date(a.date || '1970-01-01');
      const dateB = new Date(b.date || '1970-01-01');
      return dateB - dateA;
    });

    // 写入合并后的配置到输出文件
    writeJSON5FileSync(CONFIG.outputFile, uniqueImages, 'images');

    console.log(`\n🎉 成功合并 ${fileObjects.length} 个文件，共 ${uniqueImages.length} 个图片到 images.json5！`);
    if (totalCount !== uniqueImages.length) {
      console.log(`📝 去重了 ${totalCount - uniqueImages.length} 个重复项`);
    }

    // 更新缓存
    cache[cacheKey] = currentHash;
    await saveCache(cache);
  } catch (error) {
    console.error('❌ 合并失败:', error.message);

    // 恢复备份
    if (fs.existsSync(CONFIG.backupFile)) {
      fs.copyFileSync(CONFIG.backupFile, CONFIG.outputFile);
      console.log('🔄 已恢复备份文件');
    }

    process.exit(1);
  }
}

/**
 * 将大的 images.json5 拆分成多个小文件，以图像 ID 为文件名
 */
function splitImages() {
  try {
    if (!fs.existsSync(CONFIG.outputFile)) {
      console.error('❌ images.json5 不存在，无法拆分');
      process.exit(1);
    }

    // 确保输出目录存在
    if (!fs.existsSync(CONFIG.imagesDir)) {
      fs.mkdirSync(CONFIG.imagesDir, { recursive: true });
    }

    const imagesData = JSON5.parse(fs.readFileSync(CONFIG.outputFile, 'utf8'));
    console.log(`📖 读取到 ${imagesData.length} 个图片`);

    let createdFiles = 0;

    // 为每个图像创建单独的文件
    for (const image of imagesData) {
      if (!image.id) {
        console.warn('⚠️  跳过没有 ID 的图像');
        continue;
      }

      // 创建输出对象的副本，移除元数据
      const outputImage = { ...image };
      let targetPath;

      // 如果有源文件路径元数据，使用它来保持目录结构
      if (image.$meta?.sourceFile) {
        targetPath = path.join(CONFIG.imagesDir, image.$meta.sourceFile);
        delete outputImage.$meta;
      } else {
        // 否则使用 ID 作为文件名放在根目录
        const safeFileName = image.id.replace(/[<>:"/\\|?*]/g, '-');
        const fileName = `${safeFileName}.json5`;
        targetPath = path.join(CONFIG.imagesDir, fileName);
      }

      try {
        // 确保目标目录存在
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        fs.writeFileSync(targetPath, JSON5.stringify(outputImage, null, 2), 'utf8');
        const relativePath = path.relative(CONFIG.imagesDir, targetPath);
        console.log(`✅ 已创建 ${relativePath}`);
        createdFiles++;
      } catch (error) {
        console.error(`❌ 创建 ${path.basename(targetPath)} 失败:`, error.message);
      }
    }

    console.log(`\n🎉 成功将 ${imagesData.length} 个图片拆分到 ${createdFiles} 个文件中！`);
  } catch (error) {
    console.error('❌ 拆分失败:', error.message);
    process.exit(1);
  }
}

/**
 * 清理备份文件
 */
function cleanup() {
  if (fs.existsSync(CONFIG.backupFile)) {
    fs.unlinkSync(CONFIG.backupFile);
    console.log('🧹 已清理备份文件');
  }
}

// 命令行参数处理
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'merge':
      await mergeImages();
      break;
    case 'split':
      splitImages();
      break;
    case 'cleanup':
      cleanup();
      break;
    case 'build':
    default:
      // 默认行为：合并文件（用于构建）
      await mergeImages();
      break;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}
