const fs = require('fs');
const path = require('path');

/**
 * Vite 插件：自动合并文章配置文件
 */
function articlesConfigPlugin() {
  const CONFIG = {
    articlesDir: path.resolve(process.cwd(), 'src/config/articles'),
    outputFile: path.resolve(process.cwd(), 'src/config/articles.json'),
  };

  /**
   * 验证文章对象是否有效
   */
  function isValidArticleObject(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (!obj.id || typeof obj.id !== 'string') return false;
    if (!obj.title) return false;
    if (!obj.content) return false;
    if (!obj.date || typeof obj.date !== 'string') return false;
    if (obj.categories && !Array.isArray(obj.categories)) return false;
    if (obj.allowComments !== undefined && typeof obj.allowComments !== 'boolean') return false;
    return true;
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

    return processed;
  }

  /**
   * 合并文章配置文件
   */
  function mergeArticlesConfig() {
    try {
      // 检查 articles 目录是否存在
      if (!fs.existsSync(CONFIG.articlesDir)) {
        console.log('📁 [articles-config] articles 目录不存在，跳过合并');
        return false;
      }

      // 读取所有 JSON 文件
      const files = fs.readdirSync(CONFIG.articlesDir)
        .filter(file => {
          if (!file.endsWith('.json')) return false;
          if (file.startsWith('.')) return false;
          if (file.includes('.backup') || file.includes('.bak')) return false;
          if (file.includes('.tmp') || file.includes('.temp')) return false;
          return true;
        })
        .sort();

      if (files.length === 0) {
        console.log('📁 [articles-config] 没有找到 JSON 文件，跳过合并');
        return false;
      }

      let allArticles = [];
      let hasChanges = false;

      // 检查是否需要重新生成
      const outputExists = fs.existsSync(CONFIG.outputFile);
      if (outputExists) {
        const outputStat = fs.statSync(CONFIG.outputFile);
        const needsUpdate = files.some(file => {
          const filePath = path.join(CONFIG.articlesDir, file);
          const fileStat = fs.statSync(filePath);
          return fileStat.mtime > outputStat.mtime;
        });

        if (!needsUpdate) {
          console.log('📁 [articles-config] 配置文件是最新的，跳过合并');
          return false;
        }
      }

      // 合并所有文件
      for (const file of files) {
        const filePath = path.join(CONFIG.articlesDir, file);
        const fileName = path.basename(file, '.json');

        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);

          if (Array.isArray(data)) {
            const validArticles = data.filter(item => isValidArticleObject(item))
              .map(item => processArticle(item));
            if (validArticles.length !== data.length) {
              console.warn(`⚠️  [articles-config] ${fileName}.json 中有 ${data.length - validArticles.length} 个无效文章对象被跳过`);
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
        return false;
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

      // 写入合并后的文件
      fs.writeFileSync(CONFIG.outputFile, JSON.stringify(uniqueArticles, null, 2), 'utf8');
      console.log(`✅ [articles-config] 成功合并 ${files.length} 个文件，共 ${uniqueArticles.length} 篇文章`);

      return true;
    } catch (error) {
      console.error('❌ [articles-config] 合并失败:', error.message);
      return false;
    }
  }

  return {
    name: 'articles-config',
    configureServer(server) {
      // 在开发模式下监听文件变化
      const { watcher } = server;

      watcher.add(CONFIG.articlesDir);

      watcher.on('change', (filePath) => {
        if (filePath.startsWith(CONFIG.articlesDir) && filePath.endsWith('.json')) {
          console.log(`🔄 [articles-config] 检测到配置文件变化: ${path.basename(filePath)}`);
          if (mergeArticlesConfig()) {
            // 触发热重载
            server.ws.send({
              type: 'full-reload',
            });
          }
        }
      });

      watcher.on('add', (filePath) => {
        if (filePath.startsWith(CONFIG.articlesDir) && filePath.endsWith('.json')) {
          console.log(`➕ [articles-config] 检测到新配置文件: ${path.basename(filePath)}`);
          if (mergeArticlesConfig()) {
            server.ws.send({
              type: 'full-reload',
            });
          }
        }
      });

      watcher.on('unlink', (filePath) => {
        if (filePath.startsWith(CONFIG.articlesDir) && filePath.endsWith('.json')) {
          console.log(`🗑️  [articles-config] 检测到配置文件删除: ${path.basename(filePath)}`);
          if (mergeArticlesConfig()) {
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
