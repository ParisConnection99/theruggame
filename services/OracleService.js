class OracleService {
    static baseUrl = 'https://api.dexscreener.com';

    static async fetchTokenProfiles(limit = 50) {
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

            const response = await fetch(`${this.baseUrl}/token-boosts/latest/v1`, {
                method: 'GET',
                headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data) {
                throw new Error('No response data received');
            }

            if (!Array.isArray(data)) {
                throw new Error(`Expected array but received: ${typeof data}. Data: ${JSON.stringify(data)}`);
            }

            const solanaTokens = data
                .slice(0, limit)
                .map(token => ({
                    tokenAddress: token.tokenAddress,
                    chainId: token.chainId,
                    header: token.header,
                    description: token.description,
                    links: token.links,
                    icon: token.icon
                }))
                .filter(token => token.chainId === 'solana');

            return solanaTokens;

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