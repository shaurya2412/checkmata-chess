const { Chess } = require('chess.js');
const fs = require('fs');
try {
    const pgn = fs.readFileSync('C:\\Users\\Shivam\\OneDrive\\Desktop\\chess\\chess-main\\chess\\sample.pgn', 'utf8');
    const chess = new Chess();
    console.log('has load_pgn:', typeof chess.load_pgn);
    console.log('has loadPgn:', typeof chess.loadPgn);
    console.log('has load:', typeof chess.load);
    try {
        if (typeof chess.load_pgn === 'function') {
            chess.load_pgn(pgn);
            console.log('used load_pgn');
        } else if (typeof chess.loadPgn === 'function') {
            chess.loadPgn(pgn);
            console.log('used loadPgn');
        } else if (typeof chess.load === 'function') {
            console.log('load exists but not PGN loader');
        } else {
            console.log('no loader');
        }
    } catch (e) {
        console.error('loader error:', e);
    }
    console.log('history length', chess.history().length, 'history:', chess.history());
} catch (e) {
    console.error('read pgn failed', e);
}
