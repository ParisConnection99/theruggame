class OddsService {
    constructor(supabase, config = {}) {
      this.supabase = supabase;
      
      // Default configuration
      this.config = {
        maxMarketDuration: 20,
        maxOdds: 5.0,
        ...config
      };
    }
  
    async getCurrentOdds(marketId, betType) {
      const { data: market, error } = await this.supabase
        .from('markets')
        .select('current_pump_odds, current_rug_odds')
        .eq('id', marketId)
        .single();
  
      if(!market) {
        throw new Error('Error processing Market.');
      }
  
      if (error) throw error;
  
      return betType === 'PUMP' ? market.current_pump_odds : market.current_rug_odds;
    }

    async getCurrentMatchedOdds(marketId) {
      const { data: market, error } = await this.supabase
        .from('markets')
        .eq('id', marketId)
        .single();
    
      if(!market) {
        throw new Error('Error processing Market.');
      }
    
      if (error) throw error;
    
      const endTime = new Date(market.endTime);
      const currentTime = new Date();
      const timeRemaining = Math.max(0, endTime.getTime() - currentTime.getTime());
    
      return this.calculateOdds(market.total_matched_pump, market.total_matched_rug, timeRemaining);
    }
  
    calculateOdds(pumpAmount, rugAmount, timeRemaining) {
      const totalPool = pumpAmount + rugAmount;
    
      if (totalPool === 0) {
        return { pumpOdds: 2.0, rugOdds: 2.0 };
      }
    
      const pumpRatio = rugAmount / pumpAmount;
      const rugRatio = pumpAmount / rugAmount;
    
      // Use configurable max market duration
      const normalizedTime = timeRemaining / this.config.maxMarketDuration;
      
      // More aggressive time factor calculation
      const timeFactor = Math.pow(1 - normalizedTime, 2) + 0.1;
    
      // Adjust base odds calculation to be more precise
      let pumpOdds = 2.1 + (pumpRatio * timeFactor * 0.1);
      let rugOdds = 2.1 + (rugRatio * timeFactor * 0.1);
    
      // Use configurable max odds
      const MAX_ODDS = this.config.maxOdds || 5.0;
      pumpOdds = Math.min(pumpOdds, MAX_ODDS);
      rugOdds = Math.min(rugOdds, MAX_ODDS);
    
      return { pumpOdds, rugOdds };
    }
  
    // Getter for current configuration
    getConfig() {
      return { ...this.config };
    }
  }
  
  module.exports = OddsService;