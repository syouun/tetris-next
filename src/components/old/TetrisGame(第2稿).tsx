
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import GameBoard from './GameBoard';
import NextPiece from './NextPiece';

/** =====================
 *  Constants
 *  ===================== */
const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const GRID_SIZE = 30;

type Cell = string | null;

type Piece = {
  shape: number[][];
  color: string;
  x: number;
  y: number;
};

type GameState = {
  grid: Cell[][];
  currentPiece: Piece;
  nextPiece: Omit<Piece, 'x' | 'y'>;
  gameOver: boolean;
  score: number;
  level: number;      // 1..
  fallSpeed: number;  // seconds per cell at normal speed (lower = faster)
};

// Tetromino shapes
const SHAPES: number[][][] = [
  // I
  [[1, 1, 1, 1]],
  // O
  [[1, 1],
   [1, 1]],
  // T
  [[0, 1, 0],
   [1, 1, 1]],
  // S
  [[0, 1, 1],
   [1, 1, 0]],
  // Z
  [[1, 1, 0],
   [0, 1, 1]],
  // J
  [[1, 0, 0],
   [1, 1, 1]],
  // L
  [[0, 0, 1],
   [1, 1, 1]],
];

const COLORS = ['#00BCD4', '#FFC107', '#9C27B0', '#4CAF50', '#F44336', '#3F51B5', '#FF9800'];

/** Random next piece (no x,y yet) */
function randomNext(): Omit<Piece, 'x' | 'y'> {
  const i = Math.floor(Math.random() * SHAPES.length);
  return { shape: SHAPES[i], color: COLORS[i] };
}

/** Deep-empty grid */
function emptyGrid(): Cell[][] {
  return Array.from({ length: GRID_HEIGHT }, () => Array<Cell>(GRID_WIDTH).fill(null));
}

/** Collision check against walls/floor/filled cells */
function collides(grid: Cell[][], shape: number[][], px: number, py: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const x = px + c;
      const y = py + r;
      if (x < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT) return true;
      if (y >= 0 && grid[y][x] !== null) return true;
    }
  }
  return false;
}

/** Rotate 90° CW */
function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length, cols = shape[0].length;
  const out: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out[c][rows - 1 - r] = shape[r][c];
    }
  }
  return out;
}

/** Clear full lines -> returns new grid and number of cleared lines */
function clearFullLines(grid: Cell[][]): { grid: Cell[][], cleared: number } {
  const newGrid: Cell[][] = [];
  let cleared = 0;
  for (let y = 0; y < GRID_HEIGHT; y++) {
    const full = grid[y].every(cell => cell !== null);
    if (full) {
      cleared++;
    } else {
      newGrid.push([...grid[y]]);
    }
  }
  while (newGrid.length < GRID_HEIGHT) newGrid.unshift(Array<Cell>(GRID_WIDTH).fill(null));
  return { grid: newGrid, cleared };
}

