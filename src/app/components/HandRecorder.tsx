'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Position, Player, HandHistory, Street, Card, Stakes, PokerStreet } from '../types/poker';
import PlayerInput from './PlayerInput';
import StreetActions from './StreetActions';
import StakeSelector from './StakeSelector';
import { getPlayerContributions } from '../utils/pokerUtils';

// Define positions array
const positions: Position[] = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO'];

export const HandRecorder: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);

  const [handHistory, setHandHistory] = useState<HandHistory>({
    id: crypto.randomUUID(),
    date: new Date(),
    players: [],
    preflop: { actions: [] },
    flop: { actions: [] },
    turn: { actions: [] },
    river: { actions: [] },
    pot: 0
  });

  const [useDollars, setUseDollars] = useState<boolean>(true);
  const previewRef = useRef<HTMLDivElement>(null);
  const [stakes, setStakes] = useState<Stakes>({ sb: 1, bb: 2 });
  const [isCashGame, setIsCashGame] = useState(true);
  const [handDate, setHandDate] = useState<string>('');
  const [handLocation, setHandLocation] = useState<string>('');

  const [straddle, setStraddle] = useState<boolean>(false);
  const straddleAmount = straddle ? stakes.bb * 2 : 0; // Straddle is 2x the BB

  // Add toggleDollars function to use the setUseDollars function
  const toggleDollars = () => {
    setUseDollars(prev => !prev);
  };

  // Function to get default stack based on big blind
  const getDefaultStack = (bb: number) => bb * 100;

  // Get all taken positions except for the current player
  const getTakenPositions = (currentPlayerIndex: number): Position[] => {
    return players
      .filter((_, index) => index !== currentPlayerIndex)
      .map(p => p.position);
  };

  const addPlayer = () => {
    if (players.length < 9) { // Max 9 players at a table
      // Find first available position
      const takenPositions = players.map(p => p.position);
      const availablePosition = positions.find(pos => !takenPositions.includes(pos)) || 'BB';
      
      const newPlayer: Player = {
        position: availablePosition,
        stack: getDefaultStack(stakes.bb),
        initialStack: getDefaultStack(stakes.bb),
        playerType: 'Unknown',
        isHero: false,
      };
      
      const newPlayers = [...players, newPlayer];
      setPlayers(newPlayers);
      setHandHistory(prev => ({ ...prev, players: newPlayers }));
    }
  };

  // Function to update both players and hand history - wrapped in useCallback
  const updatePlayersAndHistory = useCallback((newPlayers: Player[]) => {
    setPlayers(newPlayers);
    setHandHistory(prev => ({ ...prev, players: newPlayers }));
  }, []);  // Empty dependency array as it doesn't depend on any props or state

  // Initialize players with correct stack sizes
  useEffect(() => {
    const initialPlayers: Player[] = [
      {
        position: 'BTN' as Position,
        stack: getDefaultStack(stakes.bb),
        initialStack: getDefaultStack(stakes.bb),
        playerType: 'Unknown',
        isHero: true,
      },
      {
        position: 'BB' as Position,
        stack: getDefaultStack(stakes.bb),
        initialStack: getDefaultStack(stakes.bb),
        playerType: 'Unknown',
        isHero: false,
      }
    ];
    updatePlayersAndHistory(initialPlayers);
  }, [stakes.bb, updatePlayersAndHistory]); // Add updatePlayersAndHistory to dependency array

  // Update stakes and adjust stacks for cash games
  const handleStakeChange = (sb: number, bb: number) => {
    setStakes({ sb, bb });
    if (isCashGame) {
      const newPlayers = players.map(p => ({
        ...p,
        stack: getDefaultStack(bb),
        initialStack: getDefaultStack(bb)
      }));
      updatePlayersAndHistory(newPlayers);
    }
  };

  // Update stacks when straddle changes
  useEffect(() => {
    if (isCashGame && players.length > 0) {
      const newPlayers = players.map(p => ({
        ...p,
        stack: getDefaultStack(stakes.bb),
        initialStack: getDefaultStack(stakes.bb)
      }));
      updatePlayersAndHistory(newPlayers);
    }
  }, [straddle, isCashGame, stakes.bb, players, updatePlayersAndHistory]); // Update when straddle, game type, or players change

  const updatePlayer = (index: number, updatedPlayer: Player) => {
    // Ensure we can't remove the hero
    if (players[index].isHero && !updatedPlayer.isHero) {
      return;
    }

    const newPlayers = [...players];
    newPlayers[index] = { ...updatedPlayer, initialStack: updatedPlayer.initialStack || players[index].initialStack || updatedPlayer.stack };
    setPlayers(newPlayers);
    setHandHistory(prev => ({ ...prev, players: newPlayers }));
  };

  const removePlayer = (index: number) => {
    if (!players[index].isHero) {
      // Don't allow removing the last villain
      if (players.filter(p => !p.isHero).length <= 1) {
        return;
      }
      const newPlayers = players.filter((_, i) => i !== index);
      setPlayers(newPlayers);
      setHandHistory(prev => ({ ...prev, players: newPlayers }));
    }
  };

  const updateStreet = (streetName: PokerStreet, street: Street) => {
    setHandHistory(prevHistory => {
      // Create the next history state with the updated street
      const newHistory = {
        ...prevHistory,
        [streetName]: street
      };

      // Calculate new stacks based on all actions in newHistory
      // Use players from prevHistory to access potentially more accurate initialStack
      const newPlayersWithUpdatedStacks = prevHistory.players.map(p => {
        const initialStack = p.initialStack || getDefaultStack(stakes.bb); // Use stored initial stack or default
        let totalContributed = 0;
        (['preflop', 'flop', 'turn', 'river'] as PokerStreet[]).forEach(sName => {
          const sData = newHistory[sName] as Street;
          if (sData?.actions) {
             // Use getPlayerContributions to find the total amount this player put in during this street
             const contributions = getPlayerContributions(sData.actions);
             totalContributed += contributions.get(p.position) || 0;
          }
        });

        const currentStack = Math.max(0, initialStack - totalContributed); // Ensure stack doesn't go below 0

        return { 
          ...p, 
          stack: currentStack,
          initialStack: initialStack // Ensure initialStack is preserved
         };
      });

      // Update the players array within the new history object
      newHistory.players = newPlayersWithUpdatedStacks;

      // Also update the separate players state used by PlayerInput etc.
      // Use a functional update for setPlayers to ensure it uses the latest state
      setPlayers(currentPlayers => {
         // Merge updates: Use positions to match players
         return currentPlayers.map(cp => {
           const updatedPlayer = newPlayersWithUpdatedStacks.find(up => up.position === cp.position);
           return updatedPlayer ? updatedPlayer : cp;
         });
      });

      return newHistory;
    });
  };

  // Recalculate pots directly for preview display
  const calculatePotData = () => {
    const pots = {
      preflop: 0,
      flop: 0,
      turn: 0,
      river: 0,
      total: 0,
    };
    let currentPot = stakes.sb + stakes.bb + (straddle ? straddleAmount : 0);
    
    const preflopContributions = getPlayerContributions(handHistory.preflop?.actions || []);
    currentPot += Array.from(preflopContributions.values()).reduce((sum, amount) => sum + amount, 0);
    pots.preflop = currentPot;

    if (handHistory.flop?.board) {
        const flopContributions = getPlayerContributions(handHistory.flop?.actions || []);
        currentPot += Array.from(flopContributions.values()).reduce((sum, amount) => sum + amount, 0);
        pots.flop = currentPot;
    } else {
        pots.flop = pots.preflop; // If no flop, pot carries over
    }

    if (handHistory.turn?.board) {
        const turnContributions = getPlayerContributions(handHistory.turn?.actions || []);
        currentPot += Array.from(turnContributions.values()).reduce((sum, amount) => sum + amount, 0);
        pots.turn = currentPot;
    } else {
         pots.turn = pots.flop; // If no turn, pot carries over
    }

    if (handHistory.river?.board) {
        const riverContributions = getPlayerContributions(handHistory.river?.actions || []);
        currentPot += Array.from(riverContributions.values()).reduce((sum, amount) => sum + amount, 0);
        pots.river = currentPot;
    } else {
         pots.river = pots.turn; // If no river, pot carries over
    }

    pots.total = currentPot;
    return pots;
  };

  const handleCopy = () => {
    if (previewRef.current) {
      // Create a hidden div to hold just the content we want to copy
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);
      
      // Clone the content without the header elements
      const contentToCopy = previewRef.current.querySelector('.hand-history-content');
      if (contentToCopy) {
        tempDiv.innerHTML = contentToCopy.innerHTML;
      }
      
      // Copy just this content
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(tempDiv);
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      navigator.clipboard.writeText(tempDiv.innerText)
        .then(() => {
          // Could add a toast notification here
          console.log('Hand history copied to clipboard');
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
        });
      
      // Clean up
      selection?.removeAllRanges();
      document.body.removeChild(tempDiv);
    }
  };

  const getUsedCards = (currentStreet: PokerStreet): Card[] => {
    const usedCards: Card[] = [];
    
    // Add all players' hole cards if they exist
    players.forEach(player => {
      if (player.holeCards) {
        usedCards.push(...player.holeCards);
      }
    });
    
    // Add board cards from previous streets
    if (currentStreet !== 'preflop') {
      if (handHistory.flop?.board) {
        usedCards.push(...handHistory.flop.board);
      }
      
      if (currentStreet !== 'flop' && handHistory.turn?.board) {
        usedCards.push(...handHistory.turn.board);
      }
      
      if (currentStreet !== 'flop' && currentStreet !== 'turn' && handHistory.river?.board) {
        usedCards.push(...handHistory.river.board);
      }
    }
    
    return usedCards;
  };

  // Determine if all active players are all-in
  const isAllPlayersAllIn = () => {
    // Get non-folded players
    const activePlayers = players.filter(player => {
      // Check if player has folded in any previous street
      const hasFolded = ['preflop', 'flop', 'turn', 'river'].some(streetName => {
        const streetData = handHistory[streetName as keyof HandHistory] as Street;
        return streetData?.actions?.some(
          action => action.player === player.position && action.type === 'fold'
        );
      });
      return !hasFolded;
    });
    
    // Check if all active players have performed an all-in action
    const allInPlayers = ['preflop', 'flop', 'turn', 'river'].reduce((allIn, streetName) => {
      const streetData = handHistory[streetName as keyof HandHistory] as Street;
      streetData?.actions?.forEach(action => {
        if (action.type === 'all-in') {
          allIn.add(action.player);
        }
      });
      return allIn;
    }, new Set<string>());
    
    // We need at least two active players and either:
    // 1. All active players are all-in, or
    // 2. One player is all-in and there's only one other active player
    const result = activePlayers.length > 0 && 
           ((activePlayers.every(player => allInPlayers.has(player.position)) &&
           allInPlayers.size >= Math.min(2, activePlayers.length)) || 
           (allInPlayers.size === 1 && activePlayers.length === 2));
    
    return result;
  };

  // Check if we should show a showdown (all-in situation or river completed)
  const shouldShowShowdown = () => {
    const riverComplete = handHistory.river?.actions && handHistory.river.actions.length > 0;
    return isAllPlayersAllIn() || riverComplete;
  };

  return (
    <div className="max-w-6xl mx-auto p-1 sm:p-2 md:p-4">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
        {/* Form Panel */}
        <div className="lg:col-span-3 rounded-xl shadow-lg p-3 sm:p-6 md:p-8 bg-white">
          <h2 className="text-3xl font-bold mb-4 sm:mb-6 text-gray-900">Record Hand History</h2>
          <div className="space-y-8">
            {/* Date and Location Section */}
            <div className="mb-8 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date (optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={handDate}
                    onChange={(e) => setHandDate(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={handLocation}
                  onChange={(e) => setHandLocation(e.target.value)}
                  placeholder="e.g., Aria Casino, Las Vegas"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>

            {/* Stakes Section */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4" style={{ color: 'rgb(31, 41, 55)' }}>Stakes</h3>
              <StakeSelector 
                onStakeSelect={handleStakeChange}
                onGameTypeChange={(isCash) => {
                  setIsCashGame(isCash);
                  if (isCash) {
                    // Reset stacks to 100bb when switching to cash game
                    const newPlayers = players.map(p => ({
                      ...p,
                      stack: getDefaultStack(stakes.bb)
                    }));
                    setPlayers(newPlayers);
                    setHandHistory(prev => ({ ...prev, players: newPlayers }));
                  }
                }}
                selectedStakes={stakes}
              />
            </div>

            {/* Straddle Section */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4" style={{ color: 'rgb(31, 41, 55)' }}>Straddle</h3>
              <div className="flex items-center">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={straddle}
                    onChange={() => setStraddle(!straddle)}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:translate-x-[-100%] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-lg font-medium text-gray-900">
                    {straddle ? `$${straddleAmount} (2x BB)` : 'Off'}
                  </span>
                </label>
              </div>
            </div>

            {/* Players Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold" style={{ color: 'rgb(31, 41, 55)' }}>Players</h3>
                <button
                  type="button"
                  onClick={addPlayer}
                  className="font-medium text-lg"
                  style={{ color: 'rgb(37, 99, 235)' }}
                >
                  + Add Player
                </button>
              </div>
              
              <div className="space-y-6">
                {players.map((player, index) => (
                  <PlayerInput
                    key={index}
                    player={player}
                    onUpdate={(updatedPlayer) => updatePlayer(index, updatedPlayer)}
                    onRemove={() => removePlayer(index)}
                    showVillainCards={true}
                    takenPositions={getTakenPositions(index)}
                    allPlayers={players}
                    usedCards={getUsedCards('preflop')}
                  />
                ))}
              </div>
            </div>

            {/* Street Actions */}
            <div className="space-y-6">
              <StreetActions
                streetName="Preflop"
                players={players}
                street={handHistory.preflop}
                onUpdate={(street) => updateStreet('preflop', street)}
                usedCards={getUsedCards('preflop')}
                straddleAmount={straddle ? straddleAmount : 0}
                blinds={stakes}
              />
              
              {/* Pass the pre-calculated pot from preflop */}
              <StreetActions
                streetName="Flop"
                players={players}
                street={handHistory.flop || { actions: [] }}
                onUpdate={(street) => updateStreet('flop', street)}
                previousStreet={handHistory.preflop}
                usedCards={getUsedCards('flop')}
                allPlayersAllIn={isAllPlayersAllIn()}
                previousCards={{ flop: handHistory.flop?.board }}
                blinds={stakes}
                straddleAmount={straddle ? straddleAmount : 0}
                preflopPot={calculatePotData().preflop}
              />
              
              {/* Pass the pre-calculated pots from preflop and flop */}
              <StreetActions
                streetName="Turn"
                players={players}
                street={handHistory.turn || { actions: [] }}
                onUpdate={(street) => updateStreet('turn', street)}
                previousStreet={handHistory.flop || { actions: [] }}
                usedCards={getUsedCards('turn')}
                allPlayersAllIn={isAllPlayersAllIn()}
                previousCards={{ 
                  flop: handHistory.flop?.board,
                  turn: handHistory.turn?.board
                }}
                blinds={stakes}
                straddleAmount={straddle ? straddleAmount : 0}
                preflopPot={calculatePotData().preflop}
                flopPot={calculatePotData().flop}
              />
              
              {/* Pass the pre-calculated pots from all previous streets */}
              <StreetActions
                streetName="River"
                players={players}
                street={handHistory.river || { actions: [] }}
                onUpdate={(street) => updateStreet('river', street)}
                previousStreet={handHistory.turn || { actions: [] }}
                usedCards={getUsedCards('river')}
                allPlayersAllIn={isAllPlayersAllIn()}
                previousCards={{ 
                  flop: handHistory.flop?.board,
                  turn: handHistory.turn?.board
                }}
                blinds={stakes}
                straddleAmount={straddle ? straddleAmount : 0}
                preflopPot={calculatePotData().preflop}
                flopPot={calculatePotData().flop}
                turnPot={calculatePotData().turn}
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={toggleDollars}
                className="px-4 py-2 bg-white border border-blue-500 text-blue-500 rounded hover:bg-blue-50"
              >
                Show amounts in: {useDollars ? 'BB' : '$'}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div ref={previewRef} className="lg:col-span-2 bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Hand History</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                <span>Copy</span>
              </button>
            </div>
          </div>

          {/* Hand History Content - only this content will be copied */}
          <div className="whitespace-pre-wrap text-sm leading-6 text-gray-900 hand-history-content">
            {(handDate || handLocation) && (
              <div className="mb-2">
                {handDate && <div>{handDate}</div>}
                {handLocation && <div>{handLocation}</div>}
                {(handDate || handLocation) && <div className="mt-2"></div>}
              </div>
            )}
            <div className="font-semibold text-lg">Blinds: ${stakes.sb}/${stakes.bb}</div>
            {straddle && (
              <div className="font-semibold text-lg">Straddle: ${straddleAmount}</div>
            )}
            <div className="mt-1">
              <span className="font-semibold">Hero:</span> {players.find(p => p.isHero)?.position} 
              {players.find(p => p.isHero)?.holeCards && (
                <span>
                  {' ('}
                  <span className={players.find(p => p.isHero)?.holeCards?.[0].suit === 'hearts' || 
                                players.find(p => p.isHero)?.holeCards?.[0].suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                    {players.find(p => p.isHero)?.holeCards?.[0].rank}
                    {players.find(p => p.isHero)?.holeCards?.[0].suit === 'hearts' ? '♥' : 
                     players.find(p => p.isHero)?.holeCards?.[0].suit === 'diamonds' ? '♦' : 
                     players.find(p => p.isHero)?.holeCards?.[0].suit === 'clubs' ? '♣' : '♠'}
                  </span>
                  {' '}
                  <span className={players.find(p => p.isHero)?.holeCards?.[1].suit === 'hearts' || 
                                players.find(p => p.isHero)?.holeCards?.[1].suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                    {players.find(p => p.isHero)?.holeCards?.[1].rank}
                    {players.find(p => p.isHero)?.holeCards?.[1].suit === 'hearts' ? '♥' : 
                     players.find(p => p.isHero)?.holeCards?.[1].suit === 'diamonds' ? '♦' : 
                     players.find(p => p.isHero)?.holeCards?.[1].suit === 'clubs' ? '♣' : '♠'}
                  </span>
                  {')'}
                </span>
              )}
            </div>
            <div className="mt-1">
              <span className="font-semibold">Villain{players.filter(p => !p.isHero).length > 1 ? 's' : ''}:</span> {players.filter(p => !p.isHero).map(p => p.position).join(', ')}
            </div>
            <div className="mt-1"><span className="font-semibold">Effective Stack:</span> ${Math.min(...players.map(p => p.initialStack || p.stack))}</div>
            
            {(() => {
              const pots = calculatePotData(); // Calculate all pots once
              return (
                <>
                  {handHistory.preflop.actions.length > 0 && (
                    <div className="mt-4">
                      <div className="font-semibold">Preflop ({useDollars ? '$' : ''}{pots.preflop}{!useDollars ? 'BB' : ''}):</div>
                      <div className="pl-4">
                        {handHistory.preflop.actions.map((action, idx) => (
                          <div key={idx} className="ml-4 -indent-4">
                            {action.player} {action.type === 'raise' ? 'raises to' : action.type} 
                            {action.amount ? ` ${useDollars ? '$' : ''}${action.amount}${!useDollars ? 'BB' : ''}` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {handHistory.flop?.board && handHistory.flop.board.length > 0 && (
                    <div className="mt-4">
                      <div className="font-semibold">
                        Flop ({useDollars ? '$' : ''}{pots.flop}{!useDollars ? 'BB' : ''}): {' '}
                        {handHistory.flop.board.map((card, idx) => (
                          <span key={idx} className={card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                            {card.rank}
                            {card.suit === 'hearts' ? '♥' : 
                             card.suit === 'diamonds' ? '♦' : 
                             card.suit === 'clubs' ? '♣' : '♠'} 
                          </span>
                        ))}
                      </div>
                      <div className="pl-4">
                        {handHistory.flop.actions?.map((action, idx) => (
                          <div key={idx} className="ml-4 -indent-4">
                            {action.player} {action.type === 'raise' ? 'raises to' : action.type} 
                            {action.amount ? ` ${useDollars ? '$' : ''}${action.amount}${!useDollars ? 'BB' : ''}` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {handHistory.turn?.board && handHistory.turn.board.length > 0 && (
                    <div className="mt-4">
                      <div className="font-semibold">
                        Turn ({useDollars ? '$' : ''}{pots.turn}{!useDollars ? 'BB' : ''}): {' '}
                        {handHistory.flop?.board && handHistory.flop.board.map((card, idx) => (
                          <span key={`flop-${idx}`} className={card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                            {card.rank}
                            {card.suit === 'hearts' ? '♥' : 
                             card.suit === 'diamonds' ? '♦' : 
                             card.suit === 'clubs' ? '♣' : '♠'} 
                          </span>
                        ))}
                        {" "}
                        {handHistory.turn.board.map((card, idx) => (
                          <span key={`turn-${idx}`} className={card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                            {card.rank}
                            {card.suit === 'hearts' ? '♥' : 
                             card.suit === 'diamonds' ? '♦' : 
                             card.suit === 'clubs' ? '♣' : '♠'}
                          </span>
                        ))}
                      </div>
                      <div className="pl-4">
                        {handHistory.turn.actions?.map((action, idx) => (
                          <div key={idx} className="ml-4 -indent-4">
                            {action.player} {action.type === 'raise' ? 'raises to' : action.type} 
                            {action.amount ? ` ${useDollars ? '$' : ''}${action.amount}${!useDollars ? 'BB' : ''}` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {handHistory.river?.board && handHistory.river.board.length > 0 && (
                    <div className="mt-4">
                      <div className="font-semibold">
                        River ({useDollars ? '$' : ''}{pots.river}{!useDollars ? 'BB' : ''}): {' '}
                        {handHistory.flop?.board && handHistory.flop.board.map((card, idx) => (
                          <span key={`flop-${idx}`} className={card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                            {card.rank}
                            {card.suit === 'hearts' ? '♥' : 
                             card.suit === 'diamonds' ? '♦' : 
                             card.suit === 'clubs' ? '♣' : '♠'} 
                          </span>
                        ))}
                        {" "}
                        {handHistory.turn?.board && handHistory.turn.board.map((card, idx) => (
                          <span key={`turn-${idx}`} className={card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                            {card.rank}
                            {card.suit === 'hearts' ? '♥' : 
                             card.suit === 'diamonds' ? '♦' : 
                             card.suit === 'clubs' ? '♣' : '♠'}
                          </span>
                        ))}
                        {" "}
                        {handHistory.river.board.map((card, idx) => (
                          <span key={`river-${idx}`} className={card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                            {card.rank}
                            {card.suit === 'hearts' ? '♥' : 
                             card.suit === 'diamonds' ? '♦' : 
                             card.suit === 'clubs' ? '♣' : '♠'}
                          </span>
                        ))}
                      </div>
                      <div className="pl-4">
                        {handHistory.river.actions?.map((action, idx) => (
                          <div key={idx} className="ml-4 -indent-4">
                            {action.player} {action.type === 'raise' ? 'raises to' : action.type} 
                            {action.amount ? ` ${useDollars ? '$' : ''}${action.amount}${!useDollars ? 'BB' : ''}` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 font-semibold">Total pot: {useDollars ? '$' : ''}{pots.total}{!useDollars ? 'BB' : ''}</div>
                </>
              );
            })()}
            
            {/* Show showdown when river is complete or players are all-in */}
            {shouldShowShowdown() && (
              <div className="mt-4">
                <div className="font-semibold">Showdown:</div>
                <div className="pl-4">
                  {/* Hero's cards */}
                  <div className="ml-4 -indent-4">
                    {players.find(p => p.isHero)?.position} shows
                    {players.find(p => p.isHero)?.holeCards && (
                      <span>
                        {' ('}
                        <span className={players.find(p => p.isHero)?.holeCards?.[0].suit === 'hearts' || 
                                      players.find(p => p.isHero)?.holeCards?.[0].suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                          {players.find(p => p.isHero)?.holeCards?.[0].rank}
                          {players.find(p => p.isHero)?.holeCards?.[0].suit === 'hearts' ? '♥' : 
                           players.find(p => p.isHero)?.holeCards?.[0].suit === 'diamonds' ? '♦' : 
                           players.find(p => p.isHero)?.holeCards?.[0].suit === 'clubs' ? '♣' : '♠'}
                        </span>
                        {' '}
                        <span className={players.find(p => p.isHero)?.holeCards?.[1].suit === 'hearts' || 
                                      players.find(p => p.isHero)?.holeCards?.[1].suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                          {players.find(p => p.isHero)?.holeCards?.[1].rank}
                          {players.find(p => p.isHero)?.holeCards?.[1].suit === 'hearts' ? '♥' : 
                           players.find(p => p.isHero)?.holeCards?.[1].suit === 'diamonds' ? '♦' : 
                           players.find(p => p.isHero)?.holeCards?.[1].suit === 'clubs' ? '♣' : '♠'}
                        </span>
                        {')'}
                      </span>
                    )}
                  </div>
                  {/* Villains' cards */}
                  {players.filter(p => !p.isHero).map(villain => (
                    <div key={villain.position} className="ml-4 -indent-4">
                      {villain.position} {villain.holeCards ? 'shows' : 'mucks'} 
                      {villain.holeCards && (
                        <span>
                          {' ('}
                          <span className={villain.holeCards[0].suit === 'hearts' || 
                                        villain.holeCards[0].suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                            {villain.holeCards[0].rank}
                            {villain.holeCards[0].suit === 'hearts' ? '♥' : 
                             villain.holeCards[0].suit === 'diamonds' ? '♦' : 
                             villain.holeCards[0].suit === 'clubs' ? '♣' : '♠'}
                          </span>
                          {' '}
                          <span className={villain.holeCards[1].suit === 'hearts' || 
                                        villain.holeCards[1].suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                            {villain.holeCards[1].rank}
                            {villain.holeCards[1].suit === 'hearts' ? '♥' : 
                             villain.holeCards[1].suit === 'diamonds' ? '♦' : 
                             villain.holeCards[1].suit === 'clubs' ? '♣' : '♠'}
                          </span>
                          {')'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-4 text-gray-500 text-xs">Generated by 4betorfold.com</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandRecorder; 