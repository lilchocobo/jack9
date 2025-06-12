'use client';

import '../styles/slider.css';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TokenControlsProps {
  totalColumns: number;
  stackValues: number[];
  filteredTokens?: any[];
  sliderValues: number[]; // Now represents percentages (0-100)
  onSliderChange: (index: number, percentage: number) => void; // Now takes percentage
  getTokenSymbol: (index: number) => string;
  getColumnForToken: (tokenIndex: number, totalTokens: number) => number;
  getDisplayValues: (index: number) => { selectedValue: number; remainingValue: number };
  tokenPricesInSol: Record<string, number | null>;
  solPrice: number | null;
  shouldCenter: boolean;
}

export default function TokenControls({
  totalColumns,
  stackValues,
  filteredTokens,
  sliderValues, // Now percentages 0-100
  onSliderChange, // Now takes percentage
  getTokenSymbol,
  getColumnForToken,
  getDisplayValues,
  tokenPricesInSol,
  solPrice,
  shouldCenter
}: TokenControlsProps) {

  // State to track which tokens are expanded
  const [expandedTokens, setExpandedTokens] = useState<Set<number>>(new Set());
  
  // State to track which inputs are currently focused
  const [focusedInputs, setFocusedInputs] = useState<{[key: string]: boolean}>({});

  // Toggle expansion for a specific token
  const toggleExpansion = useCallback((tokenIndex: number) => {
    setExpandedTokens(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tokenIndex)) {
        newSet.delete(tokenIndex);
      } else {
        newSet.add(tokenIndex);
      }
      return newSet;
    });
  }, []);

  // 🔥 IMMEDIATE: Handle slider changes with percentage (0-100)
  const handleSliderChange = useCallback((tokenIndex: number, percentage: number) => {
    console.log(`TokenControls: Immediate slider change for token ${tokenIndex}, percentage: ${percentage}%`);
    onSliderChange(tokenIndex, percentage);
  }, [onSliderChange]);

  // 🔥 IMMEDIATE: Handle input changes - convert to percentage
  const handleTokenCountInput = useCallback((tokenIndex: number, inputValue: string) => {
    const token = filteredTokens?.[tokenIndex];
    if (!token) return;

    // Handle empty string or strings that start with decimal point
    if (inputValue === '' || inputValue === '.') {
      const percentage = 0;
      onSliderChange(tokenIndex, percentage);
      return;
    }

    // Handle partial decimal inputs like "5." or "0."
    if (inputValue.endsWith('.') && !isNaN(parseFloat(inputValue.slice(0, -1)))) {
      const numValue = parseFloat(inputValue.slice(0, -1));
      const clampedValue = Math.min(Math.max(0, numValue), token.amount);
      const percentage = (clampedValue / token.amount) * 100;
      onSliderChange(tokenIndex, percentage);
      return;
    }

    const numValue = parseFloat(inputValue);
    if (isNaN(numValue) && inputValue !== '') return;

    const finalValue = isNaN(numValue) ? 0 : numValue;
    const clampedValue = Math.min(Math.max(0, finalValue), token.amount);
    const percentage = (clampedValue / token.amount) * 100;
    console.log(`TokenControls: Token count input for ${token.symbol}, input: ${inputValue}, percentage: ${percentage}%`);
    onSliderChange(tokenIndex, percentage);
  }, [filteredTokens, onSliderChange]);

  // 🔥 IMMEDIATE: Handle USD input changes - convert to percentage
  const handleUSDInput = useCallback((tokenIndex: number, inputValue: string) => {
    const token = filteredTokens?.[tokenIndex];
    if (!token || !tokenPricesInSol || !solPrice) return;

    // Handle empty string or strings that start with decimal point
    if (inputValue === '' || inputValue === '.') {
      const percentage = 0;
      onSliderChange(tokenIndex, percentage);
      return;
    }

    // Handle partial decimal inputs like "5." or "0."
    if (inputValue.endsWith('.') && !isNaN(parseFloat(inputValue.slice(0, -1)))) {
      const usdValue = parseFloat(inputValue.slice(0, -1));
      const tokenPriceInSol = tokenPricesInSol[token.mint];
      if (!tokenPriceInSol) return;

      const valueInSol = usdValue / solPrice;
      const tokenCount = valueInSol / tokenPriceInSol;
      const clampedTokenCount = Math.min(Math.max(0, tokenCount), token.amount);
      const percentage = (clampedTokenCount / token.amount) * 100;
      onSliderChange(tokenIndex, percentage);
      return;
    }

    const usdValue = parseFloat(inputValue);
    if (isNaN(usdValue) && inputValue !== '') return;

    const finalUsdValue = isNaN(usdValue) ? 0 : usdValue;
    const tokenPriceInSol = tokenPricesInSol[token.mint];
    if (!tokenPriceInSol) return;

    // Convert USD to token count: USD → SOL → Token Count → Percentage
    const valueInSol = finalUsdValue / solPrice;
    const tokenCount = valueInSol / tokenPriceInSol;
    const clampedTokenCount = Math.min(Math.max(0, tokenCount), token.amount);
    const percentage = (clampedTokenCount / token.amount) * 100;
    console.log(`TokenControls: USD input for ${token.symbol}, USD: ${finalUsdValue}, percentage: ${percentage}%`);
    onSliderChange(tokenIndex, percentage);
  }, [filteredTokens, tokenPricesInSol, solPrice, onSliderChange]);

  // 🔥 IMMEDIATE: Handle percentage button clicks
  const handlePercentageClick = useCallback((tokenIndex: number, percentage: number) => {
    const token = filteredTokens?.[tokenIndex];
    if (!token) return;

    console.log(`TokenControls: Percentage ${percentage}% clicked for ${token.symbol}`);
    onSliderChange(tokenIndex, percentage);
  }, [filteredTokens, onSliderChange]);

  // 🔥 OPTIMIZED: Handle slider percentage changes with snapping (only 0 and 100)
  const handleSliderPercentageChange = useCallback((tokenIndex: number, percentage: number) => {
    // Define snap thresholds (within 2% of target) - only for 0 and 100
    const snapThreshold = 2;
    const snapPoints = [0, 100]; // Removed 25, 50, 75
    
    // Find the closest snap point
    let snappedPercentage = percentage;
    for (const snapPoint of snapPoints) {
      if (Math.abs(percentage - snapPoint) <= snapThreshold) {
        snappedPercentage = snapPoint;
        break;
      }
    }
    
    handleSliderChange(tokenIndex, snappedPercentage);
  }, [handleSliderChange]);

  // Smart token formatting function
  const formatTokenAmount = (amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}m`;
    } else if (amount >= 100000) {
      return `${(amount / 1000).toFixed(2)}k`;
    } else if (amount >= 100) {
      return amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else if (amount >= 10) {
      return amount.toFixed(2);
    } else {
      return amount.toFixed(3);
    }
  };

  // Smart USD formatting function
  const formatUSDAmount = (amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}m`;
    } else if (amount >= 100000) {
      return `${(amount / 1000).toFixed(2)}k`;
    } else if (amount >= 100) {
      return amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else {
      return amount.toFixed(2);
    }
  };

  // Calculate token count from percentage
  const getTokenCountFromPercentage = (tokenIndex: number, percentage: number) => {
    const token = filteredTokens?.[tokenIndex];
    if (!token) return 0;
    return (token.amount * percentage) / 100;
  };

  // Get raw USD value for input (always numeric)
  const getRawUSDValue = (tokenIndex: number) => {
    const { selectedValue } = getDisplayValues(tokenIndex);
    return selectedValue;
  };

  // Get formatted USD value for overlay display
  const getFormattedUSDValue = (tokenIndex: number) => {
    const { selectedValue } = getDisplayValues(tokenIndex);
    return formatUSDAmount(selectedValue);
  };

  // Get raw token count for input (calculated from percentage)
  const getRawTokenCount = (tokenIndex: number) => {
    const percentage = sliderValues[tokenIndex] ?? 0;
    return getTokenCountFromPercentage(tokenIndex, percentage);
  };

  // Get formatted token count for overlay display
  const getFormattedTokenCount = (tokenIndex: number) => {
    const tokenCount = getRawTokenCount(tokenIndex);
    return formatTokenAmount(tokenCount);
  };

  // Handle focus events
  const handleInputFocus = useCallback((inputKey: string) => {
    console.log(`TokenControls: Input focused: ${inputKey}`);
    setFocusedInputs(prev => ({
      ...prev,
      [inputKey]: true
    }));
  }, []);

  // Handle blur events
  const handleInputBlur = useCallback((inputKey: string) => {
    console.log(`TokenControls: Input blurred: ${inputKey}`);
    setFocusedInputs(prev => ({
      ...prev,
      [inputKey]: false
    }));
  }, []);

  return (
    <div
      className="rounded-lg h-full relative"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${totalColumns}, 140px)`,
        gridTemplateRows: 'auto',
        gap: '0',
        justifyContent: shouldCenter ? 'center' : 'start',
        minWidth: shouldCenter ? 'auto' : `${totalColumns * 140}px`
      }}
    >
      {/* Controls Row */}
      {Array.from({ length: totalColumns }, (_, columnIndex) => {
        const columnNumber = columnIndex + 1;

        // Find token that should be in this column
        const tokenIndex = stackValues.findIndex((_, index) =>
          getColumnForToken(index, stackValues.length) === columnNumber
        );

        const hasToken = tokenIndex !== -1;
        const token = hasToken ? filteredTokens?.[tokenIndex] : null;
        const value = hasToken ? stackValues[tokenIndex] : 0;
        const { selectedValue } = hasToken ? getDisplayValues(tokenIndex) : { selectedValue: 0 };
        
        // Get current percentage and calculate token count
        const percentage = hasToken ? (sliderValues[tokenIndex] ?? 50) : 0; // Default to 50%
        const selectedTokenCount = hasToken ? getTokenCountFromPercentage(tokenIndex, percentage) : 0;
        const isExpanded = hasToken ? expandedTokens.has(tokenIndex) : false;

        // Check focus states
        const isUSDFocused = focusedInputs[`usd-${tokenIndex}`];
        const isTokenFocused = focusedInputs[`token-${tokenIndex}`];

        console.log(`TokenControls: Rendering column ${columnNumber}, tokenIndex: ${tokenIndex}, hasToken: ${hasToken}, percentage: ${percentage}%, selectedTokenCount: ${selectedTokenCount}, expanded: ${isExpanded}`);

        return (
          <div
            key={`control-col-${columnNumber}`}
            className="flex flex-col items-center p-2 relative"
            style={{
              minWidth: '140px',
              maxWidth: '140px',
              // 🔥 FIXED HEIGHT: Always maintain the same height to prevent layout shifts
              height: '140px',
            }}
          >
            {hasToken && token ? (
              <div className="w-full relative">
                {/* 🔥 BASE CARD: Always fixed height, never changes layout */}
                <div 
                  className="w-full rounded-xl border border-[#FFD700]/60 shadow-sm backdrop-blur-sm relative overflow-hidden"
                  style={{
                    background: 'rgba(74, 14, 78, 0.4)',
                    boxShadow: `
                      0 0 4px rgba(255, 215, 0, 0.3),
                      inset 0 0.5px 0 rgba(255, 215, 0, 0.2),
                      inset 0 -0.5px 0 rgba(0, 0, 0, 0.2)
                    `,
                    height: '140px', // 🔥 FIXED HEIGHT ALWAYS
                  }}
                >
                  <div className="p-3 flex flex-col h-full">
                    {/* Token symbol - always visible */}
                    <div 
                      className="text-sm font-bold text-[#FFD700] mb-2 text-center leading-none"
                      style={{ 
                        fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                        textShadow: "0.5px 0.5px 0 #000000"
                      }}
                    >
                      {getTokenSymbol(tokenIndex)}
                    </div>

                    {/* Slider - always visible */}
                    <div className="relative w-full mb-2 px-1 py-1">
                      {/* Custom visible track background - rounded corners */}
                      <div 
                        className="absolute top-1/2 left-1 right-1 transform -translate-y-1/2 h-2 rounded-lg border border-black"
                        style={{
                          background: 'linear-gradient(90deg, #374151, #4B5563)',
                          borderRadius: '6px',
                          boxShadow: `
                            inset 0 1px 2px rgba(0, 0, 0, 0.3),
                            0 0 4px rgba(255, 215, 0, 0.2)
                          `
                        }}
                      />
                      
                      {/* Progress fill - rounded corners and fixed width calculation */}
                      <div 
                        className="absolute top-1/2 left-1 transform -translate-y-1/2 h-2 rounded-lg"
                        style={{
                          width: `calc((100% - 8px) * ${percentage / 100})`, // Fixed calculation
                          background: 'linear-gradient(to right, #fbbf24, #f59e0b)',
                          borderRadius: '6px',
                          boxShadow: `
                            inset 0 1px 1px rgba(0, 0, 0, 0.2),
                            0 0 6px rgba(255, 215, 0, 0.4)
                          `
                        }}
                      />
                      
                      <Slider
                        value={[percentage]}
                        max={100}
                        min={0}
                        step={1}
                        onValueChange={([value]) => handleSliderPercentageChange(tokenIndex, value)}
                        className="casino-themed-slider-compact rounded-lg relative z-10"
                      />
                    </div>

                    {/* Percentage Buttons Row - always visible, compact */}
                    <div className="flex justify-between gap-1 mb-2">
                      {[0, 50, 100].map((targetPercentage) => (
                        <button
                          key={targetPercentage}
                          onClick={() => handlePercentageClick(tokenIndex, targetPercentage)}
                          className="flex-1 py-1 px-1 rounded-md text-[9px] font-bold transition-all duration-150 hover:scale-105 active:scale-95"
                          style={{
                            background: targetPercentage === 0 
                              ? 'linear-gradient(45deg, #DC143C, #B91C1C)' 
                              : targetPercentage === 50 
                              ? 'linear-gradient(45deg, #FF8C00, #FF6600)' 
                              : 'linear-gradient(45deg, #32CD32, #228B22)',
                            border: `1px solid ${targetPercentage === 0 ? '#FF1493' : targetPercentage === 50 ? '#FFD700' : '#00FF00'}`,
                            color: '#FFFFFF',
                            fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                            textShadow: "0.5px 0.5px 0 #000000",
                            borderRadius: '6px',
                            boxShadow: `
                              0 0 4px rgba(${targetPercentage === 0 ? '255, 20, 147' : targetPercentage === 50 ? '255, 215, 0' : '0, 255, 0'}, 0.3),
                              inset 0 1px 0 rgba(255, 255, 255, 0.2)
                            `
                          }}
                        >
                          {targetPercentage}%
                        </button>
                      ))}
                    </div>

                    {/* Chevron Button - always visible, at bottom */}
                    <div className="flex justify-center mt-auto">
                      <button
                        onClick={() => toggleExpansion(tokenIndex)}
                        className="p-1 rounded-full hover:bg-[#FFD70020] transition-colors"
                      >
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronDown className="h-4 w-4 text-[#FFD700]" />
                        </motion.div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 🔥 EXPANDED INPUT FIELDS: ABSOLUTELY POSITIONED - FLOATS ABOVE */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ 
                        opacity: 0, 
                        scale: 0.9,
                        y: 20
                      }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1,
                        y: 0
                      }}
                      exit={{ 
                        opacity: 0, 
                        scale: 0.9,
                        y: 20
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        duration: 0.3
                      }}
                      className="absolute bottom-full left-0 w-full mb-2 z-50" // 🔥 ABSOLUTE POSITIONED
                      style={{
                        background: 'rgba(74, 14, 78, 0.95)',
                        border: '2px solid #FFD700',
                        borderRadius: '12px',
                        boxShadow: `
                          0 8px 32px rgba(0, 0, 0, 0.6),
                          0 0 20px rgba(255, 215, 0, 0.8),
                          inset 0 1px 0 rgba(255, 215, 0, 0.3)
                        `,
                        backdropFilter: 'blur(12px)',
                      }}
                    >
                      <div className="p-4 space-y-3">
                        {/* Header */}
                        <div className="text-center border-b border-[#FFD700]/40 pb-2">
                          <div className="text-sm font-bold text-[#FFD700]"
                               style={{ 
                                 fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                                 textShadow: "0.5px 0.5px 0 #000000"
                               }}>
                            📊 {getTokenSymbol(tokenIndex)} Details
                          </div>
                        </div>

                        {/* Token Count Input Container with Overlay */}
                        <div>
                          <div className="text-xs font-bold text-[#FFD700] leading-none text-center mb-1"
                               style={{ 
                                 fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                                 textShadow: "0.5px 0.5px 0 #000000"
                               }}>
                           🪙 Token Amount
                          </div>
                          <div 
                            className="w-full px-2 py-2 rounded-lg border border-[#FFD700]/60 shadow-sm backdrop-blur-sm relative"
                            style={{
                              background: 'rgba(74, 14, 78, 0.6)',
                              boxShadow: `
                                0 0 6px rgba(255, 215, 0, 0.4),
                                inset 0 1px 0 rgba(255, 215, 0, 0.2),
                                inset 0 -1px 0 rgba(0, 0, 0, 0.2)
                              `,
                              borderRadius: '8px'
                            }}
                          >
                            {/* ACTUAL INPUT - Always has raw numeric value */}
                            <input
                              type="number"
                              min="0"
                              max={token.amount}
                              step={1 / Math.pow(10, Math.min(token.decimals, 6))}
                              value={getRawTokenCount(tokenIndex)}
                              onChange={(e) => handleTokenCountInput(tokenIndex, e.target.value)}
                              onFocus={() => handleInputFocus(`token-${tokenIndex}`)}
                              onBlur={() => handleInputBlur(`token-${tokenIndex}`)}
                              className={`w-full bg-transparent border-none outline-none text-center font-bold text-[#FFD700] leading-none ${
                                isTokenFocused ? 'opacity-100' : 'opacity-0'
                              } transition-opacity duration-150`}
                              style={{ 
                                fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                                textShadow: "0.5px 0.5px 0 #000000",
                                fontSize: '14px'
                              }}
                              placeholder="0"
                            />
                            
                            {/* OVERLAY - Shows formatted value when not focused */}
                            {!isTokenFocused && (
                              <div
                                className="absolute inset-0 flex items-center justify-center text-center font-bold text-[#FFD700] leading-none pointer-events-none"
                                style={{ 
                                  fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                                  textShadow: "0.5px 0.5px 0 #000000",
                                  fontSize: '14px'
                                }}
                              >
                                {getFormattedTokenCount(tokenIndex)}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* USD Input Container with Overlay */}
                        <div>
                          <div className="text-xs font-bold text-[#00FFFF] leading-none text-center mb-1"
                               style={{ 
                                 fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                                 textShadow: "0.5px 0.5px 0 #000000"
                               }}>
                           💰 USD Value
                          </div>
                          <div 
                            className="w-full px-2 py-2 rounded-lg border border-[#00FFFF]/60 shadow-sm backdrop-blur-sm relative"
                            style={{
                              background: 'rgba(74, 14, 78, 0.6)',
                              boxShadow: `
                                0 0 6px rgba(0, 255, 255, 0.4),
                                inset 0 1px 0 rgba(0, 255, 255, 0.2),
                                inset 0 -1px 0 rgba(0, 0, 0, 0.2)
                              `,
                              borderRadius: '8px'
                            }}
                          >
                            {/* ACTUAL INPUT - Always has raw numeric value */}
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={getRawUSDValue(tokenIndex)}
                              onChange={(e) => handleUSDInput(tokenIndex, e.target.value)}
                              onFocus={() => handleInputFocus(`usd-${tokenIndex}`)}
                              onBlur={() => handleInputBlur(`usd-${tokenIndex}`)}
                              className={`w-full bg-transparent border-none outline-none text-center font-bold text-[#00FFFF] leading-none ${
                                isUSDFocused ? 'opacity-100' : 'opacity-0'
                              } transition-opacity duration-150`}
                              style={{ 
                                fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                                textShadow: "0.5px 0.5px 0 #000000",
                                fontSize: '14px'
                              }}
                              placeholder="0"
                            />
                            
                            {/* OVERLAY - Shows formatted value when not focused */}
                            {!isUSDFocused && (
                              <div
                                className="absolute inset-0 flex items-center justify-center text-center font-bold text-[#00FFFF] leading-none pointer-events-none"
                                style={{ 
                                  fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                                  textShadow: "0.5px 0.5px 0 #000000",
                                  fontSize: '14px'
                                }}
                              >
                                {getFormattedUSDValue(tokenIndex)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Percentage Display */}
                        <div className="text-center pt-2 border-t border-[#FFD700]/40">
                          <div className="text-lg font-black text-[#FFFF00]"
                               style={{ 
                                 fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                                 textShadow: "1px 1px 0 #000000"
                               }}>
                            {percentage.toFixed(1)}% Selected
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-xs text-white/50 text-center">
                Empty Column {columnNumber}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Enhanced Slider Custom Styles - Compact Version */}
      <style jsx>{`
        :global(.casino-themed-slider-compact [data-radix-slider-track]) {
          background: transparent !important;
          height: 16px;
          position: relative;
        }
        
        :global(.casino-themed-slider-compact [data-radix-slider-range]) {
          background: transparent !important;
          height: 16px;
        }
        
        :global(.casino-themed-slider-compact [data-radix-slider-thumb]) {
          width: 14px;
          height: 14px;
          background: linear-gradient(45deg, #fbbf24, #f59e0b);
          border: 2px solid #ffffff;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 
            0 0 0 1px #000000,
            0 2px 4px rgba(0, 0, 0, 0.3), 
            0 0 8px rgba(255, 215, 0, 0.6);
          transition: all 0.15s ease;
        }
        
        :global(.casino-themed-slider-compact [data-radix-slider-thumb]:hover) {
          background: linear-gradient(45deg, #f59e0b, #fbbf24);
          transform: scale(1.1);
          box-shadow: 
            0 0 0 1px #000000,
            0 3px 6px rgba(0, 0, 0, 0.4), 
            0 0 12px rgba(255, 215, 0, 0.8);
        }
        
        :global(.casino-themed-slider-compact [data-radix-slider-thumb]:active) {
          transform: scale(1.05);
          box-shadow: 
            0 0 0 1px #000000,
            0 2px 4px rgba(0, 0, 0, 0.3), 
            0 0 8px rgba(255, 215, 0, 0.6);
        }
        
        :global(.casino-themed-slider-compact [data-radix-slider-thumb]:focus) {
          outline: none;
          box-shadow: 
            0 0 0 1px #000000,
            0 2px 4px rgba(0, 0, 0, 0.3), 
            0 0 8px rgba(255, 215, 0, 0.6),
            0 0 0 3px rgba(255, 215, 0, 0.3);
        }
        
        :global(.casino-themed-slider-compact) {
          width: 100%;
          height: 16px;
          display: flex;
          align-items: center;
          position: relative;
        }
      `}</style>
    </div>
  );
}