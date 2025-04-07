export type Position = 'BTN' | 'SB' | 'BB' | 'UTG' | 'MP' | 'CO';
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
  holeCards?: [Card, Card];
  playerType: PlayerType;
  notes?: string;
  isHero: boolean;
};

export type Action = {
  player: string;
  type: 'bet' | 'call' | 'raise' | 'fold' | 'check';
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