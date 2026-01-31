const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const JSON5 = require('json5');

const OUTPUT_FILE = path.resolve(__dirname, '../src/config/id-hash-map.json');

function md5(input) {
  return crypto.createHash('md5').update(input).digest('hex');
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

function buildHashMap() {
  const map = {};

  // Articles
  const articles = loadJson5(path.resolve(__dirname, '../src/config/articles.json5')) || [];
  for (const a of articles) {
    if (!a || !a.id) continue;
    map[String(a.id)] = md5(String(a.id));
  }

  // Images (group/child)
  const images = loadJson5(path.resolve(__dirname, '../src/config/images.json5')) || [];
  for (const img of images) {
    if (!img || !img.id) continue;
    // map group id itself
    map[String(img.id)] = md5(String(img.id));
    if (Array.isArray(img.childImages)) {
      for (const child of img.childImages) {
        if (!child || !child.id) continue;
        const key = `${img.id}/${child.id}`;
        map[key] = md5(key);
      }
    }
  }

  // Character profiles (character/variant/image)
  const chars = loadJson5(path.resolve(__dirname, '../src/config/character-profiles.json5')) || [];
  for (const c of chars) {
    if (!c || !c.id) continue;
    map[String(c.id)] = md5(String(c.id));
    if (Array.isArray(c.variants)) {
      for (const v of c.variants) {
        if (!v || !v.id) continue;
        map[`${c.id}/${v.id}`] = md5(`${c.id}/${v.id}`);
        if (Array.isArray(v.images)) {
          for (const im of v.images) {
            if (!im || !im.id) continue;
            const key = `${c.id}/${v.id}/${im.id}`;
            map[key] = md5(key);
          }
        }
      }
    }
  }

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

module.exports = { buildHashMap, saveMap };
