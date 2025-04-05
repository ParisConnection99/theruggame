
class MatchingFunnel {
    constructor(db, config = {}, marketService, statusUpdateService, betUnitService) {
        this.db = db;
        this.config = config;
        this.marketService = marketService;
        this.statusUpdateService = statusUpdateService;
        this.betUnitService = betUnitService;

        // Configuration
        // this.BATCH_SIZE = config.batchSize || 50;
        // this.LOCK_TIMEOUT = config.lockTimeout || 5000;
        this.MIN_MATCH_SIZE = config.minMatchSize || 0.1;
        // this.RECHECK_INTERVALS = config.recheckIntervals || [1, 5, 15, 30 , 60]; 
        // could change the intervals
    }

    // Purpose: Processes a batch of unwanted bets in a single transaction
    // - Retrieves a batch of unwanted bets and their units
    // - Attempts to match each bet
    // - Returns the results of matching attempts 

    async intakeUnits(db) {
        let matchableBets;

        try {
            await db.runInTransaction(async () => {
                try {
                    const bets = await this.db.getUnmatchedBets(this.BATCH_SIZE);

                    console.log(`Bets: ${bets}`);
                    
                    matchableBets = await Promise.all(
                        bets.filter(async bet => await this.isMatchingAllowed(bet))
                    );

                    console.log(`Matchable bets: ${matchableBets}`);
                    
                } catch (innerError) {
                    throw innerError; // Re-throw to trigger transaction rollback
                }
            });
        } catch (error) {
            throw error;
        }
        return matchableBets;
    }


    // Purpose: Attempts to match a single bet with opposite betting units
    // - Finds and matches units with opposite bet types
    // - Handles partial matches and splits units if needed
    // - Updates bet status based on matching results
    // - ? Manages unmatched amounts by adding to a recheck queue ?

    async matchBets(bets) {
        const statusChanges = new Map();
    
        for (const bet of bets) {
            // Skip bets too small to match
            if (bet.netAmount < this.MIN_MATCH_SIZE) continue;
    
            let remainingAmount = bet.netAmount;
    
            for (const unit of bet.units) {
                // Skip this unit if it's already matched or too small
                if (
                    statusChanges.has(unit.id) || 
                    unit.amount < this.MIN_MATCH_SIZE
                ) continue;
    
                const unmatchedUnits = await this.processBetMatching(bet, bets, statusChanges);
    
                for (const oppositeUnit of unmatchedUnits) {
                    // Stop matching entire bet if no more amount to match
                    if (remainingAmount < this.MIN_MATCH_SIZE) break;
    
                    const matchAmount = Math.min(unit.amount, oppositeUnit.amount);
    
                    if (matchAmount >= this.MIN_MATCH_SIZE) {
                        await this.checkIfUnitNeedsSplitting(unit, oppositeUnit, matchAmount, statusChanges);
                        remainingAmount -= matchAmount;
                    }
                }
            }
        }
    
        await this.applyStatusChanges(statusChanges);
    
        return statusChanges;
    }

    // Purpose: Handle the matching logic
    async processBetMatching(bet, bets, statusChanges) {
        // Determine opposite bet type
        const oppositeType = bet.betType === 'PUMP' ? 'RUG' : 'PUMP';
    
        // Find potential matching units from other bets
        const potentialMatchingUnits = bets
            .filter(otherBet => 
                otherBet.marketId === bet.marketId && 
                otherBet.betType === oppositeType && 
                otherBet.id !== bet.id
            )
            .flatMap(otherBet => otherBet.units)
            // New filter to exclude already matched units
            .filter(unit => !statusChanges.has(unit.id));
    
        return potentialMatchingUnits;
    }

    // Purpose: Handle the actual matching of the unit
    async matchUnits(unit1, unit2, statusChanges) {
        try {
            // Validate input
            if (!unit1 || !unit2) {
                throw new Error('Both units must be provided for matching');
            }
    
            // Update status changes map
            statusChanges.set(unit1.id, {
                newStatus: 'MATCHED',
                matchedWith: unit2.id,
                timestamp: new Date(),
                betId: unit1.betId  // Add betId here
            });
    
            statusChanges.set(unit2.id, {
                newStatus: 'MATCHED',
                matchedWith: unit1.id,
                timestamp: new Date(),
                betId: unit2.betId  // Add betId here
            });
    
            return {
                success: true,
                unit1Id: unit1.id,
                unit2Id: unit2.id,
                matchedAt: new Date()
            };
        } catch (error) {
            throw new Error(`Unit matching failed: ${error.message}`);
        }
    }

