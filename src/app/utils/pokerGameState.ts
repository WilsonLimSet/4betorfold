import { Action, Player, Street, Position, PokerStreet, ActionType, Card } from '../types/poker';

/**
 * PokerGameState class manages the state of a poker hand
 * This centralizes all game logic and provides a clean API for components
 */
export class PokerGameState {
  private players: Player[];
  private streets: Record<PokerStreet, Street>;
  private blinds: { sb: number; bb: number };
  private straddleAmount: number;

  private static readonly VALID_POSITIONS: readonly Position[] = [
    'BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO'
  ] as const;

  constructor(
    players: Player[], 
    blinds: { sb: number; bb: number } = { sb: 1, bb: 2 },
    straddleAmount: number = 0
  ) {
    this.players = players;
    this.blinds = blinds;
    this.straddleAmount = straddleAmount;
    this.streets = {
      preflop: { actions: [] },
      flop: { actions: [] },
      turn: { actions: [] },
      river: { actions: [] }
    };
  }

  /**
   * Get the current state of a street
   */
  getStreet(streetName: PokerStreet): Street {
    return this.streets[streetName];
  }

  /**
   * Update a street with new actions or board cards
   */
  updateStreet(streetName: PokerStreet, street: Street): void {
    this.streets[streetName] = street;
  }

  /**
   * Add an action to a street
   */
  addAction(streetName: PokerStreet, action: Action): void {
    const street = this.getStreet(streetName);
    street.actions = [...(street.actions || []), action];
    this.updateStreet(streetName, street);
  }

  /**
   * Remove an action from a street
   */
  removeAction(streetName: PokerStreet, actionIndex: number): void {
    const street = this.getStreet(streetName);
    const newActions = [...(street.actions || [])];
    newActions.splice(actionIndex, 1);
    street.actions = newActions;
    this.updateStreet(streetName, street);
  }

  /**
   * Update board cards for a street
   */
  updateBoard(streetName: PokerStreet, board: Card[]): void {
    const street = this.getStreet(streetName);
    street.board = board;
    this.updateStreet(streetName, street);
  }

