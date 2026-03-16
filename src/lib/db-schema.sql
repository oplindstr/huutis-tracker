-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  players JSONB NOT NULL, -- Array of player names
  winner VARCHAR(50),
  final_scores JSONB NOT NULL, -- Array of final scores
  rounds_played INTEGER DEFAULT 0,
  duration_minutes INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create game_rounds table for detailed round tracking
CREATE TABLE IF NOT EXISTS game_rounds (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  scores JSONB NOT NULL, -- Array of scores for this round
  auction_winner VARCHAR(50),
  initial_bid INTEGER,
  promise_increased BOOLEAN DEFAULT FALSE,
  final_promise INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create player_statistics view for easy stats access
CREATE OR REPLACE VIEW player_statistics AS
SELECT 
  p.name,
  p.id as player_id,
  COALESCE(COUNT(g.id), 0) as games_played,
  COALESCE(COUNT(CASE WHEN g.winner = p.name THEN 1 END), 0) as games_won,
  COALESCE(ROUND(AVG(
    CASE 
      WHEN g.final_scores IS NOT NULL 
      THEN (g.final_scores->>array_position(g.players::text[], p.name::text))::integer
    END
  ), 2), 0) as average_score,
  COALESCE(MAX(
    CASE 
      WHEN g.final_scores IS NOT NULL 
      THEN (g.final_scores->>array_position(g.players::text[], p.name::text))::integer
    END
  ), 0) as highest_score,
  COALESCE(MIN(
    CASE 
      WHEN g.final_scores IS NOT NULL 
      THEN (g.final_scores->>array_position(g.players::text[], p.name::text))::integer
    END
  ), 0) as lowest_score,
  p.created_at as joined_date
FROM players p
LEFT JOIN games g ON g.players::jsonb ? p.name AND g.completed = true
GROUP BY p.id, p.name, p.created_at
ORDER BY games_played DESC, games_won DESC;