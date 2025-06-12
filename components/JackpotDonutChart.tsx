'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { Connection } from '@solana/web3.js';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import { useAudioContext } from './AudioProvider';
import { jackpotAddr } from '@/lib/constants';
import { triggerJackpotConfetti } from '@/lib/confetti';
import { generateSpinningAngle, generateChartData } from '@/lib/wheel-utils';
import { SpinningWheel } from './SpinningWheel';
import { RoundStateDisplay } from './RoundStateDisplay';

// Add TypeScript declaration for window.solana
declare global {
  interface Window {
    solana?: {
      signAndSendTransaction: (transaction: any) => Promise<{ signature: string }>;
      isPhantom?: boolean;
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */
interface JackpotDonutChartProps {
  deposits: Deposit[];
  totalAmount: number;
  simulateData?: boolean;
  onRoundEnd?: (winner: string, amount: number) => void;
  onNewRound?: () => void;
  onDepositsChange?: (deposits: Deposit[] | ((prevDeposits: Deposit[]) => Deposit[])) => void;
}

interface Deposit {
  id: string;
  user: string;
  token: string;
  amount: number;
  timestamp: Date;
}

// Round states
type RoundState = 'active' | 'ending' | 'ended' | 'starting';

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */
export default function JackpotDonutChart({
  deposits,
  totalAmount,
  simulateData = false,
  onRoundEnd,
  onNewRound,
  onDepositsChange,
}: JackpotDonutChartProps) {
  /* -------------------------------- context ------------------------------ */
  const connection = new Connection(process.env.NEXT_PUBLIC_HELIUS_RPC!);
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const connectedWallet = wallets[0];
  const walletAddress = user?.wallet?.address;
  
  // Audio context
  const { playSound } = useAudioContext();

  /* -------------------------------- state -------------------------------- */
  // Round management state
  const [roundState, setRoundState] = useState<RoundState>('active');
  const [winner, setWinner] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  
  // Spinning wheel state
  const [isSpinning, setIsSpinning] = useState(false);
  const [finalSpinAngle, setFinalSpinAngle] = useState(0);
  const [selectedWinner, setSelectedWinner] = useState<Deposit | null>(null);
  const [shouldResetWheel, setShouldResetWheel] = useState(false);

  // 🔥 CRITICAL: Block new deposits during animations
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ------------------------ data simulation ------------------------ */
  useEffect(() => {
    // 🔥 CRITICAL: Stop simulation completely during animations or non-active states
    if (!simulateData || roundState !== 'active' || isAnimating) return;

    const interval = setInterval(() => {
      // 🔥 Double-check animation state before adding deposit
      if (isAnimating) return;

      const isUserDeposit = Math.random() < 0.2; // 20% chance it's the user
      const newDeposit: Deposit = {
        id: Math.random().toString(36).substr(2, 9),
        user: isUserDeposit ? 'You' : `User${Math.floor(Math.random() * 9999)}`,
        token: Math.random() > 0.7 ? 'USDC' : 'SOL',
        amount: Math.floor(Math.random() * 500) + 50, // $50-$550
        timestamp: new Date(),
      };

      // 🔥 CRITICAL: Set animation flag BEFORE updating data
      setIsAnimating(true);

      // Update deposits through parent component
      onDepositsChange?.(prevDeposits => [...prevDeposits, newDeposit]);
      
      // 🎵 PLAY AUDIO BASED ON DEPOSIT TYPE
      if (isUserDeposit) {
        playSound('userDeposit');
      } else {
        playSound('deposit');
      }
      
      // Toast notification for new deposit
      toast({
        title: '🎰 New Deposit!',
        description: `${newDeposit.user} deposited $${newDeposit.amount} ${newDeposit.token}`,
        duration: 2000,
      });

      // 🔥 CRITICAL: Clear animation flag after animation completes
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
      }, 1500); // 1.5 seconds - longer than Recharts animation

    }, Math.random() * 4000 + 5000); // 5-9 seconds (even longer gap)

    return () => clearInterval(interval);
  }, [simulateData, roundState, onDepositsChange, playSound, isAnimating]);

  // Cleanup animation timeout
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  /* ------------------------ responsive ring sizing ------------------------ */
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartDims, setChartDims] = useState({ inner: 140, outer: 200 });
  useEffect(() => {
    const onResize = () => {
      if (!containerRef.current) return;
      const { clientWidth: w, clientHeight: h } = containerRef.current;
      const r = Math.min(w, h) * 0.48;
      setChartDims({ inner: r * 0.72, outer: r });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ------------------------------ countdown ------------------------------ */
  const [seconds, setSeconds] = useState(54);
  const [newRoundCountdown, setNewRoundCountdown] = useState(10);

  useEffect(() => {
    const interval = setInterval(() => {
      if (roundState === 'active') {
        setSeconds((s) => {
          if (s <= 1) {
            // Round is ending
            setRoundState('ending');
            return 0;
          }
          return s - 1;
        });
      } else if (roundState === 'ended') {
        setNewRoundCountdown((s) => {
          if (s <= 1) {
            // Start new round
            startNewRound();
            return 10;
          }
          return s - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [roundState]);

  // Handle round ending sequence
  useEffect(() => {
    if (roundState === 'ending') {
      // 🔥 CRITICAL: Stop all animations during round end
      setIsAnimating(true);

      if (deposits.length === 0) {
        // No deposits, skip spinning
        setRoundState('ended');
        return;
      }

      // Select winner immediately
      const randomWinner = deposits[Math.floor(Math.random() * deposits.length)];
      setSelectedWinner(randomWinner);

      // Small delay before starting the spin
      setTimeout(() => {
        // Start spinning animation
        setIsSpinning(true);
        
        // Calculate dramatic final spin angle with near-miss effects
        const dramaticSpinAngle = generateSpinningAngle(deposits, randomWinner, totalAmount);
        setFinalSpinAngle(dramaticSpinAngle);
      }, 500);
      
      // After spinning animation completes, reveal winner
      setTimeout(() => {
        setIsSpinning(false);
        setWinner(randomWinner.user);
        setWinAmount(totalAmount);
        
        // 🎵 PLAY WIN SOUND
        playSound('win');
        
        // 🎉 TRIGGER CONFETTI CELEBRATION! 🎉
        triggerJackpotConfetti();
        
        // Call parent callback if provided
        onRoundEnd?.(randomWinner.user, totalAmount);
        
        toast({
          title: '🎉 JACKPOT WINNER! 🎉',
          description: `${randomWinner.user} won $${totalAmount.toFixed(0)}!`,
          duration: 5000,
        });
        
        setRoundState('ended');
      }, 7000); // 6.5s spinning + 0.5s buffer
    }
  }, [roundState, deposits, totalAmount, onRoundEnd, playSound]);

  const startNewRound = () => {
    setRoundState('starting');
    
    // IMPORTANT: Reset wheel position for new round
    setShouldResetWheel(true);
    
    // Reset all round data
    onDepositsChange?.([]);
    setWinner(null);
    setWinAmount(0);
    setSeconds(54);
    setNewRoundCountdown(10);
    setIsSpinning(false);
    setFinalSpinAngle(0);
    setSelectedWinner(null);
    setIsAnimating(false); // Reset animation flag
    
    // Call parent callback if provided
    onNewRound?.();
    
    toast({
      title: '🎰 NEW ROUND STARTED!',
      description: 'Place your deposits now!',
      duration: 3000,
    });
    
    // Start the new round after a brief moment and stop wheel reset
    setTimeout(() => {
      setRoundState('active');
      setShouldResetWheel(false); // Stop the reset after the wheel has moved
    }, 1000);
  };

  /* ------------------------------ chart data ----------------------------- */
  // 🔥 THE REAL FIX: Calculate totalAmount INSIDE useMemo to avoid external dependency
  const chartData = useMemo(() => {
    // Calculate total inside useMemo to avoid dependency issues
    const calculatedTotal = deposits.reduce((sum, deposit) => sum + deposit.amount, 0);
    return generateChartData(deposits, calculatedTotal);
  }, [deposits]); // 🔥 ONLY depend on deposits array, not external totalAmount!

  /* --------------------------------- UI ---------------------------------- */
  return (
    <div className="flex flex-col items-center relative h-full mb-2">
      <div className="w-full flex flex-col items-center gap-0 h-full">
        {/* ------------------------------- RING ------------------------------ */}
        <div
          ref={containerRef}
          className="relative w-full h-full"
        >
          <SpinningWheel
            chartData={chartData}
            chartDims={chartDims}
            isSpinning={isSpinning}
            finalSpinAngle={finalSpinAngle}
            shouldReset={shouldResetWheel}
          />

          <RoundStateDisplay
            roundState={roundState}
            totalAmount={totalAmount}
            seconds={seconds}
            winner={winner}
            winAmount={winAmount}
            newRoundCountdown={newRoundCountdown}
            isSpinning={isSpinning}
          />
        </div>
      </div>
    </div>
  );
}