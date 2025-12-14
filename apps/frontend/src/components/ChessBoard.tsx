import { Chess, Color, Move, PieceSymbol, Square } from 'chess.js';
import { MouseEvent, memo, useEffect, useState } from 'react';
import { MOVE } from '../screens/Game';
import LetterNotation from './chess-board/LetterNotation';
import LegalMoveIndicator from './chess-board/LegalMoveIndicator';
import ChessSquare from './chess-board/ChessSquare';
import NumberNotation from './chess-board/NumberNotation';
import { drawArrow } from '../utils/canvas';
import useWindowSize from '../hooks/useWindowSize';
import Confetti from 'react-confetti';
import MoveSound from '/move.wav';
import CaptureSound from '/capture.wav';

import { useRecoilState } from 'recoil';

import { isBoardFlippedAtom, movesAtom, userSelectedMoveIndexAtom } from '@repo/store/chessBoard';

export function isPromoting(chess: Chess, from: Square, to: Square) {
  if (!from) {
    return false;
  }

  const piece = chess.get(from);

  if (piece?.type !== 'p') {
    return false;
  }

  if (piece.color !== chess.turn()) {
    return false;
  }

  if (!['1', '8'].some((it) => to.endsWith(it))) {
    return false;
  }

  return chess
    .history({ verbose: true })
    .map((it) => it.to)
    .includes(to);
}

