import { supabase } from '@/lib/supabaseClient';

export const listenToUserPendingBets = (userId, onPendingBetUpdate) => {
    try {
        const subscription = supabase
            .channel(`user-${userId}-active-bets`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'pending_bets',
                filter: `user_id=eq.${userId} AND status=in.(pending,processing,error)`
            }, (payload) => {
                console.log(`User ${userId} Active Bet Update:`, payload);
                
                if(payload.eventType === 'INSERT') {
                    console.log(`New active bet created for user ${userId}`);
                    onPendingBetUpdate({
                        payload: payload.new,
                        type: 'NEW_PENDING_BET'
                    });
                }
                
                if(payload.eventType === 'UPDATE') {
                    console.log(`Bet status updated: ${payload.old.status} -> ${payload.new.status}`);
                    onPendingBetUpdate({
                        payload: payload.new,
                        type: 'BET_STATUS_UPDATE'
                    });
                    
                    // If the bet status has changed to something outside our filter criteria,
                    // this will be the last update we receive for this bet
                    if (!['pending', 'processing', 'error'].includes(payload.new.status)) {
                        console.log(`Bet ${payload.new.id} moved out of active status`);
                    }
                }
                
                if(payload.eventType === 'DELETE') {
                    console.log(`Active bet deleted for user ${userId}:`, payload.old);
                    onPendingBetUpdate({
                        payload: payload.old,
                        type: 'BET_DELETED'
                    });
                }
            })
            .subscribe();

        return subscription;
    } catch (error) {
        console.error(`Error setting up listener for user ${userId} active bets:`, error);
        return null;
    }
};