import { NextRequest, NextResponse } from 'next/server'
import { sql, initializeDatabase } from '@/lib/database'
import type { GameRound, AddRoundRequest } from '@/types/database'

export async function POST(
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
    
    const roundData: AddRoundRequest = await request.json()
    
    if (!roundData.scores || !Array.isArray(roundData.scores)) {
      return NextResponse.json({ error: 'Scores array is required' }, { status: 400 })
    }
    
    // Get the current number of rounds for this game
    const { rows: countRows } = await sql`
      SELECT COUNT(*) as round_count FROM game_rounds WHERE game_id = ${gameId}
    `
    
    const roundNumber = parseInt(countRows[0].round_count) + 1
    
    const { rows } = await sql`
      INSERT INTO game_rounds (
        game_id, 
        round_number, 
        scores, 
        auction_winner, 
        initial_bid, 
        promise_increased, 
        final_promise
      ) 
      VALUES (
        ${gameId}, 
        ${roundNumber}, 
        ${JSON.stringify(roundData.scores)}, 
        ${roundData.auction_winner || null}, 
        ${roundData.initial_bid || null}, 
        ${roundData.promise_increased || false}, 
        ${roundData.final_promise || null}
      ) 
      RETURNING id, game_id, round_number, scores, auction_winner, initial_bid, promise_increased, final_promise, created_at
    `
    
    // Update the game's rounds_played count
    await sql`
      UPDATE games 
      SET rounds_played = ${roundNumber}
      WHERE id = ${gameId}
    `
    
    return NextResponse.json({ round: rows[0] as GameRound })
  } catch (error) {
    console.error('Failed to add round:', error)
    return NextResponse.json({ error: 'Failed to add round' }, { status: 500 })
  }
}