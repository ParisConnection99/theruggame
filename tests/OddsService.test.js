const OddsService = require('../services/OddsService');


describe('OddsService', () => {
    let oddsService;
    let mockSupabase;

    beforeEach(() => {
        // Create a mock Supabase client for testing
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn()
        };
    });

    describe('Configuration', () => {
        it('should use default configuration when no config is provided', () => {
            oddsService = new OddsService(mockSupabase);
            const config = oddsService.getConfig();

            expect(config.maxMarketDuration).toBe(20);
            expect(config.maxOdds).toBe(5.0);
        });

        it('should allow custom configuration', () => {
            const customConfig = {
                maxMarketDuration: 30,
                maxOdds: 6.0
            };

            oddsService = new OddsService(mockSupabase, customConfig);
            const config = oddsService.getConfig();

            expect(config.maxMarketDuration).toBe(30);
            expect(config.maxOdds).toBe(6.0);
        });
    });

    describe('calculateOdds', () => {
        beforeEach(() => {
            oddsService = new OddsService(mockSupabase);
        });

        // Test case 1: No bets placed
        it('should return default odds when no bets are placed', () => {
            const result = oddsService.calculateOdds(0, 0, 20);
            expect(result).toEqual({
                pumpOdds: 2.0,
                rugOdds: 2.0
            });
        });

        // Test case 2: Equal bets on both sides
        it('should return near-equal odds when bet amounts are equal', () => {
            const result = oddsService.calculateOdds(1000, 1000, 20);
            expect(result.pumpOdds).toBeCloseTo(2.1, 1);
            expect(result.rugOdds).toBeCloseTo(2.1, 1);
        });

        // Test case 3: More bets on pump side
        it('should increase rug odds when more bets are on pump', () => {
            const result = oddsService.calculateOdds(2000, 1000, 20);
            expect(result.pumpOdds).toBeLessThan(result.rugOdds);
        });

        // Test case 4: More bets on rug side
        it('should increase pump odds when more bets are on rug', () => {
            const result = oddsService.calculateOdds(1000, 2000, 20);
            expect(result.rugOdds).toBeLessThan(result.pumpOdds);
        });

        // Test case 5: Time factor impact
        it('should change odds more dramatically as time approaches zero', () => {
            const highTimeResult = oddsService.calculateOdds(2000, 1000, 20);
            const midTimeResult = oddsService.calculateOdds(2000, 1000, 10);
            const lowTimeResult = oddsService.calculateOdds(2000, 1000, 1);

            // Verify that odds become more extreme as time decreases
            console.log('High Time Result:', highTimeResult);
            console.log('Mid Time Result:', midTimeResult);
            console.log('Low Time Result:', lowTimeResult);

            expect(midTimeResult.rugOdds).toBeGreaterThan(highTimeResult.rugOdds);
            expect(lowTimeResult.rugOdds).toBeGreaterThan(midTimeResult.rugOdds);
        });

        // Test case 6: Maximum odds cap
        it('should cap odds at MAX_ODDS (5.0)', () => {
            const result = oddsService.calculateOdds(100, 10000, 1);
            expect(result.pumpOdds).toBeLessThanOrEqual(5.0);
            expect(result.rugOdds).toBeLessThanOrEqual(5.0);
        });

        // Test case 7: Custom max odds
        it('should use custom max odds', () => {
            const customConfig = { maxOdds: 7.0 };
            oddsService = new OddsService(mockSupabase, customConfig);

            const result = oddsService.calculateOdds(100, 10000, 1);
            expect(result.pumpOdds).toBeLessThanOrEqual(7.0);
            expect(result.rugOdds).toBeLessThanOrEqual(7.0);
        });
    });

    describe('getCurrentOdds', () => {
        beforeEach(() => {
            oddsService = new OddsService(mockSupabase);
        });

        it('should retrieve pump odds correctly', async () => {
            const mockMarket = {
                current_pump_odds: 2.5,
                current_rug_odds: 1.8
            };

            mockSupabase.single.mockResolvedValue({
                data: mockMarket,
                error: null
            });

            const result = await oddsService.getCurrentOdds('market1', 'PUMP');
            expect(result).toBe(2.5);
        });

        it('should retrieve rug odds correctly', async () => {
            const mockMarket = {
                current_pump_odds: 2.5,
                current_rug_odds: 1.8
            };

            mockSupabase.single.mockResolvedValue({
                data: mockMarket,
                error: null
            });

            const result = await oddsService.getCurrentOdds('market1', 'RUG');
            expect(result).toBe(1.8);
        });

        it('should throw an error when database query fails', async () => {
            const mockError = new Error('Database connection failed');

            mockSupabase.single.mockResolvedValue({
                data: null,
                error: mockError
            });

            await expect(oddsService.getCurrentOdds('market1', 'PUMP'))
                .rejects
                .toThrow('Error processing Market.');
        });
    });
});