"use client";

import Image from "next/image";
import Link from "next/link";
import { Alfa_Slab_One } from "next/font/google";
import DropdownButton from "@/components/DropdownButton";
import markets from "@/Utils/data";
import { useState } from "react";

const alfaSlabOne = Alfa_Slab_One({ weight: "400" });


export default function Home() {
  function onSortButtonClick(identifier) {
    {/* 0 is Trending, 1 is creation date*/ }
    console.log(`${identifier}`);
  }

  const [visibleMarkets, setVisibleMarkets] = useState(6); // Start with 6 markets
  const showMoreMarkets = () => {
    setVisibleMarkets((prev) => prev + 6); // Load 6 more markets
  };

  return (
    <div>
      <main >
        { /* King Of the Trenches*/}
        <div className="flex flex-col items-center justify-center mt-20">
          {/* King of the Trenches Title */}
          <h1 className={`${alfaSlabOne.className} text-3xl text-orange-500 !important mb-4`}>
            King of the Trenches
          </h1>

          {/* Hoverable Section (Smaller & Centered) */}
          <div
            className="flex gap-4 items-center mt-5 p-4 rounded-lg hover:border-4 hover:border-white transition-all duration-200 cursor-pointer w-[40%] max-w-sm mx-auto"
            onClick={() => alert("Navigate to market details!")} // Example click action
          >
            <Image
              className="rounded-md"
              src="/images/eth.webp"
              alt="market_image"
              width={45}
              height={45}
              priority
            />
            <ol className="text-xs">
              <li className="text-blue-300 font-bold mb-1">Will $Eth Coin Pump in 10 Mins?</li>
              <li className="text-[10px] text-gray-400 mb-1">Minutes left: 4 mins 🔥🔥</li>
              <li className="text-xs font-bold">Amount wagered: 50 SOL ($10k)</li>
            </ol>
          </div>
        </div>

        {/* Search Market */}
        <div className="flex gap-2 items-center justify-center mt-10">
          <input type="text"
            className="w-full sm:w-1/3 bg-blue-300 text-white rounded-md h-10 p-2 ml-4 placeholder-gray-500 focus:border-white"
            placeholder="search markets">
          </input>

          <button className="bg-blue-300 text-black hover:bg-blue-500 w-20 h-10 rounded-md mr-4">
            search
          </button>

        </div>

        { /* Sorting Button*/}
        <div className="flex mt-10 ml-5">
          <DropdownButton onClick={onSortButtonClick} />
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.slice(0, visibleMarkets).map((market, index) => (
              <MarketCard
                key={index}
                question={market.question}
                volume={market.volume}
                imageSrc={market.imageSrc}
              />
            ))}
          </div>

          {visibleMarkets < markets.length && (
            <div className="flex justify-center mt-6">
              <button
                onClick={showMoreMarkets}
                className="bg-blue-300 text-black px-4 py-2 rounded-md hover:bg-blue-400"
              >
                Show More
              </button>
            </div>
          )}
        </div>
      </main>

    </div>
  );
}

function MarketCard({ question, volume, imageSrc }) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md text-white flex flex-col gap-4 hover:border-2 hover:border-white">
      {/* Image and Question */}
      <div className="flex gap-4 items-center">
        <Image
          src="/images/eth.webp"
          alt="Market Image"
          width={40}
          height={40}
          className="rounded-md"
        />
        <h1 className="text-md font-semibold">{question}</h1>
      </div>

      {/* Buttons */}
      <div className="flex gap-4 mt-2">
        <button className="bg-green-500 text-black text-sm font-bold px-4 py-2 rounded-md flex-1 hover:bg-green-600">
          Buy Yes
        </button>
        <button className="bg-red-500 text-black text-sm font-bold px-4 py-2 rounded-md flex-1 hover:bg-red-600">
          Buy No
        </button>
      </div>

      {/* Volume */}
      <div className="text-sm text-gray-400 mt-2">
        <span>${volume} Vol.</span>
      </div>
    </div>
  );
}
