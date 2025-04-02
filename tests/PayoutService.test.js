const { pool } = require('../tests/utils/db-config');
const PayoutService = require('../services/PayoutService');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);
const {
    withTransaction,
    createTestMarket,
    createTestBet,
    cleanDatabases,
} = require('../tests/utils/db-helper');

const { v4: uuidv4 } = require('uuid');

describe('Payout Service Tests', () => {
    let payoutService;

    beforeAll(async () => {
        payoutService = new PayoutService(supabase);
    });

    beforeEach(async () => {
        await cleanDatabases(pool);
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('Input Handling', () => {
        it('Should throw error on null marketId', async () => {
            await expect(payoutService.handleMarketResolution(null, 'PUMP'))
                .rejects.toThrow('Error processing Market Resolution');
        });

        it('Should throw error on null result', async () => {
            await expect(payoutService.handleMarketResolution('market-123', null))
                .rejects.toThrow('Error processing Market Resolution');
        });

        it('Should handle non-existent market', async () => {
            const nonExistentId = 'non-existent-id';
            // Mock Supabase to return empty data for non-existent market
            jest.spyOn(supabase, 'from').mockImplementation((table) => {
                return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            in: jest.fn().mockResolvedValue({ data: [], error: null })
                        })
                    })
                };
            });

            await expect(payoutService.handleMarketResolution(nonExistentId, 'PUMP'))
                .rejects.toThrow(`Bets not found with ID: ${nonExistentId}`);
            
            // Restore original implementation
            jest.restoreAllMocks();
        });
    });

    describe('Split Array By Result Tests', () => {
        it('Should split PUMP bets correctly', async () => {
            const bet1 = { bet_type: 'PUMP' };
            const bet2 = { bet_type: 'PUMP' };
            const bet3 = { bet_type: 'RUG' };
            const bet4 = { bet_type: 'RUG' };

            const array = [bet1, bet2, bet3, bet4];

            const { winners, loosers } = payoutService.splitArrayByResult(array, 'PUMP');

            expect(winners.length).toBe(2);
            expect(loosers.length).toBe(2);
            expect(winners).toContain(bet1);
            expect(winners).toContain(bet2);
            expect(loosers).toContain(bet3);
            expect(loosers).toContain(bet4);
        });

        it('Should split RUG bets correctly', async () => {
            const bet1 = { bet_type: 'PUMP' };
            const bet2 = { bet_type: 'PUMP' };
            const bet3 = { bet_type: 'RUG' };
            const bet4 = { bet_type: 'RUG' };

            const array = [bet1, bet2, bet3, bet4];

            const { winners, loosers } = payoutService.splitArrayByResult(array, 'RUG');

            expect(winners.length).toBe(2);
            expect(loosers.length).toBe(2);
            expect(winners).toContain(bet3);
            expect(winners).toContain(bet4);
            expect(loosers).toContain(bet1);
            expect(loosers).toContain(bet2);
        });

        it('Should handle empty array', async () => {
            const array = [];
            const { winners, loosers } = payoutService.splitArrayByResult(array, 'PUMP');
            expect(winners.length).toBe(0);
            expect(loosers.length).toBe(0);
        });

        it('Should handle array with no matching bets', async () => {
            const bet1 = { bet_type: 'RUG' };
            const bet2 = { bet_type: 'RUG' };
            const array = [bet1, bet2];
            
            const { winners, loosers } = payoutService.splitArrayByResult(array, 'PUMP');
            
            expect(winners.length).toBe(0);
            expect(loosers.length).toBe(2);
        });
    });

    describe('Update Bet Statuses', () => {
        it('Should update multiple bet statuses to WON', async () => {
            let market;
            let bet1, bet2;

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x1234567890123456789012345678901234567890',
                    startTime: new Date(),
                    duration: 5
                });

                bet1 = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 2.0,
                    betType: 'PUMP',
                    status: 'MATCHED'
                });

                bet2 = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 2.0,
                    betType: 'PUMP',
                    status: 'MATCHED'
                });
            });

            const bets = [bet1, bet2];
            await payoutService.updateBetStatus(bets, 'WON');

            const { rows } = await pool.query(
                'SELECT * FROM bets WHERE id IN ($1, $2)', [bet1.id, bet2.id]
            );

            expect(rows.length).toBe(2);
            expect(rows[0].status).toBe('WON');
            expect(rows[1].status).toBe('WON');
        });

        it('Should update multiple bet statuses to LOST', async () => {
            let market;
            let bet1, bet2;

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x1234567890123456789012345678901234567890',
                    startTime: new Date(),
                    duration: 5
                });

                bet1 = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 2.0,
                    betType: 'RUG',
                    status: 'PARTIALLY_MATCHED'
                });

                bet2 = await createTestBet(client, {
                    marketId: market.id,
                    userId: uuidv4(),
                    amount: 2.0,
                    betType: 'RUG',
                    status: 'MATCHED'
                });
            });

            const bets = [bet1, bet2];
            await payoutService.updateBetStatus(bets, 'LOST');

            const { rows } = await pool.query(
                'SELECT * FROM bets WHERE id IN ($1, $2)', [bet1.id, bet2.id]
            );

            expect(rows.length).toBe(2);
            expect(rows[0].status).toBe('LOST');
            expect(rows[1].status).toBe('LOST');
        });

        it('Should handle empty bets array', async () => {
            // This should not throw an error
            await expect(payoutService.updateBetStatus([], 'WON')).resolves.not.toThrow();
        });

        it('Should log error on database failure', async () => {
            const mockBet = { id: 'bet-123' };
            const consoleSpy = jest.spyOn(console, 'log');
            
            // Mock Supabase to simulate database error
            jest.spyOn(supabase, 'from').mockImplementation(() => {
                return {
                    update: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({ 
                            error: new Error('Database connection failed')
                        })
                    })
                };
            });

            await payoutService.updateBetStatus([mockBet], 'WON');
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error updating bet status: bet-123')
            );
            
            consoleSpy.mockRestore();
            jest.restoreAllMocks();
        });
    });

    describe('Handle Market Resolution Integration', () => {
        it('Should process HOUSE result correctly', async () => {
            // For HOUSE result, no balance updates should happen
            const handleUserBalanceUpdatesSpy = jest.spyOn(payoutService, 'handleUserBalanceUpdates')
                .mockImplementation(() => Promise.resolve());
            
            let market;
            let allBets = [];
            
            // Set up test data
            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x1234567890123456789012345678901234567890',
                    startTime: new Date(Date.now() - 3600000),
                    duration: 10
                });
                
                // Create mixed bets
                for (let i = 0; i < 5; i++) {
                    const betType = i % 2 === 0 ? 'PUMP' : 'RUG';
                    const bet = await createTestBet(client, {
                        marketId: market.id,
                        userId: uuidv4(),
                        amount: 10.0,
                        betType: betType,
                        status: 'MATCHED'
                    });
                    allBets.push(bet);
                }
            });
            
            // Resolve market with HOUSE result
            await payoutService.handleMarketResolution(market.id, 'HOUSE');
            
            // Verify all bets are marked as LOST
            const { rows: updatedBets } = await pool.query(
                'SELECT id, status FROM bets WHERE market_id = $1', [market.id]
            );
            
            for (const bet of updatedBets) {
                expect(bet.status).toBe('LOST');
            }
        });
    });
    describe('Handle User Balance Updates', () => {
        it('Should update balances for winning bets', async () => {
            // Create mock UserService
            const mockUserService = {
                updateBalance: jest.fn().mockResolvedValue({ balance: 20.0 })
            };
            
            payoutService = new PayoutService(supabase, mockUserService);
            
            // Create sample winning bets
            const winners = [
                { 
                    id: 'bet-1', 
                    userId: 'user-123', 
                    matchedAmount: 10.0, 
                    oddsLocked: 1.5 
                },
                { 
                    id: 'bet-2', 
                    userId: 'user-456', 
                    matchedAmount: 5.0, 
                    oddsLocked: 2.0 
                }
            ];
            
            await payoutService.handleUserBalanceUpdates(winners);
            
            // Check that updateBalance was called with correct values
            expect(mockUserService.updateBalance).toHaveBeenCalledTimes(2);
            expect(mockUserService.updateBalance).toHaveBeenCalledWith('user-123', 15.0); // 10.0 * 1.5
            expect(mockUserService.updateBalance).toHaveBeenCalledWith('user-456', 10.0); // 5.0 * 2.0
        });
    
        it('Should log errors when updateBalance fails', async () => {
            // Create mock UserService that fails
            const mockUserService = {
                updateBalance: jest.fn().mockRejectedValue(new Error('Balance update failed'))
            };
            
            payoutService = new PayoutService(supabase, mockUserService);
            
            // Spy on console.log
            const consoleSpy = jest.spyOn(console, 'log');
            
            // Create sample winning bet
            const winners = [
                { 
                    id: 'bet-error', 
                    userId: 'user-error', 
                    matchedAmount: 10.0, 
                    oddsLocked: 1.5,
                    user_id: 'user-error' // Include both formats to test error handling
                }
            ];
            
            await payoutService.handleUserBalanceUpdates(winners);
            
            // Verify error was logged
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error updating balance for user: user-error')
            );
            
            consoleSpy.mockRestore();
        });
    
        it('Should handle empty winners array', async () => {
            // Create mock UserService
            const mockUserService = {
                updateBalance: jest.fn()
            };
            
            payoutService = new PayoutService(supabase, mockUserService);
            
            await payoutService.handleUserBalanceUpdates([]);
            
            // Verify updateBalance was not called
            expect(mockUserService.updateBalance).not.toHaveBeenCalled();
        });
    
        it('Should calculate winnings correctly with decimal values', async () => {
            // Create mock UserService
            const mockUserService = {
                updateBalance: jest.fn().mockResolvedValue({ balance: 25.75 })
            };
            
            payoutService = new PayoutService(supabase, mockUserService);
            
            // Create sample winning bet with decimal values
            const winners = [
                { 
                    id: 'bet-decimal', 
                    userId: 'user-decimal', 
                    matchedAmount: 7.25, 
                    oddsLocked: 1.75 
                }
            ];
            
            await payoutService.handleUserBalanceUpdates(winners);
            
            // Check precise calculation: 7.25 * 1.75 = 12.6875
            expect(mockUserService.updateBalance).toHaveBeenCalledWith(
                'user-decimal', 
                12.6875
            );
        });
    });
});