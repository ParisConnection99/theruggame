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


export default function Home() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [featuredMarket, setFeaturedMarket] = useState(null);
  const router = useRouter();
  const analytics = useAnalytics();
  const { auth } = useAuth();


  // Helper function defined outside of any useEffect
  const updateFeaturedMarket = (marketsList) => {
    if (!marketsList || marketsList.length === 0) return;

    // Find market with highest total amount wagered
    const newFeaturedMarket = marketsList.reduce((featured, current) => {
      const featuredTotal = (featured.total_pump_amount || 0) + (featured.total_rug_amount || 0);
      const currentTotal = (current.total_pump_amount || 0) + (current.total_rug_amount || 0);

      return currentTotal > featuredTotal ? current : featured;
    }, marketsList[0]);

    setFeaturedMarket(newFeaturedMarket);
  };


  // Fetching the active markets
  useEffect(() => {
    const fetchMarketsData = async () => {
      try {
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
          updateFeaturedMarket(uniqueSortedMarkets);
        } else {
          console.log("No Markets found or empty data returned");
        }

      } catch (error) {
        console.error("Error fetching markets: ", error);
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

  // Listening for updates on the market
  useEffect(() => {
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

    const subscription = listenToMarkets(handleMarketUpdate);

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [markets]);

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
  return (
    <div>
      <main>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.slice(0, visibleMarkets).map((market, index) => (
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