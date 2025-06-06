"use client"; // Required for hooks in the App Router

import { useState, useEffect, useRef } from 'react'; // Added useRef
import { useSearchParams } from 'next/navigation';
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { listenToMarkets } from '@/services/MarketRealtimeService';
import { useAuth } from '@/components/FirebaseProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { placeBet, checkBalance } from '@/utils/SolanaWallet.js';
import { getTokenPrice } from '@/services/PricesScheduler';
import MarketChart from '@/components/MarketChart';
import { useAnalytics } from '@/components/FirebaseProvider';
import { logEvent } from 'firebase/analytics';
import { logActivity } from '@/utils/LogActivity';
import { errorLog } from '@/utils/ErrorLog';
import { showToast } from '@/components/CustomToast';
import { logInfo, logError } from '@/utils/logger';


export default function MarketPage() {
  const pathname = usePathname(); // Get the dynamic market ID from the URL
  const searchParams = useSearchParams();
  const id = pathname ? pathname.split("/").pop() : null;
  const PLATFORM_FEE = 0.02;
  const MIN_BET_AMOUNT = 0.07;
  const MAX_BET_AMOUNT = 100;
  const inputRef = useRef(null); // Add ref for the input element
  const { publicKey, sendTransaction, signTransaction, connected } = useWallet();
  const analytics = useAnalytics();
  const { user: authUser, auth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);
  const [market, setMarket] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [isBettingClosed, setIsBettingClosed] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [timerLabel, setTimerLabel] = useState('Market closes in:');
  const [userBalance, setUserBalance] = useState(0);
  const [betAmount, setBetAmount] = useState(0);
  const [houseFee, setHouseFee] = useState(0);
  const [potentialReturn, setPotentialReturn] = useState({ amount: 0, percentage: 0 });
  const [currentPrice, setCurrentPrice] = useState(0);
  const [liquidity, setLiquidity] = useState(0);
  const [priceHistory, setPriceHistory] = useState([]);
  const [marketOutcome, setMarketOutcome] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isPumpActive, setIsPumpActive] = useState(true);
  const [isBetting, setIsBetting] = useState(false);

  if (!id) {
    console.error("Market ID is missing from URL.");
  }

  // Added state for search params
  useEffect(() => {
    const signature = searchParams.get('txSignature');
    const error = searchParams.get('error');

    if (error) {
      showToast('Error placing bet', 'error');
    } else if (signature) {
      showToast('Your bet has been placed', 'success');
    }

  }, [searchParams]);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobile(isMobileDevice);
    };

    checkMobile();
  }, []);


  // Fetching the market data + initial token price
  useEffect(() => {
    if (!id) return;

    const fetchMarketData = async () => {
      try {
        setLoading(true);

        const response = await fetch(`/api/markets/market/${id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json'},
        });

       if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error);
        }

        const data = await response.json();
        const marketData = data.market;
        const priceHistoryData = data.priceHistory;

        if (marketData) {
          setMarket(marketData);
          setPriceHistory(priceHistoryData);

          // Set initial price using the scheduler's function
          if (marketData.token_address) {
            const { price, liquidity } = await getTokenPrice(marketData.token_address);

            if (price) setCurrentPrice(price);
            if (liquidity) setLiquidity(liquidity);
          }

        } else {
          console.log('No Markets found.');
        }
      } catch (error) {
        await errorLog(
          "FETCHING_MARKET_ERROR",
          error.message || 'Error object with empty message',
          error.stack || "no stack trace available",
          "MARKET",
          "SERIOUS");
        logEvent(analytics, 'market_page_error', {
          error_message: error.message,
          error_code: error.code || 'unknown'
        });
      } finally {
        setLoading(false);
      }
    }

    fetchMarketData();
  }, [id]);

  // Fetching user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!authUser || !authUser.uid) {
        setUserLoading(false);
        setUserBalance(0);
        return;
      }

      try {
        setUserLoading(true);
        const token = await authUser.getIdToken();
        const response = await fetch(`/api/users`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const dbUser = await response.json();

        setUserBalance(dbUser.balance);
      } catch (error) {
        await errorLog(
          "FETCHING_USER_DATA_ERROR",
          error.message || 'Error object with empty message',
          error.stack || "no stack trace available",
          "MARKET",
          "SERIOUS",
          `${authUser?.uid}` || "");
        logEvent(analytics, 'market_page_error', {
          error_message: error.message,
          error_code: error.code || 'unknown'
        });
        setUserBalance(0);
      } finally {
        setUserLoading(false);
      }
    };

    fetchUserData();
  }, [authUser]);

  useEffect(() => {
    // Skip if market is not yet loaded
    if (!market?.id) return;

    // Create inner function to handle async operations
    const setupSubscription = async () => {
      const handleMarketUpdate = async (updatedMarket) => {
        switch (updatedMarket.type) {
          case 'PUMP VS RUG SPLIT UPDATE':
            if (updatedMarket.payload.id === market.id) {
              // Use functional update to avoid dependency on market itself
              setMarket(prevMarket => ({
                ...prevMarket,
                ...updatedMarket.payload
              }));
            }
            break;
          case 'OUTCOME UPDATE':
            if (updatedMarket.payload.id === market.id) {
              // Validate the outcome is one of the expected values
              if (
                updatedMarket.payload.outcome === 'PUMP' || updatedMarket.payload.outcome === 'RUG'
              ) {
                setMarketOutcome(updatedMarket.payload.outcome);
                // Update other relevant states
                setTimerLabel('Market Result:');
                setTimeLeft('');  // Clear the timer
                setIsExpired(true);
                setIsBettingClosed(true);
              }
            }
            break;
        }
      };

      // Call the async function and await its result
      const subscription = await listenToMarkets(handleMarketUpdate);
      return subscription;
    };

    // Initialize subscription and store the promise
    let subscriptionPromise = setupSubscription();

    // Return cleanup function
    return () => {
      // Handle the promise in cleanup
      subscriptionPromise.then(subscription => {
        if (subscription) {
          subscription.unsubscribe();
        }
      });
    };
  }, [market?.id]);

  const handlePriceUpdate = (priceData) => {
    setCurrentPrice(priceData.price);
    setLiquidity(priceData.liquidity);
  }

  // Add the countdown timer effect from MarketCard
  useEffect(() => {
    // Only start the timer if we have market data
    if (!market) return;

    // Function to calculate time difference and format it
    const updateCountdown = async () => {
      try {
        const now = new Date();
        const startTime = new Date(market.start_time);
        const endTime = new Date(market.end_time);

        // Add validation for date objects
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
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
        await errorLog(
          "MARKET_COUNTDOWN_ERROR",
          error.message || 'Error object with empty message',
          error.stack || "no stack trace available",
          "MARKET",
          "SERIOUS");
        logEvent(analytics, 'market_page_error', {
          error_message: error.message,
          error_code: error.code || 'unknown'
        });
        setTimeLeft('ERROR');
      }
    };

    // Initial update
    updateCountdown();

    // Set interval to update every second
    const interval = setInterval(updateCountdown, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [market?.duration, market?.start_time, market?.end_time]);

  const tokenNameNoSpaces = market?.name ? market.name.replace(/\s+/g, "") : "UnknownToken";
  const questionStart = "Will ";
  const questionEnd = ` Pump or Rug in ${market?.duration} mins?`;
  const stats = calculatePumpRugPercentages(market?.total_pump_amount || 0, market?.total_rug_amount || 0);

  // Modified function to handle amount changes and calculate returns
  const handleAmountChange = async (value) => {
    const amount = parseFloat(value) || 0;
    setBetAmount(amount);

    // Update the input field value directly using the ref
    if (inputRef.current) {
      inputRef.current.value = amount > 0 ? amount.toString() : "";
    }

    // Calculate fee based on platform fee
    const fee = amount * PLATFORM_FEE;
    setHouseFee(fee);

    if (amount > 0 && market?.id) {
      try {
        const oddsResponse = await fetch('/api/market-page/odds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: market.id,
            type: isPumpActive ? 'PUMP' : 'RUG'
          })
        });

        if (!oddsResponse.ok) {
          const errorData = await oddsResponse.json();
          throw new Error(errorData.error);
        }

        const currentOdds = await oddsResponse.json();

        console.log(`Current odds: ${currentOdds}`)

        // Calculate potential return amount and percentage
        const returnAmount = amount * currentOdds;
        const returnPercentage = ((returnAmount - amount) / amount) * 100;

        setPotentialReturn({
          amount: returnAmount,
          percentage: returnPercentage
        });
      } catch (error) {
        await errorLog("CALCULATING_ODDS_ERROR",
          error.message || 'Error object with empty message',
          error.stack || "no stack trace available",
          "MARKET",
          "SERIOUS");
        setPotentialReturn({ amount: 0, percentage: 0 });
      }
    } else {
      setPotentialReturn({ amount: 0, percentage: 0 });
    }
  };

  const handleButtonClick = (isPump) => {
    setIsPumpActive(isPump);

    if (analytics) {
      logEvent(analytics, 'pump_rug_button_clicked', {
        isPump: isPump,
        page: 'market',
        timestamp: new Date()
      });
    }

    // Recalculate with new bet type if there's a bet amount
    if (betAmount > 0) {
      handleAmountChange(betAmount);
    }
  };

  const handleInputChange = (e) => {
    handleAmountChange(e.target.value);
  };

  const handleBetClick = async () => {
    if (analytics) {
      logEvent(analytics, 'place_bet_button_click', {
        page: 'market',
        timestamp: new Date()
      });
    }

    // Prevent multiple clicks while processing
    if (isBetting) {
      return;
    }

    setIsBetting(true);
    setLoading(true);

    if (!authUser || !authUser.uid) {
      showToast('Please log in to place a bet', 'info');
      setIsBetting(false);
      setLoading(false);
      return;
    }

    try {
      const token = await authUser.getIdToken();

      const response = await fetch(`/api/users`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const dbUser = await response.json();
      const balance = dbUser.balance;

      // Check if bet meets minimum requirement
      if (betAmount < MIN_BET_AMOUNT) {
        showToast(`Minimum bet amount is ${MIN_BET_AMOUNT} SOL`, 'info');
        setIsBetting(false);
        return;
      }

      // Check maximum bet limit
      if (betAmount > MAX_BET_AMOUNT) {
        showToast(`Maximum bet amount is ${MAX_BET_AMOUNT} SOL`, 'info');
        setIsBetting(false);
        return;
      }

      // Check if market is still open for betting
      if (isBettingClosed || isExpired) {
        showToast('This market is no longer accepting bets', 'error');
        setIsBetting(false);
        return;
      }

      // Calculate total bet amount including fees
      const betWithFees = betAmount + betAmount * PLATFORM_FEE;
      const betType = isPumpActive ? 'PUMP' : 'RUG';

      if (balance > betWithFees) {
        // Handle Bet with existing balance
        const response = await fetch(`/api/betting`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            marketId: market.id,
            userId: dbUser.user_id,
            amount: betAmount,
            betType: betType,
            token_name: market.name
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || 'Error placing bet');
        }

        const bet = await response.json();
        setUserBalance(balance - betWithFees);

        // Reset bet amount after successful bet
        setBetAmount(0);
        setHouseFee(0);
        setPotentialReturn({ amount: 0, percentage: 0 });
        if (inputRef.current) {
          inputRef.current.value = "";
        }

        showToast('Your bet has been placed', 'success');
      } else {
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

        // Get the appropriate public key based on platform
        let userPublicKey;

        if (isMobileDevice) {

          userPublicKey = authUser?.uid;

          if (!userPublicKey) {
            showToast('Wallet connection not found. Please reconnect your wallet.', 'error');
            setIsBetting(false);
            setLoading(false);
            return;
          }
        } else {
          // For web, use the wallet adapter's public key
          if (!publicKey) {
            showToast('Wallet not connected', 'error');
            setIsBetting(false);
            setLoading(false);
            return;
          }
          userPublicKey = publicKey;
        }
        // Need to use wallet payment

        let solanaBalance;

        try {
          const { isEnough, solBalance } = await checkBalance(userPublicKey, betWithFees);
          solanaBalance = solBalance;

        } catch (error) {
          await errorLog("FETCHING_BALANCE_ERROR",
            error.message || 'Error object with empty message',
            error.stack || "no stack trace available",
            "MARKET",
            "SERIOUS",
            `${authUser?.uid}` || "");
          showToast('Failed to fetch wallet balance', 'error');
          setIsBetting(false);
          setLoading(false);
          return;
        }

        const amountToAdd = Math.max(0, betWithFees - balance);

        if (solanaBalance < amountToAdd) {
          showToast("You don't have enough SOL to place this bet.", 'error');
          setIsBetting(false);
          setLoading(false);
          return;
        }

        const token = await authUser.getIdToken();

        const createBetTransactionResponse = await fetch("/api/create_bet_transaction", {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            marketId: market.id,
            betType: betType,
            tokenName: market.name,
            amount: betAmount,
            amountToAdd: amountToAdd,
            isMobile: isMobileDevice
          }),
        });

        if (!createBetTransactionResponse.ok) {
          const errorData = await createBetTransactionResponse.json();
          // May need to set the pending bet to error???
          throw new Error(`Error creating bet transaction: ${errorData}`);
        }

        await logActivity('bet_placed', auth);

        localStorage.setItem('key_id', userPublicKey);
        localStorage.setItem('pending_transaction_market_id', market.id);

        if (isMobileDevice) {
          const { url, id } = await createBetTransactionResponse.json();

          localStorage.setItem('bp_id', id);

          try {
            window.location.href = url;
          } catch (error) {
            throw error;
          }

        } else {

          const { key, id } = await createBetTransactionResponse.json();

          await new Promise((resolve, reject) => {
            placeBet(
              userPublicKey,
              signTransaction,
              id,
              //sendTransaction,
              betAmount,
              // Success callback
              async (transferResult) => {
                try {

                  setUserBalance(0);
                  // Reset form
                  setBetAmount(0);
                  setHouseFee(0);
                  setPotentialReturn({ amount: 0, percentage: 0 });
                  if (inputRef.current) {
                    inputRef.current.value = "";
                  }

                  showToast('Bet placed successfully', 'success');
                  resolve();
                } catch (error) {
                  reject(error);
                }
              },
              // Error callback
              (errorMessage) => {
                reject(new Error(errorMessage));
              },
              // Loading state (already handled by the outer function)
              null,
              dbUser.user_id,
              amountToAdd,
              betType,
              market.name,
              token,
              key
            );
          });
        }

      }
    } catch (error) {
      await errorLog("PLACING_BET_ERROR",
        JSON.stringify(error.message) || 'Error object with empty message',
        JSON.stringify(error.stack) || "no stack trace available",
        "MARKET",
        "SERIOUS",
        `${authUser?.uid}` || "");

      // delete saved data
      logEvent(analytics, 'market_page_error', {
        error_message: error.message,
        error_code: error.code || 'unknown'
      });
      showToast('Error placing bet', 'error');
    } finally {
      setIsBetting(false);
      setLoading(false);
    }
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

  // Calculate total amount wagered and format for display
  const totalAmountWagered = (market?.total_pump_amount || 0) + (market?.total_rug_amount || 0);
  const formattedTotalWagered = totalAmountWagered.toFixed(2);
  const getImageSrc = () => {
    if (!market || !market.icon_url || market.icon_url === "") {
      return "/images/ruggy_angry.svg";
    }
    return market.icon_url;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-blue-900 text-white">
      {/* Market Header */}
      <div className="flex items-center justify-between">
        {/* Title and Image */}
        <div className="flex items-center gap-4 mt-8">
          <Image
            src={getImageSrc()} // Update this path to your actual image file
            alt="Market icon"
            width={50}
            height={50}
            className="rounded-full"
          />
          <h1 className="text-2xl font-semibold">
            {questionStart}
            <span className="text-amber-400 font-bold drop-shadow-sm">{tokenNameNoSpaces}</span>
            {questionEnd}
          </h1>
        </div>
      </div>

      {/* Current Price + Liquidity */}
      <div className="mt-8 text-l font-semibold text-gray-400">
        Current Price: <span className="text-white">
          {currentPrice ? currentPrice.toFixed(8) : "0.00"}
        </span>
      </div>

      <div className="text-l font-semibold text-gray-400 mt-2">
        Liquidity: <span className="text-white">${liquidity}</span>
      </div>

      {/* Market Details */}
      <div className="mt-10 flex gap-8 text-gray-400">
        <p className="text-green-500 font-semibold">SOL Wagered: {formattedTotalWagered} SOL</p>
        {/* Countdown Timer - Replaced static text with dynamic countdown */}
        {/* <div className="text-sm flex items-center">
          <span className="mr-2">⏱️ {timerLabel}</span>
          <span className={`font-bold ${isExpired
            ? 'text-red-500'
            : isBettingClosed
              ? 'text-orange-400'
              : 'text-yellow-400 animate-pulse'
            }`}>
            {timeLeft}
          </span>
        </div> */}
        {/* Countdown Timer or Outcome Display */}
        <div className="text-sm flex items-center">
          <span className="mr-2">⏱️ {timerLabel}</span>
          {marketOutcome ? (
            <span className={`font-bold text-lg ${marketOutcome === 'PUMP' ? 'text-green-500' :
              marketOutcome === 'RUG' ? 'text-red-500' :
                'text-amber-400' // For HOUSE outcome
              }`}>
              {marketOutcome === 'PUMP' ? 'PUMP WON' :
                marketOutcome === 'RUG' ? 'RUG WON' :
                  'HOUSE WON'}
            </span>
          ) : (
            <span className={`font-bold ${isExpired ? 'text-red-500' :
              isBettingClosed ? 'text-orange-400' :
                'text-yellow-400 animate-pulse'
              }`}>
              {timeLeft}
            </span>
          )}
        </div>
      </div>

      {/* Main Section: Chart and Buy/Sell */}
      <div className="flex flex-col lg:flex-row mt-6 gap-6">
        {/* Chart (Left Section) */}
        <div className="flex-1 bg-gray-800 rounded-md p-4 relative">
          {market && (
            <MarketChart
              tokenAddress={market.token_address}
              marketId={market.id}
              marketStartTime={market.start_time}
              marketEndTime={market.end_time}
              startingPrice={market.initial_coin_price}
              initialPriceHistory={priceHistory}
              marketName={market.name}
              onPriceUpdate={handlePriceUpdate}
            />
          )}
        </div>

        {/* Buy/Sell Section (Right Section) */}
        <div className="w-full lg:w-96 bg-gray-800 rounded-md p-4">
          {/* Buy/Sell Toggle */}
          <div className="flex justify-between gap-3">
            <button
              onClick={() => handleButtonClick(true)}
              disabled={isBettingClosed || isExpired}
              className={`flex-1 py-2 rounded-md ${isPumpActive
                ? 'bg-green-500 text-black'
                : 'bg-gray-700 text-white'
                } ${(isBettingClosed || isExpired)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-green-400'
                }`}>
              pump
            </button>
            <button
              onClick={() => handleButtonClick(false)}
              disabled={isBettingClosed || isExpired}
              className={`flex-1 py-2 rounded-md ${!isPumpActive
                ? 'bg-red-500 text-white'
                : 'bg-gray-700 text-white'
                } ${(isBettingClosed || isExpired)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-red-600'
                }`}>
              rug
            </button>
          </div>

          {/* Input and Controls */}
          <div className="mt-4">
            {/* Label for Amount Input with Balance Display */}
            <div className="flex justify-between text-sm text-white mb-2">
              <label htmlFor="amount-input">amount (SOL)</label>
              <span>Balance: {userBalance.toFixed(2)} SOL</span>
            </div>

            {/* Amount Input */}
            <div className="relative bg-gray-900 border border-gray-700 rounded-md p-3 focus-within:border-2 focus-within:border-white">
              <input
                id="amount-input"
                ref={inputRef}
                type="number"
                placeholder="0.00"
                onChange={handleInputChange}
                disabled={isBettingClosed || isExpired}
                className={`bg-transparent w-full text-white focus:outline-none text-lg pr-16 ${(isBettingClosed || isExpired) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
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
              <button
                onClick={() => handleAmountChange(0)}
                disabled={isBettingClosed || isExpired}
                className={`bg-gray-700 px-3 py-1 rounded-md ${(isBettingClosed || isExpired)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-600'
                  }`}>
                reset
              </button>
              <button
                onClick={() => handleAmountChange(MIN_BET_AMOUNT)}
                disabled={isBettingClosed || isExpired}
                className={`bg-gray-700 px-3 py-1 rounded-md ${(isBettingClosed || isExpired)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-600'
                  }`}>
                {MIN_BET_AMOUNT} SOL
              </button>
              <button
                onClick={() => handleAmountChange(0.5)}
                disabled={isBettingClosed || isExpired}
                className={`bg-gray-700 px-3 py-1 rounded-md ${(isBettingClosed || isExpired)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-600'
                  }`}>
                0.5 SOL
              </button>
              <button
                onClick={() => handleAmountChange(1)}
                disabled={isBettingClosed || isExpired}
                className={`bg-gray-700 px-3 py-1 rounded-md ${(isBettingClosed || isExpired)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-600'
                  }`}>
                1 SOL
              </button>
              <button
                onClick={() => handleAmountChange(userBalance)}
                disabled={isBettingClosed || isExpired || userBalance <= 0}
                className={`bg-gray-700 px-3 py-1 rounded-md ${(isBettingClosed || isExpired || userBalance <= 0)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-600'
                  }`}>
                max
              </button>
            </div>

            {/* Potential Returns Breakdown */}
            <div className="mt-4 p-3 text-sm text-gray-400 bg-gray-900 rounded-md">
              <p className="flex justify-between">
                <span>House fee ({(PLATFORM_FEE * 100).toFixed(0)}%):</span>
                <span className="text-white">{houseFee.toFixed(3)} SOL</span>
              </p>
              <p className="flex justify-between mt-1">
                <span>Potential return:</span>
                <span className="text-green-500">
                  {potentialReturn.amount.toFixed(2)} SOL ({potentialReturn.percentage.toFixed(0)}%)
                </span>
              </p>

              {/* Disclaimer */}
              <p className="mt-2 text-amber-400 text-xs flex items-center">
                <span className="mr-1">⚠️</span>
                <span>Odds may change if bets are partially matched</span>
              </p>
            </div>


            {/* Place Trade Button */}
            <button
              onClick={handleBetClick}
              disabled={isBettingClosed || isExpired || betAmount <= 0 || isBetting}
              className={`mt-4 w-full py-2 rounded-md ${isPumpActive
                ? 'bg-green-500 text-black hover:bg-green-400'
                : 'bg-red-500 text-white hover:bg-red-600'
                } ${(isBettingClosed || isExpired || betAmount <= 0 || betAmount >= MAX_BET_AMOUNT || isBetting)
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
                }`}>
              {isBetting ? 'processing...' : 'place bet'}
            </button>

            {/* Disclaimer */}
            <p className="mt-2 text-center text-sm text-gray-400">
              By betting, you agree to the{" "}
              <Link href="/docs/terms-of-service" className="text-blue-400 underline hover:text-blue-300">
                Terms of Use
              </Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Pump vs Rug Split */}
      <div className="mt-6 w-full bg-gray-800 p-4 rounded-md">
        <p className="text-2xl font-semibold text-white">Market Activity</p>
        <div className="flex mt-2 font-semibold">
          <p className="text-green-500">Pump: {stats.pumpPercentage}%</p>
          <p className="mx-2 text-white">|</p>
          <p className="text-red-500">Rug: {stats.rugPercentage}%</p>
        </div>

        {/* Visual representation of split */}
        <div className="mt-3 w-full h-6 bg-red-600 rounded-md overflow-hidden">
          <div
            className="h-full bg-green-500"
            style={{ width: `${stats.pumpPercentage}%` }}
          ></div>
        </div>
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
    </div >
  );
}