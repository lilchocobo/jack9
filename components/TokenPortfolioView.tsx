'use client';

import ChipStack from './ChipStack';
import TokenControls from './TokenControls';
import { useEffect, useRef, useState } from 'react';

interface TokenPortfolioViewProps {
  stackValues: number[];
  sliderValues: number[]; // Now represents percentages (0-100)
  onSliderChange: (index: number, percentage: number) => void; // Now takes percentage
  filteredTokens?: any[];
  totalColumns: number;
  getTokenImage: (index: number) => string;
  getTokenSymbol: (index: number) => string;
  getRawTokenAmount: (index: number) => string;
  getColumnForToken: (tokenIndex: number, totalTokens: number) => number;
  tokenPricesInSol: Record<string, number | null>;
  solPrice: number | null;
}

export default function TokenPortfolioView({
  stackValues,
  sliderValues, // Now percentages 0-100
  onSliderChange,
  filteredTokens,
  totalColumns,
  getTokenImage,
  getTokenSymbol,
  getRawTokenAmount,
  getColumnForToken,
  tokenPricesInSol,
  solPrice
}: TokenPortfolioViewProps) {

  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldCenter, setShouldCenter] = useState(false);

  // Check if we should center the grid
  useEffect(() => {
    const checkCentering = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      const totalGridWidth = totalColumns * 140; // 140px per column
      const paddingWidth = 0; // px-12 = 48px on each side
      const availableWidth = containerWidth - paddingWidth;
      
      // Center only if there's at least 40px extra space
      setShouldCenter(availableWidth > totalGridWidth + 40);
    };

    checkCentering();
    window.addEventListener('resize', checkCentering);
    return () => window.removeEventListener('resize', checkCentering);
  }, [totalColumns]);

  // Calculate display values - convert percentages to token counts to USD values for display
  const getDisplayValues = (index: number) => {
    const token = filteredTokens?.[index];
    if (!token || !tokenPricesInSol || !solPrice) {
      return { selectedValue: 0, remainingValue: 0 };
    }

    const percentage = sliderValues[index] ?? 50; // Default to 50%
    const selectedTokenCount = (token.amount * percentage) / 100;
    const remainingTokenCount = token.amount - selectedTokenCount;
    
    const tokenPriceInSol = tokenPricesInSol[token.mint];
    if (!tokenPriceInSol) {
      return { selectedValue: 0, remainingValue: 0 };
    }

    // Convert token counts to USD values for display
    const selectedValueInSol = selectedTokenCount * tokenPriceInSol;
    const remainingValueInSol = remainingTokenCount * tokenPriceInSol;
    
    const selectedValue = selectedValueInSol * solPrice;
    const remainingValue = remainingValueInSol * solPrice;

    return {
      selectedValue: Math.round(selectedValue * 100) / 100,
      remainingValue: Math.round(remainingValue * 100) / 100
    };
  };

  // Format currency values for display
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  };

  // Calculate two-row layout for selected tokens with bottom row always having more
  // ONLY include tokens that have actually been selected (percentage > 0)
  const getSelectedTokenLayout = () => {
    const selectedTokens = stackValues
      .map((value, index) => ({ value, index }))
      .filter((token, index) => {
        const percentage = sliderValues[index] ?? 0;
        return percentage > 0; // Only include tokens with positive percentages
      });
    
    if (selectedTokens.length === 0) {
      return {
        bottomRow: [],
        topRow: []
      };
    }
    
    if (selectedTokens.length <= 5) {
      // Single row for 5 or fewer tokens
      return {
        bottomRow: selectedTokens,
        topRow: []
      };
    }
    
    // Split into two rows ensuring bottom row always has at least 1 more token
    // Fixed calculation: add 1 to total before dividing to ensure bottom row always has more
    const bottomRowSize = Math.ceil((selectedTokens.length + 1) / 2);
    const topRowSize = selectedTokens.length - bottomRowSize;
    
    const bottomRow = selectedTokens.slice(0, bottomRowSize);
    const topRow = selectedTokens.slice(bottomRowSize);
    
    return { bottomRow, topRow };
  };

  const { bottomRow, topRow } = getSelectedTokenLayout();
  const hasTopRow = topRow.length > 0;
  const hasAnySelected = bottomRow.length > 0;

  return (
    <div className="w-full h-full flex flex-col " ref={containerRef}>
      {/* Selected stacks - modified for two-row layout */}
      <div className="relative h-1/2 w-full  overflow-visible pt-12">
        {/* Only show selected stacks if there are any */}
        {hasAnySelected && (
          <>
            {/* Bottom Row */}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-center z-20" style={{ minWidth: 'fit-content' }}>
              {bottomRow.map(({ value, index: tokenIndex }, displayIndex) => {
                const { selectedValue } = getDisplayValues(tokenIndex);
                
                return (
                  <div 
                    key={`selected-bottom-${tokenIndex}`} 
                    className="animate-in fade-in duration-300 group relative"
                    style={{
                      // Create extremely tight spacing with heavy overlap
                      marginLeft: displayIndex === 0 ? '0' : '-60px', // Heavy 60px overlap
                      zIndex: 100 + bottomRow.length - displayIndex // Higher z-index for bottom row (appears in front)
                    }}
                  >
                    {/* Value card */}
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50"
                         style={{ transform: 'translateX(-50%) scale(1)' }}> 
                      <div className="px-1.5 py-0.5 rounded-xl border border-[#FFD700]/60 shadow-sm backdrop-blur-sm"
                           style={{
                             background: 'rgba(74, 14, 78, 0.4)',
                             boxShadow: `
                               0 0 4px rgba(255, 215, 0, 0.3),
                               inset 0 0.5px 0 rgba(255, 215, 0, 0.2),
                               inset 0 -0.5px 0 rgba(0, 0, 0, 0.2)
                             `
                           }}>
                        <div className="text-center">
                          <div className="text-[10px] font-bold text-[#FFD700] leading-none"
                               style={{ 
                                 fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                                 textShadow: "0.5px 0.5px 0 #000000"
                               }}>
                            {formatCurrency(selectedValue)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        transform: `scale(0.5)`,
                        transformOrigin: 'center bottom'
                      }}
                    >
                      <ChipStack
                        value={value}
                        showType="selected"
                        sliderValue={selectedValue}
                        tokenImage={getTokenImage(tokenIndex)}
                        tokenSymbol={getTokenSymbol(tokenIndex)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Top Row - Much closer and overlapping, behind bottom row */}
            {hasTopRow && (
              <div 
                className="absolute inset-x-0 flex items-end justify-center z-10" 
                style={{ 
                  minWidth: 'fit-content',
                  bottom: '45px' // Much closer - only 45px above bottom row for overlapping effect
                }}
              >
                {/* Offset container by 72px (1/2 chip stack width) to the right */}
                <div 
                  className="flex items-end justify-center"
                  style={{ 
                    marginLeft: '72px' // 1/2 chip stack width (144px / 2 = 72px) to the right
                  }}
                >
                  {topRow.map(({ value, index: tokenIndex }, displayIndex) => {
                    const { selectedValue } = getDisplayValues(tokenIndex);
                    
                    return (
                      <div 
                        key={`selected-top-${tokenIndex}`} 
                        className="animate-in fade-in duration-300 group relative"
                        style={{
                          marginLeft: displayIndex === 0 ? '0' : '-60px', // Same overlap as bottom row
                          zIndex: topRow.length - displayIndex // Lower z-index to appear behind bottom row
                        }}
                      >
                        {/* Value card */}
                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50"
                             style={{ transform: 'translateX(-50%) scale(1)' }}> 
                          <div className="px-1.5 py-0.5 rounded-xl border border-[#FFD700]/60 shadow-sm backdrop-blur-sm"
                               style={{
                                 background: 'rgba(74, 14, 78, 0.4)',
                                 boxShadow: `
                                   0 0 4px rgba(255, 215, 0, 0.3),
                                   inset 0 0.5px 0 rgba(255, 215, 0, 0.2),
                                   inset 0 -0.5px 0 rgba(0, 0, 0, 0.2)
                                 `
                               }}>
                            <div className="text-center">
                              <div className="text-[10px] font-bold text-[#FFD700] leading-none"
                                   style={{ 
                                     fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                                     textShadow: "0.5px 0.5px 0 #000000"
                                   }}>
                                {formatCurrency(selectedValue)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            transform: `scale(0.5)`,
                            transformOrigin: 'center bottom'
                          }}
                        >
                          <ChipStack
                            value={value}
                            showType="selected"
                            sliderValue={selectedValue}
                            tokenImage={getTokenImage(tokenIndex)}
                            tokenSymbol={getTokenSymbol(tokenIndex)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Show message when no tokens are selected */}
        {!hasAnySelected && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold text-[#FFD700] mb-2"
                   style={{ 
                     fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                     textShadow: "0.5px 0.5px 0 #000000"
                   }}>
                No Tokens Selected
              </div>
              <div className="text-sm text-[#FFFF00]"
                   style={{ 
                     fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                     textShadow: "0.5px 0.5px 0 #000000"
                   }}>
                Use the sliders below to select token amounts
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Combined remaining stacks and controls in single scrollable container */}
      <div className="relative flex-1 w-full">
        {/* Scrollable wrapper */}
        <div className={`h-full  ${shouldCenter ? '' : 'overflow-x-auto'}`}>
          <div
            className="rounded-lg  h-full"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${totalColumns}, 140px)`, // Fixed 140px columns
              gridTemplateRows: 'auto auto', // Two rows: remaining stacks on top, controls below
              gap: '0',
              justifyContent: shouldCenter ? 'center' : 'start', // Dynamic centering
              minWidth: shouldCenter ? 'auto' : `${totalColumns * 140}px` // Ensure minimum width for scrolling
            }}
          >
            {/* Row 1: Remaining Stacks */}
            {Array.from({ length: totalColumns }, (_, columnIndex) => {
              const columnNumber = columnIndex + 1;

              // Find token that should be in this column
              const tokenIndex = stackValues.findIndex((_, index) =>
                getColumnForToken(index, stackValues.length) === columnNumber
              );

              const hasToken = tokenIndex !== -1;
              const value = hasToken ? stackValues[tokenIndex] : 0;
              const { remainingValue } = hasToken ? getDisplayValues(tokenIndex) : { remainingValue: 0 };

              return (
                <div
                  key={`remaining-col-${columnNumber}`}
                  className="flex flex-col items-center justify-end p-2 max-h-[200px] relative"
                  style={{
                    minWidth: '140px',
                    maxWidth: '140px',
                    gridRow: 1 // First row
                  }}
                >
                  {hasToken ? (
                    <div className="relative">
                      {/* Small semi-transparent value card overlayed on the stack near bottom */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40"
                           style={{ transform: 'translateX(-50%) scale(1)' }}> 
                        <div className="px-1.5 py-0.5 rounded-xl border border-[#FFD700]/60 shadow-sm backdrop-blur-sm"
                             style={{
                               background: 'rgba(74, 14, 78, 0.4)',
                               boxShadow: `
                                 0 0 4px rgba(255, 215, 0, 0.3),
                                 inset 0 0.5px 0 rgba(255, 215, 0, 0.2),
                                 inset 0 -0.5px 0 rgba(0, 0, 0, 0.2)
                               `
                             }}>
                          <div className="text-center">
                            <div className="text-[10px] font-bold text-[#FFD700] leading-none"
                                 style={{ 
                                   fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                                   textShadow: "0.5px 0.5px 0 #000000"
                                 }}>
                              {formatCurrency(remainingValue)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          transform: `scale(0.5)`,
                          transformOrigin: 'center bottom'
                        }}
                      >
                        <ChipStack
                          value={value}
                          showType="remaining"
                          sliderValue={remainingValue}
                          tokenImage={getTokenImage(tokenIndex)}
                          tokenSymbol={getTokenSymbol(tokenIndex)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-black/50 text-center">
                      Empty Column {columnNumber}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Row 2: Controls - Now using the extracted TokenControls component */}
            <div 
              className="col-span-full"
              style={{
                gridRow: 2,
                gridColumn: `1 / -1` // Span all columns
              }}
            >
              <TokenControls
                totalColumns={totalColumns}
                stackValues={stackValues}
                filteredTokens={filteredTokens}
                sliderValues={sliderValues} // Now percentages
                onSliderChange={onSliderChange}
                getTokenSymbol={getTokenSymbol}
                getColumnForToken={getColumnForToken}
                getDisplayValues={getDisplayValues}
                tokenPricesInSol={tokenPricesInSol}
                solPrice={solPrice}
                shouldCenter={shouldCenter}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}