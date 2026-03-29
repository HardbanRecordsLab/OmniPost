
import { pool } from '../db';
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'posts'").then(r => {
    console.log(r.rows);
    pool.end();
});
