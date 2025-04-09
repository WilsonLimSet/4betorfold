'use client';

import { useState, useEffect } from 'react';
import { Street, Card, Player, Action, ActionType } from '../types/poker';
import CardSelector from './CardSelector';

interface StreetActionsProps {
  streetName: 'Preflop' | 'Flop' | 'Turn' | 'River';
  players: Player[];
  street: Street;
  onUpdate: (street: Street) => void;
  previousStreet?: Street; // Add previous street for pot calculation
  usedCards?: Card[];
  allPlayersAllIn?: boolean;
  previousCards?: {
    flop?: Card[];
    turn?: Card[];
  };
}

export default function StreetActions({ 
  streetName, 
  players, 
  street, 
  onUpdate, 
  previousStreet, 
  usedCards = [], 
  allPlayersAllIn = false,
  previousCards = {}
}: StreetActionsProps) {
  const [actionType, setActionType] = useState<ActionType>('bet');
  const [actionAmount, setActionAmount] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>(players[0]?.position || '');
  const [error, setError] = useState<string>('');
  const [isStreetComplete, setIsStreetComplete] = useState(false);
  
  // Local state for board cards to ensure UI consistency
  const [boardCards, setBoardCards] = useState<(Card | null)[]>(() => {
    const numCards = streetName === 'Flop' ? 3 : 1;
    
    if (street.board && street.board.length > 0) {
      const cards = [...street.board];
      const result: (Card | null)[] = cards;
      while (result.length < numCards) {
        result.push(null);
      }
      return result.slice(0, numCards);
    }
    
    return new Array(numCards).fill(null) as (Card | null)[];
  });
  
  // Update local state when props change, but only when selectedCards array actually changes
  useEffect(() => {
    const numCards = streetName === 'Flop' ? 3 : 1;
    
    if (street.board && street.board.length > 0) {
      const cards = [...street.board];
      const result: (Card | null)[] = cards;
      while (result.length < numCards) {
        result.push(null);
      }
      setBoardCards(result.slice(0, numCards));
    } else {
      setBoardCards(new Array(numCards).fill(null) as (Card | null)[]);
    }
  }, [street.board, streetName]);
  
  // Check if a player is all-in
  const isPlayerAllIn = (position: string) => {
    // Check current street
    if (street.actions?.some(action => action.player === position && action.type === 'all-in')) {
      return true;
    }
    
    // Check previous streets
    if (previousStreet?.actions?.some(action => action.player === position && action.type === 'all-in')) {
      return true;
    }
    
    return false;
  };

  // Get active (non-folded) players - don't exclude all-in players for action purposes
  const getActivePlayers = () => {
    return players.filter(player => {
      // Check if player has folded in any street
      const hasFolded = street.actions?.some(action => 
        action.player === player.position && action.type === 'fold'
      ) || previousStreet?.actions?.some(action => 
        action.player === player.position && action.type === 'fold'
      );

      return !hasFolded;
    });
  };

  // Get players who can still act (not folded, not all-in)
  const getActingPlayers = () => {
    return players.filter(player => {
      // Check if player has folded in any street
      const hasFolded = street.actions?.some(action => 
        action.player === player.position && action.type === 'fold'
      ) || previousStreet?.actions?.some(action => 
        action.player === player.position && action.type === 'fold'
      );

      // Check if player is all-in
      const isAllIn = isPlayerAllIn(player.position);

      return !hasFolded && !isAllIn;
    });
  };

  // Determine who acts first based on street and position
  const getNextActingPlayer = () => {
    if (players.length !== 2) return null;

    const activePlayers = getActivePlayers();
    if (activePlayers.length === 0) return null;

    const sortedPlayers = [...activePlayers].sort((a, b) => {
      // Define position order for preflop (BB acts last)
      const preflopOrder = ['BTN', 'SB', 'BB', 'CO', 'HJ', 'LJ', 'UTG+2', 'UTG+1', 'UTG'];
      // Define position order for postflop (BB acts first)
      const postflopOrder = ['BB', 'SB', 'BTN', 'CO', 'HJ', 'LJ', 'UTG+2', 'UTG+1', 'UTG'];
      
      const order = streetName === 'Preflop' ? preflopOrder : postflopOrder;
      return order.indexOf(a.position) - order.indexOf(b.position);
    });

    // If there are no actions yet, first active player acts
    if (!street.actions || street.actions.length === 0) {
      // In preflop, BTN acts first if present, otherwise SB
      if (streetName === 'Preflop') {
        const btnPlayer = sortedPlayers.find(p => p.position === 'BTN');
        const sbPlayer = sortedPlayers.find(p => p.position === 'SB');
        return btnPlayer?.position || sbPlayer?.position || sortedPlayers[0].position;
      }
      return sortedPlayers[0].position;
    }

    // Get the last action
    const lastAction = street.actions[street.actions.length - 1];
    
    // Find the next active player who hasn't acted yet
    const nextPlayer = sortedPlayers.find(p => p.position !== lastAction.player);
    
    // In preflop, if BB hasn't acted yet and there's a bet, they must act
    if (streetName === 'Preflop' && 
        street.actions.some(a => a.type === 'bet' || a.type === 'raise')) {
      const bbPlayer = activePlayers.find(p => p.position === 'BB');
      if (bbPlayer && !street.actions.some(a => a.player === 'BB')) {
        return bbPlayer.position;
      }
    }
    
    return nextPlayer?.position;
  };

  // Check if all remaining players are all-in or have folded
  const isAllPlayersAllIn = () => {
    // This function should only return true when ALL active players are actually all-in
    // or when the hand should be considered complete due to all-in action
    
    // Get players who haven't folded
    const nonFoldedPlayers = players.filter(player => 
      !street.actions?.some(action => action.player === player.position && action.type === 'fold') &&
      !previousStreet?.actions?.some(action => action.player === player.position && action.type === 'fold')
    );
    
    // If explicitly set from HandRecorder
    if (allPlayersAllIn) {
      return true;
    }
    
    // If there's only one player left, they win by default
    if (nonFoldedPlayers.length <= 1) {
      return true;
    }
    
    // Check if there's an all-in action
    const allInAction = street.actions?.find(action => action.type === 'all-in');
    if (!allInAction) {
      // No all-in action, so only return true if every non-folded player is all-in from previous streets
      return nonFoldedPlayers.every(player => 
        previousStreet?.actions?.some(action => 
          action.player === player.position && action.type === 'all-in'
        )
      );
    }
    
    // There is an all-in action on this street
    const allInIndex = street.actions?.findIndex(action => action.type === 'all-in');
    
    // Get all actions after the all-in
    const actionsAfterAllIn = street.actions?.slice(allInIndex + 1) || [];
    
    // Get all players who need to act after the all-in
    const playersWhoNeedToRespond = nonFoldedPlayers.filter(player => {
      // Skip the player who went all-in
      if (player.position === allInAction.player) return false;
      
      // Skip players who are already all-in from previous streets
      if (previousStreet?.actions?.some(action => 
        action.player === player.position && action.type === 'all-in'
      )) {
        return false;
      }
      
      // Check if this player has acted after the all-in
      const hasActed = actionsAfterAllIn.some(action => action.player === player.position);
      return !hasActed;
    });
    
    // If there are still players who need to respond to the all-in, the street is not complete
    if (playersWhoNeedToRespond.length > 0) {
      return false;
    }
    
    // All players have responded to the all-in, or they were already all-in, so the street is complete
    return true;
  };
  
  // Completely rewrite isActionComplete to handle all-in correctly
  const isActionComplete = () => {
    // If there are no actions, the street is not complete
    if (!street.actions || street.actions.length === 0) return false;
    
    // Get non-folded players
    const nonFoldedPlayers = players.filter(player => 
      !street.actions?.some(action => action.player === player.position && action.type === 'fold') &&
      !previousStreet?.actions?.some(action => action.player === player.position && action.type === 'fold')
    );
    
    // Get players who can still act (not folded, not all-in)
    const actingPlayers = getActingPlayers();
    
    // If no one can act, the street is complete
    if (actingPlayers.length === 0) return true;
    
    // If there's only one non-folded player, the street is complete
    if (nonFoldedPlayers.length <= 1) return true;
    
    // Check for all-in situations first
    const isAllInSituation = street.actions.some(action => action.type === 'all-in');
    if (isAllInSituation) {
      // Find the last all-in action
      const lastAllInIndex = [...street.actions].map(a => a.type).lastIndexOf('all-in');
      
      // Get players who still need to respond to this all-in
      const playersWhoNeedToRespond = actingPlayers.filter(player => {
        // Skip the player who made the all-in
        if (player.position === street.actions[lastAllInIndex].player) return false;
        
        // Check if this player has acted after the all-in
        return !street.actions.slice(lastAllInIndex + 1).some(a => a.player === player.position);
      });
      
      // If there are players who need to respond, the street is not complete
      return playersWhoNeedToRespond.length === 0;
    }
    
    // Handle normal bet/raise situations
    const lastBetRaiseIndex = [...street.actions].reduce((maxIndex, action, index) => {
      if (action.type === 'bet' || action.type === 'raise') return index;
      return maxIndex;
    }, -1);
    
    if (lastBetRaiseIndex >= 0) {
      // There was a bet or raise, check if all players have acted after it
      const playersWhoNeedToAct = actingPlayers.filter(player => {
        // Skip the player who made the bet/raise
        if (player.position === street.actions[lastBetRaiseIndex].player) return false;
        
        // Check if this player has acted after the bet/raise
        return !street.actions.slice(lastBetRaiseIndex + 1).some(a => a.player === player.position);
      });
      
      // If there are players who need to act, the street is not complete
      return playersWhoNeedToAct.length === 0;
    }
    
    // If we got here, there were no bets or raises, just checks or calls
    // So the street is complete if all active players have checked
    return actingPlayers.every(player => 
      street.actions.some(action => action.player === player.position && action.type === 'check')
    );
  };

  // Auto-select next player to act
  useEffect(() => {
    // Skip if street is already complete
    if (isStreetComplete) return;
    
    // Get acting players - who still need to make decisions
    const actingPlayers = getActingPlayers();
    if (actingPlayers.length === 0) return;
    
    // If there's an all-in action, make sure other players get to respond
    if (street.actions?.some(action => action.type === 'all-in')) {
      const lastAllInAction = [...(street.actions || [])].reverse().find(action => action.type === 'all-in');
      if (lastAllInAction) {
        const playersWhoHaventActedOnAllIn = actingPlayers.filter(player => {
          // Get the index of the last all-in action
          const allInIndex = street.actions?.findIndex(a => a === lastAllInAction) || -1;
          // Check if this player has acted after the all-in
          return !street.actions?.slice(allInIndex + 1).some(a => a.player === player.position);
        });
        
        if (playersWhoHaventActedOnAllIn.length > 0) {
          const nextPlayer = playersWhoHaventActedOnAllIn[0].position;
          setSelectedPlayer(nextPlayer);
          setActionType('call');
          const currentBet = getCurrentBetToCall();
          setActionAmount(currentBet.toString());
          setError('');
          return;
        }
      }
    }
    
    // Normal next player logic...
    const nextPlayer = getNextActingPlayer();
    if (nextPlayer) {
      setSelectedPlayer(nextPlayer);
      
      // Reset action type based on street and previous action
      if (street.actions && street.actions.length > 0) {
        const lastAction = street.actions[street.actions.length - 1];
        if (lastAction.type === 'bet' || lastAction.type === 'raise' || lastAction.type === 'all-in') {
          setActionType('call');
          // Force update the action amount for calls
          const currentBet = getCurrentBetToCall();
          setActionAmount(currentBet.toString());
          // Clear any previous errors
          setError('');
        } else if (lastAction.type === 'check' || lastAction.type === 'call') {
          setActionType('check');
          setActionAmount('');
        } else {
          setActionType(streetName === 'Preflop' && nextPlayer === 'BB' ? 'check' : 'bet');
          setActionAmount('');
        }
      } else {
        // First action
        if (streetName === 'Preflop') {
          // In preflop, BTN/SB bets, BB gets option
          const isBB = nextPlayer === 'BB';
          setActionType(isBB ? 'check' : 'bet');
        } else {
          setActionType('check');
        }
        setActionAmount('');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [street.actions, players, streetName, isStreetComplete]);

  // Auto-update action amount when action type changes
  useEffect(() => {
    if (actionType === 'call' && street.actions && street.actions.length > 0) {
      const lastAction = street.actions[street.actions.length - 1];
      if (lastAction.type === 'bet' || lastAction.type === 'raise') {
        const currentBet = getCurrentBetToCall();
        setActionAmount(currentBet.toString());
        setError('');
      }
    } else if (actionType === 'raise' && street.actions && street.actions.length > 0) {
      // When raise is selected, automatically set to 3x the current bet
      const currentBet = getCurrentBetToCall();
      const threeBet = currentBet * 3;
      const effectiveStack = getEffectiveStack(selectedPlayer);
      
      // Make sure the 3x amount doesn't exceed player's stack
      const validRaiseAmount = Math.min(threeBet, effectiveStack);
      setActionAmount(validRaiseAmount.toString());
      setError('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionType, street.actions, selectedPlayer]);

  // Calculate remaining stack for a player after their previous actions
  const getEffectiveStack = (position: string) => {
    const player = players.find(p => p.position === position);
    if (!player) return 0;
    
    let usedStack = 0;
    
    // Add up all previous street actions
    if (previousStreet?.actions) {
      usedStack += previousStreet.actions
        .filter(action => action.player === position && action.amount)
        .reduce((sum, action) => sum + (action.amount || 0), 0);
    }
    
    // Add up current street actions
    if (street.actions) {
      usedStack += street.actions
        .filter(action => action.player === position && action.amount)
        .reduce((sum, action) => sum + (action.amount || 0), 0);
    }
    
    return player.stack - usedStack;
  };

  // Get the current bet amount that needs to be called
  const getCurrentBetToCall = () => {
    if (!street.actions || street.actions.length === 0) return 0;
    
    const betsAndRaises = street.actions
      .filter(action => action.type === 'bet' || action.type === 'raise' || action.type === 'call' || action.type === 'all-in')
      .map(action => action.amount || 0);
    
    return betsAndRaises.length > 0 ? Math.max(...betsAndRaises) : 0;
  };

  // Check if we're facing an all-in with no room to raise
  const isFacingAllIn = () => {
    if (!street.actions || street.actions.length === 0) return false;
    
    const lastAction = street.actions[street.actions.length - 1];
    if (lastAction.type === 'all-in') {
      // Check if the call amount equals our effective stack
      const currentBet = getCurrentBetToCall();
      const effectiveStack = getEffectiveStack(selectedPlayer);
      
      // If our stack is less than or equal to the amount to call, we can only call all-in or fold
      return effectiveStack <= currentBet;
    }
    return false;
  };

  // Get minimum and maximum allowed bet amounts
  const getBetLimits = () => {
    const effectiveStack = getEffectiveStack(selectedPlayer);
    const currentBet = getCurrentBetToCall();
    const minBet = streetName === 'Preflop' ? 1 : 2; // 1BB for preflop, 2BB for postflop
    
    if (actionType === 'bet') {
      return {
        min: minBet,
        max: effectiveStack
      };
    } else if (actionType === 'raise') {
      const lastRaise = currentBet * 2;
      return {
        min: Math.min(lastRaise, effectiveStack),
        max: effectiveStack
      };
    }
    
    return { min: 0, max: 0 };
  };

  // Validate and handle bet amount changes
  const handleAmountChange = (value: string) => {
    setError('');
    
    if (value === '') {
      setActionAmount('');
      return;
    }

    const numValue = Number(value);
    if (isNaN(numValue)) return;

    const { min, max } = getBetLimits();
    
    if (numValue < min) {
      setError(`Minimum ${actionType} amount is $${min}`);
    } else if (numValue > max) {
      setError(`Maximum ${actionType} amount is $${max} (effective stack)`);
    }
    
    setActionAmount(value);
  };

  const handleAddAction = () => {
    if (!selectedPlayer || !actionType) return;

    const effectiveStack = getEffectiveStack(selectedPlayer);
    let finalAmount: string | undefined = actionAmount;
    let finalActionType = actionType;

    // Check if this is a bet after a bet (should be a raise)
    if (actionType === 'bet' && street.actions && street.actions.length > 0) {
      const hasPreviousBet = street.actions.some(action => 
        action.type === 'bet' || action.type === 'raise'
      );
      if (hasPreviousBet) {
        finalActionType = 'raise';
      }
    }

    // Handle different action types
    switch (finalActionType) {
      case 'call':
        const currentBet = getCurrentBetToCall();
        finalAmount = Math.min(currentBet, effectiveStack).toString();
        break;
      
      case 'all-in':
        finalAmount = effectiveStack.toString();
        break;
      
      case 'bet':
      case 'raise':
        const { min, max } = getBetLimits();
        const amount = Number(actionAmount);
        
        if (amount < min || amount > max) {
          setError(`Invalid ${finalActionType} amount. Must be between $${min} and $${max}`);
          return;
        }
        finalAmount = actionAmount;
        break;
      
      case 'fold':
      case 'check':
        finalAmount = undefined;
        break;
    }

    const newAction: Action = {
      player: selectedPlayer,
      type: finalActionType,
      ...(finalAmount ? { amount: parseFloat(finalAmount) } : {})
    };

    onUpdate({
      ...street,
      actions: [...(street.actions || []), newAction]
    });

    if (finalActionType !== 'check' && finalActionType !== 'fold') {
      setActionAmount('');
    }
    setError('');
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

  // Update street completion status when actions change
  useEffect(() => {
    // In all-in situations, specifically check if everyone has responded
    if (street.actions?.some(a => a.type === 'all-in')) {
      // Get the last all-in action
      const lastAllInIndex = [...street.actions].map(a => a.type).lastIndexOf('all-in');
      
      // Get players who haven't folded and aren't the one who went all-in
      const respondingPlayers = getActingPlayers().filter(player => {
        if (player.position === street.actions[lastAllInIndex].player) return false;
        
        // Check if this player has acted after the all-in
        return !street.actions.slice(lastAllInIndex + 1).some(a => a.player === player.position);
      });
      
      // Street is complete only if everyone has responded
      setIsStreetComplete(respondingPlayers.length === 0);
      return;
    }
    
    // Normal completion logic for non-all-in situations
    const isComplete = isActionComplete();
    const isAllIn = isAllPlayersAllIn();
    setIsStreetComplete(isComplete || isAllIn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [street.actions, allPlayersAllIn]);
  
  // Ensure that we have the right number of cards on the board when all-in
  useEffect(() => {
    if (isAllPlayersAllIn() && streetName !== 'Preflop' && (!street.board || street.board.length === 0)) {
      // Force a reminder to add board cards in all-in situations
      const requiredCards = streetName === 'Flop' ? 3 : 1;
      if (boardCards.filter(card => card !== null).length < requiredCards) {
        console.log(`All players are all-in. Please add ${requiredCards} card(s) for the ${streetName}.`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streetName, street.board, boardCards]);

  // Check if anyone needs to respond to an all-in
  const playersNeedToRespondToAllIn = () => {
    if (!street.actions || !street.actions.some(a => a.type === 'all-in')) {
      return false;
    }
    
    // Find the last all-in action
    const lastAllInIndex = [...street.actions].map(a => a.type).lastIndexOf('all-in');
    const lastAllInPlayer = street.actions[lastAllInIndex].player;
    
    // Get non-folded, non-all-in players who haven't acted after the all-in
    const activePlayers = getActingPlayers();
    const playersWhoNeedToRespond = activePlayers.filter(player => {
      // Skip the player who went all-in
      if (player.position === lastAllInPlayer) return false;
      
      // Check if this player has acted after the all-in
      return !street.actions.slice(lastAllInIndex + 1).some(a => a.player === player.position);
    });
    
    return playersWhoNeedToRespond.length > 0;
  };

  return (
    <div className={`space-y-4 pt-4 rounded-xl ${isStreetComplete && !playersNeedToRespondToAllIn() ? 'bg-green-50' : ''} pb-4`} 
         style={{ borderTop: '1px solid rgb(229, 231, 235)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">{streetName}</h3>
          {isStreetComplete && !playersNeedToRespondToAllIn() && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {getActingPlayers().length === 0 && getActivePlayers().some(p => isPlayerAllIn(p.position)) ? 'All-in' : 'Complete'}
            </span>
          )}
          {playersNeedToRespondToAllIn() && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Waiting for response
            </span>
          )}
        </div>
        <span className="text-base font-medium text-gray-900">
          Total Pot: ${calculateTotalPot()}
        </span>
      </div>
      
      {/* Always show board cards for non-preflop streets */}
      {streetName !== 'Preflop' && (
        <div className="space-y-2">
          {/* Show previous street cards for context */}
          {(streetName === 'Turn' || streetName === 'River') && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {streetName === 'Turn' ? 'Flop' : 'Flop + Turn'}:
              </label>
              <div className="flex flex-wrap gap-2">
                {/* Show Flop */}
                {previousCards.flop && previousCards.flop.map((card: Card, idx: number) => (
                  <span key={`flop-${idx}`} className={`inline-flex items-center justify-center w-10 h-10 rounded-md border-2 border-gray-200 ${
                    card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {card.rank}
                    {card.suit === 'hearts' ? '♥' : 
                     card.suit === 'diamonds' ? '♦' : 
                     card.suit === 'clubs' ? '♣' : '♠'}
                  </span>
                ))}
                
                {/* Show Turn if on River */}
                {streetName === 'River' && previousCards.turn && previousCards.turn.map((card: Card, idx: number) => (
                  <span key={`turn-${idx}`} className={`inline-flex items-center justify-center w-10 h-10 rounded-md border-2 border-gray-200 ${
                    card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {card.rank}
                    {card.suit === 'hearts' ? '♥' : 
                     card.suit === 'diamonds' ? '♦' : 
                     card.suit === 'clubs' ? '♣' : '♠'}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <label className="block text-base font-semibold text-gray-900 mb-2">
            {streetName} Cards ({streetName === 'Flop' ? '3 cards' : '1 card'})
          </label>
          <CardSelector
            selectedCards={boardCards}
            maxCards={streetName === 'Flop' ? 3 : 1}
            onCardSelect={handleBoardCards}
            usedCards={usedCards}
          />
        </div>
      )}

      {/* Show action UI if there are players who need to act or respond to all-in */}
      {(!isStreetComplete || playersNeedToRespondToAllIn()) && getActingPlayers().length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-2">
                Player
              </label>
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value as "")}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg font-medium text-gray-900"
              >
                <option value="">Select player</option>
                {/* Only show players who can still act and haven't responded to an all-in */}
                {getActingPlayers()
                  .filter(player => {
                    if (!street.actions?.some(a => a.type === 'all-in')) {
                      return true; // Show all players if there's no all-in
                    }
                    
                    // If there's an all-in, only show players who haven't responded
                    const lastAllInIndex = [...street.actions].map(a => a.type).lastIndexOf('all-in');
                    const lastAllInPlayer = street.actions[lastAllInIndex].player;
                    
                    // Skip the player who went all-in
                    if (player.position === lastAllInPlayer) return false;
                    
                    // Show player if they haven't acted after the all-in
                    return !street.actions.slice(lastAllInIndex + 1).some(a => a.player === player.position);
                  })
                  .map((player) => (
                    <option key={player.position} value={player.position}>
                      {player.position} {player.isHero ? '(Hero)' : ''}
                    </option>
                  ))
                }
              </select>
            </div>

            <div>
              <label className="block text-base font-semibold text-gray-900 mb-2">
                Available Actions
              </label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value as ActionType)}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg font-medium text-gray-900 bg-white"
              >
                {/* When there's a previous bet, raise, or all-in */}
                {street.actions && street.actions.some(a => a.type === 'bet' || a.type === 'raise' || a.type === 'all-in') ? (
                  <>
                    <option value="call">Call ${getCurrentBetToCall()}</option>
                    {!isFacingAllIn() && <option value="raise">Raise</option>}
                    <option value="all-in">All-in ${getEffectiveStack(selectedPlayer)}</option>
                    <option value="fold">Fold</option>
                  </>
                ) : (
                  /* No previous bet (first action or after checks) */
                  <>
                    <option value="bet">Bet</option>
                    <option value="all-in">All-in ${getEffectiveStack(selectedPlayer)}</option>
                    <option value="check">Check</option>
                  </>
                )}
              </select>
            </div>

            {(actionType === 'bet' || actionType === 'raise') && (
              <div className="col-span-2">
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Amount {error && <span className="text-red-600 text-sm ml-2">({error})</span>}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium text-gray-900">$</span>
                  <input
                    type="text"
                    value={actionAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder={`Enter amount (max ${getEffectiveStack(selectedPlayer)})`}
                    className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg font-medium text-gray-900"
                  />
                  <button
                    onClick={handleAddAction}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg text-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!selectedPlayer || !actionAmount || error !== ''}
                  >
                    Add Action
                  </button>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Effective stack: ${getEffectiveStack(selectedPlayer)}
                  {actionType === 'raise' && ` | Min raise: $${getBetLimits().min}`}
                </div>
              </div>
            )}

            {(actionType === 'fold' || actionType === 'check' || actionType === 'call' || actionType === 'all-in') && (
              <div className="col-span-2">
                <button
                  onClick={handleAddAction}
                  className={`w-full px-6 py-2 rounded-lg text-lg font-medium transition-colors mt-8 ${
                    actionType === 'all-in' ? 'bg-red-500 hover:bg-red-600' : 
                    actionType === 'fold' ? 'bg-gray-500 hover:bg-gray-600' :
                    'bg-blue-500 hover:bg-blue-600'
                  } text-white`}
                  disabled={!selectedPlayer}
                >
                  {actionType === 'call' ? `Call $${getCurrentBetToCall()}` : 
                   actionType === 'all-in' ? (getCurrentBetToCall() > 0 ? 
                      `Call All-in $${getEffectiveStack(selectedPlayer)}` : 
                      `All-in $${getEffectiveStack(selectedPlayer)}`) :
                   `${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`}
                </button>
              </div>
            )}
          </div>

          {/* Display current street actions */}
          {street.actions && street.actions.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-lg font-semibold text-gray-900">Current Actions:</h4>
              <div className="space-y-2">
                {street.actions.map((action, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <span className="text-base text-gray-900">
                      {action.player} - {action.type.charAt(0).toUpperCase() + action.type.slice(1)}
                      {action.amount ? ` $${action.amount}` : ''}
                    </span>
                    <button
                      onClick={() => handleDeleteAction(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Summary view when street is complete */}
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="space-y-2">
              {street.actions?.map((action, index) => (
                <div key={index} className="text-base text-gray-900">
                  {action.player} - {action.type.charAt(0).toUpperCase() + action.type.slice(1)}
                  {action.amount ? ` $${action.amount}` : ''}
                </div>
              ))}
            </div>
            {streetName !== 'Preflop' && street.board && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-base font-medium text-gray-900">Board:</div>
                <div className="flex gap-2 mt-1">
                  {street.board.map((card, index) => (
                    <span key={index} 
                          className={`text-lg ${
                            card.suit === 'hearts' || card.suit === 'diamonds' 
                              ? 'text-red-600' 
                              : 'text-gray-900'
                          }`}>
                      {card.rank}
                      {card.suit === 'hearts' ? '♥' : 
                       card.suit === 'diamonds' ? '♦' : 
                       card.suit === 'clubs' ? '♣' : '♠'}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Always show Edit Street button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsStreetComplete(false)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Edit Street
              </button>
            </div>
          </div>
        </>
      )}
      
      {streetName === 'River' && isStreetComplete && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">Showdown</h4>
          <div className="space-y-2">
            {players
              .filter(player => !street.actions?.some(action => 
                action.player === player.position && action.type === 'fold'
              ))
              .map(player => (
                <div key={player.position} className="flex items-center justify-between">
                  <span className="text-base text-gray-900">
                    {player.isHero ? `Hero (${player.position})` : `Villain (${player.position})`}
                  </span>
                  {player.holeCards && (
                    <span className={`text-lg ${
                      player.holeCards.some(card => card.suit === 'hearts' || card.suit === 'diamonds') 
                        ? 'text-red-600' 
                        : 'text-gray-900'
                    }`}>
                      {player.holeCards.map((card, i) => (
                        <span key={i}>
                          {card.rank}
                          {card.suit === 'hearts' ? '♥' : 
                           card.suit === 'diamonds' ? '♦' : 
                           card.suit === 'clubs' ? '♣' : '♠'}
                          {i === 0 ? ' ' : ''}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
} 