require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: `postgresql://postgres.molrjroewztjwyiksluz:${process.env.POSTGRES_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  ssl: {
    rejectUnauthorized: false
  },
  // Connection pool settings
  max: 20,                         // maximum number of clients in the pool
  idleTimeoutMillis: 30000,       // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000,   // how long to wait when connecting a new client
  maxUses: 7500,                  // number of times a client can be used before being recycled
  statement_timeout: 10000,        // timeout queries after 10s to prevent hanging
  keepAlive: true,                // helps prevent connection timeouts
  allowExitOnIdle: true           // allows the pool to exit even if there are idle clients
});

// Add error handling for the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Set statement timeout on each new connection
pool.on('connect', (client) => {
  client.query('SET statement_timeout = 10000');
});

// Enhanced test connection function
async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    
    // Test basic connectivity
    const timeResult = await client.query('SELECT NOW()');
    console.log('Database connection successful:', timeResult.rows[0]);
    
    // Test transaction support
    await client.query('BEGIN');
    await client.query('COMMIT');
    
    // Test connection parameters
    const settings = await client.query(`
      SELECT name, setting 
      FROM pg_settings 
      WHERE name IN ('statement_timeout', 'idle_in_transaction_timeout')
    `);
    console.log('Database settings:', settings.rows);
    
    return true;
  } catch (err) {
    console.error('Database connection error:', err);
    throw err;
  } finally {
    if (client) {
      client.release(true); // force release even if there's an error
    }
  }
}

// Pool cleanup function
async function closePool() {
  try {
    await pool.end();
    console.log('Pool has ended');
  } catch (err) {
    console.error('Error closing pool:', err);
    throw err;
  }
}

// Export functions and pool
module.exports = {
  pool,
  testConnection,
  closePool
};