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
    
    const { 
      players, 
      winner, 
      final_scores, 
      rounds_played, 
      duration_minutes, 
      completed 
    }: CreateGameRequest = await request.json()
    
    if (!players || !Array.isArray(players) || players.length < 2) {
      return NextResponse.json({ error: 'At least 2 players are required' }, { status: 400 })
    }

    // Use provided final_scores or initialize as array of zeros
    const gameScores = final_scores || new Array(players.length).fill(0)
    const gameRounds = rounds_played || 0
    const gameCompleted = completed || false
    const gameDuration = duration_minutes || null
    
    const { rows } = await sql`
      INSERT INTO games (players, winner, final_scores, rounds_played, duration_minutes, completed) 
      VALUES (
        ${JSON.stringify(players)}, 
        ${winner}, 
        ${JSON.stringify(gameScores)}, 
        ${gameRounds}, 
        ${gameDuration}, 
        ${gameCompleted}
      ) 
      RETURNING id, players, winner, final_scores, rounds_played, duration_minutes, completed, created_at
    `
    
    return NextResponse.json({ game: rows[0] as Game })
  } catch (error) {
    console.error('Failed to create game:', error)
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
  }
}