// class MatchingFunnel {
//     constructor(db, config = {}, marketService, statusUpdateService, betUnitService, oddsService) {
//         this.db = db;
//         this.config = config;
//         this.marketService = marketService;
//         this.statusUpdateService = statusUpdateService;
//         this.betUnitService = betUnitService;
//         this.oddsService = oddsService;

//         // Configuration with defaults
//         this.BATCH_SIZE = config.batchSize || 50;
//         this.LOCK_TIMEOUT = config.lockTimeout || 5000;
//         this.MIN_MATCH_SIZE = config.minMatchSize || 0.1;
//         this.RECHECK_INTERVALS = config.recheckIntervals || [1, 5, 15, 30, 60];
//         this.MARKET_MATCHING_CUTOFF_PERCENT = config.marketMatchingCutoffPercent || 0.5;
//     }

//     // Purpose: Processes a batch of unwanted bets in a single transaction
//     // - Retrieves a batch of unwanted bets and their units
//     // - Filters for bets eligible for matching
//     // - Returns the filtered list of matchable bets
//     async intakeUnits() {
//         let matchableBets = [];

//         try {
//             await this.db.runInTransaction(async () => {
//                 try {
//                     // Get unmatched bets
//                     const bets = await this.db.getUnmatchedBets(this.BATCH_SIZE);
                    
//                     if (!bets || bets.length === 0) {
//                         console.log('No unmatched bets found');
//                         return [];
//                     }
                    
//                     console.log(`Found ${bets.length} unmatched bets`);
                    
//                     // Filter bets that are eligible for matching
//                     // Using Promise.all correctly with a separate array filter
//                     const matchingPromises = bets.map(async bet => {
//                         const isAllowed = await this.isMatchingAllowed(bet);
//                         return { bet, isAllowed };
//                     });
                    
//                     const results = await Promise.all(matchingPromises);
//                     matchableBets = results
//                         .filter(result => result.isAllowed)
//                         .map(result => result.bet);
                    
//                     console.log(`${matchableBets.length} bets are eligible for matching`);
                    
//                 } catch (innerError) {
//                     console.error('Error in intakeUnits:', innerError);
//                     throw innerError; // Re-throw to trigger transaction rollback
//                 }
//             });
//         } catch (error) {
//             console.error('Transaction failed in intakeUnits:', error);
//             throw error;
//         }
        
//         return matchableBets;
//     }

//     // Purpose: Attempts to match a set of bets with opposite betting units
//     // - Finds and matches units with opposite bet types
//     // - Handles partial matches and splits units if needed
//     // - Updates bet status based on matching results
//     async matchBets(bets) {
//         console.log('========== STARTING MATCHING PROCESS ==========');
//         console.log(`Received ${bets?.length || 0} bets to match`);
        
//         if (!bets || bets.length === 0) {
//             console.log('No bets to match, returning empty result');
//             return new Map();
//         }
        
//         const statusChanges = new Map();
//         console.log(`Bets to match: ${JSON.stringify(bets.map(b => ({
//             id: b.id,
//             marketId: b.marketId,
//             betType: b.betType,
//             netAmount: b.netAmount,
//             unitCount: b.units?.length || 0
//         })))}`);
        
//         // Group bets by marketId for more efficient matching
//         const betsByMarket = this.groupBetsByMarket(bets);
//         console.log(`Grouped bets into ${Object.keys(betsByMarket).length} markets`);
        
//         for (const [marketId, marketBets] of Object.entries(betsByMarket)) {
//             console.log(`\n----- Processing Market ID: ${marketId} with ${marketBets.length} bets -----`);
//             await this.matchBetsInMarket(marketBets, statusChanges);
//         }
        
//         // Apply all status changes at once
//         console.log(`\n----- Status Changes Summary -----`);
//         console.log(`Total units to update: ${statusChanges.size}`);
//         if (statusChanges.size > 0) {
//             console.log('Applying status changes to database...');
//             const result = await this.applyStatusChanges(statusChanges);
//             console.log(`Status update result: ${JSON.stringify(result)}`);
//         } else {
//             console.log('No status changes to apply');
//         }
        
//         console.log('========== MATCHING PROCESS COMPLETE ==========');
//         return statusChanges;
//     }
    
//     // Helper method to group bets by marketId
//     groupBetsByMarket(bets) {
//         const betsByMarket = {};
        
//         for (const bet of bets) {
//             if (!betsByMarket[bet.marketId]) {
//                 betsByMarket[bet.marketId] = [];
//             }
//             betsByMarket[bet.marketId].push(bet);
//         }
        
//         return betsByMarket;
//     }
    
//     // Match bets within a single market
//     async matchBetsInMarket(marketBets, statusChanges) {
//         // Separate bets by type (PUMP vs RUG)
//         const pumpBets = marketBets.filter(bet => bet.betType === 'PUMP');
//         const rugBets = marketBets.filter(bet => bet.betType === 'RUG');
        
