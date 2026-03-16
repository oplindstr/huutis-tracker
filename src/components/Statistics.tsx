'use client'

import { useState, useEffect } from 'react'
import type { PlayerStatistics, Game } from '@/types/database'

export function Statistics() {
  const [statistics, setStatistics] = useState<PlayerStatistics[]>([])
  const [recentGames, setRecentGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'players' | 'games'>('players')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [statsResponse, gamesResponse] = await Promise.all([
        fetch('/api/statistics'),
        fetch('/api/games'),
      ])

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStatistics(statsData.statistics)
      }

      if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json()
        setRecentGames(gamesData.games.filter((game: Game) => game.completed))
      }

      if (!statsResponse.ok || !gamesResponse.ok) {
        setError('Failed to fetch some data')
      }
    } catch (err) {
      setError('Failed to fetch statistics')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getWinRate = (gamesWon: number, gamesPlayed: number) => {
    if (gamesPlayed === 0) return '0%'
    return `${Math.round((gamesWon / gamesPlayed) * 100)}%`
  }

  const totalGamesPlayed = recentGames.length
  const averageGameLength =
    recentGames.length > 0
      ? Math.round(
          recentGames.reduce(
            (sum, game) => sum + (game.duration_minutes || 0),
            0,
          ) / recentGames.length,
        )
      : 0

  if (loading) {
    return (
      <div className='bg-white rounded-xl shadow-lg p-6'>
        <div className='animate-pulse space-y-4'>
          <div className='h-8 bg-gray-200 rounded w-1/3'></div>
          <div className='space-y-3'>
            <div className='h-4 bg-gray-200 rounded w-full'></div>
            <div className='h-4 bg-gray-200 rounded w-3/4'></div>
            <div className='h-4 bg-gray-200 rounded w-1/2'></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='bg-white rounded-xl shadow-lg p-6'>
        <div className='text-center text-red-500'>
          <p>{error}</p>
          <button
            onClick={fetchData}
            className='mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors'
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header with tabs */}
      <div className='bg-white rounded-xl shadow-lg'>
        <div className='flex border-b'>
          <button
            onClick={() => setActiveTab('players')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'players'
                ? 'border-b-2 border-green-500 text-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Player Statistics
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'games'
                ? 'border-b-2 border-green-500 text-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Game History
          </button>
        </div>

        <div className='p-6'>
          {activeTab === 'players' && (
            <div className='space-y-6'>
              {/* Overview Cards */}
              <div className='grid grid-cols-2 gap-4 mb-6'>
                <div className='bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white'>
                  <div className='text-2xl font-bold'>{statistics.length}</div>
                  <div className='text-green-100'>Total Players</div>
                </div>
                <div className='bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white'>
                  <div className='text-2xl font-bold'>{totalGamesPlayed}</div>
                  <div className='text-blue-100'>Games Completed</div>
                </div>
              </div>

              {statistics.length === 0 ? (
                <div className='text-center py-8 text-gray-500'>
                  <div className='text-6xl mb-4'>📊</div>
                  <p>No player statistics yet.</p>
                  <p className='text-sm'>
                    Complete some games to see statistics!
                  </p>
                </div>
              ) : (
                <div className='space-y-4'>
                  <h3 className='text-lg font-semibold text-gray-800'>
                    Player Rankings
                  </h3>
                  <div className='space-y-3'>
                    {statistics.map((stat, index) => (
                      <div
                        key={stat.player_id}
                        className='bg-gray-50 rounded-lg p-4 border'
                      >
                        <div className='flex items-center gap-4'>
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                              index === 0
                                ? 'bg-yellow-500'
                                : index === 1
                                  ? 'bg-gray-400'
                                  : index === 2
                                    ? 'bg-amber-600'
                                    : 'bg-gray-300'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div className='flex-1'>
                            <h4 className='font-semibold text-gray-900'>
                              {stat.name}
                            </h4>
                            <div className='text-sm text-gray-600'>
                              Joined {formatDate(stat.joined_date)}
                            </div>
                          </div>
                          <div className='text-right'>
                            <div className='font-semibold text-gray-900'>
                              {stat.games_won}/{stat.games_played}
                            </div>
                            <div className='text-sm text-gray-600'>
                              {getWinRate(stat.games_won, stat.games_played)}{' '}
                              win rate
                            </div>
                          </div>
                        </div>

                        <div className='mt-3 grid grid-cols-3 gap-4 text-sm'>
                          <div className='text-center'>
                            <div className='font-medium text-gray-900'>
                              {stat.average_score}
                            </div>
                            <div className='text-gray-500'>Avg Score</div>
                          </div>
                          <div className='text-center'>
                            <div className='font-medium text-green-600'>
                              {stat.highest_score}
                            </div>
                            <div className='text-gray-500'>Best</div>
                          </div>
                          <div className='text-center'>
                            <div className='font-medium text-red-500'>
                              {stat.lowest_score}
                            </div>
                            <div className='text-gray-500'>Worst</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'games' && (
            <div className='space-y-6'>
              {/* Game Overview */}
              {totalGamesPlayed > 0 && (
                <div className='bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white mb-6'>
                  <div className='text-xl font-bold mb-2'>Game Statistics</div>
                  <div className='grid grid-cols-2 gap-4 text-sm'>
                    <div>
                      <span className='text-purple-100'>
                        Average game length:
                      </span>
                      <div className='font-medium'>
                        {formatDuration(averageGameLength)}
                      </div>
                    </div>
                    <div>
                      <span className='text-purple-100'>Most recent:</span>
                      <div className='font-medium'>
                        {formatDate(recentGames[0]?.created_at || '')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {recentGames.length === 0 ? (
                <div className='text-center py-8 text-gray-500'>
                  <div className='text-6xl mb-4'>🎮</div>
                  <p>No completed games yet.</p>
                  <p className='text-sm'>
                    Finish some games to see the history!
                  </p>
                </div>
              ) : (
                <div className='space-y-4'>
                  <h3 className='text-lg font-semibold text-gray-800'>
                    Recent Games
                  </h3>
                  <div className='space-y-3'>
                    {recentGames.map((game) => (
                      <div
                        key={game.id}
                        className='bg-gray-50 rounded-lg p-4 border'
                      >
                        <div className='flex items-center justify-between mb-3'>
                          <div className='font-medium text-gray-900'>
                            Game #{game.id}
                          </div>
                          <div className='text-sm text-gray-500'>
                            {formatDate(game.created_at)}
                          </div>
                        </div>

                        <div className='flex items-center justify-between mb-2'>
                          <div className='text-sm text-gray-600'>
                            🏆 Winner:{' '}
                            <span className='font-medium'>
                              {game.winner || 'Unknown'}
                            </span>
                          </div>
                          <div className='text-sm text-gray-600'>
                            ⏱️ {formatDuration(game.duration_minutes)}
                          </div>
                        </div>

                        <div className='flex flex-wrap gap-2'>
                          {game.players.map((player, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 rounded text-xs ${
                                player === game.winner
                                  ? 'bg-yellow-100 text-yellow-800 font-medium'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {player}: {game.final_scores[index]}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
