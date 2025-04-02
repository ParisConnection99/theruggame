import { supabase } from '@/lib/supabaseClient';

export const listenToBets = (onBetUpdate) => {
    try {
        const subscription = supabase
            .channel('bets-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, (payload) => {
                console.log('Bet Update:', payload);

                if (payload.eventType === 'INSERT') {
                    console.log(`New Bet Placed: ${payload.new.user_id} bet ${payload.new.amount} SOL on ${payload.new.token_name}`);
                    onBetUpdate({
                        payload: payload.new,
                        type: 'INSERT'
                    });
                }

                if (payload.eventType === 'UPDATE' && payload.new.status === 'WON') {
                    console.log(`Bet Won: ${payload.new.user_id} won ${payload.new.potential_payout} SOL on ${payload.new.token_name}`);
                    onBetUpdate({
                        payload: payload.new,
                        type: 'UPDATE'
                    });
                }
            })
            .subscribe();

        return subscription;
    } catch (error) {
        console.error('Error setting up bet listener:', error);
        return null;
    }
};
