import React, { useMemo, useState, useCallback } from 'react';
import { buildOpeningTreeFromPgn, getSortedChildren, OpeningNode } from '../utils/openingExplorer';
import { Chess } from 'chess.js';
import ECO_DATA from '../utils/eco.json';
import ECO_FULL from '../utils/eco_full.json';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/Loader';
import { useNavigate } from 'react-router-dom';
import { getBackendUrl } from '../lib/utils';
import {
  Upload,
  Search,
  TrendingUp,
  BarChart3,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Info,
  HelpCircle,
  BookOpen,
  X,
  Download,
} from 'lucide-react';

type EcoEntry = { code: string; name: string };

function normalizeSan(s: string) {
  return s.replace(/[^a-z0-9+#]/gi, '').toLowerCase();
}

function lookupEco(path: string[]): EcoEntry | null {
  // normalize path into space-separated key
  const normalized = path.map(normalizeSan).filter(Boolean);
  // try ECO_FULL first (longer prefixes up to 10 plies)
  for (let len = Math.min(10, normalized.length); len >= 1; len--) {
    const key = normalized.slice(0, len).join(' ');
    if ((ECO_FULL as Record<string, EcoEntry>)[key]) return (ECO_FULL as Record<string, EcoEntry>)[key];
  }
  // fallback to the small ECO_DATA (try up to 6 plies)
  for (let len = Math.min(6, normalized.length); len >= 1; len--) {
    const key = normalized.slice(0, len).join(' ');
    if ((ECO_DATA as Record<string, EcoEntry>)[key]) return (ECO_DATA as Record<string, EcoEntry>)[key];
  }
  return null;
}

// Calculate best move score (weighted by popularity and win rate)
function calculateBestMoveScore(node: OpeningNode, isWhite: boolean): number {
  const total = node.count || 1;
  const winRate = isWhite ? node.whiteWins / total : node.blackWins / total;
  // Combine popularity (count) and win rate
  return node.count * winRate;
}

const TreeNode: React.FC<{
  node: OpeningNode;
  path: string[];
  search: string;
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
  onSelect: (key: string) => void;
  selectedPath?: string | null;
  isBest?: boolean;
  moveNumber: number;
}> = ({ node, path, search, expanded, onToggle, onSelect, selectedPath, isBest, moveNumber }) => {
  const key = path.join('|||');
  const children = getSortedChildren(node);
  const matchesSearch = search ? node.san?.toLowerCase().includes(search.toLowerCase()) : true;

  // Calculate stats
  const total = Math.max(1, node.count);
  const whiteRate = (node.whiteWins / total) * 100;
  const drawRate = (node.draws / total) * 100;
  const blackRate = (node.blackWins / total) * 100;

  // if search is active, show nodes that match or have matching descendants
  const subtreeHasMatch = (n: OpeningNode): boolean => {
    if (search && n.san && n.san.toLowerCase().includes(search.toLowerCase())) return true;
    return Object.values(n.children).some((c) => subtreeHasMatch(c));
  };

  if (search && !subtreeHasMatch(node) && !matchesSearch) return null;

  // Determine best child for highlighting
  const isWhiteMove = moveNumber % 2 === 1;
  const bestChild =
    children.length > 0
      ? children.reduce((best, current) =>
        calculateBestMoveScore(current, isWhiteMove) > calculateBestMoveScore(best, isWhiteMove) ? current : best
      )
      : null;

  return (
    <div className="py-1">
      <div className="flex items-center gap-2 group">
        {children.length > 0 && (
          <button
            onClick={() => onToggle(key)}
            className="w-6 h-6 flex items-center justify-center text-textSecondary hover:text-textMain transition-colors"
          >
            {expanded[key] ? '▾' : '▸'}
          </button>
        )}
        {children.length === 0 && <div className="w-6" />}
        <div
          onClick={() => onSelect(key)}
          className={`flex-1 cursor-pointer px-3 py-2 rounded-card text-sm transition-all ${key === selectedPath
              ? 'bg-accent/20 border border-accent/50'
              : isBest
                ? 'bg-accent/10 border border-accent/30'
                : 'hover:bg-bgAuxiliary2 border border-transparent'
            }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono font-semibold text-textMain">{node.san || 'Start'}</span>
              {isBest && (
                <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded-full flex items-center gap-1">
                  <TrendingUp size={12} />
                  Best
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-textSecondary">{node.count.toLocaleString()} games</span>
              <div className="flex items-center gap-2">
                <span className="text-accent font-medium">{whiteRate.toFixed(1)}%</span>
                <span className="text-yellow-400">{drawRate.toFixed(1)}%</span>
                <span className="text-red-400">{blackRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {children.length > 0 && expanded[key] && (
        <div className="ml-8 mt-1 space-y-1 border-l border-borderColor pl-4">
          {children.slice(0, 50).map((c) => (
            <TreeNode
              key={path.concat(c.san || '').join('|||')}
              node={c}
              path={path.concat(c.san || '')}
              search={search}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedPath={selectedPath}
              isBest={c.san === bestChild?.san}
              moveNumber={moveNumber + 1}
            />
          ))}
          {children.length > 50 && (
            <div className="text-xs text-textSecondary italic pl-3">... and {children.length - 50} more moves</div>
          )}
        </div>
      )}
    </div>
  );
};

const BarChart: React.FC<{ node: OpeningNode | null; title?: string }> = ({ node, title }) => {
  if (!node) return <div className="text-textSecondary">No statistics available</div>;
  const total = Math.max(1, node.whiteWins + node.blackWins + node.draws);
  const w = Math.round((node.whiteWins / total) * 100);
  const d = Math.round((node.draws / total) * 100);
  const b = 100 - w - d;

  return (
    <div className="space-y-3">
      {title && <h4 className="text-sm font-semibold text-textMain">{title}</h4>}
      <div className="relative h-8 bg-bgMain rounded-card overflow-hidden flex">
        {w > 0 && (
          <div
            className="bg-green-600 flex items-center justify-center text-white text-xs font-medium transition-all"
            style={{ width: `${w}%` }}
            title={`White wins: ${w}%`}
          >
            {w > 5 && `${w}%`}
          </div>
        )}
        {d > 0 && (
          <div
            className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium transition-all"
            style={{ width: `${d}%` }}
            title={`Draws: ${d}%`}
          >
            {d > 5 && `${d}%`}
          </div>
        )}
        {b > 0 && (
          <div
            className="bg-red-600 flex items-center justify-center text-white text-xs font-medium transition-all"
            style={{ width: `${b}%` }}
            title={`Black wins: ${b}%`}
          >
            {b > 5 && `${b}%`}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-accent rounded"></div>
            <span className="text-textMain">White: {node.whiteWins.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-textMain">Draw: {node.draws.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded"></div>
            <span className="text-textMain">Black: {node.blackWins.toLocaleString()}</span>
          </div>
        </div>
        <div className="text-textSecondary font-medium">Total: {total.toLocaleString()}</div>
      </div>
    </div>
  );
};

const OpeningExplorer: React.FC = () => {
  const navigate = useNavigate();
  const [tree, setTree] = useState<OpeningNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [useServer, setUseServer] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parseStats, setParseStats] = useState<{ games: number; time: number } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const BACKEND_URL = getBackendUrl();

  const onFile = useCallback(
    async (f?: File) => {
      if (!f) return;
      setLoading(true);
      setError(null);
      setParseStats(null);
      setTree(null);
      setSelectedPath(null);
      setExpanded({});

      const startTime = Date.now();

      try {
        const txt = await f.text();

        if (!txt.trim()) {
          throw new Error('PGN file is empty');
        }

        if (useServer) {
          const res = await fetch(`${BACKEND_URL}/v1/openings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pgn: txt }),
          });

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Server error: ${res.status} - ${errorText || 'Failed to parse PGN'}`);
          }

          const json = await res.json();
          const parseTime = Date.now() - startTime;

          // Count games from root node (root.count represents total games)
          const gameCount = json.totalGames || json.count || 0;
          setParseStats({ games: gameCount, time: parseTime });
          setTree(json);

          // Auto-expand first level
          const firstLevelKeys = Object.keys(json.children || {});
          const initialExpanded: Record<string, boolean> = {};
          firstLevelKeys.slice(0, 5).forEach((key) => {
            initialExpanded[key] = true;
          });
          setExpanded(initialExpanded);
        } else {
          const built = buildOpeningTreeFromPgn(txt);
          const parseTime = Date.now() - startTime;

          // Count games from root node (root.count represents total games)
          const gameCount = built.count || 0;
          setParseStats({ games: gameCount, time: parseTime });
          setTree(built);

          // Auto-expand first level
          const firstLevelKeys = Object.keys(built.children || {});
          const initialExpanded: Record<string, boolean> = {};
          firstLevelKeys.slice(0, 5).forEach((key) => {
            initialExpanded[key] = true;
          });
          setExpanded(initialExpanded);
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to parse PGN file';
        setError(errorMessage);
        console.error('Failed to build opening tree', e);
      } finally {
        setLoading(false);
      }
    },
    [useServer, tree]
  );

  const findNodeWithPath = (root: OpeningNode, path: string[]): OpeningNode | null => {
    let node: OpeningNode | null = root;
    for (const san of path) {
      if (!node.children[san]) return null;
      node = node.children[san];
    }
    return node;
  };

  const handleToggle = (pathKey: string) => {
    setExpanded((prev) => ({ ...prev, [pathKey]: !prev[pathKey] }));
  };

  const handleSelect = (pathKey: string) => {
    setSelectedPath(pathKey);
  };

  const computeSelectedInfo = useCallback(() => {
    if (!tree || !selectedPath) return null;
    const path = selectedPath.split('|||').filter(Boolean);
    const chess = new Chess();
    for (const san of path) {
      try {
        chess.move(san as any);
      } catch (e) {
        // ignore illegal SAN
      }
    }
    const node = findNodeWithPath(tree, path);
    const children = node ? getSortedChildren(node) : [];

    // Find best move based on score
    const isWhiteMove = path.length % 2 === 1;
    const best =
      children.length > 0
        ? children.reduce((best, current) =>
          calculateBestMoveScore(current, isWhiteMove) > calculateBestMoveScore(best, isWhiteMove) ? current : best
        )
        : null;

    // ECO detection using ECO table (longest prefix match)
    const ecoEntry = lookupEco(path);
    const eco = ecoEntry ? `${ecoEntry.code} — ${ecoEntry.name}` : null;

    return { path, fen: chess.fen(), node, best, eco, children, chess };
  }, [tree, selectedPath]);

  const selectedInfo = useMemo(computeSelectedInfo, [computeSelectedInfo]);

  const handleShowOnBoard = useCallback(() => {
    if (!selectedInfo) return;
    try {
      sessionStorage.setItem('analysisFromExplorer', JSON.stringify({ fen: selectedInfo.fen }));
      navigate('/analysis');
    } catch (e) {
      setError('Failed to open analysis board');
      console.error('Show on board failed', e);
    }
  }, [selectedInfo, navigate]);

  const handleDownloadSample = useCallback(() => {
    const link = document.createElement('a');
    link.href = '/sample_ruy_lopez.pgn';
    link.download = 'sample_ruy_lopez.pgn';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  return (
    <div className="min-h-screen bg-bgMain text-textMain p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2 flex items-center gap-3 text-textMain">
                <BarChart3 className="text-accent" size={32} />
                Opening Explorer
              </h1>
              <p className="text-textSecondary">
                Analyze opening frequencies, win rates, and find the best moves from your PGN database
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLegend(!showLegend)}
                className="px-3 py-1.5 bg-bgAuxiliary1 border border-borderColor rounded-card text-sm text-textMain hover:bg-bgAuxiliary2 transition-colors flex items-center gap-2"
              >
                <BookOpen size={16} />
                Legend
              </button>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="px-3 py-1.5 bg-bgAuxiliary1 border border-borderColor rounded-card text-sm text-textMain hover:bg-bgAuxiliary2 transition-colors flex items-center gap-2"
              >
                <HelpCircle size={16} />
                Help
              </button>
            </div>
          </div>

          {/* Help Panel */}
          {showHelp && (
            <div className="mt-4 bg-accent/10 border border-accent/30 rounded-card p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-accent flex items-center gap-2">
                  <Info size={20} />
                  How to Use Opening Explorer
                </h3>
                <button onClick={() => setShowHelp(false)} className="text-textSecondary hover:text-textMain">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-2 text-sm text-textSecondary">
                <p>
                  <strong>1. Upload PGN:</strong> Select a PGN file containing chess games. The system will parse all
                  opening moves.
                </p>
                <p>
                  <strong>2. Explore Tree:</strong> Click on moves in the tree to see statistics and variations.
                </p>
                <p>
                  <strong>3. View Statistics:</strong> Each move shows win/draw/loss percentages based on your database.
                </p>
                <p>
                  <strong>4. Find Best Moves:</strong> Moves marked with "Best" badge have the highest win rates.
                </p>
                <p>
                  <strong>5. Analyze Position:</strong> Click "View on Analysis Board" to study the position with an
                  engine.
                </p>
                <p>
                  <strong>6. Search:</strong> Use the search bar to quickly find specific moves in the tree.
                </p>
              </div>
            </div>
          )}

          {/* Legend Panel */}
          {showLegend && (
            <div className="mt-4 bg-accent/10 border border-accent/30 rounded-card p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-accent flex items-center gap-2">
                  <BookOpen size={20} />
                  Understanding the Interface
                </h3>
                <button onClick={() => setShowLegend(false)} className="text-textSecondary hover:text-textMain">
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-textMain mb-2">Colors & Badges:</h4>
                  <ul className="space-y-1 text-textSecondary">
                    <li className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">Best</span>
                      <span>Highest win rate move</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-600 rounded"></div>
                      <span>White wins percentage</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span>Draw percentage</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-600 rounded"></div>
                      <span>Black wins percentage</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-textMain mb-2">Statistics:</h4>
                  <ul className="space-y-1 text-textSecondary">
                    <li>
                      <strong>Games:</strong> Number of games reaching this position
                    </li>
                    <li>
                      <strong>ECO Code:</strong> Standard opening classification (e.g., B90 = Najdorf)
                    </li>
                    <li>
                      <strong>Win Rate:</strong> Percentage of games won by the side to move
                    </li>
                    <li>
                      <strong>Top Moves:</strong> Most popular continuations from this position
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className="bg-bgAuxiliary1 rounded-card p-6 mb-6 border border-borderColor">
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useServer}
                    onChange={(e) => setUseServer(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-textSecondary">Use server-side parsing (recommended for large files)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 px-4 py-2 bg-bgAuxiliary2 rounded-card border border-borderColor cursor-pointer hover:bg-bgAuxiliary3 transition-colors text-textMain">
                <Upload size={20} />
                <span>Choose PGN File</span>
                <input
                  type="file"
                  accept=".pgn,text/plain"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  className="hidden"
                />
              </label>

              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-textMain">
                  <CheckCircle2 size={16} className="text-accent" />
                  <span>{selectedFile.name}</span>
                  <span className="text-textSecondary">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}

              <Button
                onClick={() => onFile(selectedFile || undefined)}
                disabled={!selectedFile || loading}
                className="disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="mr-2">
                      <Loader />
                    </div>
                    Parsing...
                  </>
                ) : (
                  'Parse PGN'
                )}
              </Button>

              <button
                onClick={handleDownloadSample}
                className="flex items-center gap-2 px-4 py-2 bg-bgAuxiliary2 rounded-card border border-borderColor cursor-pointer hover:bg-bgAuxiliary3 transition-colors text-textMain"
              >
                <Download size={20} />
                <span>Download Sample PGN</span>
              </button>
            </div>

            {parseStats && (
              <div className="flex items-center gap-4 text-sm text-accent">
                <CheckCircle2 size={16} />
                <span>
                  Successfully parsed {parseStats.games.toLocaleString()} games in {(parseStats.time / 1000).toFixed(2)}
                  s
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 rounded-card p-3">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        {tree && (
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search moves (e.g. e4, Nf3, Qd5)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-bgAuxiliary1 border border-borderColor rounded-card text-textMain placeholder-textSecondary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="scale-150">
              <Loader />
            </div>
            <p className="mt-4 text-textSecondary">Parsing PGN file...</p>
            <p className="text-sm text-textSecondary mt-2">This may take a moment for large files</p>
          </div>
        ) : tree ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tree View */}
            <div className="lg:col-span-2 bg-bgAuxiliary1 rounded-card p-6 border border-borderColor">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2 text-textMain">
                    <BarChart3 size={24} className="text-accent" />
                    Opening Tree
                  </h2>
                  <p className="text-xs text-textSecondary mt-1">
                    Click moves to explore variations • Expand/collapse with arrows
                  </p>
                </div>
                <div className="text-sm text-textSecondary">{Object.keys(tree.children || {}).length} first moves</div>
              </div>

              <div className="max-h-[calc(100vh-400px)] overflow-y-auto pr-2 custom-scrollbar">
                {Object.keys(tree.children).length === 0 ? (
                  <div className="text-center py-8 text-textSecondary">
                    <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No opening moves found in PGN file.</p>
                    <p className="text-sm mt-2">Make sure your PGN file contains valid chess games.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {Object.keys(tree.children).map((san, index) => {
                      const node = tree.children[san];
                      const isBest = index === 0; // First move is often the most popular
                      return (
                        <TreeNode
                          key={san}
                          node={node}
                          path={[san]}
                          search={searchQuery}
                          expanded={expanded}
                          onToggle={handleToggle}
                          onSelect={handleSelect}
                          selectedPath={selectedPath}
                          isBest={isBest}
                          moveNumber={1}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Details Panel */}
            <div className="lg:col-span-1 bg-bgAuxiliary1 rounded-card p-6 border border-borderColor">
              <div className="mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-textMain">
                  <TrendingUp size={24} className="text-accent" />
                  Position Details
                </h2>
                <p className="text-xs text-textSecondary mt-1">Select a move from the tree to see detailed statistics</p>
              </div>

              <div className="max-h-[calc(100vh-400px)] overflow-y-auto pr-2 custom-scrollbar">
                {selectedInfo ? (
                  <div className="space-y-6">
                    {/* Move Path */}
                    <div>
                      <h3 className="text-sm font-semibold text-textSecondary mb-2 flex items-center gap-2 uppercase tracking-wide">
                        Move Sequence
                        <span className="text-xs text-textSecondary font-normal lowercase">({selectedInfo.path.length} moves)</span>
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedInfo.path.map((move, idx) => {
                          const moveNumber = Math.floor(idx / 2) + 1;
                          const isWhiteMove = idx % 2 === 0;
                          return (
                            <div key={idx} className="flex items-center gap-1">
                              {isWhiteMove && (
                                <span className="text-xs text-textSecondary font-semibold">{moveNumber}.</span>
                              )}
                              <span
                                className={`px-3 py-1 bg-bgAuxiliary2 rounded-card font-mono text-sm border ${isWhiteMove ? 'border-accent/30' : 'border-borderColor'
                                  } text-textMain`}
                              >
                                {move}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-textSecondary mt-2">
                        {selectedInfo.path.length % 2 === 0 ? 'Black to move' : 'White to move'}
                      </p>
                    </div>

                    {/* ECO Opening */}
                    {selectedInfo.eco && (
                      <div>
                        <h3 className="text-sm font-semibold text-textSecondary mb-2 uppercase tracking-wide">Opening</h3>
                        <div className="px-3 py-2 bg-accent/10 border border-accent/30 rounded-card text-accent">
                          {selectedInfo.eco}
                        </div>
                      </div>
                    )}

                    {/* Statistics */}
                    {selectedInfo.node && (
                      <div>
                        <h3 className="text-sm font-semibold text-textSecondary mb-3 flex items-center gap-2 uppercase tracking-wide">
                          Statistics
                          <span className="text-xs text-textSecondary font-normal lowercase">
                            (from {selectedInfo.node.count.toLocaleString()} games)
                          </span>
                        </h3>
                        <BarChart node={selectedInfo.node} />
                        <div className="mt-3 p-2 bg-bgAuxiliary2 rounded-card text-xs text-textSecondary">
                          <p>
                            <strong>Note:</strong> Statistics show results from games that reached this position.
                          </p>
                          <p className="mt-1">Percentages are calculated from the total games at this position.</p>
                        </div>
                      </div>
                    )}

                    {/* Best Move Recommendation */}
                    {selectedInfo.best && (
                      <div>
                        <h3 className="text-sm font-semibold text-textSecondary mb-2 flex items-center gap-2 uppercase tracking-wide">
                          <TrendingUp className="w-4 h-4" />
                          Recommended Next Move
                        </h3>
                        <div className="bg-accent/10 border border-accent/30 rounded-card p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono font-bold text-lg text-accent">{selectedInfo.best.san}</span>
                            <span className="px-2 py-0.5 bg-accent/20 text-accent rounded-card text-xs font-semibold">
                              Best
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                            <div>
                              <span className="text-textSecondary">Games:</span>
                              <span className="ml-2 text-textMain font-semibold">
                                {selectedInfo.best.count.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-textSecondary">Win Rate:</span>
                              <span className="ml-2 text-accent font-semibold">
                                {((selectedInfo.best.whiteWins / Math.max(1, selectedInfo.best.count)) * 100).toFixed(
                                  1
                                )}
                                %
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-accent/20">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-accent">W: {selectedInfo.best.whiteWins}</span>
                              <span className="text-yellow-400">D: {selectedInfo.best.draws}</span>
                              <span className="text-red-400">B: {selectedInfo.best.blackWins}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Top Moves */}
                    {selectedInfo.children && selectedInfo.children.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-textSecondary mb-2 uppercase tracking-wide">
                          Top Moves ({selectedInfo.children.length} total)
                        </h3>
                        <div className="space-y-2">
                          {selectedInfo.children.slice(0, 5).map((child, idx) => {
                            const total = Math.max(1, child.count);
                            const winRate = (child.whiteWins / total) * 100;
                            const isBest = idx === 0;
                            return (
                              <div
                                key={idx}
                                className={`flex items-center justify-between p-2 rounded-card border ${isBest ? 'bg-accent/10 border-accent/30' : 'bg-bgAuxiliary2 border-borderColor'
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-textSecondary font-semibold w-4">#{idx + 1}</span>
                                  <span className="font-mono text-sm font-semibold text-textMain">{child.san}</span>
                                  {isBest && (
                                    <span className="px-1.5 py-0.5 bg-accent/20 text-accent rounded-card text-xs">
                                      Best
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                  <span className="text-textSecondary">{child.count.toLocaleString()} games</span>
                                  <span className="text-accent font-semibold">{winRate.toFixed(1)}%</span>
                                </div>
                              </div>
                            );
                          })}
                          {selectedInfo.children.length > 5 && (
                            <p className="text-xs text-textSecondary text-center pt-1">
                              ... and {selectedInfo.children.length - 5} more moves
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="text-center py-8 text-textSecondary">
                    <BarChart3 size={48} className="mx-auto mb-4 opacity-30" />
                    <p>Select a move from the tree to see detailed statistics</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-bgAuxiliary1 rounded-card p-12 border border-borderColor">
            <div className="text-center mb-8">
              <Upload size={64} className="mx-auto mb-4 text-textSecondary opacity-50" />
              <h3 className="text-xl font-semibold mb-2 text-textMain">No PGN File Loaded</h3>
              <p className="text-textSecondary mb-6">
                Upload a PGN file to start exploring opening frequencies and statistics
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              <div className="bg-bgAuxiliary2 rounded-card p-4 border border-borderColor">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="text-accent" size={20} />
                  <h4 className="font-semibold text-textMain">Opening Analysis</h4>
                </div>
                <p className="text-sm text-textSecondary">
                  Analyze win/draw/loss rates for each opening line based on your game database
                </p>
              </div>

              <div className="bg-bgAuxiliary2 rounded-card p-4 border border-borderColor">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-accent" size={20} />
                  <h4 className="font-semibold text-textMain">Best Move Finder</h4>
                </div>
                <p className="text-sm text-textSecondary">
                  Discover the most successful moves at each position based on actual game results
                </p>
              </div>

              <div className="bg-bgAuxiliary2 rounded-card p-4 border border-borderColor">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="text-accent" size={20} />
                  <h4 className="font-semibold text-textMain">ECO Classification</h4>
                </div>
                <p className="text-sm text-textSecondary">
                  Automatic opening identification using standard ECO (Encyclopedia of Chess Openings) codes
                </p>
              </div>

              <div className="bg-bgAuxiliary2 rounded-card p-4 border border-borderColor">
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="text-accent" size={20} />
                  <h4 className="font-semibold text-textMain">Analysis Integration</h4>
                </div>
                <p className="text-sm text-textSecondary">
                  Send any position to the analysis board for deep engine evaluation
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <div className="inline-block bg-accent/10 border border-accent/30 rounded-card p-4 text-sm text-textSecondary">
                <p className="font-semibold mb-2">💡 Tip:</p>
                <p>
                  You can download PGN files from chess databases like Lichess, Chess.com, or create your own collection
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpeningExplorer;
