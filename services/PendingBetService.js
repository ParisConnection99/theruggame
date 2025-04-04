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
               wallet_ca: betData.wallet_ca,
               amount_to_add: betData.amount_to_add,
               nonce: betData.nonce,
               status: betData.status  
            }])
            .select();

        if (error) throw error;

        return data[0];
    }

    async fetchPendingBetByNonce(nonce) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('nonce', nonce)
            .single();

        if (error) throw error;

        return data;
    }

    async fetchPendingBetByWalletCa(wallet_ca) {
        const { data, error } = await this.supabase
          .from(this.tableName)
          .select('*')
          .eq('wallet_ca', wallet_ca)
          .eq('status', 'pending')
          .order('inserted_at', { ascending: false })
          .limit(1);
          
        if (error) {
          throw error;
        }
        
        return data && data.length > 0 ? data[0] : null;
      }

      async fetchPendingBetsByWalletCa(walletAddress) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('wallet_ca', walletAddress)
            .in('status', ['pending', 'processing', 'error'])
            
        if (error) throw error;

        console.log(`Pending Bets: ${JSON.stringify(data, null, 2)}`);
    
        return data;
    }

    async updatePendingBetById(id, updateData) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;

        return data[0];
    }

    async updateStatusToProcessingWithId(id, signature) {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({
                signature: signature,
                status: 'processing'
            })
            .eq('id', id)
            .select()

        if (error) throw error;
    }
}

module.exports = PendingBetsService;