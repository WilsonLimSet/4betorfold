'use client';

import { useState, useRef, useEffect } from 'react';
import { Position, Player, HandHistory, Street, Stakes, PokerStreet } from '../types/poker';
import PlayerInput from './PlayerInput';
import StreetActions from './StreetActions';
import StakeSelector from './StakeSelector';
import PokerGameState from '@/app/utils/pokerGameState';

// Define positions array
const positions: Position[] = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO'];

// Create a dummy game state for initialization
const createDefaultGameState = () => {
  return new PokerGameState();
};

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

  const [activeStage, setActiveStage] = useState<'preflop' | 'flop' | 'turn' | 'river'>('preflop');

  const [gameState, setGameState] = useState<PokerGameState>(createDefaultGameState());

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
        playerType: 'Unknown',
        isHero: false,
      };
      
      const newPlayers = [...players, newPlayer];
      setPlayers(newPlayers);
      setHandHistory(prev => ({ ...prev, players: newPlayers }));
    }
  };

  // Function to update both players and hand history
  const updatePlayersAndHistory = (newPlayers: Player[]) => {
    setPlayers(newPlayers);
    setHandHistory(prev => ({ ...prev, players: newPlayers }));
  };

  // Initialize players with correct stack sizes
  useEffect(() => {
    const initialPlayers: Player[] = [
      {
        position: 'BTN' as Position,
        stack: getDefaultStack(stakes.bb),
        playerType: 'Unknown',
        isHero: true,
      },
      {
        position: 'BB' as Position,
        stack: getDefaultStack(stakes.bb),
        playerType: 'Unknown',
        isHero: false,
      }
    ];
    updatePlayersAndHistory(initialPlayers);
  }, [stakes.bb]); // Remove players dependency

  // Update stakes and adjust stacks for cash games
  const handleStakeChange = (sb: number, bb: number) => {
    setStakes({ sb, bb });
    if (isCashGame) {
      const newPlayers = players.map(p => ({
        ...p,
        stack: getDefaultStack(bb)
      }));
      updatePlayersAndHistory(newPlayers);
    }
  };

  // Update stacks when straddle changes
  useEffect(() => {
    if (isCashGame && players.length > 0) {
      const newPlayers = players.map(p => ({
        ...p,
        stack: getDefaultStack(stakes.bb)
      }));
      updatePlayersAndHistory(newPlayers);
    }
  }, [straddle, isCashGame, stakes.bb]);

  const updatePlayer = (index: number, updatedPlayer: Player) => {
    // Ensure we can't remove the hero
    if (players[index].isHero && !updatedPlayer.isHero) {
      return;
    }

    const newPlayers = [...players];
    newPlayers[index] = updatedPlayer;
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
    const newHandHistory = { ...handHistory };
    newHandHistory[streetName] = street;
    setHandHistory(newHandHistory);
    
    // Also update the game state
    gameState.updateStreet(streetName, street);
  };

  const calculatePotForStreet = (streetName: PokerStreet): number => {
    return gameState.calculateDisplayPot(streetName);
  };

  // NEW: Helper to calculate effective stack at the START of a given street
  const calculateEffectiveStackAtStreetStart = (playerPosition: string, targetStreetName: PokerStreet): number => {
    return gameState.getEffectiveStack(playerPosition, targetStreetName);
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

  // Function to determine if we should show the showdown section in the preview
  const shouldShowShowdown = () => {
    // Show showdown if there's an all-in on any street
    if (gameState.isAllPlayersAllIn('preflop') || 
        gameState.isAllPlayersAllIn('flop') || 
        gameState.isAllPlayersAllIn('turn') || 
        gameState.isAllPlayersAllIn('river')) {
      return true;
    }
    
    // Show showdown if the river street itself is complete
    if (gameState.isStreetComplete('river')) {
        return true;
    }
    
    return false;
  };

  // Updated function to handle stage transitions (River is final)
  const goToNextStage = () => {
    // Check if there's an all-in on the current street
    // If so, we stay on the current street but the UI should reflect completion
    if (gameState.isAllPlayersAllIn(activeStage as PokerStreet)) {
      // No state change needed, action UI should disable via StreetActions props
      return; 
    }
    
    // Normal progression
    if (activeStage === 'preflop') setActiveStage('flop');
    else if (activeStage === 'flop') setActiveStage('turn');
    else if (activeStage === 'turn') setActiveStage('river');
    // No transition from river needed
  };

  // Updated function to handle previous stage navigation
  const goToPreviousStage = () => {
    // Normal navigation
    if (activeStage === 'river') setActiveStage('turn');
    else if (activeStage === 'turn') setActiveStage('flop');
    else if (activeStage === 'flop') setActiveStage('preflop');
  };

  const resetHand = () => {
    // Generate a new UUID for the hand
    const newHandId = crypto.randomUUID();
    
    // Reset hand history while preserving players' positions and stacks
    setHandHistory({
      id: newHandId,
      date: new Date(),
      players: players.map(player => ({
        ...player,
        holeCards: undefined
      })),
      preflop: { actions: [] },
      flop: { actions: [] },
      turn: { actions: [] },
      river: { actions: [] },
      pot: 0
    });
    
    // Reset to preflop stage
    setActiveStage('preflop');
    
    // Reset date and location if needed
    // Uncomment if you want to clear these too
    // setHandDate('');
    // setHandLocation('');
  };

  // Update game state when hand history changes
  useEffect(() => {
    if (players.length === 0) return;
    
    const newGameState = new PokerGameState(
      players,
      { sb: stakes.sb, bb: stakes.bb },
      straddle ? straddleAmount : 0
    );
    
    // Load existing hand data into the game state - Handle undefined safely
    const streets: PokerStreet[] = ['preflop', 'flop', 'turn', 'river'];
    streets.forEach(streetName => {
      const street = handHistory[streetName];
      if (street && street.actions) { // Check if street and actions exist
        newGameState.updateStreet(streetName, {
          actions: street.actions,
          board: street.board
        });
      }
    });
    
    setGameState(newGameState);
  }, [players, stakes, straddle, straddleAmount, handHistory]);

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
                  placeholder="e.g., Hustler Casino"
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

            {/* Straddle and Display Amounts Section */}
            <div className="mb-8">
              <div className="flex items-center gap-8"> {/* Increased gap */}
                {/* Straddle Toggle */}
                <div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'rgb(31, 41, 55)' }}>Straddle</h3>
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

                {/* Display Amounts Toggle */}
                <div>
                  <h3 className="text-xl font-semibold mb-2 invisible">Display</h3> {/* Invisible placeholder for alignment */}
                  <button
                    onClick={toggleDollars}
                    className="px-4 py-2 bg-white border border-blue-500 text-blue-500 rounded hover:bg-blue-50 text-m"
                  >
                    Show amounts in: {useDollars ? 'BB' : '$'}
                  </button>
                </div>
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
                    usedCards={gameState.getUsedCards('preflop')}
                  />
                ))}
              </div>
            </div>

            {/* Street Actions */}
            <div className="space-y-6">
              {/* Street Navigation Tabs */}
              <div className="flex w-full border-b border-gray-200 mb-4">
                <button
                  onClick={() => setActiveStage('preflop')}
                  className={`px-4 py-2 text-base font-medium ${activeStage === 'preflop' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Preflop
                </button>
                <button
                  onClick={() => setActiveStage('flop')}
                  className={`px-4 py-2 text-base font-medium ${activeStage === 'flop' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
                  disabled={!handHistory.preflop?.actions || handHistory.preflop.actions.length === 0}
                >
                  Flop
                </button>
                <button
                  onClick={() => setActiveStage('turn')}
                  className={`px-4 py-2 text-base font-medium ${activeStage === 'turn' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
                  disabled={!handHistory.flop?.board || !handHistory.flop.board.length}
                >
                  Turn
                </button>
                <button
                  onClick={() => setActiveStage('river')}
                  className={`px-4 py-2 text-base font-medium ${activeStage === 'river' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
                  disabled={!handHistory.turn?.board || !handHistory.turn.board.length}
                >
                  River
                </button>
              </div>

              {/* Active Stage Component */}
              {activeStage === 'preflop' && (
                <div>
                  <StreetActions
                    streetName="Preflop"
                    players={players}
                    street={handHistory.preflop}
                    gameState={gameState}
                    onUpdate={(street) => updateStreet('preflop', street)}
                    usedCards={gameState.getUsedCards('preflop')}
                    calculateEffectiveStack={calculateEffectiveStackAtStreetStart}
                    allPlayersAllIn={false}
                    actionsDisabledDueToAllIn={false}
                    blinds={stakes}
                    straddleAmount={straddle ? straddleAmount : 0}
                  />
                  <div className="flex justify-between mt-4">
                    <button
                      onClick={goToPreviousStage}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Back
                    </button>
                    <button
                      onClick={goToNextStage}
                      disabled={!handHistory.preflop?.actions || handHistory.preflop.actions.length === 0}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Next: Flop
                    </button>
                  </div>
                </div>
              )}
              
              {activeStage === 'flop' && (
                <div>
                  <StreetActions
                    streetName="Flop"
                    players={players}
                    street={handHistory.flop || { actions: [] }}
                    gameState={gameState}
                    onUpdate={(street) => updateStreet('flop', street)}
                    previousStreet={handHistory.preflop}
                    usedCards={gameState.getUsedCards('flop')}
                    calculateEffectiveStack={calculateEffectiveStackAtStreetStart}
                    allPlayersAllIn={gameState.isAllPlayersAllIn('preflop')}
                    actionsDisabledDueToAllIn={gameState.isAllPlayersAllIn('preflop')}
                    previousCards={{ flop: handHistory.flop?.board }}
                    blinds={stakes}
                    straddleAmount={straddle ? straddleAmount : 0}
                    preflopPot={calculatePotForStreet('preflop')}
                  />
                  <div className="flex justify-between mt-4">
                    <button
                      onClick={goToPreviousStage}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Back
                    </button>
                    <button
                      onClick={goToNextStage}
                      disabled={(!handHistory.flop?.board || handHistory.flop.board.length !== 3) && !gameState.isAllPlayersAllIn('flop')}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Next: Turn
                    </button>
                  </div>
                </div>
              )}
              
              {activeStage === 'turn' && (
                <div>
                  <StreetActions
                    streetName="Turn"
                    players={players}
                    street={handHistory.turn || { actions: [] }}
                    gameState={gameState}
                    onUpdate={(street) => updateStreet('turn', street)}
                    previousStreet={handHistory.flop}
                    usedCards={gameState.getUsedCards('turn')}
                    calculateEffectiveStack={calculateEffectiveStackAtStreetStart}
                    allPlayersAllIn={gameState.isAllPlayersAllIn('preflop') || gameState.isAllPlayersAllIn('flop')}
                    actionsDisabledDueToAllIn={gameState.isAllPlayersAllIn('preflop') || gameState.isAllPlayersAllIn('flop')}
                    previousCards={{
                      flop: handHistory.flop?.board,
                      turn: handHistory.turn?.board
                    }}
                    blinds={stakes}
                    straddleAmount={straddle ? straddleAmount : 0}
                    preflopPot={calculatePotForStreet('preflop')}
                    flopPot={calculatePotForStreet('flop')}
                  />
                  <div className="flex justify-between mt-4">
                    <button
                      onClick={goToPreviousStage}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Back
                    </button>
                    <button
                      onClick={goToNextStage}
                      disabled={(!handHistory.turn?.board || handHistory.turn.board.length !== 1) && !gameState.isAllPlayersAllIn('turn')}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Next: River
                    </button>
                  </div>
                </div>
              )}
              
              {activeStage === 'river' && (
                <div>
                  <StreetActions
                    streetName="River"
                    players={players}
                    street={handHistory.river || { actions: [] }}
                    gameState={gameState}
                    onUpdate={(street) => updateStreet('river', street)}
                    previousStreet={handHistory.turn}
                    usedCards={gameState.getUsedCards('river')}
                    calculateEffectiveStack={calculateEffectiveStackAtStreetStart}
                    allPlayersAllIn={gameState.isAllPlayersAllIn('preflop') || gameState.isAllPlayersAllIn('flop') || gameState.isAllPlayersAllIn('turn')}
                    actionsDisabledDueToAllIn={gameState.isAllPlayersAllIn('preflop') || gameState.isAllPlayersAllIn('flop') || gameState.isAllPlayersAllIn('turn')}
                    previousCards={{
                      flop: handHistory.flop?.board,
                      turn: handHistory.turn?.board
                    }}
                    blinds={stakes}
                    straddleAmount={straddle ? straddleAmount : 0}
                    preflopPot={calculatePotForStreet('preflop')}
                    flopPot={calculatePotForStreet('flop')}
                    turnPot={calculatePotForStreet('turn')}
                  />
                  <div className="flex justify-between mt-4">
                    <button
                      onClick={goToPreviousStage}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div ref={previewRef} className="lg:col-span-2 bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Hand History</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={resetHand}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-blue-500 text-blue-500 hover:bg-blue-50 transition-colors"
              >
                <span>New Hand</span>
              </button>
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
            <div className="font-semibold text-base">Blinds: ${stakes.sb}/${stakes.bb}</div>
            {straddle && (
              <div className="font-semibold text-base">Straddle: ${straddleAmount}</div>
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
            <div className="mt-1"><span className="font-semibold">Effective Stack:</span> ${Math.min(...players.map(p => p.stack))}</div>
            
            {handHistory.preflop.actions.length > 0 && (
              <div className="mt-4">
                <div className="font-semibold">Preflop ({useDollars ? '$' : ''}{calculatePotForStreet('preflop')}{!useDollars ? 'BB' : ''}):</div>
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
                  Flop ({useDollars ? '$' : ''}{calculatePotForStreet('flop')}{!useDollars ? 'BB' : ''}): {' '}
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
                  {handHistory.flop.actions.map((action, idx) => (
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
                  Turn ({useDollars ? '$' : ''}{calculatePotForStreet('turn')}{!useDollars ? 'BB' : ''}): {' '}
                  {/* Show flop cards first */}
                  {handHistory.flop?.board && handHistory.flop.board.map((card, idx) => (
                    <span key={`flop-${idx}`} className={card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                      {card.rank}
                      {card.suit === 'hearts' ? '♥' : 
                       card.suit === 'diamonds' ? '♦' : 
                       card.suit === 'clubs' ? '♣' : '♠'} 
                    </span>
                  ))}
                  {" "} {/* Add space before turn card */}
                  {/* Turn card */}
                  <span className={handHistory.turn.board[0].suit === 'hearts' || 
                                handHistory.turn.board[0].suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                    {handHistory.turn.board[0].rank}
                    {handHistory.turn.board[0].suit === 'hearts' ? '♥' : 
                     handHistory.turn.board[0].suit === 'diamonds' ? '♦' : 
                     handHistory.turn.board[0].suit === 'clubs' ? '♣' : '♠'}
                  </span>
                </div>
                <div className="pl-4">
                  {handHistory.turn.actions.map((action, idx) => (
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
                  River ({useDollars ? '$' : ''}{calculatePotForStreet('river')}{!useDollars ? 'BB' : ''}): {' '}
                  {/* All previous cards */}
                  {handHistory.flop?.board && handHistory.flop.board.map((card, idx) => (
                    <span key={`flop-${idx}`} className={card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                      {card.rank}
                      {card.suit === 'hearts' ? '♥' : 
                       card.suit === 'diamonds' ? '♦' : 
                       card.suit === 'clubs' ? '♣' : '♠'} 
                    </span>
                  ))}
                  {" "} {/* Add space before turn card */}
                  {handHistory.turn?.board && handHistory.turn.board.map((card, idx) => (
                    <span key={`turn-${idx}`} className={card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                      {card.rank}
                      {card.suit === 'hearts' ? '♥' : 
                       card.suit === 'diamonds' ? '♦' : 
                       card.suit === 'clubs' ? '♣' : '♠'} 
                    </span>
                  ))}
                  {" "} {/* Add space before river card */}
                  {/* River card */}
                  <span className={handHistory.river.board[0].suit === 'hearts' || 
                                handHistory.river.board[0].suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}>
                    {handHistory.river.board[0].rank}
                    {handHistory.river.board[0].suit === 'hearts' ? '♥' : 
                     handHistory.river.board[0].suit === 'diamonds' ? '♦' : 
                     handHistory.river.board[0].suit === 'clubs' ? '♣' : '♠'}
                  </span>
                </div>
                <div className="pl-4">
                  {handHistory.river.actions.map((action, idx) => (
                    <div key={idx} className="ml-4 -indent-4">
                      {action.player} {action.type === 'raise' ? 'raises to' : action.type} 
                      {action.amount ? ` ${useDollars ? '$' : ''}${action.amount}${!useDollars ? 'BB' : ''}` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-4 font-semibold">Total pot: {useDollars ? '$' : ''}{gameState.calculateTotalPot('river')}{!useDollars ? 'BB' : ''}</div>
            
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