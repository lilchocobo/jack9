"use client";

import { Wallet } from "lucide-react";
import { usePrivy } from '@privy-io/react-auth';
import { WalletConnect } from './WalletConnect';

export function ThirdRow() {
  const { authenticated } = usePrivy();

  if (!authenticated) {
    return (
      <div className="flex justify-center items-center p-2">
        <div className="casino-box casino-box-gold p-3 rounded-lg">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 casino-text-gold" />
            <span className="text-sm font-black casino-text-gold" 
                  style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}>
              Connect Wallet to Play
            </span>
            <div className="ml-2">
              <WalletConnect />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Return empty div when authenticated since logout is now a fixed positioned button
  return <div></div>;
}