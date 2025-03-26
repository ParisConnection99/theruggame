class SessionDataService {
    constructor(supabase) {
        this.supabase = supabase;
        this.tableName = "session_data";
    }

    async createSession(sessionData) {
        const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert({
            id: sessionData.id,
            dapp_private: sessionData.dapp_private,
            dapp_public: sessionData.dapp_public,
            shared_secret: sessionData.shared_secret,
            session: sessionData.session,
            wallet_ca: sessionData.wallet_ca // Update the timestamp
        }, { onConflict: 'wallet_ca' }); // Specify the unique column for conflict resolution

    if (error) {
        console.error('Error upserting session data:', error);
        throw error;
    }

    return data;
        // console.log('Session before being saved: ', sessionData);
        // const { data, error } = await this.supabase
        //     .from(this.tableName)
        //     .insert([{
        //         id: sessionData.id,
        //         dapp_private: sessionData.dapp_private,
        //         dapp_public: sessionData.dapp_public,
        //         shared_secret: sessionData.shared_secret,
        //         session: sessionData.session,
        //         wallet_ca: sessionData.wallet_ca
        //     }]).select();

        // if (error) throw error;
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
        console.log('Publio key in service data service: ', key);
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('wallet_ca', key)
            .maybeSingle();

        console.log(`Query result: ${data}`);

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

    async deleteByWallet_ca(wallet_ca) {
        console.log(`Deleting session with wallet_ca: ${wallet_ca}`);
    
        const { data, error } = await this.supabase
            .from(this.tableName)
            .delete()
            .eq('wallet_ca', wallet_ca);
    
        if (error) {
            console.error(`Error deleting session with wallet_ca ${wallet_ca}:`, error);
            throw error;
        }
    
        console.log(`Deleted session with wallet_ca: ${wallet_ca}`);
        return data; // Return the deleted row(s) for confirmation
    }
}

module.exports = SessionDataService;