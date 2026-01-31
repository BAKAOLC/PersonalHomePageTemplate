const fs = require('fs');
const path = require('path');

const JSON5 = require('json5');

const { writeJSON5FileSync } = require(path.resolve(__dirname, '../scripts/json5-writer.cjs'));

/**
 * Vite 插件：自动合并角色配置文件
 */
function characterProfilesConfigPlugin() {
  const CONFIG = {
    characterProfilesDir: path.resolve(process.cwd(), 'src/config/character-profiles'),
    outputFile: path.resolve(process.cwd(), 'src/config/character-profiles.json5'),
  };

  /**
   * 递归读取目录中的所有 JSON5 文件
   * @param {string} dir - 目录路径
   * @param {string} baseDir - 基础目录路径（用于计算相对路径）
   * @returns {{ filePath: string, relativePath: string }[]} 文件路径和相对路径对象数组
   */
  function getAllJsonFiles(dir, baseDir = dir) {
    const results = [];

    if (!fs.existsSync(dir)) {
      return results;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // 排除隐藏目录
        if (!entry.name.startsWith('.')) {
          results.push(...getAllJsonFiles(fullPath, baseDir));
        }
      } else if (entry.isFile()) {
        // 只处理 .json5 文件
        if (!entry.name.endsWith('.json5')) continue;
        // 排除隐藏文件（以 . 开头）
        if (entry.name.startsWith('.')) continue;
        // 排除备份文件
        if (entry.name.includes('.backup') || entry.name.includes('.bak')) continue;
        // 排除临时文件
        if (entry.name.includes('.tmp') || entry.name.includes('.temp')) continue;

        const relativePath = path.relative(baseDir, fullPath);
        results.push({ filePath: fullPath, relativePath });
      }
    }

    return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  /**
   * 验证I18nText字段
   * @param {any} value - 要验证的值
   * @param {string} fieldName - 字段名称
   * @param {string} context - 上下文信息
   * @param {boolean} required - 是否必需
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  function validateI18nText(value, fieldName, context, required = false) {
    const errors = [];
    const warnings = [];

    if (!value) {
      if (required) {
        errors.push(`${context}: 必须有 ${fieldName} 字段`);
      }
      return { valid: errors.length === 0, errors, warnings };
    }

    if (typeof value === 'string') {
      // 字符串类型：通用于所有语言或i18n引用
      if (value.trim().length === 0) {
        errors.push(`${context}: ${fieldName} 字段不能是空字符串`);
      }
    } else if (typeof value === 'object' && value !== null) {
      // 对象类型：各语言的键值对
      const hasValidContent = Object.values(value).some(val => typeof val === 'string' && val.trim().length > 0);
      if (!hasValidContent) {
        errors.push(`${context}: ${fieldName} 对象必须包含至少一个有效的语言版本`);
      }
    } else {
      errors.push(`${context}: ${fieldName} 字段必须是字符串或对象`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * 验证角色配置对象是否有效
   */
  function isValidCharacterProfileObject(obj) {
    if (!obj || typeof obj !== 'object') return { valid: false, errors: ['配置对象无效'], warnings: [] };

    const errors = [];
    const warnings = [];

    // 必须有 id
    if (!obj.id || typeof obj.id !== 'string') {
      errors.push('角色配置必须有字符串类型的 id 字段');
      return { valid: false, errors, warnings };
    }

    // 验证 name 字段 (I18nText)
    const nameValidation = validateI18nText(obj.name, 'name', `角色 ${obj.id}`, true);
    errors.push(...nameValidation.errors);
    warnings.push(...nameValidation.warnings);

    // 必须有 variants 数组
    if (!Array.isArray(obj.variants) || obj.variants.length === 0) {
      errors.push(`角色 ${obj.id}: 必须有非空的 variants 数组`);
      return { valid: false, errors, warnings };
    }

    // 验证信息卡片模板
    const templateIds = new Set();
    if (obj.infoCardTemplates) {
      if (!Array.isArray(obj.infoCardTemplates)) {
        errors.push(`角色 ${obj.id}: infoCardTemplates 必须是数组`);
      } else {
        for (const template of obj.infoCardTemplates) {
          if (!template.id || typeof template.id !== 'string') {
            errors.push(`角色 ${obj.id}: 模板必须有字符串类型的 id`);
            continue;
          }
          if (templateIds.has(template.id)) {
            errors.push(`角色 ${obj.id}: 发现重复的模板 ID: ${template.id}`);
          }
          templateIds.add(template.id);

          // 验证模板字段
          const titleValidation = validateI18nText(template.title, 'title', `角色 ${obj.id}, 模板 ${template.id}`, false);
          warnings.push(...titleValidation.warnings);
          errors.push(...titleValidation.errors);

          const contentValidation = validateI18nText(template.content, 'content', `角色 ${obj.id}, 模板 ${template.id}`, false);
          warnings.push(...contentValidation.warnings);
          errors.push(...contentValidation.errors);
        }
      }
    }

    // 验证信息卡片
    function validateInfoCards(cards, context) {
      if (!cards) return;
      if (!Array.isArray(cards)) {
        errors.push(`${context}: infoCards 必须是数组`);
        return;
      }

      const cardIds = new Set();
      for (const card of cards) {
        if (!card.id || typeof card.id !== 'string') {
          errors.push(`${context}: 卡片必须有字符串类型的 id`);
          continue;
        }

        if (cardIds.has(card.id)) {
          errors.push(`${context}: 发现重复的卡片 ID: ${card.id}`);
        }
        cardIds.add(card.id);

        // 验证 template 引用
        if (card.template) {
          if (typeof card.template !== 'string') {
            errors.push(`${context}, 卡片 ${card.id}: template 必须是字符串`);
          } else if (!templateIds.has(card.template)) {
            errors.push(`${context}, 卡片 ${card.id}: 引用了不存在的模板: ${card.template}`);
          }
        }

        // 验证 from 引用（这里只能简单检查类型，实际的引用有效性需要在运行时验证）
        if (card.from && typeof card.from !== 'string') {
          warnings.push(`${context}, 卡片 ${card.id}: from 应该是字符串`);
        }

        // 验证 variables
        if (card.variables && typeof card.variables !== 'object') {
          warnings.push(`${context}, 卡片 ${card.id}: variables 应该是对象`);
        }

        // 验证基本字段类型
        const titleValidation = validateI18nText(card.title, 'title', `${context}, 卡片 ${card.id}`, false);
        warnings.push(...titleValidation.warnings);
        errors.push(...titleValidation.errors);

        const contentValidation = validateI18nText(card.content, 'content', `${context}, 卡片 ${card.id}`, false);
        warnings.push(...contentValidation.warnings);
        errors.push(...contentValidation.errors);
      }
    }

    // 验证角色级信息卡片
    validateInfoCards(obj.infoCards, `角色 ${obj.id}`);

    // 验证每个 variant
    for (const variant of obj.variants) {
      if (!variant.id || typeof variant.id !== 'string') {
        errors.push(`角色 ${obj.id}: variant 必须有字符串类型的 id`);
        continue;
      }
      // 验证变体名称
      const variantNameValidation = validateI18nText(variant.name, 'name', `角色 ${obj.id}, 变体 ${variant.id}`, true);
      errors.push(...variantNameValidation.errors);
      warnings.push(...variantNameValidation.warnings);

      // images 必须是数组（可以为空）
      if (variant.images && !Array.isArray(variant.images)) {
        errors.push(`角色 ${obj.id}, 变体 ${variant.id}: images 必须是数组`);
        continue;
      }

      // 验证变体级信息卡片
      validateInfoCards(variant.infoCards, `角色 ${obj.id}, 变体 ${variant.id}`);

      // 验证每个 image
      if (variant.images) {
        for (const image of variant.images) {
          if (!image.id || typeof image.id !== 'string') {
            errors.push(`角色 ${obj.id}, 变体 ${variant.id}: image 必须有字符串类型的 id`);
            continue;
          }

          // 验证图像级信息卡片
          validateInfoCards(image.infoCards, `角色 ${obj.id}, 变体 ${variant.id}, 图像 ${image.id}`);
        }
      }
    }

    // 输出验证结果
    if (errors.length > 0) {
      console.error(`❌ [character-profiles-config] 角色 ${obj.id} 验证失败:`);
      errors.forEach(error => console.error(`   ${error}`));
    }

    if (warnings.length > 0) {
      console.warn(`⚠️  [character-profiles-config] 角色 ${obj.id} 验证警告:`);
      warnings.forEach(warning => console.warn(`   ${warning}`));
    }

    return { valid: errors.length === 0, errors, warnings };
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

      // 读取所有 JSON 文件（包括子目录）
      const fileObjects = getAllJsonFiles(CONFIG.characterProfilesDir);

      if (fileObjects.length === 0) {
        console.log('📁 [character-profiles-config] 没有找到 JSON 文件，跳过合并');
        return false;
      }

      let allCharacterProfiles = [];
      let hasChanges = false;

      // 检查是否需要重新生成
      const outputExists = fs.existsSync(CONFIG.outputFile);
      if (outputExists) {
        const outputStat = fs.statSync(CONFIG.outputFile);
        const needsUpdate = fileObjects.some(({ filePath }) => {
          const fileStat = fs.statSync(filePath);
          return fileStat.mtime > outputStat.mtime;
        });

        if (!needsUpdate) {
          console.log('📁 [character-profiles-config] 配置文件是最新的，跳过合并');
          return false;
        }
      }

      // 合并所有文件
      for (const { filePath, relativePath } of fileObjects) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON5.parse(content);

          if (Array.isArray(data)) {
            const validProfiles = data.filter(item => {
              const validation = isValidCharacterProfileObject(item);
              return validation.valid;
            }).map(item => {
              const processed = { ...item };
              if (!processed.$meta) {
                processed.$meta = {};
              }
              processed.$meta.sourceFile = relativePath;
              return processed;
            });
            if (validProfiles.length !== data.length) {
              console.warn(`⚠️  [character-profiles-config] ${relativePath} 中有 ${data.length - validProfiles.length} 个无效角色配置对象被跳过`);
            }
            allCharacterProfiles = allCharacterProfiles.concat(validProfiles);
            hasChanges = true;
          } else if (typeof data === 'object' && data !== null) {
            const validation = isValidCharacterProfileObject(data);
            if (validation.valid) {
              const processed = { ...data };
              if (!processed.$meta) {
                processed.$meta = {};
              }
              processed.$meta.sourceFile = relativePath;
              allCharacterProfiles.push(processed);
              hasChanges = true;
            } else {
              console.warn(`⚠️  [character-profiles-config] 跳过 ${relativePath}: 角色配置对象格式无效`);
            }
          } else {
            console.warn(`⚠️  [character-profiles-config] 跳过 ${relativePath}: 不是有效的角色配置数据格式`);
          }
        } catch (error) {
          console.error(`❌ [character-profiles-config] 读取 ${relativePath} 失败:`, error.message);
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

      // 写入合并后的配置到输出文件
      writeJSON5FileSync(CONFIG.outputFile, uniqueProfiles, 'characterProfiles');
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
        if (filePath.startsWith(CONFIG.characterProfilesDir) && filePath.endsWith('.json5')) {
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
        if (filePath.startsWith(CONFIG.characterProfilesDir) && filePath.endsWith('.json5')) {
          console.log(`➕ [character-profiles-config] 检测到新配置文件: ${path.basename(filePath)}`);
          if (mergeCharacterProfilesConfig()) {
            server.ws.send({
              type: 'full-reload',
            });
          }
        }
      });

      watcher.on('unlink', (filePath) => {
        if (filePath.startsWith(CONFIG.characterProfilesDir) && filePath.endsWith('.json5')) {
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
