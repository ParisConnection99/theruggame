class HomePageService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    // Purpose: Fetch the active Markets
    async fetchActiveMarkets() {
        try {
            const { data, error } = await this.supabase
                .from('markets')
                .select('*')
                .in('phase', ['BETTING', 'OBSERVATION']);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching Markets.');
            throw error;
        }
    }

    async createMockMarkets(supabase, count = 10) {
        try {
            const mockMarkets = [];

            // Sample coin names, symbols and descriptions for variety
            const coinOptions = [
                { name: 'Doge Coin', symbol: 'DOGE', description: 'The original meme coin with the Shiba Inu dog.' },
                { name: 'Shiba Inu', symbol: 'SHIB', description: 'A decentralized meme token that evolved into a vibrant ecosystem.' },
                { name: 'Pepe Coin', symbol: 'PEPE', description: 'A meme coin based on the popular Pepe the Frog character.' },
                { name: 'Solana Dog', symbol: 'SDOG', description: 'Fast transactions and low fees make this Solana dog run.' },
                { name: 'Moon Token', symbol: 'MOON', description: 'Taking crypto to the moon with innovative tokenomics.' },
                { name: 'Rocket Coin', symbol: 'RKT', description: 'Blast off with this high-velocity token on Solana.' },
                { name: 'Diamond Hands', symbol: 'DIAM', description: 'For those who never sell, no matter the market conditions.' },
                { name: 'Frog Finance', symbol: 'FROG', description: 'Hopping through the crypto pond with revolutionary features.' },
                { name: 'Space Cat', symbol: 'SCAT', description: 'Feline adventures in the crypto universe.' },
                { name: 'Pixel Punk', symbol: 'PXL', description: 'Retro-styled token with a modern crypto twist.' },
                { name: 'Meme Lord', symbol: 'LORD', description: 'The one token to rule all memes.' },
                { name: 'Galaxy Token', symbol: 'GLXY', description: 'Exploring new frontiers in the crypto space.' }
            ];

            // Create an array to store all market data
            const allMarketsData = [];

            // Fixed duration for all markets: 10 minutes
            const durationMinutes = 10;

            for (let i = 0; i < count; i++) {
                // Current timestamp for start time
                const now = new Date();
                const startTime = now;
                
                // End time is exactly 10 minutes from now
                const endTime = new Date(now);
                endTime.setMinutes(endTime.getMinutes() + durationMinutes);

                // Random coin selection
                const randomCoin = coinOptions[Math.floor(Math.random() * coinOptions.length)];

                // Randomize some values for variety
                const initialPrice = (Math.random() * 0.001).toFixed(8);
                const initialMarketCap = Math.floor(10000 + Math.random() * 90000);
                const initialLiquidity = Math.floor(initialMarketCap * (0.1 + Math.random() * 0.3));
                const buyTxns = Math.floor(10 + Math.random() * 90);
                const sellTxns = Math.floor(buyTxns * (0.1 + Math.random() * 0.4));

                // Random odds
                const pumpOdds = (1.5 + Math.random() * 3).toFixed(2);
                const rugOdds = (1.5 + Math.random() * 3).toFixed(2);

                // Create a unique token address for each market
                const tokenAddress = `0x${Array(40).fill(0).map(() =>
                    Math.floor(Math.random() * 16).toString(16)).join('')}`;

                // Sample socials data structure (with some randomization)
                const socials = {
                    telegram: `https://t.me/${randomCoin.symbol.toLowerCase()}coin`,
                    twitter: `https://twitter.com/${randomCoin.symbol.toLowerCase()}coin`,
                    discord: Math.random() > 0.5 ? `https://discord.gg/${randomCoin.symbol.toLowerCase()}` : null,
                    website: `https://${randomCoin.symbol.toLowerCase()}.io`
                };

                // Market data
                const marketData = {
                    token_address: tokenAddress,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    duration: durationMinutes,
                    status: "OPEN",
                    phase: "BETTING",
                    outcome: null,
                    total_pump_amount: 0,
                    total_rug_amount: 0,
                    current_pump_odds: parseFloat(pumpOdds),
                    current_rug_odds: parseFloat(rugOdds),
                    initial_coin_price: parseFloat(initialPrice),
                    initial_market_cap: initialMarketCap,
                    initial_liquidity: initialLiquidity,
                    initial_buy_txns: buyTxns,
                    initial_sell_txns: sellTxns,
                    dex_screener_url: `https://dexscreener.com/solana/${tokenAddress.substring(0, 8)}`,
                    dex_id: "solana_raydium",
                    website_url: socials.website,
                    icon_url: `https://via.placeholder.com/150/FFA500/FFFFFF?text=${randomCoin.symbol}`,
                    coin_description: randomCoin.description,
                    socials: socials,
                    name: randomCoin.name
                };

                allMarketsData.push(marketData);
            }

            // Insert all markets at once
            const { data, error } = await supabase
                .from('markets')
                .insert(allMarketsData)
                .select();

            if (error) {
                console.error("Error creating markets:", error);
                throw error;
            }

            console.log(`${data.length} markets created successfully`);
            return data;

        } catch (error) {
            console.error("Failed to create mock markets:", error);
            throw error;
        }
    }
}

module.exports = HomePageService;