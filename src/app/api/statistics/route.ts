import { NextRequest, NextResponse } from 'next/server'
import { sql, initializeDatabase } from '@/lib/database'
import type { PlayerStatistics } from '@/types/database'

export async function GET() {
  try {
    await initializeDatabase()
    
    const { rows } = await sql`
      WITH player_game_data AS (
        SELECT 
          p.id as player_id,
          p.name,
          g.id as game_id,
          g.winner,
          g.final_scores,
          g.players,
          g.completed,
          g.created_at as game_date
        FROM players p
        LEFT JOIN games g ON g.players::jsonb ? p.name::text AND g.completed = true
      ),
      player_scores AS (
        SELECT 
          player_id,
          name,
          game_id,
          winner,
          completed,
          CASE 
            WHEN final_scores IS NOT NULL AND completed = true THEN
              (final_scores->(
                SELECT i 
                FROM generate_series(0, jsonb_array_length(players)-1) AS i 
                WHERE players->>i = name
                LIMIT 1
              ))::integer
          END as player_score
        FROM player_game_data
        WHERE game_id IS NOT NULL
      )
      SELECT 
        name,
        player_id,
        COALESCE(COUNT(game_id), 0) as games_played,
        COALESCE(COUNT(CASE WHEN winner = name THEN 1 END), 0) as games_won,
        COALESCE(ROUND(AVG(player_score)::numeric, 2), 0) as average_score,
        COALESCE(MAX(player_score), 0) as highest_score,
        COALESCE(MIN(player_score), 0) as lowest_score,
        (SELECT created_at FROM players WHERE id = player_id) as joined_date
      FROM player_scores
      GROUP BY player_id, name
      UNION ALL
      SELECT 
        p.name,
        p.id as player_id,
        0 as games_played,
        0 as games_won,
        0 as average_score,
        0 as highest_score,
        0 as lowest_score,
        p.created_at as joined_date
      FROM players p
      WHERE NOT EXISTS (
        SELECT 1 FROM games g WHERE g.players::jsonb ? p.name::text AND g.completed = true
      )
      ORDER BY games_played DESC, games_won DESC
    `
    
    return NextResponse.json({ statistics: rows as PlayerStatistics[] })
  } catch (error) {
    console.error('Failed to fetch statistics:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}