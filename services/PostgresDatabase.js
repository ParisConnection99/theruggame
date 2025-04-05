class PostgresDatabase {
    constructor(pool) {
        this.pool = pool;
    }

    async getMarket(marketId) {
        if (!marketId) {
            throw new Error('Market Id is required');
        }

        try {

            const { rows } = await this.pool.query(
                'SELECT * FROM markets WHERE id = $1', [marketId]
            );

            return this.mapToMarket(rows[0]);

        } catch (error) {
            throw error;
        }
    }

    async getBet(betId) {
        if (!betId) {
            throw new Error('Bet ID is required');
        }

        // Type validation
        const betIdNum = Number(betId);
        if (isNaN(betIdNum) || !Number.isInteger(betIdNum) || betIdNum <= 0) {
            throw new Error('Bet ID must be a positive integer');
        }
        try {
            const { rows } = await this.pool.query(
                'SELECT * FROM bets WHERE id = $1',
                [betIdNum]
            );

            // Handle case where bet doesn't exist
            if (!rows.length) {
                throw new Error(`Bet with ID ${betId} not found`);
            }

            return this.mapToBet(rows[0]);
        } catch (error) {
            // If it's our custom error, rethrow it
            if (error.message.includes('not found')) {
                throw error;
            }

            // Throw a generic error to avoid exposing database details
            throw new Error('Failed to retrieve bet');
        }
    }

    async createBetUnit(unit) {
        try {
            // Ensure bigint types for IDs
            const betId = typeof unit.betId === 'bigint' ? unit.betId : BigInt(unit.betId);
            const marketId = typeof unit.marketId === 'bigint' ? unit.marketId : BigInt(unit.marketId);

            // Format amount as numeric string to maintain precision
            const amount = unit.amount.toFixed(8);

            const { rows } = await this.pool.query(`
                INSERT INTO bet_units (bet_id, market_id, amount, status)
                VALUES ($1::bigint, $2::bigint, $3::numeric(20,8), $4)
                RETURNING *
            `, [betId, marketId, amount, unit.status]);

            if (!rows[0]) {
                throw new Error('Failed to create bet unit: No row returned');
            }

            return this.mapToBetUnit(rows[0]);
        } catch (error) {
            if (error.code === '23514') { // Check constraint violation
                throw new Error(`Amount ${unit.amount} is below minimum allowed amount of 0.05`);
            }
            throw error;
        }
    }

    async getUnmatchedUnitsWithLock(marketId, betType, excludeBetId) {
        try {
            // Input validation
            if (!marketId) {
                throw new Error('Market ID is required');
            }
            if (!betType) {
                throw new Error('Bet type is required');
            }
            if (excludeBetId === undefined || excludeBetId === null) {
                throw new Error('Exclude Bet ID is required');
            }

            const query = `
            SELECT bu.* 
            FROM bet_units bu
            JOIN bets b ON bu.bet_id = b.id
            WHERE bu.market_id = $1 
            AND b.bet_type = $2
            AND b.id != $3
            AND bu.status = 'PENDING'
            AND bu.matched_with_unit_id IS NULL
            ORDER BY bu.created_at ASC
            FOR UPDATE
            `;

            let result;
            try {
                result = await this.pool.query(query, [marketId, betType, excludeBetId]);
            } catch (dbError) {
                // Log the original database error
                throw new Error(`Failed to retrieve unmatched units: ${dbError.message}`);
            }

            // Check if no results were found
            if (!result.rows || result.rows.length === 0) {
                return []; // Return empty array instead of throwing an error     
            }

            // Map results to bet units
            try {
                return result.rows.map(this.mapToBetUnit);
            } catch (mappingError) {
                throw new Error(`Failed to map bet units: ${mappingError.message}`);
            }
        } catch (error) {
            // Central error handling
            throw error; // Re-throw to allow caller to handle or log
        }
    }

    async getUnmatchedBets(limit = 100) {
        try {
            if (!Number.isInteger(limit) || limit <= 0) {
                throw new Error('Limit must be a positive integer');
            }

            const query = `
                WITH filtered_units AS (
                    SELECT 
                        b.id as bet_id,
                        bu.id as unit_id
                    FROM bets b
                    JOIN bet_units bu ON b.id = bu.bet_id
                    WHERE b.status IN ('PENDING', 'PARTIALLY_MATCHED')
                    AND bu.status != 'MATCHED'
                    ORDER BY b.created_at ASC
                    LIMIT $1
                    FOR UPDATE
                ),
                bet_with_units AS (
                    SELECT 
                        b.*,
                        json_agg(bu.*) as units
                    FROM bets b
                    JOIN bet_units bu ON b.id = bu.bet_id
                    WHERE b.id IN (SELECT bet_id FROM filtered_units)
                    AND bu.id IN (SELECT unit_id FROM filtered_units)
                    GROUP BY 
                        b.id, b.market_id, b.user_id, b.amount, b.net_amount,
                        b.fee, b.bet_type, b.status, b.matched_amount,
                        b.odds_locked, b.potential_payout, b.refund_amount,
                        b.created_at, b.matched_at, b.settled_at, b.refunded_at
                )
                SELECT * FROM bet_with_units;
            `;

            let result;
            try {
                result = await this.pool.query(query, [limit]);
            } catch (dbError) {
                throw new Error(`Failed to retrieve unmatched units: ${dbError.message}`);
            }

            if (!result.rows || result.rows.length === 0) {
                console.log('No unmatched units found.');
                return [];
            }

            try {
                return result.rows.map(row => ({
                    ...this.mapToBet(row),
                    units: row.units.map(unit => this.mapToBetUnit(unit))
                }));
            } catch (mappingError) {
                throw new Error(`Failed to map bets and units: ${mappingError.message}`);
            }
        } catch (error) {
            throw error;
        }
    }

    async updateBetUnitMatches(unitId, matchedWithUnitId) {
        const query = `
            UPDATE bet_units
            SET status = 'MATCHED',
                matched_with_unit_id = $2,
                matched_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        const result = await this.pool.query(query, [unitId, matchedWithUnitId]);
        return this.mapToBetUnit(result.rows[0]);
    }

    async updateBetStatus(betId, status, matchedAmount) {
        // Input validation
        if (!betId) {
            throw new Error('Bet ID is required');
        }
        if (!status) {
            throw new Error('Status is required');
        }

        // Validate matchedAmount if status is MATCHED
        if (status === 'MATCHED') {
            if (matchedAmount === undefined || matchedAmount === null) {
                throw new Error('Matched amount is required when status is MATCHED');
            }
            if (typeof matchedAmount !== 'number' || matchedAmount <= 0) {
                throw new Error('Matched amount must be a positive number');
            }
        }

        try {
            // Start transaction
            const client = await this.pool.connect();

            try {
                await client.query('BEGIN');

                // Fetch current bet (will throw if not found)
                const bet = await this.getBet(betId);

                // Insert status history
                await this.insertStatusHistory({
                    betId,
                    oldStatus: bet.status,
                    newStatus: status,
                    matchedAmount,
                    totalAmount: bet.amount,
                    reason: 'Bet status updated',
                    metadata: { updatedBy: 'system' },
                }, client); // Pass transaction client

                // Update bet status
                const query = `
                    UPDATE bets 
                    SET status = $1, 
                        matched_amount = $2, 
                        matched_at = CASE WHEN $1 = 'MATCHED' THEN NOW() ELSE matched_at END
                    WHERE id = $3
                    RETURNING *
                `;

                const { rows } = await client.query(query, [status, matchedAmount, betId]);

                if (!rows.length) {
                    throw new Error(`Bet with ID ${betId} not found during update`);
                }

                await client.query('COMMIT');
                return this.mapToBet(rows[0]);

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

        } catch (error) {
            // Rethrow specific errors
            if (error.message.includes('not found') ||
                error.message.includes('Invalid status') ||
                error.message.includes('Matched amount')) {
                throw error;
            }

            // Generic error for database issues
            throw new Error('Failed to update bet status');
        }
    }

    async updateBetStatusIfAllUnitsMatched(betId) {
        try {
            const result = await this.runInTransaction(async () => {
                // Get total units and sum of matched amounts
                const unitsQuery = await this.pool.query(
                    `SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN status = 'MATCHED' THEN 1 ELSE 0 END) as matched_units,
                        SUM(CASE WHEN status = 'MATCHED' THEN amount ELSE 0 END) as matched_amount,
                        SUM(amount) as total_amount
                     FROM bet_units
                     WHERE bet_id = $1`,
                    [betId]
                );

                const { total, matched_units, matched_amount, total_amount } = unitsQuery.rows[0];

                // If all units are matched, update bet status and matched amount
                if (total > 0 && total === matched_units) {
                    await this.pool.query(
                        `UPDATE bets 
                         SET status = 'MATCHED',
                             matched_amount = $1,
                             matched_at = NOW()
                         WHERE id = $2`,
                        [matched_amount, betId]
                    );

                    return {
                        success: true,
                        updated: true,
                        message: `Bet ${betId} updated to MATCHED status with matched amount ${matched_amount}`
                    };
                }

                return {
                    success: true,
                    updated: false,
                    message: `Bet ${betId} has unmatched units (${matched_units}/${total} matched, amount: ${matched_amount}/${total_amount})`
                };
            });

            return result;

        } catch (error) {
            return {
                success: false,
                updated: false,
                message: `Failed to update bet status: ${error.message}`,
                error
            };
        }
    }

    // Helper method to validate status transitions
    validateStatusTransition(currentStatus, newStatus) {
        // Define valid transitions
        const validTransitions = {
            'PENDING': ['PARTIALLY_MATCHED', 'MATCHED'],
            'MATCHED': [],
        };

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new Error(
                `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
                `Valid transitions from ${currentStatus} are: ${validTransitions[currentStatus].join(', ')}`
            );
        }
    }

    async getUnmatchedUnits(marketId, betType, excludeBetId) {
        const { rows } = await this.pool.query(`
            SELECT bu.* 
            FROM bet_units bu
            JOIN bets b ON bu.bet_id = b.id
            WHERE bu.market_id = $1 
            AND b.bet_type = $2
            AND bu.status = 'PENDING'
            AND b.id != $3
            ORDER BY bu.created_at ASC
        `, [marketId, betType, excludeBetId]);

        return rows.map(this.mapToBetUnit);
    }

    async updateUnitStatus(unitId, status, matchedWithUnitId) {
        try {
            // Validate Inputs
            if (!unitId) throw new Error('Unit ID is required');
            if (!status) throw new Error('Status is required');

            // Ensure matchedWithUnitId is set properly (can be null)
            const matchedId = matchedWithUnitId || null;

            // Execute the update query
            const { rowCount } = await this.pool.query(`
                UPDATE bet_units 
                SET status = $1, matched_with_unit_id = $2, matched_at = NOW()
                WHERE id = $3
            `, [status, matchedId, unitId]);

            // Check if the update was successful
            if (rowCount === 0) {
                console.warn(`Warning: No bet unit found with ID ${unitId}. Update skipped.`);
            } else {
                console.log(`✅ Bet unit ${unitId} updated to status '${status}'.`);
            }

        } catch (error) {
            throw new Error(`Failed to update unit status: ${error.message}`);
        }
    }

    async updateUnitStatuses(statusChanges) {
        let updatedCount = 0;

        try {
            await this.runInTransaction(async () => {
                for (const [unitId, change] of statusChanges.entries()) {
                    const result = await this.pool.query(
                        `UPDATE bet_units 
                         SET status = $1, 
                             matched_with_unit_id = $2,
                             matched_at = $3
                         WHERE id = $4
                         RETURNING id`,
                        [
                            change.newStatus,
                            change.matchedWith,
                            change.timestamp,
                            unitId
                        ]
                    );

                    updatedCount += result.rowCount;
                }
            });

            return {
                success: true,
                updatedCount,
                message: `Successfully updated ${updatedCount} unit statuses`
            };

        } catch (error) {
            return {
                success: false,
                updatedCount: 0,
                message: `Failed to update unit statuses: ${error.message}`,
                error
            };
        }
    }

    async splitUnits(unit, matchAmount) {

        return await this.runInTransaction(async () => {
            try {
                const insertQuery = `
                    INSERT INTO bet_units (
                        bet_id, 
                        market_id, 
                        amount, 
                        status, 
                        matched_with_unit_id, 
                        created_at, 
                        matched_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                `;

                const insertResult = await this.pool.query(insertQuery, [
                    unit.betId,
                    unit.marketId,
                    matchAmount,
                    unit.status,
                    null,
                    new Date(),
                    null
                ]);

                const updateQuery = `
                    UPDATE bet_units 
                    SET amount = $1 
                    WHERE id = $2
                    RETURNING *
                `;

                // This is throwing up the error!!!
                const remainingAmount = unit.amount - matchAmount;

                const updateResult = await this.pool.query(updateQuery, [
                    remainingAmount,
                    unit.id
                ]);

                const updatedOriginalUnit = this.mapToBetUnit(updateResult.rows[0]);
                const newUnit = this.mapToBetUnit(insertResult.rows[0]);

                return [updatedOriginalUnit, newUnit];

            } catch (error) {
                throw error;
            }
        });
    }

    async updateBetStatus(betId, status, matchedAmount) {
        try {
            const result = await this.pool.query(`
                UPDATE bets 
                SET status = $1, matched_amount = $2, matched_at = CASE WHEN $1 = 'MATCHED' THEN NOW() ELSE matched_at END
                WHERE id = $3
            `, [status, matchedAmount, betId]);

            // Check if any rows were actually updated
            if (result.rowCount === 0) {
                throw new Error(`No bet found with ID: ${betId}`);
            }

            return result;
        } catch (error) {
            // Differentiate between different types of database errors
            if (error.code === '22P02') {
                throw new Error('Invalid data type in bet status update');
            }

            if (error.code === '23503') {
                throw new Error('Foreign key constraint violation');
            }

            // Re-throw a generic database error if it's not a specific known error
            throw new Error(`Database error updating bet status: ${error.message}`);
        }
    }

    async getBetUnits(betId) {
        const { rows } = await this.pool.query(
            'SELECT * FROM bet_units WHERE bet_id = $1',
            [betId]
        );
        return rows.map(this.mapToBetUnit);
    }


    async resolveStatus(marketId, newPhase) {
        console.log(`MarketId: ${marketId}, newPhase: ${newPhase}`);
        try {
            const result = await this.pool.query(`
                UPDATE markets
                SET 
                    phase = $1,
                    status = 'RESOLVED',
                    resolved_at = NOW()
                FROM (SELECT id FROM markets WHERE id = $2 FOR UPDATE SKIP LOCKED) AS locked_market
                WHERE markets.id = locked_market.id
                RETURNING markets.*;
            `, [newPhase, marketId]);


            if (!result.rows || result.rows.length === 0) {
                throw new Error(`No rows updated for market ID ${marketId}. It may be locked by another process.`);
            }

            const market = this.mapToMarket(result.rows[0]);
            return market;
        } catch (error) {
            throw new Error(`Failed to update Market: ${error.message}`);
        }
    }

    async runInTransaction(operation, isolationLevel = 'READ COMMITTED', context = {}) {
        const client = await this.pool.connect();
        let retries = 3;
    
        while (retries > 0) {
            try {
                console.log(`Starting transaction... Context: ${JSON.stringify(context)}, Retries left: ${retries}`);
    
                await client.query(`BEGIN ISOLATION LEVEL ${isolationLevel}`);
    
                const result = await operation(this.createTransactionDatabase(client));
    
                await client.query('COMMIT');
                return result;
    
            } catch (error) {
                console.log(`Error in transaction: ${error.message}`);
                await client.query('ROLLBACK');
    
                if (error.code === '23505') {
                    throw new Error('Duplicate entry detected');
                }
                
                if ((error.code === '40001' || error.code === '40P01') && retries > 1) {
                    retries--;
                    console.warn(`Retrying transaction due to serialization failure/deadlock... Context: ${JSON.stringify(context)}`);
                    continue;
                }
    
                throw error;
    
            } finally {
                try {
                    client.release(true);
                } catch (releaseError) {
                    console.error(`Error releasing database connection: ${releaseError.message}. Context: ${JSON.stringify(context)}`, releaseError.stack);
                }
            }
        }
    }

    setPool(pool) {
        this.pool = pool;
        return this;
    }

    createTransactionDatabase(client) {
        const transactionDb = new PostgresDatabase();
        transactionDb.setPool({
            query: (...args) => client.query(...args)
        });

        // Override runInTransaction to just run the operation
        transactionDb.runInTransaction = async (operation) => {
            return operation(transactionDb);
        };

        return transactionDb;
    }

    mapToMarket(row) {
        if (!row) return null;
        return {
            id: row.id,
            token_address: row.token_address,
            startTime: row.start_time,
            endTime: row.end_time,
            duration: row.duration,
            status: row.status,
            phase: row.phase,
            outcome: row.outcome,
            totalPumpAmount: row.total_pump_amount,
            totalRugAmount: row.total_rug_amount,
            currentPumpOdds: row.current_pump_odds,
            currentRugOdds: row.current_rug_odds,
            initial_coin_price: row.initial_coin_price,
            initial_market_cap: row.initial_market_cap,
            initial_liquidity: row.initial_liquidity,
            initial_buy_txns: row.initial_buy_txns,
            initial_sell_txns: row.initial_sell_txns,
            createdAt: row.created_at,
            resolvedAt: row.resolved_at,
            settledAt: row.settled_at,
            dexscreener_url: row.dexscreener_url,
            dex_id: row.dex_id,
            website_url: row.website_url,
            icon_url: row.icon_url,
            coin_description: row.coin_description,
            socials: row.socials
        }
    }

    mapToBet(row) {
        if (!row) return null;
        return {
            id: row.id,
            marketId: row.market_id,
            userId: row.user_id,
            amount: parseFloat(row.amount),
            netAmount: parseFloat(row.net_amount),
            fee: parseFloat(row.fee),
            betType: row.bet_type,
            status: row.status,
            matchedAmount: parseFloat(row.matched_amount),
            oddsLocked: parseFloat(row.odds_locked),
            potentialPayout: parseFloat(row.potential_payout),
            createdAt: row.created_at,
            matchedAt: row.matched_at,
            token_name: row.token_name
        };
    }

    mapToBetUnit(row) {
        if (!row) return null;
        return {
            id: BigInt(row.id),
            betId: BigInt(row.bet_id),
            marketId: BigInt(row.market_id),
            amount: parseFloat(row.amount),
            status: row.status,
            matchedWithUnitId: row.matched_with_unit_id ? BigInt(row.matched_with_unit_id) : null,
            createdAt: row.created_at,
            matchedAt: row.matched_at
        };
    }

    /**
     * Inserts a new record into the status_history table when a bet's status changes.
     * @param {number} betId - The ID of the bet whose status has changed.
     * @param {string} oldStatus - The old status of the bet before the change.
     * @param {string} newStatus - The new status of the bet after the change.
     * @param {number} matchedAmount - The matched amount for the bet (optional).
     * @param {number} totalAmount - The total amount of the bet.
     * @param {string} reason - The reason for the status change (optional).
     * @param {object} metadata - Additional metadata as a JSON object (optional).
     */
    async insertStatusHistory(params) {
        try {
            const {
                betId,
                oldStatus,
                newStatus,
                matchedAmount,
                totalAmount,
                reason,
                metadata
            } = params;

            // Validate required parameters
            if (!betId) {
                throw new Error('Bet ID is required for status history');
            }

            if (!oldStatus || !newStatus) {
                throw new Error('Both old and new status are required');
            }

            const query = `
                INSERT INTO status_history (bet_id, old_status, new_status, matched_amount, total_amount, reason, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id;
            `;

            // Ensure all numeric values are properly converted
            const values = [
                betId,
                oldStatus,
                newStatus,
                matchedAmount || 0,
                totalAmount || 0,
                reason || 'Status updated',
                metadata || {}
            ];

            // Validate value types before query
            values.forEach((value, index) => {
                if (value === undefined) {
                    throw new Error(`Undefined value at index ${index}`);
                }
            });

            const result = await this.pool.query(query, values);

            // Ensure a row was actually inserted
            if (result.rows.length === 0) {
                throw new Error('Failed to insert status history record');
            }

            return result.rows[0];
        } catch (error) {
            // Handle specific PostgreSQL error codes
            if (error.code === '23503') {
                throw new Error(`Foreign key constraint violation: ${error.message}`);
            }

            if (error.code === '22P02') {
                throw new Error(`Invalid data type in status history: ${error.message}`);
            }

            if (error.code === '23505') {
                throw new Error(`Unique constraint violation: ${error.message}`);
            }

            // Re-throw a generic database error if it's not a specific known error
            throw new Error(`Database error inserting status history: ${error.message}`);
        }
    }
}

module.exports = PostgresDatabase;