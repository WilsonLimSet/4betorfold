import { Action, Player, Street } from '../types/poker';

/**
 * Gets the current bet amount that needs to be called
 */
export function getCurrentBetToCall(street: Street): number {
  if (!street.actions || street.actions.length === 0) {
    return 0;
  }

  // Find the highest bet/raise amount
  let highestBet = 0;
  for (const action of street.actions) {
    if (action.type === 'bet' || action.type === 'raise' || action.type === 'all-in') {
      highestBet = Math.max(highestBet, action.amount || 0);
    }
  }

  return highestBet;
}

/**
 * Gets the minimum bet amount for the current street
 */
export function getMinBet(
  streetName: string,
  street: Street,
  blinds: { sb: number; bb: number },
  straddleAmount: number = 0
): number {
  // For preflop, minimum bet is:
  // - 2x straddle if straddle is active
  // - 2x big blind if no straddle
  if (streetName === 'Preflop') {
    if (straddleAmount > 0) {
      return straddleAmount * 2;  // 2x straddle
    }
    return blinds.bb * 2;  // 2x big blind
  }
  
  // For flop, turn, and river, minimum bet is the big blind size
  return blinds.bb;
}

/**
 * Gets the minimum raise amount based on the current street and previous actions
 */
export function getMinRaise(
  street: Street,
  blinds: { sb: number; bb: number },
  straddleAmount: number = 0
): number {
  // If there are no actions yet, minimum raise is the minimum bet
  if (!street.actions || street.actions.length === 0) {
    return straddleAmount > 0 ? straddleAmount * 2 : blinds.bb * 2;
  }

  // Find the highest bet/raise amount
  let highestBet = 0;
  for (const action of street.actions) {
    if (action.type === 'bet' || action.type === 'raise' || action.type === 'all-in') {
      highestBet = Math.max(highestBet, action.amount || 0);
    }
  }

  // If there's no bet yet, minimum raise is the minimum bet
  if (highestBet === 0) {
    return straddleAmount > 0 ? straddleAmount * 2 : blinds.bb * 2;
  }

  // Minimum raise is double the previous bet
  return highestBet * 2;
}

/**
 * Gets the effective stack for a player (remaining stack after previous actions)
 */
export function getEffectiveStack(playerPosition: string, players: Player[], street: Street | undefined, previousStreet: Street | undefined): number {
  const player = players.find(p => p.position === playerPosition);
  if (!player) return 0; // If player not found, return 0

  let effectiveStack = player.stack; // Start with initial stack

  // Subtract actions from the previous street if it exists
  if (previousStreet?.actions) {
    for (const action of previousStreet.actions) {
      if (action.player === playerPosition && action.amount) {
        effectiveStack -= action.amount;
      }
    }
  }

  // Subtract actions from the current street if it exists
  if (street?.actions) { // Check if street itself is defined
    for (const action of street.actions) {
      if (action.player === playerPosition && action.amount) {
        effectiveStack -= action.amount;
      }
    }
  }

  return Math.max(0, effectiveStack); // Ensure stack doesn't go below zero
}

/**
 * Checks if a player is all-in
 */
export function isPlayerAllIn(
  playerPosition: string,
  street: Street,
  previousStreet?: Street
): boolean {
  // Check if player has an all-in action in the current street
  const currentStreetAllIn = street.actions?.some(
    action => action.player === playerPosition && action.type === 'all-in'
  ) || false;

  // Check if player has an all-in action in the previous street
  const previousStreetAllIn = previousStreet?.actions?.some(
    action => action.player === playerPosition && action.type === 'all-in'
  ) || false;

  return currentStreetAllIn || previousStreetAllIn;
}

/**
 * Gets active players (not folded)
 */
export function getActivePlayers(players: Player[], street: Street, previousStreet?: Street): Player[] {
  return players.filter(player => {
    // Check if player has folded in the current street
    const hasFolded = street.actions?.some(
      action => action.player === player.position && action.type === 'fold'
    );
    
    // Check if player has folded in the previous street
    const hasFoldedPrevious = previousStreet?.actions?.some(
      action => action.player === player.position && action.type === 'fold'
    );
    
    return !hasFolded && !hasFoldedPrevious;
  });
}

