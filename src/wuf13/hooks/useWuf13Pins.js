import { useState, useEffect, useRef, useCallback } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const POLL_INTERVAL = 5000

const RATING_COLORS = {
  1: '#ED4B9E', 2: '#CF60A0', 3: '#BF6AA0', 4: '#AC78A2',
  5: '#9986A3', 6: '#8593A4', 7: '#74A2A6', 8: '#5EAFA7',
  9: '#4EBBA8', 10: '#31D0AA',
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x))
}

// cityFilter: null = all pins (for presentation to management)
//             'wuf13' = only event pins (switch to this during the event)
async function fetchWuf13Pins(cityFilter = null) {
  let url = `${SUPABASE_URL}/rest/v1/feedback_map?select=id,city,city_name,country_name,lat,lng,place_rate,experience,created_at,metric_type&order=created_at.desc&limit=1000`
  if (cityFilter) url += `&city=eq.${encodeURIComponent(cityFilter)}`
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Supabase error ${res.status}`)
  return res.json()
}

export function useWuf13Pins(cityFilter = null) {
  const [pins, setPins] = useState([])
  const [stats, setStats] = useState({ total: 0, countries: 0, cities: 0, todayTotal: 0, todayCountries: 0, todayCities: 0 })
  const [newPin, setNewPin] = useState(null)
  const knownIdsRef = useRef(new Set())
  const isFirstLoadRef = useRef(true)

  const computeStats = useCallback((data) => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayPins = data.filter(p => new Date(p.created_at) >= todayStart)
    return {
      total: data.length,
      countries: new Set(data.map(p => p.country_name).filter(Boolean)).size,
      cities: new Set(data.map(p => p.city_name).filter(Boolean)).size,
      todayTotal: todayPins.length,
      todayCountries: new Set(todayPins.map(p => p.country_name).filter(Boolean)).size,
      todayCities: new Set(todayPins.map(p => p.city_name).filter(Boolean)).size,
    }
  }, [])

  const enrichPin = useCallback((raw) => {
    const rating = raw.place_rate ? clamp(Math.round(raw.place_rate), 1, 10) : null
    return {
      ...raw,
      rating,
      ratingColor: rating ? RATING_COLORS[rating] : '#9ca3af',
      ratingLabel: rating
        ? (rating >= 9 ? 'Feels like mine' : rating >= 5 ? 'Mixed feelings' : 'Not mine')
        : '',
    }
  }, [])

  useEffect(() => {
    let timer = null
    knownIdsRef.current = new Set()
    isFirstLoadRef.current = true

    async function poll() {
      try {
        const data = await fetchWuf13Pins(cityFilter)
        const enriched = data.map(enrichPin)

        if (isFirstLoadRef.current) {
          enriched.forEach(p => knownIdsRef.current.add(p.id))
          isFirstLoadRef.current = false
          setPins(enriched)
          setStats(computeStats(data))
        } else {
          const incoming = enriched.filter(p => !knownIdsRef.current.has(p.id))
          if (incoming.length > 0) {
            incoming.forEach(p => knownIdsRef.current.add(p.id))
            setNewPin(incoming[0])
            setPins(enriched)
            setStats(computeStats(data))
          }
        }
      } catch (e) {
        console.error('[useWuf13Pins] poll error:', e)
      }
      timer = setTimeout(poll, POLL_INTERVAL)
    }

    poll()
    return () => clearTimeout(timer)
  }, [cityFilter, enrichPin, computeStats])

  return { pins, stats, newPin }
}