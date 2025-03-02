"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import HomePageService from '@/services/HomePageService';
import MarketCard from '@/components/MarketCard';
import FeaturedMarket from '@/components/FeaturedMarket';
import { listenToMarkets } from '@/services/MarketRealtimeService';
import { useRouter } from 'next/navigation';


const homePageService = new HomePageService(supabase);

export default function Home() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [featuredMarket, setFeaturedMarket] = useState(null);
  const router = useRouter();

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

     // await homePageService.createMockMarket(supabase, 1);
    //await homePageService.createMockMarket(supabase, 2);
    // await homePageService.createMockMarket(supabase, 3);
        const marketsData = await homePageService.fetchActiveMarkets();

        console.log(`Markets: ${marketsData}`);
        if (marketsData && marketsData.length > 0) {
          const sortedMarkets = marketsData.sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
          });

          setMarkets(sortedMarkets);

          updateFeaturedMarket(sortedMarkets);
        } else {
          console.log("No Markets found or empty data returned");
        }
      } catch (error) {
        console.error("Error fetching markets: ", error);
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
          const newMarkets = [...markets, updatedMarket.payload];
          newMarkets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setMarkets(newMarkets);
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
    console.log(`Market index ${marketId}`);

    router.push(`/market/${marketId}`);
   //wait homePageService.createMockMarket(supabase, 3);
    //alert('Market clicked');
  }

  // Function to handle featured market click
  const handleFeaturedMarketClick = () => {
    // Navigate to the market details page
    // Replace with your actual navigation logic
    if (featuredMarket && featuredMarket.id) {
      router.push(`/market/${featuredMarket.id}`);
    }
  };

  const [visibleMarkets, setVisibleMarkets] = useState(6); // Start with 6 markets
  const showMoreMarkets = () => {
    setVisibleMarkets((prev) => prev + 6); // Load 6 more markets
  };

  return (
    <div>
      <main >
        {/* Featured Market Component */}
        {featuredMarket ? (
          <FeaturedMarket
            marketName={featuredMarket.name}
            start_time={featuredMarket.start_time}
            end_time={featuredMarket.end_time}
            duration={featuredMarket.duration}
            amountWagered={`${featuredMarket.total_pump_amount + featuredMarket.total_rug_amount} SOL`}
            imageSrc={featuredMarket.imageSrc || "/images/eth.webp"}
            onMarketClick={handleFeaturedMarketClick}
          />
        ) : (
          // Fallback for when no featured market is available
          <FeaturedMarket
            start_time={new Date(Date.now() - 5 * 60000).toISOString()} // 5 minutes ago
            end_time={new Date(Date.now() + 10 * 60000).toISOString()} // 10 minutes from now
            duration={15} // 15 minutes total duration
          />
        )}

        <div className="p-4 mt-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.slice(0, visibleMarkets).map((market, index) => (
              <MarketCard
                key={index}
                name={market.name}
                imageSrc={market.imageSrc}
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