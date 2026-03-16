import { sql } from '@vercel/postgres'

export async function initializeDatabase() {
  try {
    // Check if tables exist and create them if they don't
    await sql`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `

    await sql`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        players JSONB NOT NULL,
        winner VARCHAR(50),
        final_scores JSONB NOT NULL,
        rounds_played INTEGER DEFAULT 0,
        duration_minutes INTEGER,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `

    await sql`
      CREATE TABLE IF NOT EXISTS game_rounds (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
        round_number INTEGER NOT NULL,
        scores JSONB NOT NULL,
        auction_winner VARCHAR(50),
        initial_bid INTEGER,
        promise_increased BOOLEAN DEFAULT FALSE,
        final_promise INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `

    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
    throw error
  }
}

export { sql }