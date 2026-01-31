/**
 * JSON5 写入工具
 * 提供带注释的 JSON5 格式输出
 */

const JSON5 = require('json5');

/**
 * 将数据格式化为 JSON5 字符串（带注释和尾随逗号）
 * @param {any} data - 要格式化的数据
 * @param {string} [fileType='config'] - 文件类型（用于添加合适的注释）
 * @returns {string} 格式化后的 JSON5 字符串
 */
function formatJSON5(data, fileType = 'config') {
  // 生成头部注释
  const header = generateHeader(fileType);

  // 使用 JSON5.stringify 生成基础 JSON5
  // 注意：JSON5.stringify 不会自动添加尾随逗号，我们需要手动处理
  const jsonString = JSON5.stringify(data, null, 2);

  // 添加尾随逗号
  const json5String = addTrailingCommas(jsonString);

  return `${header + json5String}\n`;
}

/**
 * 生成文件头部注释
 * @param {string} fileType - 文件类型
 * @returns {string} 头部注释
 */
function generateHeader(fileType) {
  const now = new Date().toISOString().replace('T', ' ').replace('Z', '');

  const headers = {
    images: `// 图片配置文件
// 此文件由脚本自动生成，请勿手动编辑
// 使用 npm run images-config:split 分割配置
// 使用 npm run images-config:merge 合并配置
// 最后更新: ${now}

`,
    articles: `// 文章配置文件
// 此文件由脚本自动生成，请勿手动编辑
// 使用 npm run articles-config:split 分割配置
// 使用 npm run articles-config:merge 合并配置
// 最后更新: ${now}

`,
    characterProfiles: `// 角色档案配置文件
// 此文件由脚本自动生成，请勿手动编辑
// 使用 npm run character-profiles-config:split 分割配置
// 使用 npm run character-profiles-config:merge 合并配置
// 最后更新: ${now}

`,
    config: `// 配置文件 (JSON5 格式)
// 支持注释和尾随逗号
// 最后更新: ${now}

`,
  };

  return headers[fileType] || headers.config;
}

/**
 * 为 JSON 字符串添加尾随逗号，转换为 JSON5 格式
 * @param {string} jsonString - JSON 字符串
 * @returns {string} 添加尾随逗号后的字符串
 */
function addTrailingCommas(jsonString) {
  // 在对象和数组的最后一个元素后添加逗号
  // 匹配 "key": value 或 value 后跟换行和缩进，然后是 } 或 ]
  return jsonString
    .replace(/("(?:[^"\\]|\\.)*"|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)(\s*\n\s*)(\}|\])/g, '$1,$2$3')
    .replace(/(\})(\s*\n\s*)(\}|\])/g, '$1,$2$3')
    .replace(/(\])(\s*\n\s*)(\}|\])/g, '$1,$2$3');
}

/**
 * 将数据写入 JSON5 文件
 * @param {string} filePath - 文件路径
 * @param {any} data - 要写入的数据
 * @param {string} [fileType='config'] - 文件类型
 */
function writeJSON5File(filePath, data, fileType = 'config') {
  const fs = require('fs');
  const content = formatJSON5(data, fileType);
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * 同步方式写入 JSON5 文件
 * @param {string} filePath - 文件路径
 * @param {any} data - 要写入的数据
 * @param {string} [fileType='config'] - 文件类型
 */
function writeJSON5FileSync(filePath, data, fileType = 'config') {
  const fs = require('fs');
  const content = formatJSON5(data, fileType);
  fs.writeFileSync(filePath, content, 'utf8');
}

module.exports = {
  formatJSON5,
  writeJSON5File,
  writeJSON5FileSync,
  addTrailingCommas,
};
