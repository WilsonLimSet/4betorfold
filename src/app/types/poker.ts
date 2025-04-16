export type Position = 'BTN' | 'SB' | 'BB' | 'UTG' | 'UTG+1' | 'UTG+2' | 'LJ' | 'HJ' | 'CO';
export type Card = {
  rank: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
};

export type PlayerType = 
  | 'LAG'
  | 'TAG'
  | 'Fish'
  | 'Nit'
  | 'Calling Station'
  | 'Unknown'
  | 'Custom';

export type Player = {
  position: Position;
  stack: number;
  initialStack?: number;
  holeCards?: [Card, Card];
  playerType: PlayerType;
  notes?: string;
  isHero: boolean;
  showdownAction?: 'show' | 'muck';
};

export type ActionType = 'bet' | 'call' | 'raise' | 'fold' | 'check' | 'showdown' | 'all-in';

export type Action = {
  player: string;
  type: ActionType;
  amount?: number;
};

export type Street = {
  actions: Action[];
  board?: Card[];
};

export type HandHistory = {
  id: string;
  date: Date;
  players: Player[];
  preflop: Street;
  flop?: Street;
  turn?: Street;
  river?: Street;
  pot: number;
};

// Add Hand type alias for HandHistory
export type Hand = HandHistory;

export type CardValue = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';
export type CardSuit = 'h' | 'd' | 'c' | 's';
export type PokerStreet = 'preflop' | 'flop' | 'turn' | 'river';

export interface Stakes {
  sb: number;
  bb: number;
} 