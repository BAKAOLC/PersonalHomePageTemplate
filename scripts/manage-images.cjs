const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  imagesDir: path.join(__dirname, '../src/config/images'),
  outputFile: path.join(__dirname, '../src/config/images.json'),
  backupFile: path.join(__dirname, '../src/config/images.json.backup'),
};

/**
 * 验证图片对象是否有效
 */
function isValidImageObject(obj) {
  if (!obj || typeof obj !== 'object') return false;

  // 必须有 id
  if (!obj.id || typeof obj.id !== 'string') return false;

  // 必须有 src 或 childImages
  if (!obj.src && !obj.childImages) return false;

  // 如果有 src，必须是字符串
  if (obj.src && typeof obj.src !== 'string') return false;

  // 如果有 childImages，必须是数组
  if (obj.childImages && !Array.isArray(obj.childImages)) return false;

  // 如果有 tags，必须是数组
  if (obj.tags && !Array.isArray(obj.tags)) return false;

  // 如果有 characters，必须是数组
  if (obj.characters && !Array.isArray(obj.characters)) return false;

  return true;
}

/**
 * 读取 images 目录下的所有 JSON 文件并合并
 */
function mergeImages() {
  try {
    // 检查 images 目录是否存在
    if (!fs.existsSync(CONFIG.imagesDir)) {
      console.log('📁 images 目录不存在，跳过合并');
      return;
    }

    // 读取所有 JSON 文件，排除隐藏文件和特殊文件
    const files = fs.readdirSync(CONFIG.imagesDir)
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
      console.log('💾 已备份现有的 images.json');
    }

    let allImages = [];
    let totalCount = 0;

    // 合并所有文件
    for (const file of files) {
      const filePath = path.join(CONFIG.imagesDir, file);
      const fileName = path.basename(file, '.json');

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);

        if (Array.isArray(data)) {
          // 验证数组中的每个对象
          const validImages = data.filter(item => isValidImageObject(item));
          if (validImages.length !== data.length) {
            console.warn(`⚠️  ${fileName}.json 中有 ${data.length - validImages.length} 个无效图片对象被跳过`);
          }
          allImages = allImages.concat(validImages);
          console.log(`✅ 已合并 ${fileName}.json (${validImages.length} 个图片)`);
          totalCount += validImages.length;
        } else if (typeof data === 'object' && data !== null) {
          // 如果是单个对象，验证并包装成数组
          if (isValidImageObject(data)) {
            allImages.push(data);
            console.log(`✅ 已合并 ${fileName}.json (1 个图片)`);
            totalCount += 1;
          } else {
            console.warn(`⚠️  跳过 ${file}: 图片对象格式无效`);
          }
        } else {
          console.warn(`⚠️  跳过 ${file}: 不是有效的图片数据格式`);
        }
      } catch (error) {
        console.error(`❌ 读取 ${file} 失败:`, error.message);
      }
    }

    // 去重（基于 id）
    const uniqueImages = [];
    const seenIds = new Set();

    for (const image of allImages) {
      if (image.id && seenIds.has(image.id)) {
        console.warn(`⚠️  发现重复 ID: ${image.id}，跳过重复项`);
        continue;
      }
      if (image.id) {
        seenIds.add(image.id);
      }
      uniqueImages.push(image);
    }

    // 按日期排序（最新的在前）
    uniqueImages.sort((a, b) => {
      const dateA = new Date(a.date || '1970-01-01');
      const dateB = new Date(b.date || '1970-01-01');
      return dateB - dateA;
    });

    // 写入合并后的文件
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(uniqueImages, null, 2), 'utf8');

    console.log(`\n🎉 成功合并 ${files.length} 个文件，共 ${uniqueImages.length} 个图片到 images.json！`);
    if (totalCount !== uniqueImages.length) {
      console.log(`📝 去重了 ${totalCount - uniqueImages.length} 个重复项`);
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
 * 将大的 images.json 拆分成多个小文件，以图像 ID 为文件名
 */
function splitImages() {
  try {
    if (!fs.existsSync(CONFIG.outputFile)) {
      console.error('❌ images.json 不存在，无法拆分');
      process.exit(1);
    }

    // 确保输出目录存在
    if (!fs.existsSync(CONFIG.imagesDir)) {
      fs.mkdirSync(CONFIG.imagesDir, { recursive: true });
    }

    const imagesData = JSON.parse(fs.readFileSync(CONFIG.outputFile, 'utf8'));
    console.log(`📖 读取到 ${imagesData.length} 个图片`);

    let createdFiles = 0;

    // 为每个图像创建单独的文件，以 ID 为文件名
    for (const image of imagesData) {
      if (!image.id) {
        console.warn('⚠️  跳过没有 ID 的图像');
        continue;
      }

      // 清理文件名，移除不安全的字符
      const safeFileName = image.id.replace(/[<>:"/\\|?*]/g, '-');
      const fileName = `${safeFileName}.json`;
      const filePath = path.join(CONFIG.imagesDir, fileName);

      try {
        fs.writeFileSync(filePath, JSON.stringify(image, null, 2), 'utf8');
        console.log(`✅ 已创建 ${fileName}`);
        createdFiles++;
      } catch (error) {
        console.error(`❌ 创建 ${fileName} 失败:`, error.message);
      }
    }

    console.log(`\n🎉 成功将 ${imagesData.length} 个图片拆分到 ${createdFiles} 个文件中！`);
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
    mergeImages();
    break;
  case 'split':
    splitImages();
    break;
  case 'cleanup':
    cleanup();
    break;
  case 'build':
  default:
    // 默认行为：合并文件（用于构建）
    mergeImages();
    break;
}
