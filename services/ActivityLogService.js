class ActivityLogService {
    constructor(supabase) {
        this.supabase = supabase;
        this.tableName = "user_activity_log";
    }

    async logActivity(activityData) {
        const { error } = await this.supabase
            .from(this.tableName)
            .insert([{
                user_id: activityData.user_id,
                action_type: activityData.action_type,
                device_info: activityData.device_info,
                ip_address: activityData.ip,
                additional_metadata: activityData.additional_metadata
            }])
            .select();

        if (error) throw error;
    }

    async fetchLogsWithUserId(userId) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('user_id', userId)

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }
}

module.exports = ActivityLogService;