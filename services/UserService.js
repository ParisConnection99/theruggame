class UserService {
    constructor(supabase) {
        this.supabase = supabase;
        this.tableName = 'users';
    }

    /**
     * Create a new user
     * @param {Object} userData - User data object
     * @param {string} userData.wallet_ca - Solana wallet address
     * @param {string} [userData.username] - Optional username
     * @param {string} [userData.profile_pic] - Optional profile picture URL
     * @returns {Promise<Object>} Created user object
     */
    async createUser(userData) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert([{
                wallet_ca: userData.wallet_ca,
                username: userData.username,
                profile_pic: userData.profile_pic
            }])
            .select();

        if (error) throw error;
        return data[0];
    }

    /**
     * Get user by wallet address
     * @param {string} walletAddress - Solana wallet address
     * @returns {Promise<Object|null>} User object or null if not found
     */
    async getUserByWallet(walletAddress) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('wallet_ca', walletAddress)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    /**
     * Get user by ID
     * @param {string} userId - User UUID
     * @returns {Promise<Object|null>} User object or null if not found
     */
    async getUserById(userId) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }
    
    /**
     * Update user information
     * @param {string} userId - User UUID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated user object
     */
    async updateUser(userId, updateData) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update(updateData)
            .eq('user_id', userId)
            .select();

        if (error) throw error;
        if(!data || data.length === 0) {
            throw new Error('User not found');
        }
        return data[0];
    }

    /**
     * Update user balance
     * @param {string} userId - User UUID
     * @param {number} amount - Amount to add (positive) or subtract (negative)
     * @returns {Promise<Object>} Updated user object
     */
    async updateBalance(userId, amount) {
        // First get current balance
        console.log(`Updated balance: userId - ${userId}, amount: ${amount}`);

        const user = await this.getUserById(userId);
        if (!user) throw new Error('User not found');

        console.log(`Fetched user: ${user}`);

        const newBalance = (parseFloat(user.balance) || 0) + parseFloat(amount);
        
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update({ balance: newBalance })
            .eq('user_id', userId)
            .select();

        if(error) {
            throw new Error('Error updating Balance. ', error.message);
        }
        
        return data[0];
    }

    /**
     * Update user status
     * @param {string} userId - User UUID
     * @param {string} status - New status ('active', 'suspended', 'banned')
     * @returns {Promise<Object>} Updated user object
     */
    async updateStatus(userId, status) {
        if (!['active', 'suspended', 'banned'].includes(status)) {
            throw new Error('Invalid status value');
        }

        const { data, error } = await this.supabase
            .from(this.tableName)
            .update({ status })
            .eq('user_id', userId)
            .select();

        if (error) throw error;
        return data[0];
    }

    /**
     * Check if username is available
     * @param {string} username - Username to check
     * @returns {Promise<boolean>} True if username is available
     */
    async isUsernameAvailable(username) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('user_id')
            .ilike('username', username);

        if (error) throw error;
        return data.length === 0;
    }

    /**
     * Search users by username
     * @param {string} searchTerm - Search term
     * @param {number} [limit=10] - Maximum number of results
     * @returns {Promise<Array>} Array of user objects
     */
    async searchUsers(searchTerm, limit = 10) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .ilike('username', `%${searchTerm}%`)
            .limit(limit);

        if (error) throw error;
        return data;
    }

    /**
     * Delete user account
     * @param {string} userId - User UUID
     * @returns {Promise<boolean>} True if successful
     */
    async deleteUser(userId) {
        const { error } = await this.supabase
            .from(this.tableName)
            .delete()
            .eq('user_id', userId);

        if (error) throw error;
        return true;
    }
}

module.exports = UserService;