class BetMatchesService {
    constructor(supabase) {
        this.supabase = supabase;
        this.tableName = 'matches';
    }

    async fetchMatchesWithId(betIds) {
        // Handle empty array case to prevent SQL syntax errors
        if (!betIds || betIds.length === 0) {
            return [];
        }

        const { data: matches, error: matchesError } = await this.supabase
            .from('matches')
            .select('*')
            .or(`bet1_id.in.(${betIds}),bet2_id.in.(${betIds})`);

        if (matchesError) throw matchesError;

        return matches || [];
    }
}

module.exports = BetMatchesService;