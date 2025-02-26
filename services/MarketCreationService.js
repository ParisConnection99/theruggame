
const OracleService = require('./OracleService');

// Purpose: Is to handle fetching and filtering memecoins for market
class MarketCreationService {
    constructor(tokenService, marketService, config = {}, supabase) {
        this.tokenService = tokenService;
        this.marketService = marketService;
        this.config = config;
        this.supabase = supabase;
        this.tokens = [];
        this.TOTAL_MARKET_CAPACITY = 15;
        this.MAXIMUM_ATTEMPTS = 5;
        this.ACTIVE_MARKETS_LIMIT = 10;
        this.MARKET_DURATION = 10;
    }

    // Purpose: Fetch a filtered coin to become a market
    async fetchMarkets() {
        try {
            // 1️⃣ Check if another process is already fetching
            const canStartFetching = await this.canStartFetching();
            if (!canStartFetching) {
                console.log('Another process is already fetching markets. Exiting.');
                return;
            }

            // 2️⃣ Lock fetching process
            await this.startFetching();

            // 3️⃣ Get active market and reserve count (LOCKED)
            const { activeMarketCount, reserveCount, totalCount } = await this.getMarketAndReserveCounts();

            console.log(`Current counts - Active Markets: ${activeMarketCount}, Reserve: ${reserveCount}, Total: ${totalCount}`);

            let token = null;

            if (totalCount < this.TOTAL_MARKET_CAPACITY) {
                // 4️⃣ Need to fetch more tokens
                const tokensNeeded = this.TOTAL_MARKET_CAPACITY - totalCount;
                console.log(`Need ${tokensNeeded} more tokens`);

                // // Fetch tokens (LOCKED)
                const tokens = await this.startTokenFetchCycle(totalCount);

                token = tokens.shift();

                // Handle Market Creation
                await this.handleMarketCreation(token, tokens, activeMarketCount);

            } else {
                // 5️⃣ We have enough total tokens, get one from reserve (LOCKED)
                const reservedToken = await this.getReservedToken();

                if (!reservedToken) {
                    // No valid reserve token → Fetch new tokens (LOCKED)                 
                    //token = await this.fetchTokens(totalCount);
                    const tokens = await this.startTokenFetchCycle(totalCount);

                    token = tokens.shift();

                    // Handle Market Creation
                    await this.handleMarketCreation(token, tokens, activeMarketCount);

                } else {
                    // Valid reserve token available → Create market (LOCKED)
                    token = reservedToken;
                    await this.createMarket(reservedToken);
                }
            }

            // 6️⃣ Unlock fetching process
            await this.finishedFetching();

            return token;

        } catch (error) {
            console.error('Error in fetchMarket:', error);

            // 7️⃣ Ensure we always unlock on failure
            await this.finishedFetching();
            throw error;
        }
    }

    async fetchTokens(totalCount) {
        const tokens = await this.startTokenFetchCycle(totalCount);
        return tokens.shift();
    }

    // Purpose: Fetching the Total Market + Reserve Tokens Count
    async getMarketAndReserveCounts() {
        try {
            const activeMarketCount = await this.marketService.getMarketCount();
            const reserveCount = await this.tokenService.getReserveCount();
            const totalCount = activeMarketCount + reserveCount;

            return { activeMarketCount, reserveCount, totalCount };
        } catch (error) {
            console.error('Error fetching market and reserve counts:', error);
            throw error;
        }
    }

    async handleMarketCreation(token, tokens, activeMarketCount) {
        try {
            // Calculate how many markets need to be created
            const marketsNeeded = this.ACTIVE_MARKETS_LIMIT - activeMarketCount;
            
            // Track any tokens that weren't used for market creation
            const unusedTokens = [...tokens]; // Create a copy to avoid modifying the original
            
            // Create the required number of markets
            for(let i = 0; i < marketsNeeded; i++) {
                let currentToken;
                
                if (i === 0) { // Use strict equality
                    currentToken = token;
                } else if (unusedTokens.length > 0) {
                    currentToken = unusedTokens.shift();
                } else {
                    console.log('No more tokens available for market creation');
                    break;
                }
    
                try {
                    await this.createMarket(currentToken);
                    console.log(`Market created successfully with token: ${currentToken.id || currentToken}`);
                } catch (error) {
                    console.error(`Error creating market with token: ${currentToken.id || currentToken}`, error);
                    // Consider adding the token back to unusedTokens if creation fails
                }
            }
            
            // Save any remaining tokens
            if(unusedTokens.length > 0) {
                console.log(`Saving ${unusedTokens.length} remaining tokens to reserve`);
                await this.saveReserveTokens(unusedTokens);
            }
            
            // Clean up expired tokens
            await this.tokenService.removeExpiredTokens();
            
        } catch (error) {
            console.error('Error in market creation process:', error);
            throw error; // Re-throw to allow caller to handle the error
        }
    }

