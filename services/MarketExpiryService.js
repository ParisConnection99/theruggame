

class ExpiryService {
    constructor(supabase, refundService, db, marketResolveService, payoutService, marketCreationService) {
      this.supabase = supabase;
      this.refundService = refundService;
      this.db = db;
      this.marketResolveService = marketResolveService;
      this.payoutService = payoutService;
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
      if (now < cutoffTime) return 'BETTING';
      if (now < endTime) return 'OBSERVATION';
      return 'RESOLVED';
    }
  
    // Process cutoff for a market
    async processCutoff(marketId) {
      try {
        // Update market phase
  
        if (!marketId) {
          throw new Error('Market Id is needed!');
        }
  
        try {
  
          await this.supabase
            .from('markets')
            .update({
              phase: 'CUTOFF',
              status: 'MATCHING'
            })
            .eq('id', marketId);
  
        } catch (error) {
          console.log('Error updating market.')
          throw error;
        }
  
        // here we need to update status as locked
  
        // Get all unmatched and partially matched bets
        const { data: bets, error } = await this.supabase
          .from('bets')
          .select('*')
          .eq('market_id', marketId)
          .in('status', ['PENDING', 'PARTIALLY_MATCHED']);
  
  
        if (error) throw error;
  
        // Process each bet
        for (const bet of bets) {
          await this.processBetExpiry(bet);
        }
  
        // Update market to observation phase
        await this.supabase
          .from('markets')
          .update({
            phase: 'OBSERVATION',
            status: 'LOCKED'
          })
          .eq('id', marketId);
  
        return bets;
  
      } catch (error) {
        console.error('Error processing cutoff:', error);
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
          await this.refundService.addRefund(bet.id, bet.user_id, bet.market_id, bet.amount);
  
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
        const marketResult = this.marketResolveService.resolveMarket(market);
  
        // Handle the payouts + bet status update
        await this.payoutService.handleMarketResolution(market.id, marketResult);
  
        // Update the market status to settles
        await this.settledStatusUpdate(market.id);
  
        // Update the markets total pump + total rug amounts
        //await this.updateMarketTotalPumpsAndTotalRugs(market.id);
  
        return marketResult;
  
      } catch (error) {
        /*
        - what should we be doing here is there going to be retries
        */
        throw new Error('Error processing Market Resolution.');
      }
    }
  
    async monitorMarket(marketId, startTime, duration) {
      try {
        if (!marketId || !startTime || !duration) {
          throw new Error('Error processing Market: missing required parameters');
        }
  
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
  
        // Calculate exact transition times
        const start = new Date(startTime);
        const now = new Date();
        const cutoffTime = new Date(start.getTime() + (duration * 30000)); // 50% of duration
        const endTime = new Date(start.getTime() + (duration * 60000));    // 100% of duration
  
        // Calculate delays until transitions (in milliseconds)
        const msToCutoff = Math.max(0, cutoffTime.getTime() - now.getTime());
        const msToEnd = Math.max(0, endTime.getTime() - now.getTime());
  
        // Reuse the existing checkPhase function
        const checkPhase = async () => {
          try {
            const currentPhase = this.calculateMarketPhase(
              startTime,
              duration
            );
  
            if (currentPhase !== market.phase) {
              if (currentPhase === 'OBSERVATION') {
                await this.processCutoff(marketId);
              } else if (currentPhase === 'RESOLVED') {
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
        };
  
        // Initial check
        await checkPhase();
  
        // Set up precise timeouts instead of interval
        const cutoffTimeout = setTimeout(checkPhase, msToCutoff);
        const resolutionTimeout = setTimeout(checkPhase, msToEnd);
  
        // Return cleanup function
        return () => {
          try {
            clearTimeout(cutoffTimeout);
            clearTimeout(resolutionTimeout);
          } catch (cleanupError) {
            console.error('Error cleaning up market monitor:', cleanupError);
          }
        };
  
      } catch (error) {
        console.error(`Fatal error in monitorMarket for ${marketId}:`, error);
        throw error; // Re-throw if you want calling code to handle it
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
        throw error;
      }
  
      // Start the market creation process
      await this.startMarketCreationProcess();
  
      // Resolved means the market is done
      return market;
    }
  
    // Purpose: Start Market creation process
    async startMarketCreationProcess() {
  
      // call market creation service.fetchmarkets
      await this.marketCreationService.fetchMarkets();
    }
  
    async settledStatusUpdate(marketId) {
      if (!marketId) {
        throw new Error('Error processing Market status update.');
      }
  
      try {
        const { data, error } = await this.supabase
          .from('markets')
          .update({
            status: 'SETTLED',
            settled_at: new Date().toISOString()
          })
          .eq('id', marketId)
          .select();
  
        if (error) throw error;
        return data[0]; // Return the updated market
  
      } catch (error) {
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
  
      if (phase !== 'BETTING') {
        throw new Error('Market is not accepting bets at this time');
      }
  
      return true;
    }
  }
  
  module.exports = ExpiryService;