const fs = require('fs');
const path = require('path');

const iconv = require('iconv-lite');
const jschardet = require('jschardet');

/**
 * Vite 插件：UTF-8 编码检测和转换
 * 在构建过程中自动检测非UTF-8文件并转换为UTF-8编码
 */
function utf8EncodingPlugin(options = {}) {
  const defaultOptions = {
    // 需要检查的文件扩展名
    extensions: ['.vue', '.js', '.ts', '.json', '.css', '.scss', '.less', '.html', '.md', '.txt', '.cjs'],
    // 需要排除的目录
    excludeDirs: ['node_modules', 'dist', '.git', '.vscode'],
    // 是否在控制台显示详细信息
    verbose: true,
    // 是否自动转换文件（false时只警告）
    autoConvert: true,
    // 最小检测置信度 (0-1)
    minConfidence: 0.8,
  };

  const config = { ...defaultOptions, ...options };
  let hasChecked = false; // 防止重复检查

  const plugin = {
    name: 'utf8-encoding-plugin',

    buildStart() {
      if (!hasChecked) {
        plugin.checkProjectEncoding();
        hasChecked = true;
      }
    },

    configureServer(server) {
      // 在开发模式下也执行检查
      if (!hasChecked) {
        plugin.checkProjectEncoding();
        hasChecked = true;
      }
    },

    checkProjectEncoding() {
      const startTime = Date.now();
      let checkedFiles = 0;
      let convertedFiles = 0;
      const issues = [];

      console.log('🔍 开始检查文件编码...');

      const checkDirectory = (dir) => {
        try {
          const items = fs.readdirSync(dir);

          for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
              // 跳过排除的目录
              const relativePath = path.relative(process.cwd(), fullPath);
              const shouldExclude = config.excludeDirs.some(excludeDir => item === excludeDir
                || relativePath.startsWith(excludeDir)
                || relativePath.includes(`${path.sep}${excludeDir}${path.sep}`)
                || relativePath.endsWith(`${path.sep}${excludeDir}`));
              if (!shouldExclude) {
                checkDirectory(fullPath);
              }
            } else if (stat.isFile()) {
              // 检查文件扩展名
              const ext = path.extname(item).toLowerCase();
              if (config.extensions.includes(ext)) {
                if (config.verbose) {
                  console.log(`🔍 检查文件: ${path.relative(process.cwd(), fullPath)}`);
                }
                plugin.checkFileEncoding(fullPath, issues);
                checkedFiles++;
              }
            }
          }
        } catch (error) {
          if (config.verbose) {
            console.warn(`⚠️  无法读取目录 ${dir}:`, error.message);
          }
        }
      };

      // 从项目根目录开始检查
      checkDirectory(process.cwd());

      // 处理发现的编码问题
      for (const issue of issues) {
        if (config.autoConvert) {
          try {
            plugin.convertFileToUtf8(issue.filePath, issue.detectedEncoding);
            convertedFiles++;
            console.log(`✅ 已转换: ${path.relative(process.cwd(), issue.filePath)} (${issue.detectedEncoding} → UTF-8)`);
          } catch (error) {
            console.error(`❌ 转换失败: ${path.relative(process.cwd(), issue.filePath)}`, error.message);
          }
        } else {
          console.warn(`⚠️  编码警告: ${path.relative(process.cwd(), issue.filePath)} - 检测到 ${issue.detectedEncoding} 编码 (置信度: ${Math.round(issue.confidence * 100)}%)`);
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 输出总结
      console.log('\n📊 编码检查完成:');
      console.log(`   检查文件: ${checkedFiles} 个`);
      console.log(`   发现问题: ${issues.length} 个`);
      if (config.autoConvert) {
        console.log(`   成功转换: ${convertedFiles} 个`);
      }
      console.log(`   耗时: ${duration}ms\n`);

      if (issues.length > 0 && !config.autoConvert) {
        console.log('💡 提示: 设置 autoConvert: true 可以自动转换这些文件');
      }
    },

    checkFileEncoding(filePath, issues) {
      try {
        const buffer = fs.readFileSync(filePath);

        // 跳过空文件
        if (buffer.length === 0) return;

        // 跳过二进制文件（简单检测）
        if (plugin.isBinaryFile(buffer)) return;

        // 检测编码
        const detected = jschardet.detect(buffer);

        if (!detected || !detected.encoding) {
          if (config.verbose) {
            console.warn(`⚠️  无法检测编码: ${path.relative(process.cwd(), filePath)}`);
          }
          return;
        }

        const encoding = detected.encoding.toLowerCase();
        const confidence = detected.confidence || 0;

        // 如果置信度太低，跳过
        if (confidence < config.minConfidence) {
          return;
        }

        // 检查是否为UTF-8编码
        if (!plugin.isUtf8Encoding(encoding)) {
          issues.push({
            filePath,
            detectedEncoding: detected.encoding,
            confidence,
          });
        }
      } catch (error) {
        if (config.verbose) {
          console.warn(`⚠️  检查文件失败 ${path.relative(process.cwd(), filePath)}:`, error.message);
        }
      }
    },

    convertFileToUtf8(filePath, fromEncoding) {
      const buffer = fs.readFileSync(filePath);

      // 将原编码转换为UTF-8
      const utf8Content = iconv.decode(buffer, fromEncoding);
      const utf8Buffer = iconv.encode(utf8Content, 'utf8');

      // 备份原文件
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.writeFileSync(backupPath, buffer);

      // 写入UTF-8编码的内容
      fs.writeFileSync(filePath, utf8Buffer);

      if (config.verbose) {
        console.log(`📁 备份已保存: ${path.relative(process.cwd(), backupPath)}`);
      }
    },

    isUtf8Encoding(encoding) {
      const utf8Variants = ['utf-8', 'utf8', 'unicode', 'ascii'];
      return utf8Variants.some(variant => encoding.includes(variant) || encoding.includes(variant.replace('-', '')));
    },

    isBinaryFile(buffer) {
      // 简单的二进制文件检测：检查前1024字节中是否有null字符
      const sampleSize = Math.min(buffer.length, 1024);
      for (let i = 0; i < sampleSize; i++) {
        if (buffer[i] === 0) {
          return true;
        }
      }
      return false;
    },
  };

  return plugin;
}

module.exports = utf8EncodingPlugin;
