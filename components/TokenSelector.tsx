/* components/TokenSelector.tsx */
"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
} from "framer-motion";
import {
  Wallet,
  Check,
  Coins,
  X,
  Star,
  ChevronDown,
  Plus,
  Minus,
  Edit
} from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { usePrivy } from "@privy-io/react-auth";

/* ---------- env ---------- */
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_HELIUS_RPC ?? "";

/* ---------- Interfaces ---------- */
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
  token_info?: { symbol?: string; decimals?: number };
  content?: {
    metadata?: { name?: string; symbol?: string };
    links?: { image?: string };
    files?: Array<{ cdn_uri?: string; uri?: string }>;
  };
}
interface TokenSelectorProps {
  selectedTokens: TokenRow[];
  onSelectedTokensChange: (tokens: TokenRow[]) => void;
  delayedExpandToken?: string | null;
  onClearDelayedExpand?: () => void;
}

/* ---------- Hook: balances ---------- */
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

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const balanceRes = await fetch(
          `https://lite-api.jup.ag/ultra/v1/balances/${publicKey}`
        );
        if (!balanceRes.ok) throw new Error("Failed to fetch balances");
        const balances: JupiterBalanceResponse = await balanceRes.json();
        const nonZero = Object.entries(balances).filter(
          ([, b]) => b.uiAmount > 0
        );
        if (!nonZero.length) {
          setTokens([]);
          return;
        }

        const mints = nonZero
          .filter(([m]) => m !== "SOL")
          .map(([m]) => m);
        const metadataMap: Record<string, TokenMetadata> = {};

        if (RPC_ENDPOINT && mints.length) {
          const chunks = Array.from(
            { length: Math.ceil(mints.length / 100) },
            (_, i) => mints.slice(i * 100, i * 100 + 100)
          );

          await Promise.all(
            chunks.map(async (ids) => {
              try {
                const body = {
                  jsonrpc: "2.0",
                  id: "asset-batch",
                  method: "getAssetBatch",
                  params: { ids },
                };
                const res = await fetch(RPC_ENDPOINT, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                const { result } = await res.json();
                result?.forEach(
                  (asset: HeliusAsset) =>
                    (metadataMap[asset.id] = {
                      symbol:
                        asset.token_info?.symbol ||
                        asset.content?.metadata?.symbol ||
                        asset.id.slice(0, 4),
                      name:
                        asset.content?.metadata?.name ||
                        asset.token_info?.symbol ||
                        asset.id.slice(0, 4),
                      image:
                        asset.content?.links?.image ||
                        asset.content?.files?.[0]?.cdn_uri ||
                        asset.content?.files?.[0]?.uri ||
                        "/solana-logo.png",
                    })
                );
              } catch (_) {}
            })
          );
        }

        const rows: TokenRow[] = nonZero.map(([mint, bal]) =>
          mint === "SOL"
            ? {
                mint: "So11111111111111111111111111111111111111112",
                amount: bal.uiAmount,
                decimals: 9,
                symbol: "SOL",
                name: "Solana",
                image:
                  "https://solana.com/src/img/branding/solanaLogoMark.png",
              }
            : {
                mint,
                amount: bal.uiAmount,
                decimals: getTokenDecimals(mint),
                ...(metadataMap[mint] ?? {
                  symbol: mint.slice(0, 4),
                  name: mint.slice(0, 8),
                  image: "/solana-logo.png",
                }),
              }
        );
        rows.sort((a, b) => b.amount - a.amount);
        setTokens(rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch tokens");
        setTokens([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [publicKey]);

  return { tokens, loading, error };
}

/* ---------- Helpers ---------- */
function getTokenDecimals(mint: string): number {
  const map: Record<string, number> = {
    So11111111111111111111111111111111111111112: 9,
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 6,
    Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 6,
  };
  return map[mint] ?? 6;
}
function formatAmount(amount: number, decimals: number) {
  if (amount === 0) return "0";
  if (amount < 0.000001) return amount.toExponential(Math.min(decimals, 3));
  return amount.toLocaleString(undefined, {
    maximumFractionDigits: Math.min(decimals, 6),
    minimumFractionDigits: 0,
  });
}

export function formatAmountAbbreviated(amount: number, decimals: number) {
  if (amount === 0) return "0";
  if (amount < 0.000001) return amount.toExponential(Math.min(decimals, 3));

  const abs = Math.abs(amount);
  let value: number, suffix: string;

  if (abs >= 1_000_000_000) {
    value = amount / 1_000_000_000;
    suffix = "b";
  } else if (abs >= 1_000_000) {
    value = amount / 1_000_000;
    suffix = "m";
  } else if (abs >= 1_000) {
    value = amount / 1_000;
    suffix = "k";
  } else {
    return amount.toLocaleString(undefined, {
      maximumFractionDigits: Math.min(decimals, 6),
      minimumFractionDigits: 0,
    });
  }

  // Show up to 2 decimal places, but trim trailing zeros
  let str = value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  // Remove trailing .00 or .0
  str = str.replace(/\.0+$|(\.[0-9]*[1-9])0+$/, "$1");

  return str + suffix;
}


/* ---------- TokenCard with HORIZONTAL expansion ---------- */
interface TokenCardProps {
  token: TokenRow;
  isSelected: boolean;
  isExpanded?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  onAmountChange?: (amount: number) => void;
  selectedAmount?: number;
}

function TokenCard({
  token,
  isSelected,
  isExpanded = false,
  onSelect,
  onEdit,
  onRemove,
  onAmountChange,
  selectedAmount,
}: TokenCardProps) {
  const [tempAmount, setTempAmount] = useState(
    selectedAmount ?? token.amount
  );

  useEffect(() => {
    if (selectedAmount !== undefined) setTempAmount(selectedAmount);
  }, [selectedAmount]);

  const sliderChange = (v: number) => {
    const pct = v / token.amount;
    const snap = [0, 0.25, 0.5, 0.75, 1].find(
      (p) => Math.abs(pct - p) <= 0.01
    );
    setTempAmount((snap ?? pct) * token.amount);
  };
  const confirm = () =>
    tempAmount === 0 ? onRemove?.() : onAmountChange?.(tempAmount);

  return (
    <motion.div
      layoutId={token.mint}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        width: isExpanded ? "220px" : "80px", // Reduced expanded width
        height: isExpanded ? "90px" : "80px" // Fixed height to prevent cut-off
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ 
        type: "spring", 
        stiffness: 200, 
        damping: 20,
        duration: 0.4
      }}
      className={`relative rounded-xl border-2 overflow-hidden cursor-pointer flex-shrink-0 transition-all duration-300 ${
        isSelected
          ? "border-[#FFD700] bg-gradient-to-br from-[#4A0E4E] to-[#2D0A30]"
          : "border-[#FFD700]/30 bg-gradient-to-br from-[#3A0A3E] to-[#1D051A] hover:border-[#FFD700]/60"
      }`}
      style={{
        boxShadow: isSelected
          ? "0 0 16px rgba(255, 215, 0, 0.35)"
          : "0 0 6px rgba(255, 215, 0, 0.12)",
        width: isExpanded ? "220px" : "80px",
        height: isExpanded ? "90px" : "80px"
      }}
      onClick={!isSelected && !isExpanded ? onSelect : undefined}
    >
      {/* Horizontal Layout when expanded */}
      {isExpanded ? (
        <div className="p-2 flex items-center gap-2 h-full w-full">
          {/* Left: Token Info (Compact) */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0 w-12">
            <div className="relative w-5 h-5">
              <Image
                src={token.image}
                alt={token.symbol}
                fill
                className="rounded-full object-cover"
                onError={(e) =>
                  ((e.target as HTMLImageElement).src = "/solana-logo.png")
                }
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#FFD700] rounded-full flex items-center justify-center border border-[#2D0A30]"
              >
                <Check className="h-1 w-1 text-black" />
              </motion.div>
            </div>
            <div className="text-center leading-none">
              <div
                className="text-[10px] font-black casino-text-gold"
                style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}
              >
                {token.symbol}
              </div>
              <div className="text-[8px] casino-text-yellow font-bold">
                {formatAmountAbbreviated(tempAmount, token.decimals)}
              </div>
            </div>
          </div>

          {/* Right: Edit Controls (Horizontal Layout) */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            {/* Amount Input and Percentage Display */}
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={tempAmount.toFixed(Math.min(token.decimals, 6))}
                onChange={(e) =>
                  setTempAmount(parseFloat(e.target.value) || 0)
                }
                min={0}
                max={token.amount}
                step={1 / 10 ** Math.min(token.decimals, 6)}
                className="text-center font-black casino-input text-[10px] h-5 flex-1 px-1"
                style={{ fontSize: "10px" }}
              />
              <div className="text-[10px] casino-text-yellow font-bold whitespace-nowrap w-8 text-center">
                {((tempAmount / token.amount) * 100).toFixed(0)}%
              </div>
            </div>

            {/* Horizontal Slider */}
            <div className="flex items-center gap-1">
              <span className="text-[8px] casino-text-gold w-2 text-center">0</span>
              <div className="flex-1">
                <Slider
                  value={[tempAmount]}
                  min={0}
                  max={token.amount}
                  step={1 / 10 ** Math.min(token.decimals, 6)}
                  onValueChange={([v]) => sliderChange(v)}
                  className="custom-slider"
                />
              </div>
              <span className="text-[8px] casino-text-gold w-6 text-center">Max</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-1">
              <Button
                onClick={confirm}
                size="sm"
                className={`flex-1 font-black uppercase text-[8px] h-4 px-1 ${
                  tempAmount === 0
                    ? "bg-[#FF1493] hover:bg-[#DC143C] text-white"
                    : "casino-button"
                }`}
                style={{ fontSize: "8px" }}
              >
                {tempAmount === 0 ? (
                  <>
                    <X className="h-2 w-2 mr-0.5" />
                    Remove
                  </>
                ) : (
                  <>
                    <Check className="h-2 w-2 mr-0.5" />
                    OK
                  </>
                )}
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(); // Toggle edit mode off
                }}
                size="sm"
                className="bg-[#666] hover:bg-[#777] text-white px-1 h-4 w-6"
              >
                <X className="h-2 w-2" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Vertical Layout when not expanded (compact design) */
        <div className="p-2 flex flex-col h-full justify-between">
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className="relative w-6 h-6">
              <Image
                src={token.image}
                alt={token.symbol}
                fill
                className="rounded-full object-cover"
                onError={(e) =>
                  ((e.target as HTMLImageElement).src = "/solana-logo.png")
                }
              />
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#FFD700] rounded-full flex items-center justify-center border border-[#2D0A30]"
                >
                  <Check className="h-1.5 w-1.5 text-black" />
                </motion.div>
              )}
            </div>
            <div className="text-center leading-none">
              <div
                className="text-xs font-black casino-text-gold"
                style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}
              >
                {token.symbol}
              </div>
              <div className="text-[10px] casino-text-yellow font-bold">
                {formatAmountAbbreviated(
                  isSelected && selectedAmount !== undefined
                    ? selectedAmount
                    : token.amount,
                  token.decimals
                )}
              </div>
            </div>
          </div>

          {/* Bottom buttons section - properly sized */}
          <div className="flex-shrink-0 mt-1">
            {isSelected ? (
              <div className="flex gap-1 justify-center">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.();
                  }}
                  className="casino-button px-1 py-0.5 text-xs h-5 w-8 border border-[#FFD700]"
                  style={{ fontSize: "10px" }}
                >
                  <Edit className="h-2.5 w-2.5" />
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove?.();
                  }}
                  className="bg-[#FF1493] hover:bg-[#DC143C] text-white px-1 py-0.5 text-xs h-5 w-8 border border-[#FF1493]"
                  style={{ fontSize: "10px" }}
                >
                  <Minus className="h-2.5 w-2.5" />
                </Button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute bottom-1 right-1"
              >
                <div className="w-4 h-4 bg-[#FFD700] rounded-full flex items-center justify-center">
                  <Plus className="h-2 w-2 text-black" />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ---------- TokenSelector ---------- */
