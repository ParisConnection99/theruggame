

class ExpiryService {
  constructor(supabase, refundService, db, marketResolveService, payoutService) {
    this.supabase = supabase;
    this.refundService = refundService;
    this.db = db;
    this.marketResolveService = marketResolveService;
    this.payoutService = payoutService;
  }

  setMarketCreationService(marketCreationService) {
    this.marketCreationService = marketCreationService;
  }

  // Calculate market phase based on start time and duration
  calculateMarketPhase(startTime, duration) {
    // Validate start time
    if (!startTime) {
      throw new Error('Invalid start time');
    }
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      throw new Error('Invalid start time');
    }

    // Validate duration
    if (!duration || isNaN(duration) || duration <= 0) {
      throw new Error('Invalid duration');
    }

    const now = new Date();
    const cutoffTime = new Date(start.getTime() + (duration * 30000)); // 50% of duration
    const endTime = new Date(start.getTime() + (duration * 60000));

    if (now < start) return 'NOT_STARTED';
    if (now <= cutoffTime) return 'BETTING';
    if (now < endTime) return 'OBSERVATION';
    return 'RESOLVED';
  }

  // Process cutoff for a market
  async processCutoff(marketId) {
    try {
      if (!marketId) {
        throw new Error('Market ID is required.');
      }

      // Update market phase to CUTOFF
      const { error: updateError } = await this.supabase
        .from('markets')
        .update({
          phase: 'CUTOFF',
          status: 'MATCHING'
        })
        .eq('id', marketId);

      if (updateError) {
        throw new Error(`Error updating market phase: ${updateError.message}`);
      }

      // Fetch all unmatched and partially matched bets
      const { data: bets, error: betError } = await this.supabase
        .from('bets')
        .select('*')
        .eq('market_id', marketId)
        .in('status', ['PENDING', 'PARTIALLY_MATCHED']);

      if (betError) {
        throw new Error(`Error fetching unmatched bets: ${betError.message}`);
      }

      // Process all unmatched/partially matched bets in parallel
      if (bets.length > 0) {
        await Promise.all(bets.map(bet => this.processBetExpiry(bet)));
      }

      // Update market to observation phase
      const { error: obsError } = await this.supabase
        .from('markets')
        .update({
          phase: 'OBSERVATION',
          status: 'LOCKED'
        })
        .eq('id', marketId);

      if (obsError) {
        throw new Error(`Error updating market to observation phase: ${obsError.message}`);
      }

      console.log(`Market ${marketId} moved to observation phase.`);

      return bets;
    } catch (error) {
      console.error('Error processing cutoff:', error.message);
      throw error;
    }
  }

  // Process expiry for a single bet
  async processBetExpiry(bet) {
    if (!bet.id) {
      throw new Error('Error processing bet enquiry');
    }

    try {
      if (bet.status === 'PENDING') {
        // Fully unmatched bet - expire and refund
        await this.supabase
          .from('bets')
          .update({
            status: 'EXPIRED',
            refunded_at: new Date().toISOString(),
            refund_amount: bet.amount // Including the 1% fee
          })
          .eq('id', bet.id);
        // Add part refund here!!
        // Refund full amount including fees
        const amountWithFees = bet.amount + bet.fee;
        await this.refundService.addRefund(bet.id, bet.user_id, bet.market_id, amountWithFees);

      } else if (bet.status === 'PARTIALLY_MATCHED') {
        // Calculate refund for unmatched portion
        const unmatchedAmount = bet.amount - bet.matched_amount;

        if (unmatchedAmount > 0) {
          // update the bets + refund table in a transaction
          await this.supabase
            .from('bets')
            .update({
              refunded_at: new Date().toISOString(),
              refund_amount: unmatchedAmount
            })
            .eq('id', bet.id);

          // Add full refund here!!
          await this.refundService.addRefund(bet.id, bet.user_id, bet.market_id, unmatchedAmount);
        }
      }
    } catch (error) {
      console.error('Error processing bet expiry:', error);
      throw error;
    }
  }

  async checkPhase(marketId) {
    if (!marketId) {
      throw new Error('Error processing Market: missing required parameters');
    }

    console.log(`Before fetching market in checkPhase.`);

    // Initial market fetch
    const { data: market, error: fetchError } = await this.supabase
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch market: ${fetchError.message}`);
    }

    if (!market) {
      throw new Error(`Market not found with ID: ${marketId}`);
    }

    console.log(`Fetched market: ${market.id}`);

    try {
      const currentPhase = this.calculateMarketPhase(
        market.start_time,
        market.duration
      );

      console.log(`Current phase: ${currentPhase}`);
      console.log(`Market phase: ${market.phase}`);

      if (currentPhase !== market.phase) {
        if (currentPhase === 'OBSERVATION') {

          console.log('Current phase == OBSERVATION');
          await this.processCutoff(marketId);

        } else if (currentPhase === 'RESOLVED') {

          console.log('Current phase == RESOLVED');
          const updatedMarket = await this.resolveStatusUpdate(marketId, currentPhase);

          // Process market resolution if we have the updated market
          if (updatedMarket) {
            await this.processMarketResolve(updatedMarket);
          }
        } else {
          const { error: phaseUpdateError } = await this.supabase
            .from('markets')
            .update({
              phase: currentPhase,
              status: currentPhase === 'BETTING' ? 'OPEN' :
                currentPhase === 'CUTOFF' ? 'MATCHING' :
                  currentPhase === 'OBSERVATION' ? 'LOCKED' : 'RESOLVED'
            })
            .eq('id', marketId);

          if (phaseUpdateError) {
            throw new Error(`Failed to update market phase: ${phaseUpdateError.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error checking phase for market ${marketId}:`, error);
    }
  }

  // Start the resolving the market
  async processMarketResolve(market) {
    if (!market) {
      throw new Error('Error processing Market.');
    }

    if (market.phase != 'RESOLVED') {
      throw new Error('Market not resolved yet.');
    }

    try {

      // Set the market status / phase to resolve
      const marketResult = await this.marketResolveService.resolveMarket(market);

      console.log(`Market Result: ${JSON.stringify(marketResult, null, 2)}`);

      // Handle the payouts + bet status update
      await this.payoutService.handleMarketResolution(market.id, marketResult.result);

      console.log('Payouts resolved time to update market to settled. ');
      // Update the market status to settles
      await this.settledStatusUpdate(market.id, parseFloat(marketResult.price), marketResult.result);

      return marketResult;

    } catch (error) {
      /*
      - what should we be doing here is there going to be retries
      */
      throw new Error('Error processing Market Resolution.');
    }
  }

  async resolveStatusUpdate(marketId, newPhase) {
    if (!marketId || !newPhase) {
      throw new Error('Error processing Market Status Update.');
    }

    let market = null;

    try {
      market = await this.db.resolveStatus(marketId, newPhase);
    } catch (error) {
      console.error('Error changing resolve status. ', error);
      throw error;
    }

    console.log(`MARKET RESOLVED: ${JSON.stringify(market, null, 2)}`);
    // Start the market creation process

    return market;
  }

  async settledStatusUpdate(marketId, price, result) {
    if (!marketId || !price || !result) {
      throw new Error('Error processing Market status update.');
    }

    console.log(`Settled status before db update: ${marketId}, price: ${price}, result: ${result}`);

    try {
      const { data, error } = await this.supabase
        .from('markets')
        .update({
          status: 'SETTLED',
          final_price: price,
          outcome: result,
          settled_at: new Date().toISOString()
        })
        .eq('id', marketId)
        .select();

      if (error) throw error;
      return data[0]; // Return the updated market

    } catch (error) {
      console.error(error);
      throw new Error(`Error updating Market: ${error.message}`);
    }
  }

  async updateMarketTotalPumpsAndTotalRugs(marketId) {
    if (!marketId) {
      throw new Error('Error processing Market.');
    }

    const { data: bets, error } = await this.supabase
      .from('bets')
      .select('*')
      .eq('market_id', marketId)
      .in('status', ['MATCHED', 'PARTIALLY_MATCHED']);

    if (error) throw error;

    const { pumpCount, rugCount } = this.calculateTotals(bets);

    if (!pumpCount || !rugCount) {
      throw new Error('Error fetching Counts.');
    }

    const { updateError } = await this.supabase
      .from('markets')
      .update({
        total_pump_amount: pumpCount,
        total_rug_amount: rugCount
      })
      .in('id', marketId);

    if (updateError) throw updateError;
  }

  /**
 * Calculate total counts of PUMP and RUG bets
 * @param {Array} bets - Array of bet objects
 * @returns {Object} Object containing counts for each bet type
 */
  calculateTotals(bets) {
    return bets.reduce((acc, bet) => {
      if (bet.bet_type === 'PUMP') {
        acc.pumpCount++;
      } else if (bet.bet_type === 'RUG') {
        acc.rugCount++;
      }
      return acc;
    }, { pumpCount: 0, rugCount: 0 });
  }


  // Validate bet placement against market phase
  async validateBetPlacement(marketId) {
    console.log(`Validate bet placement.`);
    if (!marketId) {
      throw new Error('Error processing Market.');
    }

    const { data: market, error } = await this.supabase
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (error) throw error;

    const phase = this.calculateMarketPhase(
      market.start_time,
      market.duration
    );

    console.log(`Market phase: ${market.phase}`);

    if (phase !== 'BETTING') {
      throw new Error('Market is not accepting bets at this time');
    }

    return true;
  }
}

module.exports = ExpiryService;