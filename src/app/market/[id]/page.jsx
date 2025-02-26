// "use client"; // Required for hooks in the App Router

// import { useState, useEffect } from 'react'; // Import useState for managing state
// import { usePathname } from "next/navigation";
// import Image from "next/image";
// import Link from "next/link";
// import MarketPageService from '@/services/MarketPageService';
// import { supabase } from '@/lib/supabaseClient';

// const marketPageService = new MarketPageService(supabase);

// export default function MarketPage() {
//   const pathname = usePathname(); // Get the dynamic market ID from the URL
//   const id = pathname.split("/").pop(); // Extract the market ID
//   const [loading, setLoading] = useState(true);
//   const [market, setMarket] = useState(null);

//   console.log(`Market id: ${id}`);

//   useEffect(() => {
//     const fetchMarketData = async () => {
//       try {
//         setLoading(true);

//         const marketData = await marketPageService.fetchMarketWith(id);

//         if (marketData) {
//           console.log(`Market: ${marketData}`);
//           setMarket(marketData);
//         } else {
//           console.log('No Markets found.');
//         }
//       } catch (error) {
//         console.error('Error fetching market data.');
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchMarketData();
//   }, [id]);

//   const tokenNameNoSpaces = market?.name ? market.name.replace(/\s+/g, "") : "UnknownToken";
//   const question = `Will ${tokenNameNoSpaces} Pump or Rug in 10 mins?`;

//   // Use state to manage the active state of the buttons
//   const [isPumpActive, setIsPumpActive] = useState(true); // Default is 'Pump' active

//   const stats = calculatePumpRugPercentages(market?.total_pump_amount || 0, market?.total_rug_amount || 0);

//   // Toggle function to switch between buttons
//   const handleButtonClick = (isPump) => {
//     setIsPumpActive(isPump);
//   };

//   function calculatePumpRugPercentages(totalPumpAmount, totalRugAmount) {
//     // Calculate total
//     const totalAmount = totalPumpAmount + totalRugAmount;

//     // Calculate percentages (handle division by zero)
//     const pumpPercentage = totalAmount > 0 ? (totalPumpAmount / totalAmount) * 100 : 0;
//     const rugPercentage = totalAmount > 0 ? (totalRugAmount / totalAmount) * 100 : 0;

//     // Format to display with whole numbers (rounding to nearest integer)
//     const formattedPumpPercentage = Math.round(pumpPercentage);
//     const formattedRugPercentage = Math.round(rugPercentage);

//     return {
//       pumpPercentage: formattedPumpPercentage,
//       rugPercentage: formattedRugPercentage,
//       formattedText: `Pump: ${formattedPumpPercentage}% Rug: ${formattedRugPercentage}%`
//     };
//   }

//   return (
//     <div className="p-6 max-w-7xl mx-auto bg-blue-900 text-white">
//       {/* Market Header */}
//       <div className="flex items-center justify-between">
//         {/* Title and Image */}
//         <div className="flex items-center gap-4 mt-8">
//           <Image
//             src="/images/eth.webp" // Update this path to your actual image file
//             alt="Market Image"
//             width={50}
//             height={50}
//             className="rounded-full"
//           />
//           <h1 className="text-2xl font-semibold">{question}</h1>
//         </div>
//       </div>

//       {/* Current Price + Liquidity */}
//       <div className="mt-8 text-lg font-semibold text-white">
//         Current Price: <span className="text-green-400">{market?.initial_coin_price || "0.00"} SOL</span>
//       </div>

//       <div className="text-lg text-gray-400 mt-2">
//         Liquidity: <span className="text-white">${market?.initial_liquidity || "0"}</span>
//       </div>

//       {/* Market Details */}
//       <div className="mt-10 flex gap-8 text-gray-400">
//         <p className="text-green-500 font-semibold">SOL Wagered: {market?.total_pump_amount + market?.total_rug_amount} SOL ($20,000)</p> { /* This is how much sol wagered*/}
//         <p>market closes in 5 minutes</p>
//       </div>

//       {/* Main Section: Chart and Buy/Sell */}
//       <div className="flex flex-col lg:flex-row mt-6 gap-6">
//         {/* Chart (Left Section) */}
//         <div className="flex-1 bg-gray-800 rounded-md p-4 h-64">
//           <p className="text-gray-500">[Chart Placeholder]</p>
//         </div>

