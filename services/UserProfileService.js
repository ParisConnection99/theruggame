class UserProfileService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async fetchBetsBy(userId) {
        if (!userId) { // Note the ! negation here
            throw new Error('User ID is required to fetch bets');
        }

        const { data, error } = await this.supabase
            .from('bets')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        return data || []; // Return empty array if no data
    }

    async fetchCashoutsBy(userId) {
      if(!userId) {
        throw new Error(`User ID is required to fetch cashouts`);
      }

      const { data, error } = await this.supabase
        .from('cashouts')
        .select('*')
        .eq('userId', userId);
      
      if(error) throw error;
      return data || [];
    }

    async createMockMarket(supabase) {
        // Current timestamp
        const now = new Date();
        
        // Create start time 1 hour from now
        const startTime = new Date(now);
        startTime.setHours(startTime.getHours() + 1);
        
        // Create end time (30 min duration by default)
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + 30);
      
        // Sample socials data structure
        const socials = {
          telegram: "https://t.me/mockcoin",
          twitter: "https://twitter.com/mockcoin",
          discord: null,
          website: "https://mockcoin.io"
        };
      
        // Market data
        const marketData = {
          token_address: "0x1234567890abcdef1234567890abcdef12345678",
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration: 30, // minutes
          status: "OPEN", // pending, active, closed
          phase: "BETTING", // pre-launch, live, resolved
          outcome: null, // will be 'pump' or 'rug' after resolution
          total_pump_amount: 0,
          total_rug_amount: 0,
          current_pump_odds: 2.0,
          current_rug_odds: 2.0,
          initial_coin_price: 0.000032,
          initial_market_cap: 25000,
          initial_liquidity: 5000,
          initial_buy_txns: 45,
          initial_sell_txns: 12,
          dex_screener_url: "https://dexscreener.com/solana/mock-address",
          dex_id: "solana_raydium",
          website_url: "https://mockcoin.io",
          icon_url: "https://mockcoin.io/logo.png",
          coin_description: "MockCoin is a new memecoin on Solana with great tokenomics and a strong community.",
          socials: socials
        };
      
        try {
          const { data, error } = await supabase
            .from('markets')
            .insert([marketData])
            .select();
          
          if (error) {
            console.error("Error creating market:", error);
            throw error;
          }
          
          console.log("Market created successfully:", data);
          return data[0];
        } catch (error) {
          console.error("Failed to create market:", error);
          throw error;
        }
      }

      async createMockBets(supabase, userId, marketId) {
        // Ensure required parameters are provided
        if (!userId || !marketId) {
          throw new Error('Both userId and marketId are required to create mock bets');
        }
      
        // Current timestamp
        const now = new Date();
        
        // Sample bet data with different statuses and types
        const mockBets = [
          {
            market_id: marketId,
            user_id: userId,
            amount: 0.5,
            net_amount: 0.475, // after 5% fee
            fee: 0.025,
            bet_type: "PUMP", // betting on price increase
            status: "MATCHED",
            matched_amount: 0.5,
            odds_locked: 2.1,
            potential_payout: 0.9975, // net_amount * odds_locked
            created_at: new Date(now.getTime() - 86400000).toISOString(), // 1 day ago
            matched_at: new Date(now.getTime() - 85800000).toISOString(), // 10 minutes after creation
          },
          {
            market_id: marketId,
            user_id: userId,
            amount: 0.25,
            net_amount: 0.2375,
            fee: 0.0125,
            bet_type: "RUG", // betting on price decrease
            status: "WON",
            matched_amount: 0.25,
            odds_locked: 1.85,
            potential_payout: 0.439375,
            refund_amount: 0,
            created_at: new Date(now.getTime() - 172800000).toISOString(), // 2 days ago
            matched_at: new Date(now.getTime() - 172500000).toISOString(),
            settled_at: new Date(now.getTime() - 170000000).toISOString(), 
          },
          {
            market_id: marketId,
            user_id: userId,
            amount: 1.0,
            net_amount: 0.95,
            fee: 0.05,
            bet_type: "PUMP",
            status: "LOST",
            matched_amount: 1.0,
            odds_locked: 1.92,
            potential_payout: 1.824,
            refund_amount: 0,
            created_at: new Date(now.getTime() - 259200000).toISOString(), // 3 days ago
            matched_at: new Date(now.getTime() - 259000000).toISOString(),
            settled_at: new Date(now.getTime() - 256000000).toISOString(),
          },
          {
            market_id: marketId,
            user_id: userId,
            amount: 0.75,
            net_amount: 0.7125,
            fee: 0.0375,
            bet_type: "RUG",
            status: "PENDING", // not yet matched
            matched_amount: 0,
            odds_locked: 2.05,
            potential_payout: 1.460625,
            created_at: new Date(now.getTime() - 3600000).toISOString(), // 1 hour ago
          },
          {
            market_id: marketId,
            user_id: userId,
            amount: 1.2,
            net_amount: 1.14,
            fee: 0.06,
            bet_type: "PUMP",
            status: "REFUNDED", // bet was refunded (e.g., market cancelled)
            matched_amount: 1.2,
            odds_locked: 2.2,
            potential_payout: 2.508,
            refund_amount: 1.14,
            created_at: new Date(now.getTime() - 432000000).toISOString(), // 5 days ago
            matched_at: new Date(now.getTime() - 431000000).toISOString(),
            refunded_at: new Date(now.getTime() - 428000000).toISOString(),
          }
        ];
      
        try {
          const { data, error } = await supabase
            .from('bets')
            .insert(mockBets)
            .select();
          
          if (error) {
            console.error("Error creating bets:", error);
            throw error;
          }
          
          console.log("Bets created successfully:", data);
          return data;
        } catch (error) {
          console.error("Failed to create bets:", error);
          throw error;
        }
      }

      async createMockCashouts(supabase, userId) {
        if(!userId) {
          throw new Error('UserID needed for cashouts');
        }

        const now = new Date();
        
        // Sample bet data with different statuses and types
        const mockCashouts = [
          {
            userId: userId,
            amount: 0.5,
            wallet_ca: 'asfasf435234345',
            status: "completed",
            created_at: new Date(now.getTime() - 86400000).toISOString(), // 1 day ago
            paid_at: new Date(now.getTime() - 85800000).toISOString(), // 10 minutes after creation
          },
          {
            userId: userId,
            amount: 2,
            wallet_ca: 'asfasf435234345',
            status: "pending",
            created_at: new Date(now.getTime() - 86400000).toISOString(), // 1 day ago
          },
          {
            userId: userId,
            amount: 1.5,
            wallet_ca: 'asfasf435234345',
            status: "cancelled",
            created_at: new Date(now.getTime() - 86400000).toISOString(), // 1 day ago
          },
          {
            userId: userId,
            amount: 1.2,
            wallet_ca: 'asfasf435234345',
            status: "completed",
            created_at: new Date(now.getTime() - 86400000).toISOString(), // 1 day ago
            paid_at: new Date(now.getTime() - 85800000).toISOString(),
          },
          {
            userId: userId,
            amount: 0.9,
            wallet_ca: 'asfasf435234345',
            status: "pending",
            created_at: new Date(now.getTime() - 86400000).toISOString(), // 1 day ago
          }
        ];

        try {
          const { data, error } = await supabase
            .from('cashouts')
            .insert(mockCashouts)
            .select();
          
          if (error) {
            console.error("Error creating cashouts:", error);
            throw error;
          }
          
          console.log("Cashouts created successfully:", data);
          return data;
        } catch (error) {
          console.error("Failed to create cashouts:", error);
          throw error;
        }
      }
}

module.exports = UserProfileService;