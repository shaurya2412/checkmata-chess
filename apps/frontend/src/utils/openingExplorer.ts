import { Chess } from 'chess.js';

export type OpeningNode = {
  san: string | null;
  count: number;
  whiteWins: number;
  blackWins: number;
  draws: number;
  children: Record<string, OpeningNode>;
};

export const createEmptyNode = (san: string | null = null): OpeningNode => ({
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

// Parse a PGN string containing one or more games and build opening tree
export function buildOpeningTreeFromPgn(pgnText: string): OpeningNode {
  const root = createEmptyNode(null);

  // Split into games by blank line between headers and moves
  // A very permissive split: two or more newlines
  const rawGames = pgnText
    .split(/\n\s*\n(?=\[)|\r\n\s*\r\n(?=\[)/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const raw of rawGames) {
    const result = parseResultFromHeaders(raw);

    const chess = new Chess();
    try {
      if (typeof (chess as any).load_pgn === 'function') {
        (chess as any).load_pgn(raw);
      } else if (typeof (chess as any).loadPgn === 'function') {
        (chess as any).loadPgn(raw);
      } else {
        // can't load PGN on this chess.js version — skip
        throw new Error('No PGN loader available');
      }
    } catch (e) {
      // skip malformed or unsupported game
      continue;
    }

    // Use SAN history to build opening path
    const history = chess.history();

    let node = root;
    node.count++;

    for (let ply = 0; ply < history.length; ply++) {
      const san = history[ply];
      if (!node.children[san]) {
        node.children[san] = createEmptyNode(san);
      }
      node = node.children[san];
      node.count++;
    }

    // assign result to root path (we'll credit the last node)
    if (history.length > 0) {
      const lastSan = history[history.length - 1];
      const lastNode = findNodeByPath(root, history);
      if (lastNode) {
        if (result === '1-0') lastNode.whiteWins++;
        else if (result === '0-1') lastNode.blackWins++;
        else if (result === '1/2-1/2') lastNode.draws++;
      }
    } else {
      // game with no moves
      if (result === '1-0') root.whiteWins++;
      else if (result === '0-1') root.blackWins++;
      else if (result === '1/2-1/2') root.draws++;
    }
  }

  // Aggregate child stats into parent nodes recursively
  aggregateStats(root);

  return root;
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

export function getSortedChildren(node: OpeningNode) {
  return Object.values(node.children).sort((a, b) => b.count - a.count);
}
