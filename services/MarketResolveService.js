const OracleService = require('./OracleService');

class MarketResolveService {
    constructor(supabase) {
        this.supabase = supabase;

        /*
        - fetch the data from the DEXScreener api for the coin
        - decide weather it was a pump or rug
        - fetch all the bets that are, partially_matched + matched
        - update bets settled_at with the timestamp
        - send the payout to the payout table
        - send the payout to the users balance 
        */
    }
    /*

    */

    // Purpose: Return the result of the market
    /*
     - make a call to the dexscreener to fetch the information using the token address
     - evaluate the out come using the function
     - return the winner 
     */
    async resolveMarket(market) {
        if (!market.id) {
            throw new Error('Error processing Market.');
        }

        if (market.phase !== 'RESOLVED') {
            throw new Error('Market is not ready to be resolved.');
        }

        console.log(`Resolving market: ${JSON.stringify(market, null, 2)}`);
        // Fetch token details
        const token = await OracleService.fetchTokenDetails([market.token_address]);

        console.log('--- Market Resolution ---');
        // Debug the market object to see what properties are available
        console.log('Market object:', JSON.stringify(market, null, 2));

        // Debug the token response
        console.log('Token response:', JSON.stringify(token, null, 2));

        // Use proper property names - they might be snake_case in your database
        const initialData = {
            liquidity: parseFloat(market.initial_liquidity) || 0,
            price: parseFloat(market.initial_coin_price) || 0,
            marketCap: parseFloat(market.initial_market_cap) || 0,
            txns: {
                buys: parseInt(market.initial_buy_txns) || 0,
                sells: parseInt(market.initial_sell_txns) || 0
            },
            timestamp: new Date(market.created_at),
            duration: parseInt(market.duration) || 0
        };

        // Ensure token data is properly accessed
        const finalData = {
            liquidity: parseFloat(token[0].liquidity) || 0,
            price: parseFloat(token[0].priceUsd) || 0,
            marketCap: parseFloat(token[0].marketCap) || 0,
            txns: {
                buys: parseInt(Object.values(token[0].txns || {})[0]?.buys || 0),
                sells: parseInt(Object.values(token[0].txns || {})[0]?.sells || 0)
            },
            timestamp: Date.now()
        };

        // Make sure both objects have valid data before evaluation
        if (initialData.liquidity === undefined || finalData.liquidity === undefined) {
            console.error('Liquidity data is missing:', {
                initialLiquidity: market.initial_liquidity,
                tokenLiquidity: token.liquidity
            });
            throw new Error('Missing liquidity data for market evaluation');
        }

        const result = await this.evaluateMarketOutcome(initialData, finalData);

        console.log(`Final price: ${finalData.price}`);

        return { result: result, price: finalData.price };
    }

    async fetchBets(marketId) {
        if (!marketId) {
            throw new Error('Error processing MarketId.');
        }

        const { data: bets, error } = await this.supabase
            .from('bets')
            .select('id, status, amount, refund_amount')
            .eq('market_id', marketId)
            .in('status', ['PARTIALLY_MATCHED', 'MATCHED']);

        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }

        return bets;
    }

    async evaluateMarketOutcome(initialData, finalData, midwayData) {
        if (!initialData || !finalData || typeof initialData !== 'object' || typeof finalData !== 'object') {
            throw new Error('Invalid market data');
        }
        
        const requiredFields = ['liquidity', 'price', 'marketCap', 'txns', 'timestamp'];
        for (const field of requiredFields) {
            if (!initialData[field] || !finalData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        try {
            // Calculate percentage changes
            const liquidityChange = (finalData.liquidity / initialData.liquidity);
            const priceChange = ((finalData.price - initialData.price) / initialData.price) * 100;
            
            // Calculate total transaction volumes
            const totalBuys = finalData.txns.buys - initialData.txns.buys;
            const totalSells = finalData.txns.sells - initialData.txns.sells;
            
            // Determine the outcome result
            let result = 'HOUSE'; // Default result
            
            // Weighted combined movement (70% liquidity, 30% price)
            const combinedMovement = (liquidityChange * 0.7) + ((priceChange / 100 + 1) * 0.3);
            
            // Post-cutoff movement check (if midway data is provided)
            let postCutoffFactor = 1.0;
            if (midwayData) {
                const midwayLiquidityChange = (midwayData.liquidity / initialData.liquidity);
                const midwayPriceChange = ((midwayData.price - initialData.price) / initialData.price) * 100;
                
                const midwayCombinedMovement = (midwayLiquidityChange * 0.7) + ((midwayPriceChange / 100 + 1) * 0.3);
                const totalMovement = Math.abs(combinedMovement - 1);
                const midwayMovement = Math.abs(midwayCombinedMovement - 1);
                
                // If less than 20% of movement happened before cutoff, apply a small penalty
                if (midwayMovement < (totalMovement * 0.2) && totalMovement > 0.05) {
                    postCutoffFactor = 0.9; // 10% penalty to combined movement
                }
            }
            
            // Apply the post-cutoff factor
            const adjustedCombinedMovement = combinedMovement * postCutoffFactor;
            
            // Determine outcome based on combined movement
            if (liquidityChange <= 0.1) {
                // Keep the extreme liquidity drop as an immediate RUG condition
                result = 'RUG';  // 90%+ liquidity drop
            }
            else if (adjustedCombinedMovement >= 1.15) {
                // Combined movement is 15% or more up
                result = 'PUMP';
            }
            else if (adjustedCombinedMovement <= 0.85) {
                // Combined movement is 15% or more down
                result = 'RUG';
            }
            else {
                // Default result if none of the above conditions are met
                result = 'HOUSE';
            }
            
            // Log the result before returning
            console.log(`Market outcome: ${result}`);
            console.log(`Liquidity change: ${liquidityChange}`);
            console.log(`Price change: ${priceChange}%`);
            console.log(`Combined movement: ${combinedMovement}`);
            console.log(`Adjusted combined movement: ${adjustedCombinedMovement}`);
            console.log(`Buy/Sell ratio: ${totalBuys}/${totalSells}`);
            
            return result;
        } catch (error) {
            throw new Error(`Error evaluating market: ${error.message}`);
        }
    }

    // async evaluateMarketOutcome(initialData, finalData) {
    //     if (!initialData || !finalData || typeof initialData !== 'object' || typeof finalData !== 'object') {
    //         throw new Error('Invalid market data');
    //     }

    //     const requiredFields = ['liquidity', 'price', 'marketCap', 'txns', 'timestamp'];
    //     for (const field of requiredFields) {
    //         if (!initialData[field] || !finalData[field]) {
    //             throw new Error(`Missing required field: ${field}`);
    //         }
    //     }

    //     try {
    //         // Calculate percentage changes
    //         const liquidityChange = (finalData.liquidity / initialData.liquidity);
    //         const priceChange = ((finalData.price - initialData.price) / initialData.price) * 100;

    //         // Calculate total transaction volumes
    //         const totalBuys = finalData.txns.buys - initialData.txns.buys;
    //         const totalSells = finalData.txns.sells - initialData.txns.sells;

    //         // Determine the outcome result
    //         let result = 'HOUSE'; // Default result

    //         // // RUG conditions
    //         // if (liquidityChange <= 0.1) result = 'RUG';  // 90%+ liquidity drop
    //         // else if (priceChange <= -80) result = 'RUG';      // 80%+ price drop
    //         // // PUMP conditions
    //         // else if (priceChange >= 50) result = 'PUMP';      // 50%+ price increase
    //         // else if (totalBuys / Math.max(totalSells, 1) >= 5) result = 'PUMP';  // 5x buy volume

    //         const combinedMovement = liquidityChange + (priceChange / 100); // Convert price change % to decimal

    //         // Determine outcome based on combined movement
    //         if (liquidityChange <= 0.1) {
    //             // Keep the extreme liquidity drop as an immediate RUG condition
    //             result = 'RUG';  // 90%+ liquidity drop
    //         }
    //         else if (combinedMovement >= 1.10) {
    //             // Combined movement is 10% or more up
    //             result = 'PUMP';
    //         }
    //         else if (combinedMovement <= 0.90) {
    //             // Combined movement is 10% or more down
    //             result = 'RUG';
    //         }
    //         else {
    //             // Default result if none of the above conditions are met
    //             result = 'HOUSE';
    //         }

    //         // Log the result before returning
    //         console.log(`Market outcome: ${result}`);
    //         console.log(`Liquidity change: ${liquidityChange}`);
    //         console.log(`Price change: ${priceChange}%`);
    //         console.log(`Buy/Sell ratio: ${totalBuys}/${totalSells}`);

    //         return result;
    //     } catch (error) {
    //         throw new Error(`Error evaluating market: ${error.message}`);
    //     }
    // }
}

module.exports = MarketResolveService;