//         console.log(`Market has ${pumpBets.length} PUMP bets and ${rugBets.length} RUG bets`);
        
//         // Sort bets by netAmount (largest first) for optimal matching
//         pumpBets.sort((a, b) => b.netAmount - a.netAmount);
//         rugBets.sort((a, b) => b.netAmount - a.netAmount);
        
//         console.log('PUMP bets ordered by size:');
//         pumpBets.forEach(bet => {
//             console.log(`  Bet ID: ${bet.id}, Amount: ${bet.netAmount}, Units: ${bet.units?.length || 0}`);
//         });
        
//         console.log('RUG bets ordered by size:');
//         rugBets.forEach(bet => {
//             console.log(`  Bet ID: ${bet.id}, Amount: ${bet.netAmount}, Units: ${bet.units?.length || 0}`);
//         });
        
//         let matchAttempts = 0;
//         let successfulMatches = 0;
        
//         // Match PUMP bets against RUG bets
//         for (const pumpBet of pumpBets) {
//             console.log(`\nProcessing PUMP bet ${pumpBet.id} with amount ${pumpBet.netAmount}`);
            
//             if (pumpBet.netAmount < this.MIN_MATCH_SIZE) {
//                 console.log(`  Skipping bet ${pumpBet.id}: amount ${pumpBet.netAmount} below minimum ${this.MIN_MATCH_SIZE}`);
//                 continue;
//             }
            
//             for (const pumpUnit of pumpBet.units) {
//                 console.log(`  Processing unit ${pumpUnit.id} with amount ${pumpUnit.amount}`);
                
//                 if (statusChanges.has(pumpUnit.id)) {
//                     console.log(`    Unit ${pumpUnit.id} already matched in this session, skipping`);
//                     continue;
//                 }
                
//                 if (pumpUnit.amount < this.MIN_MATCH_SIZE) {
//                     console.log(`    Unit ${pumpUnit.id} amount ${pumpUnit.amount} below minimum ${this.MIN_MATCH_SIZE}, skipping`);
//                     continue;
//                 }
                
//                 // Try to match against available RUG units
//                 console.log(`    Looking for matching RUG units for unit ${pumpUnit.id}`);
                
//                 let unitMatched = false;
//                 for (const rugBet of rugBets) {
//                     console.log(`      Checking RUG bet ${rugBet.id}`);
                    
//                     for (const rugUnit of rugBet.units) {
//                         matchAttempts++;
//                         console.log(`        Comparing with RUG unit ${rugUnit.id} (amount: ${rugUnit.amount})`);
                        
//                         if (statusChanges.has(rugUnit.id)) {
//                             console.log(`        Unit ${rugUnit.id} already matched in this session, skipping`);
//                             continue;
//                         }
                        
//                         if (rugUnit.amount < this.MIN_MATCH_SIZE) {
//                             console.log(`        Unit ${rugUnit.id} amount ${rugUnit.amount} below minimum ${this.MIN_MATCH_SIZE}, skipping`);
//                             continue;
//                         }
                        
//                         const matchAmount = Math.min(pumpUnit.amount, rugUnit.amount);
//                         console.log(`        Potential match amount: ${matchAmount}`);
                        
//                         if (matchAmount >= this.MIN_MATCH_SIZE) {
//                             console.log(`        Match found! Proceeding with match of ${matchAmount} between units ${pumpUnit.id} and ${rugUnit.id}`);
                            
//                             await this.checkIfUnitNeedsSplitting(
//                                 pumpUnit, rugUnit, matchAmount, statusChanges
//                             );
                            
//                             successfulMatches++;
//                             unitMatched = true;
                            
//                             // If this unit is now fully matched, break the inner loop
//                             if (statusChanges.has(pumpUnit.id)) {
//                                 console.log(`        Unit ${pumpUnit.id} fully matched, moving to next unit`);
//                                 break;
//                             }
//                         }
//                     }
                    
//                     // If this unit is now fully matched, break the outer loop
//                     if (statusChanges.has(pumpUnit.id)) {
//                         break;
//                     }
//                 }
                
//                 if (!unitMatched) {
//                     console.log(`    No match found for unit ${pumpUnit.id}`);
//                 }
//             }
//         }
        
//         console.log(`Market matching complete: ${successfulMatches} successful matches out of ${matchAttempts} attempts`);
//     }

//     // Purpose: Handle the matching of two bet units
//     async matchUnits(unit1, unit2, statusChanges) {
//         console.log(`Matching units: unit1=${unit1?.id || 'undefined'} (bet: ${unit1?.betId || 'unknown'}), unit2=${unit2?.id || 'undefined'} (bet: ${unit2?.betId || 'unknown'})`);
        
//         try {
//             // Validate input
//             if (!unit1 || !unit2) {
//                 const error = 'Both units must be provided for matching';
//                 console.error(error);
//                 throw new Error(error);
//             }
            
