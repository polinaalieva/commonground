import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import BottomSheet from './BottomSheet'
import BSheet_header from './ui/BSheet_header'
import BSheet_content from './ui/BSheet_content'
import BSheet_actions from './ui/BSheet_actions'
import BSheet_button from './ui/BSheet_button'
import BSheet_text from './ui/BSheet_text'
import BSheet_textarea from './ui/BSheet_textarea'
import BSheet_dropdown from './ui/BSheet_dropdown'
import { SUGGEST_CITY_CONTENT } from '../../config/content-suggest-city'

import { supabaseFetch } from '../../config/supabase'

function SuggestCitySheet({ onClose }) {
  const { pathname } = useLocation()
  const lang = pathname.startsWith('/ru') ? 'ru' : 'en'
  const c = SUGGEST_CITY_CONTENT[lang]

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
      await supabaseFetch('city_suggestions', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          city: city.trim(),
          why: why.trim() || null,
          relation: relation || null,
          contact: contact.trim() || null,
        }),
      })
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
        <BSheet_header
          title={c.thanks_title}
          onClose={onClose}
        />
        <BSheet_content>
          <BSheet_text center>
            {c.thanks_text.split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </BSheet_text>
        </BSheet_content>
        <BSheet_actions>
          <BSheet_button onClick={onClose}>{c.btn_close}</BSheet_button>
        </BSheet_actions>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet variant="default">
      {step === 1 && (
        <>
          <BSheet_header
            title={c.step1_title}
            onClose={onClose}
          />
          <BSheet_content>
            <BSheet_text>{c.description}</BSheet_text>
            <BSheet_textarea
              label={c.label_city}
              placeholder={c.placeholder_city}
              value={city}
              onChange={e => setCity(e.target.value)}
              required
            />
            <BSheet_textarea
              label={c.label_why}
              placeholder={c.placeholder_why}
              value={why}
              onChange={e => setWhy(e.target.value)}
            />
          </BSheet_content>
          <BSheet_actions>
            <BSheet_button
              onClick={() => setStep(2)}
              disabled={!city.trim()}
            >
              {c.btn_continue}
            </BSheet_button>
          </BSheet_actions>
        </>
      )}

      {step === 2 && (
        <>
          <BSheet_header
            title={c.step2_title}
            onBack={() => setStep(1)}
            onClose={onClose}
          />
          <BSheet_content>
            <BSheet_dropdown
              label={c.label_relation}
              placeholder={c.placeholder_relation}
              options={c.relation_options}
              value={relation}
              onChange={setRelation}
            />
            <BSheet_textarea
              label={c.label_contact}
              placeholder={c.placeholder_contact}
              value={contact}
              onChange={e => setContact(e.target.value)}
            />
            {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
          </BSheet_content>
          <BSheet_actions>
            <BSheet_button
              onClick={handleSubmit}
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {c.btn_submit}
            </BSheet_button>
          </BSheet_actions>
        </>
      )}
    </BottomSheet>
  )
}

export default SuggestCitySheet