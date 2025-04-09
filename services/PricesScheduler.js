// Initialize Supabase Client
import { supabase } from '@/lib/supabaseClient';

let lastPrices = {}; // Store last known prices to avoid redundant updates
let activeMarketCache = []; // Store active markets in memory
let marketListener; // Reference to the realtime listener
let schedulerInterval = 5000; // Default interval: 5 seconds
let scheduler; // Reference to the interval function
const REALTIME_THRESHOLD = 0.0001; // 0.01% threshold for realtime updates
const DATABASE_THRESHOLD = 0.005; // 0.5% threshold for database updates

// Function to fetch and cache active markets from the database
const refreshMarketCache = async () => {
    try {
        console.log('🔄 Refreshing market cache...');
        const { data, error } = await supabase
            .from('markets')
            .select('id, token_address')
            .eq('phase', 'BETTING')
            .limit(10);

        if (error) throw error;

        activeMarketCache = data;
        console.log(`✅ Market cache refreshed with ${data.length} active markets`);
        return data;
    } catch (error) {
        console.error('❌ Error refreshing market cache:', error);
        return [];
    }
};

// Function to set up market update listener
const setupMarketListener = () => {
    console.log('📡 Setting up market update listener...');
    marketListener = supabase
        .channel('market-updates')
        .on('postgres_changes', 
            { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'market_update_signal' 
            }, 
            handleMarketUpdate)
        .subscribe((status) => {
            console.log(`Market listener status: ${status}`);
        });
};


// Handler for market update events
const handleMarketUpdate = async (payload) => {
    console.log('🔔 Market update detected:', payload);
    await refreshMarketCache();
};

// Function to get current price for a single token
export const getTokenPrice = async (tokenAddress) => {
    try {
      // If we have the price in memory, return it
      if (lastPrices[tokenAddress]) {
        return lastPrices[tokenAddress];
      }
      
      // Otherwise fetch using existing function
      const priceData = await fetchPricesFromDexScreener([tokenAddress]);

      //console.log(`Price data: ${priceData}`);
      
      if (priceData && priceData.length > 0) {
        const price = priceData[0].price;
        const liquidity = priceData[0].liquidity;

        // Update lastPrices regardless of volatility
        lastPrices[tokenAddress] = { price, liquidity };
        
        return { price, liquidity };
      }
      
      return null; // No price available
    } catch (error) {
      console.error('Error fetching token price:', error);
      return null;
    }
  };

