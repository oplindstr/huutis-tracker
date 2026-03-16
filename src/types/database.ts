export interface Player {
  id: number
  name: string
  created_at: string
}

export interface GameRound {
  id?: number
  game_id: number
  round_number: number
  scores: number[]
  auction_winner?: string
  initial_bid?: number
  promise_increased?: boolean
  final_promise?: number
  created_at?: string
}

export interface Game {
  id: number
  players: string[]
  winner?: string
  final_scores: number[]
  rounds_played: number
  duration_minutes?: number
  completed: boolean
  created_at: string
  rounds?: GameRound[]
}

export interface PlayerStatistics {
  name: string
  player_id: number
  games_played: number
  games_won: number
  average_score: number
  highest_score: number
  lowest_score: number
  joined_date: string
}

export interface CreateGameRequest {
  players: string[]
}

export interface UpdateGameRequest {
  winner?: string
  final_scores?: number[]
  rounds_played?: number
  duration_minutes?: number
  completed?: boolean
}

export interface AddRoundRequest {
  scores: number[]
  auction_winner?: string
  initial_bid?: number
  promise_increased?: boolean
  final_promise?: number
}