//             if (!unit1.id || !unit2.id) {
//                 const error = 'Units must have valid IDs';
//                 console.error(error, { unit1Id: unit1?.id, unit2Id: unit2?.id });
//                 throw new Error(error);
//             }
            
//             if (!unit1.betId || !unit2.betId) {
//                 const error = 'Units must have valid bet IDs';
//                 console.error(error, { unit1BetId: unit1?.betId, unit2BetId: unit2?.betId });
//                 throw new Error(error);
//             }
            
//             const matchTimestamp = new Date();
//             console.log(`Match timestamp: ${matchTimestamp.toISOString()}`);
            
//             // Check if already in status changes map
//             if (statusChanges.has(unit1.id)) {
//                 console.warn(`Unit ${unit1.id} already has a pending status change`);
//             }
            
//             if (statusChanges.has(unit2.id)) {
//                 console.warn(`Unit ${unit2.id} already has a pending status change`);
//             }
            
//             // Update status changes map
//             statusChanges.set(unit1.id, {
//                 newStatus: 'MATCHED',
//                 matchedWith: unit2.id,
//                 timestamp: matchTimestamp,
//                 betId: unit1.betId
//             });
            
//             statusChanges.set(unit2.id, {
//                 newStatus: 'MATCHED',
//                 matchedWith: unit1.id,
//                 timestamp: matchTimestamp,
//                 betId: unit2.betId
//             });
            
//             console.log(`Units successfully matched: ${unit1.id} <-> ${unit2.id}`);
            
//             return {
//                 success: true,
//                 unit1Id: unit1.id,
//                 unit2Id: unit2.id,
//                 matchedAt: matchTimestamp
//             };
//         } catch (error) {
//             console.error(`Error matching units ${unit1?.id} and ${unit2?.id}: ${error.message}`);
//             throw new Error(`Unit matching failed: ${error.message}`);
//         }
//     }

//     // Purpose: Checks if either of the 2 units needs splitting
//     async checkIfUnitNeedsSplitting(unit1, unit2, matchAmount, statusChanges) {
//         console.log(`Checking if units need splitting: unit1=${unit1.id} (${unit1.amount}), unit2=${unit2.id} (${unit2.amount}), matchAmount=${matchAmount}`);
        
//         // Check if either unit needs splitting
//         const unit1NeedsSplit = unit1.amount > matchAmount;
//         const unit2NeedsSplit = unit2.amount > matchAmount;
        
//         // Calculate potential remainders
//         const unit1Remainder = unit1NeedsSplit ? unit1.amount - matchAmount : 0;
//         const unit2Remainder = unit2NeedsSplit ? unit2.amount - matchAmount : 0;
        
//         // If either remainder would be too small, don't split
//         const minimumUnitSize = this.betUnitService.MINIMUM_UNIT_SIZE || this.MIN_MATCH_SIZE;
        
//         console.log(`Split analysis: unit1NeedsSplit=${unit1NeedsSplit} (remainder: ${unit1Remainder}), unit2NeedsSplit=${unit2NeedsSplit} (remainder: ${unit2Remainder}), minimumUnitSize=${minimumUnitSize}`);
        
//         if ((unit1NeedsSplit && unit1Remainder < minimumUnitSize) || 
//             (unit2NeedsSplit && unit2Remainder < minimumUnitSize)) {
//             // If splitting would create too small a remainder, just match the entire units
//             console.log(`Remainders too small, matching entire units without splitting`);
//             await this.matchUnits(unit1, unit2, statusChanges);
//         } else if (unit1NeedsSplit || unit2NeedsSplit) {
//             // One or both units need splitting
//             console.log(`Need to split units before matching`);
//             await this.splitUnits(unit1, unit2, matchAmount, statusChanges);
//         } else {
//             // Units match exactly, no splitting needed
//             console.log(`Units match exactly, no splitting needed`);
//             await this.matchUnits(unit1, unit2, statusChanges);
//         }
//     }

//     // Purpose: Split and match units as needed
//     async splitUnits(unit1, unit2, matchAmount, statusChanges) {
//         console.log(`Starting unit splitting process for match amount ${matchAmount}`);
        
//         return await this.db.runInTransaction(async () => {
//             console.log(`Beginning transaction for unit splitting`);
            
//             let matchedUnit1 = unit1;
//             let matchedUnit2 = unit2;
            
//             if (unit1.amount > matchAmount) {
//                 console.log(`Splitting unit1 (${unit1.id}): ${unit1.amount} into ${matchAmount} + ${unit1.amount - matchAmount}`);
//                 // Split unit1 and use the split portion for matching
//                 const [remainingUnit, splitUnit] = await this.betUnitService.splitUnit(unit1, matchAmount);
//                 console.log(`Unit1 split complete: original=${unit1.id}, remaining=${remainingUnit.id} (${remainingUnit.amount}), split=${splitUnit.id} (${splitUnit.amount})`);
//                 matchedUnit1 = splitUnit;
//             }
            
