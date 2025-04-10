
export default function HowItWorksPage() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-blue-900 text-white p-6">
      <h1 className="text-2xl font-bold text-center mb-4">How Winners Are Picked 👀</h1>
      <p className="mb-4 text-center">
        Our system uses a smart combo of liquidity and price changes to decide if a memecoin pumped, rugged, or did nothing special.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">🏆 What Makes a Winner?</h2>

      <p className="mb-2">
        <strong>When "RUG" Wins:</strong>
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>If liquidity suddenly disappears (drops 90%+) = Instant RUG win</li>
        <li>If the overall health score drops by 15% or more = RUG win</li>
      </ul>

      <p className="mb-2">
        <strong>When "PUMP" Wins:</strong>
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>If the overall health score jumps up by 15% or more = PUMP win</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">🔄 Partial Bet Matching</h2>
      
      <p className="mb-2 text-center mt-5">
        When you place a bet, it might not get fully matched right away. Here's how our partial matching works:
      </p>
      
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Gradual Matching:</strong> Your bet may match with multiple smaller bets from other players</li>
        <li><strong>Dynamic Odds:</strong> As bets get matched, the odds can shift based on the betting activity</li>
        <li><strong>Partial Returns:</strong> Any portion of your bet that doesn't get matched by game start will be returned to your wallet</li>
        <li><strong>Real-time Updates:</strong> You'll see how much of your bet is matched and current odds right in your bet history</li>
      </ul>
      
      <p className="mb-4 text-center">
        For example: If you bet 100 SOL on PUMP, but only 75 SOL gets matched with RUG bets, you'll play with 75 SOL at the odds at time of match, and the other 25 SOL will be returned.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">🛡️ Anti-Cheat System</h2>

      <ul className="list-disc pl-6 mb-4">
        <li>
          <strong>Liquidity Matters Most:</strong> We care more about liquidity (70%) than price since it's harder to fake
        </li>
        <li>
          <strong>Mid-Game Lockout:</strong> Betting closes halfway through, so nobody can place bets once they see which way things are heading
        </li>
        <li>
          <strong>Late-Game Protection:</strong> We detect if someone tries to manipulate the coin after betting closes
        </li>
        <li>
          <strong>Quality Control:</strong> Only coins with enough liquidity can be listed
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">⏱️ Quick Results</h2>
      <p className="mb-4 text-center">
        Games run for just 10-30 minutes so you don't have to wait long to see if you won!
      </p>
    </div>
  );
}