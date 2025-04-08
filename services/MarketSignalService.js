class MarketSignalService {
    constructor(supabase) {
        this.supabase = supabase;
        this.tableName = "market_update_signal";
    }

    async signalMarketCreation() {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({
                last_update: new Date().toISOString()
            })
            .eq('id', 1);

        if (error) {
            console.error('❌ Error updating market signal:', error);
            return false;
        }
        
        console.log('✅ Market creation signal sent successfully');
        return true;
    }
}

module.exports = MarketSignalService;