//             if (unit2.amount > matchAmount) {
//                 console.log(`Splitting unit2 (${unit2.id}): ${unit2.amount} into ${matchAmount} + ${unit2.amount - matchAmount}`);
//                 // Split unit2 and use the split portion for matching
//                 const [remainingUnit, splitUnit] = await this.betUnitService.splitUnit(unit2, matchAmount);
//                 console.log(`Unit2 split complete: original=${unit2.id}, remaining=${remainingUnit.id} (${remainingUnit.amount}), split=${splitUnit.id} (${splitUnit.amount})`);
//                 matchedUnit2 = splitUnit;
//             }
            
//             // Match the (possibly split) units
//             console.log(`Matching split units: ${matchedUnit1.id} (${matchedUnit1.amount}) with ${matchedUnit2.id} (${matchedUnit2.amount})`);
//             await this.matchUnits(matchedUnit1, matchedUnit2, statusChanges);
            
//             console.log(`Split and match process complete`);
//             return [matchedUnit1, matchedUnit2];
//         });
//     }
    
//     // Purpose: Update unit statuses and recalculate bet statuses
//     async applyStatusChanges(statusChanges) {
//         console.log(`\n----- APPLYING STATUS CHANGES -----`);
//         console.log(`Updating statuses for ${statusChanges.size} units`);
        
//         // Log all pending status changes
//         for (const [unitId, change] of statusChanges.entries()) {
//             console.log(`  Unit ${unitId}: new status=${change.newStatus}, matched with=${change.matchedWith}, bet=${change.betId}`);
//         }
        
//         // First update all unit statuses
//         console.log(`Calling database to update unit statuses...`);
//         const updateResult = await this.db.updateUnitStatuses(statusChanges);
        
//         if (!updateResult.success) {
//             const error = `Failed to update unit statuses: ${updateResult.message}`;
//             console.error(error);
//             throw new Error(error);
//         }
        
//         console.log(`Database update successful: ${JSON.stringify(updateResult)}`);

//         // Get unique bet IDs and calculate matched amounts
//         const betIds = new Set();
        
//         for (const change of statusChanges.values()) {
//             if (change.betId) {
//                 betIds.add(change.betId);
//             }
//         }
        
//         console.log(`Need to recalculate status for ${betIds.size} affected bets`);
        
//         // For each affected bet, calculate total matched amount and update status
//         for (const betId of betIds) {
//             try {
//                 console.log(`\nUpdating status for bet ${betId}:`);
                
//                 // Get all units for this bet to calculate amounts
//                 console.log(`  Querying database for units of bet ${betId}`);
//                 const unitsQuery = await this.db.pool.query(
//                     `SELECT 
//                         SUM(CASE WHEN status = 'MATCHED' THEN amount ELSE 0 END) as matched_amount,
//                         SUM(amount) as total_amount
//                      FROM bet_units
//                      WHERE bet_id = $1`,
//                     [betId]
//                 );

//                 if (!unitsQuery.rows || unitsQuery.rows.length === 0) {
//                     console.warn(`  No units found for bet ${betId}`);
//                     continue;
//                 }

//                 const { matched_amount, total_amount } = unitsQuery.rows[0];
//                 console.log(`  Query results: matched_amount=${matched_amount || 0}, total_amount=${total_amount || 0}`);

//                 // Let status service handle the bet status update
//                 console.log(`  Calling status update service for bet ${betId}`);
//                 await this.statusUpdateService.updateBetStatus(
//                     betId,
//                     matched_amount || 0,
//                     total_amount || 0
//                 );
//                 console.log(`  Status update completed for bet ${betId}`);

//             } catch (error) {
//                 console.error(`  Failed to update status for bet ${betId}: ${error.message}`);
//                 console.error(error.stack);
//                 // Don't throw here - continue processing other bets
//             }
//         }

//         console.log(`\nStatus update process complete for all bets`);
//         return {
//             success: true,
//             updatedBets: betIds.size,
//             updatedUnits: statusChanges.size
//         };
//     }

//     // Purpose: Determines if a bet is still eligible for matching
//     async isMatchingAllowed(bet) {
//         if (!bet || !bet.marketId) {
//             console.warn('Invalid bet or missing marketId');
//             return false;
//         }
    
//         try {
//             const market = await this.marketService.getMarket(bet.marketId);
        
//             if (!market) {
//                 console.warn(`Market ${bet.marketId} not found`);
//                 return false;
//             }
        
//             // Get timestamps
//             const currentTime = Date.now();
//             const marketStartTime = new Date(market.start_time).getTime();
//             const marketEndTime = new Date(market.end_time).getTime();
        
//             // Verify market timing is valid
//             if (marketEndTime <= marketStartTime) {
//                 console.warn(`Invalid market timing for ${bet.marketId}: start=${market.start_time}, end=${market.end_time}`);
//                 return false;
//             }
        
