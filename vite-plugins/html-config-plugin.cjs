const fs = require('fs');
const path = require('path');

/**
 * Vite 插件：HTML 配置处理
 * 在构建时自动处理 HTML 文件的 meta 标签和 404 页面
 */
function htmlConfigPlugin() {
  return {
    name: 'html-config-plugin',
    transformIndexHtml(html, context) {
      try {
        // 读取 HTML 配置文件
        const configPath = path.resolve(process.cwd(), 'src/config/html.json');
        const htmlConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

        // 替换 HTML 中的占位符
        let transformedHtml = html
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
          .replace(/\{\{THEME_COLOR_DARK\}\}/g, htmlConfig.themeColor.dark);

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
        const configPath = path.resolve(process.cwd(), 'src/config/html.json');
        const htmlConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

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
