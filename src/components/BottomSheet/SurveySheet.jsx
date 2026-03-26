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
import posthog from 'posthog-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function SurveySheet({ city, source, variant, lang, pageContent, getCenter, onStartSelect, onMapMoveEnd, onDisableMap, onEnableMap, onClose }) {
  const [step, setStep] = useState('landing')
  const [coords, setCoords] = useState(null)
  const [address, setAddress] = useState('')
  const [sliderValue, setSliderValue] = useState(null)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showNotePrompt, setShowNotePrompt] = useState(false)
  const [notePromptShown, setNotePromptShown] = useState(false)

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

  async function fetchCityName(lat, lng) {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&types=place&limit=1`
      )
      const data = await res.json()
      return data.features?.[0]?.text || null
    } catch {
      return null
    }
  }

  function handleStartSelect() {
    posthog.capture('survey_started', { city, variant, lang })
    onStartSelect()
    setStep(1)
  }

  function handleContinue() {
    posthog.capture('survey_step2', { city, variant, lang })
    const c = getCenter()
    setCoords(c)
    onDisableMap()
    setStep(2)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const cityName = await fetchCityName(coords.lat, coords.lng)

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
          metric_type: variant,
          city_name: cityName,
          lang: lang,
        }),
      })
      if (!res.ok) throw new Error(await res.text())

      // ← событие отправки
      posthog.capture('survey_submitted', {
        city,
        variant,
        lang,
        source,
        place_rate: sliderValue,
        has_note: !!note.trim(),
      })

      setStep('landing')
      setCoords(null)
      setAddress('')
      setSliderValue(null)
      setNote('')
      setNotePromptShown(false)
      onClose()
    } catch (e) {
      setError(pageContent.error)
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDoneClick = () => {
    if (!note.trim() && !notePromptShown) {
      posthog.capture('survey_note_prompt_shown', { city, variant, lang })  // ← новое
      setShowNotePrompt(true)
      setNotePromptShown(true)
      return
    }
    handleSubmit()
  }

  return (
    <>
      <BottomSheet variant={step === 'landing' ? 'landing' : 'default'} hidden={showNotePrompt}>

        {step === 'landing' && (
          <>
            <SheetContent>
              <p className="landing-sheet__text landing-sheet__text--mobile">
                {pageContent.modal_text_mobile}
              </p>
              <p className="landing-sheet__text landing-sheet__text--desktop">
                {pageContent.modal_text_desktop}
              </p>
            </SheetContent>
            <SheetActions>
              <SheetButton onClick={handleStartSelect}>
                {pageContent.button}
              </SheetButton>
            </SheetActions>
          </>
        )}

        {step === 1 && (
          <>
            <SheetHeader
              title={pageContent.step1_title}
              subtitle={pageContent.step1_subtitle}
              onBack={() => { onEnableMap(); onClose(); setStep('landing') }}
              onClose={() => { onEnableMap(); onClose(); setStep('landing') }}
            />
            <SheetContent>
              <SheetAddress value={address} onChange={(e) => setAddress(e.target.value)} />
            </SheetContent>
            <SheetActions>
              <SheetButton onClick={handleContinue}>
                {pageContent.btn_continue}
              </SheetButton>
            </SheetActions>
          </>
        )}

        {step === 2 && (
          <>
            <SheetHeader
              title={pageContent.step2_title}
              onBack={() => { onEnableMap(); setStep(1) }}
              onClose={() => { onEnableMap(); onClose(); setStep('landing') }}
            />
            <SheetContent>
              <SheetSlider
                label={pageContent.question}
                value={sliderValue}
                onChange={setSliderValue}
                labels={pageContent.slider_labels}
              />
              <SheetTextarea
                label={pageContent.note_label}
                placeholder={pageContent.note_placeholder}
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
                {isSubmitting ? pageContent.btn_sharing : pageContent.btn_share}
              </SheetButton>
            </SheetActions>
          </>
        )}

      </BottomSheet>

      {showNotePrompt && (
        <FormAnswerConfirmMSheet
          onClose={() => setShowNotePrompt(false)}
          pageContent={pageContent}
          onSkip={() => {
            posthog.capture('survey_note_skipped', { city, variant, lang })  // ← новое
            setShowNotePrompt(false)
            handleSubmit()
          }}
          onAddNote={() => {
            posthog.capture('survey_note_add_clicked', { city, variant, lang })  // ← новое
            setShowNotePrompt(false)
          }}
        />
      )}
    </>
  )
}

export default SurveySheet