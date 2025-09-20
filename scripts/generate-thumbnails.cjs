const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const sharp = require('sharp');

// 配置
const CONFIG = {
  // 输入目录（包含原始图像）
  inputDir: path.resolve(__dirname, '../public/assets'),
  // 输出目录（存放缩略图）
  outputDir: path.resolve(__dirname, '../public/assets/thumbnails'),
  // 缓存文件路径
  cacheFile: path.resolve(__dirname, '../.thumbnail-cache.json'),
  // 支持的图像格式
  supportedFormats: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  // 输出格式
  outputFormat: 'webp',
  // 缩略图配置
  sizes: {
    // 极小预览图（用于渐进式加载）
    tiny: {
      size: 20,
      blur: 2,
      quality: 60,
      suffix: '-tiny',
    },
    // 小缩略图（用于画廊列表和全屏查看器列表）
    small: {
      size: 150,
      blur: 0,
      quality: 75,
      suffix: '-small',
    },
    // 中等缩略图（用于画廊网格）
    medium: {
      size: 300,
      blur: 0,
      quality: 80,
      suffix: '-medium',
    },
  },
};

/**
 * 计算文件的哈希值
 * @param {string} filePath - 文件路径
 * @returns {Promise<string|null>} 文件哈希值或null
 */
async function getFileHash(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
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
    const cacheData = await fs.readFile(CONFIG.cacheFile, 'utf8');
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
  await fs.writeFile(CONFIG.cacheFile, JSON.stringify(cache, null, 2));
}

/**
 * 递归获取目录中的所有图像文件
 * @param {string} dir - 目录路径
 * @param {string[]} files - 文件列表
 * @returns {Promise<string[]>} 图像文件路径数组
 */
async function getImageFiles(dir, files = []) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // 跳过thumbnails目录，避免处理已生成的缩略图
        if (entry.name === 'thumbnails') continue;
        await getImageFiles(fullPath, files);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (CONFIG.supportedFormats.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`扫描目录失败 ${dir}:`, error.message);
  }

  return files;
}

/**
 * 生成缩略图文件名
 * @param {string} originalPath - 原始文件路径
 * @param {string} sizeKey - 尺寸键名
 * @returns {string} 缩略图文件路径
 */
function getThumbnailPath(originalPath, sizeKey) {
  const relativePath = path.relative(CONFIG.inputDir, originalPath);
  const parsedPath = path.parse(relativePath);
  const sizeConfig = CONFIG.sizes[sizeKey];
  const thumbnailName = `${parsedPath.name}${sizeConfig.suffix}.${CONFIG.outputFormat}`;
  return path.join(CONFIG.outputDir, parsedPath.dir, thumbnailName);
}

/**
 * 检查是否需要生成缩略图
 * @param {string} inputPath - 输入文件路径
 * @param {string} outputPath - 输出文件路径
 * @param {Record<string, string>} cache - 缓存对象
 * @param {string} sizeKey - 尺寸键名
 * @returns {Promise<boolean>} 是否需要生成
 */
async function needsGeneration(inputPath, outputPath, cache, sizeKey) {
  try {
    // 检查输出文件是否存在
    await fs.access(outputPath);

    // 计算当前输入文件的哈希
    const currentHash = await getFileHash(inputPath);
    if (!currentHash) return true;

    // 检查缓存中的哈希（使用相对路径作为缓存键）
    const relativePath = path.relative(CONFIG.inputDir, inputPath);
    const cacheKey = `${relativePath}:${sizeKey}`;
    const cachedHash = cache[cacheKey];

    // 如果哈希不匹配，需要重新生成
    if (cachedHash !== currentHash) {
      return true;
    }

    return false;
  } catch {
    // 输出文件不存在，需要生成
    return true;
  }
}

/**
 * 生成单个尺寸的缩略图
 * @param {string} inputPath - 输入文件路径
 * @param {string} sizeKey - 尺寸键名
 * @param {Record<string, string>} cache - 缓存对象
 * @returns {Promise<{skipped?: boolean, generated?: boolean, error?: boolean, path: string, size: string}>} 处理结果
 */
