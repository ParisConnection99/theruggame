export default function Fees() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow p-6">
        <h1 className="text-3xl font-bold mb-6 mt-10">Fees</h1>
        <p className="mb-4 mt-10">
          The following are fees charged by <strong>The Rug Game</strong> platform when you use <strong>The Rug Game</strong> platform:
        </p>
        <table className="w-full border-collapse border border-gray-300 mt-10">
          <thead>
            <tr className="bg-gray-800">
              <th className="border border-gray-300 px-4 py-2 text-left">Action</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Fee</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-4 py-2">Place a bet</td>
              <td className="border border-gray-300 px-4 py-2">2% of the bet amount (in SOL)</td>
            </tr>
            <tr className="bg-gray-800">
              <td className="border border-gray-300 px-4 py-2">Claim winnings</td>
              <td className="border border-gray-300 px-4 py-2">No fee</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2">Refunds</td>
              <td className="border border-gray-300 px-4 py-2">No fee</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-10">
          Note that none of <strong>The Rug Game</strong> frontend services (the <strong>The Rug Game</strong> web app, 
          <strong> The Rug Game</strong> dashboard, and any future <strong>The Rug Game</strong> mobile apps) 
          charge any fees in addition to those above. If you access <strong>The Rug Game</strong> platform or 
          smart contracts via another interface or platform, you may incur additional fees charged by those interfaces or platforms.
        </p>
      </main>
    </div>
  );
};

