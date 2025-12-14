/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from 'react';
import MoveSound from '/move.wav';
import { Button } from '../components/Button';
import { ChessBoard, isPromoting } from '../components/ChessBoard';
import { useSocket } from '../hooks/useSocket';
import { Chess, Move } from 'chess.js';
import { useNavigate, useParams } from 'react-router-dom';
import MovesTable from '../components/MovesTable';
import { useUser } from '@repo/store/useUser';
import { UserAvatar } from '../components/UserAvatar';

// TODO: Move together, there's code repetition here
export const INIT_GAME = 'init_game';
export const MOVE = 'move';
export const OPPONENT_DISCONNECTED = 'opponent_disconnected';
export const GAME_OVER = 'game_over';
export const JOIN_ROOM = 'join_room';
export const GAME_JOINED = 'game_joined';
export const GAME_ALERT = 'game_alert';
export const GAME_ADDED = 'game_added';
export const USER_TIMEOUT = 'user_timeout';
export const GAME_TIME = 'game_time';
export const GAME_ENDED = 'game_ended';
export const EXIT_GAME = 'exit_game';
export const GAME_NOT_FOUND = 'game_not_found';
export const RESIGN = 'resign';
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

export interface Player {
  id: string;
  name: string;
  isGuest: boolean;
}
import { useRecoilValue, useSetRecoilState } from 'recoil';

import { movesAtom, userSelectedMoveIndexAtom } from '@repo/store/chessBoard';
import GameEndModal from '@/components/GameEndModal';
import { Waitopponent } from '@/components/ui/waitopponent';
import { ShareGame } from '../components/ShareGame';
import ExitGameModel from '@/components/ExitGameModel';

const moveAudio = new Audio(MoveSound);

export interface Metadata {
  blackPlayer: Player;
  whitePlayer: Player;
}