export default function TetrisGame() {
  // ---------- ancillary states ----------
  const [softDrop, setSoftDrop] = useState(false);
  const [version, setVersion] = useState(0); // to force remount GameBoard on restart
  const lastFallRef = useRef<number>(performance.now());

  // ---------- game state ----------
  const [gameState, setGameState] = useState<GameState>(() => {
    const next = randomNext();
    const cur: Piece = {
      ...next,
      x: Math.floor(GRID_WIDTH / 2 - next.shape[0].length / 2),
      y: -2, // start slightly above the board
    };
    return {
      grid: emptyGrid(),
      currentPiece: cur,
      nextPiece: randomNext(),
      gameOver: false,
      score: 0,
      level: 1,
      fallSpeed: 0.8,
    };
  });

  /** spawn next -> current, generate next */
  const spawnNext = useCallback((prev: GameState): GameState => {
    const next = prev.nextPiece;
    const cur: Piece = {
      shape: next.shape,
      color: next.color,
      x: Math.floor(GRID_WIDTH / 2 - next.shape[0].length / 2),
      y: -2,
    };
    // if collides immediately -> game over
    if (collides(prev.grid, cur.shape, cur.x, cur.y)) {
      return { ...prev, gameOver: true };
    }
    return { ...prev, currentPiece: cur, nextPiece: randomNext() };
  }, []);

  /** lock current piece into grid + clear lines + score/level */
  const lockPiece = useCallback(() => {
    setGameState(prev => {
      const { shape, color, x, y } = prev.currentPiece;
      const newGrid = prev.grid.map(row => [...row]);
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          if (y + r >= 0) newGrid[y + r][x + c] = color;
        }
      }
      const { grid: afterClear, cleared } = clearFullLines(newGrid);

      // basic scoring: single=100, double=300, triple=500, tetris=800
      const add = [0, 100, 300, 500, 800][cleared] || 0;
      const newScore = prev.score + add * prev.level;
      const newLevel = Math.floor(newScore / 1000) + 1;
      const newFall = Math.max(0.05, 0.8 - (newLevel - 1) * 0.05);

      const intermediate: GameState = {
        ...prev,
        grid: afterClear,
        score: newScore,
        level: newLevel,
        fallSpeed: newFall,
      };
      return spawnNext(intermediate);
    });
  }, [spawnNext]);

  /** move piece by dx, dy if possible */
  const tryMove = useCallback((dx: number, dy: number) => {
    setGameState(prev => {
      const { shape, x, y } = prev.currentPiece;
      const nx = x + dx, ny = y + dy;
      if (collides(prev.grid, shape, nx, ny)) return prev;
      return { ...prev, currentPiece: { ...prev.currentPiece, x: nx, y: ny } };
    });
  }, []);

  /** rotate with simple wall kicks */
  const tryRotate = useCallback(() => {
    setGameState(prev => {
      const { shape, x, y } = prev.currentPiece;
      const rotated = rotateCW(shape);
      const kicks = [{x:0,y:0},{x:1,y:0},{x:-1,y:0},{x:2,y:0},{x:-2,y:0},{x:0,y:-1}];
      for (const k of kicks) {
        if (!collides(prev.grid, rotated, x + k.x, y + k.y)) {
          return { ...prev, currentPiece: { ...prev.currentPiece, shape: rotated, x: x + k.x, y: y + k.y } };
        }
      }
      return prev;
    });
  }, []);

  /** restart the game completely */
  const restart = useCallback(() => {
    setGameState(() => {
      const next = randomNext();
      const cur: Piece = {
        ...next,
        x: Math.floor(GRID_WIDTH / 2 - next.shape[0].length / 2),
        y: -2,
      };
      return {
        grid: emptyGrid(),
        currentPiece: cur,
        nextPiece: randomNext(),
        gameOver: false,
        score: 0,
        level: 1,
        fallSpeed: 0.8,
      };
    });
    lastFallRef.current = performance.now();
    setSoftDrop(false);
    setVersion(v => v + 1); // force GameBoard remount
  }, []);

  /** keyboard handlers */
  useEffect(() => {
    function onDown(e: KeyboardEvent) {
      if (['ArrowDown','ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key)) e.preventDefault();
      if (gameState.gameOver) {
        // allow quick restart with R even on game over screen
        if (e.key === 'r' || e.key === 'R') restart();
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          tryMove(-1, 0);
          break;
        case 'ArrowRight':
          tryMove(1, 0);
          break;
        case 'ArrowDown':
          setSoftDrop(true);
          // also nudge one cell immediately
          tryMove(0, 1);
          // reset gravity timer so continuous drop feels smooth
          lastFallRef.current = performance.now();
          break;
        case 'ArrowUp':
          tryRotate();
          break;
        case ' ':
          // hard drop
          setGameState(prev => {
            let { x, y, shape } = prev.currentPiece;
            while (!collides(prev.grid, shape, x, y + 1)) {
              y++;
            }
            return { ...prev, currentPiece: { ...prev.currentPiece, y } };
          });
          // lock immediately
          lockPiece();
          // reset fall timer
          lastFallRef.current = performance.now();
          break;
        case 'r':
        case 'R':
          restart();
          break;
      }
    }

    function onUp(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') setSoftDrop(false);
    }

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [gameState.gameOver, lockPiece, restart, tryMove, tryRotate]);

  /** main game loop (gravity) */
  useEffect(() => {
    if (gameState.gameOver) return;

    let rafId = 0;
    const loop = () => {
      const now = performance.now();
      const interval = (softDrop ? Math.max(0.02, gameState.fallSpeed * 0.08) : gameState.fallSpeed) * 1000;
      if (now - lastFallRef.current >= interval) {
        // try to move down, otherwise lock
        setGameState(prev => {
          const { shape, x, y } = prev.currentPiece;
          if (!collides(prev.grid, shape, x, y + 1)) {
            lastFallRef.current = now;
            return { ...prev, currentPiece: { ...prev.currentPiece, y: y + 1 } };
          } else if (y >= 0) {
            // lock outside of setState to avoid nested state updates; handle after
            // We'll mark using a flag
            (lockPiece as any)._schedule = true;
          }
          lastFallRef.current = now;
          return prev;
        });
        // if flagged, perform lock
        if ((lockPiece as any)._schedule) {
          (lockPiece as any)._schedule = false;
          lockPiece();
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [gameState.gameOver, gameState.fallSpeed, softDrop, lockPiece]);

  return (
    <div className="flex items-start gap-8">
      <GameBoard
        key={`board-${version}`}
        grid={gameState.grid}
        currentPiece={gameState.currentPiece}
        gridSize={GRID_SIZE}
      />

      <div className="w-64">
        <div className="mb-6">
          <h2 className="text-white text-xl mb-2">Score: {gameState.score}</h2>
          <h2 className="text-white text-xl">Level: {gameState.level}</h2>
        </div>

        <div className="mb-6">
          <h3 className="text-white text-lg mb-2">Next</h3>
          <NextPiece piece={gameState.nextPiece} gridSize={GRID_SIZE} />
        </div>

        {gameState.gameOver ? (
          <div className="text-center">
            <h2 className="text-red-500 text-2xl mb-3">Game Over</h2>
            <button
              onClick={restart}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Restart
            </button>
            <p className="text-white mt-3 text-sm">Press R to restart</p>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={restart}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Restart (R)
            </button>
            <div className="text-gray-300 text-sm mt-3 leading-6 text-left">
              <div>←/→ : Move</div>
              <div>↑ : Rotate</div>
              <div>↓ : Soft Drop (hold)</div>
              <div>Space : Hard Drop</div>
              <div>R : Restart</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
