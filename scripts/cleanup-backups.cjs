const fs = require('fs');
const path = require('path');

/**
 * 清理项目中的所有备份文件
 */
function cleanupBackups() {
  console.log('🧹 开始清理备份文件...');

  let deletedCount = 0;

  function cleanDirectory(dir) {
    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // 跳过 node_modules 等目录
          if (!['node_modules', 'dist', '.git', '.vscode'].includes(item)) {
            cleanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          // 检查是否是备份文件（多种备份格式）
          const isBackupFile
            // UTF-8插件备份: filename.backup.timestamp
            = (item.includes('.backup.') && /\.backup\.\d+$/.test(item))
            // 通用备份: filename.backup
            || item.endsWith('.backup')
            // 其他常见备份格式: filename.bak, filename~, filename.old
            || item.endsWith('.bak')
            || item.endsWith('~')
            || item.endsWith('.old')
            // Vim/编辑器备份
            || item.startsWith('.#')
            // 临时文件
            || (item.startsWith('#') && item.endsWith('#'));

          if (isBackupFile) {
            try {
              fs.unlinkSync(fullPath);
              console.log(`🗑️  删除: ${path.relative(process.cwd(), fullPath)}`);
              deletedCount++;
            } catch (error) {
              console.error(`❌ 删除失败: ${path.relative(process.cwd(), fullPath)}`, error.message);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  无法读取目录 ${dir}:`, error.message);
    }
  }

  cleanDirectory(process.cwd());

  console.log(`\n✅ 清理完成，共删除 ${deletedCount} 个备份文件`);
}

// 如果直接运行此脚本
if (require.main === module) {
  cleanupBackups();
}

module.exports = { cleanupBackups };
