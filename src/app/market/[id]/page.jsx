"use client"; // Required for hooks in the App Router

import { usePathname } from "next/navigation";
import Image from "next/image";

export default function MarketPage() {
  const pathname = usePathname(); // Get the dynamic market ID from the URL
  const id = pathname.split("/").pop(); // Extract the market ID

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-900 text-white">
      {/* Market Header */}
      <div className="flex items-center justify-between">
        {/* Title and Image */}
        <div className="flex items-center gap-4">
          <Image
            src="/images/eth.webp" // Update this path to your actual image file
            alt="Market Image"
            width={50}
            height={50}
            className="rounded-full"
          />
          <h1 className="text-2xl font-bold">PEPE rugs in 10 mins?</h1>
        </div>
        {/* Copy Link Button */}
        <button className="bg-gray-700 px-4 py-1 rounded-md hover:bg-gray-600">
          Copy Link
        </button>
      </div>

      {/* Market Details */}
      <div className="mt-2 flex gap-8 text-gray-400">
        <p className="text-green-500">volume: $11,725,259</p>
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
            <button className="flex-1 bg-green-500 text-black py-2 rounded-md hover:bg-green-400">
              buy
            </button>
            <button className="flex-1 bg-gray-700 text-white py-2 rounded-md hover:bg-gray-600">
              sell
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
            <div className="mt-4 flex justify-between text-sm gap-2">
              <button className="bg-gray-700 px-4 py-2 rounded-md hover:bg-gray-600">
                Reset
              </button>
              <button className="bg-gray-700 px-4 py-2 rounded-md hover:bg-gray-600">
                0.1 SOL
              </button>
              <button className="bg-gray-700 px-4 py-2 rounded-md hover:bg-gray-600">
                0.5 SOL
              </button>
              <button className="bg-gray-700 px-4 py-2 rounded-md hover:bg-gray-600">
                1 SOL
              </button>
              <button className="bg-gray-700 px-4 py-2 rounded-md hover:bg-gray-600">
                Max
              </button>
            </div>

            {/* Place Trade Button */}
            <button className="mt-4 w-full bg-green-500 text-black py-2 rounded-md hover:bg-green-400">
              place trade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
