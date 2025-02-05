export default function HowItWorksPage() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-4">How it Works</h1>
      <p className="text-center">
        <strong>The Rug Game</strong> allows you to predict and bet on the performance of memecoins
        in the crypto market.
      </p>
      <p className="mb-6">Our platform is built for transparency and engagement, 
      ensuring fair play for all users.</p>
      <ol className="text-center space-y-4 mb-6">
        <li>step 1: choose a memecoin that you believe will pump or rug</li>
        <li>step 2: place your bet on whether it will pump or rug within the specified timeframe</li>
        <li>step 3: track your bets and watch live activity on the platform</li>
        <li>step 4: if your prediction is correct, claim your winnings instantly</li>
        <li>
          step 5: enjoy the thrill of the game while climbing the leaderboard
          for the most successful bets
        </li>
      </ol>
      <div className="flex justify-center space-x-4">
        <a href="/privacy" className="text-blue-400 hover:underline">
          privacy policy
        </a>
        <span>|</span>
        <a href="/terms" className="text-blue-400 hover:underline">
          terms of service
        </a>
        <span>|</span>
        <a href="/fees" className="text-blue-400 hover:underline">
          fees
        </a>
      </div>
    </div>
  );
}
