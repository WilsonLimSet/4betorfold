'use client';

import { useState } from 'react';

interface StakeSelectorProps {
  onStakeSelect: (smallBlind: number, bigBlind: number) => void;
  onGameTypeChange: (isCash: boolean) => void;
  selectedStakes: { sb: number; bb: number; };
}

const commonStakes = [
  { sb: 1, bb: 2, label: '$1/$2' },
  { sb: 2, bb: 3, label: '$2/$3' },
  { sb: 2, bb: 5, label: '$2/$5' },
  { sb: 5, bb: 5, label: '$5/$5' },
  { sb: 5, bb: 10, label: '$5/$10' },
];

export default function StakeSelector({ onStakeSelect, onGameTypeChange, selectedStakes }: StakeSelectorProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customSB, setCustomSB] = useState('');
  const [customBB, setCustomBB] = useState('');
  const [isCashGame, setIsCashGame] = useState(true);

  const handleCustomSubmit = () => {
    const sb = parseFloat(customSB);
    const bb = parseFloat(customBB);
    if (!isNaN(sb) && !isNaN(bb) && sb > 0 && bb > 0) {
      onStakeSelect(sb, bb);
    }
  };

  const handleGameTypeChange = (newIsCash: boolean) => {
    setIsCashGame(newIsCash);
    setIsCustom(!newIsCash); // Automatically set to custom mode for tournaments
    onGameTypeChange(newIsCash);
  };

  return (
    <div className="space-y-4">
      {/* Game Type Toggle */}
      <div className="flex items-center justify-start gap-4 mb-4">
        <button
          onClick={() => handleGameTypeChange(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            isCashGame 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Cash Game
        </button>
        <button
          onClick={() => handleGameTypeChange(false)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            !isCashGame 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tournament
        </button>
      </div>

      {isCashGame ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {commonStakes.map((stake) => (
            <button
              key={stake.label}
              onClick={() => onStakeSelect(stake.sb, stake.bb)}
              className={`px-4 py-2 border-2 rounded-lg text-base font-semibold transition-all
                ${stake.sb === selectedStakes.sb && stake.bb === selectedStakes.bb ? 'bg-blue-500 text-white' : 'bg-white text-gray-900 border-gray-300'}
                hover:border-blue-500 hover:bg-blue-50
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
              {stake.label}
            </button>
          ))}
          <button
            onClick={() => setIsCustom(!isCustom)}
            className={`px-4 py-2 border-2 rounded-lg text-base font-semibold transition-all
              ${isCustom ? 'border-blue-500 bg-blue-50 text-blue-700' : 'bg-white text-gray-900 border-gray-300'}
              hover:border-blue-500 hover:bg-blue-50
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            Custom
          </button>
        </div>
      ) : null}

      {(isCustom || !isCashGame) && (
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <span className="text-gray-700 text-base mr-1">$</span>
            <input
              type="number"
              value={customSB}
              onChange={(e) => setCustomSB(e.target.value)}
              placeholder={isCashGame ? "SB" : "Starting SB"}
              className="w-24 px-3 py-2 border-2 rounded-md text-base text-gray-900"
              min="0"
              step="0.5"
            />
          </div>
          <span className="text-gray-700 text-base">/</span>
          <div className="flex items-center">
            <span className="text-gray-700 text-base mr-1">$</span>
            <input
              type="number"
              value={customBB}
              onChange={(e) => setCustomBB(e.target.value)}
              placeholder={isCashGame ? "BB" : "Starting BB"}
              className="w-24 px-3 py-2 border-2 rounded-md text-base text-gray-900"
              min="0"
              step="0.5"
            />
          </div>
          <button
            onClick={handleCustomSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded-md text-base font-medium
              hover:bg-blue-600 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!customSB || !customBB}
          >
            Set
          </button>
        </div>
      )}
    </div>
  );
} 