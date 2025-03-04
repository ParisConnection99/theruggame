class HomePageService {
    constructor(supabase) {
        this.supabase = supabase;
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


    async createMockMarket(supabase, marketId) {
        // Current timestamp
        const now = new Date();

        // Create start time 1 hour from now
        const startTime = new Date(now);
        //startTime.setHours(startTime.getHours() + 1);

        // Create end time (10 min duration)
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + 10);

        // Market variations based on marketId
        const marketVariations = [
            {
                token_address: "2jcx4R6R8X2A8bqp4i612izx1s71Srubpt8MeZrHyBYt",
                initial_coin_price: 0.000025,
                initial_market_cap: 20000,
                initial_liquidity: 4000,
                initial_buy_txns: 30,
                initial_sell_txns: 10,
                total_pump_amount: 1200,
                total_rug_amount: 800,
                name: "Pepe Coin",
                website_url: "https://pepecoin.io",
                icon_url: "https://pepecoin.io/logo.png",
                dex_screener_url: "https://dexscreener.com/solana/pepe-address"
            },
            {
                token_address: "fiYsJnMggjZ4zSyHLcFk4LdJB6xaWcQrTYxQ1btpump",
                initial_coin_price: 0.000035,
                initial_market_cap: 30000,
                initial_liquidity: 6000,
                initial_buy_txns: 50,
                initial_sell_txns: 15,
                total_pump_amount: 2000,
                total_rug_amount: 1500,
                name: "Shiba Coin",
                website_url: "https://shibacoin.io",
                icon_url: "https://shibacoin.io/logo.png",
                dex_screener_url: "https://dexscreener.com/solana/shiba-address"
            },
            {
                token_address: "8QhSMvYfXome11VgxFMD75hNbGQXW5QTnjA8khENkY2c",
                initial_coin_price: 0.000045,
                initial_market_cap: 40000,
                initial_liquidity: 8000,
                initial_buy_txns: 70,
                initial_sell_txns: 20,
                total_pump_amount: 5000,
                total_rug_amount: 3000,
                name: "Floki Coin",
                website_url: "https://flokicoin.io",
                icon_url: "https://flokicoin.io/logo.png",
                dex_screener_url: "https://dexscreener.com/solana/floki-address"
            }
        ];

        // Select market variation based on input marketId
        const selectedMarket = marketVariations[marketId % marketVariations.length];

        // Sample socials data
        const socials = {
            telegram: `https://t.me/${selectedMarket.name.toLowerCase().replace(" ", "")}`,
            twitter: `https://twitter.com/${selectedMarket.name.toLowerCase().replace(" ", "")}`,
            discord: null,
            website: selectedMarket.website_url
        };

        // Market data
        const marketData = {
            token_address: selectedMarket.token_address,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            duration: 10, // minutes
            status: "OPEN", // pending, active, closed
            phase: "BETTING", // pre-launch, live, resolved
            outcome: null, // will be 'pump' or 'rug' after resolution
            total_pump_amount: selectedMarket.total_pump_amount,
            total_rug_amount: selectedMarket.total_rug_amount,
            current_pump_odds: 2.0,
            current_rug_odds: 2.0,
            initial_coin_price: selectedMarket.initial_coin_price,
            initial_market_cap: selectedMarket.initial_market_cap,
            initial_liquidity: selectedMarket.initial_liquidity,
            initial_buy_txns: selectedMarket.initial_buy_txns,
            initial_sell_txns: selectedMarket.initial_sell_txns,
            dex_screener_url: selectedMarket.dex_screener_url,
            dex_id: "solana_raydium",
            website_url: selectedMarket.website_url,
            icon_url: selectedMarket.icon_url,
            coin_description: `${selectedMarket.name} is a trending memecoin on Solana with a strong community.`,
            socials: socials,
            name: selectedMarket.name
        };

        try {
            const { data, error } = await supabase
                .from('markets')
                .insert([marketData])
                .select();

            if (error) {
                console.error("Error creating market:", error);
                throw error;
            }

            console.log("Market created successfully:", data);
            return data[0];
        } catch (error) {
            console.error("Failed to create market:", error);
            throw error;
        }
    }
}

module.exports = HomePageService;