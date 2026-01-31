const fs = require('fs');
const path = require('path');

const JSON5 = require('json5');

const CONFIG = {
  configFile: path.join(__dirname, '../src/config/articles.json5'),
  htmlConfigFile: path.join(__dirname, '../src/config/html.json5'),
  languagesConfigFile: path.join(__dirname, '../src/config/languages.json5'),
  outputDir: path.join(__dirname, '../public/feeds'),
};

function getSiteConfig() {
  try {
    const htmlConfig = JSON5.parse(fs.readFileSync(CONFIG.htmlConfigFile, 'utf8'));
    return {
      title: htmlConfig.title || 'Blog',
      description: htmlConfig.description || 'My Blog',
      baseUrl: htmlConfig.url || 'https://example.com',
      author: htmlConfig.author || 'Author',
    };
  } catch (error) {
    console.warn('⚠️  无法读取网站配置:', error.message);
    return {
      title: 'Blog',
      description: 'My Blog',
      baseUrl: 'https://example.com',
      author: 'Author',
    };
  }
}

function getArticlesConfig() {
  try {
    if (!fs.existsSync(CONFIG.configFile)) {
      return [];
    }
    const content = fs.readFileSync(CONFIG.configFile, 'utf8');
    const data = JSON5.parse(content);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('⚠️  无法读取文章配置:', error.message);
    return [];
  }
}

function getEnabledLanguages() {
  try {
    const languagesConfig = JSON5.parse(fs.readFileSync(CONFIG.languagesConfigFile, 'utf8'));
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
    console.warn('⚠️  无法读取语言配置，使用默认语言:', error.message);
    return [{ code: 'en', hreflang: 'en', name: 'English' }];
  }
}

function getText(value, language = 'en') {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null) {
    return value[language] || value.en || Object.values(value)[0] || '';
  }
  return '';
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateRSSFeed(articles, siteConfig, language = 'en') {
  const baseUrl = siteConfig.baseUrl.replace(/\/$/, '');
  const lastBuildDate = new Date().toUTCString();

  const itemsXml = articles
    .slice(0, 50)
    .map(article => {
      const title = escapeXml(getText(article.title, language));
      const description = escapeXml(getText(article.summary || article.content || '', language));
      const link = `${baseUrl}/#/articles/${encodeURIComponent(article.id)}`;
      const pubDate = new Date(article.date).toUTCString();
      const guid = `${baseUrl}/articles/${encodeURIComponent(article.id)}`;

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

function generateAtomFeed(articles, siteConfig, language = 'en') {
  const baseUrl = siteConfig.baseUrl.replace(/\/$/, '');
  const now = new Date().toISOString();

  const entriesXml = articles
    .slice(0, 50)
    .map(article => {
      const title = escapeXml(getText(article.title, language));
      const summary = escapeXml(getText(article.summary || article.content || '', language));
      const link = `${baseUrl}/#/articles/${encodeURIComponent(article.id)}`;
      const id = `${baseUrl}/articles/${encodeURIComponent(article.id)}`;
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

function generateJsonFeed(articles, siteConfig, language = 'en') {
  const baseUrl = siteConfig.baseUrl.replace(/\/$/, '');

  const items = articles
    .slice(0, 50)
    .map(article => ({
      id: `${baseUrl}/articles/${encodeURIComponent(article.id)}`,
      url: `${baseUrl}/#/articles/${encodeURIComponent(article.id)}`,
      title: getText(article.title, language),
      summary: getText(article.summary || article.content || '', language),
      date_published: article.date,
      content_html: getText(article.content || '', language),
    }));

  // eslint-disable-next-line no-restricted-properties
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
    2,
  );
}

function generateFeeds() {
  try {
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    const articles = getArticlesConfig();
    const siteConfig = getSiteConfig();
    const enabledLanguages = getEnabledLanguages();

    if (articles.length === 0) {
      console.log('📰 没有找到文章配置，跳过 Feed 生成');
      return false;
    }

    articles.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });

    for (const langConfig of enabledLanguages) {
      const rssFeed = generateRSSFeed(articles, siteConfig, langConfig.code);
      const rssFileName = langConfig.code === 'en' ? 'rss.xml' : `rss.${langConfig.code}.xml`;
      fs.writeFileSync(path.join(CONFIG.outputDir, rssFileName), rssFeed);
      console.log(`✅ RSS Feed (${langConfig.name}) 已生成: /feeds/${rssFileName}`);

      const atomFeed = generateAtomFeed(articles, siteConfig, langConfig.code);
      const atomFileName = langConfig.code === 'en' ? 'atom.xml' : `atom.${langConfig.code}.xml`;
      fs.writeFileSync(path.join(CONFIG.outputDir, atomFileName), atomFeed);
      console.log(`✅ Atom Feed (${langConfig.name}) 已生成: /feeds/${atomFileName}`);

      const jsonFeed = generateJsonFeed(articles, siteConfig, langConfig.code);
      const jsonFileName = langConfig.code === 'en' ? 'feed.json' : `feed.${langConfig.code}.json`;
      fs.writeFileSync(path.join(CONFIG.outputDir, jsonFileName), jsonFeed);
      console.log(`✅ JSON Feed (${langConfig.name}) 已生成: /feeds/${jsonFileName}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Feed 生成失败:', error.message);
    return false;
  }
}

if (require.main === module) {
  generateFeeds();
}

module.exports = { generateFeeds };
