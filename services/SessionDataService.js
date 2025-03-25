class SessionDataService {
    constructor(supabase) {
        this.supabase = supabase;
        this.tableName = "session_data";
    }

    async createSession(sessionData) {
        console.log('Session before being saved: ', sessionData);
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert([{
                id: sessionData.id,
                dapp_private: sessionData.dapp_private,
                dapp_public: sessionData.dapp_public,
                shared_secret: sessionData.shared_secret,
                session: sessionData.session,
                wallet_ca: sessionData.wallet_ca
            }]).select();

        if (error) throw error;
    }

    async getById(id) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error(`Error in session data service: ${error}`);

            throw error;
        }

        return data;
    }
}

module.exports = SessionDataService;