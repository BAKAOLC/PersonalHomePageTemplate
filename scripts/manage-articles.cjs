const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  articlesDir: path.join(__dirname, '../src/config/articles'),
  outputFile: path.join(__dirname, '../src/config/articles.json'),
  backupFile: path.join(__dirname, '../src/config/articles.json.backup'),
};

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
      console.log(`📄 为文章 ${processed.id} 生成了摘要`);
    }
  }

  return processed;
}

/**
 * 读取 articles 目录下的所有 JSON 文件并合并
 */
function mergeArticles() {
  try {
    // 检查 articles 目录是否存在
    if (!fs.existsSync(CONFIG.articlesDir)) {
      console.log('📁 articles 目录不存在，跳过合并');
      return;
    }

    // 读取所有 JSON 文件，排除隐藏文件和特殊文件
    const files = fs.readdirSync(CONFIG.articlesDir)
      .filter(file => {
        // 只处理 .json 文件
        if (!file.endsWith('.json')) return false;
        // 排除隐藏文件（以 . 开头）
        if (file.startsWith('.')) return false;
        // 排除备份文件
        if (file.includes('.backup') || file.includes('.bak')) return false;
        // 排除临时文件
        if (file.includes('.tmp') || file.includes('.temp')) return false;
        return true;
      })
      .sort(); // 按文件名排序以保证一致性

    if (files.length === 0) {
      console.log('📁 没有找到 JSON 文件，跳过合并');
      return;
    }

    // 备份现有文件
    if (fs.existsSync(CONFIG.outputFile)) {
      fs.copyFileSync(CONFIG.outputFile, CONFIG.backupFile);
      console.log('💾 已备份现有的 articles.json');
    }

    let allArticles = [];
    let totalCount = 0;

    // 合并所有文件
    for (const file of files) {
      const filePath = path.join(CONFIG.articlesDir, file);
      const fileName = path.basename(file, '.json');

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);

        if (Array.isArray(data)) {
          // 验证数组中的每个对象
          const validArticles = data.filter(item => isValidArticleObject(item))
            .map(item => processArticle(item));
          if (validArticles.length !== data.length) {
            console.warn(`⚠️  ${fileName}.json 中有 ${data.length - validArticles.length} 个无效文章对象被跳过`);
          }
          allArticles = allArticles.concat(validArticles);
          console.log(`✅ 已合并 ${fileName}.json (${validArticles.length} 篇文章)`);
          totalCount += validArticles.length;
        } else if (typeof data === 'object' && data !== null) {
          // 如果是单个对象，验证并包装成数组
          if (isValidArticleObject(data)) {
            allArticles.push(processArticle(data));
            console.log(`✅ 已合并 ${fileName}.json (1 篇文章)`);
            totalCount += 1;
          } else {
            console.warn(`⚠️  跳过 ${file}: 文章对象格式无效`);
          }
        } else {
          console.warn(`⚠️  跳过 ${file}: 不是有效的文章数据格式`);
        }
      } catch (error) {
        console.error(`❌ 读取 ${file} 失败:`, error.message);
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

    // 写入合并后的文件
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(uniqueArticles, null, 2), 'utf8');

    console.log(`\n🎉 成功合并 ${files.length} 个文件，共 ${uniqueArticles.length} 篇文章到 articles.json！`);
    if (totalCount !== uniqueArticles.length) {
      console.log(`📝 去重了 ${totalCount - uniqueArticles.length} 个重复项`);
    }
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
 * 将大的 articles.json 拆分成多个小文件，以文章 ID 为文件名
 */
function splitArticles() {
  try {
    if (!fs.existsSync(CONFIG.outputFile)) {
      console.error('❌ articles.json 不存在，无法拆分');
      process.exit(1);
    }

    // 确保输出目录存在
    if (!fs.existsSync(CONFIG.articlesDir)) {
      fs.mkdirSync(CONFIG.articlesDir, { recursive: true });
    }

    const articlesData = JSON.parse(fs.readFileSync(CONFIG.outputFile, 'utf8'));
    console.log(`📖 读取到 ${articlesData.length} 篇文章`);

    let createdFiles = 0;

    // 为每篇文章创建单独的文件，以 ID 为文件名
    for (const article of articlesData) {
      if (!article.id) {
        console.warn('⚠️  跳过没有 ID 的文章');
        continue;
      }

      // 清理文件名，移除不安全的字符
      const safeFileName = article.id.replace(/[<>:"/\\|?*]/g, '-');
      const fileName = `${safeFileName}.json`;
      const filePath = path.join(CONFIG.articlesDir, fileName);

      try {
        fs.writeFileSync(filePath, JSON.stringify(article, null, 2), 'utf8');
        console.log(`✅ 已创建 ${fileName}`);
        createdFiles++;
      } catch (error) {
        console.error(`❌ 创建 ${fileName} 失败:`, error.message);
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
const command = process.argv[2];

switch (command) {
  case 'merge':
    mergeArticles();
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
    mergeArticles();
    break;
}
