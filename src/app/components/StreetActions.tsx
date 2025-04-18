'use client';

import { useState, useEffect } from 'react';
import { Street, Card, Player, Action, ActionType, PokerStreet, Position } from '../types/poker';
import CardSelector from './CardSelector';
import PokerGameState from '@/app/utils/pokerGameState';

interface StreetActionsProps {
  streetName: 'Preflop' | 'Flop' | 'Turn' | 'River';
  players: Player[];
  street: Street;
  gameState: PokerGameState;
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
  gameState,
  onUpdate, 
  previousStreet, 
  usedCards = [], 
  allPlayersAllIn = false,
  previousCards = {},
  straddleAmount = 0,
  blinds = { sb: 1, bb: 2 },
  actionsDisabledDueToAllIn = false,
  calculateEffectiveStack
}: StreetActionsProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [boardCards, setBoardCards] = useState<(Card | null)[]>(() => {
    // Initialize board cards based on street
    if (streetName === 'Flop') {
      return street.board ? [...street.board, null, null] : [null, null, null];
    } else if (streetName === 'Turn') {
      return street.board ? [street.board[0]] : [null];
    } else if (streetName === 'River') {
      return street.board ? [street.board[0]] : [null];
    }
    return [];
  });
  const [actionType, setActionType] = useState<ActionType>('bet');
  const [actionAmount, setActionAmount] = useState<string>('');
  const [isStreetComplete, setIsStreetComplete] = useState(false);
  
  // Convert streetName to the format used in PokerGameState
  const currentPokerStreet = streetName.toLowerCase() as PokerStreet;
  
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
  
  // Update street completion status when actions or gameState changes
  useEffect(() => {
    // Use the centralized game state logic to determine completion
    const complete = gameState.isStreetComplete(currentPokerStreet);
    setIsStreetComplete(complete);
  }, [gameState, currentPokerStreet, street.actions]); // Depend on gameState, currentPokerStreet, and actions
  
  // Auto-select next player to act
  useEffect(() => {
    // Skip if street is already complete
    if (isStreetComplete) return;
    
    // Get acting players - who still need to make decisions
    const actingPlayers = gameState.getActingPlayers(currentPokerStreet);
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
          // Set the default action type to All-in when responding to all-in
          setActionType('all-in');
          // Set the amount to the player's effective stack
          const effectiveStack = calculateEffectiveStack(nextPlayer, streetName.toLowerCase() as PokerStreet);
          setActionAmount(effectiveStack.toString());
          return;
        }
      }
    }
    
    // Normal next player logic...
    const nextPlayer = gameState.getNextActingPlayer(currentPokerStreet);
    if (nextPlayer) {
      setSelectedPlayer(nextPlayer);
      
      // Reset action type based on street and previous action
      if (street.actions && street.actions.length > 0) {
        const lastAction = street.actions[street.actions.length - 1];
        if (lastAction.type === 'bet' || lastAction.type === 'raise' || lastAction.type === 'all-in') {
          // Force update the action amount for calls
          const currentBet = gameState.getCurrentBetToCall(currentPokerStreet);
          setActionAmount(currentBet.toString());
          // Clear any previous errors
          // setError(''); // Removed setError call
        } else if (lastAction.type === 'check' || lastAction.type === 'call') {
          // Default to minimum bet on turn and later streets, call on preflop
          if (streetName === 'Preflop') {
            const currentBet = gameState.getCurrentBetToCall(currentPokerStreet);
            setActionAmount(currentBet.toString());
          } else {
            const minBet = gameState.getMinBet(currentPokerStreet);
            setActionAmount(minBet.toString());
          }
        } else {
          // Default to minimum bet on turn and later streets, call on preflop
          if (streetName === 'Preflop') {
            const currentBet = gameState.getCurrentBetToCall(currentPokerStreet);
            setActionAmount(currentBet.toString());
          } else {
            const minBet = gameState.getMinBet(currentPokerStreet);
            setActionAmount(minBet.toString());
          }
        }
      } else {
        // First action
        if (streetName === 'Preflop') {
          // In preflop, default to minimum bet
          const minBet = gameState.getMinBet(currentPokerStreet);
          setActionAmount(minBet.toString());
          
          // If there's a straddle, also show the option to call the straddle
          if (straddleAmount > 0) {
            // Add an option to call the straddle
          } else {
            // If no straddle, show option to call the big blind
          }
        } else {
          // On turn and later streets, default to minimum bet
          const minBet = gameState.getMinBet(currentPokerStreet);
          setActionAmount(minBet.toString());
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
      JSON.stringify(street.actions), // Stringify complex object
      JSON.stringify(players), // Stringify complex object
      JSON.stringify(previousStreet?.actions), // Stringify complex object (optional chaining handles undefined)
      streetName, 
      isStreetComplete, 
      blinds, 
      straddleAmount
     ]);
  
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
    const { min, max } = gameState.getBetLimits(
      actionType as ActionType,
      selectedPlayer,
      currentPokerStreet
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

  // Helper to adjust effective stack for players who've already acted in this street
  const getAdjustedEffectiveStack = (playerPosition: string): number => {
    const effectiveStack = calculateEffectiveStack(playerPosition, currentPokerStreet);
    
    // Find if the player has already acted in this street
    let previousActionAmount = 0;
    if (street.actions) {
      // Look for the player's most recent action in this street
      for (let i = street.actions.length - 1; i >= 0; i--) {
        const action = street.actions[i];
        if (action.player === playerPosition && action.amount !== undefined && 
            (action.type === 'bet' || action.type === 'raise' || action.type === 'call')) {
          previousActionAmount = action.amount;
          break;
        }
      }
    }
    
    // If the player has already acted, we need to subtract their previous bet from the all-in amount
    return previousActionAmount > 0 ? effectiveStack + previousActionAmount : effectiveStack;
  };

  // Update the handleAddAction function to use the adjusted effective stack
  const handleAddAction = () => {
    if (!selectedPlayer) return;

    // Validate amount for bet/raise actions
    if ((actionType === 'bet' || actionType === 'raise') && !actionAmount) {
      // setError('Please enter an amount'); // Removed setError call
      return;
    }
    
    // Get the player's adjusted effective stack
    const effectiveStack = getAdjustedEffectiveStack(selectedPlayer);
    let finalAmount = 0;
    const finalActionType = actionType;
    let isActuallyAllIn = false; // Track if this is effectively an all-in

    // Handle different action types
    switch (actionType) {
      case 'call':
        const currentBet = gameState.getCurrentBetToCall(currentPokerStreet);
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

        // Calculate min bet amount
        const minAmount = actionType === 'bet' 
          ? gameState.getMinBet(currentPokerStreet)
          : gameState.getMinRaise(currentPokerStreet);
          
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
      const playersToAct = gameState.getActingPlayers(currentPokerStreet);
      
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
        const nextPlayer = gameState.getNextActingPlayer(currentPokerStreet);
        if (nextPlayer) {
          setSelectedPlayer(nextPlayer);
          
          // Determine appropriate action type based on previous action
          if (newAction.type === 'bet' || newAction.type === 'raise') {
            setActionType('call');
            setActionAmount(newAction.amount?.toString() || '');
          } else {
            if (streetName === 'Preflop') {
              setActionType('call');
              const currentBet = gameState.getCurrentBetToCall(currentPokerStreet);
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

  // Use gameState methods directly
  const needsToRespondToAllIn = (playerPosition: string): boolean => {
    return gameState.needsToRespondToAllIn(
      playerPosition, 
      streetName.toLowerCase() as PokerStreet
    );
  };
  
  const calculateCurrentPot = () => {
    return gameState.calculateDisplayPot(streetName.toLowerCase() as PokerStreet);
  };

  // Helper function to check if any player needs to respond to an all-in
  const playersNeedToRespondToAllIn = (): boolean => {
    return gameState.playersNeedToRespondToAllIn(streetName.toLowerCase() as PokerStreet);
  };

  // Get the list of players who need to respond to an all-in
  const getPlayersWhoNeedToRespondToAllIn = (): Player[] => {
    return gameState.getPlayersWhoNeedToRespondToAllIn(streetName.toLowerCase() as PokerStreet);
  };

  // Show straddle in the UI if present
  const getPrePotInfo = () => {
    let result = '';
    if (straddleAmount > 0) {
      result = `Small Blind: $${blinds.sb}, Big Blind: $${blinds.bb}, Straddle: $${straddleAmount}`;
    }
    return result;
  };

  // Check if all players were all-in on previous street using gameState
  const isPreviousStreetAllIn = previousStreet && 
    (allPlayersAllIn || 
    (previousStreet.actions && gameState.isAllPlayersAllIn(streetName.toLowerCase() === 'flop' ? 'preflop' : 
                                                          streetName.toLowerCase() === 'turn' ? 'flop' : 
                                                          streetName.toLowerCase() === 'river' ? 'turn' : 'preflop')));
  
  // Hide action UI on postflop streets if all players were all-in on previous street
  // BUT keep UI visible if there are players who need to respond to an all-in on current street
  const shouldHideActionUI = streetName !== 'Preflop' && 
                           isPreviousStreetAllIn && 
                           street.actions && street.actions.length === 0 && // Only hide if no actions have been taken yet
                           !playersNeedToRespondToAllIn(); // Don't hide if players need to respond to all-in

  // Force BB to be selectable when BTN is all-in during preflop
  useEffect(() => {
    if (streetName === 'Preflop' && 
        street.actions?.some(a => a.player === 'BTN' && a.type === 'all-in') &&
        !street.actions?.some(a => a.player === 'BB')) {
      
      // Check if BB is in players list and hasn't folded
      const bbPlayer = players.find(p => p.position === 'BB');
      if (bbPlayer && !gameState.isPlayerAllIn('BB', currentPokerStreet)) {
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
    const previousStreet_pokerStreet = streetName.toLowerCase() === 'flop' ? 'preflop' : 
                                      streetName.toLowerCase() === 'turn' ? 'flop' : 
                                      streetName.toLowerCase() === 'river' ? 'turn' : 'preflop';
    const activePreviousPlayers = gameState.getActivePlayers(previousStreet_pokerStreet);
    
    // Check if all active players are all-in
    const allActivePlayersAllIn = activePreviousPlayers.every(p => 
      gameState.isPlayerAllIn(p.position, previousStreet_pokerStreet)
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

  // Fix the getPlayersInActionOrder function
  const getPlayersInActionOrder = (): Player[] => {
    // Filter out players already folded or all-in
    const activePlayers = gameState.getActivePlayers(currentPokerStreet);
    
    // Special case: If a player goes all-in, other players need to respond
    const hasAllIn = street.actions?.some(action => action.type === 'all-in');
    
    if (hasAllIn) {
      // Find players who need to respond to all-in
      return activePlayers.filter(player => {
        // Skip players who are already all-in
        if (street.actions?.some(
          action => action.player === player.position && action.type === 'all-in'
        )) {
          return false;
        }
        
        // Skip players who have already acted after the last all-in
        const lastAllInIndex = [...(street.actions || [])].reverse().findIndex(
          action => action.type === 'all-in'
        );
        
        if (lastAllInIndex !== -1) {
          const realIndex = street.actions!.length - 1 - lastAllInIndex;
          const hasActedAfterAllIn = street.actions!.slice(realIndex + 1).some(
            action => action.player === player.position
          );
          
          return !hasActedAfterAllIn;
        }
        
        return true;
      }).sort((a, b) => {
        // Sort by position order appropriate for the street
        const positionOrder = streetName === 'Preflop' 
          ? ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'] 
          : ['SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN'];
        
        return positionOrder.indexOf(a.position as Position) - 
               positionOrder.indexOf(b.position as Position);
      });
    }
    
    // Standard sorting for non-all-in cases
    return activePlayers.sort((a, b) => {
      // Sort by position order appropriate for the street
      const positionOrder = streetName === 'Preflop' 
        ? ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'] 
        : ['SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN'];
      
      return positionOrder.indexOf(a.position as Position) - 
             positionOrder.indexOf(b.position as Position);
    });
  };

  // Now fix the stack display in the player selection dropdown to show effective remaining stack
  // This calculates the actual stack size after previous actions
  const getEffectiveRemainingStack = (playerPosition: string): number => {
    return gameState.getEffectiveStack(playerPosition, currentPokerStreet);
  };

  // If all players are all-in, show a clear message and disable action entry
  if (actionsDisabledDueToAllIn) {
    return (
      <div className="w-full space-y-4 pt-4 pb-4 border-t border-gray-200 rounded-b-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold" style={{ color: 'rgb(31, 41, 55)' }}>
            {streetName}
          </h3>
          <span className="text-base font-medium text-gray-900">
            Pot entering street: ${calculateCurrentPot()}
          </span>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg">
          <p className="font-medium">All players were all-in on a previous street.</p>
          {streetName !== 'Preflop' && (
            <p className="mt-2">Add board cards for this street.</p>
          )}
        </div>
        
        {/* Still show the card selector for board cards */}
        {streetName !== 'Preflop' && (
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {streetName} Cards ({streetName === 'Flop' ? '3 cards' : '1 card'})
            </h4>
            <CardSelector
              selectedCards={street.board || []}
              maxCards={streetName === 'Flop' ? 3 : 1}
              onCardSelect={handleBoardCards}
              usedCards={usedCards}
            />
          </div>
        )}
        
        {/* Previous cards display */}
        {(streetName === 'Turn' || streetName === 'River') && (
          <div className="mt-4">
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {streetName === 'Turn' ? 'Flop:' : 'Flop + Turn:'}
            </h4>
            <div className="flex gap-2">
              {streetName === 'Turn' && previousCards.flop && previousCards.flop.map((card, idx) => (
                <div key={`flop-${idx}`} className="w-12 h-16 sm:w-16 sm:h-20 flex items-center justify-center rounded-lg border text-xl sm:text-2xl font-medium bg-white border-gray-200">
                  <span style={{ color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'rgb(220, 38, 38)' : 'rgb(17, 24, 39)' }}>
                    {card.rank}
                    {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                  </span>
                </div>
              ))}
              
              {streetName === 'River' && (
                <>
                  {previousCards.flop && previousCards.flop.map((card, idx) => (
                    <div key={`flop-${idx}`} className="w-12 h-16 sm:w-16 sm:h-20 flex items-center justify-center rounded-lg border text-xl sm:text-2xl font-medium bg-white border-gray-200">
                      <span style={{ color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'rgb(220, 38, 38)' : 'rgb(17, 24, 39)' }}>
                        {card.rank}
                        {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                      </span>
                    </div>
                  ))}
                  {previousCards.turn && previousCards.turn.map((card, idx) => (
                    <div key={`turn-${idx}`} className="w-12 h-16 sm:w-16 sm:h-20 flex items-center justify-center rounded-lg border text-xl sm:text-2xl font-medium bg-white border-gray-200">
                      <span style={{ color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'rgb(220, 38, 38)' : 'rgb(17, 24, 39)' }}>
                        {card.rank}
                        {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 1. First, let's define the missing removeAction function (add around line 400)
  const removeAction = (index: number) => {
    const newActions = [...(street.actions || [])];
    newActions.splice(index, 1);
    onUpdate({
      ...street,
      actions: newActions.length > 0 ? newActions : []
    });
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
              {gameState.getActingPlayers(streetName.toLowerCase() as PokerStreet).length === 0 && gameState.getActivePlayers(streetName.toLowerCase() as PokerStreet).some(p => gameState.isPlayerAllIn(p.position, streetName.toLowerCase() as PokerStreet)) ? 'All-in' : 'Complete'}
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
        {streetName !== 'Preflop' && (
          <span className="text-base font-medium text-gray-900">
            Pot entering street: ${calculateCurrentPot()}
          </span>
        )}
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
      {(isStreetComplete && street.actions && street.actions.length > 0) && !shouldHideActionUI && !playersNeedingToRespond && (
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <div className="space-y-2">
            {street.actions?.map((action, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                {/* Improve font readability */}
                <div className="text-base font-medium text-gray-900"> 
                  {action.player} - {action.type.charAt(0).toUpperCase() + action.type.slice(1)}
                  {action.amount ? ` $${action.amount}` : ''}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => removeAction(index)}
                    className="text-red-500 hover:text-red-700"
                    aria-label="Remove action"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
                      <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          {streetName !== 'Preflop' && street.board && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              {/* Improve font readability */}
              <div className="text-base font-semibold text-gray-900">Board:</div>
              <div className="flex gap-2 mt-1">
                {street.board.map((card, index) => (
                  <span key={index} 
                        className={`text-lg font-medium ${ // Added font-medium
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

      {/* Action UI */}
      {!actionsDisabledDueToAllIn && (
        !isStreetComplete || 
        playersNeedingToRespond || 
        !street.actions || 
        street.actions.length === 0
      ) && (
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
                  {getPlayersInActionOrder()
                    .filter(player => {
                      // If responding to all-in, allow players to act
                      if (playersNeedingToRespond && needsToRespondToAllIn(player.position)) {
                        return true;
                      }
                      
                      // Exclude folded players
                      if (street.actions?.some(a => a.player === player.position && a.type === 'fold')) {
                        return false;
                      }
                      
                      // Exclude all-in players 
                      if (street.actions?.some(a => a.player === player.position && a.type === 'all-in')) {
                        return false;
                      }
                      
                      // For betting rounds logic, keep existing code...
                      // ...
                      
                      return true;
                    })
                    .map(player => (
                      <option 
                        key={player.position} 
                        value={player.position}
                        className="text-base"
                      >
                        {player.position} - ${getEffectiveRemainingStack(player.position)} 
                        {player.isHero ? ' (Hero)' : ''}
                      </option>
                    ))}
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
                      const adjustedEffectiveStack = getAdjustedEffectiveStack(selectedPlayer);
                      setActionAmount(adjustedEffectiveStack.toString());
                    }
                     // If selecting check or fold, clear the amount
                    else if (newActionType === 'check' || newActionType === 'fold') {
                      setActionAmount('');
                    }
                     // If selecting call, set the correct call amount
                    else if (newActionType === 'call') {
                       let callAmount = gameState.getCurrentBetToCall(currentPokerStreet);
                       if (streetName === 'Preflop' && callAmount === 0) {
                         callAmount = straddleAmount > 0 ? straddleAmount : blinds.bb;
                       }
                       setActionAmount(callAmount.toString());
                    } 
                    // NEW: If selecting raise, set the minimum raise amount
                    else if (newActionType === 'raise') {
                      const minRaiseAmount = gameState.getMinRaise(currentPokerStreet);
                      setActionAmount(minRaiseAmount.toString());
                    }
                    // NEW: If selecting bet, set the minimum bet amount
                    else if (newActionType === 'bet') {
                      const minBetAmount = gameState.getMinBet(currentPokerStreet);
                      setActionAmount(minBetAmount.toString());
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base text-gray-900"
                  disabled={isStreetComplete} 
                >
                  {/* Simplified options for facing all-in situation */}
                  {selectedPlayer && street.actions?.some(a => a.type === 'all-in') ? (
                    <>
                      <option value="fold">Fold</option>
                      <option value="all-in">All-in ${getAdjustedEffectiveStack(selectedPlayer)}</option>
                    </>
                  ) : (
                    <>
                      {/* Default options for normal situations */}
                      <option value="fold">Fold</option>
                      
                      {/* Check - only available in specific situations */}
                      {(streetName !== 'Preflop' || 
                        (streetName === 'Preflop' && 
                          (selectedPlayer === 'BB' || 
                          (straddleAmount > 0 && selectedPlayer === 'BTN')))
                      ) && !street.actions?.some(a => a.type === 'bet' || a.type === 'raise' || a.type === 'all-in') && (
                        <option value="check">Check</option>
                      )}
                      
                      {/* Call - available when there's a bet/raise to call */}
                      {(street.actions?.some(a => a.type === 'bet' || a.type === 'raise' || a.type === 'all-in') || streetName === 'Preflop') && (
                        <option value="call">
                          Call ${
                            streetName === 'Preflop' && gameState.getCurrentBetToCall(currentPokerStreet) === 0
                              ? (straddleAmount > 0 ? straddleAmount : blinds.bb)
                              : gameState.getCurrentBetToCall(currentPokerStreet)
                          }
                        </option>
                      )}
                      
                      {/* Bet - only available when no one has bet yet */}
                      {!street.actions?.some(a => a.type === 'bet' || a.type === 'raise' || a.type === 'all-in') && (
                        <option value="bet">
                          Bet ${gameState.getMinBet(currentPokerStreet)}
                        </option>
                      )}
                      
                      {/* Raise - only available when someone has already bet */}
                      {street.actions?.some(a => a.type === 'bet' || a.type === 'raise') && (
                        <option value="raise">
                          Raise to ${gameState.getMinRaise(currentPokerStreet)}
                        </option>
                      )}
                      
                      {/* All-in - always available */}
                      {selectedPlayer && (
                        <option value="all-in">
                          All-in ${getAdjustedEffectiveStack(selectedPlayer)}
                        </option>
                      )}
                    </>
                  )}
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
                  placeholder={`Enter amount (min $${gameState.getBetLimits(
                    actionType as ActionType,
                    selectedPlayer,
                    currentPokerStreet
                  ).min}, max $${selectedPlayer ? getAdjustedEffectiveStack(selectedPlayer) : '0'})`}
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
                      streetName === 'Preflop' && gameState.getCurrentBetToCall(currentPokerStreet) === 0 
                        ? (straddleAmount > 0 ? straddleAmount : blinds.bb) 
                        : gameState.getCurrentBetToCall(currentPokerStreet)
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
