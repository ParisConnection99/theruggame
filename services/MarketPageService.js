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
            console.error(`Error fetching market with ID ${marketId}: ${error}`);
            throw error;
          }
    }

    async fetchPriceHistory(marketId) {
      try {
        const { data: storedPrices, error } = await this.supabase
          .from('price_history')
          .select('*')
          .eq('market_id', marketId)  // Changed 'id' to 'market_id'
          .order('timestamp', { ascending: true })  // Order by timestamp to get chronological data
    
        if (error) throw error;
    
        return storedPrices;
      } catch (error) {
        console.error(`Error fetching price history for market ${marketId}: ${error}`);
        throw error;
      }
    }
}

module.exports = MarketPageService;