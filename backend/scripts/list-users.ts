
import { pool } from '../db';
pool.query('SELECT * FROM users').then(r => { console.log(r.rows); pool.end(); });