export const Game = () => {
  const socket = useSocket();
  const { gameId } = useParams();
  const user = useUser();

  const navigate = useNavigate();
  // Todo move to store/context
  const [chess, _setChess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());
  const [added, setAdded] = useState(false);
  const [started, setStarted] = useState(false);
  const [gameMetadata, setGameMetadata] = useState<Metadata | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [player1TimeConsumed, setPlayer1TimeConsumed] = useState(0);
  const [player2TimeConsumed, setPlayer2TimeConsumed] = useState(0);
  const [gameID, setGameID] = useState('');
  const setMoves = useSetRecoilState(movesAtom);
  const userSelectedMoveIndex = useRecoilValue(userSelectedMoveIndexAtom);
  const userSelectedMoveIndexRef = useRef(userSelectedMoveIndex);

  useEffect(() => {
    userSelectedMoveIndexRef.current = userSelectedMoveIndex;
  }, [userSelectedMoveIndex]);

  useEffect(() => {
    if (!user) {
      window.location.href = '/login';
    }
  }, [user]);

  useEffect(() => {
    if (!socket) {
      console.log('Game useEffect: No socket, skipping message handler setup');
      return;
    }
    console.log('Game useEffect: Setting up socket message handler');
    socket.onmessage = function (event) {
      console.log('Game: Raw message received:', event.data);
      try {
        const message = JSON.parse(event.data);
        console.log('Game: Parsed message type:', message.type);
        console.log('Game: Full parsed message:', JSON.stringify(message, null, 2));
        console.log('Game: Checking case for:', message.type, 'vs GAME_ADDED constant:', GAME_ADDED);
        console.log('Game: Type comparison (===):', message.type === GAME_ADDED);
        console.log('Game: Type comparison (==):', message.type == GAME_ADDED);
        console.log('Game: Type lowercase comparison:', message.type?.toLowerCase() === 'game_added');
        
        // Handle GAME_ADDED before switch to ensure it's caught
        if (message.type === GAME_ADDED || message.type === 'game_added' || message.type?.toLowerCase() === 'game_added') {
          console.log('GAME_ADDED HANDLER TRIGGERED!');
          const extractedGameId = message.gameId || message.gameID || message.payload?.gameId || message.payload?.gameID || '';
          console.log('Extracted gameId:', extractedGameId);
          if (extractedGameId) {
            console.log('Setting state: added=true, gameID=', extractedGameId);
            setAdded(true);
            setGameID(extractedGameId);
          } else {
            console.error('ERROR: No gameId found!', message);
          }
          return; // Exit early after handling
        }
        
        switch (message.type) {
        case GAME_ADDED:
        case 'game_added': // Fallback in case of case mismatch
          console.log('GAME_ADDED received - full message:', JSON.stringify(message, null, 2));
          console.log('Message type:', message.type);
          console.log('Message keys:', Object.keys(message));
          const extractedGameId = message.gameId || message.gameID || message.payload?.gameId || message.payload?.gameID || '';
          console.log('Extracted gameId:', extractedGameId);
          if (extractedGameId) {
            console.log('Setting added=true and gameID=', extractedGameId);
            setAdded(true);
            setGameID(extractedGameId);
            console.log('State should now be: added=true, gameID=', extractedGameId);
          } else {
            console.error('ERROR: No gameId found in GAME_ADDED message!', message);
            alert('Received GAME_ADDED but no gameId found. Check console for details.');
          }
          break;
        case INIT_GAME:
          setBoard(chess.board());
          setStarted(true);
          navigate(`/game/${message.payload.gameId}`);
          setGameMetadata({
            blackPlayer: message.payload.blackPlayer,
            whitePlayer: message.payload.whitePlayer,
          });
          break;
        case MOVE:
          const { move, player1TimeConsumed, player2TimeConsumed } = message.payload;
          setPlayer1TimeConsumed(player1TimeConsumed);
          setPlayer2TimeConsumed(player2TimeConsumed);
          if (userSelectedMoveIndexRef.current !== null) {
            setMoves((moves) => [...moves, move]);
            return;
          }
          try {
            if (isPromoting(chess, move.from, move.to)) {
              chess.move({
                from: move.from,
                to: move.to,
                promotion: 'q',
              });
            } else {
              chess.move({ from: move.from, to: move.to });
            }
            setMoves((moves) => [...moves, move]);
            moveAudio.play();
          } catch (error) {
            console.log('Error', error);
          }
          break;
        case GAME_OVER:
          setResult(message.payload.result);
          break;

        case GAME_ENDED:
          let wonBy;
          switch (message.payload.status) {
            case 'COMPLETED':
              wonBy = message.payload.result !== 'DRAW' ? 'CheckMate' : 'Draw';
              break;
            case 'PLAYER_EXIT':
              wonBy = 'Player Exit';
              break;
            default:
              wonBy = 'Timeout';
          }
          setResult({
            result: message.payload.result,
            by: wonBy,
          });
          chess.reset();
          setStarted(false);
          setAdded(false);

          break;

        case USER_TIMEOUT:
          setResult(message.payload.win);
          break;

        case GAME_JOINED:
          setGameMetadata({
            blackPlayer: message.payload.blackPlayer,
            whitePlayer: message.payload.whitePlayer,
          });
          setPlayer1TimeConsumed(message.payload.player1TimeConsumed);
          setPlayer2TimeConsumed(message.payload.player2TimeConsumed);
          console.error(message.payload);
          setStarted(true);

          message.payload.moves.map((x: Move) => {
            if (isPromoting(chess, x.from, x.to)) {
              chess.move({ ...x, promotion: 'q' });
            } else {
              chess.move(x);
            }
          });
          setMoves(message.payload.moves);
          break;

        case GAME_TIME:
          setPlayer1TimeConsumed(message.payload.player1Time);
          setPlayer2TimeConsumed(message.payload.player2Time);
          break;

        case GAME_NOT_FOUND:
          alert('Game not found or no active game for this ID.');
          navigate('/');
          break;

        default:
          console.warn('Unhandled socket message type:', message.type);
          console.warn('Full unhandled message:', JSON.stringify(message, null, 2));
          // Check if it's GAME_ADDED with different casing
          if (message.type && message.type.toLowerCase() === 'game_added') {
            console.log('Found game_added with different casing, handling...');
            const extractedGameId = message.gameId || message.gameID || message.payload?.gameId || message.payload?.gameID || '';
            if (extractedGameId) {
              console.log('Extracting gameId from lowercased message:', extractedGameId);
              setAdded(true);
              setGameID(extractedGameId);
            }
            break;
          }
          const payloadMsg =
            message?.payload?.message ||
            (typeof message?.payload === 'string' ? message.payload : '') ||
            'Unknown server message';
          if (payloadMsg && payloadMsg !== 'Unknown server message') {
            alert(payloadMsg);
          }
          break;
        }
      } catch (error) {
        console.error('Game: Error parsing socket message:', error, event.data);
      }
    };
    
    socket.onerror = function (error) {
      console.error('Game: Socket error:', error);
    };
    
    socket.onclose = function (event) {
      console.log('Game: Socket closed:', event.code, event.reason);
      setAdded(false);
    };
    
    // Cleanup function
    const cleanup = () => {
      console.log('Game useEffect cleanup: Removing message handler');
      if (socket) {
        socket.onmessage = null;
      }
    };

    if (gameId && gameId !== 'random') {
      console.log('Joining room:', gameId);
      socket.send(
        JSON.stringify({
          type: JOIN_ROOM,
          payload: {
            gameId,
          },
        })
      );
    }
    
    return cleanup;
  }, [chess, socket, gameId, navigate, setMoves, userSelectedMoveIndexRef, user]);

  useEffect(() => {
    if (started) {
      const interval = setInterval(() => {
        if (chess.turn() === 'w') {
          setPlayer1TimeConsumed((p) => p + 100);
        } else {
          setPlayer2TimeConsumed((p) => p + 100);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [started, gameMetadata, user]);

  const getTimer = (timeConsumed: number) => {
    const timeLeftMs = GAME_TIME_MS - timeConsumed;
    const minutes = Math.floor(timeLeftMs / (1000 * 60));
    const remainingSeconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);

    return (
      <>
        Time Left: {minutes < 10 ? '0' : ''}
        {minutes}:{remainingSeconds < 10 ? '0' : ''}
        {remainingSeconds}
      </>
    );
  };

  const handleExit = () => {
    socket?.send(
      JSON.stringify({
        type: EXIT_GAME,
        payload: {
          gameId,
        },
      })
    );
    setMoves([]);
    navigate('/');
  };

  const handleResign = () => {
    console.log('handleResign called', { socket: !!socket, gameId, started });
    if (!socket || !gameId || !started) {
      console.warn('handleResign: Cannot resign - missing requirements', {
        socket: !!socket,
        gameId,
        started,
      });
      return;
    }
    console.log('handleResign: Sending RESIGN message', { gameId });
    socket.send(
      JSON.stringify({
        type: RESIGN,
        payload: {
          gameId,
        },
      })
    );
  };

  if (!socket) return <div>Connecting...</div>;

  return (
    <div className="min-h-screen bg-bgMain">
      {result && (
        <GameEndModal
          blackPlayer={gameMetadata?.blackPlayer}
          whitePlayer={gameMetadata?.whitePlayer}
          gameResult={result}
        ></GameEndModal>
      )}
      {started && (
        <div className="justify-center flex pt-4 text-textMain">
          <div className="px-4 py-2 bg-bgAuxiliary1 rounded-card text-sm font-medium">
            {(user.id === gameMetadata?.blackPlayer?.id ? 'b' : 'w') === chess.turn() ? 'Your turn' : "Opponent's turn"}
          </div>
        </div>
      )}
      <div className="justify-center flex">
        <div className="pt-2 w-full">
          <div className="flex gap-6 w-full">
            <div className="text-textMain">
              <div className="flex justify-center">
                <div>
                  {started && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center">
                        <UserAvatar gameMetadata={gameMetadata} />
                        <div className="text-textMain bg-bgAuxiliary1 px-3 py-1.5 rounded-card font-mono text-sm">
                          {getTimer(
                            user.id === gameMetadata?.whitePlayer?.id ? player2TimeConsumed : player1TimeConsumed
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className={`w-full flex justify-center`}>
                      <ChessBoard
                        started={started}
                        gameId={gameId ?? ''}
                        myColor={user.id === gameMetadata?.blackPlayer?.id ? 'b' : 'w'}
                        chess={chess}
                        setBoard={setBoard}
                        socket={socket}
                        board={board}
                      />
                    </div>
                  </div>
                  {started && (
                    <div className="mt-4 flex justify-between items-center">
                      <UserAvatar gameMetadata={gameMetadata} self />
                      <div className="text-textMain bg-bgAuxiliary1 px-3 py-1.5 rounded-card font-mono text-sm">
                        {getTimer(user.id === gameMetadata?.blackPlayer?.id ? player2TimeConsumed : player1TimeConsumed)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-card pt-2 bg-bgAuxiliary1 flex-1 overflow-auto h-[95vh] overflow-y-scroll no-scrollbar border border-borderColor">
              {/* Debug info - remove after fixing */}
              {/* {process.env.NODE_ENV === 'development' && (
                // <div className="p-2 bg-bgAuxiliary2 text-xs text-textSecondary mb-2">
                //   Debug: added={added ? 'true' : 'false'}, gameID={gameID || '(empty)'}, started={started ? 'true' : 'false'}
                // </div>
              )} */}
              {!started ? (
                <div className="pt-8 flex justify-center w-full">
                  {added && gameID ? (
                    <div className="flex flex-col items-center space-y-4 justify-center">
                      <div className="text-textMain">
                        <Waitopponent />
                      </div>
                      <ShareGame gameId={gameID} />
                    </div>
                  ) : added && !gameID ? (
                    <div className="text-textSecondary text-center">
                      <p>Waiting for game ID...</p>
                      <p className="text-xs mt-2">State: added={added ? 'true' : 'false'}, gameID={gameID || '(empty)'}</p>
                      <p className="text-xs">Check console for GAME_ADDED message</p>
                    </div>
                  ) : (
                    gameId === 'random' && (
                      <Button
                        onClick={() => {
                          if (!socket) {
                            console.error('Socket not connected');
                            alert('Socket not connected. Please refresh the page.');
                            return;
                          }
                          console.log('Sending INIT_GAME, socket readyState:', socket.readyState);
                          console.log('Socket URL:', socket.url);
                          if (socket.readyState !== WebSocket.OPEN) {
                            console.error('Socket is not open. State:', socket.readyState);
                            alert('Socket connection is not open. Please refresh the page.');
                            return;
                          }
                          try {
                            const message = JSON.stringify({
                              type: INIT_GAME,
                            });
                            console.log('Sending message:', message);
                            socket.send(message);
                            console.log('Message sent successfully');
                          } catch (error) {
                            console.error('Error sending INIT_GAME:', error);
                            alert('Error sending game request: ' + error);
                          }
                        }}
                      >
                        Play
                      </Button>
                    )
                  )}
                </div>
              ) : (
                <div className="p-8 flex justify-center w-full">
                  <ExitGameModel onClick={() => handleExit()} />
                </div>
              )}
              <div>
                <MovesTable onResign={handleResign} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
