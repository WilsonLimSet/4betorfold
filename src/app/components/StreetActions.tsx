'use client';

import { useState, useEffect } from 'react';
import { Street, Card, Player, Action, ActionType, PokerStreet } from '../types/poker';
import CardSelector from './CardSelector';
import {
  getCurrentBetToCall,
  getMinBet,
  getMinRaise,
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
  actionsDisabledDueToAllIn?: boolean;
  calculateEffectiveStack: (playerPosition: string, targetStreetName: PokerStreet) => number;
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
  turnPot = 0,
  actionsDisabledDueToAllIn = false,
  calculateEffectiveStack
}: StreetActionsProps) {
  const [actionType, setActionType] = useState<ActionType>('bet');
  const [actionAmount, setActionAmount] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>(players[0]?.position || '');
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
  }, [street.board, streetName, street]);
  
  // Update street completion status when actions change
  useEffect(() => {
    const isComplete = isActionComplete(players, street, previousStreet);
    // const isAllIn = isAllPlayersAllIn(players, street, previousStreet, allPlayersAllIn);
    
    // Street is complete if the action sequence dictates it.
    // The all-in state across the whole hand is handled separately.
    if (isComplete && !isStreetComplete) {
      setIsStreetComplete(true);
    }
    // We might need to set it back to false if an action is deleted, handled by the 'Edit Street' button for now.

  }, [street.actions, players, previousStreet, isStreetComplete]);
  
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
          // Set the default amount to the call amount, but don't force the action type
          const currentBet = getCurrentBetToCall(street);
          setActionAmount(currentBet.toString()); 
          // Set default action type to Fold when responding to all-in
          setActionType('fold');
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
          // Force update the action amount for calls
          const currentBet = getCurrentBetToCall(street);
          setActionAmount(currentBet.toString());
          // Clear any previous errors
          // setError(''); // Removed setError call
        } else if (lastAction.type === 'check' || lastAction.type === 'call') {
          // Default to minimum bet on turn and later streets, call on preflop
          if (streetName === 'Preflop') {
            const currentBet = getCurrentBetToCall(street);
            setActionAmount(currentBet.toString());
          } else {
            const minBet = getMinBet(streetName, street, blinds, straddleAmount);
            setActionAmount(minBet.toString());
          }
        } else {
          // Default to minimum bet on turn and later streets, call on preflop
          if (streetName === 'Preflop') {
            const currentBet = getCurrentBetToCall(street);
            setActionAmount(currentBet.toString());
          } else {
            const minBet = getMinBet(streetName, street, blinds, straddleAmount);
            setActionAmount(minBet.toString());
          }
        }
      } else {
        // First action
        if (streetName === 'Preflop') {
          // In preflop, default to minimum bet
          const minBet = getMinBet(streetName, street, blinds, straddleAmount);
          setActionAmount(minBet.toString());
          
          // If there's a straddle, also show the option to call the straddle
          if (straddleAmount > 0) {
            // Add an option to call the straddle
          } else {
            // If no straddle, show option to call the big blind
          }
        } else {
          // On turn and later streets, default to minimum bet
          const minBet = getMinBet(streetName, street, blinds, straddleAmount);
          setActionAmount(minBet.toString());
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [street.actions, players, previousStreet, streetName, isStreetComplete, blinds, straddleAmount]);
  
  // Validate and handle bet amount changes
  const handleAmountChange = (value: string) => {
    // setError(''); // Removed setError call
    
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
        // setError(`Invalid ${actionType} amount. Minimum ${actionType} is $${min}`); // Removed setError call
      } else if (numValue > max) {
        // setError(`Invalid ${actionType} amount. Maximum ${actionType} is $${max}`); // Removed setError call
      }
    }

    // Always update the action amount, even if there's an error
    setActionAmount(value);
  };

  const handleAddAction = () => {
    // Validate player selection
    if (!selectedPlayer) {
      // setError('Please select a player'); // Removed setError call
      return;
    }
    
    // Validate amount for bet/raise actions
    if ((actionType === 'bet' || actionType === 'raise') && !actionAmount) {
      // setError('Please enter an amount'); // Removed setError call
      return;
    }
    
    // Get effective stack for the selected player
    const player = players.find(p => p.position === selectedPlayer);
    if (!player) {
      // setError('Player not found'); // Removed setError call
      return;
    }
    
    const effectiveStack = calculateEffectiveStack(selectedPlayer, streetName.toLowerCase() as PokerStreet);
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
          // setError('Please enter a valid amount'); // Removed setError call
          return;
        }

        // For bet, use minimum bet
        // For raise, use minimum raise
        const minAmount = actionType === 'bet' 
          ? getMinBet(streetName, street, blinds, straddleAmount)
          : getMinRaise(street, blinds, straddleAmount);
          
        if (amount < minAmount) {
          // setError(`Minimum ${actionType} amount is $${minAmount}`); // Removed setError call
          return;
        }

        if (amount > effectiveStack) {
          // setError(`Amount exceeds your effective stack of $${effectiveStack}`); // Removed setError call
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
    // setError(''); // Removed setError call
    
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
          setActionAmount(finalAmount.toString()); // Set default amount to call
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
    // Find the most recent all-in action across current and previous streets
    let lastAllInAction: Action | null = null;
    let lastAllInIndex = -1;
    let lastAllInStreet: 'current' | 'previous' | null = null;

    // Check current street first
    if (street.actions) {
      for (let i = street.actions.length - 1; i >= 0; i--) {
        if (street.actions[i].type === 'all-in') {
          lastAllInAction = street.actions[i];
          lastAllInIndex = i;
          lastAllInStreet = 'current';
          break;
        }
      }
    }

    // If no all-in on current, check previous (if it exists)
    if (!lastAllInAction && previousStreet?.actions) {
      for (let i = previousStreet.actions.length - 1; i >= 0; i--) {
        if (previousStreet.actions[i].type === 'all-in') {
          lastAllInAction = previousStreet.actions[i];
          lastAllInIndex = i;
          lastAllInStreet = 'previous';
          break;
        }
      }
    }

    // No response needed if no all-in action found anywhere relevant
    if (!lastAllInAction || lastAllInStreet === null) {
      return false;
    }

    const lastAllInPlayer = lastAllInAction.player;

    // Skip the player who went all-in
    if (playerPosition === lastAllInPlayer) return false;

    // Skip players who are already all-in (checks both streets)
    if (isPlayerAllIn(playerPosition, street, previousStreet)) return false;

    // Skip players who have folded (checks both streets)
    const hasFolded = street.actions?.some(a => a.player === playerPosition && a.type === 'fold') ||
                     (previousStreet?.actions?.some(a => a.player === playerPosition && a.type === 'fold') ?? false);
    if (hasFolded) return false;

    // Check if this player has acted *since* the last all-in
    let hasActedSinceAllIn = false;
    if (lastAllInStreet === 'previous') {
        // Check actions *after* all-in on previous street
        if(previousStreet?.actions) {
            hasActedSinceAllIn = previousStreet.actions
                .slice(lastAllInIndex + 1)
                .some(action => action.player === playerPosition);
        }
        // *Also* check if they took *any* action on the current street
        if (!hasActedSinceAllIn && street.actions) {
            hasActedSinceAllIn = street.actions.some(action => action.player === playerPosition);
        }
    } else if (lastAllInStreet === 'current' && street.actions) {
        // Check actions *after* all-in on current street
        hasActedSinceAllIn = street.actions
            .slice(lastAllInIndex + 1)
            .some(action => action.player === playerPosition);
    }

    // Player needs to respond if they haven't acted since the last all-in
    return !hasActedSinceAllIn;
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

  // Calculate the pot for the current street DISPLAY
  const calculateCurrentPot = () => {
    // For preflop, calculate based on blinds, straddle, and actions
    if (streetName === 'Preflop') {
      let currentPot = blinds.sb + blinds.bb;
      if (straddleAmount > 0) {
        currentPot += straddleAmount;
      }
      const playerContributions = getPlayerContributions(street.actions);
      for (const amount of playerContributions.values()) {
        currentPot += amount;
      }
      return currentPot;
    }
    
    // For postflop streets, display the pot *entering* this street,
    // which is passed via props from the parent.
    if (streetName === 'Flop') {
      return preflopPot || 0; // Display pot AFTER preflop actions
    }
    if (streetName === 'Turn') {
      return flopPot || 0; // Display pot AFTER flop actions
    }
    if (streetName === 'River') {
      return turnPot || 0; // Display pot AFTER turn actions
    }
    
    // Fallback
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
  }, [street.actions, players, streetName, previousStreet]);

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

  // Helper function to determine if the call button should be enabled
  const isValidCallCondition = (): boolean => {
    if (actionType !== 'call') return true; // Not relevant if not calling
    if (!selectedPlayer) return false; // Need a player

    // Allow call if there is a bet/raise or if it's preflop
    return street.actions?.some(a => a.type === 'bet' || a.type === 'raise' || a.type === 'all-in') || streetName === 'Preflop';
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
      
      {/* MOVED Notification for all-in response needed HERE */}
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
        </div>
      )}

      {/* Only show action UI if we should based on our logic AND actions are not disabled */}
      {!actionsDisabledDueToAllIn && (!isStreetComplete || playersNeedingToRespond) && (
        <>
          {/* Show regular action UI for normal cases */}
          <>
            <div className="grid grid-cols-2 gap-3">
              {/* Player Selection Dropdown */}
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
                    const hasFolded = street.actions?.some(
                      action => action.player === player.position && action.type === 'fold'
                    ) || previousStreet?.actions?.some(
                      action => action.player === player.position && action.type === 'fold'
                    );
                    const isAllIn = isPlayerAllIn(player.position, street, previousStreet);
                    const mustRespondToAllIn = needsToRespondToAllIn(player.position);
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

              {/* Available Actions Dropdown */}
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Available Actions
                </label>
                <select
                  value={actionType}
                  onChange={(e) => {
                    const newActionType = e.target.value as ActionType;
                    setActionType(newActionType);
                    // If selecting all-in, automatically set the amount using passed function
                    if (newActionType === 'all-in' && selectedPlayer) {
                      const effectiveStack = calculateEffectiveStack(selectedPlayer, streetName.toLowerCase() as PokerStreet);
                      setActionAmount(effectiveStack.toString());
                    }
                     // If selecting check or fold, clear the amount
                    else if (newActionType === 'check' || newActionType === 'fold') {
                      setActionAmount('');
                    }
                     // If selecting call, set the correct call amount
                    else if (newActionType === 'call') {
                       let callAmount = getCurrentBetToCall(street);
                       if (streetName === 'Preflop' && callAmount === 0) {
                         callAmount = straddleAmount > 0 ? straddleAmount : blinds.bb;
                       }
                       setActionAmount(callAmount.toString());
                    } 
                    // NEW: If selecting raise, set the minimum raise amount
                    else if (newActionType === 'raise') {
                      const minRaiseAmount = getMinRaise(street, blinds, straddleAmount);
                      setActionAmount(minRaiseAmount.toString());
                    }
                    // NEW: If selecting bet, set the minimum bet amount
                    else if (newActionType === 'bet') {
                      const minBetAmount = getMinBet(streetName, street, blinds, straddleAmount);
                      setActionAmount(minBetAmount.toString());
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base text-gray-900"
                  disabled={isStreetComplete} 
                >
                  {(() => {
                    // Check if there's any all-in action
                    if (!street.actions?.some(a => a.type === 'all-in')) {
                      // No all-in case - show regular options
                      return (
                        <>
                          {/* Check */}
                          {(streetName !== 'Preflop' || 
                            (streetName === 'Preflop' && 
                              (selectedPlayer === 'BB' || 
                              (straddleAmount > 0 && selectedPlayer === 'BTN')))
                          ) && (
                            <option value="check">Check</option>
                          )}
                          {/* Bet */}
                          {!street.actions?.some(a => a.type === 'bet' || a.type === 'raise' || a.type === 'all-in') && (
                            <option value="bet">
                              {actionType === 'bet' && actionAmount ? `Bet $${actionAmount}` : `Bet (min $${getMinBet(streetName, street, blinds, straddleAmount)})`}
                            </option>
                          )}
                          {/* Raise */}
                          {street.actions?.some(a => a.type === 'bet' || a.type === 'raise' || a.type === 'all-in') && (
                            <option value="raise">
                              {actionType === 'raise' && actionAmount ? `Raise to $${actionAmount}` : `Raise (min $${getMinRaise(street, blinds, straddleAmount)})`}
                            </option>
                          )}
                          {/* Call */}
                          <option value="call" disabled={!street.actions?.some(a => a.type === 'bet' || a.type === 'raise' || a.type === 'all-in') && streetName !== 'Preflop'}>
                            {actionType === 'call' ? `Call $${
                              streetName === 'Preflop' && getCurrentBetToCall(street) === 0
                                ? (straddleAmount > 0 ? straddleAmount : blinds.bb)
                                : getCurrentBetToCall(street)
                            }` : 'Call'}
                          </option>
                          {/* All-in */}
                          <option value="all-in">
                            {`All-in $${selectedPlayer ? calculateEffectiveStack(selectedPlayer, streetName.toLowerCase() as PokerStreet) : '0'}`}
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
                            <option value="all-in">
                              {`All-in $${selectedPlayer ? calculateEffectiveStack(selectedPlayer, streetName.toLowerCase() as PokerStreet) : '0'}`}
                            </option>
                          </>);
                      } else {
                        // Player doesn't need to respond to all-in, hide action selection (already handled by parent conditional)
                        return null; 
                      }
                    }
                  })()}
                </select>
              </div>
            </div>

            {/* Action Amount Input (for Bet/Raise) */}
            {(actionType === 'bet' || actionType === 'raise') && (
              <div className="mt-4">
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
                  ).min}, max $${selectedPlayer ? calculateEffectiveStack(selectedPlayer, streetName.toLowerCase() as PokerStreet) : '0'})`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                />
              </div>
            )}

            {/* Action Button */}
            <div className="mt-4">
              <button
                type="button"
                onClick={handleAddAction}
                disabled={!selectedPlayer || 
                          ((actionType === 'bet' || actionType === 'raise') && !actionAmount) || 
                          (actionType === 'call' && !isValidCallCondition())}
                className={`w-full px-6 py-3 rounded-md text-white font-semibold text-lg transition-colors duration-150 ${
                  !selectedPlayer || 
                  ((actionType === 'bet' || actionType === 'raise') && !actionAmount) ||
                  (actionType === 'call' && !isValidCallCondition()) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {/* Button Text Logic */}
                {
                  actionType === 'bet' || actionType === 'raise' ? 
                    `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} ${actionAmount ? `$${actionAmount}` : ''}` : 
                  actionType === 'call' ? 
                    `Call $${
                      streetName === 'Preflop' && getCurrentBetToCall(street) === 0 
                        ? (straddleAmount > 0 ? straddleAmount : blinds.bb) 
                        : getCurrentBetToCall(street)
                    }` : 
                  actionType === 'all-in' ? 
                    `All-in $${selectedPlayer ? calculateEffectiveStack(selectedPlayer, streetName.toLowerCase() as PokerStreet) : '0'}` : 
                  actionType.charAt(0).toUpperCase() + actionType.slice(1)
                }
              </button>
            </div>
          </>
        </>
      )}
    </div>
  );
}
