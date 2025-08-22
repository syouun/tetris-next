
'use client';
import React from 'react';

type Cell = string | null;
type Piece = {
  shape: number[][];
  color: string;
  x: number;
  y: number;
};

type Props = {
  grid: Cell[][];
  currentPiece: Piece;
  gridSize: number;
  clearingRows?: number[];
  hideCurrent?: boolean;
};

/** Simple SVG board with flashing effect on clearing rows */
export default function GameBoard({ grid, currentPiece, gridSize, clearingRows = [], hideCurrent = false }: Props) {
  const rows = grid.length;
  const cols = grid[0].length;
  const w = cols * gridSize;
  const h = rows * gridSize;
  const clearSet = new Set(clearingRows);

  return (
    <div className="relative" style={{ width: w, height: h }}>
      <svg width={w} height={h}>
        {/* Background */}
        <rect x={0} y={0} width={w} height={h} fill="#0f172a" />

        {/* Grid lines */}
        <g stroke="#374151" strokeWidth="1">
          {Array.from({ length: cols + 1 }, (_, i) => (
            <line key={`v-${i}`} x1={i * gridSize} y1={0} x2={i * gridSize} y2={h} />
          ))}
          {Array.from({ length: rows + 1 }, (_, i) => (
            <line key={`h-${i}`} x1={0} y1={i * gridSize} x2={w} y2={i * gridSize} />
          ))}
        </g>

        {/* Placed cells */}
        {grid.map((row, y) =>
          row.map((cell, x) =>
            cell ? (
              <rect
                key={`c-${x}-${y}`}
                x={x * gridSize + 1}
                y={y * gridSize + 1}
                width={gridSize - 2}
                height={gridSize - 2}
                fill={cell}
                opacity={clearSet.has(y) ? 0.9 : 1}
                className={clearSet.has(y) ? 'flash' : ''}
                rx={4}
                ry={4}
              />
            ) : null
          )
        )}

        {/* Current falling piece */}
        {!hideCurrent &&
          currentPiece.shape.map((row, r) =>
            row.map((v, c) =>
              v ? (
                <rect
                  key={`p-${r}-${c}`}
                  x={(currentPiece.x + c) * gridSize + 1}
                  y={(currentPiece.y + r) * gridSize + 1}
                  width={gridSize - 2}
                  height={gridSize - 2}
                  fill={currentPiece.color}
                  rx={4}
                  ry={4}
                />
              ) : null
            )
          )}
      </svg>

      <style jsx>{`
        .flash {
          animation: flash 0.26s linear infinite;
        }
        @keyframes flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
