import React from 'react';

interface GameBoardProps {
  grid: (string | null)[][];
  currentPiece: {
    shape: number[][];
    color: string;
    x: number;
    y: number;
  };
  gridSize: number;
}

const GameBoard: React.FC<GameBoardProps> = ({ grid, currentPiece, gridSize }) => {
  return (
    <div className="relative">
      {/* グリッド */}
      <div 
        className="bg-black border border-gray-700"
        style={{
          width: gridSize * 10,
          height: gridSize * 20
        }}
      >
        {/* グリッドセル */}
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="border border-gray-700"
                style={{
                  width: gridSize,
                  height: gridSize,
                  backgroundColor: cell || 'transparent'
                }}
              />
            ))}
          </div>
        ))}
        
        {/* 現在のピース */}
        {currentPiece.shape.map((row, rowIndex) => (
          row.map((cell, colIndex) => {
            if (!cell) return null;
            
            const y = currentPiece.y + rowIndex;
            const x = currentPiece.x + colIndex;
            
            // 画面外のセルは表示しない
            if (y < 0) return null;
            
            return (
              <div
                key={`piece-${rowIndex}-${colIndex}`}
                className="absolute border border-gray-700"
                style={{
                  width: gridSize,
                  height: gridSize,
                  backgroundColor: currentPiece.color,
                  top: y * gridSize,
                  left: x * gridSize
                }}
              />
            );
          })
        ))}
        
        {/* グリッド線 */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 11 }).map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute top-0 bottom-0 border-l border-gray-600"
              style={{ left: i * gridSize }}
            />
          ))}
          {Array.from({ length: 21 }).map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute left-0 right-0 border-t border-gray-600"
              style={{ top: i * gridSize }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;