'use client';

import JackpotDonutChart from "@/components/JackpotDonutChart";
import { ChatSection } from "@/components/ChatSection";
import { FloatingTokens } from "@/components/FloatingTokens";
import { SunburstBackground } from "@/components/SunburstBackground";
import { TokenSelector } from "@/components/TokenSelector";
import { LeftColumn } from "@/components/LeftColumn";
import { RightColumn } from "@/components/RightColumn";
import { EnterRound } from "@/components/EnterRound";
import { ThirdRow } from "@/components/ThirdRow";
import { LogoutButton } from "@/components/LogoutButton";
import { chatMessages } from "@/lib/mock-data";
import { useState } from "react";
import { CenterColumn } from "@/components/CenterColumn";

interface Deposit {
  id: string;
  user: string;
  token: string;
  amount: number;
  timestamp: Date;
}

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


export default function Home() {
  // State for current round deposits - shared between donut chart and deposits table
  const [currentRoundDeposits, setCurrentRoundDeposits] = useState<Deposit[]>([]);

  // State for selected tokens (for the TokenSelector component)
  const [selectedTokens, setSelectedTokens] = useState<TokenRow[]>([]);

  // State for which token should auto-expand (delayed)
  const [delayedExpandToken, setDelayedExpandToken] = useState<string | null>(null);

  // Calculate total from current round deposits
  const total = currentRoundDeposits.reduce((sum, deposit) => sum + deposit.amount, 0);

  const handleClearDelayedExpand = () => {
    setDelayedExpandToken(null);
  };

  return (
    <main
      className="h-screen w-screen relative overflow-hidden"

    >
      {/* Grid Background */}
      <SunburstBackground />

      <FloatingTokens />

      {/* Fixed Logout Button */}
      {/* <LogoutButton /> */}

      <div className="w-full h-full grid grid-rows-[1fr_auto] gap-1 p-2 pb-0 border-4 border-blue-500 bg-green-100">
        {/* Main Content Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 w-full h-full min-h-0 border-4 border-purple-500 bg-pink-100">


          {/* Left Column - Total Deposits, Current Round, Past Winners */}
          <div className="md:col-span-1 h-full border-4 border-orange-500">
            <LeftColumn
              deposits={currentRoundDeposits}
              onDepositsChange={setCurrentRoundDeposits}
            />
          </div>

          {/* Center Column - Donut Chart + Enter Round + Token Selector */}
          <div className="md:col-span-2 w-full max-w-full min-w-0 h-full min-h-0 z-1"
            id="CENTER"
          >
            <CenterColumn
              currentRoundDeposits={currentRoundDeposits}
              setCurrentRoundDeposits={setCurrentRoundDeposits}
              total={total}
              selectedTokens={selectedTokens}
              setSelectedTokens={setSelectedTokens}
              delayedExpandToken={delayedExpandToken}
              handleClearDelayedExpand={handleClearDelayedExpand}
            />
          </div>

          {/* Right Column - Largest Win + Chat + Logo */}
          <div className="md:col-span-1 w-full max-w-full min-w-0 overflow-hidden h-full flex flex-col border-4 border-lime-500">
            <RightColumn messages={chatMessages} />
          </div>

        </div>
      </div>
    </main>
  );
}