const fs = require('fs');
const path = require('path');
const JSON5 = require('json5');

/**
 * Vite 插件：生成 RSS/Atom Feed
 */
function feedGeneratorPlugin() {
  const CONFIG = {
    configFile: path.resolve(process.cwd(), 'src/config/articles.json5'),
    htmlConfigFile: path.resolve(process.cwd(), 'src/config/html.json5'),
    outputDir: path.resolve(process.cwd(), 'public/feeds'),
  };

  /**
   * 获取网站配置
   */
  function getSiteConfig() {
    try {
      // 首先尝试读取 html.json5 获取完整的网站信息
      const htmlConfigPath = path.resolve(process.cwd(), 'src/config/html.json5');
      const htmlConfig = JSON5.parse(fs.readFileSync(htmlConfigPath, 'utf8'));
      
      return {
        title: htmlConfig.title || 'Blog',
        description: htmlConfig.description || 'My Blog',
        baseUrl: htmlConfig.url || 'https://example.com',
        author: htmlConfig.author || 'Author',
      };
    } catch (error) {
      console.warn('⚠️  [feed-generator] 无法读取网站配置:', error.message);
      return {
        title: 'Blog',
        description: 'My Blog',
        baseUrl: 'https://example.com',
        author: 'Author',
      };
    }
  }

  /**
   * 获取文章配置
   */
  function getArticlesConfig() {
    try {
      if (!fs.existsSync(CONFIG.configFile)) {
        return [];
      }
      const content = fs.readFileSync(CONFIG.configFile, 'utf8');
      const data = JSON5.parse(content);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('⚠️  [feed-generator] 无法读取文章配置:', error.message);
      return [];
    }
  }

  /**
   * 获取启用的语言列表
   */
  function getEnabledLanguages() {
    try {
      const languagesConfigPath = path.resolve(process.cwd(), 'src/config/languages.json5');
      const languagesConfig = JSON5.parse(fs.readFileSync(languagesConfigPath, 'utf8'));
      
      const enabled = [];
      for (const [code, lang] of Object.entries(languagesConfig.languages)) {
        if (lang.enabled) {
          enabled.push({
            code,
            hreflang: lang.aliases?.[0] || code,
            name: lang.name || code,
          });
        }
      }
      return enabled.length > 0 ? enabled : [{ code: 'en', hreflang: 'en', name: 'English' }];
    } catch (error) {
      console.warn('⚠️  [feed-generator] 无法读取语言配置，使用默认语言:', error.message);
      return [{ code: 'en', hreflang: 'en', name: 'English' }];
    }
  }

  /**
   * 获取文本值（支持 I18n 对象和字符串）
   */
  function getText(value, language = 'en') {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object' && value !== null) {
      return value[language] || value.en || Object.values(value)[0] || '';
    }
    return '';
  }

  /**
   * 转义XML特殊字符
   */
  function escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 生成 RSS 2.0 Feed（支持多语言）
   */
  function generateRSSFeed(articles, siteConfig, language = 'en') {
    const baseUrl = siteConfig.baseUrl.replace(/\/$/, '');
    const lastBuildDate = new Date().toUTCString();
    
    const itemsXml = articles
      .slice(0, 50) // 限制最多50条
      .map(article => {
        const title = escapeXml(getText(article.title, language));
        const description = escapeXml(getText(article.summary || article.content || '', language));
        const link = `${baseUrl}/#/articles/${article.id}`;
        const pubDate = new Date(article.date).toUTCString();
        const guid = `${baseUrl}/articles/${article.id}`;

        return `    <item>
      <title>${title}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`;
      })
      .join('\n');

    const langCode = language === 'zh' ? 'zh-hans' : language === 'jp' ? 'ja' : 'en-us';

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteConfig.title)}</title>
    <link>${escapeXml(siteConfig.baseUrl)}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>${langCode}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <ttl>60</ttl>
${itemsXml}
  </channel>
