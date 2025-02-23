const { pool } = require('../tests/utils/db-config');
const TokenService = require('../services/TokenService');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

describe('Token Service Tests', () => {
    let tokenService;

    beforeAll(async () => {
        tokenService = new TokenService(supabase, pool);
    });

    beforeEach(async () => {
        // Clean up the database before each test
        await supabase.from('tokens').delete().neq('id', 0);
    });

    describe('saveTokens', () => {
        test('should save new tokens successfully', async () => {
            const mockTokens = [
                {
                    address: 'uniquetoken1',
                    createdAt: new Date().toISOString(),
                    dexId: 'raydium'
                },
                {
                    address: 'uniquetoken2',
                    createdAt: new Date().toISOString(),
                    dexId: 'raydium'
                }
            ];

            const savedTokens = await tokenService.saveTokens(mockTokens);
            console.log(`Data: ${typeof savedTokens}`);
            expect(savedTokens).toBeTruthy();
            expect(savedTokens.length).toBe(2);
            expect(savedTokens[0].status).toBe('available');
        });

        test('should handle duplicate token addresses', async () => {
            const mockTokens = [
                {
                    address: 'duplicatetoken',
                    createdAt: new Date().toISOString(),
                    dexId: 'raydium'
                }
            ];

            // First insertion should succeed
            await tokenService.saveTokens(mockTokens);

            // Second insertion of same address should fail
            try {
                await tokenService.saveTokens(mockTokens);
                fail('Expected an error but none was thrown');
            } catch (error) {
                expect(error).toBeTruthy();
            }
        });
    });

    describe('getAvailableTokens', () => {
        test('should get available tokens', async () => {
            // First save some tokens
            const mockTokens = [
                {
                    address: '0xtoken3',
                    createdAt: new Date().toISOString(),
                    dexId: 'raydium'
                }
            ];
            await tokenService.saveTokens(mockTokens);

            const availableTokens = await tokenService.getAvailableTokens();
            expect(availableTokens.length).toBeGreaterThan(0);
            expect(availableTokens[0].status).toBe('available');
        });
    });

    describe('updateTokenStatus', () => {
        test('should update token status from available to used', async () => {
            // First save a token
            const mockTokens = [{
                address: '0xtoken4',
                createdAt: new Date().toISOString(),
                dexId: 'raydium'
            }];
            await tokenService.saveTokens(mockTokens);

            // Update status
            await tokenService.updateTokenStatus('0xtoken4', 'used');

            // Verify status
            const { data } = await supabase
                .from('tokens')
                .select('*')
                .eq('token_address', '0xtoken4')
                .single();

            expect(data.status).toBe('used');
        });
    });
    describe('removeExpiredTokens', () => {
        test('should remove all tokens with expired status', async () => {
            // Add multiple expired tokens
            const mockTokens = [
                {
                    address: '0xexpired1',
                    createdAt: new Date().toISOString(),
                    dexId: 'raydium',
                    status: 'expired'
                },
                {
                    address: '0xexpired2',
                    createdAt: new Date().toISOString(),
                    dexId: 'uniswap',
                    status: 'expired'
                }
            ];

            // Insert tokens directly with expired status
            await supabase
                .from('tokens')
                .insert(mockTokens.map(token => ({
                    token_address: token.address,
                    created_at: token.createdAt,
                    dex_id: token.dexId,
                    status: 'expired'
                })));

            // Add a non-expired token
            await tokenService.saveTokens([{
                address: '0xactive',
                createdAt: new Date().toISOString(),
                dexId: 'raydium'
            }]);

            // Remove expired tokens
            await tokenService.removeExpiredTokens();

            // Verify all expired tokens were removed
            const { data: expiredData } = await supabase
                .from('tokens')
                .select('*')
                .in('token_address', ['0xexpired1', '0xexpired2']);

            expect(expiredData.length).toBe(0);

            // Verify non-expired token remains
            const { data: validData } = await supabase
                .from('tokens')
                .select('*')
                .eq('token_address', '0xactive');

            expect(validData.length).toBe(1);
        });
    });
    describe('removeToken', () => {
        test('should remove specific token', async () => {
            // First save a token
            const mockTokens = [{
                address: '0xtoken5',
                createdAt: new Date().toISOString(),
                dexId: 'raydium'
            }];
            await tokenService.saveTokens(mockTokens);

            // Remove the token
            await tokenService.removeToken('0xtoken5');

            // Verify token was removed
            const { data } = await supabase
                .from('tokens')
                .select('*')
                .eq('token_address', '0xtoken5');

            expect(data.length).toBe(0);
        });
    });

    describe('getReserveCount', () => {
        test('should return correct count of available tokens', async () => {
            // First save some tokens
            const mockTokens = [
                {
                    address: '0xtoken6',
                    createdAt: new Date().toISOString(),
                    dexId: 'raydium'
                },
                {
                    address: '0xtoken7',
                    createdAt: new Date().toISOString(),
                    dexId: 'raydium'
                }
            ];
            await tokenService.saveTokens(mockTokens);

            // Set one token as used
            await tokenService.updateTokenStatus('0xtoken6', 'used');

            // Get reserve count
            const count = await tokenService.getReserveCount();
            expect(count).toBe(1);
        });
    });

    test('should handle duplicate token addresses', async () => {
        const mockToken1 = {
            address: '0xduplicatetest',
            createdAt: Date.now().toString(),
            dexId: 'test'
        };
        
        const mockToken2 = {
            address: '0xduplicatetest', // Same address
            createdAt: (Date.now() + 1000).toString(),
            dexId: 'test2'
        };
        
        // First save should succeed
        const firstResult = await tokenService.saveTokens([mockToken1]);
        expect(firstResult.length).toBe(1);
        
        // Second save should not insert duplicate due to ON CONFLICT DO NOTHING
        const secondResult = await tokenService.saveTokens([mockToken2]);
        expect(secondResult.length).toBe(0); // No rows inserted
        
        // Verify only one record exists
        const { data } = await supabase
            .from('tokens')
            .select('*')
            .eq('token_address', '0xduplicatetest');
        
        expect(data.length).toBe(1);
        expect(data[0].dex_id).toBe('test'); // Should be the first one
    });

    describe('Row locking tests', () => {
        test('getAvailableTokens should lock rows with SKIP LOCKED', async () => {
          // Insert test token
          await tokenService.saveTokens([{
            address: '0xlocktest1',
            createdAt: Date.now().toString(),
            dexId: 'test'
          }]);
          
          // Start a transaction
          const client1 = await pool.connect();
          await client1.query('BEGIN');
          
          // Get and lock the available tokens
          const result1 = await client1.query(`
            SELECT * FROM tokens 
            WHERE token_address = '0xlocktest1'
            FOR UPDATE;
          `);
          expect(result1.rows.length).toBe(1);
          
          // Try to get available tokens in another connection
          const availableTokens = await tokenService.getAvailableTokens();
          
          // Verify our locked token was skipped
          const hasLockedToken = availableTokens.some(t => t.token_address === '0xlocktest1');
          expect(hasLockedToken).toBe(false);
          
          // Cleanup
          await client1.query('ROLLBACK');
          client1.release();
        });
        
        test('updateTokenStatus should wait for locks', async () => {
          // Insert test token
          await tokenService.saveTokens([{
            address: '0xlocktest2',
            createdAt: Date.now().toString(),
            dexId: 'test'
          }]);
          
          // Start a transaction
          const client1 = await pool.connect();
          await client1.query('BEGIN');
          
          // Lock the row
          const result1 = await client1.query(`
            SELECT * FROM tokens 
            WHERE token_address = '0xlocktest2'
            FOR UPDATE;
          `);
          
          // Set up timer to release lock after 1s
          setTimeout(async () => {
            await client1.query('ROLLBACK');
            client1.release();
          }, 1000);
          
          // Status update should wait for lock release
          const startTime = Date.now();
          await tokenService.updateTokenStatus('0xlocktest2', 'used');
          const endTime = Date.now();
          
          // Verify it waited
          expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
          
          // Verify update happened
          const { data } = await supabase
            .from('tokens')
            .select('*')
            .eq('token_address', '0xlocktest2');
          expect(data[0].status).toBe('used');
        });
      });
});