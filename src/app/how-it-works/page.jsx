import Link from "next/link";

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

      {/* <p className="mb-2">
        <strong>When "HOUSE" Wins:</strong>
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>If nothing dramatic happens and the token stays relatively stable = HOUSE win</li>
      </ul> */}

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
      <p className="mb-4">
        Games run for just 10-30 minutes so you don't have to wait long to see if you won!
      </p>
    </div>
  );
}