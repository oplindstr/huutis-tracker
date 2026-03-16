import { NextRequest, NextResponse } from 'next/server'
import { sql, initializeDatabase } from '@/lib/database'
import type { Player } from '@/types/database'

export async function GET() {
  try {
    await initializeDatabase()
    
    const { rows } = await sql`
      SELECT id, name, created_at
      FROM players
      ORDER BY name ASC
    `
    
    return NextResponse.json({ players: rows as Player[] })
  } catch (error) {
    console.error('Failed to fetch players:', error)
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase()
    
    const { name } = await request.json()
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 })
    }

    if (name.length > 50) {
      return NextResponse.json({ error: 'Player name too long (max 50 characters)' }, { status: 400 })
    }

    const { rows } = await sql`
      INSERT INTO players (name) 
      VALUES (${name.trim()}) 
      RETURNING id, name, created_at
    `
    
    return NextResponse.json({ player: rows[0] as Player })
  } catch (error: any) {
    console.error('Failed to create player:', error)
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Player name already exists' }, { status: 409 })
    }
    
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 })
  }
}