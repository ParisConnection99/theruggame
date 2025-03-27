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
                action_details: activityData.action_details,
                ip_address: activityData.ip,
                additional_metadata: activityData.additional_metadata
            }])
            .select();

        if (error) throw error;
    }
}

module.exports = ActivityLogService;