import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDownIcon } from "lucide-react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { formatAmountAbbreviated } from "@/utils/tokenUtils";
import { createTokenSelectors } from "@/utils/tokenManagement";
import { WalletConnect } from "@/components/WalletConnect";
import { useSolPriceUSD } from "@/hooks/useSolPriceUSD";
import { useTokenPricesSol } from "@/hooks/useTokenPriceSol";
import { useTokenData } from "@/hooks/useTokenData";

interface TokenCard {
    mint: string;
    amount: number;
    decimals: number;
    symbol: string;
    name: string;
    image: string;
    isSelected: boolean;
    selectedOrder?: number;
    selectedAmount?: number;
}

export function TokenSelectorNew() {
    const { authenticated, user } = usePrivy();
    const publicKey = user?.wallet?.address;
    const { tokens, loading, error } = useTokenBalances(publicKey);

    const [tokenCards, setTokenCards] = useState<TokenCard[]>([]);
    const [selectedTokens, setSelectedTokens] = useState<TokenCard[]>([]);
    const [selectedCount, setSelectedCount] = useState(0);

    const { price, isLoading, isError } = useSolPriceUSD();

    // Get all mint addresses for price fetching
    const mintAddresses = tokenCards.map(token => token.mint);
    const { prices: tokenPricesInSol, isLoading: pricesLoading } = useTokenPricesSol(mintAddresses);

    // Fetch token data from DexScreener to filter tokens with trading pairs
    const allMintAddresses = tokens?.map(token => token.mint) || [];
    const { data: dexScreenerData, error: dexScreenerError, isLoading: dexScreenerLoading } = useTokenData({
        chainId: "solana",
        tokenAddresses: allMintAddresses,
        enabled: allMintAddresses.length > 0
    });


    // Calculate token values in SOL at parent level
    const tokenValuesInSol = useMemo(() => {
        const valuesMap: Record<string, number | null> = {};

        tokenCards.forEach(token => {
            const tokenPriceInSol = tokenPricesInSol[token.mint];
            if (tokenPriceInSol) {
                const amount = token.isSelected && token.selectedAmount !== undefined
                    ? token.selectedAmount
                    : token.amount;
                // Amount is already human-readable (divided by decimals), so just multiply by price
                valuesMap[token.mint] = amount * tokenPriceInSol;
            } else {
                valuesMap[token.mint] = null;
            }
        });

        return valuesMap;
    }, [tokenCards, tokenPricesInSol]);

    // Calculate token values in USD by multiplying SOL values with SOL price
    const tokenValuesInUSD = useMemo(() => {
        const valuesMap: Record<string, number | null> = {};

        Object.keys(tokenValuesInSol).forEach(mint => {
            const valueInSol = tokenValuesInSol[mint];
            if (valueInSol !== null && price !== null && typeof price === 'number') {
                valuesMap[mint] = valueInSol * price;
            } else {
                valuesMap[mint] = null;
            }
        });

        return valuesMap;
    }, [tokenValuesInSol, price]);

    console.log("SOL price", price);
    console.log("Tokens", tokens);
    console.log("Token prices in SOL", tokenPricesInSol);
    console.log("Token values in SOL", tokenValuesInSol);
    console.log("Token values in USD", tokenValuesInUSD);
    console.log("DexScreener token data", dexScreenerData);
    console.log("DexScreener loading", dexScreenerLoading);
    console.log("DexScreener error", dexScreenerError);

    // Convert tokens to token cards when data loads, filtered by DexScreener availability
    useEffect(() => {
        if (tokens && tokens.length > 0) {
            // Create a set of token addresses that have trading pairs on DexScreener
            const dexScreenerTokens = new Set(
                dexScreenerData?.map(pair => pair.baseToken.address) || []
            );

            console.log("DexScreener available tokens:", Array.from(dexScreenerTokens));

            // Filter tokens to only include those with DexScreener trading data
            const filteredTokens = tokens.filter(token => {
                const hasTradeData = dexScreenerTokens.has(token.mint);
                console.log(`Token ${token.symbol} (${token.mint}): ${hasTradeData ? 'HAS' : 'NO'} trading data`);
                return hasTradeData;
            });

            console.log("Filtered tokens with trading data:", filteredTokens);

            const cards: TokenCard[] = filteredTokens.map(token => ({
                ...token,
                isSelected: false,
                selectedOrder: undefined,
                selectedAmount: token.amount // Default to full amount
            }));
            setTokenCards(cards);
        }
    }, [tokens, dexScreenerData]);

    // Scroll tracking for top container
    const [topCanScrollLeft, setTopCanScrollLeft] = useState(false);
    const [topCanScrollRight, setTopCanScrollRight] = useState(false);
    const topScrollRef = useRef<HTMLDivElement>(null);

    // Scroll tracking for bottom container  
    const [bottomCanScrollLeft, setBottomCanScrollLeft] = useState(false);
    const [bottomCanScrollRight, setBottomCanScrollRight] = useState(false);
    const bottomScrollRef = useRef<HTMLDivElement>(null);

    const checkScrollability = (element: HTMLDivElement, setCanScrollLeft: (val: boolean) => void, setCanScrollRight: (val: boolean) => void) => {
        if (!element) return;
        const { scrollLeft, scrollWidth, clientWidth } = element;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    };

    useEffect(() => {
        const topElement = topScrollRef.current;
        const bottomElement = bottomScrollRef.current;

        if (topElement) {
            checkScrollability(topElement, setTopCanScrollLeft, setTopCanScrollRight);
        }
        if (bottomElement) {
            checkScrollability(bottomElement, setBottomCanScrollLeft, setBottomCanScrollRight);
        }
    }, [tokenCards]);

    const handleTopScroll = () => {
        if (topScrollRef.current) {
            checkScrollability(topScrollRef.current, setTopCanScrollLeft, setTopCanScrollRight);
        }
    };

    const handleBottomScroll = () => {
        if (bottomScrollRef.current) {
            checkScrollability(bottomScrollRef.current, setBottomCanScrollLeft, setBottomCanScrollRight);
        }
    };

    const toggleToken = (mint: string) => {
        setTokenCards(prev => {
            const token = prev.find(t => t.mint === mint);
            if (!token) return prev;

            if (token.isSelected) {
                // Deselecting: remove from selectedTokens and adjust orders
                setSelectedCount(count => count - 1);
                setSelectedTokens(current => current.filter(t => t.mint !== mint));
                return prev.map(t => ({
                    ...t,
                    isSelected: t.mint === mint ? false : t.isSelected,
                    selectedOrder: t.mint === mint ? undefined :
                        (t.selectedOrder && token.selectedOrder && t.selectedOrder > token.selectedOrder)
                            ? t.selectedOrder - 1 : t.selectedOrder
                }));
            } else {
                // Selecting: add to selectedTokens
                setSelectedCount(count => count + 1);
                const updatedToken = { ...token, isSelected: true, selectedOrder: selectedCount };
                setSelectedTokens(current => [...current, updatedToken]);
                return prev.map(t =>
                    t.mint === mint
                        ? updatedToken
                        : t
                );
            }
        });
    };

    const selectedCards = tokenCards.filter(token => token.isSelected).sort((a, b) => (a.selectedOrder || 0) - (b.selectedOrder || 0));
    const unselectedCards = tokenCards.filter(token => !token.isSelected);

    const TokenCardComponent = ({ token, isInBottomRow = false, tokenValuesInSol, tokenValuesInUSD }: {
        token: TokenCard,
        isInBottomRow?: boolean,
        tokenValuesInSol: Record<string, number | null>,
        tokenValuesInUSD: Record<string, number | null>
    }) => {
        const totalValueInSol = tokenValuesInSol[token.mint];
        const totalValueInUSD = tokenValuesInUSD[token.mint];

        return (
            <div
                className={`
                    relative w-24 h-36 bg-white rounded-xl border-2 border-gray-800 cursor-pointer
                    transition-all duration-150 shadow-lg hover:shadow-xl
                    ${isInBottomRow ? "translate-y-16 hover:translate-y-12" : ""}
                    ${!isInBottomRow && "z-30"}
                `}
                onClick={() => isInBottomRow && toggleToken(token.mint)}
            >
                {/* Card Content */}
                <div className="w-full h-full p-1 flex flex-col justify-between">
                    {/* Top Left - Amount */}
                    <div className="flex flex-col items-start">
                        <div className="text-[8px] font-bold text-black leading-none">
                            {formatAmountAbbreviated(
                                token.isSelected && token.selectedAmount !== undefined
                                    ? token.selectedAmount
                                    : token.amount,
                                token.decimals
                            )}
                        </div>
                        {/* USD Price */}
                        {totalValueInUSD !== null && (
                            <div className="text-[6px] font-semibold text-green-600 leading-none mt-0.5">
                                ${formatAmountAbbreviated(totalValueInUSD, 2)}
                            </div>
                        )}
                        {/* SOL Price */}
                        {totalValueInSol !== null && (
                            <div className="text-[6px] font-semibold text-gray-600 leading-none">
                                {totalValueInSol.toFixed(4)} SOL
                            </div>
                        )}
                    </div>

                    {/* Center - Token Image + Symbol */}
                    <div className="flex flex-col items-center justify-center flex-1 mb-4">
                        <div className="w-6 h-6 relative mb-1">
                            <Image
                                src={token.image}
                                alt={token.symbol}
                                fill
                                className="rounded-full object-cover"
                                onError={(e) =>
                                    ((e.target as HTMLImageElement).src = "/solana-logo.png")
                                }
                            />
                        </div>
                        <div className={`${token.symbol.length > 8 ? 'text-[10px]' : 'text-sm'} font-black text-center text-black`}>
                            {token.symbol}
                        </div>
                    </div>

                    {/* Bottom Right - Amount */}
                    <div className="absolute bottom-1 right-1 flex flex-col items-end">
                        <div className="text-[8px] font-bold text-black leading-none mb-0.5">
                            {formatAmountAbbreviated(
                                token.isSelected && token.selectedAmount !== undefined
                                    ? token.selectedAmount
                                    : token.amount,
                                token.decimals
                            )}
                        </div>
                        {/* USD Price */}
                        {totalValueInUSD !== null && (
                            <div className="text-[6px] font-semibold text-green-600 leading-none mb-0.5">
                                ${formatAmountAbbreviated(totalValueInUSD, 2)}
                            </div>
                        )}
                        {/* SOL Price */}
                        {totalValueInSol !== null && (
                            <div className="text-[6px] font-semibold text-gray-600 leading-none">
                                {totalValueInSol.toFixed(4)} SOL
                            </div>
                        )}
                    </div>
                </div>

                {/* Selected Glow Effect */}
                {!isInBottomRow && (
                    <div className="absolute inset-0 border-2 border-yellow-400 rounded-xl shadow-lg shadow-yellow-400/50"></div>
                )}
            </div>
        );
    };

    // Show loading state
    if (loading) {
        return (
            <div className="relative text-[#FFD700] w-full h-full flex flex-col font-bold text-[1.2rem] items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFD700] mx-auto"></div>
                    <div className="mt-2 text-sm">Loading tokens...</div>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="relative text-[#FFD700] w-full h-full flex flex-col font-bold text-[1.2rem] items-center justify-center">
                <div className="text-center text-red-400">
                    <div className="text-sm">Error loading tokens:</div>
                    <div className="text-xs mt-1">{error}</div>
                </div>
            </div>
        );
    }

    // Show no tokens state
    if (!authenticated || !tokenCards.length) {
        return (
            <div className="relative text-[#FFD700] w-full h-full flex flex-col font-bold text-[1.2rem] items-center justify-center">
                <div className="text-center">
                    {!authenticated ? (
                        <WalletConnect />
                    ) : (
                        <div className="text-sm">No tokens found</div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="relative text-[#FFD700] w-full h-full flex flex-col font-bold text-[1.2rem]">
            {/* Selected Cards Row - Top */}
            <div className="relative h-1/2 w-full px-12 overflow-visible pt-12">
                {/* Left Chevron */}
                {topCanScrollLeft && (
                    <div className="absolute left-2 top-12 transform -translate-y-1/2 z-40  rounded-full p-1">
                        <ChevronLeft className="h-4 w-4 text-white" />
                    </div>
                )}

                {/* Right Chevron */}
                {topCanScrollRight && (
                    <div className="absolute right-2 top-12 transform -translate-y-1/2 z-40  rounded-full p-1">
                        <ChevronRight className="h-4 w-4 text-white" />
                    </div>
                )}

                <div
                    ref={topScrollRef}
                    onScroll={handleTopScroll}
                    className="absolute inset-x-0 -top-14
               h-full overflow-x-auto  z-20 pb-44
               [scrollbar-width:none]"
                >
                    <div className="relative flex gap-2 px-4 min-w-max h-full items-start">
                        {selectedCards.map((token, index) => (
                            <div
                                key={`selected-${token.mint}`}
                                style={{ zIndex: 20 - index }}
                                className="animate-in fade-in duration-300 group relative"
                            >
                                <TokenCardComponent token={token} isInBottomRow={false} tokenValuesInSol={tokenValuesInSol} tokenValuesInUSD={tokenValuesInUSD} />
                                {/* Down chevron that appears on hover */}
                                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                                    <div
                                        className="bg-black/70 rounded-full p-1 cursor-pointer hover:bg-black/90 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleToken(token.mint);
                                        }}
                                    >
                                        <ChevronDownIcon className="h-4 w-4 text-white" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Unselected Cards Row - Bottom */}
            <div className="relative h-1/2 w-full px-12">
                {/* Left Chevron */}
                {bottomCanScrollLeft && (
                    <div className="absolute left-2 bottom-4 transform -translate-y-1/2 z-40  rounded-full p-1">
                        <ChevronLeft className="h-4 w-4 text-white" />
                    </div>
                )}

                {/* Right Chevron */}
                {bottomCanScrollRight && (
                    <div className="absolute right-2 bottom-4 transform -translate-y-1/2 z-40  rounded-full p-1">
                        <ChevronRight className="h-4 w-4 text-white" />
                    </div>
                )}

                <div
                    ref={bottomScrollRef}
                    className="w-full h-full overflow-x-auto overflow-y-hidden"
                    style={{ scrollbarWidth: 'none' }}
                    onScroll={handleBottomScroll}
                >
                    <div className="relative flex gap-2 px-4 min-w-max h-full items-end pb-4">
                        {unselectedCards.map((token, index) => (
                            <div
                                key={token.mint}
                                style={{ zIndex: 10 - index }}
                            >
                                <TokenCardComponent token={token} isInBottomRow={true} tokenValuesInSol={tokenValuesInSol} tokenValuesInUSD={tokenValuesInUSD} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
