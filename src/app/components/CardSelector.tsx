'use client';

import { useState, useEffect } from 'react';
import { Card } from '../types/poker';

const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const suits = [
  { name: 'hearts' as const, symbol: '♥', color: 'rgb(220, 38, 38)' },
  { name: 'diamonds' as const, symbol: '♦', color: 'rgb(220, 38, 38)' },
  { name: 'clubs' as const, symbol: '♣', color: 'rgb(17, 24, 39)' },
  { name: 'spades' as const, symbol: '♠', color: 'rgb(17, 24, 39)' }
];

interface CardSelectorProps {
  selectedCards: (Card | null)[];
  maxCards: number;
  onCardSelect: (cards: (Card | null)[]) => void;
  usedCards?: Card[]; // Cards that are already used in other streets
}

export default function CardSelector({ selectedCards, maxCards, onCardSelect, usedCards = [] }: CardSelectorProps) {
  // Initialize local cards once on component mount, not on every render
  const [localCards, setLocalCards] = useState<(Card | null)[]>(() => {
    const cards = [...selectedCards];
    while (cards.length < maxCards) {
      cards.push(null);
    }
    return cards.slice(0, maxCards);
  });
  
  // Update local state when props change, but only when selectedCards array actually changes
  useEffect(() => {
    const standardizeCards = (cards: (Card | null)[]) => {
      const result = [...cards];
      while (result.length < maxCards) {
        result.push(null);
      }
      return result.slice(0, maxCards);
    };
    
    const standardizedProps = standardizeCards(selectedCards);
    const standardizedLocal = standardizeCards(localCards);
    
    const isDifferent = standardizedProps.some((card, index) => {
      const localCard = standardizedLocal[index];
      if (card === null && localCard === null) return false;
      if (card === null || localCard === null) return true;
      return card.rank !== localCard.rank || card.suit !== localCard.suit;
    });
    
    if (isDifferent) {
      setLocalCards(standardizedProps);
    }
  }, [selectedCards, maxCards, localCards]);

  const handleCardClick = (e: React.MouseEvent, rank: string, suit: 'hearts' | 'diamonds' | 'clubs' | 'spades') => {
    e.preventDefault();
    
    const newCard: Card = { rank, suit };
    const isAlreadySelected = localCards.some(
      card => card?.rank === rank && card?.suit === suit
    );
    
    // Check if card is used in another street, but allow unselecting if it's our card
    const isUsed = usedCards.some(card => card.rank === rank && card.suit === suit);
    if (isUsed && !isAlreadySelected) return;
    
    const updatedCards: (Card | null)[] = [...localCards];
    
    if (isAlreadySelected) {
      // Find the index of the card to unselect
      const cardIndex = updatedCards.findIndex(
        card => card?.rank === rank && card?.suit === suit
      );
      if (cardIndex !== -1) {
        updatedCards[cardIndex] = null;
      }
    } else {
      const firstEmptyIndex = updatedCards.findIndex(card => card === null);
      if (firstEmptyIndex !== -1) {
        updatedCards[firstEmptyIndex] = newCard;
      }
    }
    
    setLocalCards(updatedCards);
    onCardSelect(updatedCards);
  };

  const renderCardContent = (card: Card | null) => {
    if (!card) return null;
    
    const suitObj = suits.find(s => s.name === card.suit);
    return (
      <span style={{ color: suitObj?.color }}>
        {card.rank}{suitObj?.symbol}
      </span>
    );
  };

  const isCardSelected = (rank: string, suit: 'hearts' | 'diamonds' | 'clubs' | 'spades') => {
    return localCards.some(card => card?.rank === rank && card?.suit === suit);
  };

  const isCardUsed = (rank: string, suit: 'hearts' | 'diamonds' | 'clubs' | 'spades') => {
    return usedCards.some(card => card.rank === rank && card.suit === suit);
  };
  
  return (
    <div>
      {/* Selected Cards Display */}
      <div className="flex gap-2 mb-4">
        {localCards.map((card, index) => (
          <div
            key={index}
            className="w-14 h-20 flex items-center justify-center rounded-lg border-2 text-xl font-bold bg-white shadow-sm"
            style={{
              borderColor: card ? 'rgb(37, 99, 235)' : 'rgb(229, 231, 235)'
            }}
          >
            {renderCardContent(card)}
          </div>
        ))}
      </div>
      
      {/* Card Grid */}
      <div className="bg-white p-4 border rounded-lg shadow-sm" style={{ borderColor: 'rgb(229, 231, 235)' }}>
        {/* Desktop/Laptop View: Suits as rows, Ranks as columns */}
        <div className="hidden md:block space-y-2">
          {suits.map(suit => (
            <div key={suit.name} className="flex justify-between gap-1">
              {ranks.map(rank => {
                const isSelected = isCardSelected(rank, suit.name);
                const isUsed = isCardUsed(rank, suit.name);
                const isDisabled = isUsed && !isSelected;
                
                return (
                  <button
                    key={`${rank}-${suit.name}`}
                    type="button"
                    onClick={(e) => handleCardClick(e, rank, suit.name)}
                    className={`flex-1 h-10 flex items-center justify-center border-2 rounded-md transition-all text-sm
                      ${isSelected ? 'bg-blue-50 border-blue-600' : 'bg-white border-gray-200'}
                      ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-blue-50'}
                      ${isUsed && !isSelected ? 'bg-gray-100' : ''}`}
                    disabled={isDisabled}
                  >
                    <span style={{ color: suit.color }}>
                      {rank}{suit.symbol}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Mobile View: Ranks as columns, Suits stacked vertically */}
        <div className="grid grid-cols-7 gap-2 md:hidden">
          {ranks.map(rank => (
            <div key={rank} className="flex flex-col gap-1">
              {suits.map(suit => {
                const isSelected = isCardSelected(rank, suit.name);
                const isUsed = isCardUsed(rank, suit.name);
                const isDisabled = isUsed && !isSelected;
                
                return (
                  <button
                    key={`${rank}-${suit.name}`}
                    type="button"
                    onClick={(e) => handleCardClick(e, rank, suit.name)}
                    className={`w-10 h-10 flex items-center justify-center border-2 rounded-md transition-all
                      ${isSelected ? 'bg-blue-50 border-blue-600' : 'bg-white border-gray-200'}
                      ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-blue-50'}
                      ${isUsed && !isSelected ? 'bg-gray-100' : ''}`}
                    disabled={isDisabled}
                  >
                    <span className="text-lg" style={{ color: suit.color }}>
                      {rank}{suit.symbol}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 