    // Purpose: Checks if either of the 2 units needs splitting
    async checkIfUnitNeedsSplitting(unit1, unit2, matchAmount, statusChanges) {
        // Check if either unit needs splitting
        const unit1NeedsSplit = unit1.amount > matchAmount;
        const unit2NeedsSplit = unit2.amount > matchAmount;
    
        // Calculate potential remainders
        const unit1Remainder = unit1NeedsSplit ? unit1.amount - matchAmount : 0;
        const unit2Remainder = unit2NeedsSplit ? unit2.amount - matchAmount : 0;
    
        // If either remainder would be too small, don't split
        if ((unit1NeedsSplit && unit1Remainder < this.betUnitService.MINIMUM_UNIT_SIZE) || 
            (unit2NeedsSplit && unit2Remainder < this.betUnitService.MINIMUM_UNIT_SIZE)) {
            await this.matchUnits(unit1, unit2, statusChanges);
        } else if (unit1NeedsSplit || unit2NeedsSplit) {
            await this.splitUnits(unit1, unit2, matchAmount, statusChanges);
        } else {
            await this.matchUnits(unit1, unit2, statusChanges);
        }
    }

    // Purpose: Decide which unit needs splitting
    async splitUnits(unit1, unit2, matchAmount, statusChanges) {
        return await this.db.runInTransaction(async () => {
            let splitUnit1 = unit1;
            let splitUnit2 = unit2;
    
            if (unit1.amount > matchAmount) {
                const splitResult = await this.betUnitService.splitUnit(unit1, matchAmount);
                await this.matchUnits(splitResult[1], unit2, statusChanges);
            }
    
            if (unit2.amount > matchAmount) {
                const splitResult = await this.betUnitService.splitUnit(unit2, matchAmount);
                await this.matchUnits(splitResult[1], unit1, statusChanges);
            }
    
            return [splitUnit1, splitUnit2];
        });
    }
    
    async applyStatusChanges(statusChanges) {
        // First update all unit statuses
        const updateResult = await this.db.updateUnitStatuses(statusChanges);
        
        if (!updateResult.success) {
            throw new Error(updateResult.message);
        }

        // Get unique bet IDs and calculate matched amounts
        const betIds = new Set(
                 Array.from(statusChanges.values()).map(change => {
                console.log('Change:', change);
                return change.betId;
            })
        );
        
        // For each affected bet, calculate total matched amount and update status
        for (const betId of betIds) {
            try {
                // Get all units for this bet to calculate amounts
                const unitsQuery = await this.db.pool.query(
                    `SELECT 
                        SUM(CASE WHEN status = 'MATCHED' THEN amount ELSE 0 END) as matched_amount,
                        SUM(amount) as total_amount
                     FROM bet_units
                     WHERE bet_id = $1`,
                    [betId]
                );

                const { matched_amount, total_amount } = unitsQuery.rows[0];

                if (!betId) {
                    throw new Error('Bet id doesnt exist!');
                }

                // Let status service handle the bet status update
                await this.statusUpdateService.updateBetStatus(
                    betId,
                    matched_amount || 0,
                    total_amount || 0
                );

            } catch (error) {
                console.error(`Failed to update status for bet ${betId}:`);
                // Don't throw here - continue processing other bets
            }
        }

        return updateResult;
    }

    // Purpose: Determines if a bet is still eligible for matching
    // - Checks if the current time is within a configurable matching cut-off period for the market    // - Prevents matching bets after a certain point in the market's lifecycle
    async isMatchingAllowed(bet) {
        const market = await this.marketService.getMarket(bet.marketId);
    
        if (!market) {
            return false;
        }
    
        // Get timestamps
        const currentTime = Date.now();
        const marketStartTime = new Date(market.start_time).getTime();
        const marketEndTime = new Date(market.end_time).getTime();
    
        // Calculate 50% cut-off time
        const marketDurationMs = marketEndTime - marketStartTime;
        const halfTimeMark = marketStartTime + (marketDurationMs * 0.5);
    
        // Check if the current time is within the first 50% of the market duration
        const isWithinFirstHalf = currentTime >= marketStartTime && currentTime <= halfTimeMark;
    
        // Convert to minutes for better readability
        const marketDurationMin = marketDurationMs / 60000;
        const timeElapsedMin = (currentTime - marketStartTime) / 60000;
        const halfTimeMarkMin = (halfTimeMark - marketStartTime) / 60000;
    
        return isWithinFirstHalf;
    }
}

module.exports = MatchingFunnel;
