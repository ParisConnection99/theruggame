class ErrorService {
    constructor(supabase) {
        this.supabase = supabase;
        this.tableName = "errors";
    }

    async createError(errorData) {
        const { error } = await this.supabase
            .from(this.tableName)
            .insert([{
                error_type: errorData.error_type,
                error_message: errorData.error_message,
                stack_trace: errorData.stack_trace,
                wallet_ca: errorData.wallet_ca,
                ip: errorData.ip,
                request_data: errorData.request_data,
                source_location: errorData.source_location,
                severity: errorData.severity,
            }])
            .select();
            
        if (error) throw error; 
    }

    async fetchErrorsWithWalletCA(wallet_ca) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('wallet_ca', wallet_ca)

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

}

module.exports = ErrorService;