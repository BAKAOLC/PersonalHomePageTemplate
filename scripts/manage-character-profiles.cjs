const fs = require('fs');
const path = require('path');
const JSON5 = require('json5');
const { writeJSON5FileSync } = require('./json5-writer.cjs');

// 配置
const CONFIG = {
  characterProfilesDir: path.join(__dirname, '../src/config/character-profiles'),
  outputFile: path.join(__dirname, '../src/config/character-profiles.json5'),
  backupFile: path.join(__dirname, '../src/config/character-profiles.json5.backup'),
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
  if (!obj || typeof obj !== 'object') return false;

  const errors = [];
  const warnings = [];

  // 必须有 id
  if (!obj.id || typeof obj.id !== 'string') {
    errors.push('角色配置必须有字符串类型的 id 字段');
  }

  // 验证 name 字段 (I18nText)
  const nameValidation = validateI18nText(obj.name, 'name', `角色 ${obj.id ?? '未知'}`, true);
  errors.push(...nameValidation.errors);
  warnings.push(...nameValidation.warnings);

  // 必须有 variants 数组
  if (!Array.isArray(obj.variants) || obj.variants.length === 0) {
    errors.push(`角色 ${obj.id ?? '未知'}: 必须有非空的 variants 数组`);
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
  if (Array.isArray(obj.variants)) {
    for (const variant of obj.variants) {
      if (!variant.id || typeof variant.id !== 'string') {
        errors.push(`角色 ${obj.id ?? '未知'}: variant 必须有字符串类型的 id`);
      } else {
        // 验证变体名称
        const variantNameValidation = validateI18nText(variant.name, 'name', `角色 ${obj.id ?? '未知'}, 变体 ${variant.id}`, true);
        errors.push(...variantNameValidation.errors);
        warnings.push(...variantNameValidation.warnings);

        // images 必须是数组（可以为空）
        if (variant.images && !Array.isArray(variant.images)) {
          errors.push(`角色 ${obj.id ?? '未知'}, 变体 ${variant.id}: images 必须是数组`);
        }

        // 验证变体级信息卡片
        validateInfoCards(variant.infoCards, `角色 ${obj.id ?? '未知'}, 变体 ${variant.id}`);

        // 验证每个 image
        if (variant.images) {
          for (const image of variant.images) {
            if (!image.id || typeof image.id !== 'string') {
              errors.push(`角色 ${obj.id ?? '未知'}, 变体 ${variant.id}: image 必须有字符串类型的 id`);
            } else {
              // 验证图像级信息卡片
              validateInfoCards(image.infoCards, `角色 ${obj.id ?? '未知'}, 变体 ${variant.id}, 图像 ${image.id}`);
            }
          }
        }
      }
    }
  }

  // 输出详细的验证结果
  if (errors.length > 0) {
    console.error(`❌ 角色 ${obj.id} 验证失败:`);
    errors.forEach(error => console.error(`   ${error}`));
  }

  if (warnings.length > 0) {
    console.warn(`⚠️  角色 ${obj.id} 验证警告:`);
    warnings.forEach(warning => console.warn(`   ${warning}`));
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * 读取 character-profiles 目录下的所有 JSON 文件并合并
 */
function mergeCharacterProfiles() {
  try {
    // 检查 character-profiles 目录是否存在
    if (!fs.existsSync(CONFIG.characterProfilesDir)) {
      console.log('📁 character-profiles 目录不存在，跳过合并');
      return;
    }

    // 读取所有 JSON 文件（包括子目录），排除隐藏文件和特殊文件
    const fileObjects = getAllJsonFiles(CONFIG.characterProfilesDir);

    if (fileObjects.length === 0) {
      console.log('📁 没有找到 JSON 文件，跳过合并');
      return;
    }

    // 备份现有文件
    if (fs.existsSync(CONFIG.outputFile)) {
      fs.copyFileSync(CONFIG.outputFile, CONFIG.backupFile);
      console.log('💾 已备份现有的 character-profiles.json5');
    }

    let allCharacterProfiles = [];
    let totalCount = 0;

    // 合并所有文件
    for (const { filePath, relativePath } of fileObjects) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON5.parse(content);

        if (Array.isArray(data)) {
          // 验证数组中的每个对象
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
            console.warn(`⚠️  ${relativePath} 中有 ${data.length - validProfiles.length} 个无效角色配置被跳过`);
          }
          allCharacterProfiles = allCharacterProfiles.concat(validProfiles);
          console.log(`✅ 已合并 ${relativePath} (${validProfiles.length} 个角色配置)`);
          totalCount += validProfiles.length;
        } else if (typeof data === 'object' && data !== null) {
          // 如果是单个对象，验证并包装成数组
          const validation = isValidCharacterProfileObject(data);
          if (validation.valid) {
            const processed = { ...data };
            if (!processed.$meta) {
              processed.$meta = {};
            }
            processed.$meta.sourceFile = relativePath;
            allCharacterProfiles.push(processed);
            console.log(`✅ 已合并 ${relativePath} (1 个角色配置)`);
            totalCount += 1;
          } else {
            console.warn(`⚠️  跳过 ${relativePath}: 角色配置对象格式无效`);
          }
        } else {
          console.warn(`⚠️  跳过 ${relativePath}: 不是有效的角色配置数据格式`);
        }
      } catch (error) {
        console.error(`❌ 读取 ${relativePath} 失败:`, error.message);
      }
    }

    // 去重（基于 id）
    const uniqueProfiles = [];
    const seenIds = new Set();

    for (const profile of allCharacterProfiles) {
      if (profile.id && seenIds.has(profile.id)) {
        console.warn(`⚠️  发现重复 ID: ${profile.id}，跳过重复项`);
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

    console.log(`\n🎉 成功合并 ${fileObjects.length} 个文件，共 ${uniqueProfiles.length} 个角色到 character-profiles.json5！`);
    if (totalCount !== uniqueProfiles.length) {
      console.log(`📝 去重了 ${totalCount - uniqueProfiles.length} 个重复项`);
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
 * 将大的 character-profiles.json5 拆分成多个小文件，以角色 ID 为文件名
 */
function splitCharacterProfiles() {
  try {
    if (!fs.existsSync(CONFIG.outputFile)) {
      console.error('❌ character-profiles.json5 不存在，无法拆分');
      process.exit(1);
    }

    // 确保输出目录存在
    if (!fs.existsSync(CONFIG.characterProfilesDir)) {
      fs.mkdirSync(CONFIG.characterProfilesDir, { recursive: true });
    }

    const profilesData = JSON.parse(fs.readFileSync(CONFIG.outputFile, 'utf8'));
    console.log(`📖 读取到 ${profilesData.length} 个角色配置`);

    let createdFiles = 0;

    // 为每个角色创建单独的文件
    for (const profile of profilesData) {
      if (!profile.id) {
        console.warn('⚠️  跳过没有 ID 的角色配置');
        continue;
      }

      // 创建输出对象的副本，移除元数据
      const outputProfile = { ...profile };
      let targetPath;

      // 如果有源文件路径元数据，使用它来保持目录结构
      if (profile.$meta?.sourceFile) {
        targetPath = path.join(CONFIG.characterProfilesDir, profile.$meta.sourceFile);
        delete outputProfile.$meta;
      } else {
        // 否则使用 ID 作为文件名放在根目录
        const safeFileName = profile.id.replace(/[<>:"/\\|?*]/g, '-');
        const fileName = `${safeFileName}.json5`;
        targetPath = path.join(CONFIG.characterProfilesDir, fileName);
      }

      try {
        // 确保目标目录存在
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        fs.writeFileSync(targetPath, JSON.stringify(outputProfile, null, 2), 'utf8');
        const relativePath = path.relative(CONFIG.characterProfilesDir, targetPath);
        console.log(`✅ 已创建 ${relativePath}`);
        createdFiles++;
      } catch (error) {
        console.error(`❌ 创建 ${fileName} 失败:`, error.message);
      }
    }

    console.log(`\n🎉 成功将 ${profilesData.length} 个角色配置拆分到 ${createdFiles} 个文件中！`);
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
    mergeCharacterProfiles();
    break;
  case 'split':
    splitCharacterProfiles();
    break;
  case 'cleanup':
    cleanup();
    break;
  case 'build':
  default:
    // 默认行为：合并文件（用于构建）
    mergeCharacterProfiles();
    break;
}
