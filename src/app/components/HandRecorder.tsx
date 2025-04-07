'use client';

import { useState, useRef } from 'react';
import { Player, HandHistory, Street } from '../types/poker';
import PlayerInput from './PlayerInput';
import StreetActions from './StreetActions';

const HandRecorder = () => {
  const [players, setPlayers] = useState<Player[]>([
    // Initialize with Hero
    {
      position: 'BTN',
      stack: 100,
      playerType: 'Unknown',
      isHero: true,
    }
  ]);

  const [handHistory, setHandHistory] = useState<HandHistory>({
    id: crypto.randomUUID(),
    date: new Date(),
    players: players,
    preflop: { actions: [] },
    flop: { actions: [] },
    turn: { actions: [] },
    river: { actions: [] },
    pot: 0
  });

  const previewRef = useRef<HTMLDivElement>(null);

  const addPlayer = () => {
    if (players.length < 9) { // Max 9 players at a table
      const newPlayer: Player = {
        position: 'BB',
        stack: 100,
        playerType: 'Unknown',
        isHero: false,
      };
      
      const newPlayers = [...players, newPlayer];
      setPlayers(newPlayers);
      setHandHistory(prev => ({ ...prev, players: newPlayers }));
    }
  };

  const updatePlayer = (index: number, updatedPlayer: Player) => {
    const newPlayers = [...players];
    newPlayers[index] = updatedPlayer;
    setPlayers(newPlayers);
    setHandHistory(prev => ({ ...prev, players: newPlayers }));
  };

  const removePlayer = (index: number) => {
    if (!players[index].isHero) {
      const newPlayers = players.filter((_, i) => i !== index);
      setPlayers(newPlayers);
      setHandHistory(prev => ({ ...prev, players: newPlayers }));
    }
  };

  const updateStreet = (streetName: 'preflop' | 'flop' | 'turn' | 'river', street: Street) => {
    setHandHistory(prev => ({
      ...prev,
      [streetName]: street
    }));
  };

  const generateHandHistory = () => {
    console.log('Current hand history:', handHistory);
    // In a real app, this would generate and share the hand history
    alert('Hand history generation feature coming soon!');
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form Panel */}
        <div className="rounded-xl shadow-lg p-8" style={{ backgroundColor: 'white' }}>
          <h2 className="text-3xl font-bold mb-6" style={{ color: 'rgb(31, 41, 55)' }}>Record Hand History</h2>
          <div className="space-y-8">
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
                  />
                ))}
              </div>
            </div>

            {/* Street Actions */}
            <div className="space-y-6">
              <StreetActions
                streetName="Preflop"
                players={players}
                street={handHistory.preflop || { actions: [] }}
                onUpdate={(street) => updateStreet('preflop', street)}
              />
              
              <StreetActions
                streetName="Flop"
                players={players}
                street={handHistory.flop || { actions: [] }}
                onUpdate={(street) => updateStreet('flop', street)}
                previousStreet={handHistory.preflop || { actions: [] }}
              />
              
              <StreetActions
                streetName="Turn"
                players={players}
                street={handHistory.turn || { actions: [] }}
                onUpdate={(street) => updateStreet('turn', street)}
                previousStreet={handHistory.flop || { actions: [] }}
              />
              
              <StreetActions
                streetName="River"
                players={players}
                street={handHistory.river || { actions: [] }}
                onUpdate={(street) => updateStreet('river', street)}
                previousStreet={handHistory.turn || { actions: [] }}
              />
            </div>

            <button
              type="button"
              onClick={generateHandHistory}
              className="w-full py-3 px-6 rounded-lg text-lg font-semibold shadow-md transition-all"
              style={{
                backgroundColor: 'rgb(37, 99, 235)',
                color: 'white',
              }}
            >
              Generate Hand History
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div 
          ref={previewRef} 
          className="rounded-xl shadow-lg p-8"
          style={{ 
            backgroundColor: 'rgb(17, 24, 39)',
            color: 'white'
          }}
        >
          <h2 className="text-3xl font-bold mb-6">Hand Preview</h2>
          <div className="space-y-3">
            {players.map((player, index) => (
              <div key={index} className="text-base">
                {player.isHero ? 'Hero' : 'Villain'} ({player.position}): {player.stack} BB
                {player.holeCards && player.isHero && (
                  <span className="ml-2">
                    with {player.holeCards[0].rank}{player.holeCards[0].suit === 'hearts' ? '♥' : 
                            player.holeCards[0].suit === 'diamonds' ? '♦' : 
                            player.holeCards[0].suit === 'clubs' ? '♣' : '♠'} 
                    {player.holeCards[1].rank}{player.holeCards[1].suit === 'hearts' ? '♥' : 
                            player.holeCards[1].suit === 'diamonds' ? '♦' : 
                            player.holeCards[1].suit === 'clubs' ? '♣' : '♠'}
                  </span>
                )}
                {player.playerType !== 'Unknown' && (
                  <span className="ml-2" style={{ color: 'rgb(96, 165, 250)' }}>• {player.playerType}</span>
                )}
                {player.notes && (
                  <span className="ml-2" style={{ color: 'rgb(156, 163, 175)' }}>- {player.notes}</span>
                )}
              </div>
            ))}
            
            {/* Show hand actions */}
            {handHistory.preflop.actions.length > 0 && (
              <div className="mt-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 className="text-lg mb-2">Preflop</h3>
                <div className="space-y-1">
                  {handHistory.preflop.actions.map((action, idx) => (
                    <div key={idx} className="text-sm" style={{ color: 'rgb(209, 213, 219)' }}>
                      {action.player}: {action.type} {action.amount ? `${action.amount}BB` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {handHistory.flop?.board && handHistory.flop.board.length > 0 && (
              <div className="mt-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 className="text-lg mb-2">Flop</h3>
                <div className="mb-2">
                  {handHistory.flop.board.map((card, idx) => (
                    <span key={idx} className="mr-2" style={{ 
                      color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'rgb(239, 68, 68)' : 'white'
                    }}>
                      {card.rank}
                      {card.suit === 'hearts' ? '♥' : 
                        card.suit === 'diamonds' ? '♦' : 
                        card.suit === 'clubs' ? '♣' : '♠'} 
                    </span>
                  ))}
                </div>
                <div className="space-y-1">
                  {handHistory.flop.actions.map((action, idx) => (
                    <div key={idx} className="text-sm" style={{ color: 'rgb(209, 213, 219)' }}>
                      {action.player}: {action.type} {action.amount ? `${action.amount}BB` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Similar sections for Turn and River */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandRecorder; 