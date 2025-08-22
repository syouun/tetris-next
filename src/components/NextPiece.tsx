import React from 'react';

interface NextPieceProps {
  piece: {
    shape: number[][];
    color: string;
  };
  gridSize: number;
}

const NextPiece: React.FC<NextPieceProps> = ({ piece, gridSize }) => {
  // ピースを中央に配置するためのオフセット計算
  const offsetX = Math.floor((4 - piece.shape[0].length) / 2);
  const offsetY = Math.floor((4 - piece.shape.length) / 2);
  
  return (
    <div 
      className="relative bg-gray-800 border border-gray-600 rounded"
      style={{
        width: gridSize * 4,
        height: gridSize * 4
      }}
    >
      {/* ピースのセル */}
      {piece.shape.map((row, rowIndex) => (
        row.map((cell, colIndex) => {
          if (!cell) return null;
          
          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="absolute border border-gray-700"
              style={{
                width: gridSize,
                height: gridSize,
                backgroundColor: piece.color,
                top: (offsetY + rowIndex) * gridSize,
                left: (offsetX + colIndex) * gridSize
              }}
            />
          );
        })
      ))}
      
      {/* グリッド線 */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute top-0 bottom-0 border-l border-gray-600"
            style={{ left: i * gridSize }}
          />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute left-0 right-0 border-t border-gray-600"
            style={{ top: i * gridSize }}
          />
        ))}
      </div>
    </div>
  );
};

export default NextPiece;