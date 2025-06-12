"use client";

import { useState, useEffect } from "react";
import useTokenData from "./useTokenData";

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_HELIUS_RPC ?? "";

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

function getTokenDecimals(mint: string): number {
  const map: Record<string, number> = {
    So11111111111111111111111111111111111111112: 9,
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 6,
    Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 6,
  };
  return map[mint] ?? 6;
}

export function useTokenBalances(publicKey: string | undefined) {
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