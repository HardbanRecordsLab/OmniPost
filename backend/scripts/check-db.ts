
import { pool } from '../db';

async function check() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';");
    console.log('Users table columns:', res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
