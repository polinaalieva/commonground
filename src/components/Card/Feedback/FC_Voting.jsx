import { useEffect, useState } from 'react'
import './FC_Voting.css'

import { supabaseFetch } from '../../../config/supabase'

// Плюс/минус как в Figma: 10px, линия 2px, скруглённые концы
function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function getSessionId() {
  let id = localStorage.getItem('cg_session_id')
  if (!id) {
    id = typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('cg_session_id', id)
  }
  return id
}

export function FC_Voting({ feedbackId, onVoted }) {
  const [votesUp, setVotesUp] = useState(0)
  const [votesDown, setVotesDown] = useState(0)
  const [myVote, setMyVote] = useState(null)
  const [loading, setLoading] = useState(true)

  const sessionId = getSessionId()

  useEffect(() => {
    if (!feedbackId) return
    setVotesUp(0)
    setVotesDown(0)
    setMyVote(null)
    fetchVotes()
  }, [feedbackId])

  async function fetchVotes() {
    setLoading(true)
    try {
      const data = await supabaseFetch(
        `feedback_votes?feedback_id=eq.${feedbackId}&select=direction,session_id`
      )
      const up = data.filter(v => v.direction === 'up').length
      const down = data.filter(v => v.direction === 'down').length
      const mine = data.find(v => v.session_id === sessionId)
      setVotesUp(up)
      setVotesDown(down)
      if (mine) {
        setMyVote(mine.direction)
        onVoted?.(mine.direction)
      }
    } finally {
      setLoading(false)
    }
  }

  async function vote(direction) {
    if (loading) return

    const isToggle = myVote === direction

    if (isToggle) {
      setVotesUp(v => direction === 'up' ? v - 1 : v)
      setVotesDown(v => direction === 'down' ? v - 1 : v)
      setMyVote(null)

      await supabaseFetch(
        `feedback_votes?feedback_id=eq.${feedbackId}&session_id=eq.${sessionId}`,
        { method: 'DELETE' }
      )
    } else {
      const prev = myVote
      setVotesUp(v => {
        if (direction === 'up') return v + 1
        if (prev === 'up') return v - 1
        return v
      })
      setVotesDown(v => {
        if (direction === 'down') return v + 1
        if (prev === 'down') return v - 1
        return v
      })
      setMyVote(direction)
      onVoted?.(direction)

      await supabaseFetch('feedback_votes', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ feedback_id: feedbackId, session_id: sessionId, direction }),
      })
    }
  }

  const net = votesUp - votesDown
  const total = votesUp + votesDown

  return (
    <div className="fcv-wrap">
      <div className="fcv-buttons">
        <button
          className={`fcv-btn fcv-btn--up ${myVote === 'up' ? 'fcv-btn--active' : ''}`}
          onClick={() => vote('up')}
          aria-label="Vote up"
          disabled={loading}
        >
          <PlusIcon />
        </button>
        <button
          className={`fcv-btn fcv-btn--down ${myVote === 'down' ? 'fcv-btn--active' : ''}`}
          onClick={() => vote('down')}
          aria-label="Vote down"
          disabled={loading}
        >
          <MinusIcon />
        </button>
      </div>
      {!loading && myVote !== null && (
        <div className="fcv-stats">
          <span className="fcv-net">{net > 0 ? `+${net}` : net}</span>
          <span className="fcv-total">{total} votes</span>
        </div>
      )}
    </div>
  )
}
