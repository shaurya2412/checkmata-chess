import { useEffect, useRef, useState, useCallback } from 'react';
import { Chess, Move } from 'chess.js';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChessBoard } from '../components/ChessBoard';
import { ChessEngine } from '../utils/chessEngine';
import { Button } from '@/components/ui/button';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { movesAtom, userSelectedMoveIndexAtom } from '@repo/store/chessBoard';
import { X, RotateCcw, Play, Pause } from 'lucide-react';

/**
 * Converts a raw move (from/to coordinates) to algebraic notation
 * @param chessInstance - The chess instance to use for move conversion
 * @param from - Source square (e.g., "f8")
 * @param to - Destination square (e.g., "e7")
 * @returns Algebraic notation string (e.g., "Be7") or null if invalid
 */
const convertToAlgebraic = (chessInstance: Chess, from: string, to: string): string | null => {
  try {
    // Try to make the move to get the proper algebraic notation
    const moves = chessInstance.moves({ square: from as any, verbose: true });
    const move = moves.find((m) => m.to === to);

    if (move) {
      return move.san;
    }

    // Fallback: try making the move directly
    const tempChess = new Chess(chessInstance.fen());
    const moveResult = tempChess.move({ from: from as any, to: to as any });
    if (moveResult) {
      return moveResult.san;
    }

    return null;
  } catch (err) {
    console.warn('Failed to convert move to algebraic notation', err);
    return null;
  }
};

