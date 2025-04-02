class BetService {
    constructor(supabase) {
        this.supabase = supabase;
        this.tableName = 'bets'
    }


    async fetchBetsById(userId) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('user_id', userId)

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }
}

module.exports = BetService;