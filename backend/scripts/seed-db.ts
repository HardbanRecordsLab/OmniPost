
import { pool } from '../db';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

async function seed() {
  try {
    console.log('Starting database migration...');

    // 1. Read the schema file
    const schemaPath = path.resolve('G:/VPS HardbanRecordsLab/Apps/OmniPost/full update and ready to use full app/database-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // 2. Execute schema
    // We might need to split by ; if the driver doesn't support multiple statements in one query,
    // but pg usually does. However, it's safer to execute as one block if possible.
    // The pool.query should handle multiple statements.
    await pool.query(schemaSql);
    console.log('Schema applied successfully.');

    // 3. Create Admin User
    const adminEmail = 'hardbanrecordslab.pl@gmail.com';
    const adminPassword = 'Kskomra19840220*';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    
    if (userCheck.rows.length === 0) {
      const insertUserSql = `
        INSERT INTO users (email, password_hash, full_name, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id;
      `;
      const res = await pool.query(insertUserSql, [adminEmail, hashedPassword, 'Admin']);
      console.log(`Admin user created with ID: ${res.rows[0].id}`);
    } else {
      console.log('Admin user already exists. Updating password...');
       await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, adminEmail]);
       console.log('Admin password updated.');
    }

    console.log('Database migration and seeding completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

seed();
