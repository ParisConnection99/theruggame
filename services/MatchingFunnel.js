
// class MatchingFunnel {
//     constructor(db, config = {}, marketService, statusUpdateService, betUnitService) {
//         this.db = db;
//         this.config = config;
//         this.marketService = marketService;
//         this.statusUpdateService = statusUpdateService;
//         this.betUnitService = betUnitService;

//         // Configuration
//         // this.BATCH_SIZE = config.batchSize || 50;
//         // this.LOCK_TIMEOUT = config.lockTimeout || 5000;
//         this.MIN_MATCH_SIZE = config.minMatchSize || 0.1;
//         // this.RECHECK_INTERVALS = config.recheckIntervals || [1, 5, 15, 30 , 60]; 
//         // could change the intervals
//     }

//     // Purpose: Processes a batch of unwanted bets in a single transaction
//     // - Retrieves a batch of unwanted bets and their units
//     // - Attempts to match each bet
//     // - Returns the results of matching attempts 

//     async intakeUnits(db) {
//         let matchableBets;

//         try {
//             await db.runInTransaction(async () => {
//                 try {
//                     const bets = await this.db.getUnmatchedBets(this.BATCH_SIZE);

//                     console.log(`Bets: ${bets}`);
                    
//                     matchableBets = await Promise.all(
//                         bets.filter(async bet => await this.isMatchingAllowed(bet))
//                     );

//                     console.log(`Matchable bets: ${matchableBets}`);
                    
//                 } catch (innerError) {
//                     throw innerError; // Re-throw to trigger transaction rollback
//                 }
//             });
//         } catch (error) {
//             throw error;
//         }
//         return matchableBets;
//     }


//     // Purpose: Attempts to match a single bet with opposite betting units
//     // - Finds and matches units with opposite bet types
//     // - Handles partial matches and splits units if needed
//     // - Updates bet status based on matching results
//     // - ? Manages unmatched amounts by adding to a recheck queue ?

//     async matchBets(bets) {
//         const statusChanges = new Map();
    
//         for (const bet of bets) {
//             // Skip bets too small to match
//             if (bet.netAmount < this.MIN_MATCH_SIZE) continue;
    
//             let remainingAmount = bet.netAmount;
    
//             for (const unit of bet.units) {
//                 // Skip this unit if it's already matched or too small
//                 if (
//                     statusChanges.has(unit.id) || 
//                     unit.amount < this.MIN_MATCH_SIZE
//                 ) continue;
    
//                 const unmatchedUnits = await this.processBetMatching(bet, bets, statusChanges);
    
//                 for (const oppositeUnit of unmatchedUnits) {
//                     // Stop matching entire bet if no more amount to match
//                     if (remainingAmount < this.MIN_MATCH_SIZE) break;
    
//                     const matchAmount = Math.min(unit.amount, oppositeUnit.amount);
    
//                     if (matchAmount >= this.MIN_MATCH_SIZE) {
//                         await this.checkIfUnitNeedsSplitting(unit, oppositeUnit, matchAmount, statusChanges);
//                         remainingAmount -= matchAmount;
//                     }
//                 }
//             }
//         }
    
//         await this.applyStatusChanges(statusChanges);
    
//         return statusChanges;
//     }

//     // Purpose: Handle the matching logic
//     async processBetMatching(bet, bets, statusChanges) {
//         // Determine opposite bet type
//         const oppositeType = bet.betType === 'PUMP' ? 'RUG' : 'PUMP';
    
//         // Find potential matching units from other bets
//         const potentialMatchingUnits = bets
//             .filter(otherBet => 
//                 otherBet.marketId === bet.marketId && 
//                 otherBet.betType === oppositeType && 
//                 otherBet.id !== bet.id
//             )
//             .flatMap(otherBet => otherBet.units)
//             // New filter to exclude already matched units
//             .filter(unit => !statusChanges.has(unit.id));
    
//         return potentialMatchingUnits;
//     }

//     // Purpose: Handle the actual matching of the unit
//     async matchUnits(unit1, unit2, statusChanges) {
//         try {
//             // Validate input
//             if (!unit1 || !unit2) {
//                 throw new Error('Both units must be provided for matching');
//             }
    
