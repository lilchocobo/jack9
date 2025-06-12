'use client';

import { getChipStyle } from '@/constants/denominations';

interface BottomChipProps {
  chipValue: number;
  position: { top: number; left: number };
  zIndex: number;
  isSelected?: boolean;
}

export default function BottomChip({
  chipValue,
  position,
  zIndex,
  isSelected = false
}: BottomChipProps) {
  const chipStyle = getChipStyle(chipValue);
  const borderColor = isSelected ? 'border-yellow-400' : 'border-black';

  // Get the background color for the chip - handles both whole dollars and penny amounts
  const getBackgroundColor = (value: number) => {
    if (value < 1) return 'bg-gray-300'; // Light grey for penny chips
    if (value >= 1000000) return 'bg-amber-500'; // Golden $1M chips
    if (value >= 500000) return 'bg-violet-600'; // Royal purple $500K chips
    if (value >= 100000) return 'bg-rose-600'; // Rich red $100K chips
    if (value >= 50000) return 'bg-emerald-600'; // Rich green $50K chips
    if (value >= 10000) return 'bg-orange-600'; // Rich orange $10K chips
    if (value >= 5000) return 'bg-yellow-500'; // Golden $5K chips
    if (value >= 1000) return 'bg-gray-900';
    if (value >= 500) return 'bg-purple-600';
    if (value >= 100) return 'bg-red-500';
    if (value >= 50) return 'bg-orange-500';
    if (value >= 20) return 'bg-green-500';
    if (value >= 10) return 'bg-blue-500';
    if (value >= 5) return 'bg-yellow-400';
    if (value >= 1) return 'bg-cyan-400';
    return 'bg-gray-300'; // Fallback to light grey
  };

  const bgColor = getBackgroundColor(chipValue);

  return (
    <div className="absolute">
      {/* Bottom circle fill */}
      <div 
        className={`absolute w-36 h-36 rounded-full ${bgColor} transition-all duration-300`}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          zIndex: zIndex
        }}
      />
      
      {/* Bottom circle stroke */}
      <div 
        className={`absolute w-36 h-36 border-4 ${borderColor} rounded-full bg-transparent transition-all duration-300`}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          zIndex: zIndex + 100,
          clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)'
        }}
      />
    </div>
  );
}