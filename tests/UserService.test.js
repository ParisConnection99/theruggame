const { pool } = require('../tests/utils/db-config');
const UserService = require('../services/UserService');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const {
    withTransaction,
    createTestMarket,
    cleanDatabases,
} = require('../tests/utils/db-helper');


// Mock data
const testUsers = {
    basic: {
        wallet_ca: 'wallet123456',
        username: 'testuser1',
        profile_pic: 'https://example.com/pic1.jpg'
    },
    minimal: {
        wallet_ca: 'wallet654321'
    },
    forUpdate: {
        wallet_ca: 'walletforupdate',
        username: 'updateme',
        balance: 100
    },
    forSearch1: {
        wallet_ca: 'walletsearch1',
        username: 'searchable_user'
    },
    forSearch2: {
        wallet_ca: 'walletsearch2',
        username: 'search_this_profile'
    }
};

describe('User Service Tests', () => {
    let userService;
    let createdUsers = {};

    beforeAll(async () => {
        userService = new UserService(supabase);
    });

    beforeEach(async () => {
        await cleanDatabases(pool);
    });

    afterEach(async () => {
        createdUsers = {};
    });

    describe('User Creation', () => {
        test('should create a user with all fields', async () => {
            const userData = testUsers.basic;
            const user = await userService.createUser(userData);
            
            expect(user).toBeDefined();
            expect(user.user_id).toBeDefined();
            expect(user.wallet_ca).toBe(userData.wallet_ca);
            expect(user.username).toBe(userData.username);
            expect(user.profile_pic).toBe(userData.profile_pic);
            expect(user.balance).toBe(0);
            expect(user.status).toBe('active');
            
            createdUsers.basic = user;
        });

        test('should create a user with only wallet address', async () => {
            const userData = testUsers.minimal;
            const user = await userService.createUser(userData);
            
            expect(user).toBeDefined();
            expect(user.user_id).toBeDefined();
            expect(user.wallet_ca).toBe(userData.wallet_ca);
            expect(user.username).toBeNull();
            expect(user.profile_pic).toBeNull();
            
            createdUsers.minimal = user;
        });

        test('should throw error when creating user with duplicate wallet', async () => {
            // First create a user
            await userService.createUser(testUsers.basic);
            
            // Try to create another with same wallet
            const duplicateData = {
              wallet_ca: testUsers.basic.wallet_ca,
              username: 'different_username'
            };
            
            try {
              await userService.createUser(duplicateData);
              fail('Expected constraint violation error was not thrown');
            } catch (error) {
              // Look for PostgreSQL unique violation code
              expect(error.code).toBe('23505');  // PostgreSQL unique violation error code
            }
          });
    });

    describe('User Retrieval', () => {
        beforeEach(async () => {
            // Create test users
            createdUsers.basic = await userService.createUser(testUsers.basic);
        });

        test('should get user by wallet address', async () => {
            const user = await userService.getUserByWallet(testUsers.basic.wallet_ca);
            
            expect(user).toBeDefined();
            expect(user.user_id).toBe(createdUsers.basic.user_id);
            expect(user.wallet_ca).toBe(testUsers.basic.wallet_ca);
        });

        test('should return null for non-existent wallet', async () => {
            const user = await userService.getUserByWallet('nonexistent_wallet');
            expect(user).toBeNull();
        });

        test('should get user by ID', async () => {
            const user = await userService.getUserById(createdUsers.basic.user_id);
            
            expect(user).toBeDefined();
            expect(user.user_id).toBe(createdUsers.basic.user_id);
            expect(user.wallet_ca).toBe(testUsers.basic.wallet_ca);
        });

        test('should return null for non-existent ID', async () => {
            const fakeId = uuidv4();
            const user = await userService.getUserById(fakeId);
            expect(user).toBeNull();
        });
    });

    describe('User Updates', () => {
        beforeEach(async () => {
            createdUsers.forUpdate = await userService.createUser(testUsers.forUpdate);
        });

        test('should update user information', async () => {
            const updateData = {
                username: 'updated_username',
                profile_pic: 'https://example.com/new_pic.jpg'
            };
            
            const updatedUser = await userService.updateUser(
                createdUsers.forUpdate.user_id,
                updateData
            );
            
            expect(updatedUser.username).toBe(updateData.username);
            expect(updatedUser.profile_pic).toBe(updateData.profile_pic);
            expect(updatedUser.wallet_ca).toBe(createdUsers.forUpdate.wallet_ca);
        });

        test('should throw error when updating non-existent user', async () => {
            const fakeId = uuidv4();
            await expect(userService.updateUser(fakeId, { username: 'test' }))
                .rejects.toThrow();
        });

        test('should add to user balance', async () => {
            const amount = 50;
            const updatedUser = await userService.updateBalance(
                createdUsers.forUpdate.user_id,
                amount
            );
            
            expect(updatedUser.balance).toBe(createdUsers.forUpdate.balance + amount);
        });

        test('should subtract from user balance', async () => {
            await userService.updateBalance(createdUsers.forUpdate.user_id, 100);

            const amount = -30;
            const updatedUser = await userService.updateBalance(
                createdUsers.forUpdate.user_id,
                amount
            );
            
            expect(updatedUser.balance).toBe(100 + amount);
        });

        test('should handle string amounts in updateBalance', async () => {
            await userService.updateBalance(createdUsers.forUpdate.user_id, 100);

            const amount = '25.5';
            const updatedUser = await userService.updateBalance(
                createdUsers.forUpdate.user_id,
                amount
            );
            
            expect(updatedUser.balance).toBe(testUsers.forUpdate.balance + parseFloat(amount));
        });

        test('should update user status', async () => {
            const newStatus = 'suspended';
            const updatedUser = await userService.updateStatus(
                createdUsers.forUpdate.user_id,
                newStatus
            );
            
            expect(updatedUser.status).toBe(newStatus);
        });

        test('should throw error for invalid status', async () => {
            await expect(userService.updateStatus(
                createdUsers.forUpdate.user_id,
                'invalid_status'
            )).rejects.toThrow('Invalid status value');
        });
    });

    describe('Username Availability', () => {
        beforeEach(async () => {
            createdUsers.basic = await userService.createUser(testUsers.basic);
        });

        test('should return false for existing username', async () => {
            const isAvailable = await userService.isUsernameAvailable(testUsers.basic.username);
            expect(isAvailable).toBe(false);
        });

        test('should return true for available username', async () => {
            const isAvailable = await userService.isUsernameAvailable('available_username');
            expect(isAvailable).toBe(true);
        });

        test('should be case insensitive for username checks', async () => {
            const isAvailable = await userService.isUsernameAvailable(
                testUsers.basic.username.toUpperCase()
            );
            // This may fail if your database is case-sensitive
            // If it fails, you might need to update your service to handle case sensitivity
            expect(isAvailable).toBe(false);
        });
    });

    describe('User Search', () => {
        beforeEach(async () => {
            createdUsers.forSearch1 = await userService.createUser(testUsers.forSearch1);
            createdUsers.forSearch2 = await userService.createUser(testUsers.forSearch2);
        });

        test('should find users by partial username match', async () => {
            const results = await userService.searchUsers('search');
            expect(results.length).toBe(2);
        });

        test('should respect limit parameter', async () => {
            const results = await userService.searchUsers('search', 1);
            expect(results.length).toBe(1);
        });

        test('should return empty array for no matches', async () => {
            const results = await userService.searchUsers('nonexistent');
            expect(results).toBeInstanceOf(Array);
            expect(results.length).toBe(0);
        });
    });

    describe('User Deletion', () => {
        beforeEach(async () => {
            createdUsers.forDeletion = await userService.createUser({
                wallet_ca: 'walletdelete',
                username: 'delete_me'
            });
        });

        test('should delete user successfully', async () => {
            const result = await userService.deleteUser(createdUsers.forDeletion.user_id);
            expect(result).toBe(true);
            
            // Verify user is deleted
            const user = await userService.getUserById(createdUsers.forDeletion.user_id);
            expect(user).toBeNull();
        });

        test('should not throw error when deleting non-existent user', async () => {
            const fakeId = uuidv4();
            const result = await userService.deleteUser(fakeId);
            expect(result).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should handle database connection errors', async () => {
            // Mock Supabase to simulate connection error
            const mockSupabase = {
              from: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockRejectedValue(new Error('Connection error'))
            };
            
            const badService = new UserService(mockSupabase);
            await expect(badService.getUserById('any-id'))
              .rejects.toThrow('Connection error');
          });

        test('should handle PGRST116 errors for non-existent records', async () => {
            // Mock supabase to return PGRST116 error
            const mockSupabase = {
                from: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' }
                })
            };
            
            const mockService = new UserService(mockSupabase);
            const result = await mockService.getUserById('fake-id');
            
            expect(result).toBeNull();
        });
    });

    describe('Edge Cases', () => {
        test('should handle special characters in username search', async () => {
            // Create user with special characters
            await userService.createUser({
                wallet_ca: 'walletspecial',
                username: 'user%_special'
            });
            
            const results = await userService.searchUsers('%_%');
            expect(results.length).toBeGreaterThan(0);
        });

        test('should handle zero balance updates', async () => {
            // Create user
            const user = await userService.createUser({
              ...testUsers.basic,
              wallet_ca: 'wallet_zero_balance_test' // Use unique wallet address
            });
            
            // Set initial balance
            const userWithBalance = await userService.updateBalance(user.user_id, 100);
            expect(userWithBalance.balance).toBe(100);
            
            // Update with zero
            const updatedUser = await userService.updateBalance(userWithBalance.user_id, 0);
            
            expect(updatedUser.balance).toBe(100);
          });

          test('should reject empty update data', async () => {
            const user = await userService.createUser({
              wallet_ca: `wallet_test_${Date.now()}`,
              username: `user_${Date.now()}`
            });
            
            await expect(userService.updateUser(user.user_id, {}))
              .rejects.toThrow();
          });
    });
});