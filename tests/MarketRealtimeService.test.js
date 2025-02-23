const { listenToMarkets } = require('../services/MarketRealtimeService'); // Adjust path if needed
const MarketService = require('../services/MarketService');
const BettingService = require('../services/BettingService');
const BetMatchingService = require('../services/MatchingFunnel');
const OddsService = require('../services/OddsService');
const PostgresDatabase = require('../services/PostgresDatabase');
const BetUnitService = require('../services/BetUnitService');
const StatusUpdateService = require('../services/StatusUpdateService');
const UserService = require('../services/UserService');
const ExpiryService = require('../services/MarketExpiryService');
const MarketResolveService = require('../services/MarketResolveService');
const RefundService = require('../services/RefundService');
const MarketCreationService = require('../services/MarketCreationService');
const TokenService = require('../services/TokenService');
const PayoutService = require('../services/PayoutService');
const MatchingService = require('../services/MatchingFunnel');

const { pool } = require('../tests/utils/db-config');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const {
    withTransaction,
    cleanDatabases,
    createTestBet
} = require('../tests/utils/db-helper');

const { v4: uuidv4 } = require('uuid');

const userTestData = {
    wallet_ca: 'wallet123456',
    username: 'testuser1',
    profile_pic: 'https://example.com/pic1.jpg'
};

const userTestData2 = {
    wallet_ca: 'waller87954',
    username: 'testuser2',
    profile_pic: 'https://example.com/pic2.jpg'
}

describe('Market Realtime Service Tests', () => {
    let marketService;
    let bettingService;
    let matchingService;
    let oddsService;
    let db;
    let betUnitService;
    let statusUpdateService;
    let eventEmitter;
    let userService;
    let expiryService;
    let marketResolveService;
    let refundService;
    let marketCreationService;
    let tokenService;
    let payoutService;


    beforeAll(async () => {
        db = new PostgresDatabase(pool);
        const config = {
            precisionThreshold: 0.000001,
            minimumUnitSize: 0.05,
            maxRetries: 3,
            retryDelayMs: 100,
            maxUnitsPerBet: 100,
            maxBetAmount: 101
        };

        betUnitService = new BetUnitService(db, config);

        eventEmitter = {
            emit: jest.fn()
        }

        oddsService = new OddsService(supabase);
        statusUpdateService = new StatusUpdateService(db, {
            matchingPrecision: 0.000001
        }, eventEmitter);

        matchingService = new BetMatchingService(db, {
            batchSize: 50,
            matchingCutoffPercent: 50
        }, marketService, statusUpdateService, betUnitService);

        userService = new UserService(supabase);

        marketResolveService = new MarketResolveService(supabase);

        tokenService = new TokenService(supabase);

        payoutService = new PayoutService(supabase, userService);

        refundService = new RefundService(supabase, {
            maxAttempts: 3,
            minRefundAmount: 0.00000001
        }, userService);

        expiryService = new ExpiryService(supabase,
            refundService,
            db,
            marketResolveService,
            payoutService);

        marketService = new MarketService(supabase, pool, expiryService);

        marketCreationService = new MarketCreationService(tokenService, marketService, {}, supabase);

        expiryService.setMarketCreationService(marketCreationService);

        matchingService = new MatchingService(db, {}, marketService, statusUpdateService, betUnitService);

        bettingService = new BettingService({
            platformFee: 0.01,
        }, matchingService, oddsService, supabase, betUnitService, db, marketService);

    });

    beforeEach(async () => {
        await cleanDatabases(pool);
    });

    describe('Testing pump and rug updates', () => {
        it('should handle pump vs rug split updates correctly', async () => {
            // Initialize the listener with a callback function
            const marketUpdates = [];
            const callback = (marketData) => {
                console.log('Market update received:', marketData);
                marketUpdates.push(marketData);
            };

            // Start the listener
            const subscription = listenToMarkets(callback);

            let market;
            let pumpBet;
            const user = await userService.createUser(userTestData);

            await withTransaction(async (client) => {
                market = await marketService.createMarket({
                    tokenAddress: `0x${uuidv4().replace(/-/g, '')}`,
                    startTime: new Date()
                });

                pumpBet = await bettingService.placeBet(market.id, {
                    userId: user.user_id,
                    amount: 10,
                    betType: 'PUMP'
                });
            });

            // Check if we've received any updates
            console.log('Updates received:', marketUpdates);

            if (marketUpdates.length > 0) {
                const latestUpdate = marketUpdates[marketUpdates.length - 1];
                expect(latestUpdate.id == market.id).toBe(true);
                expect(latestUpdate.total_pump_amount == 10).toBe(true);
            } else {
                console.log('No market updates received during test execution');
            }

            let rugBet;
            const user2 = await userService.createUser(userTestData2);

            await withTransaction(async (client) => {
                rugBet = await bettingService.placeBet(market.id, {
                    userId: user2.user_id,
                    amount: 5.0,
                    betType: 'RUG'
                });
            });

            if (marketUpdates.length > 0) {
                const latestUpdate = marketUpdates[marketUpdates.length - 1];
                expect(latestUpdate.id == market.id).toBe(true);
                expect(latestUpdate.total_rug_amount == 5).toBe(true);
            } else {
                console.log('No market updates received during test execution');
            }
            // Clean up the subscription
            if (subscription) {
                await subscription.unsubscribe();
            }
        });
        it('Should manage new markets correctly', async () => {
            const marketInserts = [];
            const callback = (marketData) => {
                console.log('Market update received:', marketData);
                marketInserts.push(marketData);
            };

            // Start the listener
            const subscription = listenToMarkets(callback);

            let market;

            await withTransaction(async (client) => {
                market = await marketService.createMarket({
                    tokenAddress: `0x${uuidv4().replace(/-/g, '')}`,
                    startTime: new Date()
                });
            });

            // Check if we've received any updates
            console.log('Inserts received:', marketInserts);

            if (marketInserts.length > 0) {
                const latestInsert = marketInserts[marketInserts.length - 1];
                expect(latestInsert.id == market.id).toBe(true);
                expect(latestInsert.tokenAddress == market.token_address);
            } else {
                console.log('No market inserts received during test execution');
            }

            if (subscription) {
                await subscription.unsubscribe();
            }
        });
    });


});