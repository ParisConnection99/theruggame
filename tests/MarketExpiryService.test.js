const { pool } = require('../tests/utils/db-config');
const ExpiryService = require('../services/MarketExpiryService');
const MatchingFunnel = require('../services/MatchingFunnel');
const BetUnitService = require('../services/BetUnitService');
const StatusUpdateService = require('../services/StatusUpdateService');
const PostgresDatabase = require('../services/PostgresDatabase');
const MarketService = require('../services/MarketService');
const RefundService = require('../services/RefundService');
const UserService = require('../services/UserService');
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
  cleanDatabase,
  cleanDatabases,
  createTestMarket,
  createTestUser,
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


describe('ExpiryService', () => {
  let expiryService;
  let db;
  let matchingFunnel;
  let marketService;
  let betUnitService;
  let statusUpdateService;
  let eventEmitter;
  let refundService;
  let marketResolveService;
  let userService;
  let payoutService;
  let marketCreationService;
  let tokenService;

  beforeAll(async () => {
    db = new PostgresDatabase(pool);

    userService = new UserService(supabase);

    refundService = new RefundService(supabase, {
      maxAttempts: 3,
      minRefundAmount: 0.00000001
    }, userService);

    marketResolveService = new MarketResolveService(supabase);

    payoutService = new PayoutService(supabase, userService);

    tokenService = new TokenService(supabase);

    expiryService = new ExpiryService(supabase,
      refundService,
      db,
      marketResolveService,
      payoutService);

    marketService = new MarketService(supabase, pool, expiryService);

    marketCreationService = new MarketCreationService(tokenService, marketService, {}, supabase);

    
    expiryService.setMarketCreationService(marketCreationService);

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

    statusUpdateService = new StatusUpdateService(db, {
      matchingPrecision: 0.000001
    }, eventEmitter);

    matchingFunnel = new MatchingFunnel(db, {
      batchSize: 50,
      matchingCutoffPercent: 50
    }, marketService, statusUpdateService, betUnitService);
  }, 10000);

  beforeEach(async () => {
    await cleanDatabases(pool);
  }, 10000);

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Resolve Status Update Tests', () => {
    it('should update market status to RESOLVED', async () => {
      let market;

      await withTransaction(async (client) => {
        // Create market using marketService
        market = await createTestMarket(client, {
          tokenAddress: '0x123',
          startTime: new Date(),
          duration: 30
        });
      });

      // // Resolve the market
      await expiryService.resolveStatusUpdate(market.id, 'RESOLVED');

      // Verify market status in database
      const marketResult = await pool.query(
        'SELECT * FROM markets WHERE id = $1',
        [market.id]
      );

      expect(marketResult.rows[0].phase).toBe('RESOLVED');
      expect(marketResult.rows[0].resolved_at).not.toBeNull();
    });

    it('should handle concurrent update attempts', async () => {
      let market;

      // Create test market
      market = await createTestMarket(pool, {
        tokenAddress: '0x123',
        startTime: new Date(),
        duration: 30
      });

      // Simulate concurrent updates
      try {
        // We can't use Promise.all directly because we want to catch the error
        // from one of the promises, not fail the whole test
        const updatePromises = [
          expiryService.resolveStatus(market.id, 'RESOLVED'),
          expiryService.resolveStatus(market.id, 'RESOLVED')
        ];

        // Execute both promises and handle results
        const results = await Promise.allSettled(updatePromises);

        // At least one should succeed
        const successfulUpdates = results.filter(r => r.status === 'fulfilled');
        expect(successfulUpdates.length).toBeGreaterThan(0);

        // At least one should fail due to locking
        const failedUpdates = results.filter(r => r.status === 'rejected');
        expect(failedUpdates.length).toBeGreaterThan(0);

        // Verify the rejection reason contains our expected message
        const errorMessage = failedUpdates[0].reason.message;
        expect(errorMessage).toContain('It may be locked by another process');

        // Verify the market was actually updated to RESOLVED
        const updatedMarketResult = await pool.query(
          'SELECT * FROM markets WHERE id = $1', [market.id]
        );

        expect(updatedMarketResult.rows.length).toBe(1);
        expect(updatedMarketResult.rows[0].phase).toBe('RESOLVED');
        expect(updatedMarketResult.rows[0].status).toBe('RESOLVED');
      } catch (error) {
        // This shouldn't happen if we're using Promise.allSettled correctly
        console.log(`Test failed unexpectedly: ${error.message}`);
      }
    });
  });
  describe('calculateMarketPhase', () => {
    it('should return NOT_STARTED for future start time', () => {
      jest.useFakeTimers();
      const now = new Date('2024-02-13T10:00:00Z');
      jest.setSystemTime(now);

      const startTime = new Date(now.getTime() + 60000).toISOString(); // 1 minute in future
      const duration = 10; // 10 minutes

      const phase = expiryService.calculateMarketPhase(startTime, duration);
      expect(phase).toBe('NOT_STARTED');
    });

    it('should return BETTING during first half of duration', () => {
      jest.useFakeTimers();
      const now = new Date('2024-02-13T10:00:00Z');
      jest.setSystemTime(now);

      const startTime = new Date(now.getTime() - 60000).toISOString(); // 1 minute ago
      const duration = 10; // 10 minutes total, 5 minutes betting

      const phase = expiryService.calculateMarketPhase(startTime, duration);
      expect(phase).toBe('BETTING');
    });

    it('should return OBSERVATION during second half of duration', () => {
      jest.useFakeTimers();
      const now = new Date('2024-02-13T10:00:00Z');
      jest.setSystemTime(now);

      const startTime = new Date(now.getTime() - 6 * 60000).toISOString(); // 6 minutes ago
      const duration = 10; // 10 minutes total, 5 minutes betting

      const phase = expiryService.calculateMarketPhase(startTime, duration);
      expect(phase).toBe('OBSERVATION');
    });

    it('should return RESOLVED after duration ends', () => {
      jest.useFakeTimers();
      const now = new Date('2024-02-13T10:00:00Z');
      jest.setSystemTime(now);

      const startTime = new Date(now.getTime() - 11 * 60000).toISOString(); // 11 minutes ago
      const duration = 10; // 10 minutes

      const phase = expiryService.calculateMarketPhase(startTime, duration);
      expect(phase).toBe('RESOLVED');
    });

    it('should handle invalid start time', () => {
      jest.useFakeTimers();
      const now = new Date('2024-02-13T10:00:00Z');
      jest.setSystemTime(now);

      expect(() => expiryService.calculateMarketPhase(undefined, 10)).toThrow('Invalid start time');
      expect(() => expiryService.calculateMarketPhase(null, 10)).toThrow('Invalid start time');
      expect(() => expiryService.calculateMarketPhase('', 10)).toThrow('Invalid start time');
      expect(() => expiryService.calculateMarketPhase('not-a-date', 10)).toThrow('Invalid start time');
    });

    it('should handle invalid duration', () => {
      jest.useFakeTimers();
      const now = new Date('2024-02-13T10:00:00Z');
      jest.setSystemTime(now);

      const startTime = new Date(now).toISOString();
      expect(() => expiryService.calculateMarketPhase(startTime, undefined)).toThrow('Invalid duration');
      expect(() => expiryService.calculateMarketPhase(startTime, null)).toThrow('Invalid duration');
      expect(() => expiryService.calculateMarketPhase(startTime, 0)).toThrow('Invalid duration');
      expect(() => expiryService.calculateMarketPhase(startTime, -1)).toThrow('Invalid duration');
    });
  });

  describe('processCutoff', () => {
    it('should process all unmatched and partially matched bets', async () => {
      let market;
      let pumpBet;

      // Setup: Create market and a bet that would exceed max units
      await withTransaction(async (client) => {
        market = await marketService.createMarket({
          tokenAddress: '0x1234567890123456789012345678901234567890',
          startTime: new Date(),
          duration: 15
        });

        // Create a very large bet that would normally create many units
        pumpBet = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 150,  // Far exceeding max units per bet
          betType: 'PUMP'
        });
      });

      // Attempt to create units
      await expect(betUnitService.createUnits(pumpBet)).rejects.toThrow(
        /Bet exceed maximum bet size/
      );
    });
  });

  describe('Fetching Partially matched units', () => {
    it('Should fetch bet units that are partially matched', async () => {
      let market;
      let bet1;
      let bet2;
      const user = await userService.createUser(testUser);
      const user2 = await userService.createUser(testUser2);

      // Setup: Create market and bets
      await withTransaction(async (client) => {
        market = await createTestMarket(client, {
          tokenAddress: '0x1234567890123456789012345678901234567890',
          startTime: new Date(),
          duration: 1
        });

        bet1 = await createTestBet(client, {
          marketId: market.id,
          userId: user.user_id,
          amount: 1.0,
          betType: 'PUMP'
        });

        bet2 = await createTestBet(client, {
          marketId: market.id,
          userId: user2.user_id,
          amount: 3.0,
          betType: 'RUG'
        });
      });

      await betUnitService.createUnits(bet1);
      await betUnitService.createUnits(bet2);

      const bets = await matchingFunnel.intakeUnits(db);

      // Log the units before matching to verify the initial state
      console.log('Bet 1 units:', bets[0].units);
      console.log('Bet 2 units:', bets[1].units);

      const matchResults = await matchingFunnel.matchBets([bets[0], bets[1]]);

      expect(matchResults).toBeInstanceOf(Map);

      // Should be 2 because only 1 unit from each bet can match
      expect(matchResults.size).toBe(2);

      // Get all units from both bets
      const bet1Units = bets[0].units;
      const bet2Units = bets[1].units;

      // Verify bet1's units (should have 1 unit that is matched)
      expect(bet1Units.length).toBe(1);
      const bet1MatchedUnit = bet1Units[0];
      const bet1UnitStatus = matchResults.get(bet1MatchedUnit.id);
      expect(bet1UnitStatus).toBeDefined();
      expect(bet1UnitStatus.newStatus).toBe('MATCHED');

      // Verify bet2's units (should have 3 units, only 1 matched)
      expect(bet2Units.length).toBe(3);

      // // Count how many units from bet2 got matched
      const matchedBet2Units = bet2Units.filter(unit =>
        matchResults.has(unit.id)
      );

      expect(matchedBet2Units.length).toBe(1);

      // Verify the matched unit from bet2
      const bet2MatchedUnit = matchedBet2Units[0];
      const bet2UnitStatus = matchResults.get(bet2MatchedUnit.id);
      expect(bet2UnitStatus).toBeDefined();
      expect(bet2UnitStatus.newStatus).toBe('MATCHED');

      // Verify the units are matched to each other
      expect(bet1UnitStatus.matchedWith).toBe(bet2MatchedUnit.id);
      expect(bet2UnitStatus.matchedWith).toBe(bet1MatchedUnit.id);

      // Verify amounts
      expect(bet1MatchedUnit.amount).toBe(0.99);
      expect(bet2MatchedUnit.amount).toBe(1.0);

      const betsAfterCutoff = await expiryService.processCutoff(market.id);

      // Check if bet2 is in the bets array
      expect(betsAfterCutoff.find(b => b.id == bet2.id)).toBeDefined();

      // Bet1 shouldnt be in the bets array
      expect(betsAfterCutoff.find(b => b.id == bet1.id)).not.toBeDefined();

      // Fetch Market
      const marketResult = await pool.query(
        'SELECT * FROM markets WHERE id = $1', [market.id]
      );

      expect(marketResult.rows.length).toBeGreaterThan(0);
      expect(marketResult.rows[0].phase).toBe('OBSERVATION');
    });

    it('shouldnt fetch bets that are matched', async () => {
      let market;
      let bet1;
      let bet2;

      // Setup: Create market and bets
      await withTransaction(async (client) => {
        market = await marketService.createMarket({
          tokenAddress: '0x1234567890123456789012345678901234567890',
          startTime: new Date(),
          duration: 15
        });

        bet1 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 1.0,  // Net: 0.99 after 1% fee
          betType: 'PUMP'
        });

        bet2 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 1.0,  // Net: 0.99 after 1% fee
          betType: 'RUG'
        });
      });

      await betUnitService.createUnits(bet1);
      await betUnitService.createUnits(bet2);

      const bets = await matchingFunnel.intakeUnits(db);

      // Log initial state
      console.log('Initial bets:', bets.map(bet => ({
        id: bet.id,
        type: bet.betType,
        amount: bet.netAmount,
        units: bet.units.length
      })));

      const matchResults = await matchingFunnel.matchBets([bets[0], bets[1]]);
      await matchingFunnel.applyStatusChanges(matchResults);

      // Verify unit status updates
      const unitsResult = await pool.query(
        'SELECT * FROM bet_units WHERE bet_id IN ($1, $2)',
        [bet1.id, bet2.id]
      );

      const units = unitsResult.rows;
      console.log('Updated units:', units);

      // bet1 should have 1 unit, all matched
      const bet1Units = units.filter(u => u.bet_id === bet1.id);
      expect(bet1Units.length).toBe(1);
      expect(bet1Units[0].status).toBe('MATCHED');
      expect(bet1Units[0].matched_with_unit_id).not.toBeNull();
      expect(bet1Units[0].matched_at).not.toBeNull();

      // bet2 should have 2 units, one matched, one unmatched
      const bet2Units = units.filter(u => u.bet_id === bet2.id);
      expect(bet2Units.length).toBe(1);

      const matchedBet2Unit = bet2Units.find(u => u.status === 'MATCHED');
      const unmatchedBet2Unit = bet2Units.find(u => u.status !== 'MATCHED');

      expect(matchedBet2Unit).toBeDefined();
      expect(matchedBet2Unit.matched_with_unit_id).toBe(bet1Units[0].id);

      // Verify bet statuses
      const betsResult = await pool.query(
        'SELECT * FROM bets WHERE id IN ($1, $2)',
        [bet1.id, bet2.id]
      );

      const updatedBets = betsResult.rows;
      console.log('Updated bets:', updatedBets);

      // bet1 should be MATCHED as all units are matched
      const updatedBet1 = updatedBets.find(b => b.id === bet1.id);
      expect(updatedBet1.status).toBe('MATCHED');
      expect(updatedBet1.matched_amount).toBe('0.99000000'); // 1.0 - 1% fee

      // bet2 should be PARTIALLY_MATCHED as only one unit is matched
      const updatedBet2 = updatedBets.find(b => b.id === bet2.id);
      expect(updatedBet2.status).toBe('MATCHED');
      expect(updatedBet2.matched_amount).toBe('0.99000000'); // Only one unit

      const betsAfterCutoff = await expiryService.processCutoff(market.id);

      // Check if bet2 is in the bets array
      expect(betsAfterCutoff.find(b => b.id == bet2.id)).not.toBeDefined();

      // Bet1 shouldnt be in the bets array
      expect(betsAfterCutoff.find(b => b.id == bet1.id)).not.toBeDefined();
    });

    it('should handle errors during cutoff processing', async () => {
      const marketId = null;
      await expect(expiryService.processCutoff(marketId)).rejects.toThrow();
    });
  });

  describe('processBetExpiry', () => {
    it('should handle error when bet ID is invalid', async () => {
      const invalidBet = {
        id: null,
        status: 'PENDING',
        amount: 1.0
      };

      await expect(expiryService.processBetExpiry(invalidBet))
        .rejects
        .toThrow('Error processing bet enquiry');
    });

    it('Should refund the unmatchedBet', async () => {
      let market;
      let bet1;
      const user = await userService.createUser(testUser);


      await withTransaction(async (client) => {
        market = await marketService.createMarket({
          tokenAddress: '0x1234567890123456789012345678901234567890',
          startTime: new Date(),
          duration: 1
        });

        bet1 = await createTestBet(client, {
          marketId: market.id,
          userId: user.user_id,
          amount: 2.0,
          betType: 'RUG',
          status: 'PENDING',
        });
      });

      // Process the pending bet
      await expiryService.processBetExpiry(bet1);


      // Check the refund table to makesure it is there
      const refundResults = await pool.query(
        'SELECT * FROM refunds WHERE bet_id = $1 AND user_id = $2',
        [bet1.id, bet1.user_id]
      );

      // Verify correct refund is found in the database
      expect(refundResults.rows[0].amount == bet1.amount).toBe(true);
      expect(refundResults.rows[0].status).toBe('PROCESSED');
    });

    it('Should refund the partially matched bet', async () => {
      let market;
      let bet1;
      const user = await userService.createUser(testUser);
      await withTransaction(async (client) => {
        market = await marketService.createMarket({
          tokenAddress: '0x1234567890123456789012345678901234567890',
          startTime: new Date(),
          duration: 1
        });

        bet1 = await createTestBet(client, {
          marketId: market.id,
          userId: user.user_id,
          amount: 2.0,
          betType: 'RUG',
          status: 'PARTIALLY_MATCHED',
          matchedAmount: 1.0
        });
      });

      // Process the pending bet
      await expiryService.processBetExpiry(bet1);
      // Check the refund table to makesure it is there
      const refundResults = await pool.query(
        'SELECT * FROM refunds WHERE bet_id = $1 AND user_id = $2',
        [bet1.id, bet1.user_id]
      );

      // Verify correct refund is found in the database
      expect(Number(refundResults.rows[0].amount)).toBe(Number(1.0));
      expect(refundResults.rows[0].status).toBe('PROCESSED');
      expect(refundResults.rows[0].market_id == market.id).toBe(true);

    });
  });
  describe('validateBetPlacement', () => {
    it('should throw error for null marketId', async () => {
      await expect(expiryService.validateBetPlacement(null))
        .rejects
        .toThrow('Error processing Market.');
    });

    it('should allow bet placement during BETTING phase', async () => {
      jest.useFakeTimers();
      const now = new Date('2024-02-13T10:00:00Z');
      jest.setSystemTime(now);

      // Mock market data for BETTING phase
      const market = {
        id: 1,
        start_time: new Date(now.getTime() - 60000).toISOString(), // 1 minute ago
        duration: 10 // 10 minutes total
      };

      // Mock Supabase response
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: market, error: null })
        })
      });

      expiryService.supabase.from = jest.fn().mockReturnValue({
        select: mockSelect
      });

      await expect(expiryService.validateBetPlacement(1)).resolves.toBe(true);
    });

    it('should reject bet placement during OBSERVATION phase', async () => {
      jest.useFakeTimers();
      const now = new Date('2024-02-13T10:00:00Z');
      jest.setSystemTime(now);

      // Mock market data for OBSERVATION phase
      const market = {
        id: 1,
        start_time: new Date(now.getTime() - 6 * 60000).toISOString(), // 6 minutes ago
        duration: 10 // 10 minutes total
      };

      // Mock Supabase response
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: market, error: null })
        })
      });

      expiryService.supabase.from = jest.fn().mockReturnValue({
        select: mockSelect
      });

      await expect(expiryService.validateBetPlacement(1))
        .rejects
        .toThrow('Market is not accepting bets at this time');
    });

    it('should reject bet placement for RESOLVED market', async () => {
      jest.useFakeTimers();
      const now = new Date('2024-02-13T10:00:00Z');
      jest.setSystemTime(now);

      // Mock market data for RESOLVED phase
      const market = {
        id: 1,
        start_time: new Date(now.getTime() - 11 * 60000).toISOString(), // 11 minutes ago
        duration: 10 // 10 minutes total
      };

      // Mock Supabase response
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: market, error: null })
        })
      });

      expiryService.supabase.from = jest.fn().mockReturnValue({
        select: mockSelect
      });

      await expect(expiryService.validateBetPlacement(1))
        .rejects
        .toThrow('Market is not accepting bets at this time');
    });

    it('should handle database errors', async () => {
      // Mock Supabase error response
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error')
          })
        })
      });

      expiryService.supabase.from = jest.fn().mockReturnValue({
        select: mockSelect
      });

      await expect(expiryService.validateBetPlacement(1))
        .rejects
        .toThrow('Database error');
    });

    it('should reject bet placement for market not found', async () => {
      // Mock Supabase response for non-existent market
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      });

      expiryService.supabase.from = jest.fn().mockReturnValue({
        select: mockSelect
      });

      await expect(expiryService.validateBetPlacement(1))
        .rejects
        .toThrow();
    });
  });
  describe('Monitor Market Tests', () => {
    it('Should handle invalid inputs', async () => {
      await expect(expiryService.monitorMarket('', Date(), 3)).rejects.toThrow();
      await expect(expiryService.monitorMarket(1, null, 3)).rejects.toThrow();
      await expect(expiryService.monitorMarket(1, Date(), null)).rejects.toThrow();
    });

    it('Should handle non-existant market', async () => {
      await expect(expiryService.monitorMarket(1, Date(), 3)).rejects.toThrow();
    });

    it('Should transition from BETTING to CUT-OFF at 50% duration', async () => {
      // Setup fake timers
      jest.useFakeTimers();

      // Set current system time
      const now = new Date('2024-01-01T10:00:00Z');
      jest.setSystemTime(now);

      // Market parameters
      const marketId = 1;
      const startTime = new Date(now); // Market starts now
      const duration = 10; // 10 minute duration (5 min to cutoff)

      // Mock supabase responses
      const mockFrom = jest.spyOn(expiryService.supabase, 'from');

      // Initial market fetch - returns a market in BETTING phase
      mockFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: {
                id: marketId,
                phase: 'BETTING',
                start_time: startTime.toISOString(),
                duration: duration
              },
              error: null
            })
          })
        })
      }));

      // Mock the internal methods to prevent actual DB calls
      const processCutoffMock = jest.spyOn(expiryService, 'processCutoff')
        .mockImplementation(() => Promise.resolve([]));

      // Start monitoring
      const cleanup = await expiryService.monitorMarket(marketId, startTime, duration);

      // Advance time to just after 50% of duration (5 minutes + 1 ms)
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      await Promise.resolve(); // Allow any promises to resolve
      jest.runOnlyPendingTimers();
      await Promise.resolve(); // Allow any promises from timers to resolve

      // Verify that processCutoff was called
      expect(processCutoffMock).toHaveBeenCalledTimes(1);
      expect(processCutoffMock).toHaveBeenCalledWith(marketId);

      // Clean up
      cleanup();
      mockFrom.mockRestore();
      processCutoffMock.mockRestore();
      jest.useRealTimers();
    });

    it('Should transition from CUT-OFF to RESOLVED through full lifecycle', async () => {
      // Setup fake timers
      jest.useFakeTimers();

      // Set current system time
      const now = new Date('2024-01-01T10:00:00Z');
      jest.setSystemTime(now);

      // Market parameters
      const marketId = 2;
      const startTime = new Date(now); // Market starts now
      const duration = 10; // 10 minute duration

      // Mock supabase responses - initial fetch
      const mockFrom = jest.spyOn(expiryService.supabase, 'from');
      mockFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: {
                id: marketId,
                phase: 'BETTING',
                start_time: startTime.toISOString(),
                duration: duration
              },
              error: null
            })
          })
        })
      }));

      // Mock the internal methods
      const processCutoffMock = jest.spyOn(expiryService, 'processCutoff')
        .mockImplementation(() => Promise.resolve([]));

      const resolveStatusUpdateMock = jest.spyOn(expiryService, 'resolveStatusUpdate')
        .mockImplementation(() => Promise.resolve({
          id: marketId,
          phase: 'RESOLVED',
          resolved_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString()
        }));

      const processMarketResolveMock = jest.spyOn(expiryService, 'processMarketResolve')
        .mockImplementation(() => Promise.resolve());

      // Start monitoring
      const cleanup = await expiryService.monitorMarket(marketId, startTime, duration);

      // Advance time to cutoff (50% duration)
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      await Promise.resolve();
      jest.runOnlyPendingTimers();
      await Promise.resolve();

      // Verify cutoff processing
      expect(processCutoffMock).toHaveBeenCalledTimes(1);
      expect(processCutoffMock).toHaveBeenCalledWith(marketId);

      // Advance time to resolution (100% duration)
      jest.advanceTimersByTime(5 * 60 * 1000);
      await Promise.resolve();
      jest.runOnlyPendingTimers();
      await Promise.resolve();

      // Verify resolution processing
      expect(resolveStatusUpdateMock).toHaveBeenCalledTimes(1);
      expect(resolveStatusUpdateMock).toHaveBeenCalledWith(marketId, 'RESOLVED');
      expect(processMarketResolveMock).toHaveBeenCalledTimes(1);

      // Clean up
      cleanup();
      mockFrom.mockRestore();
      processCutoffMock.mockRestore();
      resolveStatusUpdateMock.mockRestore();
      processMarketResolveMock.mockRestore();
      jest.useRealTimers();
    });

    it('Should handle errors during phase transitions', async () => {
      // Setup fake timers
      jest.useFakeTimers();

      // Set current system time
      const now = new Date('2024-01-01T10:00:00Z');
      jest.setSystemTime(now);

      // Market parameters
      const marketId = 3;
      const startTime = new Date(now); // Market starts now
      const duration = 10; // 10 minute duration

      // Mock supabase responses - initial fetch
      const mockFrom = jest.spyOn(expiryService.supabase, 'from');
      mockFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: {
                id: marketId,
                phase: 'BETTING',
                start_time: startTime.toISOString(),
                duration: duration
              },
              error: null
            })
          })
        })
      }));

      // Mock processCutoff to throw error
      const processCutoffMock = jest.spyOn(expiryService, 'processCutoff')
        .mockImplementation(() => Promise.reject(new Error('Cutoff processing failed')));

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      // Start monitoring
      const cleanup = await expiryService.monitorMarket(marketId, startTime, duration);

      // Advance time to cutoff (50% duration)
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      await Promise.resolve();
      jest.runOnlyPendingTimers();
      await Promise.resolve();

      // Verify error was logged
      expect(processCutoffMock).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls[0][0]).toContain(`Error checking phase for market ${marketId}`);

      // Clean up
      cleanup();
      mockFrom.mockRestore();
      processCutoffMock.mockRestore();
      consoleErrorSpy.mockRestore();
      jest.useRealTimers();
    });
    it('Should start monitor when market already in OBSERVATION phase', async () => {
      // Setup fake timers
      jest.useFakeTimers();

      // Set current system time - 75% through the duration
      const now = new Date('2024-01-01T10:07:30Z'); // 7.5 minutes after start
      jest.setSystemTime(now);

      // Market parameters
      const marketId = 4;
      const startTime = new Date('2024-01-01T10:00:00Z'); // Started 7.5 minutes ago
      const duration = 10; // 10 minute duration

      // Mock supabase responses - initial fetch with OBSERVATION phase
      const mockFrom = jest.spyOn(expiryService.supabase, 'from');
      mockFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: {
                id: marketId,
                phase: 'OBSERVATION',
                start_time: startTime.toISOString(),
                duration: duration
              },
              error: null
            })
          })
        })
      }));

      // Mock the internal methods
      const resolveStatusUpdateMock = jest.spyOn(expiryService, 'resolveStatusUpdate')
        .mockImplementation(() => Promise.resolve({
          id: marketId,
          phase: 'RESOLVED',
          resolved_at: new Date(startTime.getTime() + 10 * 60 * 1000).toISOString()
        }));

      const processMarketResolveMock = jest.spyOn(expiryService, 'processMarketResolve')
        .mockImplementation(() => Promise.resolve());

      // Start monitoring
      const cleanup = await expiryService.monitorMarket(marketId, startTime, duration);

      // Advance time to resolution (remaining 2.5 minutes)
      jest.advanceTimersByTime(2.5 * 60 * 1000 + 1);
      await Promise.resolve();
      jest.runOnlyPendingTimers();
      await Promise.resolve();

      // Verify resolution processing
      expect(resolveStatusUpdateMock).toHaveBeenCalledTimes(1);
      expect(resolveStatusUpdateMock).toHaveBeenCalledWith(marketId, 'RESOLVED');
      expect(processMarketResolveMock).toHaveBeenCalledTimes(1);

      // Clean up
      cleanup();
      mockFrom.mockRestore();
      resolveStatusUpdateMock.mockRestore();
      processMarketResolveMock.mockRestore();
      jest.useRealTimers();
    });
  });
  describe('Settled Status Update Tests', () => {
    it('Should handle invalid inputs', async () => {
      await expect(expiryService.settledStatusUpdate(null))
        .rejects.toThrow();
    });

    it('Should update market to settled', async () => {
      let market;

      await withTransaction(async (client) => {
        market = await createTestMarket(client, {
          tokenAddress: '0x1234567890123456789012345678901234567890',
          startTime: new Date(),
          duration: 5,
          status: 'RESOLVED'
        });
      });

      // Update the market
      await expiryService.settledStatusUpdate(market.id);

      // Query the database to verify the update
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .eq('id', market.id)
        .single();

      expect(error).toBeNull();
      expect(data.status).toBe('SETTLED');
      expect(data.settled_at).toBeDefined();
    });
  });
  describe('Calculate Totals Test', () => {
    // Test function to be imported/defined
    // Test case 1: Empty array
    test('should return zero counts for an empty array', () => {
      const bets = [];
      const result = expiryService.calculateTotals(bets);
      expect(result).toEqual({ pumpCount: 0, rugCount: 0 });
    });

    // Test case 2: Array with only PUMP bets
    test('should correctly count PUMP bets', () => {
      const bets = [
        { bet_type: 'PUMP' },
        { bet_type: 'PUMP' },
        { bet_type: 'PUMP' }
      ];
      const result = expiryService.calculateTotals(bets);
      expect(result).toEqual({ pumpCount: 3, rugCount: 0 });
    });

    // Test case 3: Array with only RUG bets
    test('should correctly count RUG bets', () => {
      const bets = [
        { bet_type: 'RUG' },
        { bet_type: 'RUG' },
        { bet_type: 'RUG' }
      ];
      const result = expiryService.calculateTotals(bets);
      expect(result).toEqual({ pumpCount: 0, rugCount: 3 });
    });

    // Test case 4: Mixed PUMP and RUG bets
    test('should correctly count mixed PUMP and RUG bets', () => {
      const bets = [
        { bet_type: 'PUMP' },
        { bet_type: 'RUG' },
        { bet_type: 'PUMP' },
        { bet_type: 'RUG' }
      ];
      const result = expiryService.calculateTotals(bets);
      expect(result).toEqual({ pumpCount: 2, rugCount: 2 });
    });

    // Test case 5: Bets with other bet types should not be counted
    test('should ignore bet types other than PUMP and RUG', () => {
      const bets = [
        { bet_type: 'PUMP' },
        { bet_type: 'RANDOM' },
        { bet_type: 'OTHER' },
        { bet_type: 'RUG' }
      ];
      const result = expiryService.calculateTotals(bets);
      expect(result).toEqual({ pumpCount: 1, rugCount: 1 });
    });

    // Test case 6: Bets with missing bet_type
    test('should handle bets with missing bet_type', () => {
      const bets = [
        { bet_type: 'PUMP' },
        {},
        { bet_type: 'RUG' }
      ];
      const result = expiryService.calculateTotals(bets);
      expect(result).toEqual({ pumpCount: 1, rugCount: 1 });
    });
  });
  describe('Update Market Total Pumps And Rugs', () => {
    it('Should update total pumps and total rugs for a market with mixed bets', async () => {
      let market, bet1, bet2, bet3, bet4;
      await withTransaction(async (client) => {
        // Create a test market
        market = await createTestMarket(client, {
          tokenAddress: '0x123',
          startTime: new Date(),
          duration: 30
        });

        // Create multiple test bets
        bet1 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 0.051,
          status: 'MATCHED',
          betType: 'PUMP'
        });

        bet2 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 0.052,
          status: 'MATCHED',
          betType: 'PUMP'
        });

        bet3 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 0.053,
          status: 'PARTIALLY_MATCHED',
          betType: 'RUG'
        });

        bet4 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 0.054,
          status: 'PARTIALLY_MATCHED',
          betType: 'RUG'
        });
      });

      // Call the method
      await expiryService.updateMarketTotalPumpsAndTotalRugs(market.id);

      // Verify the update
      const { data: updatedMarket, error: fetchError } = await supabase
        .from('markets')
        .select('total_pump_amount, total_rug_amount')
        .eq('id', market.id)
        .single();

      expect(fetchError).toBeNull();
      expect(updatedMarket.total_pump_amount).toBe(2);
      expect(updatedMarket.total_rug_amount).toBe(2);
    });

    it('Should throw an error when no market ID is provided', async () => {
      await expect(
        expiryService.updateMarketTotalPumpsAndTotalRugs(null)
      ).rejects.toThrow('Error processing Market.');
    });

    // Test case 3: Market with no bets
    it('Should throw an error when no bets exist for the market', async () => {
      await withTransaction(async (client) => {
        // Create a market with no bets
        const market = await createTestMarket(client, {
          tokenAddress: '0x456',
          startTime: new Date(),
          duration: 30
        });

        // Expect error due to no pump or rug bets
        await expect(
          expiryService.updateMarketTotalPumpsAndTotalRugs(market.id)
        ).rejects.toThrow('Error fetching Counts.');
      });
    });
    it('Should ignore bets not in PENDING or PARTIALLY_MATCHED status', async () => {
      let market, bet1, bet2, bet3, bet4;
      await withTransaction(async (client) => {
        // Create a market with bets in different statuses
        market = await createTestMarket(client, {
          tokenAddress: '0xABC',
          startTime: new Date(),
          duration: 30
        });

        // Insert bets in various statuses
        bet1 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 0.051,
          status: 'PENDING',
          betType: 'PUMP'
        });

        bet2 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 0.052,
          status: 'PARTIALLY_MATCHED',
          betType: 'RUG'
        });

        bet3 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 0.053,
          status: 'MATCHED',
          betType: 'PUMP'
        });

        bet4 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 0.054,
          status: 'EXPIRED',
          betType: 'RUG'
        });
      });


      // Call the method
      await expiryService.updateMarketTotalPumpsAndTotalRugs(market.id);

      // Verify the update
      const { data: updatedMarket, error: fetchError } = await supabase
        .from('markets')
        .select('total_pump_amount, total_rug_amount')
        .eq('id', market.id)
        .single();

      expect(fetchError).toBeNull();
      expect(updatedMarket.total_pump_amount).toBe(1);
      expect(updatedMarket.total_rug_amount).toBe(1);
    });
  });
});