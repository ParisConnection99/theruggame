const { pool } = require('../tests/utils/db-config');
const PostgresDatabase = require('../services/PostgresDatabase');
const StatusUpdateService = require('../services/StatusUpdateService');
const {
    withTransaction,
    cleanDatabase,
    createTestMarket,
    createTestBet
} = require('../tests/utils/db-helper');

const { v4: uuidv4 } = require('uuid');


describe('Status Update Services Test', () => {
    let db;
    let statusService;
    let config;
    let eventEmitter;
    let testMarket;
    let testUserId;

    beforeAll(async () => {
        testUserId = uuidv4();
        db = new PostgresDatabase(pool);

        config = {
            matchingPrecision: 0.000001
        };

        eventEmitter = {
            emit: jest.fn()
        };

        statusService = new StatusUpdateService(db, config, eventEmitter);
    });

    beforeEach(async () => {
        await withTransaction(async (client) => {
            // Clean the database
            await cleanDatabase(client);

            // Create a test market
            testMarket = await createTestMarket(client, {
                tokenAddress: '0x123',
                startTime: new Date(),
                duration: 30
            });
        });
    });

    describe('updateBetStatus', () => {
        it('should update bet status from PENDING to PARTIALLY_MATCHED', async () => {
            let bet;
            await withTransaction(async (client) => {
                bet = await createTestBet(client, {
                    marketId: testMarket.id,
                    userId: uuidv4(),
                    amount: 10.0,
                    status: 'PENDING',
                    betType: 'PUMP'
                });
            });

            const newStatus = await statusService.updateBetStatus(bet.id, 50, 100);

            expect(newStatus).toBe('PARTIALLY_MATCHED');

            // Verify database state
            const updatedBet = await db.getBet(bet.id);
            expect(updatedBet.status).toBe('PARTIALLY_MATCHED');

            // Verify event emission
            expect(eventEmitter.emit).toHaveBeenCalledWith('betStatusChanged', expect.objectContaining({
                betId: bet.id,
                oldStatus: 'PENDING',
                newStatus: 'PARTIALLY_MATCHED'
            }));
        });

        it('should update bet status from PARTIALLY_MATCHED to MATCHED', async () => {
            let bet;
            await withTransaction(async (client) => {
                bet = await createTestBet(client, {
                    marketId: testMarket.id,
                    userId: uuidv4(),
                    amount: 10.0,
                    status: 'PARTIALLY_MATCHED',
                    betType: 'PUMP'
                });
            });

            const newStatus = await statusService.updateBetStatus(bet.id, 100, 100);

            expect(newStatus).toBe('MATCHED');

            // Verify database state
            const updatedBet = await db.getBet(bet.id);
            expect(updatedBet.status).toBe('MATCHED');

            // Verify event emission
            expect(eventEmitter.emit).toHaveBeenCalledWith('betStatusChanged', expect.objectContaining({
                betId: bet.id,
                oldStatus: 'PARTIALLY_MATCHED',
                newStatus: 'MATCHED'
            }));
        });

        it('should throw error for invalid status transition', async () => {
            let bet;
            await withTransaction(async (client) => {
                bet = await createTestBet(client, {
                    marketId: testMarket.id,
                    userId: uuidv4(),
                    amount: 10.0,
                    status: 'MATCHED',
                    betType: 'PUMP'
                });
            });

            await expect(statusService.updateBetStatus(bet.id, 50, 100))
                .rejects
                .toThrow('Invalid status transition');
        });

        it('should throw error for not being the correct type', async () => {
            const nonExistentBetId = uuidv4();

            await expect(statusService.updateBetStatus(nonExistentBetId, 50, 100))
                .rejects
                .toThrow(/Bet ID must be a positive integer/);
        });

        it('should throw error for bet not existing', async () => {
            await expect(statusService.updateBetStatus(1200, 50, 100))
                .rejects
                .toThrow(/Bet with ID 1200 not found/)
        });
    });

    describe('_calculateStatus internal method', () => {
        it('should return MATCHED when amounts are exactly equal', async () => {
            const status = statusService._calculateStatus(100, 100);
            expect(status).toBe('MATCHED');
        });
    
        it('should return MATCHED when amounts are within precision', async () => {
            const status = statusService._calculateStatus(100.000001, 100);
            expect(status).toBe('MATCHED');
        });
    
        it('should return PARTIALLY_MATCHED for partial matches', async () => {
            const status = statusService._calculateStatus(50, 100);
            expect(status).toBe('PARTIALLY_MATCHED');
        });
    
        it('should return PENDING for zero matches', async () => {
            const status = statusService._calculateStatus(0, 100);
            expect(status).toBe('PENDING');
        });
    });
});