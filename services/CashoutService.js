// CashoutService.js
class CashoutService {
    constructor(supabase, userService) {
        this.supabase = supabase;
        this.userService = userService;
    }

    async createCashout(userId, amount, wallet_ca, device_info, ip_address) {
        // Validate input data
        if (!userId || !amount || !wallet_ca || !device_info) {
            throw new Error('Missing required fields: userId, amount, wallet_ca, deviceInfo');
        }

        // Fetch user and check balance using UserService
        const user = await this.userService.getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (parseFloat(user.balance) < amount) {
            throw new Error('Insufficient balance');
        }

        

        try {
            // Create cashout request
            const { data: cashout, error: cashoutError } = await this.supabase
                .from('cashouts')
                .insert([{
                    userId,
                    amount,
                    wallet_ca,
                    device_info,
                    ip_address,
                    status: 'pending'
                }])
                .select()
                .single();

            if (cashoutError) {
                throw cashoutError;
            }

            // Update user balance using UserService
            await this.userService.updateBalance(userId, -amount);

            return cashout;
        } catch (error) {
            console.error('Error creating cashout:', error);
            throw error;
        }
    }

    async fetchCashouts() {
        const { data, error } = await this.supabase
            .from('cashouts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        return data;
    }

    async fetchCashoutsBy(userId) {
        if (!userId) {
            throw new Error(`User ID is required to fetch cashouts`);
        }

        const { data, error } = await this.supabase
            .from('cashouts')
            .select('*')
            .eq('userId', userId);

        if (error) throw error;
        return data || [];
    }

    async updateCashout(id, status) {
        const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];

        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        // Get current cashout information
        const { data: cashout, error: fetchError } = await this.supabase
            .from('cashouts')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            throw new Error('Cashout request not found: ', fetchError.message);
        }


        if (!cashout || cashout.length === 0) {
            throw new Error('Cashout request not found');
        }

        const oldStatus = cashout.status;

        // Execute update
        const { data: updatedCashout, error: updateError } = await this.supabase
            .from('cashouts')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            throw updateError;
        }

        // Handle refunds for cancellations or failures
        if ((status === 'cancelled' || status === 'failed') &&
            (oldStatus === 'pending' || oldStatus === 'processing')) {

            try {
                // Return funds to user balance
                await this.userService.updateBalance(cashout.userId, parseFloat(cashout.amount));
            } catch (balanceError) {
                console.error(`Failed to refund user balance for cashout ${id}:`, balanceError);
            }
        }

        return updatedCashout;
    }
}

module.exports = CashoutService;