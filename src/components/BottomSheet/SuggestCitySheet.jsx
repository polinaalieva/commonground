import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import BottomSheet from './BottomSheet'
import SheetHeader from './SheetHeader'
import SheetContent from './SheetContent'
import SheetActions from './SheetActions'
import SheetButton from './SheetButton'
import SheetText from './SheetText'
import SheetTextarea from './SheetTextarea'
import SheetDropdown from './SheetDropdown'
import { CONTENT } from '../../config/content'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function SuggestCitySheet({ onClose }) {
  const { pathname } = useLocation()
  const lang = pathname.startsWith('/ru') ? 'ru' : 'en'
  const c = CONTENT.suggest_city[lang]

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
      setError(c.error)
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (done) {
    return (
      <BottomSheet variant="default">
        <SheetHeader
          title={c.thanks_title}
          onClose={onClose}
        />
        <SheetContent>
          <SheetText center>
            {c.thanks_text.split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </SheetText>
        </SheetContent>
        <SheetActions>
          <SheetButton onClick={onClose}>{c.btn_close}</SheetButton>
        </SheetActions>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet variant="default">
      {step === 1 && (
        <>
          <SheetHeader
            title={c.step1_title}
            onClose={onClose}
          />
          <SheetContent>
            <SheetText>{c.description}</SheetText>
            <SheetTextarea
              label={c.label_city}
              placeholder={c.placeholder_city}
              value={city}
              onChange={e => setCity(e.target.value)}
              required
            />
            <SheetTextarea
              label={c.label_why}
              placeholder={c.placeholder_why}
              value={why}
              onChange={e => setWhy(e.target.value)}
            />
          </SheetContent>
          <SheetActions>
            <SheetButton
              onClick={() => setStep(2)}
              disabled={!city.trim()}
            >
              {c.btn_continue}
            </SheetButton>
          </SheetActions>
        </>
      )}

      {step === 2 && (
        <>
          <SheetHeader
            title={c.step2_title}
            onBack={() => setStep(1)}
            onClose={onClose}
          />
          <SheetContent>
            <SheetDropdown
              label={c.label_relation}
              placeholder={c.placeholder_relation}
              options={c.relation_options}
              value={relation}
              onChange={setRelation}
            />
            <SheetTextarea
              label={c.label_contact}
              placeholder={c.placeholder_contact}
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
              {c.btn_submit}
            </SheetButton>
          </SheetActions>
        </>
      )}
    </BottomSheet>
  )
}

export default SuggestCitySheet