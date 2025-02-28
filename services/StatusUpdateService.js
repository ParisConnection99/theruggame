// class StatusUpdateService {
//     constructor(db, config, eventEmitter) {
//         this.db = db;
//         this.config = config;
//         this.eventEmitter = eventEmitter;

//         // Configuration
//         this.MATCHING_PRECISION = config.matchingPrecision || 0.000001; // SOL
//         this.VALID_STATUSES = new Set([
//             'PENDING',
//             'PARTIALLY_MATCHED',
//             'MATCHED'
//         ]);

//         // Valid status transitions
//         this.VALID_TRANSITIONS = {
//             'PENDING': ['PARTIALLY_MATCHED', 'MATCHED'],
//             'PARTIALLY_MATCHED': ['MATCHED'],
//             'MATCHED': [], // Terminal state
//         };
//     }

//     // Purpose: Updates the status of a bet based on matched and total amounts
//     // - Retrieves the existing bet
//     // - Calculates the new status
//     // - Validates the status transition
//     // - Logs status change history
//     // - Updates bet status in the database
//     // - Emits a status change event
//     async updateBetStatus(betId, matchedAmount, totalAmount) {
//         const bet = await this.db.getBet(betId);

//         console.log('update bet status fetched bet: ',bet);
//         if (!bet) {
//             throw new Error(`Bet ${betId} not found`);
//         }

//         const newStatus = this._calculateStatus(matchedAmount, totalAmount);

//         if (!this._isValidTransition(bet.status, newStatus)) {
//             throw new Error(`Invalid status transition from ${bet.status} to ${newStatus}`);
//         }

//         const statusHistory = {
//             betId,
//             oldStatus: bet.status,
//             newStatus,
//             matchedAmount: matchedAmount,
//             totalAmount: totalAmount,
//             timestamp: new Date(),
//             reason: this._getStatusChangeReason(bet.status, newStatus)
//         };

//         await this.db.runInTransaction(async (db) => {
//             await db.updateBetStatus(betId, newStatus, matchedAmount);
//             await db.insertStatusHistory(statusHistory);
//         });

//         this._emitStatusChangeEvent(bet, newStatus, statusHistory);

//         return newStatus;
//     }

//     // Purpose: Determines the appropriate status based on matched amount
//     // - Uses precision matching to determine full or partial match
//     // - Returns 'MATCHED', 'PARTIALLY_MATCHED', or 'PENDING'
//     _calculateStatus(matchedAmount, totalAmount) {
//         const difference = Math.abs(matchedAmount - totalAmount);
//         if (difference <= this.MATCHING_PRECISION) {
//             return 'MATCHED';
//         }
//         return matchedAmount > 0 ? 'PARTIALLY_MATCHED' : 'PENDING';
//     }

//     // Purpose: Validates status transitions
//     // - Ensures only allowed status changes occur
//     // - Prevents invalid state progressions
//     _isValidTransition(currentStatus, newStatus) {
//         if (currentStatus === newStatus) {
//             return true;  // Allow no-op transition
//         }
//         const allowedTransitions = this.VALID_TRANSITIONS[currentStatus];
//         return allowedTransitions && allowedTransitions.includes(newStatus);
//     }

//     _getStatusChangeReason(oldStatus, newStatus) {
//         const reasons = {
//             'PENDING_TO_PARTIALLY_MATCHED': 'Bet partially matched',
//             'PENDING_TO_MATCHED': 'Bet fully matched',
//             'PENDING_TO_CANCELED': 'Bet expired without matches',
//             'PARTIALLY_MATCHED_TO_MATCHED': 'Remaining amount matched'
//         };

//         const key = `${oldStatus || 'PENDING'}_TO_${newStatus}`;
//         return reasons[key] || 'Status updated';
//     }

//     // Purpose: Broadcasts status change events
//     // - Notifies other parts of the system about bet status updates
//     // - Provides comprehensive details about the status change
//     _emitStatusChangeEvent(bet, newStatus, statusHistory) {
//         this.eventEmitter.emit('betStatusChanged', {
//             betId: bet.id,
//             marketId: bet.marketId,
//             oldStatus: bet.status,
//             newStatus,
//             timestamp: new Date(),
//             statusHistory
//         });
//     }
// }

// module.exports = StatusUpdateService;

class StatusUpdateService {
    constructor(db, config = {}) {
        this.db = db;
        this.config = config;

        // Configuration
        this.MATCHING_PRECISION = config.matchingPrecision || 0.000001; // SOL
        this.VALID_STATUSES = new Set([
            'PENDING',
            'PARTIALLY_MATCHED',
            'MATCHED'
        ]);

        // Valid status transitions
        this.VALID_TRANSITIONS = {
            'PENDING': ['PARTIALLY_MATCHED', 'MATCHED'],
            'PARTIALLY_MATCHED': ['MATCHED'],
            'MATCHED': [], // Terminal state
        };
    }

    // Purpose: Updates the status of a bet based on matched and total amounts
    // - Retrieves the existing bet
    // - Calculates the new status
    // - Validates the status transition
    // - Logs status change history
    // - Updates bet status in the database
    async updateBetStatus(betId, matchedAmount, totalAmount) {
        const bet = await this.db.getBet(betId);

        console.log('update bet status fetched bet: ',bet);
        if (!bet) {
            throw new Error(`Bet ${betId} not found`);
        }

        const newStatus = this._calculateStatus(matchedAmount, totalAmount);

        if (!this._isValidTransition(bet.status, newStatus)) {
            throw new Error(`Invalid status transition from ${bet.status} to ${newStatus}`);
        }

        const statusHistory = {
            betId,
            oldStatus: bet.status,
            newStatus,
            matchedAmount: matchedAmount,
            totalAmount: totalAmount,
            timestamp: new Date(),
            reason: this._getStatusChangeReason(bet.status, newStatus)
        };

        await this.db.runInTransaction(async (db) => {
            await db.updateBetStatus(betId, newStatus, matchedAmount);
            await db.insertStatusHistory(statusHistory);
        });

        return newStatus;
    }

    // Purpose: Determines the appropriate status based on matched amount
    // - Uses precision matching to determine full or partial match
    // - Returns 'MATCHED', 'PARTIALLY_MATCHED', or 'PENDING'
    _calculateStatus(matchedAmount, totalAmount) {
        const difference = Math.abs(matchedAmount - totalAmount);
        if (difference <= this.MATCHING_PRECISION) {
            return 'MATCHED';
        }
        return matchedAmount > 0 ? 'PARTIALLY_MATCHED' : 'PENDING';
    }

    // Purpose: Validates status transitions
    // - Ensures only allowed status changes occur
    // - Prevents invalid state progressions
    _isValidTransition(currentStatus, newStatus) {
        if (currentStatus === newStatus) {
            return true;  // Allow no-op transition
        }
        const allowedTransitions = this.VALID_TRANSITIONS[currentStatus];
        return allowedTransitions && allowedTransitions.includes(newStatus);
    }

    _getStatusChangeReason(oldStatus, newStatus) {
        const reasons = {
            'PENDING_TO_PARTIALLY_MATCHED': 'Bet partially matched',
            'PENDING_TO_MATCHED': 'Bet fully matched',
            'PENDING_TO_CANCELED': 'Bet expired without matches',
            'PARTIALLY_MATCHED_TO_MATCHED': 'Remaining amount matched'
        };

        const key = `${oldStatus || 'PENDING'}_TO_${newStatus}`;
        return reasons[key] || 'Status updated';
    }
}

module.exports = StatusUpdateService;