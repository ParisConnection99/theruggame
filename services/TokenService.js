
class TokenService {
    constructor(supabase, pool) {
        this.supabase = supabase;
        this.pool = pool;
        this.tableName = 'tokens';
    }


    async saveTokens(tokens) {
        console.log(JSON.stringify(tokens[0], null, 2));
        try {
            const now = new Date().toISOString();
    
            // Format tokens safely
            const formattedTokens = tokens.map(token => ({
                token_address: token.address,
                created_at: new Date(parseInt(token.createdAt)).toISOString(),
                status: 'available',
                dex_id: token.dexId,
                fetched_at: now
            }));
    
            // Use parameterized query with RETURNING clause
            const { rows, error } = await this.pool.query(`
                INSERT INTO ${this.tableName} 
                (token_address, created_at, status, dex_id, fetched_at)
                SELECT * FROM UNNEST ($1::text[], $2::timestamp[], $3::text[], $4::text[], $5::timestamp[])
                ON CONFLICT (token_address) DO NOTHING
                RETURNING *;
            `, [
                formattedTokens.map(t => t.token_address),
                formattedTokens.map(t => t.created_at),
                formattedTokens.map(_ => 'available'),
                formattedTokens.map(t => t.dex_id),
                formattedTokens.map(_ => now)
            ]);
    
            if (error) throw error;
    
            return rows;
        } catch (error) {
            console.error('Error saving tokens:', error);
            throw new Error(error.message);
        }
    }


    async removeExpiredTokens(removeAll = false) {
        try {
            let query, params = [];
    
            if (removeAll) {
                query = `
                    DELETE FROM ${this.tableName}
                    WHERE status = 'expired'
                    RETURNING *;
                `;
            } else {
                query = `
                    DELETE FROM ${this.tableName}
                    WHERE token_address IN (
                        SELECT token_address FROM ${this.tableName}
                        WHERE status = 'expired'
                        FOR UPDATE SKIP LOCKED
                    )
                    RETURNING *;
                `;
            }
    
            const { rows, error } = await this.pool.query(query, params);
            if (error) throw error;
            return rows;
        } catch (error) {
            console.error('Error removing expired tokens:', error);
            throw error;
        }
    }

    async getAvailableTokens() {
        try {
            const { rows, error } = await this.pool.query(`
                SELECT * FROM ${this.tableName}
                WHERE status = 'available'
                FOR UPDATE SKIP LOCKED;
              `);

            if (error) throw error;
            return rows;
        } catch (error) {
            console.error('Error fetching available tokens:', error);
            throw error;
        }
    }

    async updateTokenStatus(tokenAddress, status) {
        try {
            const { data, error } = await this.pool.query(`
                UPDATE ${this.tableName}
                SET status = $1
                WHERE token_address = $2
                AND token_address IN (
                    SELECT token_address FROM ${this.tableName}
                    WHERE token_address = $2
                    FOR UPDATE
                )
                RETURNING *;
            `, [status, tokenAddress]);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating token status:', error);
            throw error;
        }
    }


    async removeToken(tokenAddress) {
        try {
            const { data, error } = await this.pool.query(`
                DELETE FROM ${this.tableName}
                WHERE token_address = (
                    SELECT token_address FROM ${this.tableName}
                    WHERE token_address = $1
                    FOR UPDATE SKIP LOCKED
                )
                RETURNING *;
            `, [tokenAddress]);
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error removing token:', error);
            throw error;
        }
    }

    async getReserveCount() {
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .select('id')
                .eq('status', 'available');

            if (error) throw error;
            return data.length;
        } catch (error) {
            console.error('Error getting reserve count:', error);
            throw error;
        }
    }
}

module.exports = TokenService;