  /**
   * Get the current bet amount that needs to be called
   */
  getCurrentBetToCall(streetName: PokerStreet): number {
    const street = this.getStreet(streetName);
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
   * Get the minimum bet amount for the current street
   */
  getMinBet(streetName: PokerStreet): number {
    // For preflop, minimum bet is:
    // - 2x straddle if straddle is active
    // - 2x big blind if no straddle
    if (streetName === 'preflop') {
      if (this.straddleAmount > 0) {
        return this.straddleAmount * 2;  // 2x straddle
      }
      return this.blinds.bb * 2;  // 2x big blind
    }
    
    // For flop, turn, and river, minimum bet is the big blind size
    return this.blinds.bb;
  }

  /**
   * Get the minimum raise amount based on the current street and previous actions
   */
  getMinRaise(streetName: PokerStreet): number {
    const street = this.getStreet(streetName);
    
    // If there are no actions yet, minimum raise is the minimum bet
    if (!street.actions || street.actions.length === 0) {
      return this.straddleAmount > 0 ? this.straddleAmount * 2 : this.blinds.bb * 2;
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
      return this.straddleAmount > 0 ? this.straddleAmount * 2 : this.blinds.bb * 2;
    }

    // Minimum raise is double the previous bet
    return highestBet * 2;
  }

  /**
   * Get the effective stack for a player (remaining stack after previous actions)
   */
  getEffectiveStack(playerPosition: string, streetName: PokerStreet): number {
    const player = this.players.find(p => p.position === playerPosition);
    if (!player) return 0;

    let effectiveStack = player.stack;

    // Subtract all previous actions from all streets
    for (const [name, street] of Object.entries(this.streets)) {
      // Skip streets after the current one
      if (this.getStreetOrder(name as PokerStreet) > this.getStreetOrder(streetName)) {
        continue;
      }
      
      if (street.actions) {
        for (const action of street.actions) {
          if (action.player === player.position) {
            effectiveStack -= action.amount || 0;
          }
        }
      }
    }

    return effectiveStack;
  }

  /**
   * Get the street order (0 for preflop, 1 for flop, etc.)
   */
  private getStreetOrder(streetName: PokerStreet): number {
    const order: Record<PokerStreet, number> = {
      preflop: 0,
      flop: 1,
      turn: 2,
      river: 3
    };
    return order[streetName];
  }

  /**
   * Get the previous street name
   */
  getPreviousStreet(streetName: PokerStreet): PokerStreet | null {
    const order = this.getStreetOrder(streetName);
    if (order === 0) return null;
    
    const streets: PokerStreet[] = ['preflop', 'flop', 'turn', 'river'];
    return streets[order - 1];
  }

  /**
   * Check if a player is all-in
   */
  isPlayerAllIn(playerPosition: string, streetName: PokerStreet): boolean {
    const street = this.getStreet(streetName);
    const previousStreetName = this.getPreviousStreet(streetName);
    const previousStreet = previousStreetName ? this.getStreet(previousStreetName) : undefined;
    
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
   * Helper method to check if a player has folded
   */
  private hasPlayerFolded(playerPosition: string, streetName: PokerStreet): boolean {
    const street = this.getStreet(streetName);
    const previousStreet = this.getPreviousStreet(streetName);
    
    return (
      (street.actions?.some(a => a.player === playerPosition && a.type === 'fold')) ||
      ((previousStreet && this.getStreet(previousStreet).actions?.some(
        a => a.player === playerPosition && a.type === 'fold'
      )) ?? false)
    );
  }

  /**
   * Helper method to find the last all-in action in a street
   */
  private getLastAllInAction(street: Street): { action: Action; index: number } | null {
    if (!street.actions) return null;
    
    for (let i = street.actions.length - 1; i >= 0; i--) {
      if (street.actions[i].type === 'all-in') {
        return { action: street.actions[i], index: i };
      }
    }
    return null;
  }

  /**
   * Helper method to check if a player has acted after a certain action index
   */
  private hasPlayerActedAfterIndex(playerPosition: string, street: Street, index: number): boolean {
    return street.actions
      ?.slice(index + 1)
      .some(action => action.player === playerPosition) ?? false;
  }

  /**
   * Helper method to validate if a position is valid
   */
  private isValidPosition(position: string): position is Position {
    return PokerGameState.VALID_POSITIONS.includes(position as Position);
  }

  /**
   * Get active players who haven't folded or gone all-in
   */
  getActivePlayers(streetName: PokerStreet): Player[] {
    
    
    return this.players.filter(player => {
      // Check if player has folded
      if (this.hasPlayerFolded(player.position, streetName)) {
        return false;
      }
      
      // Check if player is all-in
      if (this.isPlayerAllIn(player.position, streetName)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Get players who still need to act
   */
  getActingPlayers(streetName: PokerStreet): Player[] {
    const street = this.getStreet(streetName);
    
    return this.players.filter(player => {
      // Skip players who have folded
      if (this.hasPlayerFolded(player.position, streetName)) {
        return false;
      }
      
      // Skip players who are all-in
      if (this.isPlayerAllIn(player.position, streetName)) {
        return false;
      }
      
      // Skip players who have already acted in this street
      if (street.actions?.some(a => a.player === player.position)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Check if a player needs to respond to an all-in
   */
  needsToRespondToAllIn(playerPosition: string, streetName: PokerStreet): boolean {
    const street = this.getStreet(streetName);
    
    // No response needed if there are no all-in actions in the current street
    if (!street.actions || !street.actions.some(a => a.type === 'all-in')) {
      return false;
    }
    
    // Find the last all-in action
    const lastAllIn = this.getLastAllInAction(street);
    if (!lastAllIn) return false;
    
    const lastAllInPlayer = lastAllIn.action.player;
    
    // Skip the player who went all-in
    if (playerPosition === lastAllInPlayer) return false;
    
    // Skip players who are already all-in
    if (this.isPlayerAllIn(playerPosition, streetName)) return false;
    
    // Skip players who have folded
    if (this.hasPlayerFolded(playerPosition, streetName)) return false;
    
    // Check if this player has acted after the all-in
    return !this.hasPlayerActedAfterIndex(playerPosition, street, lastAllIn.index);
  }

  /**
   * Check if the action UI should be hidden for a player
   */
  shouldHideActionUI(playerPosition: string, streetName: PokerStreet): boolean {
    // If there's no selected position, hide UI
    if (!playerPosition) {
      return true;
    }

    // If street is complete, hide UI
    if (this.isStreetComplete(streetName)) {
      return true;
    }

    // Check if there are any all-in actions in this street
    const street = this.getStreet(streetName);
    const hasAllIn = street.actions?.some(action => action.type === 'all-in');

    if (hasAllIn) {
      const lastAllIn = this.getLastAllInAction(street);
      if (lastAllIn) {
        const allInPlayer = lastAllIn.action.player;
        
        // If selected player is the one who went all-in, hide UI
        if (playerPosition === allInPlayer) {
          return true;
        }
        
        // If player has already acted after all-in, hide UI
        if (this.hasPlayerActedAfterIndex(playerPosition, street, lastAllIn.index)) {
          return true;
        }
        
        // Otherwise, player needs to respond to all-in, show UI
        return false;
      }
    }

    // Check if the selected position is next to act
    return !this.isValidPosition(playerPosition) || !this.isPositionToAct(playerPosition as Position, streetName);
  }

  /**
   * Check if a position is next to act
   */
  isPositionToAct(position: Position, streetName: PokerStreet): boolean {
    const street = this.getStreet(streetName);
    const activePlayers = this.getActingPlayers(streetName)
      .map(p => p.position)
      .filter(this.isValidPosition);
    
    if (!street.actions || street.actions.length === 0) {
      // If no actions yet, the first active player is to act
      return position === activePlayers[0];
    }

    // Find the index of the last player who acted
    const lastAction = street.actions[street.actions.length - 1];
    const lastPlayerIndex = activePlayers.indexOf(lastAction.player as Position);
    
    // The next player in the active players array is to act
    const nextPlayerIndex = (lastPlayerIndex + 1) % activePlayers.length;
    
    return position === activePlayers[nextPlayerIndex];
  }

  /**
   * Check if a position is waiting to act
   */
  isPositionWaiting(currentPosition: Position, streetName: PokerStreet): boolean {
    return !this.isPositionToAct(currentPosition, streetName);
  }

  /**
   * Check if all players are all-in or have folded
   */
  isAllPlayersAllIn(streetName: PokerStreet): boolean {
    // Get active players (not folded)
    const activePlayers = this.getActivePlayers(streetName);
    
    // If there's only one active player, they're not all-in
    if (activePlayers.length <= 1) return false;
    
    // Check if all active players except one are all-in
    const allInCount = activePlayers.filter(player => 
      this.isPlayerAllIn(player.position, streetName)
    ).length;
    
    // All players are all-in if everyone except at most one player is all-in
    return allInCount >= activePlayers.length - 1;
  }

  /**
   * Get the highest contribution from each player in a street's actions
   */
  getPlayerContributions(streetName: PokerStreet): Map<string, number> {
    const street = this.getStreet(streetName);
    const playerContributions = new Map<string, number>();
    
    if (!street.actions) return playerContributions;
    
    for (const action of street.actions) {
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
   * Calculate the total pot size including previous streets
   */
  calculateTotalPot(streetName: PokerStreet): number {
    let totalPot = 0;
    
    // Add blinds and straddle to the pot
    totalPot += this.blinds.sb + this.blinds.bb;
    if (this.straddleAmount > 0) {
      totalPot += this.straddleAmount;
    }
    
    // For preflop, just return blinds + straddle + preflop actions
    if (streetName === 'preflop') {
      // Get highest contributions from each player
      const playerContributions = this.getPlayerContributions('preflop');
      
      // Add all contributions
      for (const amount of playerContributions.values()) {
        totalPot += amount;
      }
      
      return totalPot;
    }
    
    // For postflop streets, we need to handle a bit differently
    // Add actions from all previous streets
    const streets: PokerStreet[] = ['preflop', 'flop', 'turn', 'river'];
    const currentStreetIndex = streets.indexOf(streetName);
    
    for (let i = 0; i <= currentStreetIndex; i++) {
      const streetName = streets[i];
      const playerContributions = this.getPlayerContributions(streetName);
      
      for (const amount of playerContributions.values()) {
        totalPot += amount;
      }
    }
    
    return totalPot;
  }

  /**
   * Get the minimum and maximum allowed bet amounts
   */
  getBetLimits(
    actionType: ActionType,
    playerPosition: string,
    streetName: PokerStreet
  ): { min: number; max: number } {
    const effectiveStack = this.getEffectiveStack(playerPosition, streetName);
    
    // For call, min and max are the same (current bet to call)
    if (actionType === 'call') {
      const currentBet = this.getCurrentBetToCall(streetName);
      return { min: currentBet, max: currentBet };
    }

    // For bet/raise, min is the minimum bet and max is the effective stack
    const minBet = this.getMinBet(streetName);
    return { min: minBet, max: effectiveStack };
  }

  /**
   * Check if a player is facing an all-in
   */
  isFacingAllIn(playerPosition: string, streetName: PokerStreet): boolean {
    const player = this.players.find(p => p.position === playerPosition);
    if (!player) return false;
    
    // Check if there's an all-in action
    const street = this.getStreet(streetName);
    const previousStreetName = this.getPreviousStreet(streetName);
    const previousStreet = previousStreetName ? this.getStreet(previousStreetName) : undefined;
    
    const hasAllIn = street.actions?.some(action => action.type === 'all-in') || 
                    previousStreet?.actions?.some(action => action.type === 'all-in');
    
    if (!hasAllIn) return false;
    
    // Get the effective stack of the player
    const effectiveStack = this.getEffectiveStack(player.position, streetName);
    
    // Get the current bet to call
    const currentBet = this.getCurrentBetToCall(streetName);
    
    // If the effective stack is less than or equal to the current bet, player is facing all-in
    return effectiveStack <= currentBet;
  }

  /**
   * Check if the action for the street is complete
   */
  isStreetComplete(streetName: PokerStreet): boolean {
    const street = this.getStreet(streetName);
    
    // If all players are all-in, action is complete
    if (this.isAllPlayersAllIn(streetName)) {
      return true;
    }
    
    // Get players who can still act
    const actingPlayers = this.getActingPlayers(streetName);
    if (actingPlayers.length === 0) return true;
    
    // If no actions yet, action is not complete
    if (!street.actions || street.actions.length === 0) {
      return false;
    }

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
   * Get players who need to respond to an all-in
   */
  getPlayersWhoNeedToRespondToAllIn(streetName: PokerStreet): Player[] {
    return this.getActingPlayers(streetName)
      .filter(player => this.needsToRespondToAllIn(player.position, streetName));
  }

  /**
   * Check if any players need to respond to an all-in
   */
  playersNeedToRespondToAllIn(streetName: PokerStreet): boolean {
    return this.getPlayersWhoNeedToRespondToAllIn(streetName).length > 0;
  }

  /**
   * Get the next player to act based on the street and player positions
   */
  getNextActingPlayer(streetName: PokerStreet): string | null {
    const street = this.getStreet(streetName);
    const activePlayers = this.getActingPlayers(streetName);
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

  hasFolded(player: Player, streetName: PokerStreet): boolean {
    const street = this.getStreet(streetName);
    const lastAction = street.actions?.find(action => action.player === player.position);
    return (lastAction && lastAction.type === 'fold') ?? false;
  }

  getPlayerByPosition(position: Position): Player | undefined {
    return this.players.find((p: Player) => p.position === position);
  }

  getNextPlayer(currentPosition: Position): Position {
    const positions = PokerGameState.VALID_POSITIONS;
    const currentIndex = positions.indexOf(currentPosition);
    return positions[(currentIndex + 1) % positions.length];
  }
} 