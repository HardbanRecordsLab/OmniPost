
import { pool } from '../db';
pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").then(r => {
    console.log(r.rows.map(t => t.table_name));
    pool.end();
});
