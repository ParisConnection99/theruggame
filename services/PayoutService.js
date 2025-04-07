class PayoutService {
    constructor(supabase, userService, errorService) {
        this.supabase = supabase;
        this.userService = userService;
        this.errorService = errorService;
    }

    /**
     * Processes market resolution and handles payouts
     * @param {string} marketId - ID of the market to resolve
     * @param {string} result - The result of the market ('PUMP', 'RUG', or 'HOUSE')
     * @returns {Promise<void>}
     */
    async handleMarketResolution(marketId, result) {
        try {
            if (!marketId || !result) {
                throw new Error('Error processing Market Resolution: Missing marketId or result');
            }
    
            console.log(`Processing market resolution: Market ${marketId}, Result: ${result}`);
    
            // First, fetch the qualifying bets
            const { data: bets, error } = await this.supabase
                .from('bets')
                .select('*')
                .eq('market_id', marketId)
                .in('status', ['PARTIALLY_MATCHED', 'MATCHED']);
    
            if (error) {
                throw new Error(`Failed to fetch bets: ${error.message}`);
            }
    
            if (!bets || bets.length === 0) {
                console.log(`No qualifying bets found for market ${marketId}`);
                return;
            }
    
            // Extract all bet IDs
            const betIds = bets.map(bet => bet.id);
    
            // Then fetch all matches related to these bets
            const { data: matches, error: matchesError } = await this.supabase
                .from('matches')
                .select('*')
                .or(`bet1_id.in.(${betIds}),bet2_id.in.(${betIds})`);
    
            if (matchesError) {
                throw new Error(`Failed to fetch matches: ${matchesError.message}`);
            }
    
            // Now you can process your bets and matches as needed
            // For example, to associate matches with each bet:
            const betsWithMatches = bets.map(bet => {
                const betMatches = matches.filter(match =>
                    match.bet1_id === bet.id || match.bet2_id === bet.id
                );
    
                return {
                    ...bet,
                    matches: betMatches
                };
            });
    
            console.log(`Found ${bets.length} bets with a total of ${betsWithMatches.reduce((sum, bet) => sum + bet.matches.length, 0)} matches`);
    
            // Process the resolution based on the result
            if (result === 'HOUSE') {
                await this.processHouseWin(bets);
            } else {
                await this.processRegularWin(betsWithMatches, result);
            }
            
            console.log(`Successfully processed resolution for market ${marketId}`);
            //return { success: true, marketId, result };
            
        } catch (error) {
            // You might want to log the error to a monitoring service here
            this.errorService.createError({
                error_type: 'HANDLE_MARKET_RESOLUTION_ERROR',
                error_message: error.message || `Error in handleMarketResolution for market: ${marketId}`,
                stack_trace: error.stack || "no stack available",
                wallet_ca: bet.wallet_ca || "no wallet available",
                ip: "",
                request_data: "",
                source_location: "PAYOUT_SERVICE",
                severity: "SERIOUS",
              });

            throw new Error(error.message);
        }
    }

    /**
     * Processes a regular market win (PUMP or RUG)
     * @param {Array} bets - List of bets to process
     * @param {string} result - The winning bet type
     * @returns {Promise<void>}
     * @private
     */
    async processRegularWin(bets, result) {
        const { winners, losers } = this.splitBetsByResult(bets, result);

        // Use Promise.all for better parallel processing
        await Promise.all([
            this.updateBetStatus(winners, 'WON'),
            this.updateBetStatus(losers, 'LOST')
        ]);

        await this.handleUserBalanceUpdates(winners);
    }

    /**
     * Processes a house win
     * @param {Array} bets - List of bets to process
     * @returns {Promise<void>}
     * @private
     */
    async processHouseWin(bets) {
        await this.updateBetStatus(bets, 'LOST');
    }

    /**
     * Splits bets into winners and losers based on result
     * @param {Array} bets - List of bets to split
     * @param {string} result - The winning bet type
     * @returns {Object} Object containing winners and losers arrays
     * @private
     */
    splitBetsByResult(bets, result) {
        const opposite = result === 'PUMP' ? 'RUG' : 'PUMP';

        const winners = bets.filter(item => item.bet_type === result);
        const losers = bets.filter(item => item.bet_type === opposite);

        return { winners, losers };
    }

    /**
     * Updates the status of multiple bets
     * @param {Array} bets - List of bets to update
     * @param {string} status - The new status
     * @returns {Promise<void>}
     * @private
     */
    async updateBetStatus(bets, status) {
        if (!bets.length) return;

        // Create an array of bet IDs
        const betIds = bets.map(bet => bet.id);

        // Batch update all bets with the same status in one query
        const { error } = await this.supabase
            .from('bets')
            .update({ status })
            .in('id', betIds);

        if (error) {
            this.errorService.createError({
                error_type: 'UPDATE_BET_STATUS_ERROR',
                error_message: error.message || `Error batch updating bet statuses`,
                stack_trace: error.stack || "no stack available",
                wallet_ca: "no wallet available",
                ip: "",
                request_data: "",
                source_location: "PAYOUT_SERVICE",
                severity: "SERIOUS",
              });
            throw new Error(`Failed to update bet statuses: ${error.message}`);
        }
    }

    /**
     * Processes payouts for winners
     * @param {Array} winners - List of winning bets
     * @returns {Promise<void>}
     * @private
     */
    async handleUserBalanceUpdates(winners) {
        // Group wins by userId to minimize database calls
        const winsByUser = winners.reduce((acc, bet) => {
            const userId = bet.user_id;
            const betType = bet.bet_type; // Get the bet type (PUMP or RUG)
            
            // Use the matches already attached to the bet
            const betMatches = bet.matches || [];
            
            // Calculate accumulated win amount based on the bet type and match odds
            let totalWinAmount = 0;
            
            betMatches.forEach(match => {
                // Determine which odds to use based on bet type
                const oddsToUse = betType === 'PUMP' ? match.pump_odds : match.rug_odds;
                
                // Determine the amount for this specific match
                const matchAmount = match.amount;
                
                // Calculate win amount for this match
                const winAmountForMatch = matchAmount * oddsToUse;
                totalWinAmount += winAmountForMatch;
            });
            
            if (!acc[userId]) {
                acc[userId] = 0;
            }
            acc[userId] += totalWinAmount;
            return acc;
        }, {});
        
        // Process each user's total winnings
        const updatePromises = Object.entries(winsByUser).map(async ([userId, totalWinAmount]) => {
            try {
                await this.userService.updateBalance(userId, totalWinAmount);
                console.log(`Updated balance for user ${userId}: +${totalWinAmount}`);
            } catch (error) {
                this.errorService.createError({
                    error_type: 'UPDATING_WINNERS_BALANCE_ERROR',
                    error_message: error.message || `Error updating balance for user ${userId}`,
                    stack_trace: error.stack || "no stack available",
                    wallet_ca: "no wallet available" || `userId: ${userId}`,
                    ip: "",
                    request_data: "",
                    source_location: "PAYOUT_SERVICE",
                    severity: "SERIOUS",
                  });
                throw error; // Re-throw to be caught by the caller
            }
        });
        
        await Promise.all(updatePromises);
    }

    /**
     * Processes a refund for a canceled market
     * @param {string} marketId - ID of the canceled market
     * @returns {Promise<void>}
     */
    async handleMarketCancellation(marketId) {
        if (!marketId) {
            throw new Error('Error processing Market Cancellation: Missing marketId');
        }

        const { data: bets, error } = await this.supabase
            .from('bets')
            .select('*')
            .eq('market_id', marketId)
            .in('status', ['OPEN', 'PARTIALLY_MATCHED', 'MATCHED']);

        if (error) {
            throw new Error(`Failed to fetch bets for cancellation: ${error.message}`);
        }

        if (!bets || bets.length === 0) {
            return;
        }

        await this.updateBetStatus(bets, 'CANCELED');

        // Process refunds
        const refundPromises = bets.map(async (bet) => {
            try {
                const refundAmount = bet.amount || bet.matched_amount || 0; // This depends if this is before or after cutoff
                if (refundAmount > 0) {
                    const userId = bet.user_id;
                    await this.userService.updateBalance(userId, refundAmount);
                }
            } catch (error) {
                console.error(`Error processing refund: ${error.message}`);
            }
        });

        await Promise.all(refundPromises);
    }
}

module.exports = PayoutService;