/**
 * Gets players who can still act (not folded or all-in)
 */
export function getActingPlayers(players: Player[], street: Street, previousStreet?: Street): Player[] {
  return players.filter(player => {
    // Check if player has folded
    const hasFolded = street.actions?.some(
      action => action.player === player.position && action.type === 'fold'
    ) || previousStreet?.actions?.some(
      action => action.player === player.position && action.type === 'fold'
    );
    
    // Check if player is all-in
    const isAllIn = isPlayerAllIn(player.position, street, previousStreet);
    
    return !hasFolded && !isAllIn;
  });
}

/**
 * Gets the next player to act based on the street and player positions
 */
export function getNextActingPlayer(players: Player[], street: Street): string | null {
  const activePlayers = getActingPlayers(players, street);
  if (activePlayers.length === 0) return null;
  
  // If no actions yet, first player acts
  if (!street.actions || street.actions.length === 0) {
    return activePlayers[0].position;
  }
  
  // Find the last player who acted
  const lastAction = street.actions[street.actions.length - 1];
  const lastPlayerIndex = activePlayers.findIndex(p => p.position === lastAction.player);
  
  // Next player is the one after the last player who acted
  const nextPlayerIndex = (lastPlayerIndex + 1) % activePlayers.length;
  return activePlayers[nextPlayerIndex].position;
}

/**
 * Checks if all players are all-in or have folded
 */
export function isAllPlayersAllIn(
  players: Player[],
  street: Street,
  previousStreet?: Street,
  allPlayersAllIn: boolean = false
): boolean {
  // If already marked as all players all-in, return true
  if (allPlayersAllIn) return true;
  
  // Get active players (not folded)
  const activePlayers = getActivePlayers(players, street, previousStreet);
  
  // If there's only one active player, they're not all-in
  if (activePlayers.length <= 1) return false;
  
  // Check if all active players except one are all-in
  const allInCount = activePlayers.filter(player => 
    isPlayerAllIn(player.position, street, previousStreet)
  ).length;
  
  // All players are all-in if everyone except at most one player is all-in
  return allInCount >= activePlayers.length - 1;
}

/**
 * Checks if the action for the street is complete
 */
export function isActionComplete(players: Player[], street: Street, previousStreet?: Street): boolean {
  // If no actions yet, action is DEFINITELY not complete
  if (!street.actions || street.actions.length === 0) {
    return false;
  }

  // Get players who can still act
  const actingPlayers = getActingPlayers(players, street, previousStreet);
  if (actingPlayers.length === 0) return true;
  
  // Check if there was a bet/raise/all-in in the street
  const hasAggressiveAction = street.actions.some(
    action => action.type === 'bet' || action.type === 'raise' || action.type === 'all-in'
  );

  if (hasAggressiveAction) {
    // Find the index of the last aggressive action
    let lastAggressiveActionIndex = -1;
    for (let i = street.actions.length - 1; i >= 0; i--) {
      const action = street.actions[i];
      if (action.type === 'bet' || action.type === 'raise' || action.type === 'all-in') {
        lastAggressiveActionIndex = i;
        break;
      }
    }

    // Get the last aggressive action
    const lastAggressiveAction = street.actions[lastAggressiveActionIndex];

    // After an aggressive action, each player must either:
    // 1. Act after this aggressive action
    // 2. Have already folded
    // 3. Be the player who made the aggressive action
    
    // Track who has acted after the aggressive action
    const playersWhoActedAfter = new Set<string>();
    
    // Check for actions after the aggressive action
    for (let i = lastAggressiveActionIndex + 1; i < street.actions.length; i++) {
      playersWhoActedAfter.add(street.actions[i].player);
    }
    
    // Check if all active players have either acted after the last aggressive
    // action or are the player who made that aggressive action
    for (const player of actingPlayers) {
      if (player.position === lastAggressiveAction.player) {
        // Player who made the aggressive action - no need to act again
        continue;
      }
      
      if (!playersWhoActedAfter.has(player.position)) {
        // Found a player who needs to act
        return false;
      }
    }
    
    // All players have acted appropriately after the last aggressive action
    return true;
  }

  // If no aggressive actions, check if all players have acted
  const playersWhoHaveActed = new Set(street.actions.map(action => action.player));
  return actingPlayers.every(player => playersWhoHaveActed.has(player.position));
}

