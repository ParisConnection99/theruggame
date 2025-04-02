// tests/utils/db-helper.js
const { pool } = require('./db-config');
const { v4: uuidv4 } = require('uuid');

async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');  // ✅ Ensure commit happens before returning
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function cleanDatabase(client) {
  try {
    await client.query('TRUNCATE markets, bets CASCADE');
  } catch (error) {
    console.error('Error cleaning database:', error);
    throw error;
  }
}

async function cleanDatabases(pool) {
  const client = await pool.connect();

  try {
    // Start a transaction
    await client.query('BEGIN');

    // Execute queries in order of dependencies
    await client.query('DELETE FROM bet_units;');
    await client.query('DELETE FROM refunds;');
    await client.query('DELETE FROM bets;');
    await client.query('DELETE FROM markets;');
    await client.query('DELETE FROM cashouts;');
    await client.query('DELETE FROM users;');
    await client.query('DELETE FROM tokens;');

    // Reset sequences
    await client.query('ALTER SEQUENCE markets_id_seq RESTART WITH 1;');
    await client.query('ALTER SEQUENCE bets_id_seq RESTART WITH 1;');
    await client.query('ALTER SEQUENCE bet_units_id_seq RESTART WITH 1;');

    // Commit the transaction
    await client.query('COMMIT');

    console.log('Database cleaned successfully');
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error cleaning database:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function createTestUser(client, { wallet_ca = uuidv4().toString(), balance = 0, username = uuidv4().toString() }) {
  try {
    const query = {
      text: `
        INSERT INTO users(
          profile_pic,
          wallet_ca,
          created_at,
          balance,
          username,
          status
        ) VALUES (
          'https://example.com/pic1.jpg',
          $1::TEXT,
          $2,
          $3::NUMERIC,
          $4::TEXT,
          'active'
        ) RETURNING *`,
      values: [wallet_ca, new Date(), balance, username]
    };

    console.log('🟡 Executing User Insert Query:', query);
    const { rows } = await client.query(query);

    if (!rows.length) {
      console.error('❌ User Insert Failed: No rows returned');
    } else {
      console.log('🟢 User Successfully Inserted:', rows[0]);
    }

    return rows[0];

  } catch (error) {
    console.error('❌ Error inserting user:', error);
    throw error;
  }
}

async function createTestMarket(client, { tokenAddress,
   startTime, 
   duration = 30, 
   status = 'OPEN', 
   phase = 'BETTING', 
   coinPrice = 0, 
   marketCap = 0, 
   liquidity = 0, 
   buys = 0, sells = 0, 
   dex_screener_url = '', 
   dex_id = '', 
   website_url = '', 
   icon_url = '', 
   coin_description = '', 
   socials = {},
   name = '' }) {
  console.log(`The Token address: ${tokenAddress}`);
  try {
    // ✅ Ensure startTime is properly formatted as TIMESTAMP WITH TIME ZONE
    const formattedDate = new Date(startTime).toISOString().replace('T', ' ').replace('Z', '+00');

    const query = {
      text: `
        INSERT INTO markets (
          token_address,
          start_time,
          end_time,
          duration,
          status,
          phase,
          total_pump_amount,
          total_rug_amount,
          current_pump_odds,
          current_rug_odds,
          initial_coin_price,
          initial_market_cap,
          initial_liquidity,
          initial_buy_txns,
          initial_sell_txns,
          dex_screener_url,
          dex_id,
          website_url,
          icon_url,
          coin_description,
          socials,
          name
        ) VALUES (
          $1, 
          $2::TIMESTAMP WITH TIME ZONE, 
          $2::TIMESTAMP WITH TIME ZONE + INTERVAL '${duration} minutes', 
          $3, 
          $4::TEXT, 
          $5::TEXT, 
          $6::NUMERIC,
          $7::NUMERIC,
          $8::NUMERIC,
          $9::NUMERIC,
          $10::NUMERIC,
          $11::NUMERIC,
          $12::NUMERIC,
          $13::NUMERIC,
          $14::NUMERIC,
          $15::TEXT,
          $16::TEXT,
          $17::TEXT,
          $18::TEXT,
          $19::TEXT,
          $20::JSONB,
          $21::TEXT
        ) RETURNING *`,
      values: [
        tokenAddress,
        formattedDate,
        duration,
        status,
        phase,
        0, // total_pump_amount
        0, // total_rug_amount
        2.0, // current_pump_odds
        2.0, // current_rug_odds
        coinPrice, // initial_coin_price
        marketCap, // initial_market_cap
        liquidity, // initial_liquidity
        buys, // initial_buy_txns
        sells, // initial_sell_txns
        dex_screener_url,
        dex_id,
        website_url,
        icon_url,
        coin_description,
        socials,
        name
      ]
    };

    console.log('🟡 Executing Market Insert Query:', query);
    const { rows } = await client.query(query);

    if (!rows.length) {
      console.error('❌ Market Insert Failed: No rows returned');
    } else {
      console.log('🟢 Market Successfully Inserted:', rows[0]);
    }

    return rows[0];
  } catch (error) {
    console.error('❌ Error inserting market:', error);
    throw error;
  }
}

async function systemFlagReady(pool) {
  const client = await pool.connect();
  const query = `
  UPDATE system_flags 
  SET value = 'ready', 
      updated_at = CURRENT_TIMESTAMP 
  WHERE key = 'reserve_fetch_status' `;

  await client.query(query);

  console.log('🟢 System Flag is ready:');
}


async function createTestBet(client, { marketId, userId, amount, betType = 'PUMP', status = 'PENDING', matchedAmount = 0, refundAmount = 0 }) {
  if (amount < 0.05) {
    throw new Error('Bet amount must be at least 0.05 SOL');
  }

  const fee = Math.round((amount * 0.01) * 1e6) / 1e6; // Round to 6 decimal places
  const netAmount = Math.round((amount - fee) * 1e6) / 1e6; // Round to 6 decimal places

  const query = {
    text: `
            INSERT INTO bets (
                market_id,
                user_id,
                amount,
                net_amount,
                fee,
                bet_type,
                status,
                odds_locked,
                potential_payout,
                matched_amount,
                refund_amount
            ) VALUES (
               $1::BIGINT, 
               $2::UUID, 
               $3::NUMERIC(20,8), 
               $4::NUMERIC(20,8), 
               $5::NUMERIC(20,8), 
               $6::TEXT,  
               $7::TEXT,
               2.0,   -- Fixed odds_locked
               $4 * 2,  -- Fixed potential_payout
               $8::NUMERIC(20,8),
               $9::NUMERIC(20,8)
            )
            RETURNING *;`,
    values: [marketId, userId, amount, netAmount, fee, betType, status, matchedAmount, refundAmount]
  };


  try {
    const result = await client.query(query);

    if (!result.rows.length) {
      throw new Error('Failed to insert bet: No rows returned');
    }

    console.log('✅ Bet created successfully:', result.rows[0]);
    return result.rows[0];

  } catch (error) {
    console.error('❌ Error creating test bet:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}


module.exports = {
  withTransaction,
  cleanDatabase,
  createTestMarket,
  createTestBet,
  cleanDatabases,
  createTestUser,
  systemFlagReady
};