//         {/* Buy/Sell Section (Right Section) */}
//         <div className="w-full lg:w-96 bg-gray-800 rounded-md p-4">
//           {/* Buy/Sell Toggle */}
//           <div className="flex justify-between gap-3">
//             <button
//               onClick={() => handleButtonClick(true)}
//               className={`flex-1 py-2 rounded-md ${isPumpActive ? 'bg-green-500 text-black' : 'bg-gray-700 text-white'} hover:bg-green-400`}>
//               pump
//             </button>
//             <button
//               onClick={() => handleButtonClick(false)}
//               className={`flex-1 py-2 rounded-md ${!isPumpActive ? 'bg-red-500 text-white' : 'bg-gray-700 text-white'} hover:bg-red-600`}>
//               rug
//             </button>
//           </div>

//           {/* Input and Controls */}
//           <div className="mt-4">
//             {/* Label for Amount Input */}
//             <label
//               htmlFor="amount-input"
//               className="text-sm text-white mb-2 block"
//             >
//               amount (SOL)
//             </label>

//             {/* Amount Input */}
//             <div className="relative bg-gray-900 border border-gray-700 rounded-md p-3 focus-within:border-2 focus-within:border-white">
//               <input
//                 id="amount-input"
//                 type="number"
//                 placeholder="0.00"
//                 className="bg-transparent w-full text-white focus:outline-none text-lg pr-16"
//               />
//               {/* SOL and Logo Inside Input */}
//               <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
//                 <span className="text-white">SOL</span>
//                 <Image
//                   className="rounded-full"
//                   src="/images/solana_image.webp" // Update with your actual logo path
//                   alt="Solana Logo"
//                   width={24}
//                   height={24}
//                 />
//               </div>
//             </div>

//             {/* Quick Amount Buttons */}
//             <div className="mt-4 flex justify-between gap-1 text-xs">
//               <button className="bg-gray-700 px-3 py-1 rounded-md hover:bg-gray-600">
//                 reset
//               </button>
//               <button className="bg-gray-700 px-3 py-1 rounded-md hover:bg-gray-600">
//                 0.1 SOL
//               </button>
//               <button className="bg-gray-700 px-3 py-1 rounded-md hover:bg-gray-600">
//                 0.5 SOL
//               </button>
//               <button className="bg-gray-700 px-3 py-1 rounded-md hover:bg-gray-600">
//                 1 SOL
//               </button>
//               <button className="bg-gray-700 px-3 py-1 rounded-md hover:bg-gray-600">
//                 max
//               </button>
//             </div>

//             {/* Potential Returns Breakdown */}
//             <div className="mt-4 p-3 text-sm text-gray-400">
//               <p className="flex justify-between">
//                 <span>House fee:</span>
//                 <span className="text-white">$0.00</span>
//               </p>
//               <p className="flex justify-between mt-1">
//                 <span>Potential return:</span>
//                 <span className="text-green-500">$0.00 (0.00%)</span>
//               </p>
//             </div>

//             {/* Place Trade Button */}
//             <button className={`mt-4 w-full py-2 rounded-md ${isPumpActive ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-red-500 text-white hover:bg-red-600'}`}>
//               place trade
//             </button>

//             {/* Disclaimer */}
//             <p className="mt-2 text-center text-sm text-gray-400">
//               By trading, you agree to the{" "}
//               <Link href="/docs/terms-of-service" className="text-blue-400 underline hover:text-blue-300">
//                 Terms of Use
//               </Link>.
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* Pump vs Rug Split */}
//       <div className="mt-6 w-full bg-gray-800 p-4 rounded-md">
//         <p className="text-2xl font-semibold text-white">Percentage of Bets</p>
//         <p className="text-green-500 mt-2 font-semibold">{stats.formattedText}</p>
//       </div>

//       {/* Coin Information Section */}
//       <div className="mt-6 w-full bg-gray-800 p-4 rounded-md border border-gray-600">
//         <h2 className="text-2xl font-semibold text-white">Memecoin Information</h2>
//         <div className="mt-2 text-gray-400 text-sm">
//           <p><strong>name:</strong> {market?.name || ""}</p>
//           <p><strong>ca:</strong> {market?.token_address || ""}</p>
//           <a href="" target="_blank" className="text-blue-500 underline hover:text-blue-300">
//             <strong>{market?.dex_screener_url || ""}</strong>
//           </a>
//         </div>
//       </div>
//     </div>
//   );
// }
"use client"; // Required for hooks in the App Router

