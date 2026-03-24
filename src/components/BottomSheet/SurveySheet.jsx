import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import SheetHeader from './SheetHeader'
import SheetContent from './SheetContent'
import SheetActions from './SheetActions'
import SheetButton from './SheetButton'
import SheetAddress from './SheetAddress'
import SheetSlider from './SheetSlider'
import SheetTextarea from './SheetTextarea'
import FormAnswerConfirmMSheet from '../ModalSheet/FormAnswerConfirmMSheet'
import '../ModalSheet/ModalSheet.css'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function SurveySheet({ city, source, getCenter, onStartSelect, onMapMoveEnd, onDisableMap, onEnableMap, onClose }) {
  const [step, setStep] = useState('landing')
  const [coords, setCoords] = useState(null)
  const [address, setAddress] = useState('')
  const [sliderValue, setSliderValue] = useState(null)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // --- для  ---
  const [showNotePrompt, setShowNotePrompt] = useState(false)
  const [notePromptShown, setNotePromptShown] = useState(false)
  // -------------

  useEffect(() => {
    if (step !== 1) return
    const c = getCenter()
    fetchAddress(c.lat, c.lng)

    const unsubscribe = onMapMoveEnd(() => {
      const c = getCenter()
      fetchAddress(c.lat, c.lng)
    })
    return unsubscribe
  }, [step])

  async function fetchAddress(lat, lng) {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&types=address,poi&limit=1`
      )
      const data = await res.json()
      setAddress(data.features?.[0]?.place_name || '')
    } catch {
      setAddress('')
    }
  }

  function handleStartSelect() {
    onStartSelect()
    setStep(1)
  }

  function handleContinue() {
    const c = getCenter()
    setCoords(c)
    onDisableMap()
    setStep(2)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback_map`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal',
          'Content-Profile': 'public',
        },
        body: JSON.stringify({
          city: city || null,
          source: source || null,
          lat: coords.lat,
          lng: coords.lng,
          place_rate: sliderValue,
          experience: note || null,
          metric_type: 'belonging',
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setStep('landing')
      setCoords(null)
      setAddress('')
      setSliderValue(null)
      setNote('')
      setNotePromptShown(false) // сбрасываем флаг для следующей сессии
      onClose()
    } catch (e) {
      setError('Something went wrong. Try again.')
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- новое ---
  const handleDoneClick = () => {
    if (!note.trim() && !notePromptShown) {
      setShowNotePrompt(true)
      setNotePromptShown(true)
      return
    }
    handleSubmit()
  }
  // -------------

  return (
    <>
      <BottomSheet variant={step === 'landing' ? 'landing' : 'default'} hidden={showNotePrompt}>

        {step === 'landing' && (
          <>
            <SheetContent>
              <p className="landing-sheet__text landing-sheet__text--mobile">
                See how people experience places
              </p>
              <p className="landing-sheet__text landing-sheet__text--desktop">
                See how people experience places<br />or share your experience
              </p>
            </SheetContent>
            <SheetActions>
              <SheetButton onClick={handleStartSelect}>
                Share your experience
              </SheetButton>
            </SheetActions>
          </>
        )}

        {step === 1 && (
          <>
            <SheetHeader
              title="1 / 2  Pick a place on the map"
              subtitle="Drag the map to move the pin"
              onBack={() => { onEnableMap(); onClose(); setStep('landing') }}
              onClose={() => { onEnableMap(); onClose(); setStep('landing') }}
            />
            <SheetContent>
              <SheetAddress value={address} onChange={(e) => setAddress(e.target.value)} />
            </SheetContent>
            <SheetActions>
              <SheetButton onClick={handleContinue}>
                Continue
              </SheetButton>
            </SheetActions>
          </>
        )}

        {step === 2 && (
          <>
            <SheetHeader
              title="2 / 2 Share your experience"
              onBack={() => { onEnableMap(); setStep(1) }}
              onClose={() => { onEnableMap(); onClose(); setStep('landing') }}
            />
            <SheetContent>
              <SheetSlider
                label="Does this place feel like yours? *"
                value={sliderValue}
                onChange={setSliderValue}
              />
              <SheetTextarea
                label="Add a note"
                placeholder="What makes it feel this way?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={sliderValue === null}
              />
              {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
            </SheetContent>
            <SheetActions>
              <SheetButton
                onClick={handleDoneClick}
                disabled={sliderValue === null || isSubmitting}
              >
                {isSubmitting ? 'Sharing...' : 'Share'}
              </SheetButton>
            </SheetActions>
          </>
        )}

      </BottomSheet>

      {showNotePrompt && (
        <FormAnswerConfirmMSheet
          onClose={() => setShowNotePrompt(false)}
          onSkip={() => {
            setShowNotePrompt(false)
            handleSubmit()
          }}
          onAddNote={() => {
            setShowNotePrompt(false)
            // человек остаётся на шаге 2, просто закрываем модалку
          }}
        />
      )}
    </>
  )
}

export default SurveySheet