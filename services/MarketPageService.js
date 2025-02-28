class MarketPageService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async fetchMarketWith(marketId) {
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

    async placeBet() {}
}

module.exports = MarketPageService;