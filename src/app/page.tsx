'use client';
import dynamic from 'next/dynamic';

// クライアントサイドのみでレンダリングするように設定
const TetrisGame = dynamic(() => import('../components/TetrisGame'), {
  ssr: false,
  loading: () => <div className="text-white">Loading game...</div>
});

export default function Home() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900">
      <TetrisGame />
    </div>
  );
}
