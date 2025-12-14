const { spawn } = require('child_process');
const path = require('path');

// Ensure SKIP_PRISMA is set for all child processes regardless of shell
const env = { ...process.env, SKIP_PRISMA: '1' };

console.log('Starting turbo dev with SKIP_PRISMA=1 (skips Prisma-dependent steps)');

const child = spawn('npx', ['turbo', 'dev'], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    env,
    shell: true,
});

child.on('exit', (code) => {
    process.exit(code);
});
