'use client';

import { useState, useEffect } from 'react';
import { Street, Action, Card, Player } from '../types/poker';
import CardSelector from './CardSelector';

interface StreetActionsProps {
  streetName: 'Preflop' | 'Flop' | 'Turn' | 'River';
  players: Player[];
  street: Street;
  onUpdate: (street: Street) => void;
  previousStreet?: Street; // Add previous street for pot calculation
}

export default function StreetActions({ streetName, players, street, onUpdate, previousStreet }: StreetActionsProps) {
  const [actionType, setActionType] = useState<Action['type']>('bet');
  const [actionAmount, setActionAmount] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>(players[0]?.position || '');
  
  // Local state for board cards to ensure UI consistency
  const [boardCards, setBoardCards] = useState<(Card | null)[]>(() => {
    const numCards = streetName === 'Flop' ? 3 : 1;
    
    if (street.board && street.board.length > 0) {
      const cards = [...street.board];
      while (cards.length < numCards) {
        cards.push(null as any);
      }
      return cards.slice(0, numCards);
    }
    
    return Array(numCards).fill(null);
  });
  
  // Update local state when props change
  useEffect(() => {
    const numCards = streetName === 'Flop' ? 3 : 1;
    
    if (street.board && street.board.length > 0) {
      const cards = [...street.board];
      while (cards.length < numCards) {
        cards.push(null as any);
      }
      setBoardCards(cards.slice(0, numCards));
    } else {
      setBoardCards(Array(numCards).fill(null));
    }
  }, [street.board, streetName]);
  
  // Initialize player selection when players change
  useEffect(() => {
    if (players.length > 0 && !players.some(p => p.position === selectedPlayer)) {
      setSelectedPlayer(players[0].position);
    }
  }, [players, selectedPlayer]);

  const handleAddAction = () => {
    if (!selectedPlayer || !actionType) return;

    // For calls, use the last bet/raise amount
    let finalAmount = actionAmount;
    if (actionType === 'call') {
      const lastBet = [...(street.actions || [])].reverse().find(a => a.type === 'bet' || a.type === 'raise')?.amount;
      if (lastBet) {
        finalAmount = lastBet.toString();
      } else {
        // If no bet to call, treat it as a check
        onUpdate({
          ...street,
          actions: [...(street.actions || []), { player: selectedPlayer, type: 'check' }]
        });
        return;
      }
    }

    const newAction: Action = {
      player: selectedPlayer,
      type: actionType,
      ...(finalAmount && actionType !== 'fold' && actionType !== 'check'
        ? { amount: parseFloat(finalAmount) }
        : {})
    };

    onUpdate({
      ...street,
      actions: [...(street.actions || []), newAction]
    });

    if (actionType !== 'check' && actionType !== 'fold') {
      setActionAmount('');
    }
  };

  const handleDeleteAction = (index: number) => {
    const newActions = [...(street.actions || [])];
    newActions.splice(index, 1);
    onUpdate({
      ...street,
      actions: newActions
    });
  };

  const handleBoardCards = (cards: (Card | null)[]) => {
    setBoardCards(cards);
    const validCards = cards.filter((card): card is Card => card !== null);
    onUpdate({
      ...street,
      board: validCards.length > 0 ? validCards : undefined
    });
  };

  // Calculate total pot size including previous streets
  const calculateTotalPot = () => {
    let total = 0;
    
    // Add previous street's pot
    if (previousStreet) {
      total += previousStreet.actions?.reduce((sum, action) => {
        if (action.type === 'fold') return sum;
        return sum + (action.amount || 0);
      }, 0) || 0;
    }
    
    // Add current street's pot
    total += street.actions?.reduce((sum, action) => {
      if (action.type === 'fold') return sum;
      return sum + (action.amount || 0);
    }, 0) || 0;
    
    return total;
  };

  return (
    <div className="space-y-4 pt-4" style={{ borderTop: '1px solid rgb(229, 231, 235)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'rgb(31, 41, 55)' }}>{streetName}</h3>
        <span className="text-sm font-medium" style={{ color: 'rgb(75, 85, 99)' }}>
          Total Pot: {calculateTotalPot()}BB
        </span>
      </div>
      
      {streetName !== 'Preflop' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'rgb(55, 65, 81)' }}>
            Board Cards ({streetName === 'Flop' ? '3 cards' : '1 card'})
          </label>
          <CardSelector
            selectedCards={boardCards}
            maxCards={streetName === 'Flop' ? 3 : 1}
            onCardSelect={handleBoardCards}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium" style={{ color: 'rgb(55, 65, 81)' }}>
            Player
          </label>
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="mt-1 block w-full rounded-md shadow-sm"
            style={{
              borderColor: 'rgb(209, 213, 219)',
              '--tw-ring-color': 'rgb(59, 130, 246)',
              '--tw-ring-offset-width': '0px'
            } as React.CSSProperties}
          >
            {players.map((player) => (
              <option key={player.position} value={player.position}>
                {player.isHero ? `Hero (${player.position})` : `Villain (${player.position})`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium" style={{ color: 'rgb(55, 65, 81)' }}>
            Action
          </label>
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value as Action['type'])}
            className="mt-1 block w-full rounded-md shadow-sm"
            style={{
              borderColor: 'rgb(209, 213, 219)',
              '--tw-ring-color': 'rgb(59, 130, 246)',
              '--tw-ring-offset-width': '0px'
            } as React.CSSProperties}
          >
            <option value="bet">Bet</option>
            <option value="call">Call</option>
            <option value="raise">Raise</option>
            <option value="fold">Fold</option>
            <option value="check">Check</option>
          </select>
        </div>

        {actionType !== 'fold' && actionType !== 'check' && actionType !== 'call' && (
          <div className="col-span-2">
            <label className="block text-sm font-medium" style={{ color: 'rgb(55, 65, 81)' }}>
              Amount (BB)
            </label>
            <input
              type="number"
              step="0.5"
              value={actionAmount}
              onChange={(e) => setActionAmount(e.target.value)}
              className="mt-1 block w-full rounded-md shadow-sm"
              style={{
                borderColor: 'rgb(209, 213, 219)',
                '--tw-ring-color': 'rgb(59, 130, 246)',
                '--tw-ring-offset-width': '0px'
              } as React.CSSProperties}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleAddAction}
        className="w-full py-2 px-4 rounded-lg transition-all"
        style={{
          backgroundColor: 'rgb(37, 99, 235)',
          color: 'white',
        }}
      >
        Add Action
      </button>

      <div className="space-y-2">
        <h4 className="font-medium" style={{ color: 'rgb(31, 41, 55)' }}>Street Action History</h4>
        <div className="space-y-1">
          {street.actions?.map((action, index) => (
            <div key={index} className="flex items-center justify-between text-sm" style={{ color: 'rgb(75, 85, 99)' }}>
              <span>
                {action.player}: {action.type}
                {action.amount ? ` ${action.amount}BB` : ''}
              </span>
              <button
                onClick={() => handleDeleteAction(index)}
                className="text-red-500 hover:text-red-700"
                type="button"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 