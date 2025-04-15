"use client";

import { useState, useEffect } from 'react';
import MarketCard from '@/components/MarketCard';
import FeaturedMarket from '@/components/FeaturedMarket';
import { listenToMarkets } from '@/services/MarketRealtimeService';
import { useRouter } from 'next/navigation';
import { useAnalytics } from '@/components/FirebaseProvider';
import { logEvent } from 'firebase/analytics';
import { logActivity } from '@/utils/LogActivity';
import { useAuth } from '@/components/FirebaseProvider';
import { errorLog } from '@/utils/ErrorLog';
import WelcomePopup from '@/components/WelcomePopup';
import { logInfo, logError } from '@/utils/logger';

export default function Home() {
  const [timeLeft, setTimeLeft] = useState('--:--:--');
  const [markets, setMarkets] = useState([]);
  const [filteredMarkets, setFilteredMarkets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [endTime, setEndTime] = useState(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [featuredMarket, setFeaturedMarket] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const router = useRouter();
  const analytics = useAnalytics();
  const { auth } = useAuth();

  const updateFeaturedMarket = (marketsList) => {
    if (!marketsList || marketsList.length === 0) return;
  
    const now = new Date().getTime();
    
    // Find market with highest score based on status, total wagered, and time remaining
    const newFeaturedMarket = marketsList.reduce((featured, current) => {
      // Calculate total amount wagered for each market
      const featuredTotal = (featured.total_pump_amount || 0) + (featured.total_rug_amount || 0);
      const currentTotal = (current.total_pump_amount || 0) + (current.total_rug_amount || 0);
      
      // Calculate time remaining for each market (in minutes)
      const featuredTimeRemaining = featured.end_time ? 
        Math.max(0, (new Date(featured.end_time).getTime() - now) / (1000 * 60)) : 0;
      const currentTimeRemaining = current.end_time ? 
        Math.max(0, (new Date(current.end_time).getTime() - now) / (1000 * 60)) : 0;
      
      // Add status factor - prioritize "OPEN" or "MATCHING" status
      const featuredStatusBoost = (featured.status === "OPEN" || featured.status === "MATCHING") ? 2 : 1;
      const currentStatusBoost = (current.status === "OPEN" || current.status === "MATCHING") ? 2 : 1;
      
      // Scoring formula: combines status, total wagered and time factor
      const timeWeight = 0.05; // Adjusted for minutes instead of days
      
      const featuredScore = featuredTotal * (1 + (featuredTimeRemaining * timeWeight)) * featuredStatusBoost;
      const currentScore = currentTotal * (1 + (currentTimeRemaining * timeWeight)) * currentStatusBoost;
      
      return currentScore > featuredScore ? current : featured;
    }, marketsList[0]);
  
    setFeaturedMarket(newFeaturedMarket);
  };

  useEffect(() => {
    const welcomePopup = localStorage.getItem('welcome_popup');

    // If the popup has never been shown before (welcome_popup doesn't exist)
    if (welcomePopup === null) {
      setShowPopup(true);
      // And then set it so it won't show again
      localStorage.setItem('welcome_popup', 'true');
    }
  }, []);

  // Handle search functionality
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredMarkets(markets);
    } else {
      const filtered = markets.filter(market => 
        market.token_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMarkets(filtered);
    }
  }, [searchTerm, markets]);

  // Fetching the active markets
  useEffect(() => {
    const fetchMarketsData = async () => {
      try {
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/check-maintenance?t=${timestamp}`, {
          cache: 'no-store'
        });
        const { isMaintenance, endTimestamp } = await res.json();

        setIsMaintenance(isMaintenance);

        if (isMaintenance && endTimestamp) {
          setEndTime(new Date(endTimestamp));
          startCountdown(new Date(endTimestamp));
          return; // Skip market fetch if in maintenance
        }

        setLoading(true);

        const marketsResponse = await fetch('/api/markets');

        if (!marketsResponse.ok) {
          const errorData = await marketsResponse.json();
          throw new Error(errorData.error || 'Failed to fetch markets.');
        }

        const marketsData = await marketsResponse.json();

        if (marketsData && marketsData.length > 0) {
          // First create a map to store unique markets by token_address
          const uniqueMarketsMap = new Map();

          // Add each market to the map, with newer markets overwriting older ones
          marketsData.forEach(market => {
            // If this token_address doesn't exist in the map OR
            // if this market is newer than the one in the map, add/update it
            const existingMarket = uniqueMarketsMap.get(market.token_address);
            if (!existingMarket || new Date(market.created_at) > new Date(existingMarket.created_at)) {
              uniqueMarketsMap.set(market.token_address, market);
            }
          });

          // Convert map values back to array and sort by created_at
          const uniqueSortedMarkets = Array.from(uniqueMarketsMap.values())
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

          setMarkets(uniqueSortedMarkets);
          setFilteredMarkets(uniqueSortedMarkets); // Initialize filtered markets with all markets
          updateFeaturedMarket(uniqueSortedMarkets);
        } else {
          console.log("No Markets found or empty data returned");
        }

      } catch (error) {
        await errorLog(
          "FETCHING_MARKETS_ERROR",
          error.message || 'Error object with empty message',
          error.stack || "no stack trace available",
          "HOME",
          "SERIOUS");
        logEvent(analytics, 'home_page_error', {
          error_message: error.message,
          error_code: error.code || 'unknown'
        });

      } finally {
        setLoading(false);
      }
    }

    fetchMarketsData();
  }, []);

  useEffect(() => {
    // Define an inner async function
    const setupSubscription = async () => {
      const handleMarketUpdate = (updatedMarket) => {
        switch (updatedMarket.type) {
          case 'NEW MARKET':
            // Check if market with same token_address already exists
            const marketExists = markets.some(market =>
              market.token_address === updatedMarket.payload.token_address
            );
  
            // Only add if it doesn't exist
            if (!marketExists) {
              const newMarkets = [...markets, updatedMarket.payload];
              newMarkets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
              setMarkets(newMarkets);
            }
            break;
  
          case 'PUMP VS RUG SPLIT UPDATE':
            // We should update the Featured Market.
            setMarkets(currentMarkets => {
              const updatedMarkets = currentMarkets.map(market =>
                market.id === updatedMarket.payload.id ? updatedMarket.payload : market
              );
  
              // Recalculate featured market
              updateFeaturedMarket(updatedMarkets);
  
              return updatedMarkets;
            });
            break;
          case 'MARKET STATUS UPDATE':
  
            // Removes the markets with the resolved status
            setMarkets(currentMarkets => {
              const filteredMarkets = currentMarkets.filter(market =>
                !(market.id === updatedMarket.payload.id && updatedMarket.payload.status === 'RESOLVED')
              );
  
              // Recalculate featured market if needed
              updateFeaturedMarket(filteredMarkets);
  
              return filteredMarkets;
            });
        }
      }
  
      const subscription = await listenToMarkets(handleMarketUpdate);
      return subscription;
    };
  
    // Call the async function and store the promise
    let subscriptionPromise = setupSubscription();
    
    // Cleanup function
    return () => {
      // Use the promise to unsubscribe when component unmounts
      subscriptionPromise.then(subscription => {
        if (subscription) {
          subscription.unsubscribe();
        }
      });
    };
  }, [markets]); // Be careful with this dependency - may cause infinite loops

  async function onMarketClick(marketId) {
    if (analytics) {
      logEvent(analytics, 'market_click', {
        market_id: marketId,
        page: 'home',
        timestamp: new Date()
      });
    }

    await logActivity('market_selected', auth, `MarketId: ${marketId}`);
    router.push(`/market/${marketId}`);
  }

  // Function to handle featured market click
  const handleFeaturedMarketClick = async () => {
    // Navigate to the market details page
    if (featuredMarket && featuredMarket.id) {
      if (analytics) {
        logEvent(analytics, 'featured_market_click', {
          market_id: featuredMarket.id,
          page: 'home',
          timestamp: new Date()
        });
      }

      await logActivity('feature_market_selected', auth, `FeaturedMarketId: ${featuredMarket.id}`);
      router.push(`/market/${featuredMarket.id}`);
    }
  };

  const [visibleMarkets, setVisibleMarkets] = useState(6); // Start with 6 markets
  const showMoreMarkets = () => {
    setVisibleMarkets((prev) => prev + 6); // Load 6 more markets
  };

  const onWelcomePopupClose = () => {
    localStorage.setItem('welcome_popup', true);
    setShowPopup(false);
  }

  // Search handler
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setVisibleMarkets(6); // Reset visible markets when searching
  };

  // Handle search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission
    // Blur the input to close the keyboard on mobile
    document.activeElement.blur();
  };

  let interval;

  const startCountdown = (endDate) => {
    clearInterval(interval); // Clear any existing timer

    const updateTimer = () => {
      const now = new Date();
      const diff = endDate - now;

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft('00:00:00');
        return;
      }

      // Calculate hours, minutes, seconds
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:` +
        `${minutes.toString().padStart(2, '0')}:` +
        `${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer(); // Immediate update
    interval = setInterval(updateTimer, 1000); // Update every second
  };

  if (isMaintenance) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <img src="/images/logo1.png" alt="Logo" className="h-20 w-20 mb-6" />
        <h1 className="text-3xl font-bold text-purple-400 mb-2">
          THE RUG GAME
        </h1>
        <p className="text-xl text-white mb-6">IS NOW CLOSED</p>

        {/* Countdown Timer */}
        <div className="bg-black rounded-lg p-6 mb-6">
          <p className="text-gray-300 mb-2">WE WILL BE BACK IN</p>
          <div className="text-5xl font-mono font-bold text-green-400">
            {timeLeft}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <main>
        {showPopup && <WelcomePopup onClose={onWelcomePopupClose} />}

        {/* Extra space at the top of the page - only visible on desktop */}
        <div className="hidden md:block h-16"></div>

        {/* Search Bar - Added above Featured Market with appropriate spacing */}
        <div className="w-full px-4 md:mt-8 mt-2 mb-6">
          <div className="max-w-md mx-auto">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search by token address or name..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full px-4 py-3 pl-10 pr-10 text-sm text-white bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                style={{ 
                  boxSizing: 'border-box', 
                  maxWidth: '100%',
                  fontSize: '16px', /* Prevents iOS zoom on focus */
                  WebkitTextSizeAdjust: '100%',
                  WebkitTapHighlightColor: 'rgba(0,0,0,0)',
                  transform: 'translateZ(0)', /* Forces hardware acceleration */
                  touchAction: 'manipulation'
                }}
                enterKeyHint="search"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg 
                  className="w-5 h-5 text-gray-400" 
                  fill="none" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              )}
              <button type="submit" className="hidden">Search</button>
            </form>
          </div>
        </div>

        {/* Featured Market Component */}
        {featuredMarket && (
          <FeaturedMarket
            marketName={featuredMarket.name}
            start_time={featuredMarket.start_time}
            end_time={featuredMarket.end_time}
            duration={featuredMarket.duration}
            amountWagered={`${featuredMarket.total_pump_amount + featuredMarket.total_rug_amount} SOL`}
            imageSrc={featuredMarket?.icon_url}
            onMarketClick={handleFeaturedMarketClick}
          />
        )}

        <div className="p-4 mt-10">
          {filteredMarkets.length === 0 && !loading ? (
            <div className="text-center py-10">
              <p className="text-xl text-gray-400">No markets found matching "{searchTerm}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMarkets.slice(0, visibleMarkets).map((market, index) => (
                <MarketCard
                  key={market.id}
                  name={market.name}
                  imageSrc={market?.icon_url}
                  start_time={market.start_time}
                  end_time={market.end_time}
                  duration={market.duration}
                  onMarketClick={() => onMarketClick(market.id)}
                />
              ))}
            </div>
          )}

          {visibleMarkets < filteredMarkets.length && (
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