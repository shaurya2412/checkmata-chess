const { execSync } = require('child_process');
const path = require('path');

if (process.env.SKIP_PRISMA === '1') {
    console.log('SKIP_PRISMA=1 detected — skipping ws dev (Prisma-dependent service)');
    process.exit(0);
}

try {
    // Mark Prisma Client and @repo/db as external so they're not bundled
    // Prisma needs access to its query engine binaries which can't be bundled
    const cmd = 'esbuild ./src/index.ts --bundle --platform=node --outfile=dist/index.js --sourcemap --external:@prisma/client --external:@prisma/client/runtime/library --external:@repo/db && node dist/index.js';
    console.log('Running ws dev command...');
    execSync(cmd, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
} catch (err) {
    console.error('ws dev failed:', err && err.message ? err.message : err);
    process.exit(1);
}
