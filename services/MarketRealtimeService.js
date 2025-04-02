import { supabase } from '@/lib/supabaseClient';

export const listenToMarkets = (onMarketUpdate) => {
    try {
        const subscription = supabase
            .channel('markets-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'markets' }, (payload) => {
                console.log('Market Update:', payload);

                // I think This is how I am getting the latest market update
                if(payload.eventType === 'INSERT') {
                    console.log(`New Market has been created.`);
                    onMarketUpdate({
                        payload: payload.new,
                        type: 'NEW MARKET'
                    });
                }

                if(payload.eventType === 'UPDATE') {
                    if (payload.new.total_pump_amount !== payload.old.total_pump_amount ||
                        payload.new.total_rug_amount !== payload.old.total_rug_amount) {
                        console.log(`Pump vs. Rug Split Updated: Pump ${payload.new.total_pump_amount} SOL | Rug ${payload.new.total_rug_amount} SOL`);
                        onMarketUpdate({
                            payload: payload.new,
                            type: 'PUMP VS RUG SPLIT UPDATE'
                        });
                    }
    
                    if (payload.new.status !== payload.old.status || payload.new.phase !== payload.old.phase) {
                        console.log(`Market Status Updated: ${payload.new.status} - ${payload.new.phase}`);
                        onMarketUpdate({
                            payload: payload.new,
                            type: 'MARKET STATUS UPDATE'
                        });
                    }

                    if (payload.new.outcome !== payload.old.outcome) {
                        console.log(`Outcome updated: ${payload.new.outcome}`);
                        onMarketUpdate({
                            payload: payload.new,
                            type: 'OUTCOME UPDATE'
                        });
                    }
                }
                
            })
            .subscribe();

        return subscription;
    } catch (error) {
        console.error('Error setting up market listener:', error);
        return null;
    }
};