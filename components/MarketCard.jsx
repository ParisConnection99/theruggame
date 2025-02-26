import { useState, useEffect } from 'react';
import Image from "next/image";

function MarketCard({ name, imageSrc, start_time, end_time, duration }) {
  // Format the question with no spaces in market name
  const tokenNameNoSpaces = name ? name.replace(/\s+/g, "") : "UnknownToken";
  const question = `Will ${tokenNameNoSpaces} Pump or Rug in 10 mins?`;

  // State for countdown
  const [timeLeft, setTimeLeft] = useState('');
  const [isBettingClosed, setIsBettingClosed] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Calculate and update countdown
  useEffect(() => {
    // Function to calculate time difference and format it
    const updateCountdown = () => {
      try { // 👈 Added try/catch for error handling
        const now = new Date();
        const startTime = new Date(start_time);
        const endTime = new Date(end_time);

        // 👇 Added validation for date objects
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          console.error("Invalid date format:", { start_time, end_time });
          setTimeLeft('INVALID DATE');
          return;
        }

        // Calculate last betting time (50% of duration)
        // If we have the duration in minutes, use that for more accurate calculation
        let lastBetTime;
        if (duration && typeof duration === 'number') {
          // Duration is in minutes, convert to milliseconds
          const halfDurationMinutes = duration / 2;
          const halfDurationMs = halfDurationMinutes * 60 * 1000;
          lastBetTime = new Date(startTime.getTime() + halfDurationMs);
        } else {
          // Fallback to calculating based on end time
          // 👇 Added explicit getTime() calls
          const totalDurationMs = endTime.getTime() - startTime.getTime();
          const halfDurationMs = totalDurationMs / 2;
          lastBetTime = new Date(startTime.getTime() + halfDurationMs);
        }

        // Calculate time until last bet
        // 👇 Added explicit getTime() calls
        const timeTillLastBet = lastBetTime.getTime() - now.getTime();

        // Calculate time until market end
        // 👇 Added explicit getTime() calls
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

        // 👇 Added console log for debugging
        console.log("Timer values:", {
          now: now.toISOString(),
          lastBetTime: lastBetTime.toISOString(),
          timeTillLastBet,
          minutes,
          seconds,
          formatted: `${formattedMinutes}:${formattedSeconds}`
        });

        setTimeLeft(`${formattedMinutes}:${formattedSeconds}`);
      } catch (error) {
        // 👇 Added error handling
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
    <div className="bg-gray-600 p-4 rounded-lg shadow-md text-white flex flex-col gap-4 hover:border-2 hover:border-white">
      {/* Image and Question */}
      <div className="flex gap-4 items-center">
        <Image
          src={imageSrc || "/images/eth.webp"}
          alt="Market Image"
          width={40}
          height={40}
          className="rounded-md"
        />
        <h1 className="text-sm font-semibold">{question}</h1>
      </div>

      {/* Buttons */}
      <div className="flex gap-4 mt-2">
        <button
          className={`bg-green-500 text-black text-sm font-bold px-4 py-2 rounded-md flex-1 hover:bg-green-600 ${isBettingClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isBettingClosed}
        >
          pump (yes) 🚀
        </button>
        <button
          className={`bg-red-500 text-black text-sm font-bold px-4 py-2 rounded-md flex-1 hover:bg-red-600 ${isBettingClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isBettingClosed}
        >
          rug (no) 📉
        </button>
      </div>

      {/* Countdown Timer - replaces Volume */}
      <div className="text-sm mt-2 flex items-center">
        <span className="mr-2">⏱️ {isBettingClosed ? (isExpired ? 'Market ended:' : 'Betting closed:') : 'Market closes in:'}</span>
        <span className={`font-bold ${isExpired ? 'text-red-500' : isBettingClosed ? 'text-orange-400' : 'text-yellow-400 animate-pulse'}`}>
          {timeLeft}
        </span>
      </div>
    </div>
  );
}

export default MarketCard;