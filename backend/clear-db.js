const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.cszyqsqphkvddjvyhgeq:%25Peacemaker360%40@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  ssl: { rejectUnauthorized: false }
});

async function clearAll() {
  const client = await pool.connect();
  try {
    // Delete in FK order
    const tables = ['"Vote"', '"Candidate"', '"Election"', '"AuditLog"', '"Voter"', '"Admin"'];
    for (const table of tables) {
      const res = await client.query(`DELETE FROM ${table}`);
      console.log(`Deleted ${res.rowCount} rows from ${table}`);
    }
    console.log('\nAll accounts cleared!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

clearAll();
