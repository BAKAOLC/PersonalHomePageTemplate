const { spawnSync } = require('child_process');
const { createHash } = require('crypto');
const { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } = require('fs');
const { relative, resolve, sep } = require('path');

const repoRoot = process.cwd();
const thumbnailCacheFile = resolve(repoRoot, '.thumbnail-cache.json');
const thumbnailsDir = resolve(repoRoot, 'public/assets/thumbnails');
const cacheVersion = 'v4';

const toPosixPath = filePath => filePath.split(sep).join('/');

const hashValue = value => createHash('sha256').update(value).digest('hex');

const hashFile = filePath => {
  if (!existsSync(filePath)) return '';
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
};

const collectFiles = dir => {
  if (!existsSync(dir)) return [];

  const files = [];
  const visit = currentDir => {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = resolve(currentDir, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  };

  visit(dir);
  return files.sort((left, right) => left.localeCompare(right));
};

const hashDirectory = dir => {
  const files = collectFiles(dir);
  if (files.length === 0) return '';

  return hashValue(files.map(file => {
    const path = toPosixPath(relative(repoRoot, file));
    return `${path}\0${statSync(file).size}\0${hashFile(file)}`;
  }).join('\n'));
};

const writeOutput = (key, value) => {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  appendFileSync(outputPath, `${key}=${value}\n`);
};

const runNpm = args => {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const commandArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm ${args.join(' ')}`]
    : args;
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const shouldSave = ({ matchedKey, expectedKey, beforeHash, afterHash }) => {
  return matchedKey !== expectedKey || beforeHash !== afterHash;
};

const prepare = () => {
  const combinedHash = process.env.THUMBNAIL_COMBINED_HASH;
  if (!combinedHash) {
    console.error('THUMBNAIL_COMBINED_HASH is required.');
    process.exit(1);
  }

  const cacheFileMatchedKey = process.env.THUMBNAIL_CACHE_MATCHED_KEY || '';
  const thumbnailsMatchedKey = process.env.THUMBNAILS_CACHE_MATCHED_KEY || '';
  const expectedCacheFileKey = `thumbnail-cache-${cacheVersion}-${combinedHash}`;
  const expectedThumbnailsKey = `thumbnails-${cacheVersion}-${combinedHash}`;

  mkdirSync(thumbnailsDir, { recursive: true });

  console.log('Thumbnail cache restore state');
  console.log(`  cache file hit: ${process.env.THUMBNAIL_CACHE_HIT || ''}`);
  console.log(`  thumbnails hit: ${process.env.THUMBNAILS_CACHE_HIT || ''}`);
  console.log(`  cache file matched key: ${cacheFileMatchedKey || 'none'}`);
  console.log(`  thumbnails matched key: ${thumbnailsMatchedKey || 'none'}`);
  console.log(`  current source hash: ${combinedHash}`);

  const cacheFileBefore = hashFile(thumbnailCacheFile);
  const thumbnailsBefore = hashDirectory(thumbnailsDir);

  console.log(`  cache file hash before: ${cacheFileBefore || 'none'}`);
  console.log(`  thumbnails hash before: ${thumbnailsBefore || 'none'}`);
  console.log('Running prebuild...');

  runNpm(['run', 'prebuild']);

  const cacheFileAfter = hashFile(thumbnailCacheFile);
  const thumbnailsAfter = hashDirectory(thumbnailsDir);

  console.log(`  cache file hash after: ${cacheFileAfter || 'none'}`);
  console.log(`  thumbnails hash after: ${thumbnailsAfter || 'none'}`);

  const thumbnailCacheNeedsSave = shouldSave({
    matchedKey: cacheFileMatchedKey,
    expectedKey: expectedCacheFileKey,
    beforeHash: cacheFileBefore,
    afterHash: cacheFileAfter,
  });
  const thumbnailsNeedsSave = shouldSave({
    matchedKey: thumbnailsMatchedKey,
    expectedKey: expectedThumbnailsKey,
    beforeHash: thumbnailsBefore,
    afterHash: thumbnailsAfter,
  });

  writeOutput('thumbnail-cache-needs-save', String(thumbnailCacheNeedsSave));
  writeOutput('thumbnails-needs-save', String(thumbnailsNeedsSave));

  console.log('Thumbnail cache save decision');
  console.log(`  cache file expected key: ${expectedCacheFileKey}`);
  console.log(`  thumbnails expected key: ${expectedThumbnailsKey}`);
  console.log(`  cache file needs save: ${thumbnailCacheNeedsSave}`);
  console.log(`  thumbnails need save: ${thumbnailsNeedsSave}`);
};

const summary = () => {
  const combinedHash = process.env.THUMBNAIL_COMBINED_HASH || '';
  const thumbnailCacheNeedsSave = process.env.THUMBNAIL_CACHE_NEEDS_SAVE || 'false';
  const thumbnailsNeedsSave = process.env.THUMBNAILS_NEED_SAVE || 'false';
  const thumbnailCount = collectFiles(thumbnailsDir).length;

  console.log('Thumbnail cache summary');
  console.log(`  structure hash: ${process.env.THUMBNAIL_STRUCTURE_HASH || ''}`);
  console.log(`  content hash: ${process.env.THUMBNAIL_CONTENT_HASH || ''}`);
  console.log(`  script hash: ${process.env.THUMBNAIL_SCRIPT_HASH || ''}`);
  console.log(`  combined hash: ${combinedHash}`);

  if (existsSync(thumbnailCacheFile)) {
    console.log(`  cache file: present (${hashFile(thumbnailCacheFile)})`);
    console.log(`  cache file uploaded: ${thumbnailCacheNeedsSave}`);
    console.log(`  cache file key: thumbnail-cache-${cacheVersion}-${combinedHash}`);
  } else {
    console.log('  cache file: missing');
  }

  console.log(`  thumbnails: ${thumbnailCount} file(s)`);
  console.log(`  thumbnails uploaded: ${thumbnailsNeedsSave}`);
  console.log(`  thumbnails key: thumbnails-${cacheVersion}-${combinedHash}`);
};

const command = process.argv[2];
if (command === 'prepare') {
  prepare();
} else if (command === 'summary') {
  summary();
} else {
  console.error('Usage: node scripts/ci/thumbnail-cache.cjs <prepare|summary>');
  process.exit(1);
}