/**
 * Get the highest contribution from each player in a street's actions
 */
export function getPlayerContributions(actions: Action[] = []): Map<string, number> {
  const playerContributions = new Map<string, number>();
  
  for (const action of actions) {
    if (action.type === 'fold' || action.amount === undefined) continue;
    
    // Only count the amount if it's higher than what we've seen for this player
    const currentContribution = playerContributions.get(action.player) || 0;
    if (action.amount > currentContribution) {
      playerContributions.set(action.player, action.amount);
    }
  }
  
  return playerContributions;
}

/**
 * Calculates the total pot size including previous streets
 */
export function calculateTotalPot(
  streetName: string,
  street: Street,
  previousStreet?: Street,
  blinds: { sb: number; bb: number } = { sb: 1, bb: 2 },
  straddleAmount: number = 0
): number {
  let totalPot = 0;
  
  // Add blinds and straddle to the pot
  totalPot += blinds.sb + blinds.bb;
  if (straddleAmount > 0) {
    totalPot += straddleAmount;
  }
  
  // For preflop, just return blinds + straddle + preflop actions
  if (streetName === 'Preflop') {
    // Get highest contributions from each player
    const playerContributions = getPlayerContributions(street.actions);
    
    // Add all contributions
    for (const amount of playerContributions.values()) {
      totalPot += amount;
    }
    
    return totalPot;
  }
  
  // For postflop streets, we need to handle a bit differently since we only get the previous street
  // For flop, previousStreet will be preflop
  // For turn, previousStreet will be flop, so we need to get preflop from HandHistory component
  // For river, previousStreet will be turn, we need both flop and preflop from HandHistory
  
  // Add actions from preflop (which might be previousStreet for flop)
  if (previousStreet?.actions && streetName === 'Flop') {
    const prevContributions = getPlayerContributions(previousStreet.actions);
    for (const amount of prevContributions.values()) {
      totalPot += amount;
    }
  }
  
  // For Turn and River, previousStreet will be the immediate previous street
  // The component that calls this function needs to track all bets from earlier streets
  if (streetName === 'Turn' || streetName === 'River') {
    // We trust that the component calling this will pass the pot from previous streets
    // or it will call this function for each street and sum up the results
    
    // Add actions from previous street (flop for turn, turn for river)
    if (previousStreet?.actions) {
      const prevContributions = getPlayerContributions(previousStreet.actions);
      for (const amount of prevContributions.values()) {
        totalPot += amount;
      }
    }
  }
  
  // Add actions from current street
  if (street.actions) {
    const currentContributions = getPlayerContributions(street.actions);
    for (const amount of currentContributions.values()) {
      totalPot += amount;
    }
  }
  
  return totalPot;
}

/**
 * Gets the minimum and maximum allowed bet amounts
 */
export function getBetLimits(
  actionType: string,
  playerPosition: string,
  players: Player[],
  street: Street,
  streetName: string,
  previousStreet: Street | undefined,
  blinds: { sb: number; bb: number },
  straddleAmount: number = 0
): { min: number; max: number } {
  const effectiveStack = getEffectiveStack(playerPosition, players, street, previousStreet);
  
  // For call, min and max are the same (current bet to call)
  if (actionType === 'call') {
    const currentBet = getCurrentBetToCall(street);
    return { min: currentBet, max: currentBet };
  }

  // For bet/raise, min is the minimum bet and max is the effective stack
  const minBet = getMinBet(streetName, street, blinds, straddleAmount);
  return { min: minBet, max: effectiveStack };
}

/**
 * Checks if a player is facing an all-in
 */
