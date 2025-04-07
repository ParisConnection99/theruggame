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
    
        if (error) {
            console.error(`Error in user service: ${error}`);
            // PGRST116 is the "no rows returned" error code for Supabase
            if (error.code === 'PGRST116') {
                return null; // Return null when no user is found
            }
            throw error; // Still throw for other types of errors
        }
        
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
        console.log(`Updating balance: userId: ${userId}, amount: ${amount}`);
        const { data, error } = await this.supabase.rpc(
            'update_user_balance', 
            { user_id_param: userId, amount_param: amount }
          );
          
          if (error) {
            console.error('Error updating balance:', error);
            throw error;
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

    async updateStatusWithWalletCA(ca, status) {
        if (!['active', 'suspended', 'banned'].includes(status)) {
            throw new Error('Invalid status value');
        }

        const { data, error } = await this.supabase
            .from(this.tableName)
            .update({ status })
            .eq('wallet_ca', ca)
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

    async updateUsername(username, uid) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update({
                username: username,
                username_changed_at: new Date()
            })
            .eq('wallet_ca', uid)
            .select()

        if (error) throw error;
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