'use client';
import TetrisGame from '../components/TetrisGame';

export default function Home() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900">
      <TetrisGame />
    </div>
  );
}