    // Purpose: Creating the Market + Saving The Reserve Tokens
    // async handleMarketCreation(token, tokens, activeMarketCount) {
    //     // Fetching the amount of markets needed to be created
    //     const marketsNeeded = this.ACTIVE_MARKETS_LIMIT - activeMarketCount;

    //      // Creating the remaining markets
    //     for(let i = 0; i < marketsNeeded; i++) {
    //         let insideToken; // Name changed to avoid confusion with argument
    //         if (i == 0) {
    //             insideToken = token;
    //         } else {
    //             insideToken = tokens.shift();
    //         }

    //         try {
    //             await this.createMarket(insideToken);
    //         } catch (error) {
    //             console.error(`Error creating Market.`);
    //         }
    //     }
    //     try {
    //         // Create market (LOCKED)
    //         //await this.createMarket(token);

    //         // Save remaining tokens in reserve (LOCKED)

    //         // Check the number of active markets needed 
    //         // might have to loop through and create many markets
    //         if(tokens.length > 0) {
    //             console.log('Remaining Tokens: ',tokens);
    //             await this.saveReserveTokens(tokens);
    //         }
            
    //         // Remove expired tokens (LOCKED)
    //         await this.tokenService.removeExpiredTokens();

    //     } catch (error) {
    //         console.log('Error handling market creation');
    //     }
    // }

    // Purpose: Create a new Market
    async createMarket(token) {
        if (!token.address || !token.priceUsd || !token.marketCap || !token.liquidity ||
            !token.transactions.h24?.buys || !token.transactions.h24?.sells) {
            throw new Error('Error processing Token.');
        }

        for (const [field, value] of Object.entries(token)) {
            if (value < 0) {
                throw new Error(`Values cannot be negative`);
            }
        }

        const marketData = {
            tokenAddress: token.address,
            startTime: new Date(),
            duration: this.MARKET_DURATION,
            coinPrice: token.priceUsd,
            marketCap: token.marketCap,
            liquidity: token.liquidity,
            buys: token.transactions.h24?.buys || 0,
            sells: token.transactions.h24?.sells || 0,
            dexscreener_url: token.url,
            dex_id: token.dexId,
            website_url: (token.info?.websites && token.info.websites.length > 0) ? token.info.websites[0] : '',
            icon_url: token.imageUrl,
            coin_description: token.labels,
            name: token.name,
            socials: { 
                socials: token.socials
             }
        };

        return await this.marketService.createMarket(marketData);
    }

    async saveReserveTokens(tokens) {
        // Save reserved tokens and remove expired tokens
        await this.tokenService.saveTokens(tokens);
    }

    // Purpose: Fetch a Reserved Token 
    async getReservedToken() {
        const tokens = await this.tokenService.getAvailableTokens();

        if (!tokens) {
            throw new Error('Error processing reserved tokens.');
        }

        // Sort tokens by creation date
        const sortedTokens = tokens.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        let availableToken = null;

        for (let i = 0; i < sortedTokens.length; i++) {
            const token = sortedTokens[i];

            if (await this.isReservedTokenStillActive(token.token_address)) {
                availableToken = token;
                break;
            } else {
                await this.tokenService.updateTokenStatus(token.token_address, 'expired');
            }
        }

        return availableToken;
    }

    // Purpose: To Validate the reserved token still passes criteria
    async isReservedTokenStillActive(tokenAddress) {
        const result = await this.filterTokens(await this.fetchTokenDetails([tokenAddress]));
        return result.length > 0; // Return true if the array is not empty
    }