//             // Update status changes map
//             statusChanges.set(unit1.id, {
//                 newStatus: 'MATCHED',
//                 matchedWith: unit2.id,
//                 timestamp: new Date(),
//                 betId: unit1.betId  // Add betId here
//             });
    
//             statusChanges.set(unit2.id, {
//                 newStatus: 'MATCHED',
//                 matchedWith: unit1.id,
//                 timestamp: new Date(),
//                 betId: unit2.betId  // Add betId here
//             });
    
//             return {
//                 success: true,
//                 unit1Id: unit1.id,
//                 unit2Id: unit2.id,
//                 matchedAt: new Date()
//             };
//         } catch (error) {
//             console.log(`Error matching units: ${error.message}`);
//             throw new Error(`Unit matching failed: ${error.message}`);
//         }
//     }

//     // Purpose: Checks if either of the 2 units needs splitting
//     async checkIfUnitNeedsSplitting(unit1, unit2, matchAmount, statusChanges) {
//         // Check if either unit needs splitting
//         const unit1NeedsSplit = unit1.amount > matchAmount;
//         const unit2NeedsSplit = unit2.amount > matchAmount;
    
//         // Calculate potential remainders
//         const unit1Remainder = unit1NeedsSplit ? unit1.amount - matchAmount : 0;
//         const unit2Remainder = unit2NeedsSplit ? unit2.amount - matchAmount : 0;
    
//         // If either remainder would be too small, don't split
//         if ((unit1NeedsSplit && unit1Remainder < this.betUnitService.MINIMUM_UNIT_SIZE) || 
//             (unit2NeedsSplit && unit2Remainder < this.betUnitService.MINIMUM_UNIT_SIZE)) {
//             await this.matchUnits(unit1, unit2, statusChanges);
//         } else if (unit1NeedsSplit || unit2NeedsSplit) {
//             await this.splitUnits(unit1, unit2, matchAmount, statusChanges);
//         } else {
//             await this.matchUnits(unit1, unit2, statusChanges);
//         }
//     }

//     // Purpose: Decide which unit needs splitting
//     async splitUnits(unit1, unit2, matchAmount, statusChanges) {
//         return await this.db.runInTransaction(async () => {
//             let splitUnit1 = unit1;
//             let splitUnit2 = unit2;
    
//             if (unit1.amount > matchAmount) {
//                 const splitResult = await this.betUnitService.splitUnit(unit1, matchAmount);
//                 await this.matchUnits(splitResult[1], unit2, statusChanges);
//             }
    
//             if (unit2.amount > matchAmount) {
//                 const splitResult = await this.betUnitService.splitUnit(unit2, matchAmount);
//                 await this.matchUnits(splitResult[1], unit1, statusChanges);
//             }
    
//             return [splitUnit1, splitUnit2];
//         });
//     }
    
//     async applyStatusChanges(statusChanges) {
//         // First update all unit statuses
//         const updateResult = await this.db.updateUnitStatuses(statusChanges);
        
//         if (!updateResult.success) {
//             throw new Error(updateResult.message);
//         }

//         // Get unique bet IDs and calculate matched amounts
//         const betIds = new Set(
//                  Array.from(statusChanges.values()).map(change => {
//                 console.log('Change:', change);
//                 return change.betId;
//             })
//         );
        
//         // For each affected bet, calculate total matched amount and update status
//         for (const betId of betIds) {
//             try {
//                 // Get all units for this bet to calculate amounts
//                 const unitsQuery = await this.db.pool.query(
//                     `SELECT 
//                         SUM(CASE WHEN status = 'MATCHED' THEN amount ELSE 0 END) as matched_amount,
//                         SUM(amount) as total_amount
//                      FROM bet_units
//                      WHERE bet_id = $1`,
//                     [betId]
//                 );

//                 const { matched_amount, total_amount } = unitsQuery.rows[0];

//                 if (!betId) {
//                     throw new Error('Bet id doesnt exist!');
//                 }

//                 // Let status service handle the bet status update
//                 await this.statusUpdateService.updateBetStatus(
//                     betId,
//                     matched_amount || 0,
//                     total_amount || 0
//                 );

//             } catch (error) {
//                 console.error(`Failed to update status for bet ${betId}:`);
//                 // Don't throw here - continue processing other bets
//             }
//         }

