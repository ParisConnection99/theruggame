import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Alfa_Slab_One } from "next/font/google";

const alfaSlabOne = Alfa_Slab_One({
  subsets: ['latin'],
  weight: "400"
});

const FeaturedMarket = ({
  marketName = "",
  amountWagered = "",
  imageSrc,
  start_time,
  end_time,
  duration,
  onMarketClick
}) => {
  // State for countdown - same as in MarketCard
  const [timeLeft, setTimeLeft] = useState('');
  const [isBettingClosed, setIsBettingClosed] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const tokenNameNoSpaces = marketName ? marketName.replace(/\s+/g, "") : "";
  const questionStart = "Will ";
  const questionEnd = ` Pump or Rug in ${duration} mins?`;

  if (!imageSrc) {
    imageSrc = "/images/ruggy_angry.svg";
  }

  const formatSol = (amount) => {
    return parseFloat(amount).toFixed(4);
  };


  // Calculate and update countdown - using the same logic as MarketCard
  useEffect(() => {
    // Function to calculate time difference and format it
    const updateCountdown = () => {
      try {
        const now = new Date();
        const startTime = new Date(start_time);
        const endTime = new Date(end_time);

        // Added validation for date objects
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          console.error("Invalid date format:", { start_time, end_time });
          setTimeLeft('INVALID DATE');
          return;
        }

        // Calculate last betting time (50% of duration)
        let lastBetTime;
        if (duration && typeof duration === 'number') {
          // Duration is in minutes, convert to milliseconds
          const halfDurationMinutes = duration / 2;
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
          setTimeLeft('MARKET CLOSED');
          return;
        }

        // Check if betting period has ended but market is still active
        if (timeTillLastBet <= 0 && timeTillEnd > 0) {
          setIsBettingClosed(true);
          setTimeLeft('BETTING CLOSED');
          return;
        }

        // Market is still in betting period, show countdown to last bet time
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
  }, [start_time, end_time, duration]);
  return (
    <div className="flex flex-col items-center justify-center mt-10">
      {/* Title with more intense animation */}
      <h1
        className={`${alfaSlabOne.className} text-4xl text-orange-500 uppercase tracking-wide mb-6 text-center`}
        style={{
          animation: "flashText 0.8s alternate infinite",
          textShadow: "0 0 10px rgba(249, 115, 22, 0.8)"
        }}
      >
        Most Bet-on Market
      </h1>

      {/* Add custom keyframes for animations */}
      <style jsx global>{`
        @keyframes flash {
          0% { border-color: #f97316; box-shadow: 0 0 15px 5px rgba(249, 115, 22, 0.5); }
          100% { border-color: #ffb700; box-shadow: 0 0 25px 10px rgba(255, 183, 0, 0.8); }
        }
        
        @keyframes flashText {
          0% { text-shadow: 0 0 10px rgba(249, 115, 22, 0.8); color: #f97316; }
          100% { text-shadow: 0 0 20px rgba(255, 183, 0, 1); color: #ffb700; }
        }
      `}</style>

      {/* Featured Market Card - with intense flashing animation */}
      <div
        className="bg-gray-600 p-4 rounded-lg shadow-md text-white flex flex-col gap-4 border-2 border-orange-500 w-[90%] sm:w-[80%] max-w-lg mx-auto cursor-pointer animate-pulse"
        style={{
          animation: "flash 0.7s alternate infinite",
          boxShadow: "0 0 15px 5px rgba(249, 115, 22, 0.5)"
        }}
        onClick={onMarketClick || (() => alert("Navigate to market details!"))}
      >
        {/* Image and Question - larger image and bigger text */}
        <div className="flex gap-6 items-center">
          <Image
            src={imageSrc}
            alt=""
            width={60}
            height={60}
            className="rounded-md"
            priority
          />
          <h1 className="text-lg md:text-l font-semibold">
            {questionStart}
            <span className="text-amber-400 font-bold drop-shadow-sm">{tokenNameNoSpaces}</span>
            {questionEnd}
          </h1>
        </div>

        {/* Countdown Timer & Amount Wagered - larger text */}
        <div className="text-base md:text-lg mt-2 flex items-center">
          <span className="mr-2">⏱️ {isBettingClosed ? (isExpired ? 'Market ended:' : 'Betting closed:') : 'Market closes in:'}</span>
          <span className={`font-bold ${isExpired ? 'text-red-500' : isBettingClosed ? 'text-orange-400' : 'text-yellow-400'}`} style={{ animation: "flashText 0.8s alternate infinite" }}>
            {timeLeft}
          </span>
        </div>

        <div className="text-base md:text-lg flex items-center">
          <span className="mr-2">💰 Amount wagered:</span>
          <span className="font-bold text-green-400">
            {formatSol(amountWagered)}
          </span>
        </div>

        {/* Buttons - moved to bottom */}
        <div className="flex gap-4 mt-4">
          <button
            className={`bg-green-500 text-black text-base font-bold px-4 py-3 rounded-md flex-1 hover:bg-green-600 ${isBettingClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isBettingClosed}
          >
            pump (yes) 🚀
          </button>
          <button
            className={`bg-red-500 text-black text-base font-bold px-4 py-3 rounded-md flex-1 hover:bg-red-600 ${isBettingClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isBettingClosed}
          >
            rug (no) 📉
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeaturedMarket;