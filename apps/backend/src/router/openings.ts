import { Router } from 'express';
import { Chess } from 'chess.js';

const router = Router();

type OpeningNode = {
  san: string | null;
  count: number;
  whiteWins: number;
  blackWins: number;
  draws: number;
  children: Record<string, OpeningNode>;
};

const createEmptyNode = (san: string | null = null): OpeningNode => ({
  san,
  count: 0,
  whiteWins: 0,
  blackWins: 0,
  draws: 0,
  children: {},
});

function parseResultFromHeaders(pgn: string): '1-0' | '0-1' | '1/2-1/2' | '*' {
  const m = pgn.match(/\[Result\s+"(.+?)"\]/);
  if (!m) return '*';
  return (m[1] as any) || '*';
}

function findNodeByPath(root: OpeningNode, path: string[]): OpeningNode | null {
  let node: OpeningNode | null = root;
  for (const san of path) {
    if (!node.children[san]) return null;
    node = node.children[san];
  }
  return node;
}

function aggregateStats(node: OpeningNode) {
  for (const key of Object.keys(node.children)) {
    const child = node.children[key];
    aggregateStats(child);
    node.whiteWins += child.whiteWins;
    node.blackWins += child.blackWins;
    node.draws += child.draws;
  }
}

export function buildOpeningTreeFromPgn(pgnText: string): OpeningNode {
  const root = createEmptyNode(null);

  const rawGames = pgnText
    .split(/\n\s*\n(?=\[)|\r\n\s*\r\n(?=\[)/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const raw of rawGames) {
    const result = parseResultFromHeaders(raw);
    const chess = new Chess();
    try {
      // chess.js versions expose different PGN loaders across releases
      if (typeof (chess as any).load_pgn === 'function') {
        (chess as any).load_pgn(raw);
      } else if (typeof (chess as any).loadPgn === 'function') {
        (chess as any).loadPgn(raw);
      } else {
        // Unable to load PGN with this chess.js version
        throw new Error('No PGN loader available');
      }
    } catch (e) {
      // skip malformed or unsupported game
      continue;
    }

    const history = chess.history();
    let node = root;
    node.count++;

    for (let ply = 0; ply < history.length; ply++) {
      const san = history[ply];
      if (!node.children[san]) node.children[san] = createEmptyNode(san);
      node = node.children[san];
      node.count++;
    }

    if (history.length > 0) {
      const lastNode = findNodeByPath(root, history);
      if (lastNode) {
        if (result === '1-0') lastNode.whiteWins++;
        else if (result === '0-1') lastNode.blackWins++;
        else if (result === '1/2-1/2') lastNode.draws++;
      }
    } else {
      if (result === '1-0') root.whiteWins++;
      else if (result === '0-1') root.blackWins++;
      else if (result === '1/2-1/2') root.draws++;
    }
  }

  aggregateStats(root);
  return root;
}

router.post('/', (req, res) => {
  const { pgn } = req.body;
  if (!pgn || typeof pgn !== 'string') {
    return res.status(400).json({ error: 'pgn required' });
  }

  if (pgn.trim().length === 0) {
    return res.status(400).json({ error: 'pgn cannot be empty' });
  }

  try {
    const tree = buildOpeningTreeFromPgn(pgn);
    // Add metadata: root.count represents total games parsed
    const response = {
      ...tree,
      // Root count is the total number of games
      totalGames: tree.count,
    };
    return res.json(response);
  } catch (err) {
    console.error('Error building opening tree', err);
    return res.status(500).json({
      error: 'Failed to parse PGN file',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

export default router;
