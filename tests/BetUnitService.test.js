const { pool } = require('./utils/db-config');
const { withTransaction, cleanDatabase, createTestMarket, createTestBet } = require('./utils/db-helper');
const PostgresDatabase = require('../services/PostgresDatabase');
const BetUnitService = require('../services/BetUnitService');
const { v4: uuidv4 } = require('uuid');

describe('Enhanced BetUnitService Integration Tests', () => {
    let db;
    let betUnitService;
    let testMarket;
    let testBet;

    // Increase timeout for all tests
    jest.setTimeout(60000);

    beforeAll(async () => {
        db = new PostgresDatabase();

        const config = {
            precisionThreshold: 0.000001,
            minimumUnitSize: 0.05,
            maxRetries: 3,
            retryDelayMs: 100,
            maxUnitsPerBet: 100,
            maxBetAmount: 101,
            platformFee: 0.01
        };

        betUnitService = new BetUnitService(db, config);
    });

    beforeEach(async () => {
        await withTransaction(async (client) => {
            await cleanDatabase(client);

            testMarket = await createTestMarket(client, {
                tokenAddress: '0x1234567890123456789012345678901234567890',
                startTime: new Date(),
                duration: 30
            });

            testBet = await createTestBet(client, {
                marketId: testMarket.id,
                userId: uuidv4(),
                amount: 1.0,
                betType: 'PUMP'
            });
        });
    });

    describe('Unit Creation', () => {
        it('should successfully create units for a 1 SOL bet', async () => {
            const result = await betUnitService.createUnits(testBet);

            expect(result.units).toBeDefined();
            expect(result.units.length).toBe(1);
            expect(result.units[0].amount).toBe(0.99); // 1 SOL minus 1% fee
            expect(result.units[0].status).toBe('PENDING');
        });

        it('should handle minimum bet size correctly', async () => {
            let minBet; 
            await withTransaction(async (client) => {
                const market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });

                minBet = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 0.051, // Slightly above minimum fee
                   status: 'PENDING',
                    betType: 'PUMP'
                });
            });

            const result = await betUnitService.createUnits(minBet);
            expect(result.units.length).toBe(1);
            expect(result.units[0].amount).toBeCloseTo(0.05049, 5); // After 1$ fee
        });

        it('should successfully create units for a 100 SOL bet', async () => {
            let bet; 
            await withTransaction(async (client) => {
                const market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });

             bet = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 100.0, // Slightly above minimum fee
                    betType: 'PUMP',
                    status: 'PENDING'
                });
            });

            const result = await betUnitService.createUnits(bet);
            expect(result.units.length).toBe(99);
        });
    });

    describe('Error Handling', () => {
        it('should handle non-existent bet', async () => {
            let bet;

            await withTransaction(async (client) => {
                const market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });

                bet = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 2.0, // Slightly above minimum fee
                    betType: 'PUMP',
                    status: 'PENDING'
                });
            });

            await expect(betUnitService.createUnits(null))
                .rejects
                .toThrow(/Bet object is required/);
        });

        it('should handle invalid betID gracefully', async () => {
            let bet;
            await withTransaction(async (client) => {
                const market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });

                bet = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 2.0, // Slightly above minimum fee
                    betType: 'PUMP',
                    status: 'PENDING'
                });
            });

            bet = {
                ...bet,
                id: null,
            };

            await expect(betUnitService.createUnits(bet))
                .rejects
                .toThrow(/Invalid Bet id, bet id is null/)
        });

        it('should handle invalid bet amount gracefully', async () => {
            let bet;
            await withTransaction(async (client) => {
                const market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });

                bet = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 2.0, // Slightly above minimum fee
                    betType: 'PUMP',
                    status: 'PENDING'
                });
            });

            bet = {
                ...bet,
                amount: "efwefrwer3456354",
            };

            await expect(betUnitService.createUnits(bet))
                .rejects
                .toThrow(/Invalid bet: Missing or invalid amount/)
        });

        it('it should handle invalid bet type', async () => {
            let invalidTypeBet;
            await withTransaction(async (client) => {
                const market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });

                invalidTypeBet = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 1.0,
                    betType: 'PUMP', // Assuming PUMP/DUMP are only valid types
                    status: 'PENDING'
                });
            });

            invalidTypeBet = {
                ...invalidTypeBet,
                bet_type: null
            };

            await expect(betUnitService.createUnits(invalidTypeBet))
            .rejects
            .toThrow(/Invalid bet type this cant be null/);
        });
    });

    describe('Basic Unit Distribution', () => {
        const calculateNetAmount = (amount) => {
            return Number((amount * 0.99).toFixed(6));
        }; 

        it('should create single unit for 0.5 SOL bet', async () => {
            let bet;
            await withTransaction(async (client) => {
                const market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });

                bet = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 0.5, // Slightly above minimum fee
                    betType: 'PUMP',
                    status: 'PENDING'
                });
            });

            const result = await betUnitService.createUnits(bet);

            expect(result.units.length).toBe(1);
            expect(result.units[0].amount).toBeCloseTo(calculateNetAmount(0.5), 5); // Should be 0.495
        });

        it('should split 2.5 SOL bet into three units', async () => {
            let bet;
            await withTransaction(async (client) => {
                const market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });

                bet = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 2.5, // Slightly above minimum fee
                    betType: 'PUMP',
                    status: 'PENDING'
                });
            });

            const result = await betUnitService.createUnits(bet);

            // Net amount: 2.5 * 0.99 = 2.475 SOL
            // Expected distribution: [1, 1, 0.495]
            expect(result.units.length).toBe(3);
            expect(result.units[0].amount).toBeCloseTo(1, 5);
            expect(result.units[1].amount).toBeCloseTo(1, 5);
            expect(result.units[2].amount).toBeCloseTo(0.475, 5);
        });

        it('should split 5.5 SOL bet into six units', async () => {
            let bet;
            await withTransaction(async (client) => {
                const market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });

                bet = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 5.5, // Slightly above minimum fee
                    betType: 'PUMP',
                    status: 'PENDING'
                });
            });
            const result = await betUnitService.createUnits(bet);

            // Net amount: 5.5 * 0.99 = 5.445 SOL
            // Expected distribution: [1, 1, 1, 1, 1, 0.445]
            expect(result.units.length).toBe(6);
            result.units.slice(0, 5).forEach(unit => {
                expect(unit.amount).toBeCloseTo(1, 5);
            });
            expect(result.units[5].amount).toBeCloseTo(0.445, 5);
        });
    });

    describe('Edge Cases', () => {
        it('should handle rounding correctly', async () => {
            let oddAmountBet;
            await withTransaction(async (client) => {
                const market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });

                oddAmountBet = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 1.123456789, // Slightly above minimum fee
                    betType: 'PUMP',
                    status: 'PENDING'
                });
            });

            const result = await betUnitService.createUnits(oddAmountBet);

            result.units.forEach(unit => {
                const decimalPlaces = unit.amount.toString().split('.')[1]?.length || 0;
                expect(decimalPlaces).toBeLessThanOrEqual(6);
            });
        });

        it('should handle precise decimal amounts', async () => {
            let bet;
            await withTransaction(async (client) => {
                const market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });

                bet = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 3.333333, // Slightly above minimum fee
                    betType: 'PUMP',
                    status: 'PENDING'

                });
            });


            const result = await betUnitService.createUnits(bet);

            // Net amount: 3.333333 * 0.99 = 3.299999 SOL
            // Expected: [1, 1, 1, 0.3]
            expect(result.units.length).toBe(4);
            expect(result.units[0].amount).toBeCloseTo(1, 5);
            expect(result.units[1].amount).toBeCloseTo(1, 5);
            expect(result.units[2].amount).toBeCloseTo(1, 5);
            expect(result.units[3].amount).toBeCloseTo(0.3, 5);
        });

        it('should reject bet that would exceed maximum units', async () => {
            let bet;
            await withTransaction(async (client) => {
                const market = await createTestMarket(client, {
                    tokenAddress: '0x123',
                    startTime: new Date(),
                    duration: 30
                });

                bet = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 102.01, // Slightly above minimum fee
                    betType: 'PUMP',
                    status: 'PENDING'
                });
            });

            // Would require 101 units of 1 SOL each
            await expect(betUnitService.createUnits(bet))
                .rejects
                .toThrow(/Bet exceed maximum bet size/);
        });
    });
});