//             // Calculate cutoff time (default 50%)
//             const marketDurationMs = marketEndTime - marketStartTime;
//             const cutoffMark = marketStartTime + (marketDurationMs * this.MARKET_MATCHING_CUTOFF_PERCENT);
        
//             // Check if the current time is within the allowed matching period
//             const isWithinMatchingPeriod = currentTime >= marketStartTime && currentTime <= cutoffMark;
        
//             return isWithinMatchingPeriod;
//         } catch (error) {
//             console.error(`Error checking matching eligibility for bet ${bet.id}: ${error.message}`);
//             return false;
//         }
//     }
    
//     // Purpose: Calculate match statistics for reporting
//     async getMatchingStats(timeframe = '24h') {
//         try {
//             // This is a placeholder for a method that could provide useful statistics
//             // about the matching process (match rate, average match time, etc.)
//             const stats = await this.db.getMatchingStats(timeframe);
            
//             return {
//                 timeframe,
//                 totalBets: stats.totalBets || 0,
//                 matchedBets: stats.matchedBets || 0,
//                 matchRate: stats.matchRate || 0,
//                 averageMatchTime: stats.averageMatchTime || 0,
//                 totalMatchedVolume: stats.totalMatchedVolume || 0
//             };
//         } catch (error) {
//             console.error(`Error fetching matching stats: ${error.message}`);
//             return {
//                 timeframe,
//                 error: error.message
//             };
//         }
//     }
// }

// module.exports = MatchingFunnel;

class MatchingFunnel {
    constructor(db, config = {}, marketService, statusUpdateService, betUnitService, oddsService) {
        this.db = db;
        this.config = config;
        this.marketService = marketService;
        this.statusUpdateService = statusUpdateService;
        this.betUnitService = betUnitService;
        this.oddsService = oddsService;

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
        console.log('========== STARTING MATCHING PROCESS ==========');
        console.log(`Received ${bets?.length || 0} bets to match`);
        
        if (!bets || bets.length === 0) {
            console.log('No bets to match, returning empty result');
            return new Map();
        }
        
        const statusChanges = new Map();
        console.log(`Bets to match: ${JSON.stringify(bets.map(b => ({
            id: b.id,
            marketId: b.marketId,
            betType: b.betType,
            netAmount: b.netAmount,
            unitCount: b.units?.length || 0
        })))}`);
        
        // Group bets by marketId for more efficient matching
        const betsByMarket = this.groupBetsByMarket(bets);
        console.log(`Grouped bets into ${Object.keys(betsByMarket).length} markets`);
        
        for (const [marketId, marketBets] of Object.entries(betsByMarket)) {
            console.log(`\n----- Processing Market ID: ${marketId} with ${marketBets.length} bets -----`);
            await this.matchBetsInMarket(marketBets, statusChanges);
        }
        
        // Apply all status changes at once
        console.log(`\n----- Status Changes Summary -----`);
        console.log(`Total units to update: ${statusChanges.size}`);
        if (statusChanges.size > 0) {
            console.log('Applying status changes to database...');
            const result = await this.applyStatusChanges(statusChanges);
            console.log(`Status update result: ${JSON.stringify(result)}`);
        } else {
            console.log('No status changes to apply');
        }
        
        console.log('========== MATCHING PROCESS COMPLETE ==========');
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
        
        console.log(`Market has ${pumpBets.length} PUMP bets and ${rugBets.length} RUG bets`);
        
        // Sort bets by netAmount (largest first) for optimal matching
        pumpBets.sort((a, b) => b.netAmount - a.netAmount);
        rugBets.sort((a, b) => b.netAmount - a.netAmount);
        
        console.log('PUMP bets ordered by size:');
        pumpBets.forEach(bet => {
            console.log(`  Bet ID: ${bet.id}, Amount: ${bet.netAmount}, Units: ${bet.units?.length || 0}`);
        });
        
        console.log('RUG bets ordered by size:');
        rugBets.forEach(bet => {
            console.log(`  Bet ID: ${bet.id}, Amount: ${bet.netAmount}, Units: ${bet.units?.length || 0}`);
        });
        
        let matchAttempts = 0;
        let successfulMatches = 0;
        
        // Match PUMP bets against RUG bets
        for (const pumpBet of pumpBets) {
            console.log(`\nProcessing PUMP bet ${pumpBet.id} with amount ${pumpBet.netAmount}`);
            
            if (pumpBet.netAmount < this.MIN_MATCH_SIZE) {
                console.log(`  Skipping bet ${pumpBet.id}: amount ${pumpBet.netAmount} below minimum ${this.MIN_MATCH_SIZE}`);
                continue;
            }
            
            for (const pumpUnit of pumpBet.units) {
                console.log(`  Processing unit ${pumpUnit.id} with amount ${pumpUnit.amount}`);
                
                if (statusChanges.has(pumpUnit.id)) {
                    console.log(`    Unit ${pumpUnit.id} already matched in this session, skipping`);
                    continue;
                }
                
                if (pumpUnit.amount < this.MIN_MATCH_SIZE) {
                    console.log(`    Unit ${pumpUnit.id} amount ${pumpUnit.amount} below minimum ${this.MIN_MATCH_SIZE}, skipping`);
                    continue;
                }
                
                // Try to match against available RUG units
                console.log(`    Looking for matching RUG units for unit ${pumpUnit.id}`);
                
                let unitMatched = false;
                for (const rugBet of rugBets) {
                    console.log(`      Checking RUG bet ${rugBet.id}`);
                    
                    for (const rugUnit of rugBet.units) {
                        matchAttempts++;
                        console.log(`        Comparing with RUG unit ${rugUnit.id} (amount: ${rugUnit.amount})`);
                        
                        if (statusChanges.has(rugUnit.id)) {
                            console.log(`        Unit ${rugUnit.id} already matched in this session, skipping`);
                            continue;
                        }
                        
                        if (rugUnit.amount < this.MIN_MATCH_SIZE) {
                            console.log(`        Unit ${rugUnit.id} amount ${rugUnit.amount} below minimum ${this.MIN_MATCH_SIZE}, skipping`);
                            continue;
                        }
                        
                        const matchAmount = Math.min(pumpUnit.amount, rugUnit.amount);
                        console.log(`        Potential match amount: ${matchAmount}`);
                        
                        if (matchAmount >= this.MIN_MATCH_SIZE) {
                            console.log(`        Match found! Proceeding with match of ${matchAmount} between units ${pumpUnit.id} and ${rugUnit.id}`);
                            
                            await this.checkIfUnitNeedsSplitting(
                                pumpUnit, rugUnit, matchAmount, statusChanges
                            );
                            
                            successfulMatches++;
                            unitMatched = true;
                            
                            // If this unit is now fully matched, break the inner loop
                            if (statusChanges.has(pumpUnit.id)) {
                                console.log(`        Unit ${pumpUnit.id} fully matched, moving to next unit`);
                                break;
                            }
                        }
                    }
                    
                    // If this unit is now fully matched, break the outer loop
                    if (statusChanges.has(pumpUnit.id)) {
                        break;
                    }
                }
                
                if (!unitMatched) {
                    console.log(`    No match found for unit ${pumpUnit.id}`);
                }
            }
        }
        
        console.log(`Market matching complete: ${successfulMatches} successful matches out of ${matchAttempts} attempts`);
    }

