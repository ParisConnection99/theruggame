const { pool } = require('../tests/utils/db-config');
const BetMatchingService = require('../services/MatchingFunnel');
const OddsService = require('../services/OddsService');
const BettingService = require('../services/BettingService');
const PostgresDatabase = require('../services/PostgresDatabase');
const BetUnitService = require('../services/BetUnitService');
const MarketService = require('../services/MarketService');
const StatusUpdateService = require('../services/StatusUpdateService');
const RefundService = require('../services/RefundService');
const UserService = require('../services/UserService');
const MarketExpiryService = require('../services/MarketExpiryService');
const PayoutService = require('../services/PayoutService');
const MarketResolveService = require('../services/MarketResolveService');
const MarketCreationService = require('../services/MarketCreationService');
const TokenService = require('../services/TokenService');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const {
    withTransaction,
    cleanDatabases,
    createTestMarket,
} = require('../tests/utils/db-helper');

const { v4: uuidv4 } = require('uuid');

describe('Betting Service Tests', () => {
    let matchingService;
    let oddsService;
    let bettingService;
    let db;
    let betUnitService;
    let statusUpdateService;
    let eventEmitter;
    let marketService;
    let userService;
    let refundService;
    let expiryService;
    let payoutService;
    let marketResolveService;
    let marketCreationService;
    let tokenService;

    beforeAll(async () => {
        db = new PostgresDatabase(pool);

        userService = new UserService(supabase);

        refundService = new RefundService(supabase, {
            maxAttempts: 3,
            minRefundAmount: 0.00000001
        }, userService);

        const config = {
            precisionThreshold: 0.000001,
            minimumUnitSize: 0.05,
            maxRetries: 3,
            retryDelayMs: 100,
            maxUnitsPerBet: 100,
            maxBetAmount: 101
        };

        betUnitService = new BetUnitService(db, config);
        
        marketResolveService = new MarketResolveService(supabase);

        payoutService = new PayoutService(supabase, userService);

        tokenService = new TokenService(supabase);

        marketCreationService = new MarketCreationService(tokenService, marketService, {}, supabase);

        expiryService = new MarketExpiryService(supabase,
            refundService,
            db,
            marketResolveService,
            payoutService, marketCreationService);

        marketService = new MarketService(supabase, pool, expiryService);


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

        bettingService = new BettingService({
            platformFee: 0.01,
        }, matchingService, oddsService, supabase, betUnitService, db, marketService);
    });

    afterAll(async () => {
        await cleanDatabases(pool);
    });

    describe('Bet Placement', () => {
        it('Should successfully place a valid bet', async () => {
            let market;

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });
            });

            const bet = await bettingService.placeBet(market.id, {
                userId: uuidv4(),
                amount: 1.0,
                betType: 'PUMP'
            })

            expect(bet.market_id == market.id).toBe(true);
            expect(bet.bet_type == 'PUMP').toBe(true);
            expect(bet.net_amount).toBeCloseTo(0.99, 6);
            expect(bet.fee == 0.01);
            expect(bet.status == 'PENDING');
        });

        it('Should reject bet below minimum amount (0.05 SOL)', async () => {
            let market;

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });
            });

            await expect(bettingService.placeBet(market.id, {
                userId: uuidv4(),
                amount: 0.04,
                betType: 'PUMP'
            })).rejects.toThrow();
        });

        it('Should reject invalid bet type', async () => {
            let market;

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });
            });
            await expect(bettingService.placeBet(market.id, {
                userId: uuidv4(),
                amount: 1.0,
                betType: ''
            })).rejects.toThrow();

        });
    });

    describe('Bet Status', () => {
        it('Should initialize bet with PENDING status', async () => {
            let market;

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });
            });

            const bet = await bettingService.placeBet(market.id, {
                userId: uuidv4(),
                amount: 1.0,
                betType: 'PUMP'
            });

            expect(bet.status == 'PENDING');
        });

        it('Should not allow bets on non-existent markets', async () => {
            await expect(bettingService.placeBet('wererwrw', {
                userId: uuidv4(),
                amount: 1.0,
                betType: 'PUMP'
            })).rejects.toThrow();
        });

        it('Should allow multiple bets from the same user', async () => {
            let market;

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });
            });

            const bet1 = await bettingService.placeBet(market.id, {
                userId: '550e8400-e29b-41d4-a716-446655440000',
                amount: 1.0,
                betType: 'PUMP'
            });

            const bet2 = await bettingService.placeBet(market.id, {
                userId: '550e8400-e29b-41d4-a716-446655440000',
                amount: 2.0,
                betType: 'PUMP'
            });

            expect(bet1.id != bet2.id).toBe(true);
            expect(parseFloat(bet1.amount)).toBeCloseTo(1, 6);
            expect(parseFloat(bet2.amount)).toBeCloseTo(2, 6);
        });
    });

    describe('Creating bet units and matching', () => {
        it('Should create units after creating bet', async () => {
            let market;

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });
            });

            const bet = await bettingService.placeBet(market.id, {
                userId: uuidv4(),
                amount: 3,
                betType: 'PUMP'
            });

            const results = await pool.query(
                'SELECT * FROM bet_units WHERE bet_id = $1', [bet.id]
            );

            const betResults = results.rows;

            expect(betResults.length == 3);
            expect(betResults[0].status == 'PENDING');
        });

        it('Should create bet units and match units', async () => {
            let market;

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });
            });

            const bet1 = await bettingService.placeBet(market.id, {
                userId: uuidv4(),
                amount: 1.0,
                betType: 'PUMP'
            });

            const bet2 = await bettingService.placeBet(market.id, {
                userId: uuidv4(),
                amount: 1.0,
                betType: 'RUG'
            });



            // Check 2 units are created 1 unit per bet
            const unitResults = await pool.query(
                'SELECT * FROM bet_units WHERE bet_id IN ($1, $2)', [bet1.id, bet2.id]
            );

            const unitRows = unitResults.rows;

            expect(unitRows.length == 2);
            expect(unitRows[0].status == 'MATCHED');
            expect(unitRows[1].status == 'MATCHED');

            // Check the bets statuses that they are matched
            const results = await pool.query(
                'SELECT * FROM bets WHERE market_id = $1', [market.id]
            );

            const betsResults = results.rows;

            const fetchedBet1 = betsResults.find(b => b.id == bet1.id)
            expect(fetchedBet1.status == 'MATCHED');

            const fetchedBet2 = betsResults.find(b => b.id == bet2.id);
            expect(fetchedBet2.status == 'MATCHED');

        });
    });
});