describe('BetUnitService Transaction Tests', () => {
    let db;
    let betUnitService;
    let bet;

    beforeEach(async () => {
        db = new PostgresDatabase();
        betUnitService = new BetUnitService(db, {
            precisionThreshold: 0.000001,
            minimumUnitSize: 0.05,
            maxRetries: 3,
            retryDelayMs: 1000,
            maxUnitsPerBet: 100,
            maxBetSize: 101
        });

        // Create the test bet in setup
        await withTransaction(async (client) => {
            const market = await createTestMarket(client, {
                tokenAddress: '0x123',
                startTime: new Date(),
                duration: 30
            });

            bet = await createTestBet(client, {
                marketId: market.id,
                userId: uuidv4(),
                amount: 3.03,
                betType: 'PUMP',
                status: 'PENDING'
            });
        });
    });

    describe('Transaction Atomicity', () => {
        it('should rollback all units if any unit creation fails', async () => {
            try {
                let unitCounter = 0;
                
                await db.runInTransaction(async (client) => {
                    while (unitCounter < 3) {
                        const amount = unitCounter === 1 ? 0.01 : 1.0;
                        unitCounter++;
                        
                        await betUnitService._createUnit(client, bet, amount);
                    }
                });
                
                fail('Expected validation error to be thrown');
            } catch (error) {
                expect(error.message).toContain('below minimum allowed amount');
                
                // Verify no units were persisted
                const units = await db.getBetUnits(bet.id);
                expect(units.length).toBe(0);
            }
        });
    });
});