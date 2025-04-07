class BettingService {
  constructor(config, matchingService,
    oddsService,
    supabase,
    betUnitService,
    db,
    marketService,
    errorService) {
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
    this.errorService = errorService;
  }

  async placeBetFromTransfer(marketId, { userId, amount, betType, token_name }, amountToAddToBalance) {
    if (!marketId || !userId || !amount || !betType || !token_name || !amountToAddToBalance) {
      throw new Error('Error processing Bet. Parameters missing.');
    }

    // Placing bet from transfer

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
      const bet = await this.marketService.placeBetFromTransfer(marketId, {
        userId,
        amount,
        netAmount,
        fee,
        betType,
        odds,
        potentialPayout,
        token_name
      }, amountToAddToBalance);

      // add logging to activity log

      // Create and match units
      await this.createUnitsAndMatch(bet);

      return bet;
    } catch (error) {
      throw new Error(`Error placing bet: ${error.message}`);
    }
  }

  // Place a new bet
  async placeBet(marketId, { userId, amount, betType, token_name }) {
    if (!marketId || !userId || !amount || !betType || !token_name) {
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
        potentialPayout,
        token_name
      });

      // Create and match units
      await this.createUnitsAndMatch(bet); // this shouldnt throw 

      return bet;
    } catch (error) {
      throw new Error(`Error placing bet: ${error.message}`);
    }
  }

  async createUnitsAndMatch(bet) {
    try {
      throw new Error('Testing the error logging.');
      // Create bet units
      await this.betUnitService.createUnits(bet);


      // Fetch Unmatchedbets n units
      const bets = await this.matchingService.intakeUnits(this.db);

      console.log(`Unmatched bets: ${bets}`);

      if (bets.length > 1) {
        // Match Bets
        console.log(`Bets ready to match`);
        await this.matchingService.matchBets(bets);
      }
    } catch (error) {
      console.log(`Error creating bet units: ${error.message}`);
      this.errorService.createError({
        error_type: 'CREATING_UNITS_AND_MATCHING_ERROR',
        error_message: error.message,
        stack_trace: error.stack || "no stack available",
        wallet_ca: bet.wallet_ca || "no wallet available",
        ip: "",
        request_data: "",
        source_location: "BETTING_SERVICE",
        severity: "SERIOUS",
      })
      //throw new Error(`Error creating Bet units: ${error.message}`); // this shouldnt throw because the bet is already placed
    }
  }

  async fetchBetsBy(userId) {
    const { data, error } = await this.supabase
      .from('bets')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error;
    return data;
  }
}

module.exports = BettingService;