"use client";

import Image from "next/image";
import Link from "next/link";
import DropdownButton from "@/components/DropdownButton";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import HomePageService from '@/services/HomePageService';
import MarketCard from '@/components/MarketCard';
import FeaturedMarket from '@/components/FeaturedMarket';


const homePageService = new HomePageService(supabase);

export default function Home() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [featuredMarket, setFeaturedMarket] = useState(null);


  useEffect(() => {
    const fetchMarketsData = async () => {
      try {
        setLoading(true);

        //await homePageService.createMockMarkets(supabase);

        const marketsData = await homePageService.fetchActiveMarkets();

        console.log(`Markets: ${marketsData}`);
        if (marketsData && marketsData.length > 0) {
          const sortedMarkets = marketsData.sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
          });

          setMarkets(sortedMarkets);
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


  // Function to handle featured market click
  const handleFeaturedMarketClick = () => {
    // Navigate to the market details page
    // Replace with your actual navigation logic
    if (featuredMarket && featuredMarket.id) {
      router.push(`/markets/${featuredMarket.id}`);
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
            amountWagered={`${featuredMarket.amount_wagered || 50} SOL (${featuredMarket.amount_wagered_usd || '10k'})`}
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



{/* Search Market 
        <div className="flex gap-2 items-center justify-center mt-10 mb-10">
          <input type="text"
            className="w-full sm:w-1/3 bg-blue-300 text-white rounded-md h-10 p-2 ml-4 placeholder-gray-500 focus:border-white"
            placeholder="search markets">
          </input>

          <button className="bg-blue-300 text-black hover:bg-blue-500 w-20 h-10 rounded-md mr-4">
            search
          </button>

        </div>*/}


        {/*  
        <div className="flex mt-10 ml-5">
          <DropdownButton onClick={onSortButtonClick} />
        </div>
        */}

       