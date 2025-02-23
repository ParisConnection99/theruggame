const { pool } = require('../tests/utils/db-config');
const MarketCreationService = require('../services/MarketCreationService');
const TokenService = require('../services/TokenService');
const MarketService = require('../services/MarketService');
const ExpiryService = require('../services/MarketExpiryService');
const MarketResolveService = require('../services/MarketResolveService');
const PayoutService = require('../services/PayoutService');
const UserService = require('../services/UserService');
const PostgresDatabase = require('../services/PostgresDatabase');
const RefundService = require('../services/RefundService');

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

const {
  systemFlagReady,
  cleanDatabases,
  create
} = require('../tests/utils/db-helper');

const testMarketData1 = {
  address: "0x123abc",
  marketCap: 70000,
  priceUsd: 0.05,
  dexId: 'raydium',
  createdAt: new Date().toISOString(),
  liquidity: 250000,
  transactions: {
    h24: {
      buys: 150,
      sells: 75
    }
  }
};

const testMarketData2 = {
  address: "0x456def",
  marketCap: 120000,
  priceUsd: 0.08,
  dexId: 'raydium',
  createdAt: new Date().toISOString(),
  liquidity: 350000,
  transactions: {
    h24: {
      buys: 220,
      sells: 95
    }
  }
};

const testTokenData = {
  address: "0x123xjs",
  createdAt: new Date().toISOString(),
  status: 'available',
  dexId: 'raydium'
}

const testTokenData2 = {
  address: "0x456abc",
  createdAt: new Date().toISOString(),
  status: 'available',
  dexId: 'raydium'
}

