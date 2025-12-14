import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WhiteKing from '../../public/wk.png';
import BlackKing from '../../public/bk.png';
import { GameResult, Result } from '@/screens/Game';
import { Move } from 'chess.js';

interface ModalProps {
  blackPlayer?: { id: string; name: string };
  whitePlayer?: { id: string; name: string };
  gameResult: GameResult;
  moves?: Move[];
  userColor?: 'w' | 'b';
}

const GameEndModal: React.FC<ModalProps> = ({ blackPlayer, whitePlayer, gameResult, moves = [], userColor = 'w' }) => {
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();

  const closeModal = () => {
    setIsOpen(false);
  };

  const goToAnalysis = () => {
    // Ensure we always send the latest available moves, even if routing state was lost
    const persisted = (() => {
      try {
        const raw = sessionStorage.getItem('lastBotGameAnalysis');
        if (!raw) return null;
        return JSON.parse(raw) as { moves?: Move[]; userColor?: 'w' | 'b'; result?: GameResult; fen?: string };
      } catch (err) {
        console.warn('Unable to read persisted analysis data', err);
        return null;
      }
    })();

    const movesForAnalysis = moves?.length ? moves : persisted?.moves ?? [];
    const colorForAnalysis = userColor ?? persisted?.userColor ?? 'w';
    const resultForAnalysis = gameResult ?? persisted?.result;
    const fenForAnalysis = persisted?.fen;

    // Persist again right before navigating to guarantee sessionStorage is up to date
    try {
      sessionStorage.setItem(
        'lastBotGameAnalysis',
        JSON.stringify({
          moves: movesForAnalysis,
          userColor: colorForAnalysis,
          fen: fenForAnalysis,
          result: resultForAnalysis,
        })
      );
    } catch (err) {
      console.warn('Unable to persist analysis data before navigating', err);
    }

    navigate('/analysis', {
      state: {
        moves: movesForAnalysis,
        userColor: colorForAnalysis,
        result: resultForAnalysis,
        fen: fenForAnalysis,
        // Flag so analysis page knows to load the last persisted game when opened from here
        useLastBotGame: true,
      },
    });
    setIsOpen(false);
  };

  const PlayerDisplay = ({
    player,
    gameResult,
    isWhite,
  }: {
    player?: { id: string; name: string };
    gameResult: Result;
    isWhite: boolean;
  }) => {
    const imageSrc = isWhite ? WhiteKing : BlackKing;
    const borderColor =
      gameResult === (isWhite ? Result.WHITE_WINS : Result.BLACK_WINS) ? 'border-green-400' : 'border-red-400';

    return (
      <div className="flex flex-col items-center">
        <div className={`border-4 rounded-full p-2 ${borderColor}`}>
          <img src={imageSrc} alt={`${isWhite ? 'White' : 'Black'} King`} className="w-10 h-10" />
        </div>
        <div className="text-center text-xm p-2">
          <p className="text-white truncate w-24" title={getPlayerName(player)}>
            {getPlayerName(player)}
          </p>
        </div>
      </div>
    );
  };

  const getWinnerMessage = (result: Result) => {
    switch (result) {
      case Result.BLACK_WINS:
        return 'Black Wins!';
      case Result.WHITE_WINS:
        return 'White Wins!';
      default:
        return "It's a Draw";
    }
  };

  const getPlayerName = (player: { id: string; name: string } | undefined) => {
    return player ? player.name : 'Unknown';
  };

  return (
    <div>
      {isOpen && (
        <div className="fixed top-4 right-4 z-50 rounded pointer-events-none">
          <div className="relative rounded-lg shadow-lg bg-gray-800 w-96 pointer-events-auto">
            <div className="px-6 py-8 items-center self-center m-auto">
              <div className="m-auto mb-6">
                <h2 className={`text-4xl font-bold mb-2 text-yellow-400 text-center text-wrap`}>
                  {getWinnerMessage(gameResult.result)}
                </h2>
              </div>
              <div className="m-auto mb-6">
                <p className="text-xl text-white text-center">by {gameResult.by}</p>
              </div>
              <div className="flex flex-row justify-between items-center bg-gray-700 rounded-lg px-4 py-6">
                <PlayerDisplay isWhite={true} player={whitePlayer} gameResult={gameResult.result} />
                <div className="text-white text-2xl font-bold">vs</div>
                <PlayerDisplay isWhite={false} player={blackPlayer} gameResult={gameResult.result} />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-900 text-right rounded-b-lg space-x-3">
              {/* <button
                className="px-6 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none inline-block"
                onClick={goToAnalysis}
              >
                ye button hata den??
              </button> */}
              <button
                className="px-6 py-3 text-white bg-gray-600 rounded-lg hover:bg-gray-700 focus:outline-none inline-block"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
            <div className="px-6 py-2 bg-gray-900 text-center text-xs text-gray-400 rounded-b-lg">
              Game ended - You can review moves on the board
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameEndModal;
