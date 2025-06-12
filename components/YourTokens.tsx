"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Wallet, Plus, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { usePrivy } from '@privy-io/react-auth';
import { WalletConnect } from './WalletConnect';

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

interface JupiterBalance {
  amount: string;
  uiAmount: number;
  slot: number;
  isFrozen: boolean;
}

interface JupiterBalanceResponse {
  [mintAddress: string]: JupiterBalance;
}

interface TokenMetadata {
  symbol: string;
  name: string;
  image: string;
}

interface HeliusAsset {
  id: string;
  token_info?: {
    symbol?: string;
    decimals?: number;
  };
  content?: {
    metadata?: {
      name?: string;
      symbol?: string;
    };
    links?: {
      image?: string;
    };
    files?: Array<{
      cdn_uri?: string;
      uri?: string;
    }>;
  };
}

interface YourTokensProps {
  onTokenSelect?: (token: TokenRow) => void;
  selectedTokenMints?: string[];
}

// Custom hook for token balances
function useTokenBalances(publicKey: string | undefined) {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setTokens([]);
      setLoading(false);
      return;
    }

    const fetchTokenData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch balances from Jupiter API
        const balanceResponse = await fetch(`https://lite-api.jup.ag/ultra/v1/balances/${publicKey}`);
        if (!balanceResponse.ok) {
          throw new Error('Failed to fetch balances');
        }
        const balances: JupiterBalanceResponse = await balanceResponse.json();

        // Extract non-zero balances
        const nonZeroTokens = Object.entries(balances).filter(([_, balance]: [string, JupiterBalance]) => 
          balance.uiAmount > 0
        );

        if (nonZeroTokens.length === 0) {
          setTokens([]);
          setLoading(false);
          return;
        }

        // Get token mints (excluding SOL)
        const tokenMints = nonZeroTokens
          .filter(([mint]) => mint !== 'SOL')
          .map(([mint]) => mint);

        // Fetch metadata
        const metadataMap: Record<string, TokenMetadata> = {};
        
        if (tokenMints.length > 0) {
          const chunks: string[][] = [];
          for (let i = 0; i < tokenMints.length; i += 100) {
            chunks.push(tokenMints.slice(i, i + 100));
          }

          await Promise.all(
            chunks.map(async (mintChunk) => {
              try {
                const body = {
                  jsonrpc: '2.0',
                  id: 'asset-batch',
                  method: 'getAssetBatch',
                  params: { ids: mintChunk },
                };
                
                const response = await fetch(process.env.NEXT_PUBLIC_HELIUS_RPC!, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                });
                
                const { result } = await response.json();
                
                result?.forEach((asset: HeliusAsset) => {
                  if (asset) {
                    metadataMap[asset.id] = extractMetadata(asset);
                  }
                });
              } catch (chunkError) {
                console.warn('Failed to fetch metadata chunk:', chunkError);
              }
            })
          );
        }

        // Build final token array
        const tokenRows: TokenRow[] = nonZeroTokens.map(([mint, balance]) => {
          if (mint === 'SOL') {
            return {
              mint: 'So11111111111111111111111111111111111111112',
              amount: balance.uiAmount,
              decimals: 9,
              symbol: 'SOL',
              name: 'Solana',
              image: 'https://solana.com/src/img/branding/solanaLogoMark.png',
            };
          }

          const metadata = metadataMap[mint] || {
            symbol: mint.slice(0, 4),
            name: mint.slice(0, 8),
            image: '/solana-logo.png',
          };

          return {
            mint,
            amount: balance.uiAmount,
            decimals: getTokenDecimals(mint),
            ...metadata,
          };
        });

        // Sort by amount (highest first)
        tokenRows.sort((a, b) => b.amount - a.amount);
        setTokens(tokenRows);

      } catch (err) {
        console.error('Token fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
        setTokens([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [publicKey]);

  return { tokens, loading, error };
}

// Helper functions
function extractMetadata(asset: HeliusAsset): TokenMetadata {
  const symbol = 
    asset.token_info?.symbol ||
    asset.content?.metadata?.symbol ||
    asset.id.slice(0, 4);

  const name = 
    asset.content?.metadata?.name ||
    symbol;

  const image = 
    asset.content?.links?.image ||
    asset.content?.files?.[0]?.cdn_uri ||
    asset.content?.files?.[0]?.uri ||
    '/solana-logo.png';

  return { symbol, name, image };
}

function getTokenDecimals(mint: string): number {
  const commonDecimals: Record<string, number> = {
    'So11111111111111111111111111111111111111112': 9, // SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6, // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 6, // USDT
  };
  
  return commonDecimals[mint] || 6;
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

export function YourTokens({ onTokenSelect, selectedTokenMints = [] }: YourTokensProps) {
  const { authenticated, user } = usePrivy();
  const publicKey = user?.wallet?.address;
  const { tokens, loading, error } = useTokenBalances(publicKey);

  // Filter out already selected tokens
  const availableTokens = tokens.filter(token => 
    !selectedTokenMints.includes(token.mint)
  );

  if (!authenticated) {
    return (
      <Card className="casino-box casino-box-gold overflow-hidden p-0 h-full flex flex-col relative">
        <div className="absolute top-2 left-2 z-10">
          <Star className="h-4 w-4 casino-star\" fill="currentColor" />
        </div>
        <div className="absolute top-2 right-2 z-10">
          <Star className="h-4 w-4 casino-star" fill="currentColor" />
        </div>
        
        <CardContent className="p-4 h-full flex flex-col justify-center items-center min-w-0">
          <div className="text-center">
            <Wallet className="h-8 w-8 casino-text-gold mb-3 mx-auto" />
            <h2 className="text-lg font-black uppercase text-center tracking-wide casino-text-gold mb-3" 
                style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}>
              Your Tokens
            </h2>
            <p className="text-sm casino-text-yellow font-bold mb-4">
              Connect wallet to view tokens
            </p>
            <WalletConnect />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="casino-box casino-box-gold overflow-hidden p-0 h-full flex flex-col relative">
      {/* Corner stars */}
      <div className="absolute top-2 left-2 z-10">
        <Star className="h-4 w-4 casino-star" fill="currentColor" />
      </div>
      <div className="absolute top-2 right-2 z-10">
        <Star className="h-4 w-4 casino-star" fill="currentColor" />
      </div>
      
      <CardContent className="p-4 h-full flex flex-col min-w-0">
        {/* Title */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center justify-center gap-2">
            <Wallet className="h-5 w-5 casino-text-gold" />
            <h2 className="text-xl font-black uppercase text-center tracking-wide casino-text-gold truncate" 
                style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}>
              Your Tokens
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
              <Coins className="h-5 w-5 casino-text-pink" />
            </motion.div>
          </div>
        </div>

        {/* Column Headers */}
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
              Balance
            </span>
          </div>
          <div className="col-span-3">
            <span className="text-sm font-black uppercase casino-text-yellow text-right"
              style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}>
              Add
            </span>
          </div>
        </div>
        
        {/* Tokens List - This will align with bottom of other columns */}
        <div className="flex-1 overflow-hidden min-w-0 min-h-0 max-h-[460px]">
          <ScrollArea className="h-full custom-scrollbar">
            <div className="space-y-1 pr-2">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-8"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <motion.div
                        animate={{
                          rotate: 360
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      >
                        <Coins className="h-8 w-8 casino-text-gold" />
                      </motion.div>
                      <span className="text-sm casino-text-gold font-bold">
                        Loading tokens...
                      </span>
                    </div>
                  </motion.div>
                ) : error ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-8"
                  >
                    <span className="text-sm text-red-400 font-bold">
                      Error: {error}
                    </span>
                  </motion.div>
                ) : availableTokens.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-8"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Wallet className="h-8 w-8 casino-text-gold" />
                      <span className="text-sm casino-text-gold font-bold">
                        {selectedTokenMints.length > 0 ? "All tokens selected" : "No tokens found"}
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  availableTokens.map((token, i) => (
                    <motion.div
                      key={token.mint}
                      initial={{ opacity: 0, y: -20, scale: 0.9 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0, 
                        scale: 1,
                        transition: {
                          type: "spring",
                          stiffness: 200,
                          damping: 20
                        }
                      }}
                      exit={{ 
                        opacity: 0, 
                        x: 20, 
                        scale: 0.8,
                        transition: {
                          duration: 0.3
                        }
                      }}
                      layout
                      className="py-1 px-2 rounded-xl overflow-hidden relative cursor-pointer hover:bg-[#FFD70015] transition-all duration-200 group"
                      style={{
                        background: i % 2 === 0
                          ? 'linear-gradient(to right, #4A0E4E, #2D0A30)'
                          : 'linear-gradient(to right, #3A0A3E, #1D051A)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 215, 0, 0.2)'
                      }}
                      onClick={() => onTokenSelect?.(token)}
                    >
                      <div className="grid grid-cols-12 gap-2 items-center relative z-10">
                        {/* Token */}
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
                        
                        {/* Balance */}
                        <div className="col-span-4 text-center">
                          <span className="font-bold casino-text-yellow text-sm"
                            style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}>
                            {formatAmount(token.amount, token.decimals)}
                          </span>
                        </div>
                        
                        {/* Add Button */}
                        <div className="col-span-3 text-right">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <div className="w-6 h-6 rounded-full bg-[#FFD700] border border-[#FFFF00] flex items-center justify-center group-hover:bg-[#FFFF00] transition-colors">
                              <Plus className="h-3 w-3 text-black" />
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}