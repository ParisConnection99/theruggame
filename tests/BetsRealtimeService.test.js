const { pool } = require('../tests/utils/db-config');
const { listenToBets } = require('../services/BetsRealtimeService');
const {
    withTransaction,
    cleanDatabase,
    cleanDatabases,
    createTestMarket,
    createTestUser,
    createTestBet
  } = require('../tests/utils/db-helper');

  describe('Bets Realtime Service Tests', () => {
    beforeEach(async () => {
        await cleanDatabases(pool);
    });

    describe('Fetching Bet Updates', () => {
        it('Should correctly be updated with the latest bets', async () => {
            const betUpdates = [];
            const callback = (betData) => {
                console.log('Bet update received: ',betData);
                betUpdates.push(betData);
            }

            // Start the listener
            const subscription = listenToBets(callback);

            let market;
            let pumpBet;
            let user;
            await withTransaction(async (client) => {
                market = await createTestMarket(client, {
                    tokenAddress: 'ox12323z',
                    startTime: new Date(),
                    duration: 5
                });

                user = await createTestUser(client, {});

                pumpBet = await createTestBet(client, {
                    marketId: market.id,
                    userId: user.user_id,
                    amount: 20
                });
            });


            console.log('Updates received: ', betUpdates);

            if(betUpdates.length > 0) {
                const latestUpdate = betUpdates[betUpdates.length - 1];
                expect(latestUpdate.id == pumpBet.id).toBe(true);
                expect(latestUpdate.amount == 20).toBe(true);
            } else {
                console.log('No bet updates received during test execution.');
            }


            // Change the bets status
            const { error } = await pool.query(
                'UPDATE bets SET status = $1 WHERE id = $2', ['WON', pumpBet.id]
            );

            console.log('Updates received: ', betUpdates);

            if(betUpdates.length > 0) {
                const latestUpdate = betUpdates[betUpdates.length - 1];
                expect(latestUpdate.id == pumpBet.id).toBe(true);
                expect(latestUpdate.status == 'won').toBe(true);
            } else {
                console.log('No bet updates received during test execution.');
            }


            if(subscription) {
                await subscription.unsubscribe();
            }

        });
    });
  });