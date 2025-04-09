'use client';

import { useState, useEffect } from 'react';
import { Position, Player, Card } from '../types/poker';
import CardSelector from './CardSelector';

interface PlayerInputProps {
  player: Player;
  onUpdate: (updatedPlayer: Player) => void;
  onRemove: () => void;
  showVillainCards?: boolean;
  takenPositions: Position[];
  allPlayers: Player[];
  usedCards: Card[];
}

const positions: Position[] = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO'];

export default function PlayerInput({ player, onUpdate, onRemove, showVillainCards = false, takenPositions = [], allPlayers = [], usedCards = [] }: PlayerInputProps) {
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

  // Get available positions based on whether this is hero or villain
  const getAvailablePositions = () => {
    if (player.isHero) {
      // Hero can take any position that's not taken by other players
      return positions.filter(pos => !takenPositions.includes(pos) || pos === player.position);
    } else {
      // Villains can't take hero's position or other villains' positions
      return positions.filter(pos => !takenPositions.includes(pos) || pos === player.position);
    }
  };

  return (
    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xl font-bold text-gray-900">
          {player.isHero ? 'Hero' : 'Villain'}
        </h4>
        {!player.isHero && allPlayers.filter((p: Player) => !p.isHero).length > 1 && (
          <button
            onClick={onRemove}
            className="text-red-600 hover:text-red-800 font-semibold text-base"
            type="button"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-base font-semibold text-gray-900 mb-2">
            Position
          </label>
          <select
            value={player.position}
            onChange={(e) => onUpdate({ ...player, position: e.target.value as Position })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg font-medium text-gray-900 bg-white"
          >
            {getAvailablePositions().map((pos) => (
              <option key={pos} value={pos} className="text-lg">{pos}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-base font-semibold text-gray-900 mb-2">
            Stack
          </label>
          <input
            type="text"
            value={player.stack}
            onChange={(e) => {
              const value = e.target.value;
              // Allow empty string or valid numbers
              if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                onUpdate({ ...player, stack: value === '' ? 0 : Number(value) });
              }
            }}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg font-medium text-gray-900"
            placeholder="Enter stack size"
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
          <label className="block text-base font-semibold text-gray-900 mb-2">
            Notes
          </label>
          <textarea
            value={player.notes || ''}
            onChange={(e) => onUpdate({ ...player, notes: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base text-gray-900"
            rows={2}
          />
        </div>
      )}

      {player.isHero && (
        <div className="mt-4">
          <label className="block text-base font-semibold text-gray-900 mb-2">
            Hole Cards (required)
          </label>
          <CardSelector
            selectedCards={selectedCards}
            maxCards={2}
            onCardSelect={handleCardSelect}
            usedCards={usedCards}
          />
        </div>
      )}

      {!player.isHero && showVillainCards && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-base font-semibold text-gray-900">
              Hole Cards (optional)
            </label>
            {player.holeCards && (
              <button
                onClick={() => onUpdate({ ...player, holeCards: undefined })}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear Cards
              </button>
            )}
          </div>
          <CardSelector
            selectedCards={selectedCards}
            maxCards={2}
            onCardSelect={handleCardSelect}
            usedCards={usedCards}
          />
        </div>
      )}
    </div>
  );
} 