//         return updateResult;
//     }

//     // Purpose: Determines if a bet is still eligible for matching
//     // - Checks if the current time is within a configurable matching cut-off period for the market    // - Prevents matching bets after a certain point in the market's lifecycle
//     async isMatchingAllowed(bet) {
//         const market = await this.marketService.getMarket(bet.marketId);
    
//         if (!market) {
//             return false;
//         }
    
//         // Get timestamps
//         const currentTime = Date.now();
//         const marketStartTime = new Date(market.start_time).getTime();
//         const marketEndTime = new Date(market.end_time).getTime();
    
//         // Calculate 50% cut-off time
//         const marketDurationMs = marketEndTime - marketStartTime;
//         const halfTimeMark = marketStartTime + (marketDurationMs * 0.5);
    
//         // Check if the current time is within the first 50% of the market duration
//         const isWithinFirstHalf = currentTime >= marketStartTime && currentTime <= halfTimeMark;
    
//         // Convert to minutes for better readability
//         const marketDurationMin = marketDurationMs / 60000;
//         const timeElapsedMin = (currentTime - marketStartTime) / 60000;
//         const halfTimeMarkMin = (halfTimeMark - marketStartTime) / 60000;
    
//         return isWithinFirstHalf;
//     }
// }

// module.exports = MatchingFunnel;
class MatchingFunnel {
    constructor(db, config = {}, marketService, statusUpdateService, betUnitService) {
        this.db = db;
        this.config = config;
        this.marketService = marketService;
        this.statusUpdateService = statusUpdateService;
        this.betUnitService = betUnitService;

        // Configuration with defaults
        this.BATCH_SIZE = config.batchSize || 50;
        this.LOCK_TIMEOUT = config.lockTimeout || 5000;
        this.MIN_MATCH_SIZE = config.minMatchSize || 0.1;
        this.RECHECK_INTERVALS = config.recheckIntervals || [1, 5, 15, 30, 60];
        this.MARKET_MATCHING_CUTOFF_PERCENT = config.marketMatchingCutoffPercent || 0.5;
    }

    // Purpose: Processes a batch of unwanted bets in a single transaction
    // - Retrieves a batch of unwanted bets and their units
    // - Filters for bets eligible for matching
    // - Returns the filtered list of matchable bets
    async intakeUnits() {
        let matchableBets = [];

        try {
            await this.db.runInTransaction(async () => {
                try {
                    // Get unmatched bets
                    const bets = await this.db.getUnmatchedBets(this.BATCH_SIZE);
                    
                    if (!bets || bets.length === 0) {
                        console.log('No unmatched bets found');
                        return [];
                    }
                    
                    console.log(`Found ${bets.length} unmatched bets`);
                    
                    // Filter bets that are eligible for matching
                    // Using Promise.all correctly with a separate array filter
                    const matchingPromises = bets.map(async bet => {
                        const isAllowed = await this.isMatchingAllowed(bet);
                        return { bet, isAllowed };
                    });
                    
                    const results = await Promise.all(matchingPromises);
                    matchableBets = results
                        .filter(result => result.isAllowed)
                        .map(result => result.bet);
                    
                    console.log(`${matchableBets.length} bets are eligible for matching`);
                    
                } catch (innerError) {
                    console.error('Error in intakeUnits:', innerError);
                    throw innerError; // Re-throw to trigger transaction rollback
                }
            });
        } catch (error) {
            console.error('Transaction failed in intakeUnits:', error);
            throw error;
        }
        
        return matchableBets;
    }

    // Purpose: Attempts to match a set of bets with opposite betting units
    // - Finds and matches units with opposite bet types
    // - Handles partial matches and splits units if needed
    // - Updates bet status based on matching results
    async matchBets(bets) {
        if (!bets || bets.length === 0) {
            console.log('No bets to match');
            return new Map();
        }
        
        const statusChanges = new Map();
        
        // Group bets by marketId for more efficient matching
        const betsByMarket = this.groupBetsByMarket(bets);
        
        for (const [marketId, marketBets] of Object.entries(betsByMarket)) {
            await this.matchBetsInMarket(marketBets, statusChanges);
        }
        
        // Apply all status changes at once
        if (statusChanges.size > 0) {
            await this.applyStatusChanges(statusChanges);
        }
        
        return statusChanges;
    }
    
