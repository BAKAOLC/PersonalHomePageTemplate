const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const sharp = require('sharp');

const CONFIG = {
  inputDir: path.resolve(__dirname, '../public/assets'),
  supportedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  webpQuality: 100,
  skipDirs: ['thumbnails'],
};

function askConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function isWebPFormat(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    return metadata.format === 'webp';
  } catch {
    return false;
  }
}

async function isAnimatedImage(filePath) {
  try {
    const metadata = await sharp(filePath, { animated: true }).metadata();
    return metadata.pages > 1;
  } catch {
    try {
      const metadata = await sharp(filePath).metadata();
      return metadata.pages > 1;
    } catch {
      return false;
    }
  }
}

async function getImageFiles(dir, files = []) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (CONFIG.skipDirs.includes(entry.name)) continue;
        await getImageFiles(fullPath, files);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (CONFIG.supportedFormats.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`扫描目录失败 ${dir}:`, error.message);
  }

  return files;
}

async function convertToWebp(filePath) {
  try {
    const isWebP = await isWebPFormat(filePath);
    if (isWebP) {
      return { skipped: true };
    }

    const isAnimated = await isAnimatedImage(filePath);

    const inputBuffer = await fs.readFile(filePath);
    const sharpInstance = sharp(inputBuffer, isAnimated ? { animated: true } : {});
    const outputBuffer = await sharpInstance
      .webp({
        quality: CONFIG.webpQuality,
        ...(isAnimated ? { animated: true } : {}),
      })
      .toBuffer();
    sharpInstance.destroy();

    await fs.writeFile(filePath, outputBuffer);

    return { success: true, animated: isAnimated };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 主函数
 * @param {boolean} skipConfirmation - 是否跳过确认
 * @returns {Promise<void>}
 */
async function main(skipConfirmation = false) {
  console.log('⚠️  警告：此脚本将直接修改原图文件！');
  console.log('⚠️  所有图像将被转换为 WebP 格式（最高质量）');
  console.log('⚠️  文件名将保持不变，但文件内容将被替换');
  console.log('⚠️  动画图像将保持为动画格式');
  console.log('⚠️  已经是 WebP 格式的文件将被跳过');
  console.log('');
  console.log('输入目录:', CONFIG.inputDir);
  console.log('');

  // 检查输入目录是否存在
  try {
    await fs.access(CONFIG.inputDir);
    console.log('✅ 输入目录存在');
  } catch {
    console.error('❌ 输入目录不存在:', CONFIG.inputDir);
    return;
  }

  // 检查 sharp 是否可用
  const sharpVersion = sharp.versions;
  console.log(`使用 Sharp ${sharpVersion.sharp} (libvips ${sharpVersion.vips})`);
  console.log('');

  // 获取所有图像文件
  console.log('正在扫描图像文件...');
  const imageFiles = await getImageFiles(CONFIG.inputDir);
  console.log(`找到 ${imageFiles.length} 个图像文件`);
  console.log('');

  if (imageFiles.length === 0) {
    console.log('没有找到图像文件');
    console.log('支持的格式:', CONFIG.supportedFormats.join(', '));
    return;
  }

  // 显示前几个文件作为示例
  console.log('示例文件:');
  imageFiles.slice(0, 5).forEach(file => {
    console.log(' -', path.relative(CONFIG.inputDir, file));
  });
  if (imageFiles.length > 5) {
    console.log(` ... 还有 ${imageFiles.length - 5} 个文件`);
  }
  console.log('');

  // 用户确认
  let confirmed = true;
  if (!skipConfirmation) {
    confirmed = await askConfirmation(
      `⚠️  确定要继续吗？这将修改 ${imageFiles.length} 个文件！(y/n): `,
    );
  } else {
    console.log(`⚠️  跳过确认，将修改 ${imageFiles.length} 个文件`);
  }

  if (!confirmed) {
    console.log('操作已取消');
    return;
  }

  // 开始转换
  console.log('\n开始转换图像...');
  const startTime = Date.now();
  const results = { success: 0, failed: 0, skipped: 0, animated: 0 };

  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = imageFiles[i];
    const relativePath = path.relative(CONFIG.inputDir, imagePath);

    process.stdout.write(`[${i + 1}/${imageFiles.length}] ${relativePath} ... `);

    const result = await convertToWebp(imagePath);

    if (result.skipped) {
      results.skipped++;
      console.log('跳过');
    } else if (result.success) {
      results.success++;
      if (result.animated) {
        results.animated++;
        console.log('✓ (动画)');
      } else {
        console.log('✓');
      }
    } else {
      results.failed++;
      console.log(`✗ ${result.error || '未知错误'}`);
    }
  }

  const endTime = Date.now();

  console.log(`\n✅ 转换完成! 耗时: ${((endTime - startTime) / 1000).toFixed(2)} 秒`);
  console.log(`📊 统计: 成功 ${results.success} 个，跳过 ${results.skipped} 个，失败 ${results.failed} 个`);
  console.log(`🎬 动画图像: ${results.animated} 个`);
}

// 如果直接运行此脚本
if (require.main === module) {
  // 解析命令行参数
  const args = process.argv.slice(2);
  const skipConfirmation = args.includes('--yes') || args.includes('-y');
  
  main(skipConfirmation).catch((error) => {
    console.error('转换图像时发生错误:', error);
    process.exit(1);
  });
}

module.exports = { main, CONFIG };