    async startTokenFetchCycle(totalCount) {
        let coins = [];
        let count = totalCount;
        let numberOfCalls = 0;

        console.log('Start token cycle.');

        while (numberOfCalls < this.MAXIMUM_ATTEMPTS && count < this.TOTAL_MARKET_CAPACITY) {
            // Fetch the token profiles
            const tokenProfiles = await this.fetchTokenProfiles(30);

            // Fetch the unfilteredTokens
            const tokens = await this.fetchTokenDetails(tokenProfiles.map(token => token.tokenAddress));

            // Filter the tokens
            const filteredTokens = await this.filterTokens(tokens);
            count += filteredTokens.length;

            // Add to coins array
            coins.push(...filteredTokens);
            numberOfCalls++;

            if (count >= this.TOTAL_MARKET_CAPACITY) {
                break;
            }
        }

        return coins;
    }

    async canStartFetching() {
        // Check if we are currently fetching or not
        const { data, error } = await this.supabase
            .from('system_flags')
            .select('value')
            .eq('key', 'reserve_fetch_status')
            .single(); // Use maybeSingle() instead of single()

        // No row exists = no one is fetching
        if (error?.code === 'PGRST116' || !data) {
            return true;
        }

        if (error) {
            console.error("Error checking fetch status:", error);
            return false;
        }

        // If another process is already fetching, exit
        if (data.value === 'fetching') {
            console.log("Another process is already fetching tokens. Exiting.");
            return false;
        }

        return true;
    }

    async startFetching() {
        const { error: updateError } = await this.supabase
            .from('system_flags')
            .update({ value: 'fetching', updated_at: new Date().toISOString() })
            .eq('key', 'reserve_fetch_status')
            .neq('value', 'fetching');  // Ensures only one process updates

        if (updateError) {
            console.log("Another process updated the flag first. Exiting.", updateError.message);
            return false;
        }

        console.log('Updated system_flag db')
        return true;
    }

    async finishedFetching() {
        const { error: updateError } = await this.supabase
            .from('system_flags')
            .update({ value: 'ready', updated_at: new Date().toISOString() })
            .eq('key', 'reserve_fetch_status');

        if (updateError) {
            console.log('Error finishing fetching..');
            return;
        }
    }

    async fetchTokenProfiles(limit = 50) {
        return await OracleService.fetchTokenProfiles(limit);
    }

    async fetchTokenDetails(tokenAddresses) {
        return await OracleService.fetchTokenDetails(tokenAddresses);
    }

    async filterTokens(tokens) {
        console.log('filter tokens: ',tokens);
        try {
            const now = Date.now();

            tokens.forEach(token => {
                console.log('\nAnalyzing token:', token.symbol);

                // 1. Liquidity
                const liquidityUsd = parseFloat(token.liquidity || 0);
                console.log('Liquidity:', liquidityUsd, liquidityUsd >= 50000 ? '✅' : '❌');

                // 2. Market Cap (Optional)
                const marketCap = parseFloat(token.marketCap || 0);
                console.log('Market Cap:', marketCap);

                // 3. Volume
                const volume24h = parseFloat(token.volume24h || 0);
                console.log('24h Volume:', volume24h, volume24h >= 100000 ? '✅' : '❌');

                // 4. Age
                const tokenAge = now - token.createdAt;
                const ageInDays = tokenAge / (24 * 60 * 60 * 1000);
                console.log('Age in days:', ageInDays, ageInDays < 7 ? '✅' : '❌');
            });

            const filteredTokens = tokens.filter(token => {
                const liquidityUsd = parseFloat(token.liquidity || 0);
                const volume24h = parseFloat(token.volume24h || 0);
                const tokenAge = now - token.createdAt;
                const ageInDays = tokenAge / (24 * 60 * 60 * 1000);

                return (
                    liquidityUsd >= 40000 &&
                    volume24h >= 100000 &&
                    ageInDays < 7  // Only fresh high-risk tokens
                );
            });

            return filteredTokens;

        } catch (error) {
            console.error('Error in filter function:', error);
            return [];
        }
    }
}

module.exports = MarketCreationService;