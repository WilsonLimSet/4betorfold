'use client';

import { useState, useEffect } from 'react';
import { Street, Card, Player, Action, ActionType } from '../types/poker';
import CardSelector from './CardSelector';
import {
  getCurrentBetToCall,
  getMinBet,
  getMinRaise,
  getEffectiveStack,
  isPlayerAllIn,
  getActivePlayers,
  getActingPlayers,
  getNextActingPlayer,
  isAllPlayersAllIn,
  isActionComplete,
  getBetLimits,
  getPlayerContributions
} from '@/app/utils/pokerUtils';

interface StreetActionsProps {
  streetName: 'Preflop' | 'Flop' | 'Turn' | 'River';
  players: Player[];
  street: Street;
  onUpdate: (street: Street) => void;
  previousStreet?: Street;
  usedCards?: Card[];
  allPlayersAllIn?: boolean;
  previousCards?: {
    flop?: Card[];
    turn?: Card[];
  };
  straddleAmount?: number;
  blinds?: { sb: number; bb: number };
  preflopPot?: number;
  flopPot?: number;
  turnPot?: number;
}

export default function StreetActions({ 
  streetName, 
  players, 
  street, 
  onUpdate, 
  previousStreet, 
  usedCards = [], 
  allPlayersAllIn = false,
  previousCards = {},
  straddleAmount = 0,
  blinds = { sb: 1, bb: 2 },
  preflopPot = 0,
  flopPot = 0,
  turnPot = 0
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
  
  // Update local state when props change
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
  
  // Update street completion status when actions change
  useEffect(() => {
    const isComplete = isActionComplete(players, street, previousStreet);
    const isAllIn = isAllPlayersAllIn(players, street, previousStreet, allPlayersAllIn);
    
    // Check if someone manually set isStreetComplete to false
    const isManuallyIncomplete = !isStreetComplete && (isComplete || isAllIn);
    
    // Only update if the street wasn't manually set to incomplete
    if (!isManuallyIncomplete) {
      setIsStreetComplete(isComplete || isAllIn);
    }
  }, [street.actions, players, previousStreet, allPlayersAllIn, street, isStreetComplete]);
  
  // Force mark as complete if all players have acted
  useEffect(() => {
    // Check if all actions are complete based on the current state
    const isComplete = isActionComplete(players, street, previousStreet);
    if (isComplete && !isStreetComplete) {
      setIsStreetComplete(true);
    }
  }, [players, street, previousStreet, isStreetComplete]);
  
  // Auto-select next player to act
  useEffect(() => {
    // Skip if street is already complete
    if (isStreetComplete) return;
    
    // Get acting players - who still need to make decisions
    const actingPlayers = getActingPlayers(players, street, previousStreet);
    if (actingPlayers.length === 0) return;
    
    // If there's an all-in action, make sure other players get to respond
    if (street.actions?.some((action: Action) => action.type === 'all-in')) {
      const lastAllInAction = [...(street.actions || [])].reverse().find((action: Action) => action.type === 'all-in');
      if (lastAllInAction) {
        const playersWhoHaventActedOnAllIn = actingPlayers.filter((player: Player) => {
          // Get the index of the last all-in action
          const allInIndex = street.actions?.findIndex((a: Action) => a === lastAllInAction) || -1;
          // Check if this player has acted after the all-in
          return !street.actions?.slice(allInIndex + 1).some((a: Action) => a.player === player.position);
        });
        
        if (playersWhoHaventActedOnAllIn.length > 0) {
          const nextPlayer = playersWhoHaventActedOnAllIn[0].position;
          setSelectedPlayer(nextPlayer);
          setActionType('call');
          const currentBet = getCurrentBetToCall(street);
          setActionAmount(currentBet.toString());
          setError('');
          return;
        }
      }
    }
    
    // Normal next player logic...
    const nextPlayer = getNextActingPlayer(players, street);
    if (nextPlayer) {
      setSelectedPlayer(nextPlayer);
      
      // Reset action type based on street and previous action
      if (street.actions && street.actions.length > 0) {
        const lastAction = street.actions[street.actions.length - 1];
        if (lastAction.type === 'bet' || lastAction.type === 'raise' || lastAction.type === 'all-in') {
          setActionType('call');
          // Force update the action amount for calls
          const currentBet = getCurrentBetToCall(street);
          setActionAmount(currentBet.toString());
          // Clear any previous errors
          setError('');
        } else if (lastAction.type === 'check' || lastAction.type === 'call') {
          // Default to minimum bet on turn and later streets, call on preflop
          if (streetName === 'Preflop') {
            setActionType('call');
            const currentBet = getCurrentBetToCall(street);
            setActionAmount(currentBet.toString());
          } else {
            setActionType('bet');
            const minBet = getMinBet(streetName, street, blinds, straddleAmount);
            setActionAmount(minBet.toString());
          }
        } else {
          // Default to minimum bet on turn and later streets, call on preflop
          if (streetName === 'Preflop') {
            setActionType('call');
            const currentBet = getCurrentBetToCall(street);
            setActionAmount(currentBet.toString());
          } else {
            setActionType('bet');
            const minBet = getMinBet(streetName, street, blinds, straddleAmount);
            setActionAmount(minBet.toString());
          }
        }
      } else {
        // First action
        if (streetName === 'Preflop') {
          // In preflop, default to minimum bet
          setActionType('bet');
          const minBet = getMinBet(streetName, street, blinds, straddleAmount);
          setActionAmount(minBet.toString());
          
          // If there's a straddle, also show the option to call the straddle
          if (straddleAmount > 0) {
            // Add an option to call the straddle
            const straddleCallOption = document.createElement('option');
            straddleCallOption.value = 'call';
            straddleCallOption.textContent = `Call $${straddleAmount}`;
            document.querySelector('select[name="actionType"]')?.appendChild(straddleCallOption);
          } else {
            // If no straddle, show option to call the big blind
            const bbCallOption = document.createElement('option');
            bbCallOption.value = 'call';
            bbCallOption.textContent = `Call $${blinds.bb}`;
            document.querySelector('select[name="actionType"]')?.appendChild(bbCallOption);
          }
        } else {
          // On turn and later streets, default to minimum bet
          setActionType('bet');
          const minBet = getMinBet(streetName, street, blinds, straddleAmount);
          setActionAmount(minBet.toString());
        }
      }
    }
  }, [street, street.actions, players, streetName, previousStreet, blinds, isStreetComplete, straddleAmount]);
  
  // Update action amount when action type changes
  useEffect(() => {
    // Skip if no player is selected
    if (!selectedPlayer) return;
    
    // Get effective stack for the selected player
    const player = players.find(p => p.position === selectedPlayer);
    if (!player) return;
    
    const effectiveStack = getEffectiveStack(selectedPlayer, players, street, previousStreet);
    
    // Handle different action types
    switch (actionType) {
      case 'bet':
        // For bet, set to minimum bet by default
        const minBet = getMinBet(streetName, street, blinds, straddleAmount);
        setActionAmount(minBet.toString());
        break;
        
      case 'raise':
        // For raise, set to minimum raise by default
        const minRaise = getMinRaise(street, blinds, straddleAmount);
        setActionAmount(minRaise.toString());
        break;
        
      case 'call':
        // For call, set to current bet to call
        let currentBet = getCurrentBetToCall(street);
        
        // For preflop, ensure minimum call is big blind or straddle if no prior bets
        if (streetName === 'Preflop' && currentBet === 0) {
          currentBet = straddleAmount > 0 ? straddleAmount : blinds.bb;
        }
        
        setActionAmount(currentBet.toString());
        break;
        
      case 'all-in':
        // For all-in, set to effective stack
        setActionAmount(effectiveStack.toString());
        break;
        
      default:
        // For other actions like check/fold, clear the amount
        setActionAmount('');
        break;
    }
  }, [
    actionType, 
    selectedPlayer, 
    players,
    blinds, 
    straddleAmount,
    street,
    streetName,
    previousStreet
  ]);
  
  // Validate and handle bet amount changes
  const handleAmountChange = (value: string) => {
    setError('');
    
    if (value === '') {
      setActionAmount('');
      return;
    }

    const numValue = Number(value);
    if (isNaN(numValue)) return;

    const player = players.find(p => p.position === selectedPlayer);
    if (!player) return;

    // Get min and max limits
    const { min, max } = getBetLimits(
      actionType,
      selectedPlayer,
      players,
      street,
      streetName,
      previousStreet,
      blinds,
      straddleAmount
    );

    // For 'bet' or 'raise' actions, validate against min and max limits
    if (actionType === 'bet' || actionType === 'raise') {
      if (numValue < min) {
        setError(`Invalid ${actionType} amount. Minimum ${actionType} is $${min}`);
      } else if (numValue > max) {
        setError(`Invalid ${actionType} amount. Maximum ${actionType} is $${max}`);
      }
    }

    // Always update the action amount, even if there's an error
    setActionAmount(value);
  };

  // Check if the current action amount is valid
  const isValidAmount = () => {
    if (!actionAmount) return false;
    if (actionType === 'check' || actionType === 'fold') return true;

    const numValue = Number(actionAmount);
    if (isNaN(numValue)) return false;

    const { min, max } = getBetLimits(
      actionType,
      selectedPlayer,
      players,
      street,
      streetName,
      previousStreet,
      blinds,
      straddleAmount
    );

    return numValue >= min && numValue <= max;
  };

  const handleAddAction = () => {
    // Validate player selection
    if (!selectedPlayer) {
      setError('Please select a player');
      return;
    }
    
    // Validate amount for bet/raise actions
    if ((actionType === 'bet' || actionType === 'raise') && !actionAmount) {
      setError('Please enter an amount');
      return;
    }
    
    // Get effective stack for the selected player
    const player = players.find(p => p.position === selectedPlayer);
    if (!player) {
      setError('Player not found');
      return;
    }
    
    const effectiveStack = getEffectiveStack(selectedPlayer, players, street, previousStreet);
    let finalAmount = 0;
    const finalActionType = actionType;
    let isActuallyAllIn = false; // Track if this is effectively an all-in

    // Handle different action types
    switch (actionType) {
      case 'call':
        const currentBet = getCurrentBetToCall(street);
        finalAmount = Math.min(currentBet, effectiveStack);
        // If calling would use the entire stack, treat as all-in
        if (finalAmount >= effectiveStack) {
          isActuallyAllIn = true;
        }
        break;
      
      case 'all-in':
        finalAmount = effectiveStack;
        isActuallyAllIn = true;
        break;
      
      case 'bet':
      case 'raise':
        const amount = parseFloat(actionAmount);
        if (isNaN(amount) || amount <= 0) {
          setError('Please enter a valid amount');
          return;
        }

        // For bet, use minimum bet
        // For raise, use minimum raise
        const minAmount = actionType === 'bet' 
          ? getMinBet(streetName, street, blinds, straddleAmount)
          : getMinRaise(street, blinds, straddleAmount);
          
        if (amount < minAmount) {
          setError(`Minimum ${actionType} amount is $${minAmount}`);
          return;
        }

        if (amount > effectiveStack) {
          setError(`Amount exceeds your effective stack of $${effectiveStack}`);
          return;
        }

        finalAmount = amount;
        // If betting/raising the entire stack, treat as all-in
        if (finalAmount >= effectiveStack) {
          isActuallyAllIn = true;
        }
        break;
      
      case 'fold':
      case 'check':
        finalAmount = 0;
        break;
    }

    // Create the action, converting to all-in if needed
    const newAction: Action = {
      player: selectedPlayer,
      type: isActuallyAllIn ? 'all-in' : finalActionType,
      amount: finalAmount
    };

    // Create a new street object with the updated actions
    const updatedStreet = {
      ...street,
      actions: [...(street.actions || []), newAction]
    };

    // Send the updated street object to the parent component
    onUpdate(updatedStreet);
    
    // Reset form state
    setActionAmount('');
    setError('');
    
    // After adding the action (especially if it was an all-in), update the UI
    setTimeout(() => {
      // Get active players who haven't acted yet
      const playersToAct = getActingPlayers(players, updatedStreet, previousStreet);
      
      // Special handling if the action was all-in
      if (isActuallyAllIn || newAction.type === 'all-in') {
        // Find players who need to respond to the all-in
        const respondingPlayers = playersToAct.filter(player => {
          // Skip the player who just went all-in
          if (player.position === selectedPlayer) return false;
          
          // The all-in action was just added as the last action, so no need to check for subsequent actions
          // Everyone who can still act needs to respond to the all-in
          return true;
        });
        
        // If there are players who need to respond, select the next one
        if (respondingPlayers.length > 0) {
          setSelectedPlayer(respondingPlayers[0].position);
          setActionType('call'); // Default to call when responding to all-in
          setActionAmount(finalAmount.toString()); // Amount to call
        } else {
          // If no players need to respond, clear selection
          setSelectedPlayer('');
        }
      } else {
        // Normal action - select next player to act if available
        const nextPlayer = getNextActingPlayer(players, updatedStreet);
        if (nextPlayer) {
          setSelectedPlayer(nextPlayer);
          
          // Determine appropriate action type based on previous action
          if (newAction.type === 'bet' || newAction.type === 'raise') {
            setActionType('call');
            setActionAmount(newAction.amount?.toString() || '');
          } else {
            if (streetName === 'Preflop') {
              setActionType('call');
              const currentBet = getCurrentBetToCall(updatedStreet);
              setActionAmount(currentBet.toString());
            } else {
              setActionType('check');
              setActionAmount('');
            }
          }
        } else {
          // No players left to act, clear selection
          setSelectedPlayer('');
        }
      }
    }, 50);
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

  // Helper function to check if a specific player needs to respond to an all-in
  const needsToRespondToAllIn = (playerPosition: string): boolean => {
    // No response needed if there are no all-in actions in the current street
    if (!street.actions || !street.actions.some(a => a.type === 'all-in')) {
      return false;
    }
    
    // Find the last all-in action
    let lastAllInIndex = -1;
    for (let i = street.actions.length - 1; i >= 0; i--) {
      if (street.actions[i].type === 'all-in') {
        lastAllInIndex = i;
        break;
      }
    }
    
    if (lastAllInIndex === -1) return false;
    
    const lastAllInPlayer = street.actions[lastAllInIndex].player;
    
    // Skip the player who went all-in
    if (playerPosition === lastAllInPlayer) return false;
    
    // Skip players who are already all-in
    if (isPlayerAllIn(playerPosition, street, previousStreet)) return false;
    
    // Skip players who have folded
    const hasFolded = street.actions.some(a => a.player === playerPosition && a.type === 'fold') ||
                     (previousStreet?.actions?.some(a => a.player === playerPosition && a.type === 'fold') ?? false);
    if (hasFolded) return false;
    
    // Check if this player has acted after the all-in
    const hasActedAfterAllIn = street.actions
      .slice(lastAllInIndex + 1)
      .some(action => action.player === playerPosition);
    
    // Player needs to respond if they haven't acted after the all-in
    return !hasActedAfterAllIn;
  };

  // Helper function to check if any player needs to respond to an all-in
  const playersNeedToRespondToAllIn = (): boolean => {
    // No responses needed if there are no all-in actions in the current street
    if (!street.actions || !street.actions.some(a => a.type === 'all-in')) {
      return false;
    }
    
    // Get active players (not folded and not all-in)
    const activePlayers = getActingPlayers(players, street, previousStreet);
    
    // Get active players who still need to respond to the all-in
    return activePlayers.some(player => needsToRespondToAllIn(player.position));
  };

  // Get the list of players who need to respond to an all-in
  const getPlayersWhoNeedToRespondToAllIn = (): Player[] => {
    return getActingPlayers(players, street, previousStreet)
      .filter(player => needsToRespondToAllIn(player.position));
  };

  // Show straddle in the UI if present
  const getPrePotInfo = () => {
    let result = '';
    if (straddleAmount > 0) {
      result = `Small Blind: $${blinds.sb}, Big Blind: $${blinds.bb}, Straddle: $${straddleAmount}`;
    }
    return result;
  };

  // Check if all players were all-in on previous street (preflop)
  //const allPlayersWereAllIn = streetName !== 'Preflop' && previousStreet && isAllPlayersAllIn(players, previousStreet, undefined, allPlayersAllIn);

  // Check if all players were all-in on previous street
  const isPreviousStreetAllIn = previousStreet && 
    isAllPlayersAllIn(players, previousStreet, undefined, allPlayersAllIn) && 
    // Check if there were enough actions on the previous street to indicate everyone is all-in
    (previousStreet.actions?.some(a => a.type === 'all-in') || 
     (previousStreet.actions && previousStreet.actions.length > 0 && 
      getActingPlayers(players, previousStreet).length === 0));
  
  // Hide action UI on postflop streets if all players were all-in on previous street
  // BUT keep UI visible if there are players who need to respond to an all-in on current street
  const shouldHideActionUI = streetName !== 'Preflop' && 
                           isPreviousStreetAllIn && 
                           street.actions && street.actions.length === 0 && // Only hide if no actions have been taken yet
                           !playersNeedToRespondToAllIn(); // Don't hide if players need to respond to all-in

  // Calculate the pot for the current street
  const calculateCurrentPot = () => {
    // For preflop, use the fixed calculation to avoid double-counting
    if (streetName === 'Preflop') {
      // Start with blinds and straddle
      let preflopPot = blinds.sb + blinds.bb;
      if (straddleAmount > 0) {
        preflopPot += straddleAmount;
      }
      
      // Get highest player contributions using the utility function
      const playerContributions = getPlayerContributions(street.actions);
      
      // Add the highest contribution from each player
      for (const amount of playerContributions.values()) {
        preflopPot += amount;
      }
      
      return preflopPot;
    }
    
    // For flop, use the passed preflopPot and add current street actions
    if (streetName === 'Flop') {
      let flopTotal = preflopPot || 0;
      
      // Get highest player contributions using the utility function
      const playerContributions = getPlayerContributions(street.actions);
      
      // Add each player's highest contribution on flop
      for (const amount of playerContributions.values()) {
        flopTotal += amount;
      }
      
      return flopTotal;
    }
    
    // For turn, use the passed flopPot which includes preflop + flop
    if (streetName === 'Turn') {
      let turnTotal = flopPot || 0;
      
      // Get highest player contributions using the utility function
      const playerContributions = getPlayerContributions(street.actions);
      
      // Add each player's highest contribution on turn
      for (const amount of playerContributions.values()) {
        turnTotal += amount;
      }
      
      return turnTotal;
    }
    
    // For river, use the passed turnPot which includes preflop + flop + turn
    if (streetName === 'River') {
      let riverTotal = turnPot || 0;
      
      // Get highest player contributions using the utility function
      const playerContributions = getPlayerContributions(street.actions);
      
      // Add each player's highest contribution on river
      for (const amount of playerContributions.values()) {
        riverTotal += amount;
      }
      
      return riverTotal;
    }
    
    // Fallback (shouldn't happen)
    return 0;
  };

  // Force BB to be selectable when BTN is all-in during preflop
  useEffect(() => {
    if (streetName === 'Preflop' && 
        street.actions?.some(a => a.player === 'BTN' && a.type === 'all-in') &&
        !street.actions?.some(a => a.player === 'BB')) {
      
      // Check if BB is in players list and hasn't folded
      const bbPlayer = players.find(p => p.position === 'BB');
      if (bbPlayer && !isPlayerAllIn('BB', street, previousStreet)) {
        // Force BB as selected player with call action
        setSelectedPlayer('BB');
        setActionType('call');
        
        // Calculate amount to call (BTN's all-in amount)
        const allInAction = street.actions?.find(a => a.player === 'BTN' && a.type === 'all-in');
        if (allInAction?.amount) {
          setActionAmount(allInAction.amount.toString());
        }
      }
    }
  }, [street, street.actions, players, streetName, previousStreet]);

  // Add a dedicated notification for players who need to respond to all-in
  const playersNeedingToRespond = playersNeedToRespondToAllIn();

  // Helper function to check if all players were all-in in a previous street
  const allPlayersAllInOnPreviousStreet = () => {
    if (streetName === 'Preflop') return false;

    if (!previousStreet || !previousStreet.actions) return false;

    // Check if there are any all-in actions in previous street
    const anyAllInsInPreviousStreet = previousStreet.actions.some(a => a.type === 'all-in');

    if (!anyAllInsInPreviousStreet) return false;

    // Get active players from previous street
    const activePreviousPlayers = getActivePlayers(players, previousStreet);
    
    // Check if all active players are all-in
    const allActivePlayersAllIn = activePreviousPlayers.every(p => 
      isPlayerAllIn(p.position, previousStreet)
    );

    return allActivePlayersAllIn;
  };

  // Check if we should show the action UI
  const shouldShowActionUI = () => {
    // Always show UI for preflop
    if (streetName === 'Preflop') return true;
    
    // If players need to respond to an all-in, show the UI
    if (playersNeedingToRespond) return true;
    
    // If street is not complete, show the UI
    if (!isStreetComplete) return true;
    
    // When everyone was all-in on a previous street:
    if (isPreviousStreetAllIn) {
      // For postflop streets, always show the board card UI even if everyone is all-in
      // This ensures that users can still add cards to the board
      return true;
    }
    
    // Default to showing the UI
    return true;
  };

  return (
    <div className="w-full space-y-4 pt-4 pb-4 border-t border-gray-200 rounded-b-xl"
         style={{ 
           boxShadow: isStreetComplete && !playersNeedingToRespond ? '0 0 0 1px rgb(229, 231, 235)' : 'none',
           backgroundColor: isStreetComplete && !playersNeedingToRespond ? 'rgb(240, 253, 244)' : 'transparent'
         }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">{streetName}</h3>
          {isStreetComplete && !playersNeedingToRespond && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {getActingPlayers(players, street, previousStreet).length === 0 && getActivePlayers(players, street, previousStreet).some(p => isPlayerAllIn(p.position, street, previousStreet)) ? 'All-in' : 'Complete'}
            </span>
          )}
          {playersNeedingToRespond && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Waiting for response
            </span>
          )}
          {shouldHideActionUI && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              All-in on previous street
            </span>
          )}
        </div>
        <span className="text-base font-medium text-gray-900">
          Total Pot: ${calculateCurrentPot()}
        </span>
      </div>
      
      {/* Notification for all-in response needed */}
      {playersNeedingToRespond && (
        <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg mb-4">
          <p className="text-base font-medium text-yellow-800">
            {getPlayersWhoNeedToRespondToAllIn().map(player => player.position).join(', ')} 
            {getPlayersWhoNeedToRespondToAllIn().length === 1 ? ' needs' : ' need'} to respond to all-in.
          </p>
        </div>
      )}
      
      {/* Show straddle info if present */}
      {straddleAmount > 0 && streetName === 'Preflop' && (
        <div className="text-sm text-gray-600 italic mb-2">
          {getPrePotInfo()}
        </div>
      )}

      {/* Card Grid - still show even if all players all-in, just no action UI */}
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
                
                {/* Add some spacing before Turn if on River */}
                {streetName === 'River' && <span className="w-5"></span>}
                
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

      {/* Show message when all players were all-in on a previous street and no players need to respond */}
      {allPlayersAllInOnPreviousStreet() && !playersNeedingToRespond && !street.actions?.length && (
        <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg">
          <p className="text-base text-yellow-800">
            All players were all-in on a previous street. Add board cards for this street.
          </p>
        </div>
      )}

      {/* Summary view for completed street action */}
      {isStreetComplete && !shouldHideActionUI && !playersNeedingToRespond && (
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
      )}

      {/* Only show action UI if we should based on our logic */}
      {shouldShowActionUI() && (
        <>
          {/* Special handling for postflop streets when everyone was all-in on previous street */}
          {streetName !== 'Preflop' && isPreviousStreetAllIn && !playersNeedingToRespond ? (
            // Only show card UI for postflop streets after all-in
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg">
                <p className="text-base text-yellow-800">
                  All players were all-in on a previous street. Add board cards and continue.
                </p>
              </div>
              
              {street.board && street.board.length > 0 && (
                <div className="mt-4">
                  <button
                    type="button"
                    className="px-4 py-2 bg-green-500 text-white font-medium rounded-md hover:bg-green-600"
                    onClick={() => setIsStreetComplete(true)}
                  >
                    Continue to {streetName === 'Flop' ? 'Turn' : streetName === 'Turn' ? 'River' : 'Showdown'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Show regular action UI for normal cases
            <>
              {/* Regular action UI */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-2">
                    Player
                    {playersNeedingToRespond && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Facing All-in
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer(e.target.value as "")}
                    className={`mt-1 block w-full rounded-lg ${playersNeedingToRespond ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'} shadow-sm text-lg font-medium text-gray-900`}
                  >
                    <option value="">Select player</option>
                    {players.map((player) => {
                      // Check if player has folded in current or previous street
                      const hasFolded = street.actions?.some(
                        action => action.player === player.position && action.type === 'fold'
                      ) || previousStreet?.actions?.some(
                        action => action.player === player.position && action.type === 'fold'
                      );

                      // Check if player is all-in in current or previous street
                      const isAllIn = isPlayerAllIn(player.position, street, previousStreet);
                      
                      // Determine if player needs to respond to an all-in
                      const mustRespondToAllIn = needsToRespondToAllIn(player.position);
                      
                      // Only show players who:
                      // 1. Haven't folded AND
                      // 2. Either aren't all-in OR need to respond to another player's all-in
                      if (hasFolded || (isAllIn && !mustRespondToAllIn)) {
                        return null;
                      }
                      
                      return (
                        <option key={player.position} value={player.position}>
                          {player.position} - ${player.stack}
                          {player.isHero && ' (Hero)'}
                          {isAllIn && ' (All-in)'}
                          {mustRespondToAllIn && ' - Needs to respond to all-in'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-2">
                    Available Actions
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as ActionType)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base text-gray-900"
                    disabled={isStreetComplete}
                  >
                    {(() => {
                      // Check if there's any all-in action
                      if (!street.actions?.some(a => a.type === 'all-in')) {
                        // No all-in case - show regular options
                        return (
                          <>
                            {/* Only show check option if postflop OR if preflop and player is BB/straddle */}
                            {(streetName !== 'Preflop' || 
                              (streetName === 'Preflop' && 
                                (selectedPlayer === 'BB' || 
                                (straddleAmount > 0 && selectedPlayer === 'BTN')))
                            ) && (
                              <option value="check">Check</option>
                            )}
                            
                            {/* Only show bet if there's no previous bet */}
                            {!street.actions?.some(a => a.type === 'bet' || a.type === 'raise' || a.type === 'all-in') && (
                              <option value="bet">
                                {actionType === 'bet' && actionAmount ? `Bet $${actionAmount}` : `Bet (min $${getMinBet(streetName, street, blinds, straddleAmount)})`}
                              </option>
                            )}
                            {/* Show raise if there is a previous bet */}
                            {street.actions?.some(a => a.type === 'bet' || a.type === 'raise' || a.type === 'all-in') && (
                              <option value="raise">
                                {actionType === 'raise' && actionAmount ? `Raise to $${actionAmount}` : `Raise (min $${getMinRaise(street, blinds, straddleAmount)})`}
                              </option>
                            )}
                            <option value="call" disabled={!street.actions?.some(a => a.type === 'bet' || a.type === 'raise' || a.type === 'all-in') && streetName !== 'Preflop'}>
                              {actionType === 'call' ? `Call $${
                                streetName === 'Preflop' && getCurrentBetToCall(street) === 0
                                  ? (straddleAmount > 0 ? straddleAmount : blinds.bb)
                                  : getCurrentBetToCall(street)
                              }` : 'Call'}
                            </option>
                            <option value="all-in">
                              {`All-in $${getEffectiveStack(selectedPlayer, players, street, previousStreet)}`}
                            </option>
                          </>
                        );
                      } else {
                        // If there's an all-in, check if this player needs to respond
                        if (needsToRespondToAllIn(selectedPlayer)) {
                          // Player needs to respond to all-in - only show fold, call, and all-in options
                          return (
                            <>
                              <option value="fold">Fold</option>
                              <option value="call">
                                {`Call $${getCurrentBetToCall(street)}`}
                              </option>
                              <option value="raise">
                                {`Raise to $${getMinRaise(street, blinds, straddleAmount)}`}
                              </option>
                              <option value="all-in">
                                {`All-in $${getEffectiveStack(selectedPlayer, players, street, previousStreet)}`}
                              </option>
                            </>
                          );
                        } else {
                          // Player doesn't need to respond to all-in, show normal options
                          return (
                            <>
                              {/* Only show check option if postflop OR if preflop and player is BB/straddle */}
                              {(streetName !== 'Preflop' || 
                                (streetName === 'Preflop' && 
                                  (selectedPlayer === 'BB' || 
                                  (straddleAmount > 0 && selectedPlayer === 'BTN')))
                              ) && (
                                <option value="check">Check</option>
                              )}
                              
                              {/* Only show bet if there's no previous bet */}
                              {!street.actions?.some(a => a.type === 'bet' || a.type === 'raise' || a.type === 'all-in') && (
                                <option value="bet">
                                  {actionType === 'bet' && actionAmount ? `Bet $${actionAmount}` : `Bet (min $${getMinBet(streetName, street, blinds, straddleAmount)})`}
                                </option>
                              )}
                              {/* Show raise if there is a previous bet */}
                              {street.actions?.some(a => a.type === 'bet' || a.type === 'raise' || a.type === 'all-in') && (
                                <option value="raise">
                                  {actionType === 'raise' && actionAmount ? `Raise to $${actionAmount}` : `Raise (min $${getMinRaise(street, blinds, straddleAmount)})`}
                                </option>
                              )}
                              <option value="call" disabled={!street.actions?.some(a => a.type === 'bet' || a.type === 'raise' || a.type === 'all-in') && streetName !== 'Preflop'}>
                                {actionType === 'call' ? `Call $${
                                  streetName === 'Preflop' && getCurrentBetToCall(street) === 0
                                    ? (straddleAmount > 0 ? straddleAmount : blinds.bb)
                                    : getCurrentBetToCall(street)
                                }` : 'Call'}
                              </option>
                              <option value="all-in">
                                {`All-in $${getEffectiveStack(selectedPlayer, players, street, previousStreet)}`}
                              </option>
                            </>
                          );
                        }
                      }
                    })()}
                  </select>
                </div>
              </div>
              
              {/* Show action button for bet/raise with amount input */}
              {(actionType === 'bet' || actionType === 'raise') && (
                <div className="col-span-2 mt-4">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={actionAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder={`Enter amount (min $${getBetLimits(
                        actionType,
                        selectedPlayer,
                        players,
                        street,
                        streetName,
                        previousStreet,
                        blinds,
                        straddleAmount
                      ).min}, max $${getEffectiveStack(selectedPlayer, players, street, previousStreet)})`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleAddAction}
                      className={`px-6 py-2 rounded-md text-white font-medium whitespace-nowrap ${
                        isValidAmount() ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!isValidAmount() || !selectedPlayer}
                    >
                      {actionType === 'bet' ? `Bet $${actionAmount}` : `Raise to $${actionAmount}`}
                    </button>
                  </div>
                </div>
              )}

              {/* Show action button for fold/check/call/all-in */}
              {(actionType === 'fold' || actionType === 'check' || actionType === 'call' || actionType === 'all-in') && (
                <div className="col-span-2 mt-4">
                  <button
                    type="button"
                    onClick={handleAddAction}
                    className={`w-full px-4 py-2 rounded-md text-white font-medium ${
                      actionType === 'fold' ? 'bg-red-500 hover:bg-red-600' :
                      actionType === 'all-in' ? 'bg-red-600 hover:bg-red-700' :
                      actionType === 'check' ? 'bg-blue-400 hover:bg-blue-500' :
                      'bg-blue-500 hover:bg-blue-600'
                    }`}
                    disabled={!selectedPlayer}
                  >
                    {actionType === 'fold' && 'Fold'}
                    {actionType === 'check' && 'Check'}
                    {actionType === 'call' && `Call $${
                      streetName === 'Preflop' && getCurrentBetToCall(street) === 0 
                        ? (straddleAmount > 0 ? straddleAmount : blinds.bb) 
                        : getCurrentBetToCall(street)
                    }`}
                    {actionType === 'all-in' && `All-in $${getEffectiveStack(selectedPlayer, players, street, previousStreet)}`}
                  </button>
                </div>
              )}

              {/* Show error message */}
              {error && (
                <div className="col-span-2 text-red-500 text-sm mt-2">
                  {error}
                </div>
              )}

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
          )}
        </>
      )}
    </div>
  );
}
