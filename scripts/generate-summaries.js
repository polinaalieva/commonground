import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { latLngToCell, cellToLatLng } from 'h3-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

// ── Supabase helpers ──

async function fetchPoints() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/feedback_map?select=lat,lng,place_rate,experience&limit=5000`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  )
  return res.json()
}

async function fetchExistingSummaries() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/hex_summaries?select=cell,count`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  )
  const data = await res.json()
  const map = {}
  data.forEach(r => { map[r.cell] = r.count })
  return map
}

async function upsertSummary(row) {
  await fetch(`${SUPABASE_URL}/rest/v1/hex_summaries`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(row),
  })
}

// ── Reverse geocoding ──

async function getNeighborhood(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'CommonGround/1.0' } }
    )
    const data = await res.json()
    const addr = data.address || {}
    return addr.neighbourhood || addr.suburb || addr.city_district || null
  } catch {
    return null
  }
}

// ── Claude summary ──

async function generateSummary({ comments, avgRating, count }) {
  const commentsText = comments.filter(Boolean).join('\n- ')
  const hasEnough = count >= 5

  const prompt = `You are analyzing neighborhood feedback from residents.

Comments:
- ${commentsText}

Average rating: ${avgRating.toFixed(1)}/10 (${count} responses, scale: 1=doesn't fit me, 10=fits me perfectly)

Return ONLY valid JSON, no markdown, no explanation:
{
  "summary": "2-3 sentences about overall impression based on comments",
  "pros": ${hasEnough ? '["pro 1", "pro 2"]' : 'null'},
  "cons": ${hasEnough ? '["con 1", "con 2"]' : 'null'},
  "vibe": "one short word or phrase capturing the area feel",
  "local_lore": "one sentence about something hyper-local, funny or specific that residents mention — omit this field entirely if nothing notable"
}

${hasEnough ? '' : 'Too few comments for pros/cons — return only summary and vibe (and local_lore if applicable). Set pros and cons to null.'}
Language: match the language of the comments.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  return JSON.parse(text)
}

// ── Group points by hex ──

function groupByHex(points, resolution = 8) {
  const hexMap = {}
  points.forEach(r => {
    if (!r.lat || !r.lng || !r.place_rate) return
    const cell = latLngToCell(r.lat, r.lng, resolution)
    if (!hexMap[cell]) hexMap[cell] = { ratings: [], comments: [] }
    hexMap[cell].ratings.push(r.place_rate)
    if (r.experience) hexMap[cell].comments.push(r.experience)
  })
  return hexMap
}

// ── Main ──

const RESOLUTIONS = [7, 8, 9]

async function main() {
  console.log('Fetching points...')
  const points = await fetchPoints()
  console.log(`${points.length} points loaded`)

  const existing = await fetchExistingSummaries()

  let totalGenerated = 0
  let totalSkipped = 0

  for (const resolution of RESOLUTIONS) {
    console.log(`\n── Resolution ${resolution} ──`)
    const hexMap = groupByHex(points, resolution)
    const cells = Object.keys(hexMap).filter(cell => hexMap[cell].comments.length >= 3)
    console.log(`${cells.length} hex cells with 3+ points`)

  let generated = 0
  let skipped = 0

  for (const cell of cells) {
    const data = hexMap[cell]
    const count = data.ratings.length
    const avgRating = data.ratings.reduce((a, b) => a + b, 0) / count

    // пропускаем если count не изменился
    if (existing[cell] === count) {
      skipped++
      continue
    }

    console.log(`Generating for ${cell} (${count} points)...`)

    try {
      const [lat, lng] = cellToLatLng(cell)
      const neighborhood = await getNeighborhood(lat, lng)
      const result = await generateSummary({
        comments: data.comments,
        avgRating,
        count,
      })

      await upsertSummary({
        cell,
        neighborhood,
        summary: result.summary,
        pros: result.pros,
        cons: result.cons,
        vibe: result.vibe,
        local_lore: result.local_lore || null,
        avg_rating: avgRating,
        count,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      generated++
      // небольшая пауза чтобы не перегружать API
      await new Promise(r => setTimeout(r, 1100))
    } catch (err) {
      console.error(`Error for ${cell}:`, err.message)
    }
  }

    totalGenerated += generated
    totalSkipped += skipped
  }

  console.log(`\nDone. Generated: ${totalGenerated}, skipped: ${totalSkipped}`)
}

main()