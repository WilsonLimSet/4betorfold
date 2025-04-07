'use client';

import { useState, useEffect } from 'react';
import { Position, Player, Card } from '../types/poker';
import CardSelector from './CardSelector';

interface PlayerInputProps {
  player: Player;
  onUpdate: (updatedPlayer: Player) => void;
  onRemove: () => void;
}

const positions: Position[] = ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'];

export default function PlayerInput({ player, onUpdate, onRemove }: PlayerInputProps) {
  // Track selected cards locally so we can preserve state during rendering
  const [selectedCards, setSelectedCards] = useState<(Card | null)[]>(
    player.holeCards ? [...player.holeCards] : [null, null]
  );
  
  // Update local state when player props change
  useEffect(() => {
    setSelectedCards(player.holeCards ? [...player.holeCards] : [null, null]);
  }, [player.holeCards]);
  
  const handleCardSelect = (cards: (Card | null)[]) => {
    // First update local state to show UI changes immediately
    setSelectedCards(cards);
    
    // Filter out null values
    const validCards = cards.filter((c): c is Card => c !== null);
    
    if (validCards.length === 2) {
      // We have exactly 2 cards
      onUpdate({
        ...player,
        holeCards: [validCards[0], validCards[1]] as [Card, Card]
      });
    } else {
      // Not enough cards selected, clear the hole cards
      onUpdate({
        ...player,
        holeCards: undefined
      });
    }
  };

  return (
    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-800">
          {player.isHero ? 'Hero' : 'Villain'}
        </h4>
        {!player.isHero && (
          <button
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 font-medium"
            type="button"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Position
          </label>
          <select
            value={player.position}
            onChange={(e) => onUpdate({ ...player, position: e.target.value as Position })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
          >
            {positions.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Stack (BB)
          </label>
          <input
            type="number"
            value={player.stack}
            onChange={(e) => onUpdate({ ...player, stack: Number(e.target.value) })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
          />
        </div>
      </div>

      {/* Hide player type selection for now
      <div className="mt-4">
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Player Type
        </label>
        <select
          value={player.playerType}
          onChange={(e) => onUpdate({ ...player, playerType: e.target.value as PlayerType })}
          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
        >
          {playerTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>
      */}

      {player.playerType === 'Custom' && (
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={player.notes || ''}
            onChange={(e) => onUpdate({ ...player, notes: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
            rows={2}
          />
        </div>
      )}

      {player.isHero && (
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Hole Cards (select 2)
          </label>
          <CardSelector
            selectedCards={selectedCards}
            maxCards={2}
            onCardSelect={handleCardSelect}
          />
        </div>
      )}
    </div>
  );
} 