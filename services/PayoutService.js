// class PayoutService {
//     constructor(supabase, userService) {
//         this.supabase = supabase;
//         this.userService = userService;
//     }

//     // Purpose: 
//     async handleMarketResolution(marketId, result) {
//         if (!marketId || !result) {
//             throw new Error(`Error processing Market Resolution.`);
//         }

//         const { data: bets, error } = await this.supabase
//             .from('bets')
//             .select('*')
//             .eq('market_id', marketId) // Fixed: changed from 'id' to 'market_id'
//             .in('status', ['PARTIALLY_MATCHED', 'MATCHED']);

//         if (error) {
//             throw new Error(`Failed to fetch bets: ${error.message}`);
//         }

//         if (!bets || bets.length === 0) {
//             return;
//         }

//         if (result != 'HOUSE') {
//             const { winners, loosers } = this.splitArrayByResult(bets, result); // Fixed: added 'this.'

//             try {
//                 // Updated the bet statuses
//                 await this.updateBetStatus(winners, 'WON');
//                 await this.updateBetStatus(loosers, 'LOST');

//                 await this.handleUserBalanceUpdates(winners);
//             } catch (error) {
//                 //console.error('Error processing Resolution');
//             }

//         } else {
//             // Everyone looses accept from house

//             try {
//                 await this.updateBetStatus(bets, 'LOST');
//             } catch (error) {
//                 throw new Error('Error processing Resolution in the payout service');
//             }
//         }
//     }

//     splitArrayByResult(arr, result) {
//         const opposite = result === 'PUMP' ? 'RUG' : 'PUMP';

//         const winners = arr.filter(item => item.bet_type === result); // Fixed: changed from 'status' to 'prediction'
//         const loosers = arr.filter(item => item.bet_type === opposite); // Fixed: changed from 'status' to 'prediction'

//         return { winners, loosers };
//     }

//     // Purpose: Updates the bet statuses to either won or lost
//     async updateBetStatus(bets, result) {
//         const promises = bets.map(async (bet) => {

//             const { error } = await this.supabase
//                 .from('bets')
//                 .update({ status: result })
//                 .eq('id', bet.id)

//             if (error) {
//                // console.log(`Error updating bet status: ${bet.id}, error: ${error.message}`);
//             } else {
//                // console.log(`${bet.id} status was successfully updated to ${result}`);
//             }

//         });

//         await Promise.all(promises);
//     }

//     // Purpose: updating the winners balances
//     async handleUserBalanceUpdates(winners) {
//         for (const bet of winners) {
//             try {
//                 const winAmount = bet.matchedAmount * bet.oddsLocked;
//                 await this.userService.updateBalance(bet.userId, winAmount);
//             } catch (error) {
//                 //console.log(`Error updating balance for user: ${bet.user_id || bet.userId}, error: ${error.message}`);
//             }
//         }
//     }
// }

// module.exports = PayoutService;

class PayoutService {
    constructor(supabase, userService) {
        this.supabase = supabase;
        this.userService = userService;
    }

    /**
     * Processes market resolution and handles payouts
     * @param {string} marketId - ID of the market to resolve
     * @param {string} result - The result of the market ('PUMP', 'RUG', or 'HOUSE')
     * @returns {Promise<void>}
     */
    async handleMarketResolution(marketId, result) {
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
            console.error(`Failed to fetch bets: ${error.message}`);
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
            console.error(`Failed to fetch matches: ${matchesError.message}`);
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

        try {
            if (result === 'HOUSE') {
                await this.processHouseWin(bets);
            } else {
                await this.processRegularWin(betsWithMatches, result);
            }
            console.log(`Successfully processed resolution for market ${marketId}`);
        } catch (error) {
            console.error(`Error processing resolution for market ${marketId}: ${error.message}`);
            throw new Error(`Error processing resolution: ${error.message}`);
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
            console.error(`Error batch updating bet statuses: ${error.message}`);
            throw new Error(`Failed to update bet statuses: ${error.message}`);
        }

        console.log(`Updated ${betIds.length} bets to status: ${status}`);
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
            // Fix: ensure we're using the correct property names
            const matchedAmount = bet.matched_amount || 0;
            const oddsLocked = bet.odds_locked || 1;
            const winAmount = matchedAmount * oddsLocked;

            if (!acc[userId]) {
                acc[userId] = 0;
            }
            acc[userId] += winAmount;
            return acc;
        }, {});

        // Process each user's total winnings
        const updatePromises = Object.entries(winsByUser).map(async ([userId, totalWinAmount]) => {
            try {
                await this.userService.updateBalance(userId, totalWinAmount);
                console.log(`Updated balance for user ${userId}: +${totalWinAmount}`);
            } catch (error) {
                console.error(`Error updating balance for user ${userId}: ${error.message}`);
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