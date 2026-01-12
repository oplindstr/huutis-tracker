'use client'

import { useState, useEffect } from 'react'

interface Score {
  round: number
  scores: number[]
  auctionWinner?: number // player index
  initialBid?: number
  promiseIncreased?: boolean
  finalPromise?: number
}

interface ScoreTrackerProps {
  players: string[]
  onResetGame: () => void
}

export function ScoreTracker({ players, onResetGame }: ScoreTrackerProps) {
  const [scores, setScores] = useState<Score[]>([])
  const [currentRound, setCurrentRound] = useState<number[]>(
    new Array(players.length).fill(0)
  )
  const [gameEnded, setGameEnded] = useState(false)

  // Auction tracking for current round
  const [auctionWinner, setAuctionWinner] = useState<number>(-1)
  const [initialBid, setInitialBid] = useState<number>(0)
  const [promiseIncreased, setPromiseIncreased] = useState<boolean>(false)
  const [finalPromise, setFinalPromise] = useState<number>(0)

  // Load saved scores and auction data from localStorage
  useEffect(() => {
    const savedScores = localStorage.getItem('huutopussi-scores')
    const savedRounds = localStorage.getItem('huutopussi-rounds')
    const savedAuction = localStorage.getItem('huutopussi-auction')

    if (savedScores) {
      setScores(JSON.parse(savedScores))
    }
    if (savedRounds) {
      setCurrentRound(JSON.parse(savedRounds))
    }
    if (savedAuction) {
      const auctionData = JSON.parse(savedAuction)
      setAuctionWinner(auctionData.auctionWinner || -1)
      setInitialBid(auctionData.initialBid || 0)
      setPromiseIncreased(auctionData.promiseIncreased || false)
      setFinalPromise(auctionData.finalPromise || 0)
    }
  }, [])

  // Save scores and auction data to localStorage
  useEffect(() => {
    localStorage.setItem('huutopussi-scores', JSON.stringify(scores))
    localStorage.setItem('huutopussi-rounds', JSON.stringify(currentRound))
    localStorage.setItem(
      'huutopussi-auction',
      JSON.stringify({
        auctionWinner,
        initialBid,
        promiseIncreased,
        finalPromise,
      })
    )
  }, [
    scores,
    currentRound,
    auctionWinner,
    initialBid,
    promiseIncreased,
    finalPromise,
  ])

  const getTotalScores = () => {
    const totals = new Array(players.length).fill(0)
    scores.forEach((score) => {
      score.scores.forEach((s, index) => {
        totals[index] += s
      })
    })
    return totals
  }

  const addRound = () => {
    if (currentRound.some((score) => isNaN(score))) {
      alert('Please enter valid scores for all players')
      return
    }

    if (auctionWinner === -1) {
      alert('Please select the auction winner')
      return
    }

    const newScore: Score = {
      round: scores.length + 1,
      scores: [...currentRound],
      auctionWinner,
      initialBid,
      promiseIncreased,
      finalPromise: promiseIncreased ? finalPromise : initialBid,
    }

    setScores([...scores, newScore])
    setCurrentRound(new Array(players.length).fill(0))

    // Reset auction state for next round
    setAuctionWinner(-1)
    setInitialBid(0)
    setPromiseIncreased(false)
    setFinalPromise(0)

    // Check if game should end (someone reached 500 points)
    const newTotals = getTotalScores()
    newScore.scores.forEach((s, index) => {
      newTotals[index] += s
    })

    if (newTotals.some((total) => total >= 500)) {
      setGameEnded(true)
    }
  }

  const updateScore = (playerIndex: number, score: string) => {
    const newRound = [...currentRound]
    newRound[playerIndex] = parseInt(score) || 0
    setCurrentRound(newRound)
  }

  const applyNegativePromise = () => {
    if (auctionWinner === -1) {
      alert('Please select the auction winner first')
      return
    }

    const promisedPoints = promiseIncreased ? finalPromise : initialBid
    if (promisedPoints <= 0) {
      alert('Please enter the promised score first')
      return
    }

    const newRound = [...currentRound]
    newRound[auctionWinner] = -promisedPoints
    setCurrentRound(newRound)
  }

  const applyNegativeInitialBid = () => {
    if (initialBid <= 0) {
      alert('Please enter the initial bid first')
      return
    }

    const newRound = [...currentRound]
    // Apply negative initial bid to players with 0 tricks (excluding auction winner)
    newRound.forEach((score, index) => {
      if (score === 0 && index !== auctionWinner) {
        newRound[index] = -initialBid
      }
    })
    setCurrentRound(newRound)
  }

  const applyPromisedScore = () => {
    if (auctionWinner === -1) {
      alert('Please select the auction winner first')
      return
    }

    const promisedPoints = promiseIncreased ? finalPromise : initialBid
    if (promisedPoints <= 0) {
      alert('Please enter the promised score first')
      return
    }

    const newRound = [...currentRound]
    newRound[auctionWinner] = promisedPoints
    setCurrentRound(newRound)
  }

  const deleteLastRound = () => {
    if (scores.length > 0) {
      setScores(scores.slice(0, -1))
      setGameEnded(false)
      // Reset auction state when deleting rounds
      setAuctionWinner(-1)
      setInitialBid(0)
      setPromiseIncreased(false)
      setFinalPromise(0)
    }
  }

  const totalScores = getTotalScores()
  const winner = gameEnded
    ? players[totalScores.indexOf(Math.max(...totalScores))]
    : null

  return (
    <div className='bg-white rounded-xl shadow-lg overflow-hidden'>
      {/* Header */}
      <div className='bg-green-600 text-white p-4'>
        <div className='flex justify-between items-center'>
          <h1 className='text-xl font-bold'>🃏 Huutopussi</h1>
          <button
            onClick={onResetGame}
            className='text-sm bg-green-700 px-3 py-1 rounded hover:bg-green-800 transition-colors'
          >
            New Game
          </button>
        </div>
        <p className='text-green-100 text-sm'>Round {scores.length + 1}</p>
      </div>

      {/* Winner Banner */}
      {gameEnded && (
        <div className='bg-yellow-400 text-yellow-900 p-4 text-center font-bold'>
          🎉 Game Over! Winner: {winner} 🎉
        </div>
      )}

      {/* Current Round Input */}
      {!gameEnded && (
        <div className='p-4 bg-gray-50 space-y-4'>
          {/* Auction Section */}
          <div>
            <h3 className='font-semibold mb-3 text-gray-800'>Auction:</h3>
            <div className='grid grid-cols-1 gap-3 mb-3'>
              <div>
                <label className='text-sm font-medium text-gray-700 block mb-1'>
                  Auction Winner:
                </label>
                <select
                  value={auctionWinner}
                  onChange={(e) => setAuctionWinner(parseInt(e.target.value))}
                  className='w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900'
                >
                  <option value={-1}>Select winner...</option>
                  {players.map((player, index) => (
                    <option key={index} value={index}>
                      {player}
                    </option>
                  ))}
                </select>
              </div>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <label className='text-sm font-medium text-gray-800 block mb-1'>
                    Initial Bid:
                  </label>
                  <input
                    type='number'
                    value={initialBid || ''}
                    onChange={(e) =>
                      setInitialBid(parseInt(e.target.value) || 0)
                    }
                    className='w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center text-gray-900'
                    placeholder='0'
                    min='0'
                    max='500'
                  />
                </div>
                <div className='flex items-center'>
                  <label className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      checked={promiseIncreased}
                      onChange={(e) => setPromiseIncreased(e.target.checked)}
                      className='rounded'
                    />
                    <span className='text-sm text-gray-800'>
                      Promise increased?
                    </span>
                  </label>
                </div>
              </div>
              {promiseIncreased && (
                <div>
                  <label className='text-sm font-medium text-gray-800 block mb-1'>
                    Final Promise:
                  </label>
                  <input
                    type='number'
                    value={finalPromise || ''}
                    onChange={(e) =>
                      setFinalPromise(parseInt(e.target.value) || 0)
                    }
                    className='w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center text-gray-900'
                    placeholder='0'
                    min={initialBid}
                    max='500'
                  />
                </div>
              )}
            </div>
          </div>

          {/* Scores Section */}
          <div>
            <h3 className='font-semibold mb-3 text-gray-800'>Round Scores:</h3>
            <div className='grid grid-cols-2 gap-2 mb-4'>
              {players.map((player, index) => (
                <div key={index} className='space-y-1'>
                  <label className='text-sm font-medium text-gray-800 block truncate'>
                    {player}
                  </label>
                  <input
                    type='number'
                    value={currentRound[index] || ''}
                    onChange={(e) => updateScore(index, e.target.value)}
                    className='w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center text-gray-900'
                    placeholder='0'
                    min='0'
                    max='999'
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className='space-y-2'>
            {auctionWinner !== -1 &&
              (initialBid > 0 || (promiseIncreased && finalPromise > 0)) && (
                <div className='grid grid-cols-2 gap-2'>
                  <button
                    onClick={applyPromisedScore}
                    className='py-2 bg-green-500 text-white font-semibold rounded hover:bg-green-600 transition-colors text-sm'
                  >
                    Set Promise (
                    {auctionWinner !== -1 ? players[auctionWinner] : ''}: +
                    {promiseIncreased ? finalPromise : initialBid})
                  </button>
                  <button
                    onClick={applyNegativePromise}
                    className='py-2 bg-red-500 text-white font-semibold rounded hover:bg-red-600 transition-colors text-sm'
                  >
                    Fail Promise (
                    {auctionWinner !== -1 ? players[auctionWinner] : ''}: -
                    {promiseIncreased ? finalPromise : initialBid})
                  </button>
                </div>
              )}

            {initialBid > 0 &&
              currentRound.some(
                (score, index) => score === 0 && index !== auctionWinner
              ) && (
                <button
                  onClick={applyNegativeInitialBid}
                  className='w-full py-2 bg-orange-500 text-white font-semibold rounded hover:bg-orange-600 transition-colors text-sm'
                >
                  Apply Negative Initial Bid to Players with No Tricks (-
                  {initialBid})
                </button>
              )}
          </div>

          <button
            onClick={addRound}
            className='w-full py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition-colors'
          >
            Add Round
          </button>
        </div>
      )}

      {/* Score Table */}
      <div className='p-4'>
        <div className='flex justify-between items-center mb-3'>
          <h3 className='font-semibold text-gray-800'>Score History:</h3>
          {scores.length > 0 && (
            <button
              onClick={deleteLastRound}
              className='text-sm text-red-600 hover:text-red-800'
            >
              Delete Last
            </button>
          )}
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b'>
                <th className='text-left py-2 font-medium text-gray-800'>
                  Round
                </th>
                <th className='text-left py-2 font-medium text-gray-800 min-w-20'>
                  Auction
                </th>
                {players.map((player, index) => (
                  <th
                    key={index}
                    className='text-center py-2 px-1 font-medium text-gray-800 truncate max-w-16'
                  >
                    {player}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => (
                <tr key={score.round} className='border-b'>
                  <td className='py-2 font-medium text-gray-900'>
                    {score.round}
                  </td>
                  <td className='py-2 px-1 text-xs'>
                    {score.auctionWinner !== undefined &&
                    score.auctionWinner !== -1 ? (
                      <div className='space-y-1'>
                        <div className='font-medium text-blue-600'>
                          {players[score.auctionWinner]}
                        </div>
                        <div className='text-gray-700'>
                          {score.initialBid}
                          {score.promiseIncreased &&
                            score.finalPromise &&
                            score.initialBid &&
                            score.finalPromise > score.initialBid && (
                              <span className='text-orange-600'>
                                {' '}
                                → {score.finalPromise}
                              </span>
                            )}
                        </div>
                      </div>
                    ) : (
                      <span className='text-gray-500'>-</span>
                    )}
                  </td>
                  {score.scores.map((s, index) => (
                    <td
                      key={index}
                      className='text-center py-2 px-1 text-gray-900'
                    >
                      {s}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Totals Row */}
              <tr className='border-t-2 font-bold bg-gray-50'>
                <td className='py-2 text-gray-900'>Total</td>
                <td className='py-2'></td>
                {totalScores.map((total, index) => (
                  <td
                    key={index}
                    className={`text-center py-2 px-1 ${
                      total >= 500
                        ? 'text-green-600 font-bold'
                        : total >= 400
                        ? 'text-orange-600'
                        : 'text-gray-900'
                    }`}
                  >
                    {total}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {scores.length === 0 && (
          <div className='text-center text-gray-700 py-8'>
            No rounds played yet. Add scores above to start tracking!
          </div>
        )}
      </div>

      {/* Rules */}
      <div className='p-4 bg-gray-50 border-t text-xs text-gray-700'>
        <p>
          <strong>Goal:</strong> Be the first to reach 500 points. Highest score
          wins!
        </p>
      </div>
    </div>
  )
}