    // Purpose: Create a match record and update market statistics via RPC
    async createMatchAndUpdateMarket(unit1, unit2, matchAmount) {
        console.log(`Creating match record for units: ${unit1.id} and ${unit2.id} with amount ${matchAmount}`);
        
        try {
            // Get the bet details for both units to determine bet types and market
            const [bet1, bet2] = await Promise.all([
                this.db.getBet(unit1.betId),
                this.db.getBet(unit2.betId)
            ]);

            if (!bet1 || !bet2) {
                const error = 'Failed to retrieve bet details';
                console.error(error, { bet1Id: unit1.betId, bet2Id: unit2.betId });
                throw new Error(error);
            }

            // Ensure we have a market ID
            const marketId = bet1.marketId || bet2.marketId;
            if (!marketId) {
                const error = 'No market ID found in either bet';
                console.error(error);
                throw new Error(error);
            }

            // Get current odds if available
            let pumpOdds = 0;
            let rugOdds = 0;
            try {
                const oddsData = await this.oddsService.getCurrentMatchedOdds(marketId);
                pumpOdds = oddsData?.pumpOdds || 0;
                rugOdds = oddsData?.rugOdds || 0;
                console.log(`Retrieved current odds for market ${marketId}: pump=${pumpOdds}, rug=${rugOdds}`);
            } catch (error) {
                console.warn(`Could not retrieve odds for market ${marketId}: ${error.message}`);
                // Continue without odds
            }

            // Call the RPC function to create match and update market statistics
            console.log(`Calling RPC to create match and update market statistics for market ${marketId}`);
            const rpcResult = await this.db.pool.query(
                `SELECT * FROM create_match_and_update_market($1, $2, $3, $4, $5, $6)`,
                [unit1.betId, unit2.betId, marketId, matchAmount, pumpOdds, rugOdds]
            );

            // Check if RPC was successful
            const result = rpcResult.rows && rpcResult.rows[0];
            if (!result || result.success === false) {
                const error = `RPC call failed: ${result?.error || 'Unknown error'}`;
                console.error(error);
                throw new Error(error);
            }

            console.log(`Match created successfully: ${JSON.stringify(result)}`);
            return {
                success: true,
                matchId: result.match_id,
                marketId: result.market_id,
                bet1Id: result.bet1_id,
                bet2Id: result.bet2_id,
                amount: result.amount,
                marketStats: {
                    totalMatchedPump: result.total_matched_pump,
                    totalMatchedRug: result.total_matched_rug
                }
            };
        } catch (error) {
            console.error(`Error creating match for units ${unit1?.id} and ${unit2?.id}: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Purpose: Handle the matching of two bet units
    async matchUnits(unit1, unit2, statusChanges) {
        console.log(`Matching units: unit1=${unit1?.id || 'undefined'} (bet: ${unit1?.betId || 'unknown'}), unit2=${unit2?.id || 'undefined'} (bet: ${unit2?.betId || 'unknown'})`);
        
        try {
            // Validate input
            if (!unit1 || !unit2) {
                const error = 'Both units must be provided for matching';
                console.error(error);
                throw new Error(error);
            }
            
            if (!unit1.id || !unit2.id) {
                const error = 'Units must have valid IDs';
                console.error(error, { unit1Id: unit1?.id, unit2Id: unit2?.id });
                throw new Error(error);
            }
            
            if (!unit1.betId || !unit2.betId) {
                const error = 'Units must have valid bet IDs';
                console.error(error, { unit1BetId: unit1?.betId, unit2BetId: unit2?.betId });
                throw new Error(error);
            }

            // Match amount is the minimum of both unit amounts (should be the same at this point)
            const matchAmount = Math.min(unit1.amount, unit2.amount);
            console.log(`Match amount: ${matchAmount}`);

            // Create match record and update market statistics
            const matchResult = await this.createMatchAndUpdateMarket(unit1, unit2, matchAmount);
            
            if (!matchResult.success) {
                throw new Error(`Failed to create match: ${matchResult.error}`);
            }
            
            const matchTimestamp = new Date();
            console.log(`Match timestamp: ${matchTimestamp.toISOString()}`);
            
            // Check if already in status changes map
            if (statusChanges.has(unit1.id)) {
                console.warn(`Unit ${unit1.id} already has a pending status change`);
            }
            
            if (statusChanges.has(unit2.id)) {
                console.warn(`Unit ${unit2.id} already has a pending status change`);
            }
            
            // Update status changes map with match ID
            statusChanges.set(unit1.id, {
                newStatus: 'MATCHED',
                matchedWith: unit2.id,
                timestamp: matchTimestamp,
                betId: unit1.betId,
                matchId: matchResult.matchId // Add match ID from RPC result
            });
            
            statusChanges.set(unit2.id, {
                newStatus: 'MATCHED',
                matchedWith: unit1.id,
                timestamp: matchTimestamp,
                betId: unit2.betId,
                matchId: matchResult.matchId // Add match ID from RPC result
            });
            
            console.log(`Units successfully matched: ${unit1.id} <-> ${unit2.id}, Match ID: ${matchResult.matchId}`);
            
            return {
                success: true,
                unit1Id: unit1.id,
                unit2Id: unit2.id,
                matchedAt: matchTimestamp,
                matchId: matchResult.matchId
            };
        } catch (error) {
            console.error(`Error matching units ${unit1?.id} and ${unit2?.id}: ${error.message}`);
            throw new Error(`Unit matching failed: ${error.message}`);
        }
    }

    // Purpose: Checks if either of the 2 units needs splitting
    async checkIfUnitNeedsSplitting(unit1, unit2, matchAmount, statusChanges) {
        console.log(`Checking if units need splitting: unit1=${unit1.id} (${unit1.amount}), unit2=${unit2.id} (${unit2.amount}), matchAmount=${matchAmount}`);
        
        // Check if either unit needs splitting
        const unit1NeedsSplit = unit1.amount > matchAmount;
        const unit2NeedsSplit = unit2.amount > matchAmount;
        
        // Calculate potential remainders
        const unit1Remainder = unit1NeedsSplit ? unit1.amount - matchAmount : 0;
        const unit2Remainder = unit2NeedsSplit ? unit2.amount - matchAmount : 0;
        
        // If either remainder would be too small, don't split
        const minimumUnitSize = this.betUnitService.MINIMUM_UNIT_SIZE || this.MIN_MATCH_SIZE;
        
        console.log(`Split analysis: unit1NeedsSplit=${unit1NeedsSplit} (remainder: ${unit1Remainder}), unit2NeedsSplit=${unit2NeedsSplit} (remainder: ${unit2Remainder}), minimumUnitSize=${minimumUnitSize}`);
        
        if ((unit1NeedsSplit && unit1Remainder < minimumUnitSize) || 
            (unit2NeedsSplit && unit2Remainder < minimumUnitSize)) {
            // If splitting would create too small a remainder, just match the entire units
            console.log(`Remainders too small, matching entire units without splitting`);
            await this.matchUnits(unit1, unit2, statusChanges);
        } else if (unit1NeedsSplit || unit2NeedsSplit) {
            // One or both units need splitting
            console.log(`Need to split units before matching`);
            await this.splitUnits(unit1, unit2, matchAmount, statusChanges);
        } else {
            // Units match exactly, no splitting needed
            console.log(`Units match exactly, no splitting needed`);
            await this.matchUnits(unit1, unit2, statusChanges);
        }
    }

    // Purpose: Split and match units as needed
    async splitUnits(unit1, unit2, matchAmount, statusChanges) {
        console.log(`Starting unit splitting process for match amount ${matchAmount}`);
        
        return await this.db.runInTransaction(async () => {
            console.log(`Beginning transaction for unit splitting`);
            
            let matchedUnit1 = unit1;
            let matchedUnit2 = unit2;
            
            if (unit1.amount > matchAmount) {
                console.log(`Splitting unit1 (${unit1.id}): ${unit1.amount} into ${matchAmount} + ${unit1.amount - matchAmount}`);
                // Split unit1 and use the split portion for matching
                const [remainingUnit, splitUnit] = await this.betUnitService.splitUnit(unit1, matchAmount);
                console.log(`Unit1 split complete: original=${unit1.id}, remaining=${remainingUnit.id} (${remainingUnit.amount}), split=${splitUnit.id} (${splitUnit.amount})`);
                matchedUnit1 = splitUnit;
            }
            
            if (unit2.amount > matchAmount) {
                console.log(`Splitting unit2 (${unit2.id}): ${unit2.amount} into ${matchAmount} + ${unit2.amount - matchAmount}`);
                // Split unit2 and use the split portion for matching
                const [remainingUnit, splitUnit] = await this.betUnitService.splitUnit(unit2, matchAmount);
                console.log(`Unit2 split complete: original=${unit2.id}, remaining=${remainingUnit.id} (${remainingUnit.amount}), split=${splitUnit.id} (${splitUnit.amount})`);
                matchedUnit2 = splitUnit;
            }
            
            // Match the (possibly split) units
            console.log(`Matching split units: ${matchedUnit1.id} (${matchedUnit1.amount}) with ${matchedUnit2.id} (${matchedUnit2.amount})`);
            await this.matchUnits(matchedUnit1, matchedUnit2, statusChanges);
            
            console.log(`Split and match process complete`);
            return [matchedUnit1, matchedUnit2];
        });
    }
    
    // Purpose: Update unit statuses and recalculate bet statuses
    async applyStatusChanges(statusChanges) {
        console.log(`\n----- APPLYING STATUS CHANGES -----`);
        console.log(`Updating statuses for ${statusChanges.size} units`);
        
        // Log all pending status changes
        for (const [unitId, change] of statusChanges.entries()) {
            console.log(`  Unit ${unitId}: new status=${change.newStatus}, matched with=${change.matchedWith}, bet=${change.betId}`);
        }
        
        // First update all unit statuses
        console.log(`Calling database to update unit statuses...`);
        const updateResult = await this.db.updateUnitStatuses(statusChanges);
        
        if (!updateResult.success) {
            const error = `Failed to update unit statuses: ${updateResult.message}`;
            console.error(error);
            throw new Error(error);
        }
        
        console.log(`Database update successful: ${JSON.stringify(updateResult)}`);

        // Get unique bet IDs and calculate matched amounts
        const betIds = new Set();
        
        for (const change of statusChanges.values()) {
            if (change.betId) {
                betIds.add(change.betId);
            }
        }
        
        console.log(`Need to recalculate status for ${betIds.size} affected bets`);
        
        // For each affected bet, calculate total matched amount and update status
        for (const betId of betIds) {
            try {
                console.log(`\nUpdating status for bet ${betId}:`);
                
                // Get all units for this bet to calculate amounts
                console.log(`  Querying database for units of bet ${betId}`);
                const unitsQuery = await this.db.pool.query(
                    `SELECT 
                        SUM(CASE WHEN status = 'MATCHED' THEN amount ELSE 0 END) as matched_amount,
                        SUM(amount) as total_amount
                     FROM bet_units
                     WHERE bet_id = $1`,
                    [betId]
                );

                if (!unitsQuery.rows || unitsQuery.rows.length === 0) {
                    console.warn(`  No units found for bet ${betId}`);
                    continue;
                }

                const { matched_amount, total_amount } = unitsQuery.rows[0];
                console.log(`  Query results: matched_amount=${matched_amount || 0}, total_amount=${total_amount || 0}`);

                // Let status service handle the bet status update
                console.log(`  Calling status update service for bet ${betId}`);
                await this.statusUpdateService.updateBetStatus(
                    betId,
                    matched_amount || 0,
                    total_amount || 0
                );
                console.log(`  Status update completed for bet ${betId}`);

            } catch (error) {
                console.error(`  Failed to update status for bet ${betId}: ${error.message}`);
                console.error(error.stack);
                // Don't throw here - continue processing other bets
            }
        }

        console.log(`\nStatus update process complete for all bets`);
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