import pool from './db.js';

async function testConnection() {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    console.log('✅ Database connected! Test result:', rows[0].result);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  } finally {``
    process.exit();
  }
}

testConnection();
