import { useState } from 'react'
import BottomSheet from './BottomSheet'
import SheetHeader from './SheetHeader'
import SheetContent from './SheetContent'
import SheetActions from './SheetActions'
import SheetButton from './SheetButton'
import SheetText from './SheetText'
import SheetTextarea from './SheetTextarea'
import SheetDropdown from './SheetDropdown'
 
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
 
const RELATION_OPTIONS = [
  { value: 'live_there', label: 'I live there' },
  { value: 'used_to_live', label: 'I used to live there' },
  { value: 'visit_often', label: 'I visit often' },
  { value: 'interested', label: 'Just interested' },
]
 
function SuggestCitySheet({ onClose }) {
  const [step, setStep] = useState(1)
  const [city, setCity] = useState('')
  const [why, setWhy] = useState('')
  const [relation, setRelation] = useState(null)
  const [contact, setContact] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
 
  async function handleSubmit() {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/city_suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          city: city.trim(),
          why: why.trim() || null,
          relation: relation || null,
          contact: contact.trim() || null,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setDone(true)
    } catch (e) {
      setError('Something went wrong. Try again.')
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }
 
  if (done) {
    return (
      <BottomSheet variant="default">
        <SheetHeader
          title="Thank you"
          onClose={onClose}
        />
        <SheetContent>
          <SheetText center>
        Suggestions help shape which cities
         <br />
         appear next on the map
        </SheetText>
        </SheetContent>
        <SheetActions>
          <SheetButton onClick={onClose}>Close</SheetButton>
        </SheetActions>
      </BottomSheet>
    )
  }
 
  return (
    <BottomSheet variant="default">
      {step === 1 && (
        <>
          <SheetHeader
            title="1 / 2  Suggest city"
            onClose={onClose}
          />
          <SheetContent>
            <SheetText>
            Common Ground is an ongoing project exploring how places feel to people. If there’s a city you’d like to see on the map, feel free to suggest it.
            </SheetText>
            <SheetTextarea
              label="Suggest city"
              placeholder="Which city would you like to suggest?"
              value={city}
              onChange={e => setCity(e.target.value)}
              required
            />
            <SheetTextarea
              label="Why this city"
              placeholder="What makes this city interesting?"
              value={why}
              onChange={e => setWhy(e.target.value)}
            />
          </SheetContent>
          <SheetActions>
            <SheetButton
              onClick={() => setStep(2)}
              disabled={!city.trim()}
            >
              Continue
            </SheetButton>
          </SheetActions>
        </>
      )}
 
      {step === 2 && (
        <>
          <SheetHeader
            title="2 / 2  Tell about yourself"
            onBack={() => setStep(1)}
            onClose={onClose}
          />
          <SheetContent>
            <SheetDropdown
              label="Do you live in this city?"
              placeholder="Select option"
              options={RELATION_OPTIONS}
              value={relation}
              onChange={setRelation}
            />
            <SheetTextarea
              label="Your contact"
              placeholder="Leave your comfortable contact and share if you want to be connected when the city launches"
              value={contact}
              onChange={e => setContact(e.target.value)}
            />
            {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
          </SheetContent>
          <SheetActions>
            <SheetButton
              onClick={handleSubmit}
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              Done
            </SheetButton>
          </SheetActions>
        </>
      )}
    </BottomSheet>
  )
}
 
export default SuggestCitySheet
 