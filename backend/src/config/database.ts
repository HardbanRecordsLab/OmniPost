import { Pool } from 'pg';

// PostgreSQL connection setup
const pool = new Pool({
    user: 'your_user', // replace with your database user
    host: 'localhost',
    database: 'your_database', // replace with your database name
    password: 'your_password', // replace with your database password
    port: 5432,
});

// Export the pool for use in other parts of the application
export default pool;
