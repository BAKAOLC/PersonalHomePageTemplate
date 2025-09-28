const fs = require('fs');
const path = require('path');

/**
 * Vite 插件：自动合并角色配置文件
 */
function characterProfilesConfigPlugin() {
  const CONFIG = {
    characterProfilesDir: path.resolve(process.cwd(), 'src/config/character-profiles'),
    outputFile: path.resolve(process.cwd(), 'src/config/character-profiles.json'),
  };

  /**
   * 验证角色配置对象是否有效
   */
  function isValidCharacterProfileObject(obj) {
    if (!obj || typeof obj !== 'object') return false;

    // 必须有 id
    if (!obj.id || typeof obj.id !== 'string') return false;

    // 必须有 name
    if (!obj.name || typeof obj.name !== 'object') return false;

    // name 必须有至少一个语言版本
    const hasValidName = Object.values(obj.name).some(value => 
      typeof value === 'string' && value.trim().length > 0
    );
    if (!hasValidName) return false;

    // 必须有 variants 数组
    if (!Array.isArray(obj.variants) || obj.variants.length === 0) return false;

    // 验证每个 variant
    for (const variant of obj.variants) {
      if (!variant.id || typeof variant.id !== 'string') return false;
      if (!variant.name || typeof variant.name !== 'object') return false;
      
      // variant name 必须有至少一个语言版本
      const hasValidVariantName = Object.values(variant.name).some(value => 
        typeof value === 'string' && value.trim().length > 0
      );
      if (!hasValidVariantName) return false;

      // images 必须是数组（可以为空）
      if (variant.images && !Array.isArray(variant.images)) return false;

      // infoCards 必须是数组（可以为空）
      if (variant.infoCards && !Array.isArray(variant.infoCards)) return false;
    }

    return true;
  }

  /**
   * 处理角色配置对象，设置默认值
   */
  function processCharacterProfile(profile) {
    const processed = { ...profile };

    // 确保每个 variant 都有 images 和 infoCards 数组
    if (processed.variants) {
      processed.variants = processed.variants.map(variant => ({
        ...variant,
        images: variant.images || [],
        infoCards: variant.infoCards || []
      }));
    }

    return processed;
  }

  /**
   * 合并角色配置文件
   */
  function mergeCharacterProfilesConfig() {
    try {
      // 检查 character-profiles 目录是否存在
      if (!fs.existsSync(CONFIG.characterProfilesDir)) {
        console.log('📁 [character-profiles-config] character-profiles 目录不存在，跳过合并');
        return false;
      }

      // 读取所有 JSON 文件
      const files = fs.readdirSync(CONFIG.characterProfilesDir)
        .filter(file => {
          if (!file.endsWith('.json')) return false;
          if (file.startsWith('.')) return false;
          if (file.includes('.backup') || file.includes('.bak')) return false;
          if (file.includes('.tmp') || file.includes('.temp')) return false;
          return true;
        })
        .sort();

      if (files.length === 0) {
        console.log('📁 [character-profiles-config] 没有找到 JSON 文件，跳过合并');
        return false;
      }

      let allCharacterProfiles = [];
      let hasChanges = false;

      // 检查是否需要重新生成
      const outputExists = fs.existsSync(CONFIG.outputFile);
      if (outputExists) {
        const outputStat = fs.statSync(CONFIG.outputFile);
        const needsUpdate = files.some(file => {
          const filePath = path.join(CONFIG.characterProfilesDir, file);
          const fileStat = fs.statSync(filePath);
          return fileStat.mtime > outputStat.mtime;
        });

        if (!needsUpdate) {
          console.log('📁 [character-profiles-config] 配置文件是最新的，跳过合并');
          return false;
        }
      }

      // 合并所有文件
      for (const file of files) {
        const filePath = path.join(CONFIG.characterProfilesDir, file);
        const fileName = path.basename(file, '.json');

        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);

          if (Array.isArray(data)) {
            const validProfiles = data.filter(item => isValidCharacterProfileObject(item))
              .map(item => processCharacterProfile(item));
            if (validProfiles.length !== data.length) {
              console.warn(`⚠️  [character-profiles-config] ${fileName}.json 中有 ${data.length - validProfiles.length} 个无效角色配置对象被跳过`);
            }
            allCharacterProfiles = allCharacterProfiles.concat(validProfiles);
            hasChanges = true;
          } else if (typeof data === 'object' && data !== null) {
            if (isValidCharacterProfileObject(data)) {
              allCharacterProfiles.push(processCharacterProfile(data));
              hasChanges = true;
            } else {
              console.warn(`⚠️  [character-profiles-config] 跳过 ${file}: 角色配置对象格式无效`);
            }
          } else {
            console.warn(`⚠️  [character-profiles-config] 跳过 ${file}: 不是有效的角色配置数据格式`);
          }
        } catch (error) {
          console.error(`❌ [character-profiles-config] 读取 ${file} 失败:`, error.message);
        }
      }

      if (!hasChanges) {
        return false;
      }

      // 去重
      const uniqueProfiles = [];
      const seenIds = new Set();

      for (const profile of allCharacterProfiles) {
        if (profile.id && seenIds.has(profile.id)) {
          console.warn(`⚠️  [character-profiles-config] 发现重复 ID: ${profile.id}，跳过重复项`);
          continue;
        }
        if (profile.id) {
          seenIds.add(profile.id);
        }
        uniqueProfiles.push(profile);
      }

      // 按 id 排序（保证一致性）
      uniqueProfiles.sort((a, b) => {
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
      });

      // 写入合并后的文件
      fs.writeFileSync(CONFIG.outputFile, JSON.stringify(uniqueProfiles, null, 2), 'utf8');
      console.log(`✅ [character-profiles-config] 成功合并 ${files.length} 个文件，共 ${uniqueProfiles.length} 个角色`);

      return true;
    } catch (error) {
      console.error('❌ [character-profiles-config] 合并失败:', error.message);
      return false;
    }
  }

  return {
    name: 'character-profiles-config',
    buildStart() {
      // 检查是否跳过构建时处理（CI模式下已经预处理过）
      if (process.env.VITE_SKIP_PREBUILD === 'true') {
        console.log('⏭️  [character-profiles-config] CI模式：跳过构建时处理');
        return;
      }
      // 在构建开始时执行合并
      console.log('🔧 [character-profiles-config] 构建时合并角色配置...');
      mergeCharacterProfilesConfig();
    },
    configureServer(server) {
      // 在开发模式下监听文件变化
      const { watcher } = server;

      watcher.add(CONFIG.characterProfilesDir);

      watcher.on('change', (filePath) => {
        if (filePath.startsWith(CONFIG.characterProfilesDir) && filePath.endsWith('.json')) {
          console.log(`🔄 [character-profiles-config] 检测到配置文件变化: ${path.basename(filePath)}`);
          if (mergeCharacterProfilesConfig()) {
            // 触发热重载
            server.ws.send({
              type: 'full-reload',
            });
          }
        }
      });

      watcher.on('add', (filePath) => {
        if (filePath.startsWith(CONFIG.characterProfilesDir) && filePath.endsWith('.json')) {
          console.log(`➕ [character-profiles-config] 检测到新配置文件: ${path.basename(filePath)}`);
          if (mergeCharacterProfilesConfig()) {
            server.ws.send({
              type: 'full-reload',
            });
          }
        }
      });

      watcher.on('unlink', (filePath) => {
        if (filePath.startsWith(CONFIG.characterProfilesDir) && filePath.endsWith('.json')) {
          console.log(`🗑️  [character-profiles-config] 检测到配置文件删除: ${path.basename(filePath)}`);
          if (mergeCharacterProfilesConfig()) {
            server.ws.send({
              type: 'full-reload',
            });
          }
        }
      });
    },
  };
}

module.exports = characterProfilesConfigPlugin;
