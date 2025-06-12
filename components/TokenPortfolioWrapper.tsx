'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { useSolPriceUSD } from '@/hooks/useSolPriceUSD';
import { useTokenPricesSol } from '@/hooks/useTokenPriceSol';
import { useTokenData } from '@/hooks/useTokenData';
import { formatAmountAbbreviated } from '@/utils/tokenUtils';
import TokenPortfolioView from './TokenPortfolioView';
import { WalletConnect } from './WalletConnect';

export default function TokenPortfolioWrapper() {
    const { authenticated, user } = usePrivy();
    const publicKey = user?.wallet?.address;
    const { tokens, loading, error } = useTokenBalances(publicKey);

    // Get SOL price
    const { price: solPrice } = useSolPriceUSD();

    // Get all mint addresses for price fetching
    const mintAddresses = useMemo(() => tokens?.map(token => token.mint) || [], [tokens]);
    const { prices: tokenPricesInSol } = useTokenPricesSol(mintAddresses);

    // Fetch token data from DexScreener to filter tokens with trading pairs
    const allMintAddresses = tokens?.map(token => token.mint) || [];
    const { data: dexScreenerData, error: dexScreenerError, isLoading: dexScreenerLoading } = useTokenData({
        chainId: "solana",
        tokenAddresses: allMintAddresses,
        enabled: allMintAddresses.length > 0
    });

    // Filter tokens to only include those with DexScreener trading data
    const filteredTokens = useMemo(() => {
        if (!tokens || !dexScreenerData) return [];
        
        const dexScreenerTokens = new Set(
            dexScreenerData.map(pair => pair.baseToken.address)
        );

        const filtered = tokens.filter(token => dexScreenerTokens.has(token.mint));
        console.log("Filtered tokens with trading data:", filtered);
        return filtered;
    }, [tokens, dexScreenerData]);

    // Calculate USD values for each token (for display purposes)
    const stackValues = useMemo(() => {
        if (!filteredTokens || !solPrice) return [];
        
        const values = filteredTokens.map(token => {
            const tokenPriceInSol = tokenPricesInSol[token.mint];
            if (tokenPriceInSol) {
                const valueInSol = token.amount * tokenPriceInSol;
                return valueInSol * solPrice;
            }
            return 0;
        });
        console.log("Stack values (USD):", values);
        return values;
    }, [filteredTokens, tokenPricesInSol, solPrice]);

    // State for slider values (now represents PERCENTAGES 0-100)
    const [sliderPercentages, setSliderPercentages] = useState<number[]>([]);

    // Initialize slider percentages when filteredTokens change
    useEffect(() => {
        console.log("Initializing slider percentages...");
        console.log("Filtered tokens length:", filteredTokens.length);
        console.log("Current slider percentages length:", sliderPercentages.length);
        console.log("Filtered tokens:", filteredTokens);
        
        if (filteredTokens.length > 0) {
            // Always reinitialize when filteredTokens changes
            const newSliderPercentages = filteredTokens.map(() => 50); // Default to 50%
            console.log("New slider percentages:", newSliderPercentages);
            setSliderPercentages(newSliderPercentages);
        } else {
            setSliderPercentages([]);
        }
    }, [filteredTokens]); // Changed dependency to the full array, not just length

    // Handle slider changes (now working with percentages 0-100)
    const handleSliderChange = (index: number, percentage: number) => {
        console.log(`Slider change - Index: ${index}, New percentage: ${percentage}%`);
        setSliderPercentages(prev => {
            const newPercentages = [...prev];
            newPercentages[index] = percentage;
            console.log("Updated slider percentages:", newPercentages);
            return newPercentages;
        });
    };

    // Helper functions for TokenPortfolioView
    const getTokenImage = (index: number) => {
        return filteredTokens[index]?.image || "/solana-logo.png";
    };

    const getTokenSymbol = (index: number) => {
        return filteredTokens[index]?.symbol || "Unknown";
    };

    const getRawTokenAmount = (index: number) => {
        const token = filteredTokens[index];
        if (!token) return "0";
        return formatAmountAbbreviated(token.amount, token.decimals);
    };

    // Calculate which column a token should be in (1-based)
    const getColumnForToken = (tokenIndex: number, totalTokens: number) => {
        return tokenIndex + 1; // Simple 1-to-1 mapping for now
    };

    // Calculate total columns needed - exactly match the number of tokens
    const totalColumns = filteredTokens.length;

    // Debug logging
    useEffect(() => {
        console.log("=== TOKEN PORTFOLIO DEBUG ===");
        console.log("SOL price:", solPrice);
        console.log("Tokens from hook:", tokens);
        console.log("Token prices in SOL:", tokenPricesInSol);
        console.log("DexScreener data:", dexScreenerData);
        console.log("Filtered tokens:", filteredTokens);
        console.log("Stack values (USD):", stackValues);
        console.log("Slider percentages:", sliderPercentages);
        console.log("============================");
    }, [solPrice, tokens, tokenPricesInSol, dexScreenerData, filteredTokens, stackValues, sliderPercentages]);

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

    // Show connect wallet state
    if (!authenticated) {
        return (
            <div className="relative text-[#FFD700] w-full h-full flex flex-col font-bold text-[1.2rem] items-center justify-center">
                <div className="text-center">
                    <WalletConnect />
                </div>
            </div>
        );
    }

    // Show no tokens state
    if (!filteredTokens.length) {
        return (
            <div className="relative text-[#FFD700] w-full h-full flex flex-col font-bold text-[1.2rem] items-center justify-center">
                <div className="text-center">
                    <div className="text-sm">No tokens with trading data found</div>
                    {dexScreenerLoading && <div className="text-xs mt-1">Loading trading data...</div>}
                    {dexScreenerError && <div className="text-xs mt-1 text-red-400">Error loading trading data</div>}
                </div>
            </div>
        );
    }

    // Show loading if we don't have price data yet
    if (!solPrice || Object.keys(tokenPricesInSol).length === 0) {
        return (
            <div className="relative text-[#FFD700] w-full h-full flex flex-col font-bold text-[1.2rem] items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFD700] mx-auto"></div>
                    <div className="mt-2 text-sm">Loading price data...</div>
                </div>
            </div>
        );
    }

    return (
        <TokenPortfolioView
            stackValues={stackValues}
            sliderValues={sliderPercentages} // Now percentages
            onSliderChange={handleSliderChange}
            filteredTokens={filteredTokens}
            totalColumns={totalColumns}
            getTokenImage={getTokenImage}
            getTokenSymbol={getTokenSymbol}
            getRawTokenAmount={getRawTokenAmount}
            getColumnForToken={getColumnForToken}
            tokenPricesInSol={tokenPricesInSol}
            solPrice={solPrice}
        />
    );
}