export const AnalysisBoard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [chess, setChess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());
  const [evaluation, setEvaluation] = useState<number>(0);
  const [bestMove, setBestMove] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [moves, setMoves] = useState<Move[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [userColor, setUserColor] = useState<'w' | 'b'>('w');
  const [gameResult, setGameResult] = useState<{ result: string; by: string } | null>(null);

  const setMovesAtom = useSetRecoilState(movesAtom);
  const movesAtomValue = useRecoilValue(movesAtom);
  const setUserSelectedMoveIndex = useSetRecoilState(userSelectedMoveIndexAtom);
  const engineRef = useRef<ChessEngine | null>(null);

  // Define analyzePosition with proper state updates
  const analyzePosition = useCallback(async (chessInstance: Chess) => {
    if (!engineRef.current) {
      console.warn('Engine not initialized yet');
      return;
    }

    console.log('analyzePosition called with fen:', chessInstance.fen());

    setIsAnalyzing(true);
    setError('');
    try {
      console.log('Starting analysis...');

      // Get best move first
      const bestMoveObj = await engineRef.current.getBestMove(chessInstance);
      console.log('Engine returned bestMove:', bestMoveObj);
      if (bestMoveObj) {
        // Convert to algebraic notation
        const algebraicMove = convertToAlgebraic(chessInstance, bestMoveObj.from, bestMoveObj.to);
        const bestMoveStr = algebraicMove || `${bestMoveObj.from}${bestMoveObj.to}`;
        console.log('Setting best move to:', bestMoveStr);
        setBestMove(bestMoveStr);
      } else {
        setBestMove('');
      }

      // Get evaluation
      console.log('Now requesting evaluation...');
      const evalScore = await engineRef.current.evaluatePosition(chessInstance);
      console.log('Engine returned evaluation score:', evalScore);
      setEvaluation(evalScore);
      console.log('Evaluation state updated to:', evalScore);
    } catch (error) {
      console.error('Error analyzing position:', error);
      setError('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Reset userSelectedMoveIndex when component mounts to ensure board is in live mode
  useEffect(() => {
    setUserSelectedMoveIndex(null);
  }, [setUserSelectedMoveIndex]);

  // Initialize engine and auto-analyze current position
  useEffect(() => {
    console.log('Engine initialization starting...');
    const initEngine = async () => {
      try {
        engineRef.current = new ChessEngine('hard');
        console.log('ChessEngine instance created');
        // Wait for engine to initialize
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('Engine initialized, setting engineReady to true');
        setEngineReady(true);
      } catch (err) {
        console.error('Failed to initialize engine:', err);
        setError('Failed to load chess engine. Please refresh the page.');
      }
    };

    initEngine();

    return () => {
      console.log('Cleaning up engine');
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, []);

  // Auto-analyze whenever position changes - debounced
  useEffect(() => {
    if (!engineReady) return;

    const timeout = setTimeout(() => {
      console.log('Auto-analyze useEffect triggered for position:', chess.fen());
      analyzePosition(chess);
    }, 300);

    return () => clearTimeout(timeout);
  }, [chess, engineReady, analyzePosition]);

  // Load moves/FEN from navigation state or from sessionStorage (used by OpeningExplorer)
  useEffect(() => {
    // First, try sessionStorage fallback placed by OpeningExplorer
    let storedFromExplorer: { fen?: string } | null = null;
    try {
      const raw = sessionStorage.getItem('analysisFromExplorer');
      if (raw) {
        sessionStorage.removeItem('analysisFromExplorer');
        storedFromExplorer = JSON.parse(raw) as { fen?: string };
      }
    } catch (e) {
      storedFromExplorer = null;
    }

    // Then try router location.state
    const state =
      (location.state as
        | {
            moves?: Move[];
            userColor?: 'w' | 'b';
            result?: { result: string; by: string };
            fen?: string;
            useLastBotGame?: boolean;
          }
        | undefined) ?? undefined;

    const loadPersistedBotGame = () => {
      try {
        const raw = sessionStorage.getItem('lastBotGameAnalysis');
        if (!raw) return null;
        return JSON.parse(raw) as {
          moves?: Move[];
          userColor?: 'w' | 'b';
          result?: { result: string; by: string };
          fen?: string;
        };
      } catch (err) {
        console.warn('Unable to read persisted bot game for analysis', err);
        return null;
      }
    };

    const persisted = loadPersistedBotGame();
    const shouldUsePersisted = state?.useLastBotGame && persisted;

    // Primary source: explicit state when provided; otherwise prefer persisted data if it has moves
    const sourceFromState = state?.moves?.length ? state : undefined;
    const sourceFromPersist =
      shouldUsePersisted || (!sourceFromState && persisted?.moves?.length)
        ? persisted
        : shouldUsePersisted
          ? persisted
          : null;

    const sourceMoves = sourceFromState?.moves?.length ? sourceFromState.moves : sourceFromPersist?.moves;
    const sourceColor = sourceFromState?.userColor ?? sourceFromPersist?.userColor ?? 'w';
    const sourceResult = sourceFromState?.result ?? sourceFromPersist?.result ?? null;
    const sourceFen = sourceFromState?.fen ?? sourceFromPersist?.fen ?? storedFromExplorer?.fen ?? null;

    // Prefer moves when present (to populate move list), otherwise load fen snapshot
    if (sourceMoves && sourceMoves.length > 0) {
      const newChess = new Chess();
      const movesWithSan: Move[] = [];

      sourceMoves.forEach((move) => {
        try {
          if (move.san) {
            newChess.move(move);
            movesWithSan.push(move);
          } else {
            const replayedMove = newChess.move({
              from: move.from,
              to: move.to,
              promotion: (move as any).promotion,
            });
            if (replayedMove) movesWithSan.push(replayedMove);
          }
        } catch (err) {
          console.error('Failed to replay move in analysis board', err, move);
        }
      });

      setMoves(movesWithSan);
      setUserColor(sourceColor);
      setGameResult(sourceResult);
      setCurrentMoveIndex(movesWithSan.length);
      setChess(newChess);
      setBoard(newChess.board());
      setError('');
      return;
    }

    if (sourceFen) {
      try {
        const newChess = new Chess(sourceFen);
        const movesToSet =
          sourceFromPersist?.moves && sourceFromPersist.moves.length > 0 ? sourceFromPersist.moves : [];
        setMoves(movesToSet as Move[]);
        setUserColor(sourceColor);
        setGameResult(sourceResult);
        setCurrentMoveIndex(movesToSet.length);
        setChess(newChess);
        setBoard(newChess.board());
        setError('');
        return;
      } catch (err) {
        console.error('Failed to load fen for analysis', err, sourceFen);
        setError('Failed to load game position. Please try again.');
      }
    }

    // No incoming game data: start fresh
    setMoves([]);
    setMovesAtom([]);
    setUserColor('w');
    setGameResult(null);
    setError('');
  }, [location.state]);

  // Sync moves atom
  useEffect(() => {
    setMovesAtom(moves);
  }, [moves, setMovesAtom]);

  // Rebuild chess position based on the current move index so users can step through the game
  useEffect(() => {
    const clampedIndex = Math.max(0, Math.min(currentMoveIndex, moves.length));
    if (clampedIndex !== currentMoveIndex) {
      setCurrentMoveIndex(clampedIndex);
      return;
    }

    const newChess = new Chess();
    moves.slice(0, clampedIndex).forEach((move) => {
      try {
        newChess.move(move);
      } catch (err) {
        console.error('Failed to rebuild chess position while stepping through moves', err, move);
      }
    });

    setChess(newChess);
    setBoard(newChess.board());
    
    // Reset userSelectedMoveIndex when at the end position to allow making moves
    if (clampedIndex === moves.length) {
      setUserSelectedMoveIndex(null);
    }
  }, [currentMoveIndex, moves, setUserSelectedMoveIndex]);

  // When moves are updated elsewhere (e.g., ChessBoard writing to the atom), rebuild local state and re-analyze
  useEffect(() => {
    // If nothing in atom, keep as-is
    if (!movesAtomValue) return;

    // Only update if the moves are actually different to avoid infinite loops
    if (movesAtomValue.length === moves.length && 
        movesAtomValue.every((m, i) => m.from === moves[i]?.from && m.to === moves[i]?.to)) {
      return;
    }

    const newChess = new Chess();
    movesAtomValue.forEach((move) => {
      try {
        newChess.move(move);
      } catch (err) {
        console.error('Failed to rebuild chess from atom moves', err, move);
      }
    });

    setMoves(movesAtomValue);
    setChess(newChess);
    setBoard(newChess.board());
    // Update currentMoveIndex to match the new moves length
    setCurrentMoveIndex(movesAtomValue.length);
  }, [movesAtomValue, moves]);

  const handleMove = useCallback(
    (move: Move) => {
      // ChessBoard already updated movesAtom and mutated the chess instance
      // We need to rebuild the chess instance from scratch to ensure React detects the change
      setMoves((prev) => {
        // Check if move is already in the list to avoid duplicates
        const isDuplicate = prev.some(
          (m) => m.from === move.from && m.to === move.to && 
                 prev.indexOf(m) === prev.length - 1
        );
        if (isDuplicate) {
          return prev;
        }
        
        const next = [...prev, move];
        
        // Rebuild chess position from all moves to ensure board updates
        const newChess = new Chess();
        next.forEach((m) => {
          try {
            newChess.move(m);
          } catch (err) {
            console.error('Error replaying move in handleMove:', err, m);
          }
        });
        
        // Update all state to ensure board re-renders
        setChess(newChess);
        setBoard(newChess.board());
        setCurrentMoveIndex(next.length);
        
        return next;
      });
    },
    []
  );

  const resetBoard = () => {
    const newChess = new Chess();
    setChess(newChess);
    setBoard(newChess.board());
    setMoves([]);
    setCurrentMoveIndex(0);
    setEvaluation(0);
    setBestMove('');
    // Will trigger analysis via useEffect
  };

  const undoMove = () => {
    if (moves.length === 0) return;

    // Rebuild chess from moves minus the last one
    const newChess = new Chess();
    const newMoves = moves.slice(0, -1);
    newMoves.forEach((m) => {
      newChess.move(m);
    });

    setChess(newChess);
    setBoard(newChess.board());
    setMoves(newMoves);
    setCurrentMoveIndex(newMoves.length);
    // Analyze will happen via useEffect due to chess state change
  };

  const goToStart = () => setCurrentMoveIndex(0);
  const stepBackward = () => setCurrentMoveIndex((idx) => Math.max(0, idx - 1));
  const stepForward = () => setCurrentMoveIndex((idx) => Math.min(moves.length, idx + 1));
  const goToEnd = () => setCurrentMoveIndex(moves.length);

  const formatEvaluation = (evalScore: number): string => {
    // Convert centipawns to pawns
    const pawns = (evalScore / 100).toFixed(2);

    if (Math.abs(evalScore) > 900) {
      // Mate in X
      const mateIn = Math.ceil((1000 - Math.abs(evalScore)) / 100);
      return evalScore > 0 ? `M${mateIn}` : `-M${mateIn}`;
    }

    return evalScore > 0 ? `+${pawns}` : pawns;
  };

  // Create a mock socket for the ChessBoard component
  const mockSocket = {
    send: (message: string) => {
      const data = JSON.parse(message);
      if (data.type === 'move') {
        handleMove(data.payload.move);
      }
    },
  } as WebSocket;

  return (
    <div className="min-h-screen bg-bgMain relative">
      <div className="max-w-full mx-auto">
        {/* Minimal Header - only show if there's important info */}
        {(gameResult || error) && (
          <div className="justify-center flex pt-4 text-textMain">
            <div className="px-4 py-2 bg-bgAuxiliary1 rounded-card text-sm font-medium">
              {gameResult && (
                <>
                  {gameResult.result === 'DRAW'
                    ? 'Game drawn'
                    : gameResult.result === 'WHITE_WINS'
                      ? userColor === 'w'
                        ? 'You won'
                        : 'You lost'
                      : userColor === 'b'
                        ? 'You won'
                        : 'You lost'}{' '}
                  — {gameResult.by}
                </>
              )}
              {error && <span className="text-red-400">{error}</span>}
            </div>
          </div>
        )}
        
        {/* Close button - always accessible */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 bg-bgAuxiliary1 hover:bg-bgAuxiliary2 rounded-card text-textSecondary hover:text-textMain transition-all border border-borderColor"
            aria-label="Close analysis"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Engine status - subtle indicator */}
        {engineReady && (
          <div className="absolute top-4 left-4">
            <div className="text-xs text-accent px-2 py-1 bg-accent/10 rounded-card border border-accent/20">
              ● Engine Ready
            </div>
          </div>
        )}

        <div className="justify-center flex min-h-screen">
          <div className="pt-2 w-full">
            <div className="flex gap-6 w-full">
              <div className="text-textMain">
                <div className="flex justify-center">
                  <div>
                    <div>
                      <div className={`w-full flex justify-center`}>
                        <ChessBoard
                          started={true}
                          gameId="analysis"
                          myColor={userColor}
                          chess={chess}
                          setBoard={setBoard}
                          socket={mockSocket}
                          board={board}
                          allowBothColors={true}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

          {/* Right Panel - Analysis */}
          <div className="rounded-card pt-2 bg-bgAuxiliary1 flex-1 overflow-auto overflow-y-scroll no-scrollbar border border-borderColor">
            {/* Evaluation Bar */}
            <div className="p-6 border-b border-borderColor space-y-4 flex-shrink-0">
              <h2 className="text-base font-semibold text-textMain">Position Evaluation</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-20 bg-bgMain rounded-card overflow-hidden flex border border-borderColor">
                      <div
                        className={`transition-all duration-300 ${evaluation > 0 ? 'bg-white' : 'bg-black'}`}
                        style={{
                          width: `${50 + Math.min(50, Math.abs(evaluation) / 20)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-textMain min-w-[70px] text-center font-mono">
                    {isAnalyzing ? '...' : formatEvaluation(evaluation)}
                  </div>
                </div>
                <p className="text-xs text-textSecondary text-center">
                  {evaluation > 0 ? '♔ White is better' : evaluation < 0 ? '♚ Black is better' : '= Equal position'}
                </p>
              </div>
            </div>

            {/* Best Move */}
            <div className="p-6 border-b border-borderColor flex-shrink-0">
              <h3 className="text-xs font-semibold text-textSecondary mb-2 uppercase tracking-wide">Best Move</h3>
              <div className="text-3xl font-mono text-accent font-bold min-h-10">{bestMove || '—'}</div>
            </div>

            {/* Move History */}
            <div className="flex-1 overflow-y-auto p-6 border-b border-borderColor">
              <h3 className="text-xs font-semibold text-textSecondary mb-3 uppercase tracking-wide">Moves</h3>
              {moves.length > 0 ? (
                <div className="space-y-1 text-sm font-mono">
                  {moves
                    .reduce((result: Move[][], _, index: number, array: Move[]) => {
                      if (index % 2 === 0) {
                        result.push(array.slice(index, index + 2));
                      }
                      return result;
                    }, [])
                    .map((movePair, pairIndex) => (
                      <div key={pairIndex} className="text-textSecondary hover:text-textMain cursor-default py-1 font-mono">
                        <span className="text-textSecondary/60">{pairIndex + 1}.</span>{' '}
                        <span className="text-accent">{movePair[0]?.san || ''}</span>
                        {movePair[1] && (
                          <>
                            {' '}
                            <span className="text-accent">{movePair[1].san}</span>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-textSecondary text-sm">No moves yet</p>
              )}
            </div>

            {/* Controls */}
            <div className="p-6 border-t border-borderColor space-y-3 flex-shrink-0">
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={goToStart}
                  disabled={currentMoveIndex === 0}
                  className="px-2 py-2 bg-bgAuxiliary2 hover:bg-bgAuxiliary3 text-textMain disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded-card transition-all border border-borderColor"
                >
                  ⏮
                </button>
                <button
                  onClick={stepBackward}
                  disabled={currentMoveIndex === 0}
                  className="px-2 py-2 bg-bgAuxiliary2 hover:bg-bgAuxiliary3 text-textMain disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded-card transition-all border border-borderColor"
                >
                  ◀
                </button>
                <button
                  onClick={stepForward}
                  disabled={currentMoveIndex >= moves.length}
                  className="px-2 py-2 bg-bgAuxiliary2 hover:bg-bgAuxiliary3 text-textMain disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded-card transition-all border border-borderColor"
                >
                  ▶
                </button>
                <button
                  onClick={goToEnd}
                  disabled={currentMoveIndex >= moves.length}
                  className="px-2 py-2 bg-bgAuxiliary2 hover:bg-bgAuxiliary3 text-textMain disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded-card transition-all border border-borderColor"
                >
                  ⏭
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={undoMove}
                  disabled={moves.length === 0}
                  className="px-3 py-2 bg-bgAuxiliary2 hover:bg-bgAuxiliary3 text-textMain disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs rounded-card transition-all border border-borderColor"
                >
                  <RotateCcw size={14} />
                  <span>Undo</span>
                </button>
                <button
                  onClick={resetBoard}
                  className="px-3 py-2 bg-bgAuxiliary2 hover:bg-bgAuxiliary3 text-textMain flex items-center justify-center gap-2 text-xs rounded-card transition-all border border-borderColor"
                >
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
              </div>
              <div className="text-center text-xs text-textSecondary pt-2">
                Move {currentMoveIndex} / {moves.length}
              </div>
            </div>

            {/* Status Info */}
            <div className="p-4 bg-bgMain border-t border-borderColor space-y-2 text-xs flex-shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-textSecondary">Turn:</span>
                <span className="text-textMain font-medium">{chess.turn() === 'w' ? '♔ White' : '♚ Black'}</span>
              </div>
              {chess.isCheck() && (
                <div className="flex justify-between items-center text-yellow-400">
                  <span>Status:</span>
                  <span>Check</span>
                </div>
              )}
              {chess.isCheckmate() && (
                <div className="flex justify-between items-center text-red-400">
                  <span>Status:</span>
                  <span>Checkmate</span>
                </div>
              )}
              {chess.isDraw() && (
                <div className="flex justify-between items-center text-textSecondary">
                  <span>Status:</span>
                  <span>Draw</span>
                </div>
              )}
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-accent mt-2 pt-2 border-t border-borderColor">
                  <Pause size={12} className="animate-spin" />
                  <span>Analyzing...</span>
                </div>
              )}
            </div>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
