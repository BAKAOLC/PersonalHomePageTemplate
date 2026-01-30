const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writeJSON5FileSync } = require(path.resolve(__dirname, '../scripts/json5-writer.cjs'));

/**
 * Vite 插件：自动合并文章配置文件
 */
function articlesConfigPlugin() {
  const CONFIG = {
    articlesDir: path.resolve(process.cwd(), 'src/config/articles'),
    outputFile: path.resolve(process.cwd(), 'src/config/articles.json5'),
    cacheFile: path.resolve(process.cwd(), '.articles-cache.json'),
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
   * 验证文章对象是否有效
   */
  function isValidArticleObject(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (!obj.id || typeof obj.id !== 'string') return false;
    if (!obj.title) return false;
    // 内容可以是内联的 content 或外部的 markdownPath，但至少要有一个
    if (!obj.content && !obj.markdownPath) return false;
    if (!obj.date || typeof obj.date !== 'string') return false;
    if (obj.categories && !Array.isArray(obj.categories)) return false;
    if (obj.allowComments !== undefined && typeof obj.allowComments !== 'boolean') return false;
    // markdownPath 可以是字符串（全语言通用）或对象（多语言）
    if (obj.markdownPath && typeof obj.markdownPath !== 'string' && typeof obj.markdownPath !== 'object') return false;
    return true;
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
        const fullPath = path.resolve(process.cwd(), 'public', publicPath);

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
            const fullPath = path.resolve(process.cwd(), 'public', publicPath);

            if (fs.existsSync(fullPath)) {
              const content = fs.readFileSync(fullPath, 'utf8');
              const summary = generateSummaryFromMarkdown(content);
              if (summary) {
                summaryObject[lang] = summary;
              }
            }
          } catch (error) {
            console.warn(`⚠️  [articles-config] 无法为语言 ${lang} 生成摘要:`, error.message);
          }
        }

        // 如果生成了任何摘要，返回摘要对象
        if (Object.keys(summaryObject).length > 0) {
          return summaryObject;
        }
      }
    } catch (error) {
      console.warn(`⚠️  [articles-config] 无法从 Markdown 文件生成摘要:`, error.message);
    }

    return null;
  }

  /**
   * 处理文章对象，设置默认值
   */
  function processArticle(article) {
    const processed = { ...article };

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
        console.log(`📄 [articles-config] 为文章 ${processed.id} 生成了摘要`);
      }
    }

    return processed;
  }

  /**
   * 合并文章配置文件
   */
  async function mergeArticlesConfig() {
    try {
      // 检查 articles 目录是否存在
      if (!fs.existsSync(CONFIG.articlesDir)) {
        console.log('📁 [articles-config] articles 目录不存在，跳过合并');
        return false;
      }

      // 读取所有 JSON 文件
      const files = fs.readdirSync(CONFIG.articlesDir)
        .filter(file => {
          if (!file.endsWith('.json5')) return false;
          if (file.startsWith('.')) return false;
          if (file.includes('.backup') || file.includes('.bak')) return false;
          if (file.includes('.tmp') || file.includes('.temp')) return false;
          return true;
        })
        .sort();

      if (files.length === 0) {
        console.log('📁 [articles-config] 没有找到 JSON 文件，创建空的 articles.json5');
        // 创建空的配置文件
        writeJSON5FileSync(CONFIG.outputFile, [], 'articles');
        console.log('✅ [articles-config] 已创建空的 articles.json5 文件');
        // 清空缓存，因为没有文件
        await saveCache({});
        return true;
      }

      // 加载缓存
      const cache = await loadCache();
      
      // 计算所有配置文件的路径
      const filePaths = files.map(file => path.join(CONFIG.articlesDir, file));
      
      // 计算当前目录的哈希
      const currentHash = await calculateDirectoryHash(filePaths);
      const cacheKey = 'articles_directory_hash';
      const cachedHash = cache[cacheKey];

      // 检查是否需要重新生成
      const outputExists = fs.existsSync(CONFIG.outputFile);
      if (outputExists && cachedHash === currentHash) {
        console.log('📁 [articles-config] 配置文件是最新的，跳过合并');
        return false;
      }

      let allArticles = [];
      let hasChanges = false;

      // 合并所有文件
      for (const file of files) {
        const filePath = path.join(CONFIG.articlesDir, file);
        const fileName = path.basename(file, '.json5');

        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);

          if (Array.isArray(data)) {
            const validArticles = data.filter(item => isValidArticleObject(item))
              .map(item => processArticle(item));
            if (validArticles.length !== data.length) {
              console.warn(`⚠️  [articles-config] ${fileName}.json5 中有 ${data.length - validArticles.length} 个无效文章对象被跳过`);
            }
            allArticles = allArticles.concat(validArticles);
            hasChanges = true;
          } else if (typeof data === 'object' && data !== null) {
            if (isValidArticleObject(data)) {
              allArticles.push(processArticle(data));
              hasChanges = true;
            } else {
              console.warn(`⚠️  [articles-config] 跳过 ${file}: 文章对象格式无效`);
            }
          } else {
            console.warn(`⚠️  [articles-config] 跳过 ${file}: 不是有效的文章数据格式`);
          }
        } catch (error) {
          console.error(`❌ [articles-config] 读取 ${file} 失败:`, error.message);
        }
      }

      if (!hasChanges) {
        console.log('📁 [articles-config] 没有找到有效的文章配置，创建空的 articles.json5');
        // 即使没有有效配置，也要创建空的配置文件
        writeJSON5FileSync(CONFIG.outputFile, [], 'articles');
        console.log('✅ [articles-config] 已创建空的 articles.json5 文件');
        // 更新缓存
        cache[cacheKey] = currentHash;
        await saveCache(cache);
        return true;
      }

      // 去重
      const uniqueArticles = [];
      const seenIds = new Set();

      for (const article of allArticles) {
        if (article.id && seenIds.has(article.id)) {
          console.warn(`⚠️  [articles-config] 发现重复 ID: ${article.id}，跳过重复项`);
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
      console.log(`✅ [articles-config] 成功合并 ${files.length} 个文件，共 ${uniqueArticles.length} 篇文章`);

      // 更新缓存
      cache[cacheKey] = currentHash;
      await saveCache(cache);

      return true;
    } catch (error) {
      console.error('❌ [articles-config] 合并失败:', error.message);
      return false;
    }
  }

  return {
    name: 'articles-config',
    async buildStart() {
      // 检查是否跳过构建时处理（CI模式下已经预处理过）
      if (process.env.VITE_SKIP_PREBUILD === 'true') {
        console.log('⏭️  [articles-config] CI模式：跳过构建时处理');
        return;
      }
      // 在构建开始时执行合并
      console.log('🔧 [articles-config] 构建时合并文章配置...');
      await mergeArticlesConfig();
    },
    configureServer(server) {
      // 在开发模式下监听文件变化
      const { watcher } = server;

      watcher.add(CONFIG.articlesDir);

      watcher.on('change', async (filePath) => {
        if (filePath.startsWith(CONFIG.articlesDir) && filePath.endsWith('.json5')) {
          console.log(`🔄 [articles-config] 检测到配置文件变化: ${path.basename(filePath)}`);
          if (await mergeArticlesConfig()) {
            // 触发热重载
            server.ws.send({
              type: 'full-reload',
            });
          }
        }
      });

      watcher.on('add', async (filePath) => {
        if (filePath.startsWith(CONFIG.articlesDir) && filePath.endsWith('.json5')) {
          console.log(`➕ [articles-config] 检测到新配置文件: ${path.basename(filePath)}`);
          if (await mergeArticlesConfig()) {
            server.ws.send({
              type: 'full-reload',
            });
          }
        }
      });

      watcher.on('unlink', async (filePath) => {
        if (filePath.startsWith(CONFIG.articlesDir) && filePath.endsWith('.json5')) {
          console.log(`🗑️  [articles-config] 检测到配置文件删除: ${path.basename(filePath)}`);
          if (await mergeArticlesConfig()) {
            server.ws.send({
              type: 'full-reload',
            });
          }
        }
      });
    },
  };
}

module.exports = articlesConfigPlugin;
