import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-4">How it Works</h1>
      <p className="text-center">
        <strong>The Rug Game</strong> allows you to predict and bet on the performance of memecoins
        in the crypto market.
      </p>
      <p className="mb-6 text-center mt">
        Our platform is built for transparency and engagement, ensuring fair play for all users.
      </p>

      {/* Steps Section */}
      <ol className="text-center space-y-4 mb-6">
        <li>Step 1: Choose a memecoin that you believe will pump or rug</li>
        <li>Step 2: Place your bet on whether it will pump or rug within the specified timeframe</li>
        <li>Step 3: Track your bets and watch live activity on the platform</li>
        <li>Step 4: If your prediction is correct, claim your winnings instantly</li>
        <li>Step 5: Enjoy the thrill of the game while climbing the leaderboard for the most successful bets</li>
      </ol>

      {/* Game Rules Section */}
      <div className="max-w-3xl p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-yellow-400 text-center">Game Rules: What Counts as a "Rug" or "Pump"?</h2>
        <p className="mb-4 text-center">
          To ensure fair and transparent betting, The Rug Game follows strict definitions of what qualifies as a <strong>"Rug"</strong> and a <strong>"Pump"</strong>.
        </p>

        {/* Rug Conditions */}
        <h3 className="text-lg font-semibold mb-2 text-red-500 text-center">✅ What is a "Rug"?</h3>
        <ul className="list-disc pl-5 space-y-2 mb-4 text-center">
          <li><strong>Liquidity Pull (Hard Rug):</strong> Liquidity drops by <strong>90% or more</strong>. Example: 100 SOL → 5 SOL.</li>
          <li><strong>Massive Price Crash (Soft Rug):</strong> Price drops by <strong>80% or more</strong>. Example: $0.10 → $0.02.</li>
          <li><strong>Developer Dumps Supply (Insider Rug):</strong> A deployer or whale (<strong>30% supply</strong>) sells 90%+ of their tokens.</li>
          <li><strong>Trading Disabled / Withdrawals Blocked:</strong> If trading is paused or wallets are blocked from selling.</li>
        </ul>

        {/* Pump Conditions */}
        <h3 className="text-lg font-semibold mb-2 text-green-400 text-center">✅ What is a "Pump"?</h3>
        <ul className="list-disc pl-5 space-y-2 mb-4 text-center">
          <li><strong>Price Increase of 50%+:</strong> The token price jumps by <strong>50% or more</strong>.</li>
          <li><strong>Massive Buy Volume:</strong> Buy volume is <strong>5x higher</strong> than sell volume.</li>
        </ul>

        {/* No Outcome */}
        <h3 className="text-lg font-semibold mb-2 text-gray-300 text-center">❌ What Happens if Neither a Rug nor Pump Occurs?</h3>
        <p className="mb-4 text-center">If no conditions are met, both bets are lost, and the house keeps the SOL.</p>

        {/* Anti-Manipulation Rules */}
        <h3 className="text-lg font-semibold mb-2 text-purple-400 text-center">🚨 Anti-Manipulation Rules</h3>
        <ul className="list-disc pl-5 space-y-2 mb-4 text-center">
          <li><strong>Coin Creators Can't Bet on Their Own Tokens:</strong> Deployer wallets are restricted.</li>
          <li><strong>Low Liquidity Coins Are Auto-Rejected:</strong> Minimum 5 SOL liquidity required.</li>
          <li><strong>Payout Verification:</strong> To ensure fairness, bet outcomes are verified before processing payouts. This helps prevent last-second manipulation.</li>
        </ul>

        {/* Betting Summary Table */}
        <h3 className="text-lg font-semibold mb-4 text-yellow-400 text-center">📌 Summary of Bet Outcomes</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-600 text-sm">
            <thead>
              <tr className="bg-gray-700">
                <th className="border border-gray-600 p-2">Condition</th>
                <th className="border border-gray-600 p-2">Bet Outcome</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-600 p-2">Liquidity Drops 90%+</td>
                <td className="border border-gray-600 p-2 text-red-500 font-bold">✅ Rug Wins</td>
              </tr>
              <tr>
                <td className="border border-gray-600 p-2">Price Drops 80%+</td>
                <td className="border border-gray-600 p-2 text-red-500 font-bold">✅ Rug Wins</td>
              </tr>
              <tr>
                <td className="border border-gray-600 p-2">Dev Dumps 90%+ of Supply</td>
                <td className="border border-gray-600 p-2 text-red-500 font-bold">✅ Rug Wins</td>
              </tr>
              <tr>
                <td className="border border-gray-600 p-2">Trading Disabled / Blocked</td>
                <td className="border border-gray-600 p-2 text-red-500 font-bold">✅ Rug Wins</td>
              </tr>
              <tr>
                <td className="border border-gray-600 p-2">Price Increases 50%+</td>
                <td className="border border-gray-600 p-2 text-green-400 font-bold">✅ Pump Wins</td>
              </tr>
              <tr>
                <td className="border border-gray-600 p-2">Buy Volume is 5x Sell Volume</td>
                <td className="border border-gray-600 p-2 text-green-400 font-bold">✅ Pump Wins</td>
              </tr>
              <tr>
                <td className="border border-gray-600 p-2">None of the Above Happens</td>
                <td className="border border-gray-600 p-2 text-gray-400 font-bold">❌ House Wins</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