async function generateThumbnail(inputPath, sizeKey, cache) {
  const sizeConfig = CONFIG.sizes[sizeKey];
  const outputPath = getThumbnailPath(inputPath, sizeKey);

  try {
    // 检查是否需要生成
    if (!(await needsGeneration(inputPath, outputPath, cache, sizeKey))) {
      return { skipped: true, path: outputPath, size: sizeKey };
    }

    const outputDir = path.dirname(outputPath);

    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });

    // 处理不同格式的图像
    const ext = path.extname(inputPath).toLowerCase();

    // 对于可能包含动画的格式，启用动画支持
    const animatedFormats = ['.gif', '.webp'];
    const maybeAnimated = animatedFormats.includes(ext);
    const sharpOptions = maybeAnimated ? { animated: true } : {};

    let sharpInstance = sharp(inputPath, sharpOptions);

    // 应用处理
    sharpInstance = sharpInstance
      .resize(sizeConfig.size, sizeConfig.size, {
        fit: 'inside',
        withoutEnlargement: true,
      });

    // 应用模糊效果（仅对tiny尺寸）
    if (sizeConfig.blur > 0) {
      sharpInstance = sharpInstance.blur(sizeConfig.blur);
    }

    // 输出为WebP格式（如果原文件可能是动画，则启用动画输出）
    await sharpInstance
      .webp({
        quality: sizeConfig.quality,
        // 如果原文件可能包含动画，启用WebP动画支持
        ...(maybeAnimated ? { animated: true } : {}),
      })
      .toFile(outputPath);

    // 更新缓存（使用相对路径作为缓存键）
    const relativePath = path.relative(CONFIG.inputDir, inputPath);
    const cacheKey = `${relativePath}:${sizeKey}`;
    const currentHash = await getFileHash(inputPath);
    cache[cacheKey] = currentHash;

    return { generated: true, path: outputPath, size: sizeKey };
  } catch (error) {
    console.error(`生成缩略图失败 ${inputPath} (${sizeKey}):`, error.message);
    return { error: true, path: outputPath, size: sizeKey };
  }
}

/**
 * 清理已删除图像对应的缓存条目
 * @param {Record<string, string>} cache - 缓存对象
 * @param {string[]} existingImages - 现有图像文件列表
 * @returns {Promise<number>} 删除的缓存条目数量
 */
async function cleanupCache(cache, existingImages) {
  // 将绝对路径转换为相对路径集合
  const relativePaths = new Set(existingImages.map(img => path.relative(CONFIG.inputDir, img)));
  const keysToDelete = [];

  for (const cacheKey of Object.keys(cache)) {
    // 分离相对路径和尺寸键
    const lastColonIndex = cacheKey.lastIndexOf(':');
    if (lastColonIndex === -1) continue;

    const imagePath = cacheKey.substring(0, lastColonIndex);

    // 检查相对路径是否存在
    if (!relativePaths.has(imagePath)) {
      keysToDelete.push(cacheKey);
    }
  }

  for (const key of keysToDelete) {
    delete cache[key];
  }

  return keysToDelete.length;
}

/**
 * 清理已删除图像对应的缩略图文件
 * @param {string[]} existingImages - 现有图像文件列表
 * @returns {Promise<{files: number, dirs: number}>} 删除的文件和目录数量
 */
async function cleanupOrphanedThumbnails(existingImages) {
  try {
    // 获取所有现有的缩略图文件
    const thumbnailFiles = await getAllThumbnailFiles(CONFIG.outputDir);
    const imagePaths = new Set(existingImages);
    const deletedCount = { files: 0, dirs: 0 };

    for (const thumbnailPath of thumbnailFiles) {
      // 从缩略图路径推断原始图像路径
      const relativeThumbnailPath = path.relative(CONFIG.outputDir, thumbnailPath);
      const parsedPath = path.parse(relativeThumbnailPath);

      // 移除尺寸后缀
      let originalName = parsedPath.name;
      for (const sizeConfig of Object.values(CONFIG.sizes)) {
        if (originalName.endsWith(sizeConfig.suffix)) {
          originalName = originalName.slice(0, -sizeConfig.suffix.length);
          break;
        }
      }

      // 构建原始图像路径
      const originalPath = path.join(CONFIG.inputDir, parsedPath.dir, `${originalName}.png`); // 尝试常见扩展名
      const alternativePaths = [
        path.join(CONFIG.inputDir, parsedPath.dir, `${originalName}.jpg`),
        path.join(CONFIG.inputDir, parsedPath.dir, `${originalName}.jpeg`),
        path.join(CONFIG.inputDir, parsedPath.dir, `${originalName}.webp`),
        path.join(CONFIG.inputDir, parsedPath.dir, `${originalName}.gif`),
      ];

      let found = false;
      for (const testPath of [originalPath, ...alternativePaths]) {
        if (imagePaths.has(testPath)) {
          found = true;
          break;
        }
      }

      if (!found) {
        try {
          await fs.unlink(thumbnailPath);
          deletedCount.files++;
          console.log(`删除孤立缩略图: ${path.relative(process.cwd(), thumbnailPath)}`);
        } catch (error) {
          console.warn(`删除缩略图失败 ${thumbnailPath}:`, error.message);
        }
      }
    }

    return deletedCount;
  } catch (error) {
    console.warn('清理孤立缩略图时出错:', error.message);
    return { files: 0, dirs: 0 };
  }
}

