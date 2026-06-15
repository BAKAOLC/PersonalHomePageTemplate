const { createHash } = require('crypto');
const { existsSync, readdirSync, readFileSync, statSync } = require('fs');
const { relative, resolve, sep } = require('path');

const repoRoot = process.cwd();
const assetsDir = resolve(repoRoot, 'public/assets');
const thumbnailsDir = resolve(assetsDir, 'thumbnails');
const imageExtensions = new Set(['.gif', '.jpg', '.jpeg', '.png', '.webp']);

const toPosixPath = filePath => filePath.split(sep).join('/');

const sha256 = value => createHash('sha256').update(value).digest('hex');

const hashFile = filePath => {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
};

const isInside = (child, parent) => {
  const childPath = resolve(child);
  const parentPath = resolve(parent);
  return childPath === parentPath || childPath.startsWith(`${parentPath}${sep}`);
};

const collectImageFiles = dir => {
  if (!existsSync(dir)) return [];

  const files = [];
  const visit = currentDir => {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = resolve(currentDir, entry.name);

      if (isInside(fullPath, thumbnailsDir)) {
        continue;
      }

      if (entry.isDirectory()) {
        visit(fullPath);
        continue;
      }

      if (entry.isFile()) {
        const extension = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
        if (imageExtensions.has(extension)) {
          files.push(fullPath);
        }
      }
    }
  };

  visit(dir);
  return files.sort((left, right) => left.localeCompare(right));
};

const writeGitHubOutput = outputs => {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;

  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
  require('fs').appendFileSync(outputPath, `${lines.join('\n')}\n`);
};

const files = collectImageFiles(assetsDir);
const relativePaths = files.map(file => toPosixPath(relative(repoRoot, file)));

const structureHash = sha256(relativePaths.join('\n'));
const contentHash = sha256(files.map((file, index) => {
  return `${relativePaths[index]}\0${statSync(file).size}\0${hashFile(file)}`;
}).join('\n'));
const scriptHash = hashFile(resolve(repoRoot, 'scripts/generate-thumbnails.cjs'));
const combinedHash = sha256(`${structureHash}-${contentHash}-${scriptHash}`);

const outputs = {
  'structure-hash': structureHash,
  'content-hash': contentHash,
  'script-hash': scriptHash,
  'combined-hash': combinedHash,
};

writeGitHubOutput(outputs);

console.log('Asset cache source hash');
console.log(`  source images: ${files.length}`);
console.log(`  structure hash: ${structureHash}`);
console.log(`  content hash: ${contentHash}`);
console.log(`  script hash: ${scriptHash}`);
console.log(`  combined hash: ${combinedHash}`);
