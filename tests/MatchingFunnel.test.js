const { pool } = require('../tests/utils/db-config');
const PostgresDatabase = require('../services/PostgresDatabase');
const MatchingFunnel = require('../services/MatchingFunnel');
const MarketService = require('../services/MarketService');
const BetUnitService = require('../services/BetUnitService');
const StatusUpdateService = require('../services/StatusUpdateService');
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
  createTestBet
} = require('../tests/utils/db-helper');

const { v4: uuidv4 } = require('uuid');

describe('Matching Funnel Tests', () => {
  let db;
  let matchingFunnel;
  let marketService;
  let betUnitService;
  let statusUpdateService;
  let eventEmitter;

  beforeAll(async () => {
    db = new PostgresDatabase(pool);

    marketService = new MarketService(supabase, pool);

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

  describe('Basic Matching Scenarios', () => {
    it('should match exact size bets of opposite types', async () => {
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
          amount: 1.0,
          betType: 'PUMP'
        });

        bet2 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 1.0,
          betType: 'RUG'
        });
      });

      await betUnitService.createUnits(bet1);
      await betUnitService.createUnits(bet2);

      const bets = await matchingFunnel.intakeUnits(db);
      const matchResults = await matchingFunnel.matchBets([bets[0], bets[1]]);

      // Proper assertions for a Map object
      expect(matchResults).toBeInstanceOf(Map);

      // Since each bet has one unit and they match each other,
      // we should have 2 entries in the Map (one for each unit)
      expect(matchResults.size).toBe(2);

      // Get the units from the bets
      const unit1 = bets[0].units[0];
      const unit2 = bets[1].units[0];

      // Check the match status for each unit
      const unit1Status = matchResults.get(unit1.id);
      const unit2Status = matchResults.get(unit2.id);

      expect(unit1Status).toBeDefined();
      expect(unit2Status).toBeDefined();

      // Verify the match details
      expect(unit1Status.newStatus).toBe('MATCHED');
      expect(unit2Status.newStatus).toBe('MATCHED');

      expect(unit1Status.matchedWith).toBe(unit2.id);
      expect(unit2Status.matchedWith).toBe(unit1.id);
    });

    it('should handle partial matches', async () => {
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
          amount: 1.0,
          betType: 'PUMP'
        });

        bet2 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
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
    });

    it('should respect minimum match size', async () => {
      // Create bets smaller than minimum match size
      // Verify no matching occurs
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
          amount: 0.1,
          betType: 'PUMP'
        });

        bet2 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 1.0,
          betType: 'RUG'
        });
      });

      await betUnitService.createUnits(bet1);
      await betUnitService.createUnits(bet2);

      const bets = await matchingFunnel.intakeUnits(db);

      console.log('Bet 1 units:', bets[0].units);
      console.log('Bet 2 units:', bets[1].units);

      const matchResults = await matchingFunnel.matchBets([bets[0], bets[1]]);

      expect(matchResults).toBeInstanceOf(Map);

      // Should be 2 because only 1 unit from each bet can match
      expect(matchResults.size).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple bets with varied sizes', async () => {
      let market;
      let pumpBet1, pumpBet2, rugBet1, rugBet2;

      // Setup: Create market and multiple bets
      await withTransaction(async (client) => {
        market = await marketService.createMarket({
          tokenAddress: '0x1234567890123456789012345678901234567890',
          startTime: new Date(),
          duration: 15
        });

        // Create PUMP bets
        pumpBet1 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 0.5,  // Net: 0.495
          betType: 'PUMP'
        });

        pumpBet2 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 1.0,  // Net: 0.99
          betType: 'PUMP'
        });

        // Create RUG bets
        rugBet1 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 0.8,  // Net: 0.792
          betType: 'RUG'
        });

        rugBet2 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 2.0,  // Net: 1.98
          betType: 'RUG'
        });
      });

      // Create units for all bets
      await betUnitService.createUnits(pumpBet1);
      await betUnitService.createUnits(pumpBet2);
      await betUnitService.createUnits(rugBet1);
      await betUnitService.createUnits(rugBet2);

      const bets = await matchingFunnel.intakeUnits(db);
      const matchResults = await matchingFunnel.matchBets(bets);

      expect(matchResults).toBeInstanceOf(Map);

      // Log initial state to help debug
      console.log('All bets:', bets.map(bet => ({
        id: bet.id,
        type: bet.betType,
        amount: bet.netAmount,
        units: bet.units.length
      })));

      // Check matched pairs in matchResults
      const matchedPairs = new Set();
      matchResults.forEach((status, unitId) => {
        matchedPairs.add(`${unitId}-${status.matchedWith}`);
      });

      console.log('Matched pairs:', matchedPairs);

      // Since we have:
      // PUMP: 0.495 + 0.99 = 1.485 total PUMP
      // RUG: 0.792 + 1.98 = 2.772 total RUG
      // We expect the smaller amount (1.485) to be fully matched

      const totalMatchedUnits = matchResults.size;
      expect(totalMatchedUnits % 2).toBe(0); // Should be even number as units are matched in pairs

      // Get all PUMP and RUG units
      const pumpUnits = bets
        .filter(bet => bet.betType === 'PUMP')
        .flatMap(bet => bet.units);

      const rugUnits = bets
        .filter(bet => bet.betType === 'RUG')
        .flatMap(bet => bet.units);

      // Count matched units for each type
      const matchedPumpUnits = pumpUnits.filter(unit => matchResults.has(unit.id));
      const matchedRugUnits = rugUnits.filter(unit => matchResults.has(unit.id));

      // Verify equal number of PUMP and RUG units were matched
      expect(matchedPumpUnits.length).toBe(matchedRugUnits.length);

      // Each matched unit should have a corresponding match
      matchedPumpUnits.forEach(pumpUnit => {
        const pumpStatus = matchResults.get(pumpUnit.id);
        expect(pumpStatus).toBeDefined();
        expect(pumpStatus.newStatus).toBe('MATCHED');

        // Verify the matched RUG unit exists and references back
        const rugStatus = matchResults.get(pumpStatus.matchedWith);
        expect(rugStatus).toBeDefined();
        expect(rugStatus.newStatus).toBe('MATCHED');
        expect(rugStatus.matchedWith).toBe(pumpUnit.id);
      });
    });
  });

  describe('Saving State Changes', () => {
    it('should persist matched unit statuses to database', async () => {
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
          amount: 1.0,
          betType: 'PUMP'
        });

        bet2 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 1.0,
          betType: 'RUG'
        });
      });

      await betUnitService.createUnits(bet1);
      await betUnitService.createUnits(bet2);

      const bets = await matchingFunnel.intakeUnits(db);
      const matchResults = await matchingFunnel.matchBets([bets[0], bets[1]]);

      // Apply the status changes
      await matchingFunnel.applyStatusChanges(matchResults);

      // Verify database state after applying changes
      const bet1UnitsResult = await pool.query(
        'SELECT * FROM bet_units WHERE bet_id = $1',
        [bet1.id]
      );

      const bet2UnitsResult = await pool.query(
        'SELECT * FROM bet_units WHERE bet_id = $1',
        [bet2.id]
      );

      const bet1Units = bet1UnitsResult.rows;
      const bet2Units = bet2UnitsResult.rows;

      console.log('Bet units: 1: ', bet1Units, '2:', bet2Units);

      // Should have one unit each
      expect(bet1Units.length).toBe(1);
      expect(bet2Units.length).toBe(1);

      const unit1 = bet1Units[0];
      const unit2 = bet2Units[0];

      // Verify unit statuses
      expect(unit1.status).toBe('MATCHED');
      expect(unit2.status).toBe('MATCHED');

      // Verify units are matched to each other
      expect(unit1.matched_with_unit_id).toBe(unit2.id);
      expect(unit2.matched_with_unit_id).toBe(unit1.id);

      // Verify matched_at timestamps are set
      expect(unit1.matched_at).toBeDefined();
      expect(unit2.matched_at).toBeDefined();
    });

    it('should update unit statuses and delegate bet status updates to StatusUpdateService', async () => {
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
      expect(updatedBet2.matched_amount).toBe('0.99000000'); // Only one unit matched
    });
  });

  describe('Unit Splitting Scenarios', () => {
    it('should not split when remainder would be below minimum size', async () => {
      let market;
      let bet1;
      let bet2;

      // Setup: Create market and bets with different amounts
      await withTransaction(async (client) => {
        market = await marketService.createMarket({
          tokenAddress: '0x1234567890123456789012345678901234567890',
          startTime: new Date(),
          duration: 15
        });

        bet1 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 1,  // Larger bet to ensure splitting
          betType: 'PUMP'
        });

        bet2 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 0.97,
          betType: 'RUG'
        });
      });

      await betUnitService.createUnits(bet1);
      await betUnitService.createUnits(bet2);

      const bets = await matchingFunnel.intakeUnits(db);
      const matchResults = await matchingFunnel.matchBets([bets[0], bets[1]]);

      expect(matchResults).toBeInstanceOf(Map);

      // Should have more than 2 entries due to splitting
      expect(matchResults.size).toBe(2);
      // Should match full 1 SOL to 0.97 SOL instead of splitting

      // Verify bet statuses
      const betsResult = await pool.query(
        'SELECT * FROM bets WHERE id IN ($1, $2)',
        [bet1.id, bet2.id]
      );

      const updatedBets = betsResult.rows;

      const updatedBet2 = updatedBets.find(b => b.id === bet2.id);
      expect(updatedBet2.status).toBe('MATCHED');

      // After your existing test code, add:

      // Verify unit status and amounts in database
      const unitsResult = await pool.query(
        'SELECT * FROM bet_units WHERE bet_id IN ($1, $2)',
        [bet1.id, bet2.id]
      );

      const units = unitsResult.rows;

      // bet1 should have exactly one unit that was NOT split
      const bet1Units = units.filter(u => u.bet_id === bet1.id);
      expect(bet1Units.length).toBe(1);
      expect(parseFloat(bet1Units[0].amount)).toBe(0.99); // 1 SOL - 1% fee

      // bet2 should have exactly one unit
      const bet2Units = units.filter(u => u.bet_id === bet2.id);
      expect(bet2Units.length).toBe(1);
      expect(parseFloat(bet2Units[0].amount)).toBe(0.9603); // 0.97 - 1% fee = 0.9603

      // Verify units are matched
      expect(bet1Units[0].matched_with_unit_id).toBe(bet2Units[0].id);
      expect(bet2Units[0].matched_with_unit_id).toBe(bet1Units[0].id);
    });

    it('should split unit when remainder is above minimum size', async () => {
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
          amount: 1.5,  // Will be split
          betType: 'PUMP'
        });

        bet2 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 1.0,
          betType: 'RUG'
        });
      });

      await betUnitService.createUnits(bet1);
      await betUnitService.createUnits(bet2);

      const bets = await matchingFunnel.intakeUnits(db);
      const matchResults = await matchingFunnel.matchBets([bets[0], bets[1]]);

      // Verify units in database
      const unitsResult = await pool.query(
        'SELECT * FROM bet_units WHERE bet_id IN ($1, $2) ORDER BY amount DESC',
        [bet1.id, bet2.id]
      );

      const units = unitsResult.rows;

      // bet1 should now have two units (after split)
      const bet1Units = units.filter(u => u.bet_id === bet1.id);
      expect(bet1Units.length).toBe(2);

      // Verify split amounts (accounting for 1% fee)
      const largerUnit = bet1Units.find(u => parseFloat(u.amount) === 1);
      const smallerUnit = bet1Units.find(u => parseFloat(u.amount) === 0.485);
      expect(parseFloat(largerUnit.amount)).toBe(1);  // No additional fee
      expect(parseFloat(smallerUnit.amount)).toBe(0.485); // No additional fee

      // bet2 should have one unit
      const bet2Units = units.filter(u => u.bet_id === bet2.id);
      expect(bet2Units.length).toBe(1);
      expect(parseFloat(bet2Units[0].amount)).toBe(0.99);// 1.0 - 1% fee

      // Verify matching
      expect(largerUnit.matched_with_unit_id).toBe(bet2Units[0].id);
      expect(smallerUnit.matched_with_unit_id).toBeNull(); // Should remain unmatched
      expect(bet2Units[0].matched_with_unit_id).toBe(largerUnit.id);
    });
  });

  describe('Unit Splitting Tests', () => {
    it('should not split when remainder would be below minimum size', async () => {
      let market;
      let bet1;
      let bet2;

      await withTransaction(async (client) => {
        market = await marketService.createMarket({
          tokenAddress: '0x1234567890123456789012345678901234567890',
          startTime: new Date(),
          duration: 15
        });

        bet1 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 1,
          betType: 'PUMP'
        });

        bet2 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 0.97,
          betType: 'RUG'
        });
      });

      await betUnitService.createUnits(bet1);
      await betUnitService.createUnits(bet2);

      const bets = await matchingFunnel.intakeUnits(db);
      const matchResults = await matchingFunnel.matchBets([bets[0], bets[1]]);

      const unitsResult = await pool.query(
        'SELECT * FROM bet_units WHERE bet_id IN ($1, $2)',
        [bet1.id, bet2.id]
      );

      const units = unitsResult.rows;

      const bet1Units = units.filter(u => u.bet_id === bet1.id);
      expect(bet1Units.length).toBe(1);
      expect(parseFloat(bet1Units[0].amount)).toBe(0.99); // 1.0 - 1% fee

      const bet2Units = units.filter(u => u.bet_id === bet2.id);
      expect(bet2Units.length).toBe(1);
      expect(parseFloat(bet2Units[0].amount)).toBe(0.9603); // 0.97 - 1% fee

      expect(bet1Units[0].matched_with_unit_id).toBe(bet2Units[0].id);
      expect(bet2Units[0].matched_with_unit_id).toBe(bet1Units[0].id);
    });
  });

  describe('Unit Splitting Advanced Scenarios', () => {
    it('should handle complex multiple split scenarios', async () => {
      let market;
      let pumpBet;
      let rugBet;

      // Setup: Create market and bets with complex amounts
      await withTransaction(async (client) => {
        market = await marketService.createMarket({
          tokenAddress: '0x1234567890123456789012345678901234567890',
          startTime: new Date(),
          duration: 15
        });

        pumpBet = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 3.5,  // Complex amount to trigger multiple splits
          betType: 'PUMP'
        });

        rugBet = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 3.0,
          betType: 'RUG'
        });
      });

      await betUnitService.createUnits(pumpBet);
      await betUnitService.createUnits(rugBet);

      const bets = await matchingFunnel.intakeUnits(db);
      const matchResults = await matchingFunnel.matchBets([bets[0], bets[1]]);

      // Verify units in database
      const unitsResult = await pool.query(
        'SELECT * FROM bet_units WHERE bet_id IN ($1, $2) ORDER BY amount DESC',
        [pumpBet.id, rugBet.id]
      );

      const units = unitsResult.rows;

      // PUMP bet splitting logic
      const pumpUnits = units.filter(u => u.bet_id === pumpBet.id);
      expect(pumpUnits.length).toBeGreaterThan(1);

      // Verify total amount matches original bet amount after fee
      const pumpNetAmount = 3.5 * 0.99; // 1% fee
      const pumpTotalUnitAmount = pumpUnits.reduce((sum, unit) => sum + parseFloat(unit.amount), 0);
      expect(Math.abs(pumpTotalUnitAmount - pumpNetAmount)).toBeLessThan(0.001);

      // RUG bet splitting logic
      const rugUnits = units.filter(u => u.bet_id === rugBet.id);
      expect(rugUnits.length).toBeGreaterThan(1);

      // Verify total amount matches original bet amount after fee
      const rugNetAmount = 3.0 * 0.99; // 1% fee
      const rugTotalUnitAmount = rugUnits.reduce((sum, unit) => sum + parseFloat(unit.amount), 0);
      expect(Math.abs(rugTotalUnitAmount - rugNetAmount)).toBeLessThan(0.001);

      // Verify matching
      const matchedPumpUnits = pumpUnits.filter(u => u.matched_with_unit_id !== null);
      const matchedRugUnits = rugUnits.filter(u => u.matched_with_unit_id !== null);

      expect(matchedPumpUnits.length).toBeGreaterThan(0);
      expect(matchedRugUnits.length).toBeGreaterThan(0);
    });

    it('should handle edge case with near-minimum bet amounts', async () => {
      let market;
      let pumpBet;
      let rugBet;

      // Setup: Create market and bets with amounts close to minimum
      await withTransaction(async (client) => {
        market = await marketService.createMarket({
          tokenAddress: '0x1234567890123456789012345678901234567890',
          startTime: new Date(),
          duration: 15
        });

        pumpBet = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 0.2,  // Just above minimum, but with fee will be close to minimum
          betType: 'PUMP'
        });

        rugBet = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
          amount: 0.21,
          betType: 'RUG'
        });
      });

      await betUnitService.createUnits(pumpBet);
      await betUnitService.createUnits(rugBet);

      const bets = await matchingFunnel.intakeUnits(db);
      const matchResults = await matchingFunnel.matchBets([bets[0], bets[1]]);

      // Verify units in database
      const unitsResult = await pool.query(
        'SELECT * FROM bet_units WHERE bet_id IN ($1, $2) ORDER BY amount DESC',
        [pumpBet.id, rugBet.id]
      );

      const units = unitsResult.rows;

      // PUMP bet verification
      const pumpUnits = units.filter(u => u.bet_id === pumpBet.id);
      const pumpNetAmount = 0.2 * 0.99; // 1% fee

      expect(pumpUnits.length).toBe(1);
      expect(Math.abs(parseFloat(pumpUnits[0].amount) - pumpNetAmount)).toBeLessThan(0.001);

      // RUG bet verification
      const rugUnits = units.filter(u => u.bet_id === rugBet.id);
      const rugNetAmount = 0.21 * 0.99; // 1% fee

      expect(rugUnits.length).toBe(1);
      expect(Math.abs(parseFloat(rugUnits[0].amount) - rugNetAmount)).toBeLessThan(0.001);
    });
    it('should handle maximum units per bet constraint', async () => {
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
          amount: 1.0,
          betType: 'PUMP'
        });

        bet2 = await createTestBet(client, {
          marketId: market.id,
          userId: uuidv4(),
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

      // We need to makesure that fetchUnMatchedBets are retrieving partially matched bets
      const unMatchedBets = await matchingFunnel.intakeUnits(db);

      expect(unMatchedBets.find(b =>b.id == bet2.id)).toBeDefined();
    });
  });

  describe('Bet status changed when partially matched', () => {
      it ('Should change bet status to partially matched', async () => {
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
            amount: 1.0,
            betType: 'PUMP'
          });
  
          bet2 = await createTestBet(client, {
            marketId: market.id,
            userId: uuidv4(),
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

        const betsResults = await pool.query(
          'SELECT * FROM bets WHERE id IN ($1,$2)',[bet1.id, bet2.id]
        );

        const updatedResults = betsResults.rows;

        const updatedBet2 = updatedResults.find(b => b.id == bet2.id);

        expect(updatedBet2.status).toBe('PARTIALLY_MATCHED');

        const updatedBet1 = updatedResults.find(b => b.id == bet1.id);

        expect(updatedBet1.status).toBe('MATCHED');
      
      });
  });
});