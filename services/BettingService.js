class BettingService {
    constructor(config, matchingService, oddsService, supabase, betUnitService, db, marketService) {
      this.supabase = supabase;
      this.MINIMUM_BET = 0.05; // SOL
      this.MINIMUM_UNIT = 0.05; // Minimum matching unit
      this.PLATFORM_FEE = config.platformFee || 0.02; // 1%
  
      // Initialize sub-services
      this.matchingService = matchingService;
      this.oddsService = oddsService;
      this.betUnitService = betUnitService;
      this.db = db;
      this.marketService = marketService;
    }
  
    // Place a new bet
    async placeBet(marketId, { userId, amount, betType }) {
  
      if (!marketId || !userId || !amount || !betType) {
        throw new Error('Error processing Bet.');
      }
  
      try {
        // Validate bet amount
        if (amount < this.MINIMUM_BET) {
          throw new Error(`Minimum bet amount is ${this.MINIMUM_BET} SOL`);
        }
  
        // Get current odds
        const odds = await this.oddsService.getCurrentOdds(marketId, betType);
  
        // Calculate fees and payouts
        const fee = amount * this.PLATFORM_FEE;
        const netAmount = amount - fee;
        const potentialPayout = netAmount * odds;
  
        // Create the bet
        const bet = await this.marketService.placeBet(marketId, {
          userId,
          amount,
          netAmount,
          fee,
          betType,
          odds,
          potentialPayout
        });
  
        // up
  
        // Create and match units
        await this.createUnitsAndMatch(bet);
  
        return bet;
      } catch (error) {
        throw new Error(`Error placing bet: ${error.message}`);
      }
    }
  
    async createUnitsAndMatch(bet) {
      try {
        // Create bet units
        await this.betUnitService.createUnits(bet);
  
  
        // Fetch Unmatchedbets n units
        const bets = await this.matchingService.intakeUnits(this.db);
  
        if (bets.length > 1) {
          // Match Bets
          await this.matchingService.matchBets(bets);
        }
      } catch (error) {
        throw new Error(`Error creating Bet units: ${error.message}`);
      }
    }

    async fetchBetsBy(userId) {
      const { data, error } = await this.supabase
        .from('bets')
        .select('*')
        .eq('user_id', userId)
        .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }
  
    // Subscribe to market updates
    subscribeToMarket(marketId, callback) {
      return this.supabase
        .channel(`market_${marketId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'markets',
          filter: `id=eq.${marketId}`
        }, callback)
        .subscribe();
    }
  
    // Subscribe to bet updates
    subscribeToBets(marketId, callback) {
      return this.supabase
        .channel(`bets_${marketId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'bets',
          filter: `market_id=eq.${marketId}`
        }, callback)
        .subscribe();
    }
  }
  
  module.exports = BettingService;