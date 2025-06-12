"use client";

import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { SlidingNumber } from "@/components/ui/sliding-number";
import { useState, useEffect } from "react";
import { CurrentDeposits } from "./CurrentDeposits";
import { PastWinners } from "./PastWinners";

interface Deposit {
  id: string;
  user: string;
  token: string;
  amount: number;
  timestamp: Date;
}

interface LeftColumnProps {
  deposits: Deposit[];
  onDepositsChange?: (deposits: Deposit[]) => void;
}

export function LeftColumn({ deposits, onDepositsChange }: LeftColumnProps) {
  const [totalDeposits, setTotalDeposits] = useState(7961280);

  useEffect(() => {
    const interval = setInterval(() => {
      setTotalDeposits(prev => prev + Math.floor(Math.random() * (1000 - 100) + 100));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Total Deposits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="casino-box casino-box-gold overflow-hidden h-24 flex flex-col">
          <CardContent className="bg-gradient-to-b from-[#4A0E4E] to-[#2D0A30] p-2 flex-1 flex flex-col justify-center items-center">
            <p className="text-lg sm:text-xl md:text-2xl uppercase font-bold text-center tracking-wider casino-text-yellow mb-2"
              style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}>
              Total Deposits
            </p>
            <div className="text-2xl sm:text-3xl md:text-4xl font-black casino-text-gold flex items-center"
              style={{ fontFamily: "Visby Round CF, SF Pro Display, sans-serif" }}>
              $<SlidingNumber value={totalDeposits} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Current Round - Takes up most of the available space */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex-1 min-h-0"
      >
        <CurrentDeposits 
          deposits={deposits}
          onDepositsChange={onDepositsChange}
        />
      </motion.div>
    </div>
  );
}