export const ChessBoard = memo(
  ({
    gameId,
    started,
    myColor,
    chess,
    board,
    socket,
    setBoard,
    allowBothColors = false,
    showCoordinates = true,
  }: {
    myColor: Color;
    gameId: string;
    started: boolean;
    chess: Chess;
    setBoard: React.Dispatch<
      React.SetStateAction<
        ({
          square: Square;
          type: PieceSymbol;
          color: Color;
        } | null)[][]
      >
    >;
    board: ({
      square: Square;
      type: PieceSymbol;
      color: Color;
    } | null)[][];
    socket: WebSocket;
    allowBothColors?: boolean;
    showCoordinates?: boolean;
  }) => {
    console.log('chessboard reloaded');

    const [isFlipped, setIsFlipped] = useRecoilState(isBoardFlippedAtom);
    const [userSelectedMoveIndex, setUserSelectedMoveIndex] = useRecoilState(userSelectedMoveIndexAtom);
    const [moves, setMoves] = useRecoilState(movesAtom);
    const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
    const [rightClickedSquares, setRightClickedSquares] = useState<string[]>([]);
    const [arrowStart, setArrowStart] = useState<string | null>(null);

    const [from, setFrom] = useState<null | Square>(null);
    const isMyTurn = myColor === chess.turn();
    const [legalMoves, setLegalMoves] = useState<string[]>([]);

    const labels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const boxSize = 80;
    const [gameOver, setGameOver] = useState(false);
    const moveAudio = new Audio(MoveSound);
    const captureAudio = new Audio(CaptureSound);

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>, squareRep: string) => {
      e.preventDefault();
      if (e.button === 2) {
        setArrowStart(squareRep);
      }
    };

    useEffect(() => {
      if (myColor === 'b') {
        setIsFlipped(true);
      }
    }, [myColor]);

    const clearCanvas = () => {
      setRightClickedSquares([]);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    const handleRightClick = (squareRep: string) => {
      if (rightClickedSquares.includes(squareRep)) {
        setRightClickedSquares((prev) => prev.filter((sq) => sq !== squareRep));
      } else {
        setRightClickedSquares((prev) => [...prev, squareRep]);
      }
    };

    const handleDrawArrow = (squareRep: string) => {
      if (arrowStart) {
        const stoppedAtSquare = squareRep;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            drawArrow({
              ctx,
              start: arrowStart,
              end: stoppedAtSquare,
              isFlipped,
              squareSize: boxSize,
            });
          }
        }
        setArrowStart(null);
      }
    };

    const handleMouseUp = (e: MouseEvent<HTMLDivElement>, squareRep: string) => {
      e.preventDefault();
      if (!started) {
        return;
      }
      if (e.button === 2) {
        if (arrowStart === squareRep) {
          handleRightClick(squareRep);
        } else {
          handleDrawArrow(squareRep);
        }
      } else {
        clearCanvas();
      }
    };

    useEffect(() => {
      clearCanvas();
      const lMove = moves.at(-1);
      if (lMove) {
        setLastMove({
          from: lMove.from,
          to: lMove.to,
        });
      } else {
        setLastMove(null);
      }
    }, [moves]);

    useEffect(() => {
      if (userSelectedMoveIndex !== null && moves.length > 0) {
        const move = moves[userSelectedMoveIndex];
        if (move) {
          setLastMove({
            from: move.from,
            to: move.to,
          });

          // Try to use the 'after' property if available, otherwise rebuild position
          if (move.after) {
            chess.load(move.after);
          } else {
            // Rebuild position by replaying moves up to this index
            chess.reset();
            for (let i = 0; i <= userSelectedMoveIndex; i++) {
              try {
                chess.move({ from: moves[i].from, to: moves[i].to });
              } catch (e) {
                console.error('Error replaying move:', e, moves[i]);
              }
            }
          }
          setBoard(chess.board());
        }
        return;
      }
    }, [userSelectedMoveIndex, moves]);

    useEffect(() => {
      // Only update board when NOT viewing history
      if (userSelectedMoveIndex === null) {
        setBoard(chess.board());
      }
    }, [moves, chess, userSelectedMoveIndex]);

    return (
      <>
        {gameOver && <Confetti />}
        <div className="flex relative">
          <div className="text-white-200 rounded-md overflow-hidden">
            {(isFlipped ? board.slice().reverse() : board).map((row, i) => {
              i = isFlipped ? i + 1 : 8 - i;
              return (
                <div key={i} className="flex relative">
                  {showCoordinates && <NumberNotation isMainBoxColor={isFlipped ? i % 2 !== 0 : i % 2 === 0} label={i.toString()} />}
                  {(isFlipped ? row.slice().reverse() : row).map((square, j) => {
                    j = isFlipped ? 7 - (j % 8) : j % 8;

                    const isMainBoxColor = (i + j) % 2 !== 0;
                    const isPiece: boolean = !!square;
                    const squareRepresentation = (String.fromCharCode(97 + j) + '' + i) as Square;
                    const isHighlightedSquare =
                      from === squareRepresentation ||
                      squareRepresentation === lastMove?.from ||
                      squareRepresentation === lastMove?.to;
                    const isRightClickedSquare = rightClickedSquares.includes(squareRepresentation);

                    const piece = square && square.type;
                    const isKingInCheckSquare = piece === 'k' && square?.color === chess.turn() && chess.inCheck();

                    return (
                      <div
                        onClick={() => {
                          // If game has ended, only allow viewing/navigation, not actual moves
                          if (!started) {
                            // Allow history navigation by clicking squares
                            // If we're viewing history, restore to live position when clicking
                            if (userSelectedMoveIndex !== null) {
                              chess.reset();
                              moves.forEach((move) => {
                                try {
                                  chess.move({ from: move.from, to: move.to });
                                } catch (e) {
                                  console.error('Error restoring move:', e, move);
                                }
                              });
                              setBoard(chess.board());
                              setUserSelectedMoveIndex(null);
                            }
                            // Don't allow actual moves when game ended
                            return;
                          }

                          // If we're viewing history, first jump back to the live position
                          // and recompute the clicked square from the updated chess instance.
                          let effectiveSquare = square;
                          if (userSelectedMoveIndex !== null) {
                            // Restore chess instance to the latest position by replaying all moves
                            chess.reset();
                            moves.forEach((move) => {
                              try {
                                chess.move({ from: move.from, to: move.to });
                              } catch (e) {
                                console.error('Error restoring move:', e, move);
                              }
                            });
                            setBoard(chess.board());
                            setUserSelectedMoveIndex(null);
                            // Recompute the square after restoring the chess instance
                            effectiveSquare = chess.get(squareRepresentation);
                          }

                          const effectiveIsPiece = !!effectiveSquare;

                          // Only allow interaction if it's the correct turn
                          if (!from && effectiveSquare?.color !== chess.turn()) return;
                          if (!allowBothColors && myColor !== chess.turn()) return;

                          if (from !== squareRepresentation) {
                            setFrom(squareRepresentation);
                            if (effectiveIsPiece) {
                              setLegalMoves(
                                chess
                                  .moves({
                                    verbose: true,
                                    square: squareRepresentation,
                                  })
                                  .map((move) => move.to)
                              );
                            }
                          } else {
                            setFrom(null);
                          }

                          if (!effectiveIsPiece) {
                            setLegalMoves([]);
                          }

                          if (!from) {
                            setFrom(squareRepresentation);
                            setLegalMoves(
                              chess
                                .moves({
                                  verbose: true,
                                  square: squareRepresentation,
                                })
                                .map((move) => move.to)
                            );
                          } else {
                            try {
                              let moveResult: Move;
                              if (isPromoting(chess, from, squareRepresentation)) {
                                moveResult = chess.move({
                                  from,
                                  to: squareRepresentation,
                                  promotion: 'q',
                                });
                              } else {
                                moveResult = chess.move({
                                  from,
                                  to: squareRepresentation,
                                });
                              }
                              if (moveResult) {
                                moveAudio.play();

                                if (moveResult?.captured) {
                                  captureAudio.play();
                                }
                                setMoves((prev) => [...prev, moveResult]);
                                setFrom(null);
                                setLegalMoves([]);
                                if (moveResult.san.includes('#')) {
                                  setGameOver(true);
                                }
                                // Debug: log outgoing move
                                console.log('ChessBoard sending move to socket:', moveResult);
                                socket.send(
                                  JSON.stringify({
                                    type: MOVE,
                                    payload: {
                                      gameId,
                                      move: moveResult,
                                    },
                                  })
                                );
                              }
                            } catch (e) {
                              console.log('e', e);
                            }
                          }
                        }}
                        style={{
                          width: boxSize,
                          height: boxSize,
                        }}
                        key={j}
                        className={`${isRightClickedSquare ? (isMainBoxColor ? 'bg-[#CF664E]' : 'bg-[#E87764]') : isKingInCheckSquare ? 'bg-[#FF6347]' : isHighlightedSquare ? `${isMainBoxColor ? 'bg-[#BBCB45]' : 'bg-[#F4F687]'}` : isMainBoxColor ? 'bg-boardDark' : 'bg-boardLight'} ${''}`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                        }}
                        onMouseDown={(e) => {
                          handleMouseDown(e, squareRepresentation);
                        }}
                        onMouseUp={(e) => {
                          handleMouseUp(e, squareRepresentation);
                        }}
                      >
                        <div className="w-full justify-center flex h-full relative">
                          {square && <ChessSquare square={square} />}
                          {showCoordinates && (isFlipped
                            ? i === 8 && <LetterNotation label={labels[j]} isMainBoxColor={j % 2 === 0} />
                            : i === 1 && <LetterNotation label={labels[j]} isMainBoxColor={j % 2 !== 0} />)}
                          {!!from && legalMoves.includes(squareRepresentation) && (
                            <LegalMoveIndicator isMainBoxColor={isMainBoxColor} isPiece={!!square?.type} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <canvas
            ref={(ref) => setCanvas(ref)}
            width={boxSize * 8}
            height={boxSize * 8}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
            }}
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            onMouseUp={(e) => e.preventDefault()}
          ></canvas>
        </div>
      </>
    );
  }
);
