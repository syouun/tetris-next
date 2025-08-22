
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import GameBoard from './GameBoard';
import NextPiece from './NextPiece';

/** =====================
 *  Constants & Types
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

type NextOnly = Omit<Piece, 'x' | 'y'>;

type GameState = {
  grid: Cell[][];
  currentPiece: Piece;
  nextPiece: NextOnly;
  gameOver: boolean;
  score: number;
  level: number;      // 1..
  fallSpeed: number;  // seconds per cell at normal speed (lower = faster)
};

/** =====================
 *  Tetrominoes
 *  ===================== */
const SHAPES: number[][][] = [
  // I
  [[1, 1, 1, 1]],
  // O
  [[1, 1],[1, 1]],
  // T
  [[0, 1, 0],[1, 1, 1]],
  // S
  [[0, 1, 1],[1, 1, 0]],
  // Z
  [[1, 1, 0],[0, 1, 1]],
  // J
  [[1, 0, 0],[1, 1, 1]],
  // L
  [[0, 0, 1],[1, 1, 1]],
];

const COLORS = ['#00BCD4', '#FFC107', '#9C27B0', '#4CAF50', '#F44336', '#3F51B5', '#FF9800'];

/** Helpers */
function randomNext(): NextOnly {
  const i = Math.floor(Math.random() * SHAPES.length);
  return { shape: SHAPES[i], color: COLORS[i] };
}

function emptyGrid(): Cell[][] {
  return Array.from({ length: GRID_HEIGHT }, () => Array<Cell>(GRID_WIDTH).fill(null));
}

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

function placeIntoGrid(grid: Cell[][], piece: Piece): Cell[][] {
  const g = grid.map(row => [...row]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const y = piece.y + r;
      const x = piece.x + c;
      if (y >= 0) g[y][x] = piece.color;
    }
  }
  return g;
}

function clearFullLines(grid: Cell[][]): { grid: Cell[][]; cleared: number } {
  const newGrid: Cell[][] = [];
  let cleared = 0;
  for (let y = 0; y < GRID_HEIGHT; y++) {
    const full = grid[y].every(cell => cell !== null);
    if (full) cleared++;
    else newGrid.push([...grid[y]]);
  }
  while (newGrid.length < GRID_HEIGHT) newGrid.unshift(Array<Cell>(GRID_WIDTH).fill(null));
  return { grid: newGrid, cleared };
}

function scoreDelta(lines: number): number {
  // single=100, double=300, triple=500, tetris=800
  return [0, 100, 300, 500, 800][lines] || 0;
}

function spawnFrom(next: NextOnly): Piece {
  return {
    shape: next.shape,
    color: next.color,
    x: Math.floor(GRID_WIDTH / 2 - next.shape[0].length / 2),
    y: -2,
  };
}

/** Lock current, clear lines, score/level, then spawn next */
function lockAndSpawn(prev: GameState): GameState {
  const merged = placeIntoGrid(prev.grid, prev.currentPiece);
  const { grid: clearedGrid, cleared } = clearFullLines(merged);
  const nextScore = prev.score + scoreDelta(cleared) * prev.level;
  const nextLevel = Math.floor(nextScore / 1000) + 1;
  const nextFall = Math.max(0.05, 0.8 - (nextLevel - 1) * 0.05);

  // spawn new current piece
  const nextPiece = prev.nextPiece;
  const newCurrent = spawnFrom(nextPiece);
  const newNext = randomNext();
  const immediateCollision = collides(clearedGrid, newCurrent.shape, newCurrent.x, newCurrent.y);

  return {
    grid: clearedGrid,
    currentPiece: newCurrent,
    nextPiece: newNext,
    gameOver: immediateCollision ? true : false,
    score: nextScore,
    level: nextLevel,
    fallSpeed: nextFall,
  };
}

/** Single gravity step: move down or lock */
function stepGravity(prev: GameState): GameState {
  const { currentPiece, grid } = prev;
  const nx = currentPiece.x;
  const ny = currentPiece.y + 1;

  if (!collides(grid, currentPiece.shape, nx, ny)) {
    return { ...prev, currentPiece: { ...currentPiece, y: ny } };
  }
  // if piece is above top and cannot move -> game over
  if (currentPiece.y < 0) {
    return { ...prev, gameOver: true };
  }
  // lock and spawn next in one atomic update
  return lockAndSpawn(prev);
}

