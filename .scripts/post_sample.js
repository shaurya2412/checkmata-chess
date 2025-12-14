const fs = require('fs');
const path = require('path');
(async () => {
    try {
        // Use absolute path to sample.pgn in workspace root to avoid cwd issues
        const pgnPath = 'C:\\Users\\Shivam\\OneDrive\\Desktop\\chess\\chess-main\\chess\\sample.pgn';
        const pgn = fs.readFileSync(pgnPath, 'utf8');
        const res = await fetch('http://127.0.0.1:3000/v1/openings', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ pgn }),
        });
        const json = await res.json();
        console.log(JSON.stringify(json, null, 2));
    } catch (e) {
        console.error('POST failed:', e);
        process.exit(1);
    }
})();
