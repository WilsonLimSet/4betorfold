'use client';

import { Card } from '../types/poker';

const suits = [
  { name: 'hearts' as const, symbol: '♥', color: 'rgb(220, 38, 38)' },
  { name: 'diamonds' as const, symbol: '♦', color: 'rgb(220, 38, 38)' },
  { name: 'clubs' as const, symbol: '♣', color: 'rgb(17, 24, 39)' },
  { name: 'spades' as const, symbol: '♠', color: 'rgb(17, 24, 39)' }
];

interface CardDisplayProps {
  card: Card;
  size?: 'small' | 'medium' | 'large';
}

export default function CardDisplay({ card, size = 'medium' }: CardDisplayProps) {
  const suitObj = suits.find(s => s.name === card.suit);
  
  // Size classes
  const sizeClasses = {
    small: 'w-8 h-10 text-sm',
    medium: 'w-12 h-16 text-xl',
    large: 'w-16 h-24 text-2xl'
  };
  
  return (
    <div
      className={`flex items-center justify-center rounded-lg border-2 font-bold bg-white shadow-sm ${sizeClasses[size]}`}
      style={{
        borderColor: 'rgb(37, 99, 235)'
      }}
    >
      <span style={{ color: suitObj?.color }}>
        {card.rank}{suitObj?.symbol}
      </span>
    </div>
  );
} 