/** Hard drop: fall to lowest then lock */
function hardDrop(prev: GameState): GameState {
  let { currentPiece, grid } = prev;
  let { x, y, shape } = currentPiece;
  while (!collides(grid, shape, x, y + 1)) y++;
  const landed: GameState = { ...prev, currentPiece: { ...currentPiece, y } };
  return lockAndSpawn(landed);
}

export default function TetrisGame() {
  const [softDrop, setSoftDrop] = useState(false);
  const [version, setVersion] = useState(0);
  const lastFallRef = useRef<number>(performance.now());

  const [state, setState] = useState<GameState>(() => {
    const next = randomNext();
    return {
      grid: emptyGrid(),
      currentPiece: spawnFrom(next),
      nextPiece: randomNext(),
      gameOver: false,
      score: 0,
      level: 1,
      fallSpeed: 0.8,
    };
  });

  const restart = useCallback(() => {
    const next = randomNext();
    setState({
      grid: emptyGrid(),
      currentPiece: spawnFrom(next),
      nextPiece: randomNext(),
      gameOver: false,
      score: 0,
      level: 1,
      fallSpeed: 0.8,
    });
    lastFallRef.current = performance.now();
    setSoftDrop(false);
    setVersion(v => v + 1); // force GameBoard remount
  }, []);

  const tryMove = useCallback((dx: number) => {
    setState(prev => {
      const { currentPiece, grid } = prev;
      const nx = currentPiece.x + dx;
      const ny = currentPiece.y;
      if (collides(grid, currentPiece.shape, nx, ny)) return prev;
      return { ...prev, currentPiece: { ...currentPiece, x: nx } };
    });
  }, []);

  const tryRotate = useCallback(() => {
    setState(prev => {
      const { currentPiece, grid } = prev;
      const rotated = rotateCW(currentPiece.shape);
      const kicks = [{x:0,y:0},{x:1,y:0},{x:-1,y:0},{x:2,y:0},{x:-2,y:0},{x:0,y:-1}];
      for (const k of kicks) {
        if (!collides(grid, rotated, currentPiece.x + k.x, currentPiece.y + k.y)) {
          return {
            ...prev,
            currentPiece: { ...currentPiece, shape: rotated, x: currentPiece.x + k.x, y: currentPiece.y + k.y }
          };
        }
      }
      return prev;
    });
  }, []);

  /** Keyboard */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (['ArrowDown','ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key)) e.preventDefault();
      if (state.gameOver) {
        if (e.key === 'r' || e.key === 'R') restart();
        return;
      }
      switch (e.key) {
        case 'ArrowLeft':
          tryMove(-1);
          break;
        case 'ArrowRight':
          tryMove(1);
          break;
        case 'ArrowDown':
          setSoftDrop(true);
          setState(prev => stepGravity(prev)); // nudge immediately
          lastFallRef.current = performance.now();
          break;
        case 'ArrowUp':
          tryRotate();
          break;
        case ' ':
          setState(prev => hardDrop(prev));
          lastFallRef.current = performance.now();
          break;
        case 'r':
        case 'R':
          restart();
          break;
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') setSoftDrop(false);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [restart, state.gameOver, tryMove, tryRotate]);

  /** Gravity loop */
  useEffect(() => {
    if (state.gameOver) return;
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      const interval = (softDrop ? Math.max(0.02, state.fallSpeed * 0.08) : state.fallSpeed) * 1000;
      if (now - lastFallRef.current >= interval) {
        setState(prev => stepGravity(prev));
        lastFallRef.current = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state.fallSpeed, state.gameOver, softDrop]);

  return (
    <div className="flex items-start gap-8">
      <GameBoard
        key={`board-${version}`}
        grid={state.grid}
        currentPiece={state.currentPiece}
        gridSize={GRID_SIZE}
      />

      <div className="w-64">
        <div className="mb-6">
          <h2 className="text-white text-xl mb-2">Score: {state.score}</h2>
          <h2 className="text-white text-xl">Level: {state.level}</h2>
        </div>

        <div className="mb-6">
          <h3 className="text-white text-lg mb-2">Next</h3>
          <NextPiece piece={state.nextPiece} gridSize={GRID_SIZE} />
        </div>

        {state.gameOver ? (
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
