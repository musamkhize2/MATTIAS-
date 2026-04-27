import mysql from 'mysql2/promise';
import fs from 'fs';

const sql = fs.readFileSync('./drizzle/0002_optimal_vanisher.sql', 'utf8');

async function applyMigrations() {
  try {
    const conn = await mysql.createConnection(process.env.DATABASE_URL);
    
    // Split by statement-breakpoint
    const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s);
    
    for (const stmt of statements) {
      console.log('Executing:', stmt.substring(0, 60) + '...');
      await conn.execute(stmt);
    }
    
    console.log('✓ Migrations applied successfully');
    
    // Verify tables exist
    const [tables] = await conn.execute('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('Tables in database:', tableNames);
    
    await conn.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

applyMigrations();
