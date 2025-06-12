/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export interface Deposit {
  id: string;
  user: string;
  token: string;
  amount: number;
  timestamp: Date;
}

export interface ChartSlice {
  value: number;
  color: string;
  /** Unique identifier for React keys and animations */
  key: string;
  /** present on the "capacity-left" slice only */
  isRemaining?: true;
  deposit?: Deposit;
}

// Calculate the angle for a specific deposit in the pie chart
export function calculateDepositAngle(
  deposits: Deposit[], 
  targetDeposit: Deposit, 
  totalAmount: number
): { startAngle: number; endAngle: number; sliceAngle: number } {
  const remainingCap = Math.max(2000 - totalAmount, 0);
  // 🔥 KEEP CHRONOLOGICAL ORDER - no sorting!
  const chronological = [...deposits];
  
  let cumulativeAngle = 0;
  
  // Start from remaining capacity (first slice) - starts at 90 degrees (top)
  const remainingSliceAngle = (remainingCap / (totalAmount + remainingCap)) * 360;
  cumulativeAngle += remainingSliceAngle;
  
  // Find our target deposit and calculate its angle range
  for (const deposit of chronological) {
    const sliceAngle = (deposit.amount / (totalAmount + remainingCap)) * 360;
    
    if (deposit.id === targetDeposit.id) {
      // Return the angle info for this slice
      return {
        startAngle: cumulativeAngle,
        endAngle: cumulativeAngle + sliceAngle,
        sliceAngle: sliceAngle
      };
    }
    
    cumulativeAngle += sliceAngle;
  }
  
  return { startAngle: 0, endAngle: 0, sliceAngle: 0 }; // Fallback
}

// Generate dramatic spinning angle with near-miss effects
export function generateSpinningAngle(
  deposits: Deposit[],
  winner: Deposit,
  totalAmount: number
): number {
  const angleInfo = calculateDepositAngle(deposits, winner, totalAmount);
  const { startAngle, endAngle, sliceAngle } = angleInfo;
  
  // Create different spinning scenarios for drama
  const scenarios = [
    'barely_made_it',    // Just barely crosses into winner's section
    'almost_missed',     // Almost went to next section but stopped just before
    'center_hit',        // Lands right in the center of winner's section  
    'close_call_before', // Almost lands on previous section
    'close_call_after'   // Almost lands on next section
  ];
  
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  // Base rotations: 6-12 full spins for maximum drama
  const baseRotations = 6 + Math.random() * 6;
  let targetPosition: number;
  
  switch (scenario) {
    case 'barely_made_it':
      // Land just 2-8% into the winner's slice
      targetPosition = startAngle + (sliceAngle * (0.02 + Math.random() * 0.06));
      break;
      
    case 'almost_missed': 
      // Land just 2-8% before the end of winner's slice
      targetPosition = endAngle - (sliceAngle * (0.02 + Math.random() * 0.06));
      break;
      
    case 'center_hit':
      // Land in the middle 40% of the winner's slice
      const centerStart = startAngle + (sliceAngle * 0.3);
      const centerEnd = startAngle + (sliceAngle * 0.7);
      targetPosition = centerStart + Math.random() * (centerEnd - centerStart);
      break;
      
    case 'close_call_before':
      // Land very close to the start, creating tension
      targetPosition = startAngle + (sliceAngle * (0.01 + Math.random() * 0.04));
      break;
      
    case 'close_call_after':
      // Land very close to the end, creating tension
      targetPosition = endAngle - (sliceAngle * (0.01 + Math.random() * 0.04));
      break;
      
    default:
      targetPosition = (startAngle + endAngle) / 2; // Center fallback
  }
  
  // Add some wobble for realism (±1 degree)
  targetPosition += (Math.random() - 0.5) * 2;
  
  // The pointer is at the top (0 degrees), so we need to position the winner's section there
  // Convert from pie chart angles (starting at 90 degrees) to wheel rotation
  const finalAngle = (baseRotations * 360) + (90 - targetPosition);
  
  console.log(`🎰 Spinning scenario: ${scenario}`);
  console.log(`🎯 Winner slice: ${startAngle.toFixed(1)}° to ${endAngle.toFixed(1)}° (${sliceAngle.toFixed(1)}° wide)`);
  console.log(`📍 Landing at: ${targetPosition.toFixed(1)}°`);
  console.log(`🌀 Total spin: ${finalAngle.toFixed(1)}° (${(finalAngle/360).toFixed(1)} rotations)`);
  
  return finalAngle;
}

export function generateChartData(
  deposits: Deposit[],
  totalAmount: number
): ChartSlice[] {
  const remainingCap = Math.max(2000 - totalAmount, 0);

  const chartColors = [
    '#FFD700', '#FF1493', '#FF8C00', '#FFFF00', '#FF69B4',
    '#00FFFF', '#9932CC', '#32CD32', '#FF4500', '#1E90FF',
    '#FF6347', '#8A2BE2', '#00FA9A', '#DC143C', '#40E0D0',
    '#FFA500', '#DA70D6', '#98FB98', '#F0E68C', '#DDA0DD',
  ];
  const bgColor = '#1A0B2E';

  // 🔥 NO SORTING! Keep deposits in chronological order (order they were added)
  // This prevents existing slices from jumping around when new ones are added
  const chronological = [...deposits];

  // Create chart data in correct order: remaining capacity first, then deposits in chronological order
  const slices: ChartSlice[] = [
    {
      key: 'remaining-capacity',
      value: remainingCap,
      color: bgColor,
      isRemaining: true,
    },
    ...chronological.map((d, i) => ({
      key: d.id, // Use deposit ID as stable key
      value: d.amount,
      color: chartColors[i % chartColors.length],
      deposit: d,
    }))
  ];

  return slices;
}