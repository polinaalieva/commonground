import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import BottomSheet from '../BottomSheet'
import BSheet_header from '../ui/BSheet_header'
import BSheet_content from '../ui/BSheet_content'
import BSheet_actions from '../ui/BSheet_actions'
import BSheet_button from '../ui/BSheet_button'
import BSheet_address from '../ui/BSheet_address'
import BSheet_slider from '../ui/BSheet_slider'
import BSheet_textarea from '../ui/BSheet_textarea'
import FormAnswerConfirmMSheet from '../../ModalSheet/FormAnswerConfirmMSheet'
import '../../ModalSheet/ModalSheet.css'
import posthog from 'posthog-js'
import { supabaseFetch } from '../../../config/supabase'

const Survey_BSheet = forwardRef(function Survey_BSheet(
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
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=3&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data = await res.json()
        const features = (data || []).map(item => ({
          place_name: item.display_name,
          center: [parseFloat(item.lon), parseFloat(item.lat)],
        }))
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
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      setAddress(data.display_name || '')
      clearTimeout(errorTimerRef.current)
      setAddressNotFound(false)
    } catch {
      setAddress('')
    }
  }

  async function fetchGeoNames(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      const addr = data.address || {}
      return {
        cityName: addr.city || addr.town || addr.village || addr.county || addr.state || null,
        countryName: addr.country || null,
      }
    } catch {
      return { cityName: null, countryName: null }
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
      const { cityName, countryName } = await fetchGeoNames(coords.lat, coords.lng)

      await supabaseFetch('feedback_map', {
        method: 'POST',
        headers: { Prefer: 'return=minimal', 'Content-Profile': 'public' },
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
            <BSheet_content>
              {!pinSelected && (
                <p className="landing-sheet__text landing-sheet__text--mobile">
                  {pageContent.modal_text_mobile}
                </p>
              )}
              <p className="landing-sheet__text landing-sheet__text--desktop">
                {pageContent.modal_text_desktop}
              </p>
            </BSheet_content>
            <BSheet_actions>
              <BSheet_button onClick={handleStartSelect}>
                {pageContent.button}
              </BSheet_button>
            </BSheet_actions>
          </>
        )}

        {step === 1 && (
          <>
            <BSheet_header
              title={pageContent.step1_title}
              subtitle={pageContent.step1_subtitle}
              onBack={() => { onEnableMap(); onClose(); setStep('landing') }}
              onClose={() => { onEnableMap(); onClose(); setStep('landing') }}
            />
            <BSheet_content>
              <BSheet_address
                value={address}
                onChange={handleAddressChange}
                onKeyDown={handleAddressKeyDown}
                onClear={handleClearAddress}
                suggestions={suggestions}
                onSelectSuggestion={handleSelectSuggestion}
                error={addressNotFound}
              />
            </BSheet_content>
            <BSheet_actions>
              <BSheet_button onClick={handleContinue}>
                {pageContent.btn_continue}
              </BSheet_button>
            </BSheet_actions>
          </>
        )}

        {step === 2 && (
          <>
            <BSheet_header
              title={pageContent.step2_title}
              onBack={() => { onEnableMap(); setStep(1) }}
              onClose={() => { onEnableMap(); onClose(); setStep('landing') }}
            />
            <BSheet_content>
              <BSheet_slider
                label={pageContent.question}
                value={sliderValue}
                onChange={setSliderValue}
                labels={pageContent.slider_labels}
              />
              <BSheet_textarea
                label={pageContent.note_label}
                placeholder={pageContent.note_placeholder}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={sliderValue === null}
              />
              {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
            </BSheet_content>
            <BSheet_actions>
              <BSheet_button
                onClick={handleDoneClick}
                disabled={sliderValue === null || isSubmitting}
              >
                {isSubmitting ? pageContent.btn_sharing : pageContent.btn_share}
              </BSheet_button>
            </BSheet_actions>
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

export default Survey_BSheet