    // Helper method to group bets by marketId
    groupBetsByMarket(bets) {
        const betsByMarket = {};
        
        for (const bet of bets) {
            if (!betsByMarket[bet.marketId]) {
                betsByMarket[bet.marketId] = [];
            }
            betsByMarket[bet.marketId].push(bet);
        }
        
        return betsByMarket;
    }
    
    // Match bets within a single market
    async matchBetsInMarket(marketBets, statusChanges) {
        // Separate bets by type (PUMP vs RUG)
        const pumpBets = marketBets.filter(bet => bet.betType === 'PUMP');
        const rugBets = marketBets.filter(bet => bet.betType === 'RUG');
        
        // Sort bets by netAmount (largest first) for optimal matching
        pumpBets.sort((a, b) => b.netAmount - a.netAmount);
        rugBets.sort((a, b) => b.netAmount - a.netAmount);
        
        // Match PUMP bets against RUG bets
        for (const pumpBet of pumpBets) {
            if (pumpBet.netAmount < this.MIN_MATCH_SIZE) continue;
            
            for (const pumpUnit of pumpBet.units) {
                if (statusChanges.has(pumpUnit.id) || 
                    pumpUnit.amount < this.MIN_MATCH_SIZE) continue;
                
                // Try to match against available RUG units
                for (const rugBet of rugBets) {
                    for (const rugUnit of rugBet.units) {
                        if (statusChanges.has(rugUnit.id) || 
                            rugUnit.amount < this.MIN_MATCH_SIZE) continue;
                        
                        const matchAmount = Math.min(pumpUnit.amount, rugUnit.amount);
                        
                        if (matchAmount >= this.MIN_MATCH_SIZE) {
                            await this.checkIfUnitNeedsSplitting(
                                pumpUnit, rugUnit, matchAmount, statusChanges
                            );
                            
                            // If this unit is now fully matched, break the inner loop
                            if (statusChanges.has(pumpUnit.id)) break;
                        }
                    }
                    
                    // If this unit is now fully matched, break the outer loop
                    if (statusChanges.has(pumpUnit.id)) break;
                }
            }
        }
    }

    // Purpose: Handle the matching of two bet units
    async matchUnits(unit1, unit2, statusChanges) {
        try {
            // Validate input
            if (!unit1 || !unit2) {
                throw new Error('Both units must be provided for matching');
            }
            
            if (!unit1.id || !unit2.id) {
                throw new Error('Units must have valid IDs');
            }
            
            if (!unit1.betId || !unit2.betId) {
                throw new Error('Units must have valid bet IDs');
            }
            
            const matchTimestamp = new Date();
            
            // Update status changes map
            statusChanges.set(unit1.id, {
                newStatus: 'MATCHED',
                matchedWith: unit2.id,
                timestamp: matchTimestamp,
                betId: unit1.betId
            });
            
            statusChanges.set(unit2.id, {
                newStatus: 'MATCHED',
                matchedWith: unit1.id,
                timestamp: matchTimestamp,
                betId: unit2.betId
            });
            
            return {
                success: true,
                unit1Id: unit1.id,
                unit2Id: unit2.id,
                matchedAt: matchTimestamp
            };
        } catch (error) {
            console.error(`Error matching units ${unit1?.id} and ${unit2?.id}: ${error.message}`);
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
        const minimumUnitSize = this.betUnitService.MINIMUM_UNIT_SIZE || this.MIN_MATCH_SIZE;
        
        if ((unit1NeedsSplit && unit1Remainder < minimumUnitSize) || 
            (unit2NeedsSplit && unit2Remainder < minimumUnitSize)) {
            // If splitting would create too small a remainder, just match the entire units
            await this.matchUnits(unit1, unit2, statusChanges);
        } else if (unit1NeedsSplit || unit2NeedsSplit) {
            // One or both units need splitting
            await this.splitUnits(unit1, unit2, matchAmount, statusChanges);
        } else {
            // Units match exactly, no splitting needed
            await this.matchUnits(unit1, unit2, statusChanges);
        }
    }

    // Purpose: Split and match units as needed
    async splitUnits(unit1, unit2, matchAmount, statusChanges) {
        return await this.db.runInTransaction(async () => {
            let matchedUnit1 = unit1;
            let matchedUnit2 = unit2;
            
            if (unit1.amount > matchAmount) {
                // Split unit1 and use the split portion for matching
                const [remainingUnit, splitUnit] = await this.betUnitService.splitUnit(unit1, matchAmount);
                matchedUnit1 = splitUnit;
            }
            
            if (unit2.amount > matchAmount) {
                // Split unit2 and use the split portion for matching
                const [remainingUnit, splitUnit] = await this.betUnitService.splitUnit(unit2, matchAmount);
                matchedUnit2 = splitUnit;
            }
            
            // Match the (possibly split) units
            await this.matchUnits(matchedUnit1, matchedUnit2, statusChanges);
            
            return [matchedUnit1, matchedUnit2];
        });
    }
    
    // Purpose: Update unit statuses and recalculate bet statuses
    async applyStatusChanges(statusChanges) {
        // First update all unit statuses
        const updateResult = await this.db.updateUnitStatuses(statusChanges);
        
        if (!updateResult.success) {
            throw new Error(`Failed to update unit statuses: ${updateResult.message}`);
        }

        // Get unique bet IDs and calculate matched amounts
        const betIds = new Set();
        
        for (const change of statusChanges.values()) {
            if (change.betId) {
                betIds.add(change.betId);
            }
        }
        
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

                if (!unitsQuery.rows || unitsQuery.rows.length === 0) {
                    console.warn(`No units found for bet ${betId}`);
                    continue;
                }

                const { matched_amount, total_amount } = unitsQuery.rows[0];

                // Let status service handle the bet status update
                await this.statusUpdateService.updateBetStatus(
                    betId,
                    matched_amount || 0,
                    total_amount || 0
                );

            } catch (error) {
                console.error(`Failed to update status for bet ${betId}: ${error.message}`);
                // Don't throw here - continue processing other bets
            }
        }

