const { Client } = require('pg');

async function testConnection(password) {
  const url = `postgresql://postgres.cszyqsqphkvddjvyhgeq:${encodeURIComponent(password)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
  const client = new Client({ 
    connectionString: url,
    ssl: { rejectUnauthorized: false } // Bypass cert issue to test auth
  });
  
  try {
    await client.connect();
    console.log(`SUCCESS with password: ${password}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`FAILED with password: ${password} - Error: ${err.message}`);
    return false;
  }
}

async function run() {
  const passwords = [
    '%Peacemaker360@',
    'Peacemaker360@',
    'Peacemaker360',
    '%Peacemaker360'
  ];
  
  for (const p of passwords) {
    const success = await testConnection(p);
    if (success) break;
  }
}

run();
