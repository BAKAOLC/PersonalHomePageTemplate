const fs = require('fs');
const path = require('path');

const { buildHashMap } = require(path.resolve(__dirname, '../scripts/generate-id-hash-map.cjs'));

const CONFIG = {
  outputFile: path.resolve(process.cwd(), 'src/config/id-hash-map.json'),
  watchDirs: [
    path.resolve(process.cwd(), 'src/config'),
  ],
};

function writeMapFile(map) {
  try {
    // eslint-disable-next-line no-restricted-properties
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(map, null, 2));
    return true;
  } catch (e) {
    console.error('❌ [id-hash-map] 写入失败:', e.message);
    return false;
  }
}

function idHashMapPlugin() {
  return {
    name: 'id-hash-map',
    async buildStart() {
      if (process.env.VITE_SKIP_PREBUILD === 'true') {
        console.log('⏭️  [id-hash-map] CI模式：跳过构建时处理');
        return;
      }
      console.log('🔧 [id-hash-map] 生成 id-hash-map...');
      try {
        const map = buildHashMap();
        if (writeMapFile(map)) {
          console.log('✅ [id-hash-map] 生成完成');
        }
      } catch (e) {
        console.error('❌ [id-hash-map] 生成失败:', e.message);
      }
    },
    configureServer(server) {
      const { watcher } = server;
      for (const dir of CONFIG.watchDirs) {
        watcher.add(dir);
      }

      watcher.on('change', (filePath) => {
        if (!filePath.startsWith(path.resolve(process.cwd(), 'src/config'))) return;
        console.log(`🔄 [id-hash-map] 配置变更，重新生成映射: ${path.basename(filePath)}`);
        try {
          const map = buildHashMap();
          if (writeMapFile(map)) {
            server.ws.send({ type: 'full-reload' });
          }
        } catch (e) {
          console.error('❌ [id-hash-map] 重新生成失败:', e.message);
        }
      });
    },
  };
}

module.exports = idHashMapPlugin;
