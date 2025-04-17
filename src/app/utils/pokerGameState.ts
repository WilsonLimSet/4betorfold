import { Action, Player, Street, Position, PokerStreet, ActionType, Card } from '../types/poker';

/**
 * PokerGameState class manages the state of a poker hand
 * This centralizes all game logic and provides a clean API for components
 */
export default class PokerGameState {
  private players: Player[];
  private streets: Record<PokerStreet, Street>;
  private blinds: { sb: number; bb: number };
  private straddleAmount: number;

  private static readonly VALID_POSITIONS: readonly Position[] = [
    'BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO'
  ] as const;

  constructor(
    players: Player[] = [], 
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
    const activePlayers = this.players.filter(p => !this.hasPlayerFolded(p.position, streetName)); // Players still in the hand

    // If <= 1 player left, street is complete
    if (activePlayers.length <= 1) {
      return true;
    }

    // Check if all remaining players are effectively all-in or folded
    const playersEffectivelyAllInOrFolded = activePlayers.every(player => {
      const effStack = this.getEffectiveStack(player.position, streetName);
      // Need to also consider if they were all-in on a *previous* street
      return effStack <= 0 || this.isPlayerAllIn(player.position, streetName); 
    });
    if (playersEffectivelyAllInOrFolded) {
      return true;
    }

    // --- Preflop Specific Logic --- 
    if (streetName === 'preflop') {
        const actions = street.actions || [];
        const bbPlayer = this.players.find(p => p.position === 'BB');
        const straddlerPos = this.straddleAmount > 0 ? this.getPlayerByPosition('UTG')?.position : null; // Assuming UTG straddle for now
        const closingPlayerPos = straddlerPos || bbPlayer?.position;
        const closingAmount = this.straddleAmount > 0 ? this.straddleAmount : this.blinds.bb;

        // If no actions, not complete unless maybe BB/Straddle is all-in pre
        if (actions.length === 0) return false; 

        const highestContribution = Math.max(0, ...Array.from(this.getPlayerContributions(streetName).values()));
        const lastAction = actions[actions.length - 1];

        // Check if a raise occurred beyond the initial blind/straddle
        const raiseOccurred = highestContribution > closingAmount;

        if (!raiseOccurred) {
            // No raise beyond blind/straddle. Complete ONLY if last action is closingPlayer checking.
            return lastAction.player === closingPlayerPos && lastAction.type === 'check';
        } else {
            // Raise occurred. Action must close based on last aggressor.
            // Fall through to the general aggressive action logic below.
        }
    }
    // --- End Preflop Specific Logic ---

    // --- General Logic (Postflop & Preflop Raises) --- 
    const playerContributions = this.getPlayerContributions(streetName);
    const highestContribution = Math.max(0, ...Array.from(playerContributions.values()));

    // Find the last *voluntary* aggressive action (Bet, Raise, or All-in that increases commitment)
    let lastAggressorIndex = -1;
    let lastAggressiveAction: Action | null = null;
    for (let i = (street.actions?.length ?? 0) - 1; i >= 0; i--) {
        const action = street.actions![i];
        const playerCurrentContribution = this.getPlayerContributions(streetName).get(action.player) || 0;
        const actionAmount = action.amount ?? 0;
        
        // Check if action is Bet/Raise, or an All-in that increases the bet
        const isVoluntaryAggression = action.type === 'bet' || 
                                    action.type === 'raise' || 
                                    (action.type === 'all-in' && actionAmount > playerCurrentContribution);
                                    
        if (isVoluntaryAggression) {
            lastAggressorIndex = i;
            lastAggressiveAction = action;
            break;
        }
    }
    
    // CASE 1: No voluntary aggressive action this street (e.g., postflop check-around)
    if (!lastAggressiveAction) {
        // Street completes if number of actions >= number of active players
        // (Everyone has had a chance to act - check or fold)
        const numActions = street.actions?.length ?? 0;
        return numActions >= activePlayers.length;
    }

    // CASE 2: Voluntary aggressive action occurred
    // Street completes if all other active players have acted *after* the last aggressor
    // and have either matched the highest contribution or folded/are all-in.
    for (const player of activePlayers) {
        const playerPos = player.position;
        
        // Skip the last aggressor themselves for this check
        if (playerPos === lastAggressiveAction.player) {
            continue;
        }

        const playerContribution = playerContributions.get(playerPos) || 0;
        const playerIsEffectivelyAllIn = this.getEffectiveStack(playerPos, streetName) <= 0 || this.isPlayerAllIn(playerPos, streetName);
        const playerHasFolded = this.hasPlayerFolded(playerPos, streetName);
        
        // Find if player acted after the last aggressor
        let actedAfterAggressor = false;
        for (let i = lastAggressorIndex + 1; i < (street.actions?.length ?? 0); i++) {
            if (street.actions![i].player === playerPos) {
                actedAfterAggressor = true;
                break;
            }
        }

        // If player hasn't folded and isn't all-in, they MUST have acted after the aggressor 
        // AND matched the highest contribution.
        if (!playerHasFolded && !playerIsEffectivelyAllIn) {
            if (!actedAfterAggressor || playerContribution < highestContribution) {
                return false; // Not complete
            }
        }
    }

    // If we reach here, the action has been closed correctly after the last aggression.
    return true; 
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

  /**
   * Calculate pot for a specific street (for display purposes)
   */
  calculateDisplayPot(streetName: PokerStreet): number {
    // For "pot entering street" display
    if (streetName === 'preflop') {
      // Start with blinds + straddle
      let pot = this.blinds.sb + this.blinds.bb + this.straddleAmount;
      
      // Add preflop action contributions
      const preflopStreet = this.getStreet('preflop');
      if (preflopStreet.actions && preflopStreet.actions.length > 0) {
        const contributions = new Map<string, number>();
        
        // Track forced bets
        contributions.set('SB', this.blinds.sb);
        contributions.set('BB', this.blinds.bb);
        if (this.straddleAmount > 0) {
          contributions.set('UTG', this.straddleAmount);
        }
        
        // Process actions
        for (const action of preflopStreet.actions) {
          // Skip folds and checks as they don't contribute to pot size calculation here
          if (action.type === 'fold' || action.type === 'check') continue; 
          
          // Ensure amount exists for betting/calling/raising actions
          if (action.amount !== undefined && action.amount >= 0) {
            const currentContribution = contributions.get(action.player) || 0;
            // The amount to add is the difference between this action's amount 
            // and what the player had already contributed.
            // Use action.amount directly, as it represents the total bet/call/raise amount TO.
            const totalContributionTarget = action.amount; 
            
            // Only update if this action increases their contribution
            if (totalContributionTarget > currentContribution) {
                contributions.set(action.player, totalContributionTarget);
            }
          }
        }
        
        // Recalculate total pot by summing final contributions
        pot = 0;
        for (const amount of contributions.values()) {
          pot += amount;
        }
      }
      
      return pot;
    } else {
      // For postflop streets, return the pot carried over from previous street
      const previousStreet = this.getPreviousStreet(streetName);
      if (!previousStreet) return 0;
      
      // Calculate pot from previous street
      return this.calculateTotalPot(previousStreet);
    }
  }

  /**
   * Get cards that are already in use (for card selection)
   */
  getUsedCards(currentStreet: PokerStreet): Card[] {
    const usedCards: Card[] = [];
    
    // Add players' hole cards
    for (const player of this.players) {
      if (player.holeCards) {
        usedCards.push(...player.holeCards);
      }
    }
    
    // Add board cards from streets up to the current one
    const streets: PokerStreet[] = ['preflop', 'flop', 'turn', 'river'];
    const currentIndex = streets.indexOf(currentStreet);
    
    for (let i = 0; i <= currentIndex; i++) {
      if (i === 0) continue; // Skip preflop as it has no board
      
      const streetName = streets[i];
      const streetData = this.getStreet(streetName);
      
      if (streetData.board && streetData.board.length > 0) {
        usedCards.push(...streetData.board);
      }
    }
    
    return usedCards;
  }
  
  /**
   * Get a display-friendly description of the blinds/straddle state
   */
  getBlindInfo(): string {
    let result = `Small Blind: $${this.blinds.sb}, Big Blind: $${this.blinds.bb}`;
    if (this.straddleAmount > 0) {
      result += `, Straddle: $${this.straddleAmount}`;
    }
    return result;
  }
  
  /**
   * Convert amounts from BB to $ or vice versa
   */
  formatAmount(amount: number, useDollars: boolean): string {
    if (useDollars) {
      return `$${amount}`;
    }
    return `${amount / this.blinds.bb}BB`;
  }

  // Add conversion utility to PokerGameState
  convertStreetNameToPokerStreet(streetName: 'Preflop' | 'Flop' | 'Turn' | 'River'): PokerStreet {
    return streetName.toLowerCase() as PokerStreet;
  }

  // Add method to get all used cards
  getAllUsedCards(): Card[] {
    const usedCards: Card[] = [];
    
    // Add player hole cards
    for (const player of this.players) {
      if (player.holeCards) {
        usedCards.push(...player.holeCards);
      }
    }
    
    // Add board cards
    const streets: PokerStreet[] = ['flop', 'turn', 'river'];
    for (const streetName of streets) {
      const street = this.getStreet(streetName);
      if (street.board) {
        usedCards.push(...street.board);
      }
    }
    
    return usedCards;
  }
} 