/**
 * 递归获取所有缩略图文件
 * @param {string} dir - 目录路径
 * @param {string[]} files - 文件列表
 * @returns {Promise<string[]>} 缩略图文件路径数组
 */
async function getAllThumbnailFiles(dir, files = []) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await getAllThumbnailFiles(fullPath, files);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  } catch {
    // 目录不存在，忽略
  }

  return files;
}

/**
 * 生成缩略图映射文件
 * @param {string[]} imageFiles - 图像文件路径数组
 * @returns {Promise<void>}
 */
async function generateThumbnailMap(imageFiles) {
  const thumbnailMap = {};

  for (const imagePath of imageFiles) {
    const relativePath = path.relative(path.resolve(__dirname, '../public'), imagePath);
    const webImagePath = `/${relativePath.replace(/\\/g, '/')}`;

    // 为每个尺寸生成映射
    const sizes = {};
    for (const [sizeKey] of Object.entries(CONFIG.sizes)) {
      const thumbnailPath = getThumbnailPath(imagePath, sizeKey);
      const relativeThumbnailPath = path.relative(path.resolve(__dirname, '../public'), thumbnailPath);
      const webThumbnailPath = `/${relativeThumbnailPath.replace(/\\/g, '/')}`;
      sizes[sizeKey] = webThumbnailPath;
    }

    thumbnailMap[webImagePath] = sizes;
  }

  const mapPath = path.resolve(__dirname, '../src/assets/thumbnail-map.json');
  await fs.writeFile(mapPath, JSON.stringify(thumbnailMap, null, 2));
  console.log(`生成缩略图映射文件: ${path.relative(process.cwd(), mapPath)}`);
}

/**
 * 主函数
 * @returns {Promise<void>}
 */
async function main() {
  console.log('开始生成缩略图...');
  console.log('输入目录:', CONFIG.inputDir);
  console.log('输出目录:', CONFIG.outputDir);

  try {
    // 检查输入目录是否存在
    try {
      await fs.access(CONFIG.inputDir);
      console.log('✅ 输入目录存在');
    } catch {
      console.error('❌ 输入目录不存在:', CONFIG.inputDir);
      return;
    }

    // 检查sharp是否可用
    const sharpVersion = sharp.versions;
    console.log(`使用 Sharp ${sharpVersion.sharp} (libvips ${sharpVersion.vips})`);

    // 加载缓存
    const cache = await loadCache();
    console.log(`加载缓存，共 ${Object.keys(cache).length} 条记录`);

    // 获取所有图像文件
    console.log('正在扫描图像文件...');
    const imageFiles = await getImageFiles(CONFIG.inputDir);
    console.log(`找到 ${imageFiles.length} 个图像文件`);

    if (imageFiles.length === 0) {
      console.log('没有找到图像文件');
      console.log('支持的格式:', CONFIG.supportedFormats.join(', '));
      return;
    }

    // 清理缓存中已删除的图像
    const deletedCacheEntries = await cleanupCache(cache, imageFiles);
    if (deletedCacheEntries > 0) {
      console.log(`清理了 ${deletedCacheEntries} 条过期缓存记录`);
    }

    // 清理孤立的缩略图文件
    const deletedThumbnails = await cleanupOrphanedThumbnails(imageFiles);
    if (deletedThumbnails.files > 0) {
      console.log(`清理了 ${deletedThumbnails.files} 个孤立缩略图文件`);
    }

    // 显示前几个文件作为示例
    console.log('示例文件:');
    imageFiles.slice(0, 3).forEach(file => {
      console.log(' -', path.relative(CONFIG.inputDir, file));
    });

    // 生成缩略图
    const startTime = Date.now();
    const results = { generated: 0, skipped: 0, errors: 0 };

    console.log('\n开始处理图像...');
    for (const imagePath of imageFiles) {
      for (const sizeKey of Object.keys(CONFIG.sizes)) {
        const result = await generateThumbnail(imagePath, sizeKey, cache);

        if (result.generated) {
          results.generated++;
          console.log(`✓ 生成 ${result.size}: ${path.relative(process.cwd(), result.path)}`);
        } else if (result.skipped) {
          results.skipped++;
          // console.log(`- 跳过 ${result.size}: ${path.relative(process.cwd(), result.path)}`)
        } else if (result.error) {
          results.errors++;
        }
      }
    }

    const endTime = Date.now();

    // 保存缓存
    await saveCache(cache);

    // 生成映射文件
    await generateThumbnailMap(imageFiles);

    console.log(`\n✅ 缩略图生成完成! 耗时: ${endTime - startTime}ms`);
    console.log(`📊 统计: 生成 ${results.generated} 个，跳过 ${results.skipped} 个，错误 ${results.errors} 个`);
    console.log(`📁 输出目录: ${CONFIG.outputDir}`);
  } catch (error) {
    console.error('生成缩略图时发生错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { main, CONFIG };
