import { NextRequest, NextResponse } from 'next/server'
import { sql, initializeDatabase } from '@/lib/database'
import type { Game, UpdateGameRequest } from '@/types/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase()
    
    const { id } = await params
    const gameId = parseInt(id)
    if (isNaN(gameId)) {
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 })
    }
    
    const { rows: gameRows } = await sql`
      SELECT id, players, winner, final_scores, rounds_played, duration_minutes, completed, created_at
      FROM games
      WHERE id = ${gameId}
    `
    
    if (gameRows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    
    const { rows: roundRows } = await sql`
      SELECT id, game_id, round_number, scores, auction_winner, initial_bid, promise_increased, final_promise, created_at
      FROM game_rounds
      WHERE game_id = ${gameId}
      ORDER BY round_number ASC
    `
    
    const game = { ...gameRows[0], rounds: roundRows } as Game
    
    return NextResponse.json({ game })
  } catch (error) {
    console.error('Failed to fetch game:', error)
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase()
    
    const { id } = await params
    const gameId = parseInt(id)
    if (isNaN(gameId)) {
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 })
    }
    
    const updates: UpdateGameRequest = await request.json()
    
    const setParts = []
    const values = []
    
    if (updates.winner !== undefined) {
      setParts.push(`winner = $${setParts.length + 2}`)
      values.push(updates.winner)
    }
    
    if (updates.final_scores !== undefined) {
      setParts.push(`final_scores = $${setParts.length + 2}`)
      values.push(JSON.stringify(updates.final_scores))
    }
    
    if (updates.rounds_played !== undefined) {
      setParts.push(`rounds_played = $${setParts.length + 2}`)
      values.push(updates.rounds_played)
    }
    
    if (updates.duration_minutes !== undefined) {
      setParts.push(`duration_minutes = $${setParts.length + 2}`)
      values.push(updates.duration_minutes)
    }
    
    if (updates.completed !== undefined) {
      setParts.push(`completed = $${setParts.length + 2}`)
      values.push(updates.completed)
    }
    
    if (setParts.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }
    
    const { rows } = await sql.query(
      `UPDATE games SET ${setParts.join(', ')} WHERE id = $1 RETURNING id, players, winner, final_scores, rounds_played, duration_minutes, completed, created_at`,
      [gameId, ...values]
    )
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    
    return NextResponse.json({ game: rows[0] as Game })
  } catch (error) {
    console.error('Failed to update game:', error)
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 })
  }
}