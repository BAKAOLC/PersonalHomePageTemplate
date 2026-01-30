const fs = require('fs');
const path = require('path');

function feedGeneratorPlugin() {
  const CONFIG = {
    configFile: path.resolve(process.cwd(), 'src/config/articles.json5'),
    htmlConfigFile: path.resolve(process.cwd(), 'src/config/html.json5'),
    languagesConfigFile: path.resolve(process.cwd(), 'src/config/languages.json5'),
    articlesDir: path.resolve(process.cwd(), 'src/config/articles'),
    outputDir: path.resolve(process.cwd(), 'public/feeds'),
  };

  return {
    name: 'feed-generator',
    async buildStart() {
      if (process.env.VITE_SKIP_PREBUILD === 'true') {
        return;
      }
      const { generateFeeds } = require('../scripts/generate-feeds.cjs');
      await generateFeeds();
    },
    configureServer(server) {
      const { watcher } = server;
      watcher.add(CONFIG.configFile);
      watcher.add(CONFIG.htmlConfigFile);
      watcher.add(CONFIG.languagesConfigFile);
      watcher.add(CONFIG.articlesDir);

      const handleChange = async () => {
        const { generateFeeds } = require('../scripts/generate-feeds.cjs');
        if (await generateFeeds()) {
          server.ws.send({
            type: 'full-reload',
          });
        }
      };

      watcher.on('change', (filePath) => {
        if (
          filePath === CONFIG.configFile ||
          filePath === CONFIG.htmlConfigFile ||
          filePath === CONFIG.languagesConfigFile ||
          filePath.startsWith(CONFIG.articlesDir)
        ) {
          handleChange();
        }
      });
    },
  };
}

module.exports = feedGeneratorPlugin;
