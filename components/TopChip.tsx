'use client';

import { getChipStyle } from '@/constants/denominations';

interface TopChipProps {
  imageUrl: string;
  text: string;
  chipValue: number;
  position: { top: number; left: number };
  zIndex: number;
  isSelected?: boolean;
  stackHeight: number;
  gapBetweenLayers: number;
  tokenSymbol?: string; // Add token symbol for dynamic spacing calculation
}

export default function TopChip({
  imageUrl,
  text,
  chipValue,
  position,
  zIndex,
  isSelected = false,
  stackHeight,
  gapBetweenLayers,
  tokenSymbol = "TOKEN"
}: TopChipProps) {
  const chipStyle = getChipStyle(chipValue);
  const borderColor = isSelected ? 'border-yellow-400' : 'border-black';
  const imageBorderColor = isSelected ? 'border-yellow-400' : 'border-black';

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

  // Calculate the correct height for connecting lines
  // For single chip: connect top circle center to TopChip's bottom circle center
  // For multiple chips: connect top circle center to last BottomChip's center
  // Formula: stackHeight * gapBetweenLayers
  const connectingLineHeight = stackHeight * gapBetweenLayers;

  // Calculate perfect text distribution around entire circumference
  const calculateEvenTextDistribution = (symbol: string) => {
    // Clean the symbol and ensure it starts with $
    const cleanSymbol = symbol.startsWith('$') ? symbol : `$${symbol}`;
    
    // Calculate how many times we can fit the symbol around the circle
    const fontSize = 14;
    const radius = 54; // SVG circle radius
    const circumference = 2 * Math.PI * radius; // ~339px
    
    // Estimate character width (using worst-case for consistency)
    const avgCharWidth = fontSize * 0.6; // Conservative estimate
    const symbolWidth = cleanSymbol.length * avgCharWidth;
    const separatorWidth = 1.5 * avgCharWidth; // " • " width (reduced)
    
    // Find optimal number of repetitions
    let bestReps = 3;
    for (let reps = 8; reps >= 3; reps--) {
      const totalContentWidth = reps * (symbolWidth + separatorWidth);
      if (totalContentWidth <= circumference * 0.9) { // Leave 10% margin
        bestReps = reps;
        break;
      }
    }
    
    // Calculate positions for symbols and dots
    const totalElements = bestReps * 2; // symbols + dots
    const elementAngle = 360 / totalElements; // Degrees per element
    
    console.log(`${cleanSymbol}: ${bestReps} symbols + ${bestReps} dots = ${totalElements} elements, ${elementAngle}° per element`);
    
    return {
      repetitions: bestReps,
      elementAngle,
      symbol: cleanSymbol
    };
  };

  const { repetitions, elementAngle, symbol } = calculateEvenTextDistribution(tokenSymbol);
  const uniqueId = `circle-${isSelected ? 'selected' : 'original'}-${chipValue}-${position.top}-${tokenSymbol}`;

  return (
    <div className="absolute">
      {/* Top circle with image and evenly distributed text */}
      <div 
        className={`absolute w-36 h-36 border-4 ${borderColor} rounded-full flex items-center justify-center ${bgColor} transition-all duration-300`}
        style={{ 
          top: `${position.top}px`,
          left: `${position.left}px`,
          zIndex: zIndex + 200 // Highest z-index for top
        }}
      >
        <img 
          src={imageUrl}
          alt="Token"
          className={`w-20 h-20 border-4 ${imageBorderColor} rounded-full object-cover transition-all duration-300`}
        />
        
        {/* Evenly distributed circular text SVG */}
        <svg 
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 144 144"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <path 
              id={uniqueId}
              d="M 72 18 A 54 54 0 1 1 71.8 18"
              fill="none"
            />
          </defs>
          
          {/* Create symbols and dots independently for perfect centering */}
          {Array.from({ length: repetitions }, (_, index) => {
            const symbolPosition = (index * 2) * elementAngle; // Even positions for symbols
            const dotPosition = (index * 2 + 1) * elementAngle; // Odd positions for dots
            
            const symbolOffset = (symbolPosition / 360) * 100; // Convert to percentage
            const dotOffset = (dotPosition / 360) * 100; // Convert to percentage
            
            return [
              // Symbol
              <text 
                key={`symbol-${index}`}
                fontSize="14" 
                fontWeight="bold" 
                fill={chipStyle.textColor}
                fontFamily="Arial, sans-serif"
                letterSpacing="0px"
              >
                <textPath 
                  href={`#${uniqueId}`} 
                  startOffset={`${symbolOffset}%`}
                >
                  {symbol}
                </textPath>
              </text>,
              
              // Dot (centered between this symbol and the next)
              <text 
                key={`dot-${index}`}
                fontSize="14" 
                fontWeight="bold" 
                fill={chipStyle.textColor}
                fontFamily="Arial, sans-serif"
              >
                <textPath 
                  href={`#${uniqueId}`} 
                  startOffset={`${dotOffset}%`}
                  textAnchor="middle"
                >
                  •
                </textPath>
              </text>
            ];
          }).flat()}
        </svg>
      </div>

      {/* Bottom circle for TopChip's 3D effect - this is part of the same logical chip */}
      <div 
        className={`absolute w-36 h-36 rounded-full ${bgColor} transition-all duration-300`}
        style={{
          top: `${position.top + gapBetweenLayers}px`,
          left: `${position.left}px`,
          zIndex: zIndex
        }}
      />
      
      {/* Bottom circle stroke for TopChip's 3D effect */}
      <div 
        className={`absolute w-36 h-36 border-4 ${borderColor} rounded-full bg-transparent transition-all duration-300`}
        style={{
          top: `${position.top + gapBetweenLayers}px`,
          left: `${position.left}px`,
          zIndex: zIndex + 100,
          clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)'
        }}
      />

      {/* Connecting lines - Always render for 3D cylinder effect */}
      {/* Left connecting line */}
      <div 
        className={`absolute border-l-4 ${borderColor} transition-all duration-300`}
        style={{
          left: `${position.left}px`,
          top: `${position.top + 72}px`, // Start from center of top circle
          height: `${connectingLineHeight}px`, // Connect to center of last circle
          zIndex: zIndex + 150
        }}
      />
      {/* Right connecting line */}
      <div 
        className={`absolute border-l-4 ${borderColor} transition-all duration-300`}
        style={{
          left: `${position.left + 140}px`, // 144px - 4px for border width
          top: `${position.top + 72}px`, // Start from center of top circle  
          height: `${connectingLineHeight}px`, // Connect to center of last circle
          zIndex: zIndex + 150
        }}
      />
    </div>
  );
}