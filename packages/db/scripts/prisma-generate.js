const { execSync } = require('child_process');
const path = require('path');

// If SKIP_PRISMA env var is set, skip generation (useful on Windows/OneDrive dev machines)
if (process.env.SKIP_PRISMA === '1') {
    console.log('SKIP_PRISMA=1 detected — skipping prisma generate');
    process.exit(0);
}

try {
    const prismaCmd = 'npx prisma generate';
    console.log('Running:', prismaCmd);
    execSync(prismaCmd, { stdio: 'inherit', cwd: path.resolve(__dirname, '..', '..') });
    process.exit(0);
} catch (err) {
    console.error('prisma generate failed:', err && err.message ? err.message : err);
    process.exit(1);
}
