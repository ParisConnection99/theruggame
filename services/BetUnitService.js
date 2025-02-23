const winston = require('winston');
const { Decimal } = require('decimal.js');

/*
* Splitting only happens if the bet is over 1 SOL
*/
class BetUnitService {
    constructor(db, config) {
        this.db = db;
        this.config = config;

        // Setup Winston logger
        this.logger = winston.createLogger({
            level: 'debug',
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    ),
                }),
            ],
        });

        // Configuration with defaults
        this.PRECISION_THRESHOLD = config.precisionThreshold || 0.000001;
        this.MINIMUM_UNIT_SIZE = config.minimumUnitSize || 0.05;
        this.MAX_RETRIES = config.maxRetries || 3;
        this.RETRY_DELAY_MS = config.retryDelayMs || 1000;
        this.MAX_UNITS_PER_BET = config.maxUnitsPerBet || 100;
        this.MAX_BET_SIZE = config.maxBetAmount || 101;
        this.PLATFORM_FEE = config.platformFee || 0.01;
    }

    /* Creates one or more bet units from a single bet
    * Handles fee calculation, validation, and error retries
    * @param {Object} bet - The bet to create units from
    * @returns {Promise<{units: Array}>} The created bet units
    */
    async createUnits(bet) {
        this.validateBet(bet);

        const roundedAmount = this._roundAmount(Number(bet.amount));

        // Calculate net amount after fee
        const fee = this._roundAmount(roundedAmount * this.PLATFORM_FEE); // 1% fee
        const netAmount = this._roundAmount(roundedAmount - fee);

        let retryCount = 0;
        let lastError = null;

        while (retryCount < this.MAX_RETRIES) {
            try {
                const result = await this._executeUnitCreation(bet, netAmount);
                return result;
            } catch (error) {
                lastError = error;
                retryCount++;

                if (retryCount < this.MAX_RETRIES) {
                    this.logger.warn(`Retrying unit creation (attempt ${retryCount + 1}/${this.MAX_RETRIES})`, {
                        betId: bet.id,
                        error: error.message
                    });
                    await this._sleep(this._calculateRetryDelay(retryCount - 1));
                }
            }
        }

        const finalError = `Failed to create bet units after ${this.MAX_RETRIES} attempts: ${lastError?.message}`;
        this.logger.error(finalError, {
            betId: bet.id,
            lastError: lastError?.message
        });
        throw new Error(finalError);
    }

    validateBet(bet) {
        // Check for null/undefined bet
        if (!bet) {
            throw this._createValidationError('Bet object is required');
        }

        // Check bet ID
        if (!bet.id) {
            throw this._createValidationError('Invalid Bet id, bet id is null');
        }

        // Check bet type
        if (!bet.bet_type) {
            throw this._createValidationError('Invalid bet type this cant be null', {
                betId: bet.id
            });
        }

        // Check amount exists and is a number
        if (!bet.amount || isNaN(Number(bet.amount))) {
            throw this._createValidationError('Invalid bet: Missing or invalid amount', {
                betId: bet.id,
                amount: bet.amount
            });
        }

        if (bet.amount > this.MAX_BET_SIZE) {
            throw this._createValidationError('Bet exceed maximum bet size', {
                betId: bet.id,
                amount: bet.amount,
                maxAllowed: this.MAX_BET_SIZE
            });
        }

        // Check minimum amount
        const roundedAmount = this._roundAmount(Number(bet.amount));
        if (roundedAmount < this.MINIMUM_UNIT_SIZE) {
            throw this._createValidationError(
                `Amount ${roundedAmount} SOL is below minimum allowed amount of ${this.MINIMUM_UNIT_SIZE} SOL`,
                { betId: bet.id }
            );
        }
    }

    _createValidationError(message, logContext = {}) {
        this.logger.error(message, logContext);
        return new Error(message);
    }

    /**
     * Executes the actual unit creation process within a database transaction
     * Splits the bet amount into appropriate sized units and ensures total matches
     * @param {Object} bet - The bet to create units from
     * @param {number} netAmount - The amount after fees
     * @returns {Promise<{units: Array}>}
     */
    async _executeUnitCreation(bet, netAmount) {
        return await this.db.runInTransaction(async (db) => {
            const units = [];
            let remainingAmount = netAmount;

            while (this._hasSignificantAmount(remainingAmount)) {
                if (units.length >= this.MAX_UNITS_PER_BET) {
                    throw new Error(`Bet would exceed maximum units limit (${this.MAX_UNITS_PER_BET})`);
                }

                const unitAmount = this._calculateUnitSize(remainingAmount);
                const unit = await this._createUnit(db, bet, unitAmount);

                units.push(unit);
                remainingAmount = this._roundAmount(remainingAmount - unitAmount);
            }

            const totalUnitAmount = this._roundAmount(
                units.reduce((sum, unit) => sum + unit.amount, 0)
            );

            if (!this._isAmountEqual(totalUnitAmount, netAmount)) {
                throw new Error(`Unit total ${totalUnitAmount} doesn't match bet net amount ${netAmount}`);
            }

            this.logger.info(`Successfully created ${units.length} units for bet ${bet.id}`, {
                betId: bet.id,
                unitsCreated: units.length,
                totalAmount: totalUnitAmount
            });

            return { units };
        });
    }

    /**
    * Creates a single bet unit in the database
    * Validates amounts and IDs before creation
    * @param {Object} db - Database connection
    * @param {Object} bet - Parent bet information
    * @param {number} amount - Amount for this unit
    * @returns {Promise<Object>} Created bet unit
    */
    async _createUnit(db, bet, amount) {
        if (amount < this.MINIMUM_UNIT_SIZE) {
            const error = `Amount ${amount} SOL is below minimum allowed amount of ${this.MINIMUM_UNIT_SIZE} SOL`;
            this.logger.error(error, { betId: bet.id });
            throw new Error(error);
        }

        const unit = await db.createBetUnit({
            betId: bet.id,
            marketId: bet.market_id,
            amount: parseFloat(amount.toFixed(8)),
            status: 'PENDING',
            createdAt: new Date()
        });

        if (!unit) {
            throw new Error('Failed to create bet unit: Database operation failed');
        }

        this.logger.info('Created bet unit', {
            betId: bet.id,
            unitId: unit.id,
            amount
        });

        return unit;
    }

    /**
     * Calculates the appropriate size for a bet unit
     * Currently implements a simple 1 SOL max unit size strategy
     * @param {number} remainingAmount - Remaining amount to be split into units
     * @returns {number} Size for the next unit
     */
    _calculateUnitSize(remainingAmount) {
        if (remainingAmount <= 1) {
            return remainingAmount;
        }
        return 1;
    }

    /**
     * Rounds an amount to 6 decimal places for consistent precision
     * @param {number} amount - Amount to round
     * @returns {number} Rounded amount
     */
    _roundAmount(amount) {
        const rounded = Math.round(amount * 1e6) / 1e6;
        this.logger.debug(`Rounded ${amount} to ${rounded}`);
        return rounded;
    }

    /**
     * Checks if an amount is significant enough to process
     * Used to prevent processing of tiny leftover amounts
     * @param {number} amount - Amount to check
     * @returns {boolean}
     */
    _hasSignificantAmount(amount) {
        return Math.abs(amount) >= this.PRECISION_THRESHOLD;
    }

    /**
        * Compares two amounts for equality within the precision threshold
        * Handles floating point precision issues
        * @param {number} amount1 - First amount
        * @param {number} amount2 - Second amount
        * @returns {boolean}
        */
    _isAmountEqual(amount1, amount2) {
        return Math.abs(amount1 - amount2) < this.PRECISION_THRESHOLD;
    }

    /**
    * Calculates delay for retry attempts with exponential backoff
    * Includes random jitter for better distributed retries
    * @param {number} retryCount - Current retry attempt number
    * @returns {number} Delay in milliseconds
    */
    _calculateRetryDelay(retryCount) {
        const baseDelay = this.RETRY_DELAY_MS;
        const maxJitter = 100;
        const exponentialDelay = baseDelay * Math.pow(2, retryCount);
        const jitter = Math.random() * maxJitter;

        return Math.min(exponentialDelay + jitter, 10000);
    }

    /**
    * Calculates the total amount from a list of matched bet units
    * Uses Decimal.js for precise decimal arithmetic
    * @param {Array} matchedUnits - Array of matched bet units
    * @returns {number} Total matched amount
    */
    calculateTotalMatchedAmount(matchedUnits) {
        if (!Array.isArray(matchedUnits)) {
            this.logger.error('Invalid input: matchedUnits must be an array');
            throw new Error('Invalid input: matchedUnits must be an array');
        }

        const total = matchedUnits.reduce((total, unit) => {
            const amount = new Decimal(unit.amount || '0');
            return total.plus(amount);
        }, new Decimal('0'));

        return this._roundAmount(total.toNumber());
    }

    /**
     * Utility function for creating delays between retry attempts
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    async _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async splitUnit(unit, matchAmount) {
        // If the unit's amount matches the matchAmount, no split is needed
        if (unit.amount === matchAmount) {
            return unit;
        }

        // If the unit amount is smaller than the matchAmount, something went wrong
        if (unit.amount < matchAmount) {
            throw new Error(`Unit amount (${unit.amount}) is less than match amount (${matchAmount})`);
        }

        return await this.db.splitUnits(unit, matchAmount);
    }

}

module.exports = BetUnitService;