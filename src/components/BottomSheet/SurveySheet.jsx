import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
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

const SurveySheet = forwardRef(function SurveySheet(
  { city, source, variant, lang, pageContent, getCenter, onStartSelect, onMapMoveEnd, onDisableMap, onEnableMap, onClose, onFlyTo, pinSelected, bottomSheetRef },
  ref
) {
  const [step, setStep] = useState('landing')
  const [coords, setCoords] = useState(null)
  const [address, setAddress] = useState('')
  const [sliderValue, setSliderValue] = useState(null)
  const [note, setNote] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [addressNotFound, setAddressNotFound] = useState(false)
  const suggestTimerRef = useRef(null)
  const errorTimerRef = useRef(null)
  const onMoveEndRef = useRef(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showNotePrompt, setShowNotePrompt] = useState(false)
  const [notePromptShown, setNotePromptShown] = useState(false)

  // ref пробрасывает только startSelect — DOM идёт через bottomSheetRef
  useImperativeHandle(ref, () => ({
    startSelect() {
      handleStartSelect()
    }
  }))

  // Keep ref current so the moveend listener always calls the latest fetchAddress/getCenter
  onMoveEndRef.current = () => {
    const c = getCenter()
    fetchAddress(c.lat, c.lng)
  }

  useEffect(() => {
    if (step !== 1) return
    onMoveEndRef.current?.()

    const stableCallback = () => onMoveEndRef.current?.()
    const unsubscribe = onMapMoveEnd(stableCallback)
    return unsubscribe
  }, [step])

  function handleAddressChange(e) {
    const val = e.target.value
    setAddress(val)
    setAddressNotFound(false)
    clearTimeout(suggestTimerRef.current)
    if (val.trim().length < 2) { setSuggestions([]); return }
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(val)}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&limit=3`
        )
        const data = await res.json()
        const features = data.features || []
        setSuggestions(features)
        if (features.length === 0 && val.trim().length >= 2) {
          clearTimeout(errorTimerRef.current)
          setAddressNotFound(true)
          errorTimerRef.current = setTimeout(() => setAddressNotFound(false), 2000)
        }
      } catch {
        setSuggestions([])
      }
    }, 300)
  }

  function handleAddressKeyDown(e) {
    if (e.key === 'Escape') {
      setSuggestions([])
    } else if (e.key === 'Enter') {
      if (suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0])
      } else {
        setSuggestions([])
      }
    }
  }

  function handleClearAddress() {
    setAddress('')
    setSuggestions([])
    setAddressNotFound(false)
  }

  function handleSelectSuggestion(feature) {
    const [lng, lat] = feature.center
    setAddress(feature.place_name)
    setSuggestions([])
    onFlyTo?.(lng, lat)
  }

  async function fetchAddress(lat, lng) {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&types=address,poi&limit=1`
      )
      const data = await res.json()
      setAddress(data.features?.[0]?.place_name || '')
      clearTimeout(errorTimerRef.current)
      setAddressNotFound(false)
    } catch {
      setAddress('')
    }
  }

  async function fetchCityName(lat, lng) {
    // Try progressively broader types — many regions lack 'place' but have district/locality/region
    const typeSets = ['place', 'district,locality', 'region']
    for (const types of typeSets) {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&types=${types}&limit=1`
        )
        const data = await res.json()
        const name = data.features?.[0]?.text
        if (name) return name
      } catch {
        // continue to next fallback
      }
    }
    return null
  }

  async function fetchCountryName(lat, lng) {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&types=country&limit=1`
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
      const [cityName, countryName] = await Promise.all([
        fetchCityName(coords.lat, coords.lng),
        fetchCountryName(coords.lat, coords.lng),
      ])

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
          country_name: countryName,
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
      posthog.capture('survey_note_prompt_shown', { city, variant, lang })
      setShowNotePrompt(true)
      setNotePromptShown(true)
      return
    }
    handleSubmit()
  }

  return (
    <>
      <BottomSheet ref={bottomSheetRef} variant={step === 'landing' ? 'landing' : 'default'} hidden={showNotePrompt} pinHidden={pinSelected && step === 'landing'}>

        {step === 'landing' && (
          <>
            <SheetContent>
              {!pinSelected && (
                <p className="landing-sheet__text landing-sheet__text--mobile">
                  {pageContent.modal_text_mobile}
                </p>
              )}
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
              <SheetAddress
                value={address}
                onChange={handleAddressChange}
                onKeyDown={handleAddressKeyDown}
                onClear={handleClearAddress}
                suggestions={suggestions}
                onSelectSuggestion={handleSelectSuggestion}
                error={addressNotFound}
              />
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
            posthog.capture('survey_note_skipped', { city, variant, lang })
            setShowNotePrompt(false)
            handleSubmit()
          }}
          onAddNote={() => {
            posthog.capture('survey_note_add_clicked', { city, variant, lang })
            setShowNotePrompt(false)
          }}
        />
      )}
    </>
  )
})

export default SurveySheet