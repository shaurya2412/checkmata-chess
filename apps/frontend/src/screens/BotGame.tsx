import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import MoveSound from '/move.wav';
import { ChessBoard, isPromoting } from '../components/ChessBoard';
import { Chess, Move } from 'chess.js';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import MovesTable from '../components/MovesTable';
import { useUser } from '@repo/store/useUser';
import { UserAvatar } from '../components/UserAvatar';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { movesAtom, userSelectedMoveIndexAtom } from '@repo/store/chessBoard';
import GameEndModal from '@/components/GameEndModal';
import { ChessEngine, DifficultyLevel } from '../utils/chessEngine';
import ExitGameModel from '@/components/ExitGameModel';

const moveAudio = new Audio(MoveSound);

export interface Player {
  id: string;
  name: string;
  isGuest: boolean;
}

export interface Metadata {
  blackPlayer: Player;
  whitePlayer: Player;
}

export enum Result {
  WHITE_WINS = 'WHITE_WINS',
  BLACK_WINS = 'BLACK_WINS',
  DRAW = 'DRAW',
}

export interface GameResult {
  result: Result;
  by: string;
}

const GAME_TIME_MS = 10 * 60 * 1000;

export const BotGame = () => {
  const navigate = useNavigate();
  const user = useUser();
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();

  // Derive difficulty from route param when available (e.g. /game/:gameId)
  // or from the pathname for specific routes like /game/bot-easy
  const difficultyFromParam = (gameId?.split('-')[1] as DifficultyLevel) || undefined;
  const difficultyFromPathMatch = (() => {
    const m = location.pathname.match(/bot-(easy|medium|hard)/i);
    return m ? (m[1].toLowerCase() as DifficultyLevel) : undefined;
  })();

  const difficulty = (difficultyFromParam || difficultyFromPathMatch || 'medium') as DifficultyLevel;

  const [chess, setChess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());
  const [started, setStarted] = useState(false);
  const [gameMetadata, setGameMetadata] = useState<Metadata | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [player1TimeConsumed, setPlayer1TimeConsumed] = useState(0);
  const [player2TimeConsumed, setPlayer2TimeConsumed] = useState(0);
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [userColor, setUserColor] = useState<'w' | 'b'>('w');

  const setMoves = useSetRecoilState(movesAtom);
  const moves = useRecoilValue(movesAtom);
  const userSelectedMoveIndex = useRecoilValue(userSelectedMoveIndexAtom);
  const userSelectedMoveIndexRef = useRef(userSelectedMoveIndex);
  const engineRef = useRef<ChessEngine | null>(null);

  useEffect(() => {
    userSelectedMoveIndexRef.current = userSelectedMoveIndex;
  }, [userSelectedMoveIndex]);

  useEffect(() => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    // Initialize game
    const botPlayer: Player = {
      id: 'bot',
      name: `AI (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})`,
      isGuest: false,
    };

    const humanPlayer: Player = {
      id: user.id,
      name: user.name || 'You',
      isGuest: user.isGuest || false,
    };

    setGameMetadata({
      whitePlayer: userColor === 'w' ? humanPlayer : botPlayer,
      blackPlayer: userColor === 'b' ? humanPlayer : botPlayer,
    });

    setStarted(true);

    // Initialize engine
    engineRef.current = new ChessEngine(difficulty);

    // If user plays black, AI (white) moves first
    if (userColor === 'b') {
      setTimeout(() => {
        makeEngineMove();
      }, 500);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, [user, difficulty, userColor]);

  // Persist last bot game locally so the analysis page can load it even if navigation state is missing
  useEffect(() => {
    if (!result) return;
    try {
      // Always use chess.history with SAN so analysis has the full replay
      const movesToPersist = chess.history({ verbose: true }) as Move[];

      sessionStorage.setItem(
        'lastBotGameAnalysis',
        JSON.stringify({
          moves: movesToPersist,
          userColor,
          fen: chess.fen(),
          result,
        })
      );
    } catch (err) {
      console.warn('Unable to persist bot game for analysis', err);
    }
  }, [result, moves, userColor, chess]);

  // Continuously persist the latest game state so analysis always has data, even before the game ends
  useEffect(() => {
    try {
      // Always persist the full verbose history so we retain SAN and promotions
      const movesToPersist = chess.history({ verbose: true }) as Move[];
      sessionStorage.setItem(
        'lastBotGameAnalysis',
        JSON.stringify({
          moves: movesToPersist,
          userColor,
          fen: chess.fen(),
          result: result ?? undefined,
        })
      );
    } catch (err) {
      console.warn('Unable to persist in-progress bot game for analysis', err);
    }
    // We intentionally omit `result` from deps here because the result-specific persistence
    // is handled in a dedicated effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moves, userColor, chess]);

  const makeEngineMove = async () => {
    if (!engineRef.current || chess.isGameOver()) return;

    setIsEngineThinking(true);
    try {
      console.log('Requesting engine move, chess turn:', chess.turn());
      const bestMove = await engineRef.current.getBestMove(chess);
      console.log('Engine returned move:', bestMove);

      if (bestMove) {
        const moveTimestamp = new Date(Date.now());

        try {
          if (isPromoting(chess, bestMove.from, bestMove.to)) {
            chess.move({
              from: bestMove.from,
              to: bestMove.to,
              promotion: 'q',
            });
          } else {
            chess.move(bestMove);
          }

          setMoves((moves) => [...moves, bestMove]);
          setBoard(chess.board());
          moveAudio.play();

          // Check if game is over
          if (chess.isGameOver()) {
            const gameResult = chess.isDraw()
              ? Result.DRAW
              : chess.turn() === 'b'
                ? Result.WHITE_WINS
                : Result.BLACK_WINS;

            setResult({
              result: gameResult,
              by: chess.isCheckmate() ? 'Checkmate' : chess.isDraw() ? 'Draw' : 'Resignation',
            });
            setStarted(false);
          }
        } catch (error) {
          console.error('Error making engine move:', error);
        }
      } else {
        console.warn('Engine returned no move');
      }
    } catch (error) {
      console.error('Error getting engine move:', error);
    } finally {
      setIsEngineThinking(false);
    }
  };

  const handleUserMove = useCallback(
    (move: Move) => {
      console.log(
        'handleUserMove called with move:',
        move,
        'chess.turn():',
        chess.turn(),
        'userColor:',
        userColor,
        'engineRef:',
        !!engineRef.current,
        'started:',
        started
      );
      if (!started || chess.isGameOver()) return;

      try {
        // It's possible the ChessBoard component already applied the move directly
        // to the shared `chess` instance before sending it through the mock socket.
        // In that case `chess.turn()` will already be the opponent's turn (not userColor)
        // and calling `chess.move()` again will fail. Detect that situation and
        // accept the move without trying to re-apply it.
        const moveAlreadyApplied = chess.turn() !== userColor;

        let moveResult: Move | null = null;

        if (moveAlreadyApplied) {
          console.log('Detected move already applied to chess instance. Accepting and updating state.');
          // Use the incoming move as the canonical move object for our history.
          // We don't call `chess.move()` because the board was already mutated by ChessBoard.
          moveResult = move as Move;
        } else {
          if (isPromoting(chess, move.from, move.to)) {
            moveResult = chess.move({ from: move.from, to: move.to, promotion: 'q' });
          } else {
            moveResult = chess.move(move);
          }
        }

        if (moveResult) {
          moveAudio.play();
          setMoves((moves) => [...moves, moveResult as Move]);
          setBoard(chess.board());

          // Check if game is over
          if (chess.isGameOver()) {
            const gameResult = chess.isDraw()
              ? Result.DRAW
              : chess.turn() === 'b'
                ? Result.WHITE_WINS
                : Result.BLACK_WINS;

            setResult({
              result: gameResult,
              by: chess.isCheckmate() ? 'Checkmate' : chess.isDraw() ? 'Draw' : 'Resignation',
            });
            setStarted(false);
          } else {
            // Engine's turn (or continue the game flow)
            console.log('Scheduling engine move in 500ms');
            setTimeout(() => {
              console.log('Calling makeEngineMove from handleUserMove');
              makeEngineMove();
            }, 500);
          }
        } else {
          // If moveResult is falsy, still update board and schedule engine as a fallback.
          console.warn(
            'User move could not be applied (moveResult null). Updating board and scheduling engine as fallback.'
          );
          setBoard(chess.board());
          setMoves((moves) => [...moves, move as Move]);
          setTimeout(() => makeEngineMove(), 500);
        }
      } catch (error) {
        console.error('Error making user move:', error);
      }
    },
    [started, chess, userColor]
  );

  useEffect(() => {
    if (started) {
      const interval = setInterval(() => {
        if (chess.turn() === userColor) {
          setPlayer1TimeConsumed((p) => p + 100);
        } else {
          setPlayer2TimeConsumed((p) => p + 100);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [started, chess, userColor]);

  const getTimer = (timeConsumed: number) => {
    const timeLeftMs = GAME_TIME_MS - timeConsumed;
    const minutes = Math.floor(timeLeftMs / (1000 * 60));
    const remainingSeconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);

    return (
      <div className="text-white">
        Time Left: {minutes < 10 ? '0' : ''}
        {minutes}:{remainingSeconds < 10 ? '0' : ''}
        {remainingSeconds}
      </div>
    );
  };

  const handleExit = () => {
    if (engineRef.current) {
      engineRef.current.destroy();
    }
    setMoves([]);
    navigate('/');
  };

  const handleResign = () => {
    // Player resigns — opponent (AI or other) wins
    const opponentColor = userColor === 'w' ? 'b' : 'w';
    const gameResult: GameResult = {
      result: opponentColor === 'w' ? Result.WHITE_WINS : Result.BLACK_WINS,
      by: 'Resignation',
    };

    // Immediately persist game state for analysis before setting result
    // Use full verbose history to include SAN and promotions
    const currentMoves = chess.history({ verbose: true }) as Move[];
    const currentFen = chess.fen();

    console.log('handleResign: Persisting game state', {
      movesCount: currentMoves.length,
      fen: currentFen,
      userColor,
      result: gameResult,
    });

    try {
      sessionStorage.setItem(
        'lastBotGameAnalysis',
        JSON.stringify({
          moves: currentMoves,
          userColor,
          fen: currentFen,
          result: gameResult,
        })
      );
      console.log('handleResign: Successfully persisted to sessionStorage');
    } catch (err) {
      console.warn('Unable to persist resigned game for analysis', err);
    }

    setResult(gameResult);
    setStarted(false);
  };

  const handleDraw = () => {
    // Offer draw (for now, auto-accept in bot mode)
    const gameResult: GameResult = {
      result: Result.DRAW,
      by: 'Mutual Agreement',
    };

    // Immediately persist game state for analysis
    const currentMoves = chess.history({ verbose: true }) as Move[];

    try {
      sessionStorage.setItem(
        'lastBotGameAnalysis',
        JSON.stringify({
          moves: currentMoves,
          userColor,
          fen: chess.fen(),
          result: gameResult,
        })
      );
    } catch (err) {
      console.warn('Unable to persist drawn game for analysis', err);
    }

    setResult(gameResult);
    setStarted(false);
  };

  // Create a mock socket for the ChessBoard component
  const mockSocket = useMemo(
    () =>
      ({
        send: (message: string) => {
          try {
            const data = JSON.parse(message);
            console.log('mockSocket received:', data);
            if (data.type === 'move') {
              handleUserMove(data.payload.move);
            }
          } catch (err) {
            console.error('mockSocket parse/send error:', err, message);
          }
        },
      }) as WebSocket,
    [handleUserMove]
  );

  return (
    <div className="">
      {result && (
        <GameEndModal
          blackPlayer={gameMetadata?.blackPlayer}
          whitePlayer={gameMetadata?.whitePlayer}
          gameResult={result}
          // Always send full verbose history so analysis loads the entire game
          moves={chess.history({ verbose: true }) as Move[]}
          userColor={userColor}
        />
      )}
      <div className="justify-center flex pt-4 text-white">
        {started &&
          !result &&
          (isEngineThinking ? <div>AI is thinking...</div> : chess.turn() === userColor ? 'Your turn' : "AI's turn")}
        {result && (
          <div className="text-yellow-400 font-semibold">
            Game Over -{' '}
            {result.result === Result.WHITE_WINS
              ? userColor === 'w'
                ? 'You Win!'
                : 'AI Wins!'
              : result.result === Result.BLACK_WINS
                ? userColor === 'b'
                  ? 'You Win!'
                  : 'AI Wins!'
                : "It's a Draw"}{' '}
            by {result.by}
          </div>
        )}
      </div>
      <div className="justify-center flex">
        <div className="pt-2 w-full">
          <div className="flex gap-8 w-full">
            <div className="text-white">
              <div className="flex justify-center">
                <div>
                  {(started || result) && (
                    <div className="mb-4">
                      <div className="flex justify-between">
                        <UserAvatar gameMetadata={gameMetadata} />
                        {started && getTimer(userColor === 'w' ? player2TimeConsumed : player1TimeConsumed)}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className={`w-full flex justify-center text-white`}>
                      <ChessBoard
                        started={started}
                        gameId={gameId || 'bot-game'}
                        myColor={userColor}
                        chess={chess}
                        setBoard={setBoard}
                        socket={mockSocket}
                        board={board}
                        showCoordinates={false}
                      />
                    </div>
                  </div>
                  {(started || result) && (
                    <div className="mt-4 flex justify-between">
                      <UserAvatar gameMetadata={gameMetadata} self />
                      {started && getTimer(userColor === 'w' ? player1TimeConsumed : player2TimeConsumed)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-md pt-2 bg-bgAuxiliary3 flex-1 overflow-auto h-[95vh] overflow-y-scroll no-scrollbar">
              <div className="p-8 flex justify-center w-full">
                <ExitGameModel onClick={handleExit} />
              </div>
              <div>
                <MovesTable onResign={result ? undefined : handleResign} onDraw={result ? undefined : handleDraw} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
