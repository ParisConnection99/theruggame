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

        console.error(`Error saving error: ${error}`);

        if (error) throw error; 
    }

}

module.exports = ErrorService;