</rss>`;
  }

  /**
   * 生成 Atom 1.0 Feed（支持多语言）
   */
  function generateAtomFeed(articles, siteConfig, language = 'en') {
    const baseUrl = siteConfig.baseUrl.replace(/\/$/, '');
    const now = new Date().toISOString();

    const entriesXml = articles
      .slice(0, 50) // 限制最多50条
      .map(article => {
        const title = escapeXml(getText(article.title, language));
        const summary = escapeXml(getText(article.summary || article.content || '', language));
        const link = `${baseUrl}/#/articles/${article.id}`;
        const id = `${baseUrl}/articles/${article.id}`;
        const updated = new Date(article.date).toISOString();

        return `  <entry>
    <title>${title}</title>
    <link href="${escapeXml(link)}" />
    <id>${escapeXml(id)}</id>
    <updated>${updated}</updated>
    <summary>${summary}</summary>
  </entry>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(siteConfig.title)}</title>
  <link href="${escapeXml(siteConfig.baseUrl)}" />
  <link href="${escapeXml(siteConfig.baseUrl)}/feeds/atom.xml" rel="self" />
  <id>${escapeXml(siteConfig.baseUrl)}</id>
  <updated>${now}</updated>
  <author>
    <name>${escapeXml(siteConfig.author)}</name>
  </author>
${entriesXml}
</feed>`;
  }

  /**
   * 生成 JSON Feed（支持多语言）
   */
  function generateJsonFeed(articles, siteConfig, language = 'en') {
    const baseUrl = siteConfig.baseUrl.replace(/\/$/, '');
    
    const items = articles
      .slice(0, 50) // 限制最多50条
      .map(article => ({
        id: `${baseUrl}/articles/${article.id}`,
        url: `${baseUrl}/#/articles/${article.id}`,
        title: getText(article.title, language),
        summary: getText(article.summary || article.content || '', language),
        date_published: article.date,
        content_html: getText(article.content || '', language),
      }));

    return JSON.stringify(
      {
        version: 'https://jsonfeed.org/version/1.1',
        title: siteConfig.title,
        home_page_url: baseUrl,
        feed_url: `${baseUrl}/feeds/feed.json`,
        description: siteConfig.description,
        items,
      },
      null,
      2
    );
  }

  /**
   * 生成 Feed 文件
   */
  async function generateFeeds() {
    try {
      // 确保输出目录存在
      if (!fs.existsSync(CONFIG.outputDir)) {
        fs.mkdirSync(CONFIG.outputDir, { recursive: true });
      }

      const articles = getArticlesConfig();
      const siteConfig = getSiteConfig();
      const enabledLanguages = getEnabledLanguages();

      if (articles.length === 0) {
        console.log('📰 [feed-generator] 没有找到文章配置，跳过 Feed 生成');
        return false;
      }

      // 按日期排序（最新的在前）
      articles.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });

      // 为每种语言生成 Feed
      for (const langConfig of enabledLanguages) {
        // 生成 RSS Feed
        const rssFeed = generateRSSFeed(articles, siteConfig, langConfig.code);
        const rssFileName = langConfig.code === 'en' ? 'rss.xml' : `rss.${langConfig.code}.xml`;
        fs.writeFileSync(path.join(CONFIG.outputDir, rssFileName), rssFeed);
        console.log(`✅ [feed-generator] RSS Feed (${langConfig.name}) 已生成: /feeds/${rssFileName}`);

        // 生成 Atom Feed
        const atomFeed = generateAtomFeed(articles, siteConfig, langConfig.code);
        const atomFileName = langConfig.code === 'en' ? 'atom.xml' : `atom.${langConfig.code}.xml`;
        fs.writeFileSync(path.join(CONFIG.outputDir, atomFileName), atomFeed);
        console.log(`✅ [feed-generator] Atom Feed (${langConfig.name}) 已生成: /feeds/${atomFileName}`);

        // 生成 JSON Feed
        const jsonFeed = generateJsonFeed(articles, siteConfig, langConfig.code);
        const jsonFileName = langConfig.code === 'en' ? 'feed.json' : `feed.${langConfig.code}.json`;
        fs.writeFileSync(path.join(CONFIG.outputDir, jsonFileName), jsonFeed);
        console.log(`✅ [feed-generator] JSON Feed (${langConfig.name}) 已生成: /feeds/${jsonFileName}`);
      }

      return true;
    } catch (error) {
      console.error('❌ [feed-generator] Feed 生成失败:', error.message);
      return false;
    }
  }

  return {
    name: 'feed-generator',
    async buildStart() {
      // 检查是否跳过构建时处理
      if (process.env.VITE_SKIP_PREBUILD === 'true') {
        console.log('⏭️  [feed-generator] CI模式：跳过构建时处理');
        return;
      }
      console.log('🔧 [feed-generator] 生成 Feed...');
      await generateFeeds();
    },
    configureServer(server) {
      // 在开发模式下监听文件变化
      const { watcher } = server;

      // 监听文章配置文件
      watcher.add(CONFIG.configFile);
      watcher.add(CONFIG.htmlConfigFile);

      const handleChange = async () => {
        console.log('🔄 [feed-generator] 检测到配置文件变化，重新生成 Feed');
        if (await generateFeeds()) {
          // 触发热重载
          server.ws.send({
            type: 'full-reload',
          });
        }
      };

      watcher.on('change', (filePath) => {
        if (filePath === CONFIG.configFile || filePath === CONFIG.htmlConfigFile) {
          handleChange();
        }
      });
    },
  };
}

module.exports = feedGeneratorPlugin;
