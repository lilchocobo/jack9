"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Edit, X, Check, ArrowLeftRight, Coins, Minus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

interface TokenRow {
  mint: string;
  amount: number;
  decimals: number;
  symbol: string;
  name: string;
  image: string;
  selected?: boolean;
  selectedAmount?: number;
}

interface SelectedTokensProps {
  selectedTokens: TokenRow[];
  onRemoveToken: (mint: string) => void;
  onUpdateAmount: (mint: string, amount: number) => void;
  delayedExpandToken?: string | null;
  onClearDelayedExpand?: () => void;
}

function formatAmount(amount: number, decimals: number) {
  if (amount === 0) return '0';
  if (amount < 0.000001) {
    return amount.toExponential(Math.min(decimals, 3));
  }
  return amount.toLocaleString(undefined, {
    maximumFractionDigits: Math.min(decimals, 6),
    minimumFractionDigits: 0,
  });
}

export function SelectedTokens({ 
  selectedTokens, 
  onRemoveToken, 
  onUpdateAmount,
  delayedExpandToken,
  onClearDelayedExpand
}: SelectedTokensProps) {
  const [expandedToken, setExpandedToken] = useState<string | null>(null);
  const [tempAmounts, setTempAmounts] = useState<Record<string, number>>({});

  // Handle delayed expansion (after token is added to list)
  useEffect(() => {
    if (delayedExpandToken) {
      // Close any currently expanded token first
      if (expandedToken) {
        setExpandedToken(null);
        // Clear temp amounts for the closing token
        const newTempAmounts = { ...tempAmounts };
        delete newTempAmounts[expandedToken];
        setTempAmounts(newTempAmounts);
      }
      
      // Small delay to ensure smooth close->open transition
      setTimeout(() => {
        setExpandedToken(delayedExpandToken);
        
        // Initialize temp amount
        const token = selectedTokens.find(t => t.mint === delayedExpandToken);
        if (token) {
          setTempAmounts(prev => ({
            [delayedExpandToken]: token.selectedAmount ?? token.amount
          }));
        }
        
        // Clear the delayed expand flag
        onClearDelayedExpand?.();
      }, 200);
    }
  }, [delayedExpandToken, selectedTokens, onClearDelayedExpand]);

  const toggleExpanded = (mint: string) => {
    if (expandedToken === mint) {
      // Closing current token
      setExpandedToken(null);
      const newTempAmounts = { ...tempAmounts };
      delete newTempAmounts[mint];
      setTempAmounts(newTempAmounts);
    } else {
      // Opening new token - close any existing first
      if (expandedToken) {
        const newTempAmounts = { ...tempAmounts };
        delete newTempAmounts[expandedToken];
        setTempAmounts(newTempAmounts);
      }
      
      setExpandedToken(mint);
      const token = selectedTokens.find(t => t.mint === mint);
      if (token) {
        setTempAmounts({
          [mint]: token.selectedAmount ?? token.amount
        });
      }
    }
  };

  const handleTempAmountChange = (mint: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    const token = selectedTokens.find(t => t.mint === mint);
    if (!token) return;
    
    const maxAmount = token.amount;
    const clampedValue = Math.min(Math.max(0, numValue), maxAmount);
    setTempAmounts(prev => ({
      ...prev,
      [mint]: clampedValue
    }));
  };

  const handleTempSliderChange = (mint: string, value: number) => {
    const token = selectedTokens.find(t => t.mint === mint);
    if (!token) return;
    
    const maxAmount = token.amount;
    const percentage = value / maxAmount;
    
    const snapThreshold = 0.01;
    const snapPoints = [0, 0.25, 0.5, 0.75, 1.0];
    
    let snappedPercentage = percentage;
    for (const snapPoint of snapPoints) {
      if (Math.abs(percentage - snapPoint) <= snapThreshold) {
        snappedPercentage = snapPoint;
        break;
      }
    }
    
    const snappedValue = snappedPercentage * maxAmount;
    setTempAmounts(prev => ({
      ...prev,
      [mint]: snappedValue
    }));
  };

  const handleConfirm = (mint: string) => {
    const tempAmount = tempAmounts[mint];
    if (tempAmount !== undefined) {
      if (tempAmount === 0) {
        onRemoveToken(mint);
      } else {
        onUpdateAmount(mint, tempAmount);
      }
      setExpandedToken(null);
      setTempAmounts(prev => {
        const newTempAmounts = { ...prev };
        delete newTempAmounts[mint];
        return newTempAmounts;
      });
    }
  };

  return (
    <Card className="casino-box casino-box-gold overflow-hidden p-0 h-full flex flex-col relative">
      {/* Corner stars */}
      <div className="absolute top-2 left-2 z-10">
        <Star className="h-4 w-4 casino-star" fill="currentColor" />
      </div>
      <div className="absolute top-2 right-2 z-10">
        <Star className="h-4 w-4 casino-star" fill="currentColor" />
      </div>
      
      <CardContent className="p-4 h-full flex flex-col min-w-0 overflow-hidden">
        {/* Title */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center justify-center gap-2">
            <Coins className="h-5 w-5 casino-text-gold" />
            <h2 className="text-xl font-black uppercase text-center tracking-wide casino-text-gold truncate" 
                style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}>
              Selected Tokens
            </h2>
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 2,
                repeat: Infinity
              }}
            >
              <Edit className="h-5 w-5 casino-text-pink" />
            </motion.div>
          </div>
        </div>

        {/* Column Headers - Only show when we have tokens */}
        {selectedTokens.length > 0 && (
          <div className="grid grid-cols-12 gap-2 mb-3 px-2 flex-shrink-0">
            <div className="col-span-5">
              <span className="text-sm font-black uppercase casino-text-yellow"
                style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}>
                Token
              </span>
            </div>
            <div className="col-span-4">
              <span className="text-sm font-black uppercase casino-text-yellow text-center"
                style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}>
                Selected
              </span>
            </div>
            <div className="col-span-3">
              <span className="text-sm font-black uppercase casino-text-yellow text-right"
                style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}>
                Actions
              </span>
            </div>
          </div>
        )}

        {/* Content - FIXED HEIGHT container with main scroll area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {selectedTokens.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity
                }}
              >
                <Coins className="h-12 w-12 casino-text-gold mb-3" />
              </motion.div>
              <span className="text-sm casino-text-gold font-bold text-center">
                No tokens selected
              </span>
              <span className="text-xs casino-text-yellow font-bold text-center mt-1">
                Select tokens from "Your Tokens" above
              </span>
            </div>
          ) : (
            <ScrollArea className="h-full custom-scrollbar">
              <div className="space-y-1 pr-2">
                <AnimatePresence>
                  {selectedTokens.map((token, i) => {
                    const isExpanded = expandedToken === token.mint;
                    const tempAmount = tempAmounts[token.mint];
                    const displayAmount = tempAmount !== undefined ? tempAmount : (token.selectedAmount ?? token.amount);
                    const isZeroAmount = tempAmount === 0;
                    
                    return (
                      <motion.div
                        key={token.mint}
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0, 
                          scale: 1,
                          transition: {
                            type: "spring",
                            stiffness: 300,
                            damping: 25
                          }
                        }}
                        exit={{ 
                          opacity: 0, 
                          x: 20, 
                          scale: 0.8,
                          transition: {
                            duration: 0.2
                          }
                        }}
                        layout
                        className="overflow-hidden relative rounded-xl"
                        style={{
                          background: i % 2 === 0
                            ? 'linear-gradient(to right, #4A0E4E, #2D0A30)'
                            : 'linear-gradient(to right, #3A0A3E, #1D051A)',
                          border: isExpanded ? '2px solid rgba(255, 215, 0, 0.8)' : '1px solid rgba(255, 215, 0, 0.2)',
                          transition: 'border 0.2s ease'
                        }}
                      >
                        {/* Compact Header Row */}
                        <div className="py-1 px-2">
                          <div className="grid grid-cols-12 gap-2 items-center">
                            {/* Token Info */}
                            <div className="col-span-5 flex items-center">
                              <div className="relative w-6 h-6 mr-2 flex-shrink-0">
                                <Image
                                  src={token.image}
                                  alt={token.symbol}
                                  fill
                                  className="rounded-full object-cover"
                                  onError={(e) => ((e.target as HTMLImageElement).src = '/solana-logo.png')}
                                />
                              </div>
                              <span className="font-bold casino-text-gold text-sm truncate"
                                style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}>
                                {token.symbol}
                              </span>
                            </div>
                            
                            {/* Selected Amount */}
                            <div className="col-span-4 text-center">
                              <span className="font-bold casino-text-yellow text-sm"
                                style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}>
                                {formatAmount(token.selectedAmount ?? token.amount, token.decimals)}
                              </span>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="col-span-3 flex items-center justify-end gap-1">
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <div 
                                  className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                    isExpanded 
                                      ? 'bg-[#FFFF00] border-[#FFD700] hover:bg-[#FFD700]' 
                                      : 'bg-[#FFD700] border-[#FFFF00] hover:bg-[#FFFF00]'
                                  }`}
                                  onClick={() => toggleExpanded(token.mint)}
                                  title="Edit amount"
                                >
                                  <Edit className="h-3 w-3 text-black" />
                                </div>
                              </motion.div>
                              
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <div 
                                  className="w-6 h-6 rounded-full bg-[#FF1493] border border-[#FF69B4] flex items-center justify-center hover:bg-[#FF69B4] transition-colors cursor-pointer"
                                  onClick={() => onRemoveToken(token.mint)}
                                  title="Remove token"
                                >
                                  <Minus className="h-3 w-3 text-white" />
                                </div>
                              </motion.div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Edit Section - Natural height, no animations */}
                        {isExpanded && (
                          <div className="border-t-2 border-[#FFD700] bg-gradient-to-b from-[#4A0E4E]/50 to-[#2D0A30]/80 p-4 space-y-4">
                            {/* Header Row: Adjust Amount + Input */}
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <ArrowLeftRight className="h-4 w-4 casino-text-gold" />
                                <span className="text-sm font-black casino-text-yellow" 
                                      style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}>
                                  Adjust Amount
                                </span>
                              </div>
                              
                              {/* Amount Input in top right */}
                              <div className="w-32">
                                <Input
                                  type="number"
                                  value={displayAmount.toFixed(Math.min(token.decimals, 6))}
                                  onChange={(e) => handleTempAmountChange(token.mint, e.target.value)}
                                  min={0}
                                  max={token.amount}
                                  step={1 / Math.pow(10, Math.min(token.decimals, 6))}
                                  className="text-center font-black casino-input text-sm" 
                                  style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}
                                />
                              </div>
                            </div>
                            
                            {/* Slider */}
                            <div className="px-2 py-2">
                              <div className="relative">
                                <div 
                                  className="absolute top-1/2 left-0 right-0 h-3 bg-gradient-to-r from-[#FFD700] to-[#FFFF00] rounded-full border-2 border-[#000000] transform -translate-y-1/2"
                                  style={{
                                    boxShadow: `
                                      inset 0 2px 4px rgba(0, 0, 0, 0.5),
                                      0 0 8px rgba(255, 215, 0, 0.6)
                                    `
                                  }}
                                />
                                
                                <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 flex justify-between px-1">
                                  {[0, 25, 50, 75, 100].map((percent) => (
                                    <div
                                      key={percent}
                                      className="w-2 h-2 bg-[#000000] border border-[#FFD700] rounded-full"
                                      style={{
                                        boxShadow: '0 0 4px rgba(255, 215, 0, 0.8)'
                                      }}
                                    />
                                  ))}
                                </div>
                                
                                <Slider
                                  value={[displayAmount]}
                                  min={0}
                                  max={token.amount}
                                  step={1 / Math.pow(10, Math.min(token.decimals, 6))}
                                  onValueChange={([value]) => handleTempSliderChange(token.mint, value)}
                                  className="relative z-10 custom-slider"
                                />
                              </div>
                              
                              <div className="flex justify-between text-xs casino-text-yellow font-bold mt-2 px-1">
                                <span>0</span>
                                <span>25%</span>
                                <span>50%</span>
                                <span>75%</span>
                                <span>100%</span>
                              </div>
                            </div>
                            
                            {/* Selected Amount Display + Confirm Button */}
                            <div className="flex items-center justify-between gap-4">
                              <div className="text-center">
                                <div className="text-lg font-black casino-text-gold" 
                                     style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}>
                                  {formatAmount(displayAmount, token.decimals)}
                                </div>
                                <div className="text-xs casino-text-yellow font-bold">Selected</div>
                              </div>
                              
                              {/* Confirm Button - Next to selected amount */}
                              <Button
                                onClick={() => handleConfirm(token.mint)}
                                className={`px-4 py-2 font-black uppercase transition-all duration-200 ${
                                  isZeroAmount
                                    ? 'bg-gradient-to-r from-[#FF1493] to-[#DC143C] hover:from-[#DC143C] hover:to-[#B91C1C] border-2 border-[#FF1493] casino-text-white'
                                    : 'casino-button border-2 border-[#FFD700]'
                                }`}
                                style={{ 
                                  fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                                  boxShadow: isZeroAmount 
                                    ? '0 0 15px rgba(255, 20, 147, 0.6)' 
                                    : '0 0 15px rgba(255, 215, 0, 0.6)'
                                }}
                              >
                                {isZeroAmount ? (
                                  <>
                                    <X className="h-4 w-4 mr-2" />
                                    Remove
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Confirm
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>

      {/* Enhanced slider styles */}
      <style jsx>{`
        :global(.custom-slider [data-radix-slider-track]) {
          background: transparent;
          height: 16px;
          position: relative;
        }
        
        :global(.custom-slider [data-radix-slider-range]) {
          background: linear-gradient(90deg, #FFD700, #FFFF00);
          height: 16px;
          border-radius: 8px;
          box-shadow: 
            0 0 12px rgba(255, 215, 0, 0.9),
            inset 0 1px 0 rgba(255, 255, 255, 0.4),
            inset 0 -1px 0 rgba(0, 0, 0, 0.3);
          border: 2px solid #000000;
          position: relative;
        }
        
        :global(.custom-slider [data-radix-slider-thumb]) {
          width: 28px;
          height: 28px;
          background: linear-gradient(145deg, #FFD700, #DAA520);
          border: 4px solid #FFFF00;
          border-radius: 50%;
          box-shadow: 
            0 0 0 3px #000000,
            0 0 20px rgba(255, 215, 0, 1),
            0 6px 12px rgba(0, 0, 0, 0.4);
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          z-index: 20;
        }
        
        :global(.custom-slider [data-radix-slider-thumb]:hover) {
          background: linear-gradient(145deg, #FFFF00, #FFD700);
          transform: scale(1.2);
          box-shadow: 
            0 0 0 3px #000000,
            0 0 25px rgba(255, 215, 0, 1),
            0 8px 16px rgba(0, 0, 0, 0.5);
        }
        
        :global(.custom-slider [data-radix-slider-thumb]:focus) {
          outline: none;
          background: linear-gradient(145deg, #FFFF00, #FFD700);
          transform: scale(1.2);
        }
        
        :global(.custom-slider) {
          width: 100%;
          height: 28px;
          display: flex;
          align-items: center;
          position: relative;
        }
      `}</style>
    </Card>
  );
}