import { useState, useEffect } from 'react'; // Import useState for managing state
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import MarketPageService from '@/services/MarketPageService';
import { supabase } from '@/lib/supabaseClient';
import { listenToMarkets } from '@/services/MarketRealtimeService';

const marketPageService = new MarketPageService(supabase);

export default function MarketPage() {
  const pathname = usePathname(); // Get the dynamic market ID from the URL
  const id = pathname ? pathname.split("/").pop() : null;

if (!id) {
  console.error("Market ID is missing from URL.");
}


  const [loading, setLoading] = useState(true);
  const [market, setMarket] = useState(null);

  // State for countdown timer (added from MarketCard)
  const [timeLeft, setTimeLeft] = useState('');
  const [isBettingClosed, setIsBettingClosed] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [timerLabel, setTimerLabel] = useState('Market closes in:');

  console.log(`Market id: ${id}`);

  useEffect(() => {
    if (!id) return;

    const fetchMarketData = async () => {
      try {
        setLoading(true);

        const marketData = await marketPageService.fetchMarketWith(id);

        if (marketData) {
          console.log(`Market: ${marketData}`);
          setMarket(marketData);
        } else {
          console.log('No Markets found.');
        }
      } catch (error) {
        console.error('Error fetching market data.');
      } finally {
        setLoading(false);
      }
    }

    fetchMarketData();
  }, [id]);

  useEffect(() => {
    // Skip if market is not yet loaded
    if (!market?.id) return;
    
    const handleMarketUpdate = (updatedMarket) => {
      switch(updatedMarket.type) {
        case 'PUMP VS RUG SPLIT UPDATE':
          if (updatedMarket.payload.id === market.id) {
            // Use functional update to avoid dependency on market itself
            setMarket(prevMarket => ({
              ...prevMarket,
              ...updatedMarket.payload
            }));
          }
          break;
      }
    }
  
    const subscription = listenToMarkets(handleMarketUpdate);
  
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    }
  }, [market?.id]); // Only depend on the ID, not the entire market object

  // Add the countdown timer effect from MarketCard
  useEffect(() => {
    // Only start the timer if we have market data
    if (!market) return;

    // Function to calculate time difference and format it
    const updateCountdown = () => {
      try {
        const now = new Date();
        const startTime = new Date(market.start_time);
        const endTime = new Date(market.end_time);

        // Add validation for date objects
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          console.error("Invalid date format:", { start_time: market.start_time, end_time: market.end_time });
          setTimeLeft('INVALID DATE');
          return;
        }

        // Calculate last betting time (50% of duration)
        let lastBetTime;
        if (market.duration && typeof market.duration === 'number') {
          // Duration is in minutes, convert to milliseconds
          const halfDurationMinutes = market.duration / 2;
          const halfDurationMs = halfDurationMinutes * 60 * 1000;
          lastBetTime = new Date(startTime.getTime() + halfDurationMs);
        } else {
          // Fallback to calculating based on end time
          const totalDurationMs = endTime.getTime() - startTime.getTime();
          const halfDurationMs = totalDurationMs / 2;
          lastBetTime = new Date(startTime.getTime() + halfDurationMs);
        }

        // Calculate time until last bet
        const timeTillLastBet = lastBetTime.getTime() - now.getTime();

        // Calculate time until market end
        const timeTillEnd = endTime.getTime() - now.getTime();

        // Check if market has ended
        if (timeTillEnd <= 0) {
          setIsExpired(true);
          setIsBettingClosed(true);
          setTimerLabel('Market ended:');
          setTimeLeft('MARKET CLOSED');
          return;
        }

        // Check if betting period has ended but market is still active
        if (timeTillLastBet <= 0 && timeTillEnd > 0) {
          setIsBettingClosed(true);
          setTimerLabel('Resolution in:');

          // Format the remaining time until end
          const totalEndSeconds = Math.floor(timeTillEnd / 1000);
          const endMinutes = Math.floor(totalEndSeconds / 60);
          const endSeconds = totalEndSeconds % 60;

          // Format with leading zeros
          const formattedEndMinutes = String(endMinutes).padStart(2, '0');
          const formattedEndSeconds = String(endSeconds).padStart(2, '0');

          setTimeLeft(`${formattedEndMinutes}:${formattedEndSeconds}`);
          return;
        }

        // Market is still in betting period, show countdown to last bet time
        setTimerLabel('Betting closes in:');
        // Convert to seconds first for more accurate calculation
        const totalSeconds = Math.floor(timeTillLastBet / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        // Format with leading zeros
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');

        setTimeLeft(`${formattedMinutes}:${formattedSeconds}`);
      } catch (error) {
        console.error("Error calculating countdown:", error);
        setTimeLeft('ERROR');
      }
    };

    // Initial update
    updateCountdown();

    // Set interval to update every second
    const interval = setInterval(updateCountdown, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [market?.duration,market?.start_time, market?.end_time]);

  const tokenNameNoSpaces = market?.name ? market.name.replace(/\s+/g, "") : "UnknownToken";
  const question = `Will ${tokenNameNoSpaces} Pump or Rug in 10 mins?`;

  // Use state to manage the active state of the buttons
  const [isPumpActive, setIsPumpActive] = useState(true); // Default is 'Pump' active

  const stats = calculatePumpRugPercentages(market?.total_pump_amount || 0, market?.total_rug_amount || 0);

  // Toggle function to switch between buttons
  const handleButtonClick = (isPump) => {
    setIsPumpActive(isPump);
  };

  function calculatePumpRugPercentages(totalPumpAmount, totalRugAmount) {
    // Calculate total
    const totalAmount = totalPumpAmount + totalRugAmount;

    // Calculate percentages (handle division by zero)
    const pumpPercentage = totalAmount > 0 ? (totalPumpAmount / totalAmount) * 100 : 0;
    const rugPercentage = totalAmount > 0 ? (totalRugAmount / totalAmount) * 100 : 0;

    // Format to display with whole numbers (rounding to nearest integer)
    const formattedPumpPercentage = Math.round(pumpPercentage);
    const formattedRugPercentage = Math.round(rugPercentage);

    return {
      pumpPercentage: formattedPumpPercentage,
      rugPercentage: formattedRugPercentage,
      formattedText: `Pump: ${formattedPumpPercentage}% Rug: ${formattedRugPercentage}%`
    };
  }

  return (
    <div className="p-6 max-w-7xl mx-auto bg-blue-900 text-white">
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
          <h1 className="text-2xl font-semibold">{question}</h1>
        </div>
      </div>

      {/* Current Price + Liquidity */}
      <div className="mt-8 text-lg font-semibold text-white">
        Current Price: <span className="text-green-400">{market?.initial_coin_price || "0.00"} SOL</span>
      </div>

      <div className="text-lg text-gray-400 mt-2">
        Liquidity: <span className="text-white">${market?.initial_liquidity || "0"}</span>
      </div>

      {/* Market Details */}
      <div className="mt-10 flex gap-8 text-gray-400">
        <p className="text-green-500 font-semibold">SOL Wagered: {market?.total_pump_amount + market?.total_rug_amount} SOL ($20,000)</p>
        {/* Countdown Timer - Replaced static text with dynamic countdown */}
        <div className="text-sm flex items-center">
          <span className="mr-2">⏱️ {timerLabel}</span>
          <span className={`font-bold ${isExpired
              ? 'text-red-500'
              : isBettingClosed
                ? 'text-orange-400'
                : 'text-yellow-400 animate-pulse'
            }`}>
            {timeLeft}
          </span>
        </div>
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
        <p className="text-2xl font-semibold text-white">Percentage of Bets</p>
        <p className="text-green-500 mt-2 font-semibold">{stats.formattedText}</p>
      </div>

      {/* Coin Information Section */}
      <div className="mt-6 w-full bg-gray-800 p-4 rounded-md border border-gray-600">
        <h2 className="text-2xl font-semibold text-white">Memecoin Information</h2>
        <div className="mt-2 text-gray-400 text-sm">
          <p><strong>name:</strong> {market?.name || ""}</p>
          <p className="break-words"><strong>coin address:</strong> {market?.token_address || ""}</p>
          <p className="break-all">
            <strong>dexscreener url:</strong>{" "}
            <a
              href={market?.dex_screener_url || ""}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline hover:text-blue-300 break-all"
            >
              {market?.dex_screener_url || ""}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}