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
  
      try {
        await this.pool.query('BEGIN;'); // Start transaction
  
        // 1️⃣ Check if the token exists
        const { rows: existingToken } = await this.pool.query(`
              SELECT token_address FROM tokens WHERE token_address = $1;
          `, [tokenAddress]);
  
        if (!existingToken.length) {
          // Token does not exist, insert it first
          await this.pool.query(`
                  INSERT INTO tokens (
                      token_address, created_at, status, dex_id, fetched_at
                  ) VALUES ($1, NOW(), 'available', $2, NOW());
              `, [tokenAddress, dex_id]);
  
          console.log(`Token ${tokenAddress} was missing and has been inserted.`);
        }
  
        // 2️⃣ Lock the token row to prevent race conditions
        const { rows: lockedToken } = await this.pool.query(`
              SELECT token_address FROM tokens 
              WHERE token_address = $1 
              FOR UPDATE SKIP LOCKED;
          `, [tokenAddress]);
  
        if (!lockedToken.length) throw new Error('Token is locked or unavailable.');
  
        // 3️⃣ Insert market using the locked token
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
          new Date(new Date(startTime).getTime() + duration * 60000),
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
  
        // 4️⃣ Update token status to "used"
        await this.pool.query(`
              UPDATE tokens 
              SET status = 'used' 
              WHERE token_address = $1;
          `, [tokenAddress]);
  
        await this.pool.query('COMMIT;'); // Commit transaction
  
        console.log('Market created successfully:', market[0]);
  
    
        console.log(`Market: ${market[0].id}, startTime: ${startTime}, duration: ${duration}`);
        // Start monitoring the new market
        this.expiryService.monitorMarket(market[0].id, startTime, duration);
  
        return market[0];
      } catch (error) {
        await this.pool.query('ROLLBACK;'); // Rollback transaction on error
        console.error('Error creating market:', error);
        throw error;
      }
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
          potential_payout_param: betData.potentialPayout
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
        const { data, error } = await this.supabase
          .from(this.tableName)
          .select('id')
          .in('phase', ['BETTING', 'OBSERVATION']);
  
        if (error) throw error;
        return data.length;
  
      } catch (error) {
        console.error('Error getting the market count:', error);
        throw error;
      }
    }
  }
  
  module.exports = MarketService;