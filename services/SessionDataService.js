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
                wallet_ca: sessionData.wallet_ca
            }, { 
                onConflict: 'wallet_ca',
                // Optional: Specify which columns to update if conflict occurs
                updateColumns: ['id', 'dapp_private', 'dapp_public', 'shared_secret', 'session']
            });
    
        if (error) {
            throw error;
        }
    
        return data;
    }

    async getById(id) {
        console.log(`Session id service: ${id}`);
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
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
            throw error;
        }

        return data;
    }

    async updateSession(id, updateData) {
        // First, check if a row exists with the wallet_ca
        const { data: existingData, error: checkError } = await this.supabase
            .from(this.tableName)
            .select('id')
            .eq('wallet_ca', updateData.wallet_ca)
            .single();
    
        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }
    
        // If an existing row with this wallet_ca is found, delete it
        if (existingData) {
            const { error: deleteError } = await this.supabase
                .from(this.tableName)
                .delete()
                .eq('wallet_ca', updateData.wallet_ca);
    
            if (deleteError) {
                throw deleteError;
            }
        }
    
        // Proceed with updating the session
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update(updateData)
            .eq('id', id);
    
        if (error) {
            console.log('Error updating session');
            throw error;
        }
    
        return { data, existingRowDeleted: !!existingData };
    }

    async deleteByWallet_ca(wallet_ca) {
        console.log(`Deleting session with wallet_ca: ${wallet_ca}`);
    
        const { error } = await this.supabase
            .from(this.tableName)
            .delete()
            .eq('wallet_ca', wallet_ca);
    
        if (error) {
            throw error;
        }
    }
}

module.exports = SessionDataService;