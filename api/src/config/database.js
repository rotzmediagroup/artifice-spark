import pkg from 'pg';
const { Pool } = pkg;

let pool;

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://rotz_user:rotz_password_2024@localhost:5432/rotz_image_generator',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Initialize database connection pool
export const initDatabase = async () => {
  try {
    pool = new Pool(dbConfig);
    
    // Test the connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    
    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('📅 Database time:', result.rows[0].now);
    
    client.release();
    
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// Get database pool instance
export const getPool = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
};

// Execute query with error handling
export const query = async (text, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Execute transaction
export const transaction = async (queries) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const results = [];
    for (const { text, params } of queries) {
      const result = await client.query(text, params);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Close database connection
export const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
};

// Handle graceful shutdown
process.on('SIGINT', closeDatabase);
process.on('SIGTERM', closeDatabase);