export function TokenSelector({
  selectedTokens,
  onSelectedTokensChange,
  delayedExpandToken,
  onClearDelayedExpand,
}: TokenSelectorProps) {
  const { authenticated, user } = usePrivy();
  const publicKey = user?.wallet?.address;
  const { tokens, loading, error } = useTokenBalances(publicKey);
  const [expandedToken, setExpandedToken] = useState<string | null>(null);
  const [isSelectedExpanded, setIsSelectedExpanded] = useState(false);

  useEffect(() => {
    if (delayedExpandToken) {
      setExpandedToken(delayedExpandToken);
      setIsSelectedExpanded(true);
      onClearDelayedExpand?.();
    }
  }, [delayedExpandToken, onClearDelayedExpand]);

  useEffect(() => {
    if (selectedTokens.length > 0 && !isSelectedExpanded) {
      setIsSelectedExpanded(true);
    } else if (selectedTokens.length === 0) {
      setIsSelectedExpanded(false);
      setExpandedToken(null);
    }
  }, [selectedTokens.length, isSelectedExpanded]);

  const available = tokens.filter(
    (t) => !selectedTokens.some((s) => s.mint === t.mint)
  );

  const select = (token: TokenRow) => {
    onSelectedTokensChange([
      ...selectedTokens,
      { ...token, selectedAmount: token.amount * 0.5 },
    ]);
    setExpandedToken(token.mint);
  };
  const remove = (mint: string) => {
    onSelectedTokensChange(selectedTokens.filter((t) => t.mint !== mint));
    if (expandedToken === mint) setExpandedToken(null);
  };
  const update = (mint: string, amt: number) => {
    onSelectedTokensChange(
      selectedTokens.map((t) =>
        t.mint === mint ? { ...t, selectedAmount: amt } : t
      )
    );
    setExpandedToken(null);
  };
  const editToggle = (mint: string) =>
    setExpandedToken(expandedToken === mint ? null : mint);

  const toggleSelectedSection = () => {
    setIsSelectedExpanded(!isSelectedExpanded);
    if (!isSelectedExpanded) setExpandedToken(null);
  };


  const baseHeight = 160;
  const expandedHeight = 320;
  const currentHeight = selectedTokens.length > 0 ? expandedHeight : baseHeight;

  return (
    <div className="w-full relative" style={{ height: `${baseHeight}px` }}>
      {/* Card that expands upward from bottom - NO translateY needed! */}
      <motion.div
        className="absolute bottom-0 left-0 right-0"
        animate={{
          height: `${currentHeight}px`
        }}
        transition={{ 
          type: "spring", 
          stiffness: 200, 
          damping: 25,
          duration: 0.6
        }}
      >
        <Card className="casino-box casino-box-gold overflow-hidden p-0 h-full flex flex-col relative">
          <div className="absolute top-2 left-2 z-10">
            <Star className="h-4 w-4 casino-star" fill="currentColor" />
          </div>
          <div className="absolute top-2 right-2 z-10">
            <Star className="h-4 w-4 casino-star" fill="currentColor" />
          </div>

          <CardContent className="p-4 h-full flex flex-col overflow-hidden">
            <div className="mb-4 flex-shrink-0">
              <div className="flex items-center justify-center gap-2">
                <Coins className="h-5 w-5 casino-text-gold" />
                <h2
                  className="text-xl font-black uppercase text-center tracking-wide casino-text-gold"
                  style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}
                >
                  Select Tokens
                </h2>
              </div>
            </div>

            {/* Selected (TOP) - Only show when expanded */}
            <AnimatePresence>
              {selectedTokens.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: isSelectedExpanded ? "120px" : "32px",
                    opacity: 1,
                  }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 250, damping: 22 }}
                  className="flex-shrink-0 overflow-hidden border-b-2 border-[#FFD700] mb-4"
                  style={{ transformOrigin: "top" }}
                >
                  <div
                    className="flex items-center justify-between mb-2 cursor-pointer hover:bg-[#FFD70010] rounded px-2 py-1 h-6"
                    onClick={toggleSelectedSection}
                  >
                    <h3
                      className="text-sm font-black uppercase casino-text-yellow"
                      style={{
                        fontFamily: "Visby Round CF, SF Pro Display, sans-serif",
                      }}
                    >
                      🌟 Selected ({selectedTokens.length})
                    </h3>
                    <motion.div
                      animate={{ rotate: isSelectedExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 casino-text-gold" />
                    </motion.div>
                  </div>

                  <AnimatePresence>
                    {isSelectedExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "88px", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="h-full w-full overflow-x-auto overflow-y-hidden">
                          <LayoutGroup id="tokens">
                            <div className="flex gap-2 pb-2 h-full">
                              <AnimatePresence>
                                {selectedTokens.map((t) => (
                                  <TokenCard
                                    key={t.mint}
                                    token={t}
                                    isSelected
                                    isExpanded={expandedToken === t.mint}
                                    onEdit={() => editToggle(t.mint)}
                                    onRemove={() => remove(t.mint)}
                                    onAmountChange={(a) => update(t.mint, a)}
                                    selectedAmount={t.selectedAmount}
                                  />
                                ))}
                              </AnimatePresence>
                            </div>
                          </LayoutGroup>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Available Tokens - Takes remaining space */}
            <div className="flex-1 min-h-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Coins className="h-6 w-6 casino-text-gold" />
                  </motion.div>
                  <span className="text-xs casino-text-gold font-bold mt-2">
                    Loading tokens...
                  </span>
                </div>
              ) : error ? (
                <div className="text-center py-6">
                  <span className="text-xs text-red-400 font-bold">
                    Error: {error}
                  </span>
                </div>
              ) : !available.length ? (
                <div className="flex flex-col items-center justify-center h-20">
                  <Wallet className="h-6 w-6 casino-text-gold mb-2" />
                  <span className="text-xs casino-text-gold font-bold">
                    {selectedTokens.length
                      ? "All tokens selected"
                      : "No tokens found"}
                  </span>
                </div>
              ) : (
                <div className="h-20 overflow-hidden">
                  <div className="h-full w-full overflow-x-auto overflow-y-hidden">
                    <LayoutGroup id="tokens">
                      <div className="flex gap-2 pb-2 h-full">
                        <AnimatePresence>
                          {available.map((t) => (
                            <TokenCard
                              key={t.mint}
                              token={t}
                              isSelected={false}
                              onSelect={() => select(t)}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </LayoutGroup>
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          <style jsx>{`
            :global(.custom-slider [data-radix-slider-track]) {
              background: linear-gradient(90deg, #ffd700, #ffff00);
              height: 3px;
              border-radius: 2px;
              border: 1px solid #000;
            }
            :global(.custom-slider [data-radix-slider-range]) {
              background: linear-gradient(90deg, #ffff00, #ffd700);
              height: 3px;
              border-radius: 2px;
            }
            :global(.custom-slider [data-radix-slider-thumb]) {
              width: 10px;
              height: 10px;
              background: linear-gradient(145deg, #ffd700, #daa520);
              border: 2px solid #ffff00;
              border-radius: 50%;
              box-shadow: 0 0 6px rgba(255, 215, 0, 0.8);
              cursor: pointer;
            }
            :global(.custom-slider [data-radix-slider-thumb]:hover) {
              background: linear-gradient(145deg, #ffff00, #ffd700);
              transform: scale(1.1);
            }
          `}</style>
        </Card>
      </motion.div>
    </div>
  );
}