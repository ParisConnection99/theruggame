import { supabase } from '@/lib/supabaseClient';

export const listenToUserPendingBets = (walletAddress, onBetUpdate) => {
    try {
        const subscription = supabase
            .channel(`wallet-${walletAddress}-pending-bets`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'pending_bets',
                filter: `wallet_ca=eq.${walletAddress}`  // Using wallet_ca as the filter
            }, (payload) => {
                console.log(`Wallet ${walletAddress} Pending Bet Update:`, payload);

                if (payload.eventType === 'INSERT') {
                    console.log(`New Pending Bet for wallet ${walletAddress}`);
                    onBetUpdate({
                        payload: payload.new,
                        type: 'INSERT'
                    });
                }

                if (payload.eventType === 'UPDATE') {
                    console.log(`Pending Bet Updated for wallet ${walletAddress}: ${payload.old.status} -> ${payload.new.status}`);
                    onBetUpdate({
                        payload: payload.new,
                        type: 'UPDATE'
                    });
                }
            })
            .subscribe();

        return subscription;
    } catch (error) {
        console.error(`Error setting up pending bet listener for wallet ${walletAddress}:`, error);
        return null;
    }
};