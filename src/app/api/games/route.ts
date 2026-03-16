import { NextRequest, NextResponse } from 'next/server'
import { sql, initializeDatabase } from '@/lib/database'
import type { Game, CreateGameRequest, UpdateGameRequest } from '@/types/database'

export async function GET() {
  try {
    await initializeDatabase()
    
    const { rows } = await sql`
      SELECT id, players, winner, final_scores, rounds_played, duration_minutes, completed, created_at
      FROM games
      ORDER BY created_at DESC
      LIMIT 20
    `
    
    return NextResponse.json({ games: rows as Game[] })
  } catch (error) {
    console.error('Failed to fetch games:', error)
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase()
    
    const { players }: CreateGameRequest = await request.json()
    
    if (!players || !Array.isArray(players) || players.length < 2) {
      return NextResponse.json({ error: 'At least 2 players are required' }, { status: 400 })
    }

    // Initialize final_scores as array of zeros
    const initialScores = new Array(players.length).fill(0)
    
    const { rows } = await sql`
      INSERT INTO games (players, final_scores, rounds_played, completed) 
      VALUES (${JSON.stringify(players)}, ${JSON.stringify(initialScores)}, 0, false) 
      RETURNING id, players, winner, final_scores, rounds_played, duration_minutes, completed, created_at
    `
    
    return NextResponse.json({ game: rows[0] as Game })
  } catch (error) {
    console.error('Failed to create game:', error)
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
  }
}