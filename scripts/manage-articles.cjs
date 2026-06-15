const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const JSON5 = require('json5');

const { writeJSON5FileSync } = require('./json5-writer.cjs');

// 配置
const CONFIG = {
  articlesDir: path.join(__dirname, '../src/config/articles'),
  outputFile: path.join(__dirname, '../src/config/articles.json5'),
  backupFile: path.join(__dirname, '../src/config/articles.json5.backup'),
  cacheFile: path.join(__dirname, '../.articles-cache.json'),
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
 * 验证文章对象是否有效
 */
function isValidArticleObject(obj) {
  if (!obj || typeof obj !== 'object') return false;

  // 必须有 id
  if (!obj.id || typeof obj.id !== 'string') return false;

  // 必须有 title
  if (!obj.title) return false;

  // 内容可以是内联的 content 或外部的 markdownPath，但至少要有一个
  if (!obj.content && !obj.markdownPath) return false;

  // 必须有 date
  if (!obj.date || typeof obj.date !== 'string') return false;

  // 如果有 categories，必须是数组
  if (obj.categories && !Array.isArray(obj.categories)) return false;

  // 如果有 allowComments，必须是布尔值
  if (obj.allowComments !== undefined && typeof obj.allowComments !== 'boolean') return false;

  // 如果有 hidden，必须是布尔值
  if (obj.hidden !== undefined && typeof obj.hidden !== 'boolean') return false;

  // markdownPath 可以是字符串（全语言通用）或对象（多语言）
  if (obj.markdownPath && typeof obj.markdownPath !== 'string' && typeof obj.markdownPath !== 'object') return false;

  return true;
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
 * 从Markdown内容生成摘要
 */
function generateSummaryFromMarkdown(content, maxLength = 150) {
  if (!content || typeof content !== 'string') return '';

  // 移除 Markdown 格式
  const plainText = content
    .replace(/#{1,6}\s+/g, '') // 标题
    .replace(/\*\*(.*?)\*\*/g, '$1') // 粗体
    .replace(/\*(.*?)\*/g, '$1') // 斜体
    .replace(/`(.*?)`/g, '$1') // 行内代码
    .replace(/```[\s\S]*?```/g, '') // 代码块
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // 图片
    .replace(/^\s*[-*+]\s+/gm, '') // 列表
    .replace(/^\s*\d+\.\s+/gm, '') // 有序列表
    .replace(/^\s*>\s+/gm, '') // 引用
    .replace(/\n\s*\n/g, '\n') // 多个换行
    .replace(/\n/g, ' ') // 换行转空格
    .trim();

  // 截取指定长度
  if (plainText.length > maxLength) {
    return `${plainText.substring(0, maxLength)}...`;
  }

  return plainText;
}

/**
 * 尝试从外部Markdown文件生成多语言摘要
 */
function tryGenerateSummaryFromMarkdown(markdownPath) {
  if (!markdownPath) return null;

  try {
    if (typeof markdownPath === 'string') {
      // 字符串路径，生成单个摘要（全语言通用）
      const publicPath = markdownPath.replace(/^\//, '');
      const fullPath = path.resolve(__dirname, '../public', publicPath);

      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        return generateSummaryFromMarkdown(content);
      }
    } else if (typeof markdownPath === 'object') {
      // 对象路径，为每种语言生成对应的摘要
      const summaryObject = {};

      for (const [lang, filePath] of Object.entries(markdownPath)) {
        if (!filePath) continue;

        try {
          const publicPath = filePath.replace(/^\//, '');
          const fullPath = path.resolve(__dirname, '../public', publicPath);

          if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const summary = generateSummaryFromMarkdown(content);
            if (summary) {
              summaryObject[lang] = summary;
            }
          }
        } catch (error) {
          console.warn(`⚠️  无法为语言 ${lang} 生成摘要:`, error.message);
        }
      }

      // 如果生成了任何摘要，返回摘要对象
      if (Object.keys(summaryObject).length > 0) {
        return summaryObject;
      }
    }
  } catch (error) {
    console.warn('⚠️  无法从 Markdown 文件生成摘要:', error.message);
  }

  return null;
}

/**
 * 处理文章对象，设置默认值
 */
function processArticle(article, sourceFilePath = null) {
  const processed = { ...article };

  // 如果提供了源文件路径，保存为元数据（用于拆分时恢复目录结构）
  if (sourceFilePath) {
    if (!processed.$meta) {
      processed.$meta = {};
    }
    processed.$meta.sourceFile = sourceFilePath;
  }

  // 设置默认值
  if (processed.allowComments === undefined) {
    processed.allowComments = true;
  }

  if (!processed.categories) {
    processed.categories = [];
  }

  // 如果没有摘要但有外部Markdown文件，尝试生成摘要
  if (!processed.summary && processed.markdownPath) {
    const generatedSummary = tryGenerateSummaryFromMarkdown(processed.markdownPath);
    if (generatedSummary) {
      processed.summary = generatedSummary;
      console.log(`📄 为文章 ${processed.id} 生成了摘要`);
    }
  }

  return processed;
}

/**
 * 读取 articles 目录下的所有 JSON 文件并合并
 */
async function mergeArticles() {
  try {
    // 检查 articles 目录是否存在
    if (!fs.existsSync(CONFIG.articlesDir)) {
      console.log('📁 articles 目录不存在，跳过合并');
      return;
    }

    // 读取所有 JSON 文件（包括子目录），排除隐藏文件和特殊文件
    const fileObjects = getAllJsonFiles(CONFIG.articlesDir);

    if (fileObjects.length === 0) {
      console.log('📁 没有找到 JSON 文件，创建空的 articles.json5');
      // 创建空的配置文件
      writeJSON5FileSync(CONFIG.outputFile, [], 'articles');
      console.log('✅ 已创建空的 articles.json5 文件');
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
    const cacheKey = 'articles_directory_hash';
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
      console.log('💾 已备份现有的 articles.json5');
    }

    let allArticles = [];
    let totalCount = 0;

    // 合并所有文件
    for (const { filePath, relativePath } of fileObjects) {
      const _fileName = path.basename(relativePath, '.json5');
      const _fileDir = path.dirname(relativePath);

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON5.parse(content);

        if (Array.isArray(data)) {
          // 验证数组中的每个对象
          const validArticles = data.filter(item => isValidArticleObject(item))
            .map(item => processArticle(item, relativePath));
          if (validArticles.length !== data.length) {
            console.warn(`⚠️  ${relativePath} 中有 ${data.length - validArticles.length} 个无效文章对象被跳过`);
          }
          allArticles = allArticles.concat(validArticles);
          console.log(`✅ 已合并 ${relativePath} (${validArticles.length} 篇文章)`);
          totalCount += validArticles.length;
        } else if (typeof data === 'object' && data !== null) {
          // 如果是单个对象，验证并包装成数组
          if (isValidArticleObject(data)) {
            allArticles.push(processArticle(data, relativePath));
            console.log(`✅ 已合并 ${relativePath} (1 篇文章)`);
            totalCount += 1;
          } else {
            console.warn(`⚠️  跳过 ${relativePath}: 文章对象格式无效`);
          }
        } else {
          console.warn(`⚠️  跳过 ${relativePath}: 不是有效的文章数据格式`);
        }
      } catch (error) {
        console.error(`❌ 读取 ${relativePath} 失败:`, error.message);
      }
    }

    // 去重（基于 id）
    const uniqueArticles = [];
    const seenIds = new Set();

    for (const article of allArticles) {
      if (article.id && seenIds.has(article.id)) {
        console.warn(`⚠️  发现重复 ID: ${article.id}，跳过重复项`);
        continue;
      }
      if (article.id) {
        seenIds.add(article.id);
      }
      uniqueArticles.push(article);
    }

    // 按日期排序（最新的在前）
    uniqueArticles.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });

    // 写入合并后的配置到输出文件
    writeJSON5FileSync(CONFIG.outputFile, uniqueArticles, 'articles');

    if (uniqueArticles.length === 0) {
      console.log(`\n📝 成功处理 ${fileObjects.length} 个文件，但没有找到有效的文章配置，已创建空的 articles.json5！`);
    } else {
      console.log(`\n🎉 成功合并 ${fileObjects.length} 个文件，共 ${uniqueArticles.length} 篇文章到 articles.json5！`);
      if (totalCount !== uniqueArticles.length) {
        console.log(`📝 去重了 ${totalCount - uniqueArticles.length} 个重复项`);
      }
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
 * 将大的 articles.json5 拆分成多个小文件，以文章 ID 为文件名
 */
function splitArticles() {
  try {
    if (!fs.existsSync(CONFIG.outputFile)) {
      console.error('❌ articles.json5 不存在，无法拆分');
      process.exit(1);
    }

    // 确保输出目录存在
    if (!fs.existsSync(CONFIG.articlesDir)) {
      fs.mkdirSync(CONFIG.articlesDir, { recursive: true });
    }

    const articlesData = JSON5.parse(fs.readFileSync(CONFIG.outputFile, 'utf8'));
    console.log(`📖 读取到 ${articlesData.length} 篇文章`);

    let createdFiles = 0;

    // 为每篇文章创建单独的文件
    for (const article of articlesData) {
      if (!article.id) {
        console.warn('⚠️  跳过没有 ID 的文章');
        continue;
      }

      // 创建输出对象的副本，移除元数据
      const outputArticle = { ...article };
      let targetPath;

      // 如果有源文件路径元数据，使用它来保持目录结构
      if (article.$meta?.sourceFile) {
        targetPath = path.join(CONFIG.articlesDir, article.$meta.sourceFile);
        delete outputArticle.$meta;
      } else {
        // 否则使用 ID 作为文件名放在根目录
        const safeFileName = article.id.replace(/[<>:"/\\|?*]/g, '-');
        const fileName = `${safeFileName}.json5`;
        targetPath = path.join(CONFIG.articlesDir, fileName);
      }

      try {
        // 确保目标目录存在
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        fs.writeFileSync(targetPath, JSON5.stringify(outputArticle, null, 2), 'utf8');
        const relativePath = path.relative(CONFIG.articlesDir, targetPath);
        console.log(`✅ 已创建 ${relativePath}`);
        createdFiles++;
      } catch (error) {
        console.error(`❌ 创建 ${path.basename(targetPath)} 失败:`, error.message);
      }
    }

    console.log(`\n🎉 成功将 ${articlesData.length} 篇文章拆分到 ${createdFiles} 个文件中！`);
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
      await mergeArticles();
      break;
    case 'split':
      splitArticles();
      break;
    case 'cleanup':
      cleanup();
      break;
    case 'build':
    default:
      // 默认行为：合并文件（用于构建）
      await mergeArticles();
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
