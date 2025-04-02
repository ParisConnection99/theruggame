const MarketResolveService = require('../services/MarketResolveService');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);
const {
    withTransaction,
    createTestMarket,
    createTestBet
} = require('./utils/db-helper');

const { v4: uuidv4 } = require('uuid');


describe('Market Oracle Service Tests', () => {
    let marketResolveService;

    beforeAll(async () => {
        marketResolveService = new MarketResolveService(supabase);
    });

    describe('Evaluate Market Outcome Tests', () => {
        const initialData = {
            liquidity: 1000000,
            price: 1.0,
            marketCap: 1000000,
            txns: { buys: 100, sells: 100 },
            timestamp: Date.now(),
            duration: 900000 // 15 minutes
        };
    
        const finalData = {
            liquidity: 1000000,
            price: 1.0,
            marketCap: 1000000,
            txns: { buys: 200, sells: 200 },
            timestamp: Date.now() + 900000
        };
    
        it('should return RUG on 90% liquidity drop', async () => {
            const rugData = { ...finalData, liquidity: 90000 };
            expect(await marketResolveService.evaluateMarketOutcome(initialData, rugData)).toBe('RUG');
        });
    
        it('should return RUG on 80% price drop', async () => {
            const rugData = { ...finalData, price: 0.19 };
            expect(await marketResolveService.evaluateMarketOutcome(initialData, rugData)).toBe('RUG');
        });
    
        it('should return PUMP on 50% price increase', async () => {
            const pumpData = { ...finalData, price: 1.51 };
            expect(await marketResolveService.evaluateMarketOutcome(initialData, pumpData)).toBe('PUMP');
        });
    
        it('should return PUMP on 5x buy volume', async () => {
            const pumpData = { ...finalData, txns: { buys: 600, sells: 200 }};
            expect(await marketResolveService.evaluateMarketOutcome(initialData, pumpData)).toBe('PUMP');
        });
    
        it('should return HOUSE when no conditions met', async () => {
            expect(await marketResolveService.evaluateMarketOutcome(initialData, finalData)).toBe('HOUSE');
        });
    
        it('should throw on missing data', async () => {
            const badData = { price: 1.0 };
            await expect(marketResolveService.evaluateMarketOutcome(badData, finalData))
                .rejects.toThrow('Missing required field');
        });
    
        it('should throw on invalid data type', async () => {
            await expect(marketResolveService.evaluateMarketOutcome(null, finalData))
                .rejects.toThrow('Invalid market data');
        });
    });

    describe('fetchBets', () => {
        it('should throw error for missing marketId', async () => {
            await expect(marketResolveService.fetchBets())
                .rejects.toThrow('Error processing MarketId');
        });

        it('should fetch matched and partially matched bets', async () => {
            let market;
            let bet1;
            let bet2;

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x1234567890123456789012345678901234567890',
                    startTime: new Date(),
                    duration: 15
                });

                bet1 = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 1.0,
                    betType: 'PUMP',
                    status: 'PARTIALLY_MATCHED'
                });

                bet2 = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 1.0,
                    betType: 'RUG',
                    status: 'MATCHED'
                });
            });

            const bets = await marketResolveService.fetchBets(market.id);
            expect(bets).toHaveLength(2);
            expect(bets[0]).toHaveProperty('status');
            expect(bets[0]).toHaveProperty('amount');
        });

        it('should handle database errors', async () => {
            // Mock Supabase error
            jest.spyOn(supabase, 'from').mockImplementation(() => ({
                select: () => ({
                    eq: () => ({
                        in: () => ({ data: null, error: new Error('DB Error') })
                    })
                })
            }));

            await expect(marketResolveService.fetchBets('market-id'))
                .rejects.toThrow('Database error');
        });
    });
});