export function isFacingAllIn(
  playerPosition: string,
  players: Player[],
  street: Street,
  previousStreet?: Street
): boolean {
  const player = players.find(p => p.position === playerPosition);
  if (!player) return false;
  
  // Check if there's an all-in action
  const hasAllIn = street.actions?.some(action => action.type === 'all-in') || 
                  previousStreet?.actions?.some(action => action.type === 'all-in');
  
  if (!hasAllIn) return false;
  
  // Get the effective stack of the player
  const effectiveStack = getEffectiveStack(player.position, players, street, previousStreet);
  
  // Get the current bet to call
  const currentBet = getCurrentBetToCall(street);
  
  // If the effective stack is less than or equal to the current bet, player is facing all-in
  return effectiveStack <= currentBet;
}

export function isPositionToAct(position: string, street: Street, activePlayers: string[]): boolean {
  if (!street.actions || street.actions.length === 0) {
    // If no actions yet, the first active player is to act
    return position === activePlayers[0];
  }

  // Find the index of the last player who acted
  const lastAction = street.actions[street.actions.length - 1];
  const lastPlayerIndex = activePlayers.indexOf(lastAction.player);
  
  // The next player in the active players array is to act
  const nextPlayerIndex = (lastPlayerIndex + 1) % activePlayers.length;
  
  return position === activePlayers[nextPlayerIndex];
}

export function isStreetComplete(street: Street, activePlayers: string[]): boolean {
  if (!street.actions || street.actions.length === 0) {
    return false;
  }

  // Check if all active players have acted at least once
  const playersWhoActed = new Set(street.actions.map(action => action.player));
  if (playersWhoActed.size < activePlayers.length) {
    return false;
  }

  // Find the last aggressive action (bet, raise, all-in)
  let lastAggressiveActionIndex = -1;
  for (let i = street.actions.length - 1; i >= 0; i--) {
    const action = street.actions[i];
    if (action.type === 'bet' || action.type === 'raise' || action.type === 'all-in') {
      lastAggressiveActionIndex = i;
      break;
    }
  }

  // If no aggressive action, check if everyone has checked
  if (lastAggressiveActionIndex === -1) {
    return street.actions.length === activePlayers.length && 
           street.actions.every(action => action.type === 'check');
  }

  // Check if all active players have acted after the last aggressive action
  // const lastAggressor = street.actions[lastAggressiveActionIndex].player; // Removed unused variable
  // const aggressorIndex = activePlayers.indexOf(lastAggressor);
  
  // Count how many players need to act after the aggressor
  const playersNeededToAct = activePlayers.length - 1;
  
  // Count how many active players have acted after the last aggressive action
  const playersActedAfterAggression = new Set(
    street.actions
      .slice(lastAggressiveActionIndex + 1)
      .map(action => action.player)
  ).size;
  
  return playersActedAfterAggression === playersNeededToAct;
}

export function shouldHideActionUI(
  selectedPosition: string,
  street: Street,
  previousStreet: Street | undefined,
  activePlayers: string[]
): boolean {
  // If there's no selected position, hide UI
  if (!selectedPosition) {
    return true;
  }

  // If street is complete, hide UI
  if (isStreetComplete(street, activePlayers)) {
    return true;
  }

  // Check if there are any all-in actions in this street
  const hasAllIn = street.actions?.some(action => action.type === 'all-in');

  if (hasAllIn) {
    // Find the last all-in action
    let lastAllInIndex = -1;
    if (street.actions) {
      for (let i = street.actions.length - 1; i >= 0; i--) {
        if (street.actions[i].type === 'all-in') {
          lastAllInIndex = i;
          break;
        }
      }
    }

    if (lastAllInIndex !== -1 && street.actions) {
      const allInPlayer = street.actions[lastAllInIndex].player;
      
      // If selected player is the one who went all-in, hide UI
      if (selectedPosition === allInPlayer) {
        return true;
      }
      
      // Check if this player has already acted after the all-in
      const hasActedAfterAllIn = street.actions
        .slice(lastAllInIndex + 1)
        .some(action => action.player === selectedPosition);
      
      // If player has already acted after all-in, hide UI
      if (hasActedAfterAllIn) {
        return true;
      }
      
      // Otherwise, player needs to respond to all-in, show UI
      return false;
    }
  }

  // Check if the selected position is next to act
  return !isPositionToAct(selectedPosition, street, activePlayers);
} 