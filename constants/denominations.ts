export const CHIP_DENOMINATIONS = [
  { value: 1000000, color: 'bg-amber-500', textColor: 'black', name: '$1M' },
  { value: 500000, color: 'bg-violet-600', textColor: 'white', name: '$500K' },
  { value: 100000, color: 'bg-rose-600', textColor: 'white', name: '$100K' },
  { value: 50000, color: 'bg-emerald-600', textColor: 'white', name: '$50K' },
  { value: 10000, color: 'bg-orange-600', textColor: 'white', name: '$10K' },
  { value: 5000, color: 'bg-yellow-500', textColor: 'black', name: '$5K' },
  { value: 1000, color: 'bg-gray-900', textColor: 'white', name: '$1K' },
  { value: 500, color: 'bg-purple-600', textColor: 'white', name: '$500' },
  { value: 100, color: 'bg-red-500', textColor: 'white', name: '$100' },
  { value: 50, color: 'bg-orange-500', textColor: 'black', name: '$50' },
  { value: 20, color: 'bg-green-500', textColor: 'black', name: '$20' },
  { value: 10, color: 'bg-blue-500', textColor: 'white', name: '$10' },
  { value: 5, color: 'bg-yellow-400', textColor: 'black', name: '$5' },
  { value: 1, color: 'bg-cyan-400', textColor: 'black', name: '$1' }
];

export const getChipStyle = (value: number) => {
  // Handle penny chips (any value less than $1)
  if (value < 1) {
    return { value, color: 'bg-gray-300', textColor: 'black', name: `${Math.round(value * 100)}¢` };
  }
  
  const found = CHIP_DENOMINATIONS.find(d => d.value === value);
  if (!found) {
    console.warn(`No chip style found for value: ${value}`);
    return CHIP_DENOMINATIONS[13]; // Default to $1 chip style (now at index 13)
  }
  return found;
};