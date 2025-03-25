class SessionDataService {
    constructor(supabase) {
        this.supabase = supabase;
        this.tableName = "session_data";
    }

    async createSession(sessionData) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert([{
                dapp_private: sessionData.dapp_private,
                dapp_public: sessionData.dapp_public,
                shared_secret: sessionData.shared_secret,
                session: sessionData.session,
                wallet_ca: sessionData.wallet_ca
            }]).select();

        if (error) throw error;
    }
}

module.exports = SessionDataService;