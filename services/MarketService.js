import { marketPhaseMessageService } from '@/services/MarketPhaseMessageService';

class MarketService {
  constructor(supabase, pool, expiryService) {
    this.supabase = supabase;
    this.pool = pool;
    this.expiryService = expiryService;
    this.tableName = 'markets';
  }

  async createMarket({
    tokenAddress, startTime,
    duration = 30,
    phase = 'BETTING',
    status = 'OPEN',
    coinPrice = 0,
    marketCap = 0,
    liquidity = 0,
    buys = 0,
    sells = 0,
    dex_screener_url = '',
    dex_id = '',
    website_url = '',
    icon_url = '',
    coin_description = '',
    socials = {},
    name = ''
  }) {
    if (!tokenAddress || !startTime) {
      throw new Error('Error processing Market.');
    }

    if (coinPrice < 0) {
      throw new Error('Values cannot be negative');
    }

    const endTime = new Date(new Date(startTime).getTime() + duration * 60000)
    try {
      // Insert market directly without token-related operations
      const { rows: market } = await this.pool.query(`
          INSERT INTO markets (
              token_address, start_time, duration, end_time, status, phase, 
              total_pump_amount, total_rug_amount, current_pump_odds, current_rug_odds, 
              initial_coin_price, initial_market_cap, initial_liquidity, initial_buy_txns, initial_sell_txns,
              dex_screener_url, dex_id, website_url, icon_url, coin_description, socials, name
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, 
                  0, 0, 2.0, 2.0, 
                  $7, $8, $9, $10, $11, 
                  $12, $13, $14, $15, $16, $17, $18)
          RETURNING *;
      `, [
        tokenAddress,
        startTime,
        duration,
        endTime,
        status,
        phase,
        coinPrice,
        marketCap,
        liquidity,
        buys,
        sells,
        dex_screener_url,
        dex_id,
        website_url,
        icon_url,
        coin_description,
        socials,
        name
      ]);

      console.log('Market created successfully:', market[0]);
      console.log(`Market: ${market[0].id}, startTime: ${startTime}, duration: ${duration}`);
      
      // Create callbacks to monitor market phases
      await this.createMessages(market[0].id, startTime, duration, endTime);

      return market[0];
    } catch (error) {
      console.error('Error creating market:', error);
      throw error;
    }
  }

  async createMessages(marketId, startTime, duration, endTime) {
     await marketPhaseMessageService.scheduleMarketPhaseChecks(marketId, startTime, duration, endTime);
  }
  
  async placeBet(marketId, betData) {
    if (!marketId || !betData) {
      throw new Error('Error processing Bet.');
    }

    // Validate positive values for all numeric fields
    if (betData.amount <= 0) {
      throw new Error('Bet amount must be positive.');
    }

    if (betData.netAmount <= 0) {
      throw new Error('Net amount must be positive.');
    }

    if (betData.fee <= 0) {
      throw new Error('Fee must be positive.');
    }

    if (betData.odds <= 0) {
      throw new Error('Odds must be positive.');
    }

    if (betData.potentialPayout <= 0) {
      throw new Error('Potential payout must be positive.');
    }

    console.log(`Before market expiry service.`);

    try {
      // Validate market is in betting phase
      await this.expiryService.validateBetPlacement(marketId);

      // Call the transaction function
      const { data, error } = await this.supabase.rpc('place_bet_transaction', {
        market_id_param: marketId,
        user_id_param: betData.userId,
        amount_param: betData.amount,
        net_amount_param: betData.netAmount,
        fee_param: betData.fee,
        bet_type_param: betData.betType,
        odds_locked_param: betData.odds,
        potential_payout_param: betData.potentialPayout,
        token_name_param: betData.token_name
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error placing bet:', error);
      throw error;
    }
  }

  async getMarketStatus(marketId) {
    if (!marketId) {
      throw new Error('Error processing Market.');
    }

    const { data: market, error } = await this.supabase
      .from('markets')
      .select(`
          *,
          bets (
            status,
            amount,
            matched_amount,
            refund_amount
          )
        `)
      .eq('id', marketId)
      .single();

    if (error) throw error;

    const phase = this.expiryService.calculateMarketPhase(
      market.start_time,
      market.duration
    );

    const timeUntilCutoff = phase === 'BETTING'
      ? new Date(market.start_time).getTime() + (market.duration * 30000) - Date.now()
      : 0;

    return {
      ...market,
      currentPhase: phase,
      timeUntilCutoff,
      totalBets: market.bets.length,
      matchedBets: market.bets.filter(b => b.status === 'MATCHED').length,
      expiredBets: market.bets.filter(b => b.status === 'EXPIRED').length,
      totalRefunded: market.bets.reduce((sum, bet) => sum + (bet.refund_amount || 0), 0)
    };
  }

  async fetchActiveMarketsForCreation() {
    try {
      const { data: markets, error } = await this.supabase
        .from('markets')
        .select('*')
        .in('phase', ['BETTING', 'CUTOFF'])

      if (error) throw error;

      return markets;
    } catch (error) {
      console.log(`Error fetching markets: ${error}`);
      throw error;
    }
  }

  // Fetch active markets 
  async getActiveMarkets() {
    try {

      const { data: markets, error } = await this.supabase
        .from('markets')
        .select('*')
        .in('phase', ['BETTING', 'CUTOFF', 'OBSERVATION'])

      if (error) throw error;

      return markets;
    } catch (error) {
      console.log(`Error fetching markets: ${error}`);
      throw error;
    }
  }

  // Fetch the market using the id
  async getMarket(marketId) {
    try {
      const { data: market, error } = await this.supabase
        .from('markets')
        .select('*')
        .eq('id', marketId)
        .single();

      if (error) throw error;

      return market;
    } catch (error) {
      console.error(`Error fetching market with ID ${marketId}:`, error);
      throw error;
    }
  }

  // Subscribe to market updates including phase changes
  subscribeToMarket(marketId, callback) {
    return this.supabase
      .channel(`market_${marketId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'markets',
        filter: `id=eq.${marketId}`
      }, async (update) => {
        const marketStatus = await this.getMarketStatus(marketId);
        callback(marketStatus);
      })
      .subscribe();
  }

  // Fetch Market count
  async getMarketCount() {
    try {
      const { count, error } = await this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('phase', 'BETTING');

      if (error) throw error;
      return count; // count contains the number of matching rows

    } catch (error) {
      console.error('Error getting the market count:', error);
      throw error;
    }
  }
}

module.exports = MarketService;