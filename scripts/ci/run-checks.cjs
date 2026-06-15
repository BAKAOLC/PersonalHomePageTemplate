const { spawnSync } = require('child_process');

const steps = [
  ['lint', ['run', 'lint']],
  ['typecheck', ['run', 'typecheck']],
  ['build', ['run', 'ci-build']],
];

for (const [name, args] of steps) {
  console.log(`Running ${name}...`);
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const commandArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm ${args.join(' ')}`]
    : args;
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error);
  }

  if (result.status !== 0) {
    console.error(`${name} failed.`);
    process.exit(result.status ?? 1);
  }
}

console.log('CI checks passed.');
