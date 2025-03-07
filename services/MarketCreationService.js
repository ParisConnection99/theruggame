
const OracleService = require('./OracleService');

// Purpose: Is to handle fetching and filtering memecoins for market
class MarketCreationService {
    constructor(tokenService, marketService, config = {}, supabase) {
        this.tokenService = tokenService;
        this.marketService = marketService;
        this.config = config;
        this.supabase = supabase;
        this.tokens = [];
        this.activeMarkets = [];
        //this.TOTAL_MARKET_CAPACITY = 15;
        this.MAXIMUM_ATTEMPTS = 5;
        this.ACTIVE_MARKETS_LIMIT = 2;
        this.MARKET_DURATION = 1;
    }

    // Purpose: Fetch a filtered coin to become a market
    async fetchMarkets() {
        try {

            // const canFetchWithLock = await this.canStartFetchingAndLock();
            // if (!canFetchWithLock) {
            //     console.log('Another process is already fetching markets. Exiting');
            //     return;
            // }

            this.activeMarkets = await this.marketService.getActiveMarkets();

            const activeMarketCount = this.activeMarkets.length;

            console.log(`Current counts - Active Markets: ${activeMarketCount}`);

            let token = null;

            if (activeMarketCount < this.ACTIVE_MARKETS_LIMIT) {
                // 4️⃣ Need to fetch more tokens
                const tokensNeeded = this.ACTIVE_MARKETS_LIMIT - activeMarketCount;
                console.log(`Need ${tokensNeeded} more tokens`);

                // // Fetch tokens (LOCKED)
                const fetchedTokens = await this.startTokenFetchCycle(activeMarketCount);

                const tokens = this.shuffleArray(fetchedTokens);

                token = tokens.shift();

                // Handle Market Creation
                await this.handleMarketCreation(token, tokens, activeMarketCount);
            } else {
                console.log('We have enough active markets.');
            }

            // 6️⃣ Unlock fetching process
           // await this.finishedFetching();

            return token;

        } catch (error) {
            console.error('Error in fetchMarket:', error);

            // 7️⃣ Ensure we always unlock on failure
            //await this.finishedFetching();
            throw error;
        }
    }

