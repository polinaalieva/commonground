import { useEffect, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import './FC_Voting.css'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

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
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/feedback_votes?feedback_id=eq.${feedbackId}&select=direction,session_id`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      )
      const data = await res.json()
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

      await fetch(
        `${SUPABASE_URL}/rest/v1/feedback_votes?feedback_id=eq.${feedbackId}&session_id=eq.${sessionId}`,
        {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
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

      await fetch(`${SUPABASE_URL}/rest/v1/feedback_votes`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ feedback_id: feedbackId, session_id: sessionId, direction }),
      })
    }
  }

  const net = votesUp - votesDown
  const total = votesUp + votesDown

  return (
    <div className="fcv-wrap">
      <div className="fcv-stats">
        <span className="fcv-net">{net > 0 ? `+${net}` : net}</span>
        <span className="fcv-total">{total} votes</span>
      </div>
      <div className="fcv-buttons">
        <button
          className={`fcv-btn fcv-btn--up ${myVote === 'up' ? 'fcv-btn--active' : ''}`}
          onClick={() => vote('up')}
          aria-label="Vote up"
          disabled={loading}
        >
          <ChevronUp size={18} />
        </button>
        <button
          className={`fcv-btn fcv-btn--down ${myVote === 'down' ? 'fcv-btn--active' : ''}`}
          onClick={() => vote('down')}
          aria-label="Vote down"
          disabled={loading}
        >
          <ChevronDown size={18} />
        </button>
      </div>
    </div>
  )
}
