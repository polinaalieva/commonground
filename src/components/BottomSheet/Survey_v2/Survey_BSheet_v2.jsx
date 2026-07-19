import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import BottomSheet from '../BottomSheet'
import BSheet_header from '../ui/BSheet_header'
import BSheet_gap from '../ui/BSheet_gap'
import BSheet_button from '../ui/BSheet_button'
import BSheet_textarea from '../ui/BSheet_textarea'
import BSheet_sliderbig from '../ui/BSheet_sliderbig'
import BSheet_legaltext from '../ui/BSheet_legaltext'
import FormAnswerConfirm_MSheet from '../../ModalSheet/FormAnswerConfirm/FormAnswerConfirm_MSheet'
import '../../ModalSheet/ModalSheet.css'
import './Survey_BSheet_v2.css'
import posthog from 'posthog-js'
import { supabaseFetch } from '../../../config/supabase'

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY
const geocodeUrl = (lat, lng) =>
  `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_KEY}`

const formatCoords = (lat, lng) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`

// короткое имя места: улица+дом → улица → poi → район
function shortPlaceName(features = []) {
  const byType = (t) => features.find(f => f.place_type?.includes(t))
  const addr = byType('address')
  if (addr) return addr.address ? `${addr.text} ${addr.address}` : addr.text
  const street = byType('street')
  if (street) return street.text
  const poi = byType('poi')
  if (poi) return poi.text
  const area = byType('neighbourhood') || byType('locality') || byType('place')
  if (area) return area.text
  return features[0]?.text || null
}

// город и страна из features + context
function cityCountry(features = []) {
  const all = [...features, ...features.flatMap(f => f.context || [])]
  const find = (prefix) => all.find(x => String(x.id || '').startsWith(prefix))
  return {
    cityName: find('place')?.text ?? find('municipality')?.text ?? null,
    countryName: find('country')?.text ?? null,
  }
}

const Survey_BSheet_v2 = forwardRef(function Survey_BSheet_v2(
  { city, source, variant, lang, pageContent, getCenter, onStartSelect, onMapMoveEnd, onEnableMap, onClose, pinSelected, bottomSheetRef },
  ref
) {
  const [open, setOpen] = useState(false)
  const [placeName, setPlaceName] = useState('')
  const [sliderValue, setSliderValue] = useState(null)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showNotePrompt, setShowNotePrompt] = useState(false)
  const [notePromptShown, setNotePromptShown] = useState(false)

  const abortRef = useRef(null)
  const debounceRef = useRef(null)
  const onMoveEndRef = useRef(null)

  useImperativeHandle(ref, () => ({
    startSelect() {
      posthog.capture('survey_started', { city, variant, lang })
      onStartSelect()
      setOpen(true)
    },
  }))

  async function fetchPlaceName(lat, lng) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await fetch(geocodeUrl(lat, lng), { signal: controller.signal })
      if (!res.ok) {
        console.warn('[geocode] HTTP', res.status)
        setPlaceName(formatCoords(lat, lng))
        return
      }
      const data = await res.json()
      console.log('[geocode] features', data.features) // убрать после проверки
      setPlaceName(shortPlaceName(data.features) || formatCoords(lat, lng))
    } catch (e) {
      if (e.name === 'AbortError') return
      console.warn('[geocode] failed', e)
      setPlaceName(formatCoords(lat, lng))
    }
  }

  onMoveEndRef.current = () => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const c = getCenter()
      fetchPlaceName(c.lat, c.lng)
    }, 400)
  }

  useEffect(() => {
    if (!open) return
    onMoveEndRef.current?.()
    const stableCallback = () => onMoveEndRef.current?.()
    const unsubscribe = onMapMoveEnd(stableCallback)
    return () => {
      unsubscribe?.()
      clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [open])

  function resetAndClose() {
    setOpen(false)
    setPlaceName('')
    setSliderValue(null)
    setNote('')
    setNotePromptShown(false)
    setError(null)
    onEnableMap?.()
    onClose()
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const c = getCenter()
      const res = await fetch(geocodeUrl(c.lat, c.lng))
      const { cityName, countryName } = cityCountry((await res.json()).features)

      await supabaseFetch('feedback_map', {
        method: 'POST',
        headers: { Prefer: 'return=minimal', 'Content-Profile': 'public' },
        body: JSON.stringify({
          country_name: countryName,
          city: city || null,
          source: source || null,
          lat: c.lat,
          lng: c.lng,
          place_rate: sliderValue,
          experience: note || null,
          metric_type: variant,
          city_name: cityName,
          lang: lang,
        }),
      })

      posthog.capture('survey_submitted', {
        city, variant, lang, source,
        place_rate: sliderValue,
        has_note: !!note.trim(),
      })

      resetAndClose()
    } catch (e) {
      setError(pageContent?.error ?? 'Something went wrong')
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveClick = () => {
    if (!note.trim() && !notePromptShown) {
      posthog.capture('survey_note_prompt_shown', { city, variant, lang })
      setShowNotePrompt(true)
      setNotePromptShown(true)
      return
    }
    handleSubmit()
  }

  if (!open) return null

  return (
    <>
      <BottomSheet ref={bottomSheetRef} variant="v2" hidden={showNotePrompt} pinHidden={pinSelected}>
        <BSheet_header
          title={placeName || '\u00A0'}
          subtitle="Drag the map to change location"
          onClose={resetAndClose}
        />

        <div className="surveyv2__body">
          <BSheet_gap size={32} />

          <BSheet_textarea
            placeholder="Write a note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <BSheet_gap size={32} />

          <div className="surveyv2__row">
            <div className="surveyv2__slider">
              <BSheet_sliderbig value={sliderValue} onChange={setSliderValue} />
            </div>
            <BSheet_gap size={20} horizontal />
            <BSheet_button
              width="auto"
              onClick={handleSaveClick}
              disabled={sliderValue === null || isSubmitting}
              loading={isSubmitting}
            >
              Save
            </BSheet_button>
          </div>

          {error && <p className="surveyv2__error">{error}</p>}

          <BSheet_gap size={16} />

          <BSheet_legaltext />
        </div>
      </BottomSheet>

      {showNotePrompt && (
        <FormAnswerConfirm_MSheet
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

export default Survey_BSheet_v2