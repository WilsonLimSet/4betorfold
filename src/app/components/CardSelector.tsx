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
}

export default function CardSelector({ selectedCards, maxCards, onCardSelect }: CardSelectorProps) {
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
    // Create a standardized representation of the cards for comparison
    const standardizeCards = (cards: (Card | null)[]) => {
      const result = [...cards];
      while (result.length < maxCards) {
        result.push(null);
      }
      return result.slice(0, maxCards);
    };
    
    const standardizedProps = standardizeCards(selectedCards);
    const standardizedLocal = standardizeCards(localCards);
    
    // Check if arrays are different by comparing each card
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

  // Handle clicking on a card
  const handleCardClick = (e: React.MouseEvent, rank: string, suit: 'hearts' | 'diamonds' | 'clubs' | 'spades') => {
    e.preventDefault();
    
    // Create a new card
    const newCard: Card = { rank, suit };
    
    // Check if this card is already selected
    const isAlreadySelected = localCards.some(
      card => card?.rank === rank && card?.suit === suit
    );
    
    // Create a new array for our updated selection
    let updatedCards: (Card | null)[] = [...localCards];
    
    if (isAlreadySelected) {
      // If already selected, remove it
      updatedCards = updatedCards.map(card => 
        (card?.rank === rank && card?.suit === suit) ? null : card
      );
    } else {
      // Find first empty slot
      const firstEmptyIndex = updatedCards.findIndex(card => card === null);
      
      if (firstEmptyIndex !== -1) {
        // Place card in the empty slot
        updatedCards[firstEmptyIndex] = newCard;
      }
    }
    
    // Update both local state and parent component
    setLocalCards(updatedCards);
    onCardSelect(updatedCards);
  };

  // Helper to render a card's content
  const renderCardContent = (card: Card | null) => {
    if (!card) return null;
    
    const suitObj = suits.find(s => s.name === card.suit);
    return (
      <span style={{ color: suitObj?.color }}>
        {card.rank}{suitObj?.symbol}
      </span>
    );
  };

  // Helper to check if a card is already selected anywhere
  const isCardSelected = (rank: string, suit: 'hearts' | 'diamonds' | 'clubs' | 'spades') => {
    return localCards.some(card => card?.rank === rank && card?.suit === suit);
  };
  
  return (
    <div>
      {/* Card Display */}
      <div className="flex gap-2 mb-3">
        {localCards.map((card, index) => (
          <div
            key={index}
            className="w-12 h-16 flex items-center justify-center rounded border text-lg font-bold"
            style={{
              backgroundColor: 'white',
              borderColor: card ? 'rgb(37, 99, 235)' : 'rgb(229, 231, 235)'
            }}
          >
            {renderCardContent(card)}
          </div>
        ))}
      </div>
      
      {/* Card Selector */}
      <div className="bg-white p-3 border rounded-lg" style={{ borderColor: 'rgb(229, 231, 235)' }}>
        <div className="grid grid-cols-13 gap-1">
          {ranks.map(rank => (
            <div key={rank} className="space-y-1">
              {suits.map(suit => {
                const isSelected = isCardSelected(rank, suit.name);
                
                return (
                  <button
                    key={`${rank}-${suit.name}`}
                    type="button"
                    onClick={(e) => handleCardClick(e, rank, suit.name)}
                    className="w-8 h-8 flex items-center justify-center border rounded"
                    style={{
                      backgroundColor: isSelected ? 'rgb(239, 246, 255)' : 'white',
                      borderColor: isSelected ? 'rgb(37, 99, 235)' : 'rgb(229, 231, 235)',
                      opacity: isSelected ? 1 : 0.5,
                      cursor: isSelected ? 'pointer' : 'not-allowed'
                    }}
                    disabled={!isSelected && localCards.every(card => card !== null)}
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
      </div>
    </div>
  );
} 