// Function to fetch token prices from DexScreener
const fetchPricesFromDexScreener = async (tokenAddresses) => {
    if (tokenAddresses.length === 0) return [];

    try {
        const url = `https://api.dexscreener.com/tokens/v1/solana/${tokenAddresses.join(',')}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'User-Agent': 'PostmanRuntime/7.32.3',
                'Cache-Control': 'no-cache',
                'Postman-Token': Date.now().toString(),
                'Host': 'api.dexscreener.com'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        //console.log("API Response:", JSON.stringify(data, null, 2));
        
        return data.map(token => ({
            tokenAddress: token.baseToken?.address,
            price: parseFloat(token.priceUsd),
            liquidity: token.liquidity && token.liquidity.usd ? parseFloat(token.liquidity.usd) : 0
        }));
    } catch (error) {
        console.error('❌ Error fetching prices from DexScreener:', error);
        return [];
    }
};

// Function to update price history in the database
const updatePriceHistory = async (marketId, tokenAddress, price, liquidity) => {
    try {
        const { data, error } = await supabase
            .from('price_history')
            .insert([{
                market_id: marketId,
                token_address: tokenAddress,
                price: price,
                liquidity: liquidity
            }]);

        if (error) {
            console.error('❌ Error updating price history:', error);
            return false;
        }

        console.log(`✅ Price history updated for market ${marketId}: $${price}`);
        return true;
    } catch (error) {
        console.error('❌ Error in updatePriceHistory:', error);
        return false;
    }
};

// Function to push price updates via Supabase Realtime API (without saving to database)

// Function to push price updates via Supabase Realtime API
const pushPriceUpdates = async (realtimeUpdates, databaseUpdates) => {
    console.log(`🚀 Beginning to process ${realtimeUpdates.length} realtime updates and ${databaseUpdates.length} database updates...`);
    
    // Process realtime updates (just broadcast, no DB write)
    for (const { marketId, tokenAddress, price, liquidity } of realtimeUpdates) {
        try {
            console.log(`📡 Broadcasting price update for token ${tokenAddress}: $${price}`);
            
            const payload = { 
                token_address: tokenAddress,
                current_price: price, 
                liquidity: liquidity,
                updated_at: new Date().toISOString() 
            };
            
            console.log(`📦 Broadcast payload: ${JSON.stringify(payload)}`);
            
            const result = await supabase
                .channel('realtime_prices')
                .send({
                    type: 'broadcast',
                    event: 'price_update',
                    payload: payload
                });
                
            console.log(`📊 Broadcast result: ${JSON.stringify(result)}`);
            
            if (!result) {
                console.error(`❌ Broadcast failed for ${tokenAddress}: No result returned`);
            } else if (result.error) {
                console.error(`❌ Broadcast error for ${tokenAddress}: ${result.error.message}`);
            } else {
                console.log(`✅ Successfully broadcast price update for ${tokenAddress}`);
            }
        } catch (error) {
            console.error(`❌ Error broadcasting price for ${tokenAddress}: ${error.message}`);
        }
    }
    
    // Process database updates (write to DB)
    for (const { marketId, tokenAddress, price, liquidity } of databaseUpdates) {
        try {
            console.log(`💾 Saving price update to database for market ${marketId}: $${price}`);
            const result = await updatePriceHistory(marketId, tokenAddress, price, liquidity);
            if (result) {
                console.log(`✅ Database update successful for market ${marketId}`);
            } else {
                console.error(`❌ Database update failed for market ${marketId}`);
            }
        } catch (error) {
            console.error(`❌ Error in database update for market ${marketId}: ${error.message}`);
        }
    }
    
    console.log(`🏁 Finished processing all price updates`);
};

// Function to start the price scheduler
export const startPriceScheduler = async () => {
    if (scheduler) {
        console.log('⚠️ Scheduler is already running.');
        return;
    }

    // Initial market cache population
    await refreshMarketCache();
    
    // Setup market update listener
    setupMarketListener();

    console.log('🚀 Price Scheduler Started!');

    scheduler = setInterval(async () => {

    const now = new Date();
    const initialCount = activeMarketCache.length;

    console.log('Active Market cache: ', initialCount);
    
    // Filter out expired markets from the cache
    activeMarketCache = activeMarketCache.filter(market => {
        return new Date(market.end_time) >= now;
    });
    
    // Log if markets were removed due to expiration
    if (initialCount !== activeMarketCache.length) {
        console.log(`🕒 Removed ${initialCount - activeMarketCache.length} expired markets from cache`);
    }

        if (activeMarketCache.length === 0) {
            console.log('⚠️ No active markets found. Skipping this cycle.');
            return;
        }

        console.log('📡 Fetching prices from DexScreener...');
        const tokenAddresses = activeMarketCache.map(market => market.token_address);
        const newPrices = await fetchPricesFromDexScreener(tokenAddresses);

        if (!newPrices || newPrices.length === 0) {
            console.log('⚠️ No price updates received. Skipping...');
            return;
        }

        console.log(`📈 New Prices: ${JSON.stringify(newPrices, null, 2)}`);

        const size = Object.keys(lastPrices).length;
        console.log(`Last prices size: ${size}`);

        const realtimeUpdates = [];
        const databaseUpdates = [];

        // Process each price update
        for (const { tokenAddress, price, liquidity } of newPrices) {
            // Find corresponding market
            const market = activeMarketCache.find(m => m.token_address === tokenAddress);
            if (!market) continue;

            // Calculate percentage change if we have a previous price
            const previousPrice = lastPrices[tokenAddress]?.price;
            const percentChange = previousPrice 
                ? Math.abs(price - previousPrice) / previousPrice 
                : 1; // If no previous price, treat as significant change (100%)
            
            // For realtime updates - use lower threshold (0.01%)
            if (!previousPrice || percentChange > REALTIME_THRESHOLD) {
                realtimeUpdates.push({
                    marketId: market.id,
                    tokenAddress,
                    price,
                    liquidity
                });
            }
            
            // For database updates - use higher threshold (0.5%)
            // Also save if this is the first price we've seen (no previous price)
            if (!previousPrice || percentChange > DATABASE_THRESHOLD) {
                databaseUpdates.push({
                    marketId: market.id,
                    tokenAddress,
                    price,
                    liquidity
                });
            }
            
            // Always update the cached price regardless of thresholds
            lastPrices[tokenAddress] = { price, liquidity };
            console.log(`Cache updated for ${tokenAddress}: ${price}`);
        }

        // Log update counts
        if (realtimeUpdates.length > 0 || databaseUpdates.length > 0) {
            console.log(`🚀 Pushing ${realtimeUpdates.length} realtime updates and ${databaseUpdates.length} database updates...`);
            await pushPriceUpdates(realtimeUpdates, databaseUpdates);
        } else {
            console.log('⚠️ No significant price changes. Skipping all updates.');
        }
    }, schedulerInterval);
};

// Function to stop the scheduler
export const stopPriceScheduler = () => {
    if (!scheduler) {
        console.log('⚠️ Scheduler is not running.');
        return;
    }

    // Clean up the listener when stopping
    if (marketListener) {
        marketListener.unsubscribe();
        marketListener = null;
    }

    clearInterval(scheduler);
    scheduler = null;
    console.log('🛑 Price Scheduler Stopped.');
};

// Function to update the scheduler interval dynamically
export const setSchedulerInterval = (newInterval) => {
    if (typeof newInterval !== 'number' || newInterval < 1000) {
        console.log('⚠️ Invalid interval. Must be at least 1000ms (1 second).');
        return;
    }

    console.log(`⏳ Updating scheduler interval to ${newInterval}ms...`);
    schedulerInterval = newInterval;

    if (scheduler) {
        stopPriceScheduler();
        startPriceScheduler();
    }
};

// export const startPriceScheduler = () => {
//     if (scheduler) {
//         console.log('⚠️ Scheduler is already running.');
//         return;
//     }

//     console.log('🚀 Price Scheduler Started!');

//     scheduler = setInterval(async () => {
//         console.log('🔄 Fetching active markets...');
//         const activeMarkets = await getActiveMarkets();

//         if (activeMarkets.length === 0) {
//             console.log('⚠️ No active markets found. Skipping this cycle.');
//             return;
//         }

//         console.log('📡 Fetching prices from DexScreener...');
//         const tokenAddresses = activeMarkets.map(market => market.token_address);
//         const newPrices = await fetchPricesFromDexScreener(tokenAddresses);

//         if (!newPrices || newPrices.length === 0) {
//             console.log('⚠️ No price updates received. Skipping...');
//             return;
//         }

//         console.log(`📈 New Prices: ${JSON.stringify(newPrices, null, 2)}`);

//         const size = Object.keys(lastPrices).length;
//         console.log(`Last prices size: ${size}`);

//         const realtimeUpdates = [];
//         const databaseUpdates = [];

//         // Process each price update
//         for (const { tokenAddress, price, liquidity } of newPrices) {
//             // Find corresponding market
//             const market = activeMarkets.find(m => m.token_address === tokenAddress);
//             if (!market) continue;

//             // Calculate percentage change if we have a previous price
//             const previousPrice = lastPrices[tokenAddress]?.price;
//             const percentChange = previousPrice 
//                 ? Math.abs(price - previousPrice) / previousPrice 
//                 : 1; // If no previous price, treat as significant change (100%)
            
//             // For realtime updates - use lower threshold (0.01%)
//             if (!previousPrice || percentChange > REALTIME_THRESHOLD) {
//                 realtimeUpdates.push({
//                     marketId: market.id,
//                     tokenAddress,
//                     price,
//                     liquidity
//                 });
//             }
            
//             // For database updates - use higher threshold (0.5%)
//             // Also save if this is the first price we've seen (no previous price)
//             if (!previousPrice || percentChange > DATABASE_THRESHOLD) {
//                 databaseUpdates.push({
//                     marketId: market.id,
//                     tokenAddress,
//                     price,
//                     liquidity
//                 });
//             }
            
//             // Always update the cached price regardless of thresholds
//             lastPrices[tokenAddress] = { price, liquidity };
//             console.log(`Cache updated for ${tokenAddress}: ${price}`);
//         }

//         // Log update counts
//         if (realtimeUpdates.length > 0 || databaseUpdates.length > 0) {
//             console.log(`🚀 Pushing ${realtimeUpdates.length} realtime updates and ${databaseUpdates.length} database updates...`);
//             await pushPriceUpdates(realtimeUpdates, databaseUpdates);
//         } else {
//             console.log('⚠️ No significant price changes. Skipping all updates.');
//         }
//     }, schedulerInterval);
// };