    shuffleArray(array) {
        // Create a copy of the array to avoid modifying the original
        const shuffled = [...array];
        
        // Start from the last element and swap one by one
        for (let i = shuffled.length - 1; i > 0; i--) {
            // Pick a random index from 0 to i
            const j = Math.floor(Math.random() * (i + 1));
            
            // Swap elements at i and j
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        return shuffled;
    }

    async fetchTokens(totalCount) {
        const tokens = await this.startTokenFetchCycle(totalCount);
        return tokens.shift();
    }

    // Purpose: Fetching the Total Market + Reserve Tokens Count
    async getMarketAndReserveCounts() {
        try {
            const activeMarketCount = await this.marketService.getMarketCount();
            //const reserveCount = await this.tokenService.getReserveCount();
            //const totalCount = activeMarketCount + reserveCount;

            return { activeMarketCount };
        } catch (error) {
            console.error('Error fetching market and reserve counts:', error);
            throw error;
        }
    }

    async handleMarketCreation(token, tokens, activeMarketCount) {
        try {
            // Calculate how many markets need to be created
            const marketsNeeded = this.ACTIVE_MARKETS_LIMIT - activeMarketCount;

            // Filter out any undefined or null tokens from the array
            const validTokens = tokens.filter(t => t !== undefined && t !== null);
            console.log(`Filtered tokens array: ${validTokens.length} valid tokens out of ${tokens.length} total`);

            console.log(`Active Market count: ${activeMarketCount}, markets needed: ${marketsNeeded}, token: ${tokens.length} `);
            // Track any tokens that weren't used for market creation
            const unusedTokens = [...validTokens]; // Create a copy to avoid modifying the original

            // Create the required number of markets
            for (let i = 0; i < marketsNeeded; i++) {
                let currentToken;

                if (i === 0) {
                    currentToken = token;
                } else if (unusedTokens.length > 0) {
                    currentToken = unusedTokens.shift();
                } else {
                    console.log('No more tokens available for market creation');
                    break;
                }

                // Validate token before attempting to create market
                if (!currentToken || !currentToken.address) {
                    console.log(`Invalid token at position ${i}, skipping market creation`);
                    continue;
                }

                try {
                    await this.createMarket(currentToken);
                    console.log(`Market created successfully with token:`,
                        currentToken.id ?
                            `ID: ${currentToken.id}, Address: ${currentToken.address}` :
                            `Address: ${currentToken.address}`
                    );
                } catch (error) {
                    console.error(`Error creating market with token:`,
                        currentToken.id ?
                            `ID: ${currentToken.id}, Address: ${currentToken.address}` :
                            `Address: ${currentToken.address}`,
                        error
                    );
                    // Consider adding the token back to unusedTokens if creation fails
                    // uncommenting the following line would allow retry of failed tokens
                    // unusedTokens.push(currentToken);
                }
            }

        } catch (error) {
            console.error('Error in market creation process:', error);
            throw error; // Re-throw to allow caller to handle the error
        }
    }

    // Purpose: Create a new Market
    async createMarket(token) {
        console.log(`Token about to be created: ${JSON.stringify(token, null, 2)}`);
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
            dex_screener_url: token.url,
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

        while (numberOfCalls < this.MAXIMUM_ATTEMPTS && count < this.ACTIVE_MARKETS_LIMIT) {
            // Fetch the token profiles
            const tokenProfiles = await this.fetchTokenProfiles(30);

            // Check to makesure profile doesnt exist in active markets array
            const uniqueTokenProfiles = this.filterOutExistingTokens(tokenProfiles, this.activeMarkets);

            // Fetch the unfilteredTokens
            const tokens = await this.fetchTokenDetails(uniqueTokenProfiles.map(token => token.tokenAddress));

            // Filter the tokens
            const filteredTokens = await this.filterTokens(tokens);

            // Makesure the tokens are not in the coins array
            const uniqueFilteredTokens = this.filterTokensNotInCoins(filteredTokens, coins);

            count += uniqueFilteredTokens.length;

            // // Add to coins array

            // // Check if tokens already exist if they 
            coins.push(...uniqueFilteredTokens);
            numberOfCalls++;

            if (count >= this.ACTIVE_MARKETS_LIMIT) {
                break;
            }
        }

        return coins;
    }

    filterOutExistingTokens(newTokens, activeTokens) {
        // Create a Set of lowercase active token addresses for efficient lookup
        const activeAddresses = new Set();
        for (const token of activeTokens) {
            if (token && token.token_address) {
                activeAddresses.add(token.token_address.toLowerCase());
            }
        }

        // Filter new tokens, keeping only those not in active tokens
        return newTokens.filter(newToken => {
            if (!newToken || !newToken.tokenAddress) {
                return false; // Skip invalid tokens
            }
            return !activeAddresses.has(newToken.tokenAddress.toLowerCase());
        });
    }

    filterTokensNotInCoins(filteredTokens, coins) {
        // Check for null or undefined inputs
        if (!filteredTokens || !Array.isArray(filteredTokens)) {
            return [];
        }

        // Handle null or undefined coins by treating it as an empty array
        const coinsArray = Array.isArray(coins) ? coins : [];

        // Safely create a Set of valid addresses from the coins array
        const coinAddresses = new Set();
        for (const coin of coinsArray) {
            if (coin && typeof coin.address === 'string') {
                coinAddresses.add(coin.address.toLowerCase());
            }
        }

        // Filter tokens with valid addresses that are not in the coinAddresses set
        const uniqueTokens = filteredTokens.filter(token => {
            // Skip tokens with invalid addresses
            if (!token || typeof token.address !== 'string') {
                return false;
            }

            return !coinAddresses.has(token.address.toLowerCase());
        });

        return uniqueTokens;
    }


    async canStartFetchingAndLock() {
        // Use our new RPC function
        const { data, error } = await this.supabase.rpc(
            'try_acquire_fetch_lock',
            { key_param: 'reserve_fetch_status' }
        );

        console.log(`System flags data: ${JSON.stringify(data, null, 2)}`);

        if (error) {
            console.error("Error checking fetch status:", error);
            return false;
        }

        return data; // true if we got the lock, false otherwise
    }

    async finishedFetching() {
        const { data, error } = await this.supabase.rpc(
            'release_fetch_lock',
            { key_param: 'reserve_fetch_status' }
        );

        if (error) {
            console.error('Error releasing fetch lock:', error);
        }
    }

    async fetchTokenProfiles(limit = 50) {
        return await OracleService.fetchTokenProfiles(limit);
    }

    async fetchTokenDetails(tokenAddresses) {
        return await OracleService.fetchTokenDetails(tokenAddresses);
    }

    async filterTokens(tokens) {
        console.log('filter tokens: ', tokens);
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

                console.log(`Filtered token liquidity: ${liquidityUsd}, volume: ${volume24h}, ageInDays: ${ageInDays}`);

                return (
                    liquidityUsd >= 20000 &&
                    volume24h >= 70000 &&
                    ageInDays < 10  // Only fresh high-risk tokens
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