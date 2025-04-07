'use client';

import HandRecorder from '@/app/components/HandRecorder';

export default function Home() {
  return (
    <main className="min-h-screen py-8" style={{ backgroundColor: 'rgb(243, 244, 246)' }}>
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8" style={{ color: 'rgb(31, 41, 55)' }}>
          Poker Hand Recorder
        </h1>
        <HandRecorder />
      </div>
    </main>
  );
}