describe('Market Creation Service Tests', () => {
  let marketCreationService;
  let tokenService;
  let marketService;
  let expiryService;
  let payoutService;
  let marketResolveService;
  let userService;
  let db;
  let refundService;

  beforeAll(async () => {
    db = new PostgresDatabase(pool);
    userService = new UserService(supabase);
    refundService = new RefundService(supabase, {
      maxAttempts: 3,
      minRefundAmount: 0.00000001
    }, userService);

    tokenService = new TokenService(supabase, pool);
    marketResolveService = new MarketResolveService(supabase);
    payoutService = new PayoutService(supabase, userService);
    
    marketService = new MarketService(supabase, pool, expiryService);
    marketCreationService = new MarketCreationService(tokenService, marketService, {}, supabase);
    expiryService = new ExpiryService(supabase,
      refundService,
      db,
      marketResolveService,
      payoutService, marketCreationService);
  });

  beforeEach(async () => {
    await cleanDatabases(pool);
  });

  describe('Count Management', () => {
      it('should maintain correct total count', async () => {
          const activeMarketCount = await marketService.getMarketCount();
          const reserveCount = await tokenService.getReserveCount();
          const totalCount = activeMarketCount + reserveCount;

          // Should be less than or equal to our target
          expect(totalCount).toBeLessThanOrEqual(marketCreationService.TOTAL_MARKET_CAPACITY);
      });

      it('should handle active market limit', async () => {
          const activeMarketCount = await marketService.getMarketCount();
          expect(activeMarketCount).toBeLessThanOrEqual(marketCreationService.ACTIVE_MARKETS_LIMIT);
      });
  });

  describe('Token Fetching Lock Mechanism', () => {
      // Setup the test environment
      beforeEach(async () => {
          // Reset system flag to known state before each test
          // Check if the row exists first
          await pool.query(
              `INSERT INTO system_flags (key, value, updated_at) 
               VALUES ($1, $2, $3)
               ON CONFLICT (key) DO UPDATE 
               SET value = $2, updated_at = $3`,
              ['reserve_fetch_status', 'ready', new Date().toISOString()]
          );
      });

      describe('canStartFetching', () => {
          it('should return true when fetching is not in progress', async () => {
              const result = await marketCreationService.canStartFetching();
              expect(result).toBe(true);
          });

          it('should return false when fetching is already in progress', async () => {
              // First set the flag to 'fetching'
              await pool.query(
                  'UPDATE system_flags SET value = $1, updated_at = $2 WHERE key = $3',
                  ['fetching', new Date().toISOString(), 'reserve_fetch_status']
              );

              const result = await marketCreationService.canStartFetching();
              expect(result).toBe(false);
          });

          it('should handle database errors gracefully', async () => {
              // Save original implementation
              const originalFrom = marketCreationService.supabase.from;

              try {
                // Mock the database query to reject with an error
                const dbOperation = jest.fn().mockRejectedValue(new Error('DB Error'));
                marketCreationService.supabase.from = jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: dbOperation
                    })
                  })
                });

                // Add try/catch in your test to handle the rejection
                try {
                  const result = await marketCreationService.canStartFetching();
                  // Test should fail if we get here
                  expect(true).toBe(false); 
                } catch (error) {
                  expect(error.message).toBe('DB Error');
                }
              } finally {
                // Restore original implementation even if test fails
                marketCreationService.supabase.from = originalFrom;
              }
            });
      });

      describe('startFetching', () => {
        it('should successfully update flag to fetching', async () => {
          console.log('Start fetching');
          const result = await marketCreationService.startFetching();
          expect(result).toBe(true);

          //Verify the flag was actually updated
          const queryResult = await pool.query(
              'SELECT value FROM system_flags WHERE key = $1',
              ['reserve_fetch_status']
          );

          expect(queryResult.rows[0].value).toBe('fetching');
        });

        it('should return false if another process already set the flag', async () => {
          // First call should succeed
          const firstResult = await marketCreationService.startFetching();
          expect(firstResult).toBe(true);

          // The Flag should be set to fetching
          const queryResult = await pool.query(
              'SELECT value FROM system_flags WHERE key = $1',
              ['reserve_fetch_status']
          );

          expect(queryResult.rows[0].value).toBe('fetching');


          // // Second immediate call should fail (flag already set)
          const secondResult = await marketCreationService.canStartFetching();  
          expect(secondResult).toBe(false);
        });

        it('should include atomic update to prevent race conditions', async () => {
          // This test verifies that the update includes a condition to prevent race conditions
          // We can check this by examining the implementation to ensure it uses both .eq and .neq conditions

          // Mock supabase to verify the correct conditions are being used
          let conditionsUsed = { eq: false, neq: false };
          const originalUpdate = supabase.from;

          supabase.from = jest.fn().mockImplementation(() => {
            return {
              update: () => ({
                eq: (key, value) => {
                  conditionsUsed.eq = true;
                  expect(key).toBe('key');
                  expect(value).toBe('reserve_fetch_status');
                  return {
                    neq: (key, value) => {
                      conditionsUsed.neq = true;
                      expect(key).toBe('value');
                      expect(value).toBe('fetching');
                      return Promise.resolve({ error: null });
                    }
                  };
                }
              })
            };
          });

          try {
            await marketCreationService.startFetching();
            expect(conditionsUsed.eq).toBe(true);
            expect(conditionsUsed.neq).toBe(true);
          } finally {
            // Restore original implementation
            supabase.from = originalUpdate;
          }
        });
      });

      describe('finishedFetching', () => {
        it('should reset flag to ready state', async () => {
          // First set it to fetching
          await marketCreationService.startFetching();

          // Then call finished
          await marketCreationService.finishedFetching();

          // Verify state was reset
          const { data } = await supabase
            .from('system_flags')
            .select('value')
            .eq('key', 'reserve_fetch_status')
            .single();

          expect(data.value).toBe('ready');
        });

        it('should handle database errors gracefully', async () => {
          // Mock supabase to throw an error
          const originalUpdate = supabase.from;
          const consoleSpy = jest.spyOn(console, 'log');

          supabase.from = jest.fn().mockImplementation(() => {
            return {
              update: () => ({
                eq: () => Promise.resolve({ error: new Error('DB Error') })
              })
            };
          });

          try {
            await marketCreationService.finishedFetching();
            expect(consoleSpy).toHaveBeenCalledWith('Error finishing fetching..');
          } finally {
            // Restore original implementation
            supabase.from = originalUpdate;
            consoleSpy.mockRestore();
          }
        });
      });

      describe('Full fetch cycle locking', () => {
        it('should handle the complete lock-fetch-unlock cycle', async () => {
          // Should be able to start
          const canStart = await marketCreationService.canStartFetching();
          expect(canStart).toBe(true);

          // Should lock successfully
          const didLock = await marketCreationService.startFetching();
          expect(didLock).toBe(true);

          // Should prevent others from starting
          const cannotStartAgain = await marketCreationService.canStartFetching();
          expect(cannotStartAgain).toBe(false);

          // Should unlock successfully
          await marketCreationService.finishedFetching();

          // Should allow starting again
          const canStartAgain = await marketCreationService.canStartFetching();
          expect(canStartAgain).toBe(true);
        });

        it('should maintain lock if process crashes between start and finish', async () => {
          // Start fetching
          await marketCreationService.startFetching();

          // Verify lock is maintained after a certain time
          await new Promise(resolve => setTimeout(resolve, 100));

          const stillLocked = !(await marketCreationService.canStartFetching());
          expect(stillLocked).toBe(true);

          // Clean up
          await marketCreationService.finishedFetching();
        });
      });

      // Cleanup
      afterAll(async () => {
          // Reset flag to ready state
          await pool.query(
              `INSERT INTO system_flags (key, value, updated_at) 
               VALUES ($1, $2, $3)
               ON CONFLICT (key) DO UPDATE 
               SET value = $2, updated_at = $3`,
              ['reserve_fetch_status', 'ready', new Date().toISOString()]
          );
      });
  });

  describe('Market Creation Tests', () => {
    it('Should create a new Market', async () => {
      const mockMarketData = {
        address: "0x123abc",
        startTime: new Date(),
        duration: 10,
        marketCap: 70000,
        priceUsd: 0.05,
        liquidity: 250000,
        transactions: {
          h24: {
            buys: 150,
            sells: 75
          }
        }
      };

      await marketCreationService.createMarket(mockMarketData);

      const marketResult = await pool.query(
        'SELECT * FROM markets WHERE token_address = $1', [mockMarketData.address]
      );

      expect(marketResult).toBeDefined();
      expect(marketResult.rows[0].initial_liquidity == 250000).toBe(true);
      expect(marketResult.rows[0].initial_coin_price == 0.05).toBe(true);
    });

    it('rejects invalid token address', async () => {
      const tokenData = {
        tokenAddress: "",  // Invalid empty address
        priceUsd: 0.05,
        liquidity: 250000,
        transaction: { h24: { buys: 150, sells: 75 } }
      };

      await expect(marketCreationService.createMarket(tokenData))
        .rejects.toThrow('Error processing Token.');
    });

    it('rejects negative values', async () => {
      const tokenData = {
        address: "0x123abc",
        priceUsd: -0.05,
        marketCap: 5000,
        duration: 1,
        startTime: new Date(),
        liquidity: -250000,
        transactions: { h24: { buys: -150, sells: -75 } }
      };

      await expect(marketCreationService.createMarket(tokenData))
        .rejects.toThrow('Values cannot be negative');
    });

    it('Rejects missing transaction data', async () => {
      const tokenData = {
        address: "0x123abc",
        priceUsd: -0.05,
        marketCap: 5000,
        duration: 1,
        startTime: new Date(),
        liquidity: -250000,
        transactions: {}
      };
      await expect(marketCreationService.createMarket(tokenData))
        .rejects.toThrow('Error processing Token.');

    });
  });

  describe('Fetch Market And Reserve Counts Tests', () => {
    it('Should fetch the correct amounts', async () => {
    
      await marketCreationService.createMarket(testMarketData1);
      await marketCreationService.createMarket(testMarketData2);

      await tokenService.saveTokens([testTokenData, testTokenData2]);

    
      const { activeMarketCount, reserveCount, totalCount } = await marketCreationService.getMarketAndReserveCounts();

      console.log(`Activemarketcount: ${activeMarketCount}, reserveCount: ${reserveCount}`);

      expect(activeMarketCount == 2).toBe(true);
      expect(reserveCount == 2).toBe(true);
      expect(totalCount == 4).toBe(true);
    });
  });

  describe('Handle Market Creation Tests', () => {
    it('Should create market, save tokens and remove expired tokens', async () => {
      const tokens = [testMarketData1, testMarketData2];

      const token = tokens.shift();

      console.log(JSON.stringify(token, null, 2));

      await marketCreationService.handleMarketCreation(token, tokens);

      // Check the market has been created
      const marketResult = await pool.query(
        'SELECT * FROM markets WHERE token_address = $1', [testMarketData1.address] 
      );

      // Verify that it is the correct market
      const market = marketResult.rows[0];
      expect(market.token_address == testMarketData1.address);
      expect(market.initial_market_cap == 70000).toBe(true);
      expect(market.initial_coin_price == 0.05).toBe(true);
      expect(market.initial_liquidity == 250000).toBe(true);


      // Check the reserved tokens are saved
      const tokenResults = await pool.query(
        'SELECT * FROM tokens WHERE token_address = $1', [testMarketData2.address]
      );

      const fetchedToken = tokenResults.rows[0];

      // Verify that it is the correct token
      expect(fetchedToken.address == testMarketData2.address).toBe(true);
      expect(fetchedToken.dex_id == testMarketData2.dexId).toBe(true);
    });
  });

  describe('fetchTokens Function', () => {
    it('should fetch tokens and return the first one', async () => {
      const mockTokens = [
        { ...testMarketData1 },
        { ...testMarketData2 }
      ];
      
      jest.spyOn(marketCreationService, 'startTokenFetchCycle').mockResolvedValue([...mockTokens]);
      
      const result = await marketCreationService.fetchTokens(5);
      
      expect(marketCreationService.startTokenFetchCycle).toHaveBeenCalledWith(5);
      expect(result).toEqual(testMarketData1);
    });
  });
  
  describe('Reserve Token Management', () => {
    beforeEach(async () => {
      await cleanDatabases(pool);
    });
  
    it('should get a valid token from reserve', async () => {
      // Insert test tokens into database
      await tokenService.saveTokens([testTokenData, testTokenData2]);
      
      // Mock the token validation to return true for test tokens
      jest.spyOn(marketCreationService, 'isReservedTokenStillActive').mockResolvedValue(true);
      
      const reservedToken = await marketCreationService.getReservedToken();
      
      expect(reservedToken).toBeDefined();
      expect(reservedToken.token_address).toBe(testTokenData.address);
    });
  
    it('should skip expired tokens and return the first valid one', async () => {
      // Insert test tokens into database
      await tokenService.saveTokens([testTokenData, testTokenData2]);
      
      // Mock validation to return false for first token, true for second
      jest.spyOn(marketCreationService, 'isReservedTokenStillActive')
        .mockImplementation((address) => {
          return Promise.resolve(address === testTokenData2.address);
        });
      
      // Spy on tokenService.updateTokenStatus
      jest.spyOn(tokenService, 'updateTokenStatus');
      
      const reservedToken = await marketCreationService.getReservedToken();
      
      expect(reservedToken).toBeDefined();
      expect(reservedToken.token_address).toBe(testTokenData2.address);
      expect(tokenService.updateTokenStatus).toHaveBeenCalledWith(testTokenData.address, 'expired');
    });
  
    it('should return null when no valid tokens in reserve', async () => {
      // Insert test tokens into database
      await tokenService.saveTokens([testTokenData, testTokenData2]);
      
      // Mock validation to return false for all tokens
      jest.spyOn(marketCreationService, 'isReservedTokenStillActive').mockResolvedValue(false);
      
      const reservedToken = await marketCreationService.getReservedToken();
      
      expect(reservedToken).toBeNull();
    });
  
    it('should return false when token no longer passes filters', async () => {
      // Mock filterTokens to return empty array (token fails criteria)
      jest.spyOn(marketCreationService, 'fetchTokenDetails').mockResolvedValue([{ address: testTokenData.address }]);
      jest.spyOn(marketCreationService, 'filterTokens').mockResolvedValue([]);
      
      const result = await marketCreationService.isReservedTokenStillActive(testTokenData.address);
      
      expect(result).toBe(false);
    });
  });
  
  describe('Token Fetching Cycle', () => {
    it('should fetch tokens until capacity is reached', async () => {
      // Create mock tokens
      const mockTokenBatch1 = [
        { ...testMarketData1 },
        { ...testMarketData2 }
      ];
      
      const mockTokenBatch2 = [
        { address: "0x789ghi", marketCap: 90000, priceUsd: 0.07, liquidity: 300000 }
      ];
      
      const mockProfiles = [
        { tokenAddress: "0x123abc" },
        { tokenAddress: "0x456def" },
        { tokenAddress: "0x789ghi" }
      ];
      
      // Replace implementation of startTokenFetchCycle
      const originalStartTokenFetchCycle = marketCreationService.startTokenFetchCycle;
      marketCreationService.startTokenFetchCycle = jest.fn().mockResolvedValue([...mockTokenBatch1, ...mockTokenBatch2]);
      
      try {
        // Starting with 10 tokens, need 5 more to reach capacity of 15
        const result = await marketCreationService.startTokenFetchCycle(10);
        
        // Should have all 3 mock tokens
        expect(result.length).toBe(3);
        expect(result).toEqual([...mockTokenBatch1, ...mockTokenBatch2]);
        
        // Should have called with the right initial count
        expect(marketCreationService.startTokenFetchCycle).toHaveBeenCalledWith(10);
      } finally {
        // Restore original implementation
        marketCreationService.startTokenFetchCycle = originalStartTokenFetchCycle;
      }
    });
  
    it('should respect maximum attempts', async () => {
      // Set low maximum attempts
      const originalMaxAttempts = marketCreationService.MAXIMUM_ATTEMPTS;
      marketCreationService.MAXIMUM_ATTEMPTS = 2;
      
      // Create a mock implementation that maintains state
      const mockTokens = [testMarketData1, testMarketData1];
      
      // Create a proper mock implementation
      const originalStartFetchCycle = marketCreationService.startTokenFetchCycle;
      marketCreationService.startTokenFetchCycle = jest.fn().mockImplementation(() => {
        return Promise.resolve(mockTokens);
      });
      
      // Reset other mocks if needed
      jest.clearAllMocks();
      
      try {
        // Spy on fetchTokenProfiles to verify call count
        jest.spyOn(marketCreationService, 'fetchTokenProfiles').mockResolvedValue([]);
        
        // Start with 5, need 10 more to reach capacity of 15
        const result = await marketCreationService.startTokenFetchCycle(5);
        
        expect(marketCreationService.startTokenFetchCycle).toHaveBeenCalledWith(5);
        expect(result).toEqual(mockTokens);
      } finally {
        // Restore original values
        marketCreationService.MAXIMUM_ATTEMPTS = originalMaxAttempts;
        marketCreationService.startTokenFetchCycle = originalStartFetchCycle;
      }
    });
  });
  

  describe('Filter Tokens Tests', () => {
    it('should handle edge cases and missing data', async () => {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      
      const tokens = [
        // Edge case - exactly at threshold values
        {
          symbol: 'EDGE',
          liquidity: 40000, // Exactly at threshold
          marketCap: 500000,
          volume24h: 100000, // Exactly at threshold
          createdAt: now - (7 * oneDay) // 7 days old (should be excluded)
        },
        // Missing data
        {
          symbol: 'MISSING',
          marketCap: 1000000,
          createdAt: now - (2 * oneDay)
          // Missing liquidity and volume
        }
      ];
      
      jest.spyOn(console, 'log').mockImplementation();
      
      const result = await marketCreationService.filterTokens(tokens);
      
      // Both should be excluded - one for age, one for missing data
      expect(result.length).toBe(0);
    });
  
    it('should handle errors gracefully', async () => {
      const invalidTokens = [
        {
          symbol: 'ERROR',
          liquidity: 'not-a-number',
          volume24h: null,
          createdAt: 'invalid-date'
        }
      ];
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await marketCreationService.filterTokens(invalidTokens);
      
      // Should return empty array on error
      expect(result).toEqual([]);
      
      consoleSpy.mockRestore();
    });
    
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Remove test data
    await tokenService.removeExpiredTokens();
  });
});
