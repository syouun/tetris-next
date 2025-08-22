'use client';
import { useState, useEffect, useCallback } from 'react';
import GameBoard from './GameBoard';
import NextPiece from './NextPiece';

// ゲーム定数
const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const GRID_SIZE = 30;
const SIDEBAR_WIDTH = 200;

// テトロミノの形状
const SHAPES = [
  [[1, 1, 1, 1]],  // I
  [[1, 1], [1, 1]],  // O
  [[0, 1, 0], [1, 1, 1]],  // T
  [[0, 1, 1], [1, 1, 0]],  // S
  [[1, 1, 0], [0, 1, 1]],  // Z
  [[1, 0, 0], [1, 1, 1]],  // J
  [[0, 0, 1], [1, 1, 1]]   // L
];

const COLORS = [
  '#00FFFF', // シアン (I)
  '#FFFF00', // 黄色 (O)
  '#800080', // 紫 (T)
  '#00FF00', // 緑 (S)
  '#FF0000', // 赤 (Z)
  '#0000FF', // 青 (J)
  '#FFA500'  // オレンジ (L)
];

// ゲーム状態の型定義
interface GameState {
  grid: (string | null)[][];
  currentPiece: {
    shape: number[][];
    color: string;
    x: number;
    y: number;
  };
  nextPiece: {
    shape: number[][];
    color: string;
  };
  gameOver: boolean;
  score: number;
  level: number;
  fallSpeed: number;
}

