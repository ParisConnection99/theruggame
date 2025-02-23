// PriceScheduler.test.js
const { startPriceScheduler, stopPriceScheduler, setSchedulerInterval } = require('../services/PricesScheduler');

// Real token addresses for testing
const TOKENS = {
  JAILSTOOL: 'AxriehR6Xw3adzHopnvMn7GcpRFcD41ddpiTWMg6pump',
  MEMDEX: '83iBDw3ZpxqJ3pEzrbttr9fGA57tttehDAxoFyR1moon'
};

describe('Price Scheduler Tests', () => {
  describe('DexScreener API', () => {
    test('should fetch price data for a single token', async () => {
      // Using tokens endpoint instead of pairs
      const response = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${TOKENS.JAILSTOOL}`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      console.log('Response data:', data); // Let's see what we get back
      
      // Update expectations based on tokens endpoint structure
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty('priceUsd');
      expect(typeof parseFloat(data[0].priceUsd)).toBe('number');
    });

    test('should handle multiple tokens in single request', async () => {
      const tokens = [TOKENS.JAILSTOOL, TOKENS.MEMDEX].join(',');
      const response = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${tokens}`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Price Change Detection', () => {
    test('should detect significant price changes (>0.5%)', () => {
      const oldPrice = 1.0;
      const newPrice = 1.006; // 0.6% change
      const change = Math.abs(newPrice - oldPrice) / oldPrice;
      expect(change).toBeGreaterThan(0.005);
    });

    test('should ignore minor price changes (<0.5%)', () => {
      const oldPrice = 1.0;
      const newPrice = 1.004; // 0.4% change
      const change = Math.abs(newPrice - oldPrice) / oldPrice;
      expect(change).toBeLessThan(0.005);
    });
  });

  describe('Scheduler Interval', () => {
    test('should reject invalid intervals', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      setSchedulerInterval(500); // Less than 1000ms
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid interval'));
    });

    test('should accept valid intervals', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      setSchedulerInterval(1500);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updating scheduler interval'));
    });
  });
});