const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Initialize Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let lastPrices = {}; // Store last known prices to avoid redundant updates
let schedulerInterval = 5000; // Default interval: 5 seconds
let scheduler; // Reference to the interval function

// Function to fetch active token addresses from the database
const getActiveMarkets = async () => {
    try {
        const { data, error } = await supabase
            .from('markets')
            .select('token_address')
            .eq('status', 'BETTING')
            .limit(10); // Ensure only 10 markets max

        if (error) throw error;

        return data.map(market => market.token_address);
    } catch (error) {
        console.error('❌ Error fetching active markets:', error);
        return [];
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
        
        return data.pairs.map(pair => ({
            tokenAddress: pair.pairAddress,
            price: parseFloat(pair.priceUsd)
        }));
    } catch (error) {
        console.error('❌ Error fetching prices from DexScreener:', error);
        return [];
    }
};

// Function to push price updates via Supabase Realtime API (without saving to database)
const pushPriceUpdates = async (priceUpdates) => {
    for (const { tokenAddress, price } of priceUpdates) {
        await supabase
            .channel('realtime_prices')
            .send({
                type: 'broadcast',
                event: 'price_update',
                payload: { token_address: tokenAddress, current_price: price, updated_at: new Date().toISOString() }
            });
    }
};

// Function to start the price scheduler
const startPriceScheduler = () => {
    if (scheduler) {
        console.log('⚠️ Scheduler is already running.');
        return;
    }

    console.log('🚀 Price Scheduler Started!');

    scheduler = setInterval(async () => {
        console.log('🔄 Fetching active markets...');
        const activeMarkets = await getActiveMarkets();

        if (activeMarkets.length === 0) {
            console.log('⚠️ No active markets found. Skipping this cycle.');
            return;
        }

        console.log('📡 Fetching prices from DexScreener...');
        const newPrices = await fetchPricesFromDexScreener(activeMarkets);

        if (!newPrices || newPrices.length === 0) {
            console.log('⚠️ No price updates received. Skipping...');
            return;
        }

        // Compare prices and filter only significant changes
        const priceUpdates = newPrices.filter(({ tokenAddress, price }) => {
            if (!lastPrices[tokenAddress] || Math.abs(price - lastPrices[tokenAddress]) / lastPrices[tokenAddress] > 0.005) {
                lastPrices[tokenAddress] = price;
                return true;
            }
            return false;
        });

        if (priceUpdates.length > 0) {
            console.log('🚀 Pushing price updates via Supabase Realtime API...');
            await pushPriceUpdates(priceUpdates);
        } else {
            console.log('⚠️ No significant price changes. Skipping push.');
        }
    }, schedulerInterval);
};

// Function to stop the scheduler
const stopPriceScheduler = () => {
    if (!scheduler) {
        console.log('⚠️ Scheduler is not running.');
        return;
    }

    clearInterval(scheduler);
    scheduler = null;
    console.log('🛑 Price Scheduler Stopped.');
};

// Function to update the scheduler interval dynamically
const setSchedulerInterval = (newInterval) => {
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

module.exports = { startPriceScheduler, stopPriceScheduler, setSchedulerInterval };