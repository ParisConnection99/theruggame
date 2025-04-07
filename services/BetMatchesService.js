class BetMatchesService {
    constructor(supabase) {
        this.supabase = supabase;
        this.tableName = 'matches';
    }

    async fetchMatchesWithId(betIds) {
        const { data: matches, error: matchesError } = await this.supabase
            .from('matches')
            .select('*')
            .or(`bet1_id.in.(${betIds}),bet2_id.in.(${betIds})`);

        if (matchesError) throw error;

        return matches;
    }
}

module.exports = BetMatchesService;