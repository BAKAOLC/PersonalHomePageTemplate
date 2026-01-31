const fs = require('fs');
const path = require('path');

const JSON5 = require('json5');

/**
 * Vite 插件：HTML 配置处理
 * 在构建时自动处理 HTML 文件的 meta 标签和 404 页面
 */
function htmlConfigPlugin() {
  /**
   * 生成多语言Feed链接
   */
  function generateFeedLinks() {
    try {
      const languagesConfigPath = path.resolve(process.cwd(), 'src/config/languages.json5');
      const languagesConfig = JSON5.parse(fs.readFileSync(languagesConfigPath, 'utf8'));

      const enabledLanguages = Object.entries(languagesConfig.languages)
        .filter(([_, lang]) => lang.enabled)
        .map(([code, lang]) => ({ code, ...lang }));

      let feedLinks = '';

      for (const lang of enabledLanguages) {
        const suffix = lang.code === languagesConfig.fallback ? '' : `.${lang.code}`;
        const hreflang = lang.aliases?.[0] || lang.code;
        const title = lang.name;

        feedLinks += `  <link rel="alternate" type="application/rss+xml" title="RSS Feed (${title})" href="/feeds/rss${suffix}.xml" hreflang="${hreflang}">\n`;
        feedLinks += `  <link rel="alternate" type="application/atom+xml" title="Atom Feed (${title})" href="/feeds/atom${suffix}.xml" hreflang="${hreflang}">\n`;
        feedLinks += `  <link rel="alternate" type="application/json" title="JSON Feed (${title})" href="/feeds/feed${suffix}.json" hreflang="${hreflang}">\n`;
      }

      return feedLinks.trim();
    } catch (error) {
      console.warn('⚠️  [html-config] 生成 Feed 链接失败:', error.message);
      // 返回默认Feed链接
      return `  <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/feeds/rss.xml">
  <link rel="alternate" type="application/atom+xml" title="Atom Feed" href="/feeds/atom.xml">
  <link rel="alternate" type="application/json" title="JSON Feed" href="/feeds/feed.json">`;
    }
  }

  return {
    name: 'html-config-plugin',
    transformIndexHtml(html, context) {
      try {
        // 读取 HTML 配置文件
        const configPath = path.resolve(process.cwd(), 'src/config/html.json5');
        const htmlConfig = JSON5.parse(fs.readFileSync(configPath, 'utf-8'));

        // 生成多语言 Feed 链接
        const feedLinks = generateFeedLinks();

        // 替换 HTML 中的占位符
        const transformedHtml = html
          // 替换占位符
          .replace(/\{\{SITE_TITLE\}\}/g, htmlConfig.title)
          .replace(/\{\{SITE_DESCRIPTION\}\}/g, htmlConfig.description)
          .replace(/\{\{SITE_KEYWORDS\}\}/g, htmlConfig.keywords)
          .replace(/\{\{SITE_AUTHOR\}\}/g, htmlConfig.author)
          .replace(/\{\{SITE_URL\}\}/g, htmlConfig.url)
          .replace(/\{\{SITE_IMAGE\}\}/g, htmlConfig.image)
          .replace(/\{\{SITE_FAVICON\}\}/g, htmlConfig.favicon)
          .replace(/\{\{SITE_APPLE_TOUCH_ICON\}\}/g, htmlConfig.appleTouchIcon)
          .replace(/\{\{THEME_COLOR_LIGHT\}\}/g, htmlConfig.themeColor.light)
          .replace(/\{\{THEME_COLOR_DARK\}\}/g, htmlConfig.themeColor.dark)
          // 替换 Feed 链接占位符
          .replace(/\{\{FEED_LINKS\}\}/g, feedLinks);

        console.log(`✅ HTML 配置已应用: ${htmlConfig.title}`);
        return transformedHtml;
      } catch (error) {
        console.error('❌ HTML 配置处理失败:', error);
        return html;
      }
    },
    generateBundle() {
      try {
        // 处理 404.html 文件
        const configPath = path.resolve(process.cwd(), 'src/config/html.json5');
        const htmlConfig = JSON5.parse(fs.readFileSync(configPath, 'utf-8'));

        const html404Path = path.resolve(process.cwd(), 'public/404.html');
        if (fs.existsSync(html404Path)) {
          let html404Content = fs.readFileSync(html404Path, 'utf-8');

          // 更新 404.html 的内容
          html404Content = html404Content
            .replace(/\{\{SITE_TITLE\}\}/g, htmlConfig.title)
            .replace(/\{\{SITE_DESCRIPTION\}\}/g, htmlConfig.description);

          // 将更新后的 404.html 写入到构建输出目录
          this.emitFile({
            type: 'asset',
            fileName: '404.html',
            source: html404Content,
          });

          console.log('✅ 404.html 已更新');
        }
      } catch (error) {
        console.error('❌ 404.html 处理失败:', error);
      }
    },
  };
}

module.exports = htmlConfigPlugin;
