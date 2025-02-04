"use client";

import Image from "next/image";
import Link from "next/link";
import { Alfa_Slab_One } from "next/font/google";
import DropdownButton from "@/components/DropdownButton";
//import MarketView from "@/components/MarketView";

const alfaSlabOne = Alfa_Slab_One({ weight: "400" });

export default function Home() {

  function onSortButtonClick(identifier) {
    {/* 0 is Trending, 1 is creation date*/ }
    console.log(`${identifier}`);
  }

  return (
    <div>
      <main>
        <div className="w-full-[calc(100%-2rem)] h-10 bg-blue-300 flex items-center justify-center rounded-lg ml-4 mr-4 mt-4 gap-4 px-4">
          <Image
            className="rounded-full"
            src="/images/pepe.webp"
            alt="banner"
            width={25}
            height={25}
            priority
          />
          <h1 className="text-black text-sm ">
            MoneyMagnet bet 0.2 SOL on HoodAI to Rug 🚀
          </h1>
        </div>

        { /* Main Menu */}
        <div className="flex justify-between items-center w-full px-5 mt-10">
          <div className="flex gap-6">
            <button className="text-white text-md hover:scale-105 hover:underline">{`<how it works>`}</button>
            <button className="text-white text-md hover:scale-105 hover:underline">{`<support>`}</button>
          </div>

          <button className="text-white text-md hover:scale-105 hover:underline">
            {`<connect wallet>`}
          </button>
        </div>

        { /* King Of the Trenches*/}
        <div className="flex flex-col items-center justify-center mt-20 hover:border-white">
          <h1 className={`${alfaSlabOne.className} text-3xl text-orange-500 !important`}>
            King of the Trenches
          </h1>

          <div className="flex gap-4 items-center mt-5 mr-10">
            <Image
              className="rounded-md ml-4"
              src="/images/eth.webp"
              alt="market_image"
              width={60}
              height={60}
              priority
            />
            <ol>
              <li className="text-sm text-blue-300 font-bold"> Will $Eth Coin Pump in 10 Mins?</li>
              <li className="text-xs">minutes left: 4 mins 🔥🔥</li>
              <li className="text-sm font-bold">amount wagered: 50 SOL ($10k) </li>
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

        <div className="grid grid-cols md:grid-cols-3 gap-20 md:gap-3 md:px-20 ml-1 mt-10">
          <MarketView />
          <MarketView />
          <MarketView />
        </div>
      </main>

    </div>
  );
}

function MarketView() {
  return (

    <div className="px-4">
      <div className="flex gap-4">
        <Image
          src="/images/eth.webp"
          alt="market_image"
          width={70}
          height={30}
          priority
        />
        <h1 className="py-2">Will $TRUMP Rug in the next 20 mins?</h1>
      </div>
      <div className="flex gap-4 mt-5">
        <button className="bg-green-500 w-1/2 h-10 rounded-md">Yes</button>
        <button className="bg-red-500 w-1/2 h-10 rounded-md">No</button>
      </div>
    </div>

  );
}