const MarketService = require('../services/MarketService');
const MarketExpiryService = require('../services/MarketExpiryService');
const { pool } = require('../tests/utils/db-config');
const { createClient } = require('@supabase/supabase-js');
const RefundService = require('../services/RefundService');
const MarketResolveService = require('../services/MarketResolveService');
const TokenService = require('../services/TokenService');
const PostgresDatabase = require('../services/PostgresDatabase');

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

describe('Market Service Tests', () => {
    let db;
    let expiryService;
    let marketService;
    let refundService;
    let marketResolveService;
    let tokenService;

    beforeAll(async () => {
        db = new PostgresDatabase(pool);
        refundService = new RefundService(supabase);
        marketService = new MarketService(supabase, pool);
        marketResolveService = new MarketResolveService(supabase);
        expiryService = new MarketExpiryService(supabase, refundService, db, marketResolveService);
        tokenService = new TokenService(supabase, pool);
    });

    beforeEach(async () => {
        await cleanDatabases(pool);
    });

    describe('placeBet transaction tests', () => {
        it('should update market totals after placing a bet', async () => {
            // Create a market
            const market = await marketService.createMarket({
                tokenAddress: `0x${uuidv4().replace(/-/g, '')}`,
                startTime: new Date()
            });

            // Initial market state should have zero totals
            expect(market.total_pump_amount == 0).toBe(true);
            expect(market.total_rug_amount == 0).toBe(true);

            // Place a PUMP bet
            const pumpBetData = {
                userId: uuidv4(),
                amount: 100,
                netAmount: 99,
                fee: 1,
                betType: 'PUMP',
                odds: 2.0,
                potentialPayout: 198
            };

            await marketService.placeBet(market.id, pumpBetData);

            // Place a RUG bet
            const rugBetData = {
                userId: uuidv4(),
                amount: 50,
                netAmount: 49.5,
                fee: 0.5,
                betType: 'RUG',
                odds: 2.0,
                potentialPayout: 99
            };

            await marketService.placeBet(market.id, rugBetData);

            // Fetch the updated market to verify totals
            const { data: updatedMarket } = await supabase
                .from('markets')
                .select('*')
                .eq('id', market.id)
                .single();

            // Check the totals have been updated correctly
            expect(parseFloat(updatedMarket.total_pump_amount)).toBe(100);
            expect(parseFloat(updatedMarket.total_rug_amount)).toBe(50);
        });

        // This would test database-level transaction rollback
        it('should roll back the entire transaction if an error occurs in the database', async () => {
            // Create a market with an ID that will cause a constraint violation
            const market = await marketService.createMarket({
                tokenAddress: `0x${uuidv4().replace(/-/g, '')}`,
                startTime: new Date()
            });

            // Create a bet that will cause a database error (e.g., by violating a constraint)
            const betData = {
                // Something that would cause the database procedure to fail
                // For example, an invalid bet type or other constraint violation
                userId: uuidv4(),
                amount: -100, // Negative amount might trigger a check constraint
                netAmount: 99,
                fee: 1,
                betType: 'PUMP',
                odds: 2.0,
                potentialPayout: 198
            };

            // Attempt to place a bet, should fail at the database level
            await expect(marketService.placeBet(market.id, betData))
                .rejects.toThrow();

            // Verify the transaction was rolled back
            const updatedMarket = await marketService.getMarket(market.id);
            expect(parseFloat(updatedMarket.total_pump_amount)).toBe(0);
        });

        it('should handle transaction atomicity with concurrent updates', async () => {
          // Create a market
          const market = await marketService.createMarket({
            tokenAddress: `0x${uuidv4().replace(/-/g, '')}`,
            startTime: new Date()
          });

          // Create multiple bet requests concurrently
          const betCount = 5;
          const betAmount = 20;
          const betPromises = [];

          for (let i = 0; i < betCount; i++) {
            const betData = {
              userId: uuidv4(),
              amount: betAmount,
              netAmount: betAmount * 0.99,
              fee: betAmount * 0.01,
              betType: i % 2 === 0 ? 'PUMP' : 'RUG', // Alternate between PUMP and RUG
              odds: 2.0,
              potentialPayout: betAmount * 0.99 * 2.0
            };

            betPromises.push(marketService.placeBet(market.id, betData));
          }

          // Wait for all bets to complete
          await Promise.all(betPromises);

          // Verify the bet count
          const { data: bets } = await supabase
            .from('bets')
            .select('*')
            .eq('market_id', market.id);

          expect(bets.length).toBe(betCount);

          // Calculate expected totals based on our bets
          const expectedPumpTotal = betAmount * Math.ceil(betCount / 2);
          const expectedRugTotal = betAmount * Math.floor(betCount / 2);

          // Verify market totals match the sum of all bets
          const { data: updatedMarket } = await supabase
            .from('markets')
            .select('*')
            .eq('id', market.id)
            .single();

          expect(parseFloat(updatedMarket.total_pump_amount)).toBe(expectedPumpTotal);
          expect(parseFloat(updatedMarket.total_rug_amount)).toBe(expectedRugTotal);
        });

        it('should maintain consistency between bets and market totals', async () => {
          // Create a market
          const market = await marketService.createMarket({
            tokenAddress: `0x${uuidv4().replace(/-/g, '')}`,
            startTime: new Date()
          });

          // Place a series of bets
          const bets = [
            { amount: 100, betType: 'PUMP' },
            { amount: 200, betType: 'RUG' },
            { amount: 150, betType: 'PUMP' },
            { amount: 50, betType: 'RUG' }
          ];

          for (const bet of bets) {
            const betData = {
              userId: uuidv4(),
              amount: bet.amount,
              netAmount: bet.amount * 0.99,
              fee: bet.amount * 0.01,
              betType: bet.betType,
              odds: 2.0,
              potentialPayout: bet.amount * 0.99 * 2.0
            };

            await marketService.placeBet(market.id, betData);
          }

          // Calculate totals from bets table
          const { data: placedBets } = await supabase
            .from('bets')
            .select('*')
            .eq('market_id', market.id);

          const calculatedTotals = {
            pumpTotal: 0,
            rugTotal: 0
          };

          placedBets.forEach(bet => {
            if (bet.bet_type === 'PUMP') {
              calculatedTotals.pumpTotal += parseFloat(bet.amount);
            } else if (bet.bet_type === 'RUG') {
              calculatedTotals.rugTotal += parseFloat(bet.amount);
            }
          });

          // Verify market totals match the calculated totals
          const { data: updatedMarket } = await supabase
            .from('markets')
            .select('*')
            .eq('id', market.id)
            .single();

          expect(parseFloat(updatedMarket.total_pump_amount)).toBe(calculatedTotals.pumpTotal);
          expect(parseFloat(updatedMarket.total_rug_amount)).toBe(calculatedTotals.rugTotal);
        });

        it('should handle floating point amounts correctly', async () => {
          // Create a market
          const market = await marketService.createMarket({
            tokenAddress: `0x${uuidv4().replace(/-/g, '')}`,
            startTime: new Date()
          });

          // Place a bet with floating point amount
          const betData = {
            userId: uuidv4(),
            amount: 10.5555,
            netAmount: 10.45,
            fee: 0.1055,
            betType: 'PUMP',
            odds: 2.0,
            potentialPayout: 20.9
          };

          await marketService.placeBet(market.id, betData);

          // Verify market total has the exact amount
          const { data: updatedMarket } = await supabase
            .from('markets')
            .select('*')
            .eq('id', market.id)
            .single();

          expect(parseFloat(updatedMarket.total_pump_amount)).toBe(10.5555);
        });

        // // This test assumes that your database stored procedure is set up
        it('should verify the transaction performance', async () => {
          // Create a market
          const market = await marketService.createMarket({
            tokenAddress: `0x${uuidv4().replace(/-/g, '')}`,
            startTime: new Date()
          });

          // Measure performance
          const startTime = Date.now();

          // Place many bets in sequence to test performance
          const betsToPlace = 10;
          for (let i = 0; i < betsToPlace; i++) {
            const betData = {
              userId: uuidv4(),
              amount: 100,
              netAmount: 99,
              fee: 1,
              betType: i % 2 === 0 ? 'PUMP' : 'RUG',
              odds: 2.0,
              potentialPayout: 198
            };

            await marketService.placeBet(market.id, betData);
          }

          const endTime = Date.now();
          const duration = endTime - startTime;

          console.log(`Placed ${betsToPlace} bets in ${duration}ms (avg ${duration/betsToPlace}ms per bet)`);

          // We don't make assertions on timing as it depends on the environment,
          // but the log helps evaluate transaction performance

          // Verify all bets were created
          const { data: bets } = await supabase
            .from('bets')
            .select('*')
            .eq('market_id', market.id);

          expect(bets.length).toBe(betsToPlace);
        });
    });

    describe('createMarket', () => {
        it('should create a new market and update token status to "used"', async () => {
            const tokenAddress = `0x${uuidv4().replace(/-/g, '')}`;
            const startTime = new Date();

            // Insert a token into the tokens table (mocking token fetching)
            const token = {
                address: tokenAddress,
                createdAt: new Date().toISOString(),
                dexId: 'raydium'
            }

            await tokenService.saveTokens([token]);

            const market = await marketService.createMarket({
                tokenAddress,
                startTime
            });

            expect(market).toBeDefined();
            expect(market.token_address).toBe(tokenAddress);
            expect(market.duration).toBe(30);
            expect(market.phase).toBe('BETTING');
            expect(market.status).toBe('OPEN');
            expect(market.current_pump_odds == 2.0).toBe(true);
            expect(market.current_rug_odds == 2.0).toBe(true);

            // Verify token status has been updated to "used"
            const { rows: updatedToken } = await pool.query(`
                SELECT status FROM tokens WHERE token_address = $1;
            `, [tokenAddress]);

            expect(updatedToken[0].status).toBe('used');
        });
    });

    describe('createMarket', () => {
        it('should create a market with custom values', async () => {
            const marketData = {
                tokenAddress: uuidv4(),
                startTime: new Date(),
                duration: 60,
                coinPrice: 100,
                marketCap: 1000000,
                liquidity: 500000,
                buys: 5000,
                sells: 8000,
                dexscreener_url: 'https://dexscreener.com/solana/8slbnzoa1cfnvmjlpfp98zlanfsycfapfjkmbixnlwxj',
                dex_id: 'raydium',
                website_url: 'https://pump.fun',
                icon_url: 'https://img.com',
                coin_description: 'The Best Coin EVER!!',
                socials: {
                    address: 'etertertetre4536456',
                    createdAt: new Date().toISOString(),
                    dexId: 'raydium'
                }
            };

            const market = await marketService.createMarket(marketData);

            expect(market.duration).toBe(60);
            expect(market.initial_coin_price == 100).toBe(true);
            expect(market.initial_market_cap == 1000000).toBe(true);
            expect(market.initial_liquidity == 500000).toBe(true);
            expect(market.initial_buy_txns == 5000).toBe(true);
            expect(market.initial_sell_txns == 8000).toBe(true);
        });

        it('should throw error for invalid token address', async () => {
            await expect(marketService.createMarket({
                tokenAddress: '',
                startTime: new Date()
            })).rejects.toThrow();
        });
    });

    describe('getMarketStatus', () => {
        it('should return correct market status with betting statistics', async () => {
            // First create a market
            let market;
            let bet1;
            let bet2;

            await withTransaction(async (client) => {
                market = await marketService.createMarket({
                    tokenAddress: `0x${uuidv4().replace(/-/g, '')}`,
                    startTime: new Date()
                });

                bet1 = await createTestBet(pool, {
                    marketId: market.id,
                    userId: uuidv4(),
                    status: 'MATCHED',
                    betType: 'PUMP',
                    matchedAmount: 100,
                    amount: 100
                });

                bet2 = await createTestBet(pool, {
                    userId: uuidv4(),
                    marketId: market.id,
                    status: 'EXPIRED',
                    amount: 50,
                    betType: 'RUG',
                    refundAmount: 50
                });
            });

            const status = await marketService.getMarketStatus(market.id);

            expect(status.totalBets).toBe(2);
            expect(status.matchedBets).toBe(1);
            expect(status.expiredBets).toBe(1);
            expect(status.totalRefunded).toBe(50);
            expect(status.currentPhase).toBe('BETTING');
            expect(status.timeUntilCutoff).toBeGreaterThan(0);
        });

        it('should throw error for non-existent market', async () => {
            await expect(marketService.getMarketStatus(''))
                .rejects.toThrow();
        });
    });

    describe('placeBet', () => {
        it('should successfully place a bet during betting phase', async () => {
            const market = await marketService.createMarket({
                tokenAddress: `0x${uuidv4().replace(/-/g, '')}`,
                startTime: new Date()
            });

            const odds = 2.0;
            const amount = 100;
            const fee = amount * 0.01;
            const netAmount = amount - fee;
            const potentialPayout = netAmount * odds;
            const userId = uuidv4();
            const betType = 'PUMP';


            const betData = {
                userId,
                amount,
                netAmount,
                fee,
                betType,
                odds,
                potentialPayout
              } 

            const bet = await marketService.placeBet(market.id, betData);

            expect(bet).toBeDefined();
            expect(bet.amount).toBe(100);
            expect(bet.bet_type).toBe('PUMP');
            expect(bet.status).toBe('PENDING');
        });

        it('should not allow betting after betting phase', async () => {
            const pastDate = new Date();
            pastDate.setHours(pastDate.getHours() - 1);

            const market = await marketService.createMarket({
                tokenAddress: `0x${uuidv4().replace(/-/g, '')}`,
                startTime: pastDate,
                duration: 30
            });

            const odds = 2.0;
            const amount = 100;
            const fee = amount * 0.01;
            const netAmount = amount - fee;
            const potentialPayout = netAmount * odds;
            const userId = uuidv4();
            const betType = 'PUMP';


            const betData = {
                userId,
                amount,
                netAmount,
                fee,
                betType,
                odds,
                potentialPayout
              } 

            await expect(marketService.placeBet(market.id, betData))
                .rejects.toThrow();
        });
    });

    describe('getMarketCount', () => {
        it('should return correct count of active markets', async () => {
            // Create multiple markets in different phases
            await marketService.createMarket({
                tokenAddress: `0x${uuidv4().replace(/-/g, '')}`,
                startTime: new Date(),
                phase: 'BETTING'
            });

            await marketService.createMarket({
                tokenAddress: `0x${uuidv4().replace(/-/g, '')}`,
                startTime: new Date(),
                phase: 'OBSERVATION'
            });

            await marketService.createMarket({
                tokenAddress: `0x${uuidv4().replace(/-/g, '')}`,
                startTime: new Date(),
                phase: 'RESOLVED'
            });

            const count = await marketService.getMarketCount();
            expect(count).toBe(2); // Only BETTING and OBSERVATION markets
        });
    });

    afterAll(async () => {
        await pool.end();
    });
});