        return {
            success: true,
            updatedBets: betIds.size,
            updatedUnits: statusChanges.size
        };
    }

    // Purpose: Determines if a bet is still eligible for matching
    async isMatchingAllowed(bet) {
        if (!bet || !bet.marketId) {
            console.warn('Invalid bet or missing marketId');
            return false;
        }
    
        try {
            const market = await this.marketService.getMarket(bet.marketId);
        
            if (!market) {
                console.warn(`Market ${bet.marketId} not found`);
                return false;
            }
        
            // Get timestamps
            const currentTime = Date.now();
            const marketStartTime = new Date(market.start_time).getTime();
            const marketEndTime = new Date(market.end_time).getTime();
        
            // Verify market timing is valid
            if (marketEndTime <= marketStartTime) {
                console.warn(`Invalid market timing for ${bet.marketId}: start=${market.start_time}, end=${market.end_time}`);
                return false;
            }
        
            // Calculate cutoff time (default 50%)
            const marketDurationMs = marketEndTime - marketStartTime;
            const cutoffMark = marketStartTime + (marketDurationMs * this.MARKET_MATCHING_CUTOFF_PERCENT);
        
            // Check if the current time is within the allowed matching period
            const isWithinMatchingPeriod = currentTime >= marketStartTime && currentTime <= cutoffMark;
        
            return isWithinMatchingPeriod;
        } catch (error) {
            console.error(`Error checking matching eligibility for bet ${bet.id}: ${error.message}`);
            return false;
        }
    }
    
    // Purpose: Calculate match statistics for reporting
    async getMatchingStats(timeframe = '24h') {
        try {
            // This is a placeholder for a method that could provide useful statistics
            // about the matching process (match rate, average match time, etc.)
            const stats = await this.db.getMatchingStats(timeframe);
            
            return {
                timeframe,
                totalBets: stats.totalBets || 0,
                matchedBets: stats.matchedBets || 0,
                matchRate: stats.matchRate || 0,
                averageMatchTime: stats.averageMatchTime || 0,
                totalMatchedVolume: stats.totalMatchedVolume || 0
            };
        } catch (error) {
            console.error(`Error fetching matching stats: ${error.message}`);
            return {
                timeframe,
                error: error.message
            };
        }
    }
}

module.exports = MatchingFunnel;