const TetrisGame = () => {
  // ゲーム状態の初期化
  const [gameState, setGameState] = useState<GameState>({
    grid: Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null)),
    currentPiece: {
      shape: SHAPES[0],
      color: COLORS[0],
      x: Math.floor(GRID_WIDTH / 2 - SHAPES[0][0].length / 2),
      y: 0
    },
    nextPiece: {
      shape: SHAPES[1],
      color: COLORS[1]
    },
    gameOver: false,
    score: 0,
    level: 1,
    fallSpeed: 0.8  // 落下速度を0.8秒に調整
  });
  
  const [lastFallTime, setLastFallTime] = useState<number>(0);
  
  // 新しいピースの生成
  const newPiece = useCallback(() => {
    const shapeIdx = Math.floor(Math.random() * SHAPES.length);
    return {
      shape: SHAPES[shapeIdx],
      color: COLORS[shapeIdx],
      x: Math.floor(GRID_WIDTH / 2 - SHAPES[shapeIdx][0].length / 2),
      y: 0
    };
  }, []);
  
  // 衝突判定
  const checkCollision = useCallback((
    shape: number[][],
    x: number,
    y: number
  ): boolean => {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] !== 0) {
          const newX = x + col;
          const newY = y + row;
          
          if (
            newX < 0 ||
            newX >= GRID_WIDTH ||
            newY >= GRID_HEIGHT ||
            (newY >= 0 && gameState.grid[newY][newX] !== null)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }, [gameState.grid]);
  
  // ライン消去処理
  const clearLines = useCallback(() => {
    let linesCleared = 0;
    const newGrid = [...gameState.grid];
    
    for (let y = GRID_HEIGHT - 1; y >= 0; y--) {
      if (newGrid[y].every(cell => cell !== null)) {
        linesCleared++;
        newGrid.splice(y, 1);
        newGrid.unshift(Array(GRID_WIDTH).fill(null));
      }
    }
    
    if (linesCleared > 0) {
      const points = [0, 40, 100, 300, 1200];
      setGameState(prev => ({
        ...prev,
        grid: newGrid,
        score: prev.score + (points[linesCleared] * prev.level)
      }));
      
      // レベルアップ
      const newLevel = Math.floor(gameState.score / 1000) + 1;
      if (newLevel > gameState.level) {
        setGameState(prev => ({
          ...prev,
          level: newLevel,
          fallSpeed: Math.max(0.05, 0.5 - (newLevel - 1) * 0.05)
        }));
      }
    }
  }, [gameState.grid, gameState.level, gameState.score]);
  
  // ピースの固定
  const lockPiece = useCallback(() => {
    const { shape, color, x, y } = gameState.currentPiece;
    const newGrid = [...gameState.grid];
    
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] && y + row >= 0) {
          newGrid[y + row][x + col] = color;
        }
      }
    }
    
    setGameState(prev => ({
      ...prev,
      grid: newGrid
    }));
    
    clearLines();
    
    // 新しいピースをセット
    const nextPiece = newPiece();
    const currentPiece = gameState.nextPiece;
    
    // 新しいピースの位置を設定
    const newX = Math.floor(GRID_WIDTH / 2 - currentPiece.shape[0].length / 2);
    const newY = 0;
    
    // 新しいピースが衝突したらゲームオーバー
    if (checkCollision(currentPiece.shape, newX, newY)) {
      setGameState(prev => ({
        ...prev,
        gameOver: true
      }));
      return;
    }
    
    setGameState(prev => ({
      ...prev,
      currentPiece: {
        ...currentPiece,
        x: newX,
        y: newY
      },
      nextPiece
    }));
  }, [gameState, newPiece, checkCollision, clearLines]);
  
  // キーハンドリング
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.gameOver) {
        if (e.key === 'r' || e.key === 'R') {
          // 完全に状態をリセット
          const newGrid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));
          const newCurrentPiece = newPiece();
          const newNextPiece = newPiece();
          
          setGameState({
            grid: newGrid,
            currentPiece: newCurrentPiece,
            nextPiece: newNextPiece,
            gameOver: false,
            score: 0,
            level: 1,
            fallSpeed: 0.8
          });
        }
        return;
      }
      
      const { shape, x, y } = gameState.currentPiece;
      
      switch (e.key) {
        case 'ArrowLeft':
          if (!checkCollision(shape, x - 1, y)) {
            setGameState(prev => ({
              ...prev,
              currentPiece: { ...prev.currentPiece, x: x - 1 }
            }));
          }
          break;
          
        case 'ArrowRight':
          if (!checkCollision(shape, x + 1, y)) {
            setGameState(prev => ({
              ...prev,
              currentPiece: { ...prev.currentPiece, x: x + 1 }
            }));
          }
          break;
          
        case 'ArrowDown':
          // 加速落下: 1マス下に移動し、次の落下までの時間をリセット
          if (!checkCollision(shape, x, y + 1)) {
            setGameState(prev => ({
              ...prev,
              currentPiece: { ...prev.currentPiece, y: y + 1 }
            }));
            // 落下タイマーをリセットしてすぐに次の落下を可能に
            setLastFallTime(performance.now());
          }
          break;
          
        case 'ArrowUp':
          // 正しい回転処理（時計回り90度）
          const newShape = shape[0].map((_, colIndex) =>
            shape.map(row => row[colIndex]).reverse()
          );

          // 壁蹴り処理を含む回転
          let newX = x;
          let foundPosition = false;
          
          // 壁蹴りパターンのチェック
          const kickPatterns = [
            { x: 0, y: 0 },    // 元の位置
            { x: 1, y: 0 },    // 右1
            { x: -1, y: 0 },   // 左1
            { x: 2, y: 0 },    // 右2
            { x: -2, y: 0 },   // 左2
            { x: 0, y: -1 },   // 上1 (追加)
          ];
          
          for (const pattern of kickPatterns) {
            if (!checkCollision(newShape, x + pattern.x, y + pattern.y)) {
              newX = x + pattern.x;
              foundPosition = true;
              break;
            }
          }
          
          if (foundPosition) {
            setGameState(prev => ({
              ...prev,
              currentPiece: { 
                ...prev.currentPiece, 
                shape: newShape,
                x: newX
              }
            }));
          }
          break;
          
        case ' ':
          // ハードドロップ
          let dropY = y;
          while (!checkCollision(shape, x, dropY + 1)) {
            dropY++;
          }
          setGameState(prev => ({
            ...prev,
            currentPiece: { ...prev.currentPiece, y: dropY }
          }));
          lockPiece();
          break;
          
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, checkCollision, lockPiece, newPiece]);
  
  // ゲームループ
  useEffect(() => {
    if (gameState.gameOver) return;
    
    const gameLoop = (timestamp: number) => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastFallTime) / 1000;
      
      if (deltaTime > gameState.fallSpeed) {
        const { shape, x, y } = gameState.currentPiece;
        
        if (!checkCollision(shape, x, y + 1)) {
          setGameState(prev => ({
            ...prev,
            currentPiece: { ...prev.currentPiece, y: y + 1 }
          }));
        } else if (y >= 0) { // 最上部以外で衝突したら固定
          lockPiece();
        }
        
        setLastFallTime(currentTime);
      }
      
      requestAnimationFrame(gameLoop);
    };
    
    const animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, lastFallTime, checkCollision, lockPiece]);
  
  return (
    <div className="flex p-4">
      <GameBoard 
        grid={gameState.grid}
        currentPiece={gameState.currentPiece}
        gridSize={GRID_SIZE}
      />
      
      <div className="ml-8 w-64">
        <div className="mb-6">
          <h2 className="text-white text-xl mb-2">Score: {gameState.score}</h2>
          <h2 className="text-white text-xl">Level: {gameState.level}</h2>
        </div>
        
        <div className="mb-6">
          <h3 className="text-white text-lg mb-2">Next Piece:</h3>
          <NextPiece piece={gameState.nextPiece} gridSize={GRID_SIZE} />
        </div>
        
        {gameState.gameOver && (
          <div className="text-center">
            <h2 className="text-red-500 text-2xl mb-2">Game Over!</h2>
            <button 
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => {
                // 完全に状態をリセット
                const newGrid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));
                const newCurrentPiece = newPiece();
                const newNextPiece = newPiece();
                
                setGameState({
                  grid: newGrid,
                  currentPiece: newCurrentPiece,
                  nextPiece: newNextPiece,
                  gameOver: false,
                  score: 0,
                  level: 1,
                  fallSpeed: 0.8
                });
              }}
            >
              Restart Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TetrisGame;