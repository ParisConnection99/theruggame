class PayoutService {
    constructor(supabase, userService) {
        this.supabase = supabase;
        this.userService = userService;
    }

    // Purpose: 
    async handleMarketResolution(marketId, result) {
        if (!marketId || !result) {
            throw new Error(`Error processing Market Resolution.`);
        }

        const { data: bets, error } = await this.supabase
            .from('bets')
            .select('*')
            .eq('market_id', marketId) // Fixed: changed from 'id' to 'market_id'
            .in('status', ['PARTIALLY_MATCHED', 'MATCHED']);

        if (error) {
            throw new Error(`Failed to fetch bets: ${error.message}`);
        }

        if (!bets || bets.length === 0) {
            return;
        }

        if (result != 'HOUSE') {
            const { winners, loosers } = this.splitArrayByResult(bets, result); // Fixed: added 'this.'

            try {
                // Updated the bet statuses
                await this.updateBetStatus(winners, 'WON');
                await this.updateBetStatus(loosers, 'LOST');

                await this.handleUserBalanceUpdates(winners);
            } catch (error) {
                //console.error('Error processing Resolution');
            }

        } else {
            // Everyone looses accept from house

            try {
                await this.updateBetStatus(bets, 'LOST');
            } catch (error) {
                throw new Error('Error processing Resolution in the payout service');
            }
        }
    }

    splitArrayByResult(arr, result) {
        const opposite = result === 'PUMP' ? 'RUG' : 'PUMP';

        const winners = arr.filter(item => item.bet_type === result); // Fixed: changed from 'status' to 'prediction'
        const loosers = arr.filter(item => item.bet_type === opposite); // Fixed: changed from 'status' to 'prediction'

        return { winners, loosers };
    }

    // Purpose: Updates the bet statuses to either won or lost
    async updateBetStatus(bets, result) {
        const promises = bets.map(async (bet) => {

            const { error } = await this.supabase
                .from('bets')
                .update({ status: result })
                .eq('id', bet.id)

            if (error) {
               // console.log(`Error updating bet status: ${bet.id}, error: ${error.message}`);
            } else {
               // console.log(`${bet.id} status was successfully updated to ${result}`);
            }

        });

        await Promise.all(promises);
    }

    // Purpose: updating the winners balances
    async handleUserBalanceUpdates(winners) {
        for (const bet of winners) {
            try {
                const winAmount = bet.matchedAmount * bet.oddsLocked;
                await this.userService.updateBalance(bet.userId, winAmount);
            } catch (error) {
                //console.log(`Error updating balance for user: ${bet.user_id || bet.userId}, error: ${error.message}`);
            }
        }
    }
}

module.exports = PayoutService;