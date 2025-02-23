const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client
const supabase = createClient(process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY);

const listenToBets = (onBetUpdate) => {
    try {
        const subscription = supabase
            .channel('bets-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bet_details' }, (payload) => {
                console.log('Bet Update:', payload);

                if (payload.eventType === 'INSERT') {
                    console.log(`New Bet Placed: ${payload.new.user_id} bet ${payload.new.amount} SOL on ${payload.new.market_name}`);
                    onBetUpdate(payload.new);
                }

                if (payload.eventType === 'UPDATE' && payload.new.status === 'WON') {
                    console.log(`Bet Won: ${payload.new.user_id} won ${payload.new.potential_payout} SOL on ${payload.new.market_name}`);
                    onBetUpdate(payload.new);
                }
            })
            .subscribe();

        return subscription;
    } catch (error) {
        console.error('Error setting up bet listener:', error);
        return null;
    }
};
module.exports = { listenToBets };