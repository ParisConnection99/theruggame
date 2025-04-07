class OracleService {
    static baseUrl = 'https://api.dexscreener.com';

    static async fetchTokenProfiles() {
        try {
            const headers = {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'User-Agent': 'PostmanRuntime/7.32.3',
                'Cache-Control': 'no-cache',
                'Postman-Token': Date.now().toString(),
                'Host': 'api.dexscreener.com'
            };
    
            // Fetch from both endpoints in parallel
            const [profilesResponse, boostsResponse] = await Promise.all([
                fetch(`${this.baseUrl}/token-profiles/latest/v1`, {
                    method: 'GET',
                    headers
                }),
                fetch(`${this.baseUrl}/token-boosts/top/v1`, {
                    method: 'GET',
                    headers
                })
            ]);
    
            // Check responses
            if (!profilesResponse.ok) {
                throw new Error(`HTTP error for profiles! status: ${profilesResponse.status}`);
            }
    
            if (!boostsResponse.ok) {
                throw new Error(`HTTP error for boosts! status: ${boostsResponse.status}`);
            }
    
            // Parse JSON from both responses
            const [profilesData, boostsData] = await Promise.all([
                profilesResponse.json(),
                boostsResponse.json()
            ]);
    
            // Validate data
            if (!profilesData || !boostsData) {
                throw new Error('No response data received from one or both endpoints');
            }
    
            if (!Array.isArray(profilesData) || !Array.isArray(boostsData)) {
                throw new Error(`Expected arrays but received incorrect types`);
            }
    
            // Process both sets of data
            const processTokens = (data) => {
                return data
                    .map(token => ({
                        tokenAddress: token.tokenAddress,
                        chainId: token.chainId,
                        header: token.header,
                        description: token.description,
                        links: token.links,
                        icon: token.icon
                    }))
                    .filter(token => token.chainId === 'solana');
            };
    
            const profileTokens = processTokens(profilesData);
            const boostTokens = processTokens(boostsData);
    
            // Combine both sets and remove duplicates based on tokenAddress
            const combinedTokens = [...profileTokens];
            
            // Add tokens from boosts that don't already exist in profiles
            for (const boostToken of boostTokens) {
                if (!combinedTokens.some(token => token.tokenAddress === boostToken.tokenAddress)) {
                    combinedTokens.push(boostToken);
                }
            }
    
            return combinedTokens;
    
        } catch (error) {
            console.error('Error in fetchTokenProfiles:', {
                message: error.message,
                response: error instanceof Response ? {
                    status: error.status,
                    statusText: error.statusText
                } : 'No response'
            });
            throw error;
        }
    }

    static async fetchTokenDetails(tokenAddresses) {
        try {
            const response = await fetch(`${this.baseUrl}/tokens/v1/solana/${tokenAddresses}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'User-Agent': 'Mozilla/5.0',
                    'Origin': 'https://dexscreener.com'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const tokensData = await response.json();

            if (!Array.isArray(tokensData)) {
                throw new Error('Expected array response for token details');
            }

            const tokens = tokensData.map(token => ({
                address: token.baseToken?.address,
                name: token.baseToken?.name,
                symbol: token.baseToken?.symbol,
                liquidity: token.liquidity?.usd || 0,
                marketCap: token.marketCap || 0,
                priceUsd: token.priceUsd || 0,
                priceNative: token.priceNative || "0",
                fdv: token.fdv || 0,
                volume24h: token.volume?.h24 || 0,
                volumes: token.volume || {},
                priceChanges: token.priceChange || {},
                createdAt: token.pairCreatedAt,
                chainId: token.chainId,
                dexId: token.dexId,
                pairAddress: token.pairAddress,
                quoteToken: token.quoteToken ? {
                    address: token.quoteToken.address,
                    name: token.quoteToken.name,
                    symbol: token.quoteToken.symbol
                } : null,
                transactions: Object.entries(token.txns || {}).reduce((acc, [timeframe, data]) => ({
                    ...acc,
                    [timeframe]: {
                        buys: data?.buys || 0,
                        sells: data?.sells || 0
                    }
                }), {}),
                labels: token.labels || [],
                boosts: token.boosts || { active: 0 },
                imageUrl: token.info?.imageUrl || null,
                socials: token.info?.socials || [],
                websites: token.info?.websites || [],
                url: token.url || null
            }));

            return tokens;
        } catch (error) {
            console.error('Error fetching token details:', {
                message: error.message,
                tokenAddresses,
                response: error instanceof Response ? {
                    status: error.status,
                    statusText: error.statusText
                } : error
            });
            return [];
        }
    }
}

module.exports = OracleService;