class PendingBetsService {
    constructor(supabase) {
        this.supabase = supabase;
        this.tableName = 'pending_bets';
    }

    async createPendingBet(betData) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert([{
               user_id: betData.user_id,
               market_id: betData.market_id,
               bet_type: betData.bet_type,
               token_name: betData.token_name,
               amount: betData.amount,
               amount_to_add: betData.amount_to_add,
               nonce: betData.nonce,
               status: betData.status  
            }])
            .select();

        if (error) throw error;

        return data[0];
    }

    async fetchPendingBet() {}
}

module.exports = PendingBetsService;