class HomePageService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    // Purpose: Fetch the active Markets
    async fetchActiveMarkets() {
        try {
            const { data, error } = await this.supabase
                .from('markets')
                .select('*')
                .eq('phase', 'BETTING');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching Markets.');
            throw error;
        }
    }
}

module.exports = HomePageService;