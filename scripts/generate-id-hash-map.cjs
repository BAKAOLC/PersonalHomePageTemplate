const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const JSON5 = require('json5');

const OUTPUT_FILE = path.resolve(__dirname, '../src/config/id-hash-map.json');

// Base58 字符集（去除容易混淆的字符：0, O, I, l）
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// 配置：生成的 hash 长度（字符数）
const HASH_LENGTH = 8;

/**
 * 将 Buffer 转换为 Base58 编码
 * @param {Buffer} buffer - 要编码的 Buffer
 * @returns {string} Base58 编码的字符串
 */
function toBase58(buffer) {
  const digits = [0];

  for (let i = 0; i < buffer.length; i++) {
    let carry = buffer[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  // 转换为 Base58 字符串
  let result = '';
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }

  // 处理前导零
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    result = BASE58_ALPHABET[0] + result;
  }

  return result || BASE58_ALPHABET[0];
}

/**
 * 使用 SHA-256 生成短 hash
 * @param {string} input - 输入字符串
 * @param {number} length - 期望的 hash 长度
 * @param {number} offset - 偏移量（用于处理碰撞）
 * @returns {string} 生成的短 hash
 */
function generateHash(input, length = HASH_LENGTH, offset = 0) {
  const fullInput = offset > 0 ? `${input}:${offset}` : input;
  const hash = crypto.createHash('sha256').update(fullInput).digest();

  // 转换为 Base58 编码
  const base58 = toBase58(hash);

  // 截取指定长度
  return base58.substring(0, length);
}

function loadJson5(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON5.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.warn(`⚠️  无法读取 ${filePath}: ${e.message}`);
    return null;
  }
}

/**
 * 添加 hash 到 map，处理碰撞
 * @param {Object} map - hash map 对象
 * @param {Object} reverseMap - 反向 map（hash -> id）用于检测碰撞
 * @param {Object} collisions - 记录碰撞信息
 * @param {string} id - 原始 ID
 * @returns {string} 生成的 hash
 */
function addHashToMap(map, reverseMap, collisions, id) {
  let offset = 0;
  let hash = generateHash(id, HASH_LENGTH, offset);

  // 检测并处理碰撞
  while (reverseMap[hash] && reverseMap[hash] !== id) {
    console.warn(`⚠️  Hash 碰撞检测: "${id}" 与 "${reverseMap[hash]}" 生成了相同的 hash "${hash}"`);
    offset++;
    hash = generateHash(id, HASH_LENGTH, offset);

    // 记录碰撞信息
    if (!collisions[hash]) {
      collisions[hash] = [];
    }
    collisions[hash].push({ id, offset });

    // 防止无限循环（理论上不应该发生）
    if (offset > 1000) {
      console.error(`❌ 无法为 "${id}" 生成唯一 hash，已尝试 ${offset} 次`);
      // 使用更长的 hash 作为后备方案
      hash = generateHash(id, HASH_LENGTH + 4, 0);
      break;
    }
  }

  map[id] = hash;
  reverseMap[hash] = id;

  if (offset > 0) {
    console.log(`✅ 碰撞已解决: "${id}" -> "${hash}" (offset: ${offset})`);
  }

  return hash;
}

function buildHashMap() {
  const map = {};
  const reverseMap = {}; // hash -> id，用于检测碰撞
  const collisions = {}; // 记录碰撞信息

  // Articles
  const articles = loadJson5(path.resolve(__dirname, '../src/config/articles.json5')) || [];
  for (const a of articles) {
    if (!a || !a.id) continue;
    addHashToMap(map, reverseMap, collisions, String(a.id));
  }

  // Images (group/child)
  const images = loadJson5(path.resolve(__dirname, '../src/config/images.json5')) || [];
  for (const img of images) {
    if (!img || !img.id) continue;
    // map group id itself
    addHashToMap(map, reverseMap, collisions, String(img.id));
    if (Array.isArray(img.childImages)) {
      for (const child of img.childImages) {
        if (!child || !child.id) continue;
        const key = `${img.id}/${child.id}`;
        addHashToMap(map, reverseMap, collisions, key);
      }
    }
  }

  // Character profiles (character/variant/image)
  const chars = loadJson5(path.resolve(__dirname, '../src/config/character-profiles.json5')) || [];
  for (const c of chars) {
    if (!c || !c.id) continue;
    addHashToMap(map, reverseMap, collisions, String(c.id));
    if (Array.isArray(c.variants)) {
      for (const v of c.variants) {
        if (!v || !v.id) continue;
        addHashToMap(map, reverseMap, collisions, `${c.id}/${v.id}`);
        if (Array.isArray(v.images)) {
          for (const im of v.images) {
            if (!im || !im.id) continue;
            const key = `${c.id}/${v.id}/${im.id}`;
            addHashToMap(map, reverseMap, collisions, key);
          }
        }
      }
    }
  }

  // 输出统计信息
  const totalIds = Object.keys(map).length;
  const totalCollisions = Object.keys(collisions).length;
  console.log('\n📊 统计信息:');
  console.log(`   - 总 ID 数量: ${totalIds}`);
  console.log(`   - Hash 长度: ${HASH_LENGTH} 字符`);
  console.log('   - 编码方式: Base58 (无混淆字符)');
  console.log('   - Hash 算法: SHA-256');
  if (totalCollisions > 0) {
    console.log(`   - 碰撞次数: ${totalCollisions}`);
  } else {
    console.log('   - 碰撞次数: 0 ✅');
  }

  // 计算理论碰撞概率
  const totalPossibleHashes = Math.pow(58, HASH_LENGTH);
  const collisionProbability = (1 - Math.exp(-Math.pow(totalIds, 2) / (2 * totalPossibleHashes))) * 100;
  console.log(`   - 理论碰撞概率: ${collisionProbability.toFixed(6)}%`);

  return map;
}

function saveMap(map) {
  try {
    // eslint-disable-next-line no-restricted-properties
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(map, null, 2));
    console.log(`✅ id-hash-map 已写入: ${path.relative(process.cwd(), OUTPUT_FILE)}`);
    return true;
  } catch (e) {
    console.error('❌ 写入 id-hash-map 失败:', e.message);
    return false;
  }
}

function main() {
  const map = buildHashMap();
  return saveMap(map);
}

if (require.main === module) {
  process.exit(main() ? 0 : 1);
}

module.exports = { buildHashMap, saveMap, generateHash };
