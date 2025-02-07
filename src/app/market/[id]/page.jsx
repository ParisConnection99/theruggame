"use client"; // Required for hooks in the App Router

import { useState } from "react"; // Import useState for managing state
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function MarketPage() {
  const pathname = usePathname(); // Get the dynamic market ID from the URL
  const id = pathname.split("/").pop(); // Extract the market ID

  // Use state to manage the active state of the buttons
  const [isPumpActive, setIsPumpActive] = useState(true); // Default is 'Pump' active

  // Toggle function to switch between buttons
  const handleButtonClick = (isPump) => {
    setIsPumpActive(isPump);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-900 text-white">
      {/* Market Header */}
      <div className="flex items-center justify-between">
        {/* Title and Image */}
        <div className="flex items-center gap-4 mt-8">
          <Image
            src="/images/eth.webp" // Update this path to your actual image file
            alt="Market Image"
            width={50}
            height={50}
            className="rounded-full"
          />
          <h1 className="text-2xl font-bold">Will PEPE Pump or Rug in the next 10 mins?</h1>
        </div>
      </div>

      {/* Current Price + Liquidity */}
      <div className="mt-8 text-2xl font-semibold text-white">
        Current Price: <span className="text-green-400">0.0023 SOL</span>
      </div>

      <div className="text-lg text-gray-400 mt-2">
        Liquidity: <span className="text-white">$85,000</span>
      </div>

      {/* Market Details */}
      <div className="mt-10 flex gap-8 text-gray-400">
        <p className="text-green-500 font-semibold">SOL Wagered: 100 SOL ($20,000)</p> { /* This is how much sol wagered*/}
        <p>market closes in 5 minutes</p>
      </div>

      {/* Main Section: Chart and Buy/Sell */}
      <div className="flex flex-col lg:flex-row mt-6 gap-6">
        {/* Chart (Left Section) */}
        <div className="flex-1 bg-gray-800 rounded-md p-4 h-64">
          <p className="text-gray-500">[Chart Placeholder]</p>
        </div>

        {/* Buy/Sell Section (Right Section) */}
        <div className="w-full lg:w-96 bg-gray-800 rounded-md p-4">
          {/* Buy/Sell Toggle */}
          <div className="flex justify-between gap-3">
            <button
              onClick={() => handleButtonClick(true)}
              className={`flex-1 py-2 rounded-md ${isPumpActive ? 'bg-green-500 text-black' : 'bg-gray-700 text-white'} hover:bg-green-400`}>
              pump
            </button>
            <button
              onClick={() => handleButtonClick(false)}
              className={`flex-1 py-2 rounded-md ${!isPumpActive ? 'bg-red-500 text-white' : 'bg-gray-700 text-white'} hover:bg-red-600`}>
              rug
            </button>
          </div>

          {/* Input and Controls */}
          <div className="mt-4">
            {/* Label for Amount Input */}
            <label
              htmlFor="amount-input"
              className="text-sm text-white mb-2 block"
            >
              amount (SOL)
            </label>

            {/* Amount Input */}
            <div className="relative bg-gray-900 border border-gray-700 rounded-md p-3 focus-within:border-2 focus-within:border-white">
              <input
                id="amount-input"
                type="number"
                placeholder="0.00"
                className="bg-transparent w-full text-white focus:outline-none text-lg pr-16"
              />
              {/* SOL and Logo Inside Input */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <span className="text-white">SOL</span>
                <Image
                  className="rounded-full"
                  src="/images/solana_image.webp" // Update with your actual logo path
                  alt="Solana Logo"
                  width={24}
                  height={24}
                />
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="mt-4 flex justify-between gap-1 text-xs">
              <button className="bg-gray-700 px-3 py-1 rounded-md hover:bg-gray-600">
                reset
              </button>
              <button className="bg-gray-700 px-3 py-1 rounded-md hover:bg-gray-600">
                0.1 SOL
              </button>
              <button className="bg-gray-700 px-3 py-1 rounded-md hover:bg-gray-600">
                0.5 SOL
              </button>
              <button className="bg-gray-700 px-3 py-1 rounded-md hover:bg-gray-600">
                1 SOL
              </button>
              <button className="bg-gray-700 px-3 py-1 rounded-md hover:bg-gray-600">
                max
              </button>
            </div>

            {/* Potential Returns Breakdown */}
            <div className="mt-4 p-3 text-sm text-gray-400">
              <p className="flex justify-between">
                <span>House fee:</span>
                <span className="text-white">$0.00</span>
              </p>
              <p className="flex justify-between mt-1">
                <span>Potential return:</span>
                <span className="text-green-500">$0.00 (0.00%)</span>
              </p>
            </div>

            {/* Place Trade Button */}
            <button className={`mt-4 w-full py-2 rounded-md ${isPumpActive ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-red-500 text-white hover:bg-red-600'}`}>
              place trade
            </button>

            {/* Disclaimer */}
            <p className="mt-2 text-center text-sm text-gray-400">
              By trading, you agree to the{" "}
              <Link href="/docs/terms-of-service" className="text-blue-400 underline hover:text-blue-300">
                Terms of Use
              </Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Pump vs Rug Split */}
      <div className="mt-6 w-full bg-gray-800 p-4 rounded-md">
        <p className="text-2xl font-semibold text-white">Percentage of users betting on each outcome</p>
        <p className="text-green-500 mt-2 font-semibold">Pump: 72% | Rug: 28%</p>
      </div>

      {/* Coin Information Section */}
      <div className="mt-6 w-full bg-gray-800 p-4 rounded-md border border-gray-600">
        <h2 className="text-2xl font-bold text-white">Memecoin Information</h2>
        <div className="mt-2 text-gray-400 text-sm">
          <p><strong>Full Coin Name:</strong> PEPE Coin</p>
          <p><strong>Contract Address:</strong> 0x1234...abcd</p>
          <p><strong>Trading Volume:</strong> $11,725,259</p>
          <p><strong>Coin Creation Date:</strong> Jan 1, 2024</p>
          <a href="" className="text-blue-500 underline hover:text-blue-300">
            <strong>Dex Screener Link: https://dexscreener.com/solana/4mqmvnghpmkqns6yrnbfv61ntufkghhbxqvicycknqmz</strong>
          </a>
        </div>
      </div>
    </div>
  );
}
