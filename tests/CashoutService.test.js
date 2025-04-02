// tests/services/CashoutService.test.js
const CashoutService = require('../services/CashoutService');
const UserService = require('../services/UserService');
const { pool } = require('../tests/utils/db-config');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const {
  cleanDatabases,
  create
} = require('../tests/utils/db-helper');

const testUserData = {
  wallet_ca: uuidv4(),
  username: 'testy',
  profilePic: 'https://img.com/pic1.jpg'
};

describe('CashoutService Tests', () => {
  let userService;
  let cashoutService;
  let testUser;

  beforeAll(async () => {
    userService = new UserService(supabase);
    cashoutService = new CashoutService(supabase, userService);
  });

  beforeEach(async () => {
    await cleanDatabases(pool);
    // Create a fresh test user for each test
    testUser = await userService.createUser({
      wallet_ca: uuidv4(), // Generate unique wallet for each test
      username: `testy_${Date.now()}`,
      profilePic: 'https://img.com/pic1.jpg'
    });
    // Add balance to test user
    await userService.updateBalance(testUser.user_id, 100.0);
  });

  describe('Creating Cashouts', () => {
    it('Should create a new cashout', async () => {
      const cashoutWallet_ca = uuidv4();
      
      // Create Cashout
      const cashoutResult = await cashoutService.createCashout(
        testUser.user_id, 
        50.0, 
        cashoutWallet_ca
      );
      
      // Fetch Cashout to make sure it's been saved
      const { data, error } = await supabase
        .from('cashouts')
        .select('*')
        .eq('userId', testUser.user_id)
        .single();
      
      const cashout = data;
      
      expect(cashout.userId).toBe(testUser.user_id);
      expect(parseFloat(cashout.amount)).toBe(50.0);
      expect(cashout.wallet_ca).toBe(cashoutWallet_ca);
      expect(cashout.status).toBe('pending');
    });

    it('Should deduct balance from user when creating cashout', async () => {
      const initialBalance = 100.0;
      const cashoutAmount = 75.0;
      const expectedBalance = initialBalance - cashoutAmount;
      
      // Create Cashout
      await cashoutService.createCashout(
        testUser.user_id, 
        cashoutAmount, 
        uuidv4()
      );
      
      // Check user balance after cashout
      const updatedUser = await userService.getUserById(testUser.user_id);
      
      expect(parseFloat(updatedUser.balance)).toBe(expectedBalance);
    });

    it('Should throw error when attempting cashout with insufficient balance', async () => {
      const excessiveAmount = 150.0; // More than the 100.0 balance
      
      await expect(
        cashoutService.createCashout(testUser.user_id, excessiveAmount, uuidv4())
      ).rejects.toThrow('Insufficient balance');
      
      // Verify no cashout was created
      const { data } = await supabase
        .from('cashouts')
        .select('*')
        .eq('userId', testUser.user_id);
      
      expect(data.length).toBe(0);
    });

    it('Should throw error with invalid user ID', async () => {
      const invalidUserId = uuidv4(); // Random non-existent ID
      
      await expect(
        cashoutService.createCashout(invalidUserId, 50.0, uuidv4())
      ).rejects.toThrow('User not found');
    });

    it('Should throw error with missing required fields', async () => {
      // Missing amount
      await expect(
        cashoutService.createCashout(testUser.user_id, null, uuidv4())
      ).rejects.toThrow('Missing required fields');
      
      // Missing wallet_ca
      await expect(
        cashoutService.createCashout(testUser.user_id, 50.0, null)
      ).rejects.toThrow('Missing required fields');
      
      // Missing userId
      await expect(
        cashoutService.createCashout(null, 50.0, uuidv4())
      ).rejects.toThrow('Missing required fields');
    });
  });

  describe('Fetching Cashouts', () => {
    beforeEach(async () => {
      // Create multiple cashouts for testing
      await cashoutService.createCashout(testUser.user_id, 10.0, uuidv4());
      await cashoutService.createCashout(testUser.user_id, 15.0, uuidv4());
      await cashoutService.createCashout(testUser.user_id, 20.0, uuidv4());
    });

    it('Should fetch all cashouts', async () => {
      const cashouts = await cashoutService.fetchCashouts();
      
      expect(cashouts.length).toBeGreaterThanOrEqual(3);
      
      // Check if our test user's cashouts are included
      const userCashouts = cashouts.filter(c => c.userId === testUser.user_id);
      expect(userCashouts.length).toBe(3);
    });
  });

  describe('Updating Cashouts', () => {
    let testCashout;
    
    beforeEach(async () => {
      // Create a cashout for testing updates
      const cashoutWallet_ca = uuidv4();
      const { data } = await supabase
        .from('cashouts')
        .insert([{
          userId: testUser.user_id,
          amount: 25.0,
          wallet_ca: cashoutWallet_ca,
          status: 'pending'
        }])
        .select()
        .single();
      
      testCashout = data;
    });

    it('Should update cashout status to processing', async () => {
      const updatedCashout = await cashoutService.updateCashout(
        testCashout.id, 
        'processing'
      );
      
      expect(updatedCashout.status).toBe('processing');
      
      // Verify in database
      const { data } = await supabase
        .from('cashouts')
        .select('*')
        .eq('id', testCashout.id)
        .single();
      
      expect(data.status).toBe('processing');
    });

    it('Should update cashout status to completed', async () => {
      const updatedCashout = await cashoutService.updateCashout(
        testCashout.id, 
        'completed'
      );
      
      expect(updatedCashout.status).toBe('completed');
    });

    it('Should refund user when cancelling a cashout', async () => {
      const initialBalance = parseFloat(
        (await userService.getUserById(testUser.user_id)).balance
      );
      const cashoutAmount = parseFloat(testCashout.amount);
      
      // Cancel the cashout
      await cashoutService.updateCashout(testCashout.id, 'cancelled');
      
      // Check user balance after cancellation
      const updatedUser = await userService.getUserById(testUser.user_id);
      const newBalance = parseFloat(updatedUser.balance);
      
      // Balance should be restored
      expect(newBalance).toBe(initialBalance + cashoutAmount);
    });

    it('Should refund user when marking a cashout as failed', async () => {
      const initialBalance = parseFloat(
        (await userService.getUserById(testUser.user_id)).balance
      );
      const cashoutAmount = parseFloat(testCashout.amount);
      
      // Mark the cashout as failed
      await cashoutService.updateCashout(testCashout.id, 'failed');
      
      // Check user balance after failure
      const updatedUser = await userService.getUserById(testUser.user_id);
      const newBalance = parseFloat(updatedUser.balance);
      
      // Balance should be restored
      expect(newBalance).toBe(initialBalance + cashoutAmount);
    });

    it('Should not refund when updating from processing to completed', async () => {
      // First update to processing
      await cashoutService.updateCashout(testCashout.id, 'processing');
      
      const processingBalance = parseFloat(
        (await userService.getUserById(testUser.user_id)).balance
      );
      
      // Then update to completed
      await cashoutService.updateCashout(testCashout.id, 'completed');
      
      // Check balance hasn't changed
      const completedBalance = parseFloat(
        (await userService.getUserById(testUser.user_id)).balance
      );
      
      expect(completedBalance).toBe(processingBalance);
    });

    it('Should throw error with invalid status', async () => {
      await expect(
        cashoutService.updateCashout(testCashout.id, 'invalid_status')
      ).rejects.toThrow('Invalid status');
    });

    it('Should throw error when cashout not found', async () => {
      const invalidId = uuidv4(); // Random non-existent ID
      
      await expect(
        cashoutService.updateCashout(invalidId, 'completed')
      ).rejects.toThrow('Cashout request not found');
    });
  });

  describe('Integration tests', () => {
    it('Should handle full cashout lifecycle', async () => {
      // 1. Create cashout
      const cashoutWallet_ca = uuidv4();
      const cashoutAmount = 40.0;
      
      const initialBalance = parseFloat(
        (await userService.getUserById(testUser.user_id)).balance
      );
      
      const cashout = await cashoutService.createCashout(
        testUser.user_id,
        cashoutAmount,
        cashoutWallet_ca
      );
      
      // Verify balance was deducted
      let updatedBalance = parseFloat(
        (await userService.getUserById(testUser.user_id)).balance
      );
      expect(updatedBalance).toBe(initialBalance - cashoutAmount);
      
      // 2. Update to processing
      await cashoutService.updateCashout(cashout.id, 'processing');
      
      // Balance shouldn't change
      updatedBalance = parseFloat(
        (await userService.getUserById(testUser.user_id)).balance
      );
      expect(updatedBalance).toBe(initialBalance - cashoutAmount);
      
      // 3. Cancel the cashout
      await cashoutService.updateCashout(cashout.id, 'cancelled');
      
      // Balance should be restored
      updatedBalance = parseFloat(
        (await userService.getUserById(testUser.user_id)).balance
      );
      expect(updatedBalance).toBe(initialBalance);
      
      // 4. Final cashout status check
      const { data } = await supabase
        .from('cashouts')
        .select('*')
        .eq('id', cashout.id)
        .single();
      
      expect(data.status).toBe('cancelled');
    });
  });
});