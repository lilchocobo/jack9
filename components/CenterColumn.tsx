import { Star } from "lucide-react";
import { EnterRound } from "./EnterRound";
import { HeaderAbsolute } from "./Header";
import JackpotDonutChart from "./JackpotDonutChart";
import TokenPortfolioWrapper from "./TokenPortfolioWrapper";

export function DebugBox() {
    return (
        <div className="bg-[#222] text-[#FFD700] w-full h-full border-2 border-[#FFD700] rounded-lg box-border flex items-center justify-center font-bold text-[1.2rem]">
            Debug Box (fills space below chart)
        </div>
    );
}

export function CenterColumn({
    currentRoundDeposits,
    setCurrentRoundDeposits,
    total,
    selectedTokens,
    setSelectedTokens,
    delayedExpandToken,
    handleClearDelayedExpand
}: {
    currentRoundDeposits: any,
    setCurrentRoundDeposits: any,
    total: any,
    selectedTokens: any,
    setSelectedTokens: any,
    delayedExpandToken?: any,
    handleClearDelayedExpand?: any
}) {
    return (
        <div className="md:col-span-2 w-full max-w-full min-w-0 h-full min-h-0 flex flex-col gap-2 overflow-visible">
            {/* <div className="pb-4 mb-4">
                <Header />
            </div> */}
            <div className="w-full h-[50vh] min-h-0 relative pb-20 pt-4 z-5"
            >
                {/* <DebugBox /> */}
                <JackpotDonutChart
                    deposits={currentRoundDeposits}
                    totalAmount={total}
                    simulateData={true}
                    onDepositsChange={setCurrentRoundDeposits}
                />
                {/* <div className="absolute bottom-0 left-0 w-full px-4">
                    <EnterRound
                        selectedTokens={selectedTokens}
                        onSelectedTokensChange={setSelectedTokens}
                    />
                </div> */}
                {/* <HeaderAbsolute /> */}

            </div>
            <div className="flex-1 min-h-0 overflow-visible" style={{ zIndex: 2 }}>
                <TokenPortfolioWrapper />
            </div>
        </div >
    );
}