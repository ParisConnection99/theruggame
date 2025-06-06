class RefundService {
    constructor(supabase, config = {}, userService) {
        this.supabase = supabase;
        this.config = {
            maxAttempts: config.maxAttempts || 3,
            minRefundAmount: config.minRefundAmount || 0.00000001,
            ...config
        };
        this.userService = userService;
    }

    async addRefund(betId, userId, marketId, amount) {
        // Input validation
        if (!betId || !userId || !marketId || !amount) {
            throw new Error('Error processing refunds: Missing required parameters');
        }
    
        // Validate amount is positive and meets minimum
        if (amount <= 0 || amount < this.config.minRefundAmount) {
            throw new Error(`Error processing refunds: Invalid amount. Must be greater than ${this.config.minRefundAmount}`);
        }
    
        const formattedDate = new Date().toISOString();
    
        try {
            // Check if bet exists and is eligible for refund - now also fetch fee
            const { data: bet, error: betError } = await this.supabase
                .from('bets')
                .select('id, status, amount, fee, refund_amount')
                .eq('id', betId)
                .single();
    
            if (betError || !bet) {
                throw new Error('Error processing refunds: Bet not found');
            }
    
            // Calculate total refunds already issued for this bet
            const { data: existingRefunds, error: refundError } = await this.supabase
                .from('refunds')
                .select('amount')
                .eq('bet_id', betId);
    
            if (refundError) {
                throw new Error('Error checking existing refunds');
            }
    
            const totalRefunded = existingRefunds?.reduce((sum, refund) => sum + Number(refund.amount), 0) || 0;
    
            // Calculate the maximum refundable amount (bet amount + fee)
            const maxRefundAmount = Number(bet.amount) + Number(bet.fee || 0);
    
            // Ensure total refunds don't exceed maximum refundable amount
            if (totalRefunded + Number(amount) > maxRefundAmount) {
                console.log('Total:', totalRefunded + Number(amount), 'Max refundable:', maxRefundAmount); // Debug
                throw new Error('Error processing refunds: Refund amount exceeds maximum refundable amount');
            }
    
            // Create the refund record as PROCESSED immediately
            const { data: refund, error } = await this.supabase
                .from('refunds')
                .insert([{
                    bet_id: betId,
                    user_id: userId,
                    market_id: marketId,
                    amount: amount,
                    status: 'PROCESSED', // Changed from 'PENDING' to 'PROCESSED'
                    created_at: formattedDate,
                    processed_at: formattedDate, // Set processed time to creation time
                    transaction_hash: `tx_${Date.now()}`, // Generate transaction hash
                    attempt_count: 0,
                }])
                .select()
                .single();
    
            if (error) {
                throw error;
            }
    
            /*
            - Update the users bet status
            */
            await this.updateProcessBalance(userId, amount);
    
            await this.updateBetRefundStatus(bet);
    
            return refund;
        } catch (error) {
            throw error;
        }
    }
    
    async updateProcessBalance(userId, amount) {
        if(!userId || !amount) {
            throw new Error('Error processing Balance. Invalid input');
        }
        try {
            await this.userService.updateBalance(userId, amount);
        } catch(error) {
            throw new Error(`Error updating balance for user: ${userId}, error: ${error.message}`);
        }
    }

    async updateBetRefundStatus(bet) {
        if(!bet) {
            throw new Error('Error processing Bet.');
        }

        console.log('Updating the bet status to refund if not partially matched.');

        if (bet.status === 'PARTIALLY_MATCHED') {
            console.log('We dont need to change the status to refunded because this bet is partially matched.');
            return;
        }

        // IF ITS NOT PARTIALLY MATCHED
        // FIRST FETCH THE BET THEN CHECK THE STATUS

        const { error } = await this.supabase
            .from('bets')
            .update({
                status: 'REFUNDED'
            })
            .eq('id', bet.id);

        if(error) throw error;
    }

    async fetchRefunds(filters = {}) {
        try {
            let query = this.supabase
                .from('refunds')
                .select('*');

            // Apply filters if provided
            if (filters.betId) {
                query = query.eq('bet_id', filters.betId);
            }
            if (filters.userId) {
                query = query.eq('user_id', filters.userId);
            }
            if (filters.marketId) {
                query = query.eq('market_id', filters.marketId);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            throw error;
        }
    }

    async getRefundStats(marketId) {
        try {
            const { data, error } = await this.supabase
                .from('refunds')
                .select('amount, status')
                .eq('market_id', marketId);

            if (error) {
                throw error;
            }

            return {
                totalRefunds: data.length,
                totalAmount: data.reduce((sum, refund) => sum + Number(refund.amount), 0),
                pendingCount: data.filter(r => r.status === 'PENDING').length,
                processedCount: data.filter(r => r.status === 'PROCESSED').length,
                failedCount: data.filter(r => r.status === 'FAILED').length
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = RefundService;