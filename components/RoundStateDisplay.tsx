import { motion, AnimatePresence } from "framer-motion";

type RoundState = 'active' | 'ending' | 'ended' | 'starting';

interface RoundStateDisplayProps {
  roundState: RoundState;
  totalAmount: number;
  seconds: number;
  winner: string | null;
  winAmount: number;
  newRoundCountdown: number;
  isSpinning: boolean;
}

export function RoundStateDisplay({
  roundState,
  totalAmount,
  seconds,
  winner,
  winAmount,
  newRoundCountdown,
  isSpinning
}: RoundStateDisplayProps) {
  const formatTime = (timeInSeconds: number) => {
    return `0:${timeInSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-5">
      <AnimatePresence mode="wait">
        {roundState === 'active' && (
          <motion.div
            key="active"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="text-center"
          >
            <motion.span
              key={totalAmount}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="block text-6xl sm:text-7xl md:text-8xl font-extrabold"
              style={{
                fontFamily: 'Visby Round CF, SF Pro Display, sans-serif',
                color: '#FFD700',
                textShadow:
                  '3px 3px 0 #000000, -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 0 0 15px #FFD700, 0 0 25px #FFFF00',
              }}
            >
              ${totalAmount.toFixed(0)}
            </motion.span>
            <span
              className="text-sm uppercase font-bold tracking-wider mt-1"
              style={{
                fontFamily: 'Visby Round CF, SF Pro Display, sans-serif',
                color: '#FFD700',
                textShadow: '1px 1px 0 #000000, 0 0 5px #FFD700',
              }}
            >
              Round ends in
            </span>
            <span
              className="text-3xl sm:text-4xl font-extrabold ml-2"
              style={{
                fontFamily: 'Visby Round CF, SF Pro Display, sans-serif',
                color: '#FF1493',
                textShadow:
                  '2px 2px 0 #000000, -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 0 0 10px #FF1493, 0 0 20px #FF69B4',
              }}
            >
              {formatTime(seconds)}
            </span>
          </motion.div>
        )}

        {roundState === 'ending' && (
          <motion.div
            key="ending"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="text-center"
          >
            {/* Simplified spinning text - just "Selecting Winner" */}
            <motion.div
              animate={{
                opacity: [0.6, 1, 0.6]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity
              }}
              className="text-lg font-bold"
              style={{
                fontFamily: 'Visby Round CF, SF Pro Display, sans-serif',
                color: '#FFFF00',
                textShadow: '1px 1px 0 #000000, 0 0 8px #FFFF00',
              }}
            >
              Selecting Winner
            </motion.div>
          </motion.div>
        )}

        {roundState === 'ended' && winner && (
          <motion.div
            key="ended"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              <div
                className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2"
                style={{
                  fontFamily: 'Visby Round CF, SF Pro Display, sans-serif',
                  color: '#FFD700',
                  textShadow:
                    '2px 2px 0 #000000, -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 0 0 15px #FFD700',
                }}
              >
                🎉 {winner} WINS! 🎉
              </div>
              <div
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-2"
                style={{
                  fontFamily: 'Visby Round CF, SF Pro Display, sans-serif',
                  color: '#00FFFF',
                  textShadow:
                    '2px 2px 0 #000000, -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 0 0 15px #00FFFF',
                }}
              >
                ${winAmount.toFixed(0)}
              </div>
              <div
                className="text-lg font-bold"
                style={{
                  fontFamily: 'Visby Round CF, SF Pro Display, sans-serif',
                  color: '#FF1493',
                  textShadow: '1px 1px 0 #000000, 0 0 5px #FF1493',
                }}
              >
                New round in {newRoundCountdown}s
              </div>
            </motion.div>
          </motion.div>
        )}

        {roundState === 'starting' && (
          <motion.div
            key="starting"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{ 
                scale: [0.9, 1.1, 0.9],
              }}
              transition={{ 
                duration: 1, 
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold"
              style={{
                fontFamily: 'Visby Round CF, SF Pro Display, sans-serif',
                color: '#00FFFF',
                textShadow:
                  '3px 3px 0 #000000, -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 0 0 20px #00FFFF, 0 0 40px #00FFFF',
              }}
            >
              NEW ROUND!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}