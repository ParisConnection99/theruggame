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


/*
< --- Types --- >

user_login
user_logout
bet_placed
username_changed
cash_out_selected
market_selected
feature_market_selected
support_selected
how_it_works_selected
*/