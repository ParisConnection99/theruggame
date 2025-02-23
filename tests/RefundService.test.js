const { pool } = require('../tests/utils/db-config');
const RefundService = require('../services/RefundService');
const UserService = require('../services/UserService');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const {
    withTransaction,
    cleanDatabases,
    createTestMarket,
    createTestBet
} = require('../tests/utils/db-helper');

const { v4: uuidv4 } = require('uuid');

const testUser = {
    wallet_ca: 'wallet123456',
    username: 'testuser1',
    profile_pic: 'https://example.com/pic1.jpg'
}

const testUser2 = {
    wallet_ca: 'wallet4567',
    username: 'testuser2',
    profile_pic: 'https://example.com/pic2.jpg'
}

const testUser3 = {
    wallet_ca: 'wallet001',
    username: 'testuser3',
    profile_pic: 'https://example.com/pic3.jpg'
}


describe('Basic Refund Operations', () => {
    let refundService;
    let userService;

    beforeAll(async () => {
        userService = new UserService(supabase);

        refundService = new RefundService(supabase, {
            maxAttempts: 3,
            minRefundAmount: 0.00000001
        }, userService);
    });

    beforeEach(async () => {
        await cleanDatabases(pool);
    });

    describe('Creating refunds', () => {
        it('Should successfully create a refund as PROCESSED', async () => {
            let market;
            let bet1;
            const user = await userService.createUser(testUser);

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x1234567890123456789012345678901234567890',
                    startTime: new Date(),
                    duration: 15
                });

                bet1 = await createTestBet(client, {
                    marketId: market.id,
                    userId: user.user_id,
                    amount: 1.0,
                    status: 'EXPIRED',
                    betType: 'PUMP'
                });
            });

            const refund = await refundService.addRefund(
                bet1.id,
                bet1.user_id,
                market.id,
                bet1.amount
            );

            expect(refund).toBeDefined();
            expect(refund.bet_id).toBe(Number(bet1.id));
            expect(refund.status).toBe('PROCESSED');
            expect(refund.bet_id == bet1.id).toBe(true);
            expect(refund.created_at).toBeDefined();
            expect(refund.processed_at).toBeDefined();
            expect(refund.transaction_hash).toBeDefined();
            expect(refund.transaction_hash).toMatch(/^tx_\d+$/);
            expect(refund.attempt_count).toBe(0);
        });

        it('Should handle minimum refund amount correctly', async () => {
            let market, bet1;
            const user = await userService.createUser(testUser);

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x1234567890123456789012345678901234567890',
                    startTime: new Date(),
                    duration: 15
                });

                bet1 = await createTestBet(client, {
                    marketId: market.id,
                    userId: user.user_id,
                    amount: 1.0,
                    status: 'EXPIRED',
                    betType: 'PUMP'
                });
            });

            // Test exact minimum amount
            const minRefund = await refundService.addRefund(
                bet1.id,
                bet1.user_id,
                market.id,
                0.00000001
            );
            expect(minRefund).toBeDefined();
            expect(Number(minRefund.amount)).toBe(0.00000001);

            // Test below minimum amount
            await expect(async () => {
                await refundService.addRefund(
                    bet1.id,
                    bet1.user_id,
                    market.id,
                    0.000000001
                );
            }).rejects.toThrow(`Error processing refunds: Invalid amount`);
        });

        it('Should handle multiple small refunds without exceeding bet amount', async () => {
            let market, bet1;
            const user = await userService.createUser(testUser);

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x1234567890123456789012345678901234567890',
                    startTime: new Date(),
                    duration: 15
                });

                bet1 = await createTestBet(client, {
                    marketId: market.id,
                    userId: user.user_id,
                    amount: 1.0,
                    status: 'EXPIRED',
                    betType: 'PUMP'
                });
            });

            // Create multiple small refunds
            const refunds = [];
            const smallAmount = 0.3; // 0.3 x 4 attempts = 1.2 which exceeds 1.0 bet amount

            // First three refunds should succeed (0.3 x 3 = 0.9)
            for (let i = 0; i < 3; i++) {
                const refund = await refundService.addRefund(
                    bet1.id,
                    bet1.user_id,
                    market.id,
                    smallAmount
                );
                refunds.push(refund);
            }

            // Fourth refund should fail as 0.9 + 0.3 = 1.2 > 1.0
            try {
                await refundService.addRefund(
                    bet1.id,
                    bet1.user_id,
                    market.id,
                    smallAmount
                );
                throw new Error('Should not reach here');
            } catch (error) {
                expect(error.message).toBe('Error processing refunds: Refund amount exceeds bet amount');
            }

            // Verify results
            expect(refunds.length).toBe(3);
            const totalRefunded = refunds.reduce((sum, r) => sum + Number(r.amount), 0);
            expect(totalRefunded).toBeCloseTo(0.9);

            // Verify we can still add a smaller valid amount
            const finalRefund = await refundService.addRefund(
                bet1.id,
                bet1.user_id,
                market.id,
                0.1
            );
            expect(finalRefund).toBeDefined();
            expect(Number(finalRefund.amount)).toBe(0.1);
        });
        
        it('Should prevent duplicate processed refunds for the same bet', async () => {
            let market, bet1;
            const user = await userService.createUser(testUser);

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x1234567890123456789012345678901234567890',
                    startTime: new Date(),
                    duration: 15
                });

                bet1 = await createTestBet(client, {
                    marketId: market.id,
                    userId: user.user_id,
                    amount: 1.0,
                    status: 'EXPIRED',
                    betType: 'PUMP'
                });
            });

            // Create first refund - should succeed
            const refund1 = await refundService.addRefund(
                bet1.id,
                bet1.user_id,
                market.id,
                1.0
            );
            expect(refund1).toBeDefined();
            expect(refund1.status).toBe('PROCESSED');

            //Trying to create another refund for the same bet should fail
            await expect(async () => {
                await refundService.addRefund(
                    bet1.id,
                    bet1.user_id,
                    market.id,
                    0.3
                );
            }).rejects.toThrow('Error processing refunds: Refund amount exceeds bet amount');
        });
    });

    describe('Error Handling', () => {
        it('Should handle invalid inputs', async () => {
            const testCases = [
                { betId: null, userId: 'user1', marketId: 1, amount: 1.0 },
                { betId: 'bet1', userId: null, marketId: 1, amount: 1.0 },
                { betId: 'bet1', userId: 'user1', marketId: null, amount: 1.0 },
                { betId: 'bet1', userId: 'user1', marketId: 1, amount: null },
                { betId: 'bet1', userId: 'user1', marketId: 1, amount: -1.0 },
                { betId: 'bet1', userId: 'user1', marketId: 1, amount: 0 }
            ];

            for (const testCase of testCases) {
                await expect(async () => {
                    await refundService.addRefund(
                        testCase.betId,
                        testCase.userId,
                        testCase.marketId,
                        testCase.amount
                    );
                }).rejects.toThrow('Error processing refunds');
            }
        });

        it('Should handle database errors', async () => {
            await expect(async () => {
                await refundService.addRefund(
                    999999,
                    'nonexistent-user',
                    999999,
                    1.0
                );
            }).rejects.toThrow('Error processing refunds: Bet not found');
        });
    });

    describe('Fetching refunds', () => {
        it('Should fetch refunds with filters', async () => {
            let market;
            let bet1;
            let bet2;
            const user = await userService.createUser(testUser);
            const user2 = await userService.createUser(testUser2);

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x1234567890123456789012345678901234567890',
                    startTime: new Date(),
                    duration: 15
                });

                bet1 = await createTestBet(client, {
                    marketId: market.id,
                    userId: user.user_id,
                    amount: 1.0,
                    status: 'EXPIRED',
                    betType: 'PUMP'
                });
                
                bet2 = await createTestBet(client, {
                    marketId: market.id,
                    userId: user2.user_id,
                    amount: 1.0,
                    status: 'EXPIRED',
                    betType: 'PUMP'
                });
            });

            // Create refunds for different bets
            await refundService.addRefund(
                bet1.id,
                bet1.user_id,
                market.id,
                0.5
            );
            
            await refundService.addRefund(
                bet2.id,
                bet2.user_id,
                market.id,
                0.7
            );

            // Fetch by bet ID
            const refundsByBet = await refundService.fetchRefunds({ betId: bet1.id });
            expect(refundsByBet.length).toBe(1);
            expect(refundsByBet[0].bet_id == bet1.id).toBe(true);

            // Fetch by status
            const processedRefunds = await refundService.fetchRefunds({ status: 'PROCESSED' });
            expect(processedRefunds.length).toBe(2);
            expect(processedRefunds[0].status).toBe('PROCESSED');
            expect(processedRefunds[1].status).toBe('PROCESSED');
        });

        it('Should handle multiple combined filters correctly', async () => {
            let market, bet1, bet2;
            const user = await userService.createUser(testUser);
            const user2 = await userService.createUser(testUser2);

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x1234567890123456789012345678901234567890',
                    startTime: new Date(),
                    duration: 15
                });

                bet1 = await createTestBet(client, {
                    marketId: market.id,
                    userId: user.user_id,
                    amount: 1.0,
                    status: 'EXPIRED',
                    betType: 'PUMP'
                });
                
                bet2 = await createTestMarket(client, {
                    tokenAddress: '0x9876543210987654321098765432109876543210',
                    startTime: new Date(),
                    userId: user2.user_id,
                    duration: 20
                });
            });

            // Create refunds for different markets
            const refund1 = await refundService.addRefund(
                bet1.id,
                bet1.user_id,
                market.id,
                0.5
            );

            // Test multiple filters
            const results = await refundService.fetchRefunds({
                betId: bet1.id,
                status: 'PROCESSED',
                marketId: market.id
            });

            expect(results.length).toBe(1);
            expect(results[0].id).toBe(refund1.id);
            expect(results[0].status).toBe('PROCESSED');
        });

        // it('Should return empty array for no matches', async () => {
        //     const noMatches = await refundService.fetchRefunds({
        //         betId: 99999,
        //         status: 'PROCESSED'
        //     });

        //     expect(noMatches).toEqual([]);
        // });
    });

    describe('Refund Statistics', () => {
        it('Should calculate refund statistics for a market', async () => {
            let market;
            let bet1;
            let bet2;
            const user = await userService.createUser(testUser);
            const user2 = await userService.createUser(testUser2);

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x1234567890123456789012345678901234567890',
                    startTime: new Date(),
                    duration: 15
                });

                bet1 = await createTestBet(client, {
                    marketId: market.id,
                    userId: user.user_id,
                    amount: 2.0,
                    status: 'EXPIRED',
                    betType: 'PUMP'
                });
                
                bet2 = await createTestBet(client, {
                    marketId: market.id,
                    userId: user2.user_id,
                    amount: 1.0,
                    status: 'EXPIRED', 
                    betType: 'RUG'
                });
            });

            // Create refunds for different bets
            await refundService.addRefund(
                bet1.id,
                bet1.user_id,
                market.id,
                1.0
            );

            await refundService.addRefund(
                bet2.id,
                bet2.user_id,
                market.id,
                0.5
            );

            const stats = await refundService.getRefundStats(market.id);
            expect(stats.totalRefunds).toBe(2);
            expect(stats.totalAmount).toBe(1.5);
            expect(stats.pendingCount).toBe(0);
            expect(stats.processedCount).toBe(2);
            expect(stats.failedCount).toBe(0);
        });

        it('Should handle empty market correctly', async () => {
            let market;

            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x1234567890123456789012345678901234567890',
                    startTime: new Date(),
                    duration: 15
                });
            });

            const stats = await refundService.getRefundStats(market.id);
            expect(stats.totalRefunds).toBe(0);
            expect(stats.totalAmount).toBe(0);
            expect(stats.pendingCount).toBe(0);
            expect(stats.processedCount).toBe(0);
            expect(stats.failedCount).toBe(0);
        });

        it('Should calculate statistics across multiple bets correctly', async () => {
            let market, bet1, bet2, bet3;
            const user = await userService.createUser(testUser);
            const user2 = await userService.createUser(testUser2);
            const user3 = await userService.createUser(testUser3);


            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: '0x1234567890123456789012345678901234567890',
                    startTime: new Date(),
                    duration: 15
                });

                bet1 = await createTestBet(client, {
                    marketId: market.id,
                    userId: user.user_id,
                    amount: 2.0,
                    status: 'EXPIRED',
                    betType: 'PUMP'
                });

                bet2 = await createTestBet(client, {
                    marketId: market.id,
                    userId: user2.user_id,
                    amount: 3.0,
                    status: 'EXPIRED',
                    betType: 'RUG'
                });
                
                bet3 = await createTestBet(client, {
                    marketId: market.id,
                    userId: user3.user_id,
                    amount: 1.5,
                    status: 'EXPIRED',
                    betType: 'RUG'
                });
            });

            // Create refunds for different bets
            await refundService.addRefund(
                bet1.id,
                bet1.user_id,
                market.id,
                1.0
            );

            await refundService.addRefund(
                bet2.id,
                bet2.user_id,
                market.id,
                1.5
            );
            
            await refundService.addRefund(
                bet3.id,
                bet3.user_id,
                market.id,
                0.5
            );

            const stats = await refundService.getRefundStats(market.id);
            expect(stats.totalRefunds).toBe(3);
            expect(stats.totalAmount).toBe(3.0); // 1.0 + 1.5 + 0.5
            expect(stats.pendingCount).toBe(0);
            expect(stats.processedCount).toBe(3);
            expect(stats.failedCount).toBe(0);
        });
    });

    describe('Update Refund Status', () => {
        it('Should update bet status to REFUNDED', async () => {
            let market, bet;
            const user = await userService.createUser(testUser);
        
            await withTransaction(async (client) => {
              market = await createTestMarket(client, {
                tokenAddress: '0x1234567890123456789012345678901234567890',
                startTime: new Date(),
                duration: 15
              });
        
              bet = await createTestBet(client, {
                marketId: market.id,
                userId: user.user_id,
                amount: 1.0,
                status: 'EXPIRED',
                betType: 'PUMP'
              });
            });
        
            // Update bet refund status
            await refundService.updateBetRefundStatus(bet.id);
        
            // Verify the bet status in the database
            const { data: updatedBet, error: fetchError } = await supabase
              .from('bets')
              .select('status')
              .eq('id', bet.id)
              .single();
        
            expect(fetchError).toBeNull();
            expect(updatedBet.status).toBe('REFUNDED');
          });
        
          it('Should throw an error when no bet ID is provided', async () => {
            await expect(
              refundService.updateBetRefundStatus(null)
            ).rejects.toThrow('Error processing Bet.');
          });
        
          it('Should handle multiple updates correctly', async () => {
            let market, bet1, bet2;
            const user = await userService.createUser(testUser);
            const user2 = await userService.createUser(testUser2);
        
            await withTransaction(async (client) => {
              market = await createTestMarket(client, {
                tokenAddress: '0x1234567890123456789012345678901234567890',
                startTime: new Date(),
                duration: 15
              });
        
              bet1 = await createTestBet(client, {
                marketId: market.id,
                userId: user.user_id,
                amount: 1.0,
                status: 'EXPIRED',
                betType: 'PUMP'
              });
        
              bet2 = await createTestBet(client, {
                marketId: market.id,
                userId: user2.user_id,
                amount: 1.5,
                status: 'EXPIRED',
                betType: 'RUG'
              });
            });
        
            // Update refund status for both bets
            await refundService.updateBetRefundStatus(bet1.id);
            await refundService.updateBetRefundStatus(bet2.id);
        
            // Verify both bets' statuses
            const betsResults = await pool.query(
                'SELECT * FROM bets WHERE id IN ($1,$2)', [bet1.id, bet2.id]
            );

            expect(betsResults.rows.length).toBe(2);
            expect(betsResults.rows[0].status).toBe('REFUNDED');
            expect(betsResults.rows[1].status).toBe('REFUNDED');
          });
    });
});