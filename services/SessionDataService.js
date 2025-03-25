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
        console.log(`Session id service: ${id}`);
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

    async getByWallet_ca(key) {
        console.log('Publio key in service data service: ', error);
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('wallet_ca', key)
            .single();

        if (error) {
            console.error(`Error in session data service: ${error}`);

            throw error;
        }

        return data;
    }

    async updateSession(id, updateData) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update(updateData)
            .eq('id', id)

        if (error) {
            console.log('Error updating session');
            throw error;
        }
    }
}

module.exports = SessionDataService;