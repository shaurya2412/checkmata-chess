import { Chess, Move } from 'chess.js';
import stockfishScriptUrl from 'stockfish.js/stockfish.js?url';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

interface EngineConfig {
  depth: number;
  skill: number;
  time: number;
}

const DIFFICULTY_CONFIG: Record<DifficultyLevel, EngineConfig> = {
  easy: { depth: 5, skill: 0, time: 1000 },
  medium: { depth: 10, skill: 10, time: 2000 },
  hard: { depth: 15, skill: 20, time: 3000 },
};

export class ChessEngine {
  private stockfish: Worker | null = null;
  private difficulty: DifficultyLevel;
  private config: EngineConfig;
  private isReady: boolean = false;

  constructor(difficulty: DifficultyLevel = 'medium') {
    this.difficulty = difficulty;
    this.config = DIFFICULTY_CONFIG[difficulty];
    this.initializeEngine();
  }

  private initializeEngine() {
    // Kick off async setup; callers wait on waitForReady().
    this.setupEngine();
  }

  private async setupEngine() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      console.error('Window not available');
      return;
    }

    try {
      console.log('Spawning Stockfish worker from bundled asset...');
      this.stockfish = new Worker(stockfishScriptUrl);
      this.setupMessageHandler();
      this.initializeUCI();
    } catch (error) {
      console.error('Error setting up engine worker:', error);
      this.stockfish = null;
    }
  }

  private setupMessageHandler() {
    if (!this.stockfish) return;

    this.stockfish.onmessage = (event: MessageEvent) => {
      const message =
        typeof event.data === 'string' ? event.data : event.data?.toString?.() || '';

      if (!message) return;

      if (message.includes('uciok') || message.includes('readyok')) {
        this.isReady = true;
      } else if (message.includes('error')) {
        console.error('Engine error:', message);
      }
    };
  }

  async getBestMove(chess: Chess): Promise<Move | null> {
    if (!this.isReady) {
      await this.waitForReady();
    }

    if (!this.stockfish) {
      console.error('Stockfish worker not initialized');
      return null;
    }

    return new Promise((resolve) => {
      const fen = chess.fen();
      let bestMove: string | null = null;
      let resolved = false;

      const messageHandler = (event: any) => {
        const message = typeof event.data === 'string' ? event.data : event.data || '';
        console.log('Engine message:', message);
        if (message && message.includes('bestmove')) {
          const match = message.match(/bestmove\s+(\S+)/);
          if (match && match[1] && match[1] !== 'none') {
            bestMove = match[1];
            console.log('Found best move string:', bestMove);
            resolved = true;
            this.setupMessageHandler(); // restore default handler
            const parsedMove = this.parseMove(chess, bestMove!);
            console.log('Parsed move:', parsedMove);
            resolve(parsedMove);
          }
        }
      };

      // Temporarily override handler
      this.stockfish.onmessage = messageHandler;

      // Set position and search
      this.stockfish.postMessage(`position fen ${fen}`);
      this.stockfish.postMessage(`go depth ${this.config.depth} movetime ${this.config.time}`);

      // Timeout fallback
      setTimeout(() => {
        if (!resolved) {
          console.warn('Engine timeout, using random move');
          this.setupMessageHandler(); // restore
          // Fallback to random legal move
          const moves = chess.moves({ verbose: true });
          if (moves.length > 0) {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            console.log('Random fallback move:', randomMove);
            resolve(randomMove);
          } else {
            resolve(null);
          }
        }
      }, this.config.time + 1000);
    });
  }

  async evaluatePosition(chess: Chess): Promise<number> {
    if (!this.isReady) {
      console.log('Engine not ready, waiting...');
      await this.waitForReady();
    }

    if (!this.stockfish) {
      console.error('Stockfish not initialized');
      return 0;
    }

    return new Promise((resolve) => {
      const fen = chess.fen();
      let evaluation: number = 0;
      let resolved = false;

      const messageHandler = (event: any) => {
        const message = typeof event.data === 'string' ? event.data : (event?.data || event?.toString() || '');
        
        if (!message) return;

        // Look for evaluation in various formats
        if (message.includes('score cp')) {
          const match = message.match(/score cp\s+(-?\d+)/);
          if (match) {
            evaluation = parseInt(match[1], 10);
            console.log('Evaluation found:', evaluation);
          }
        }
        
        // Also check for mate scores
        if (message.includes('score mate')) {
          const match = message.match(/score mate\s+(-?\d+)/);
          if (match) {
            const mateIn = parseInt(match[1], 10);
            evaluation = mateIn > 0 ? 1000 - mateIn : -1000 + mateIn;
            console.log('Mate score found:', evaluation);
          }
        }

        if (message.includes('bestmove')) {
          if (!resolved) {
            resolved = true;
            // Restore original handler
            this.setupMessageHandler();
            // Evaluation is in centipawns, positive for white, negative for black
            console.log('Final evaluation:', evaluation);
            resolve(evaluation);
          }
        }
      };

      // Save original handler
      const originalHandler = this.stockfish.onmessage;
      this.stockfish.onmessage = messageHandler;
      
      console.log('Requesting evaluation for position:', fen);
      this.stockfish.postMessage(`position fen ${fen}`);
      this.stockfish.postMessage(`go depth ${this.config.depth}`);

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.stockfish.onmessage = originalHandler;
          console.log('Evaluation timeout, returning:', evaluation);
          resolve(evaluation);
        }
      }, this.config.time + 2000);
    });
  }

  private parseMove(chess: Chess, moveString: string): Move | null {
    try {
      const from = moveString.substring(0, 2) as any;
      const to = moveString.substring(2, 4) as any;
      const promotion = moveString.length > 4 ? moveString[4] : undefined;

      // Don't modify the board - just create a move object
      const moves = chess.moves({ verbose: true });
      const moveObj = moves.find(
        (m) =>
          m.from === from &&
          m.to === to &&
          (!promotion || m.promotion === promotion),
      );

      return moveObj || null;
    } catch (error) {
      console.error('Error parsing move:', error);
      return null;
    }
  }

  private initializeUCI() {
    if (!this.stockfish) return;
    
    // Initialize UCI
    this.stockfish.postMessage('uci');
    this.stockfish.postMessage('isready');
    this.stockfish.postMessage(`setoption name Skill Level value ${this.config.skill}`);
  }

  private waitForReady(): Promise<void> {
    return new Promise((resolve) => {
      const checkReady = setInterval(() => {
        if (this.isReady) {
          clearInterval(checkReady);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkReady);
        resolve();
      }, 5000);
    });
  }

  setDifficulty(difficulty: DifficultyLevel) {
    this.difficulty = difficulty;
    this.config = DIFFICULTY_CONFIG[difficulty];
    if (this.stockfish) {
      this.stockfish.postMessage(`setoption name Skill Level value ${this.config.skill}`);
    }
  }

  destroy() {
    if (this.stockfish) {
      this.stockfish.postMessage('quit');
      this.stockfish = null;
    }
    this.isReady = false;
  }
}

