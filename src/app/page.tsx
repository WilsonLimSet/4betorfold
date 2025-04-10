'use client';

import HandRecorder from '@/app/components/HandRecorder';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-12">
          4Bet or Fold <span className="text-red-600">♥</span> <span className="text-red-600">♦</span> <span className="text-black">♣</span> <span className="text-black">♠</span>
        </h1>
        <HandRecorder />
      </div>
    </main>
  );
}
