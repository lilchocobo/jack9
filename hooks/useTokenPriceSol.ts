import useSWR from 'swr';

interface JupiterPriceResponse {
  data: {
    [mintAddress: string]: {
      id: string;
      mintSymbol: string;
      vsToken: string;
      vsTokenSymbol: string;
      price: string; // v2 API returns prices as strings
    };
  };
}

const fetcher = async (url: string): Promise<JupiterPriceResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch token price');
  }
  return response.json();
};

export function useTokenPriceSol(mintAddress: string | undefined) {
  const solMint = 'So11111111111111111111111111111111111111112';
  
  const { data, error, isLoading, mutate } = useSWR(
    mintAddress && mintAddress !== solMint 
      ? `https://lite-api.jup.ag/price/v2?ids=${mintAddress}&vsToken=${solMint}`
      : null,
    fetcher,
    {
      refreshInterval: 60000, // Changed to 60 seconds to sync with SOL price
      dedupingInterval: 10000, // Dedupe requests within 10 seconds
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  // For SOL itself, price is always 1 SOL
  if (mintAddress === solMint) {
    return {
      price: 1,
      isLoading: false,
      isError: false,
      mutate: () => {},
    };
  }

  const tokenPriceString = mintAddress && data?.data?.[mintAddress]?.price;
  const tokenPrice = tokenPriceString ? parseFloat(tokenPriceString) : null;

  return {
    price: tokenPrice,
    isLoading,
    isError: !!error,
    mutate,
  };
}

// Hook for fetching multiple token prices at once
export function useTokenPricesSol(mintAddresses: string[]) {
  const solMint = 'So11111111111111111111111111111111111111112';
  
  // Filter out SOL mint and empty addresses
  const nonSolMints = mintAddresses.filter(mint => mint && mint !== solMint);
  
  const { data, error, isLoading, mutate } = useSWR(
    nonSolMints.length > 0 
      ? `https://lite-api.jup.ag/price/v2?ids=${nonSolMints.join(',')}&vsToken=${solMint}`
      : null,
    fetcher,
    {
      refreshInterval: 60000, // Changed to 60 seconds to sync with SOL price
      dedupingInterval: 10000,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  // Create prices object with all mints
  const prices: Record<string, number | null> = {};
  
  mintAddresses.forEach(mint => {
    if (mint === solMint) {
      prices[mint] = 1; // SOL price is always 1 SOL
    } else if (data?.data?.[mint]?.price) {
      // Convert string price to number
      prices[mint] = parseFloat(data.data[mint].price);
    } else {
      prices[mint] = null;
    }
  });

  return {
    prices,
    isLoading,
    isError: !!error,
    mutate,
  };
}