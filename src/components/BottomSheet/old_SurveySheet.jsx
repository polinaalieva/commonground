import { useState } from 'react'
import BottomSheet from './BottomSheet'
import SheetHeader from './SheetHeader'
import SheetContent from './SheetContent'
import SheetActions from './SheetActions'
import SheetButton from './SheetButton'
import SheetAddress from './SheetAddress'
import SheetSlider from './SheetSlider'
import SheetTextarea from './SheetTextarea'

function SurveySheet({ onClose }) {
  const [step, setStep] = useState('landing')
  const [address, setAddress] = useState('')
  const [sliderValue, setSliderValue] = useState(null)
  const [note, setNote] = useState('')

  const handleSubmit = async () => {
    const data = {
      address,
      feeling: sliderValue,
      note,
    }
    console.log('submit', data)
    onClose()
  }

  return (
    <BottomSheet variant={step === 'landing' ? 'landing' : 'default'}>

      {step === 'landing' && (
        <>
          <SheetContent>
            <p className="landing-sheet__text landing-sheet__text--mobile">
              Explore signals on the map<br />or
            </p>
            <p className="landing-sheet__text landing-sheet__text--desktop">
              Explore signals on the map<br />or leave your signal
            </p>
          </SheetContent>
          <SheetActions>
            <SheetButton onClick={() => setStep(1)}>
              Leave your signal
            </SheetButton>
          </SheetActions>
        </>
      )}

      {step === 1 && (
        <>
          <SheetHeader
            title="1 / 2  Pick a place on the map"
            subtitle="Drag the map to move the pin"
            onClose={() => setStep('landing')}
          />
          <SheetContent>
            <SheetAddress
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </SheetContent>
          <SheetActions>
            <SheetButton
              onClick={() => setStep(2)}
              disabled={!address}
            >
              Continue
            </SheetButton>
          </SheetActions>
        </>
      )}

      {step === 2 && (
        <>
          <SheetHeader
            title="2 / 2  Leave your signal"
            onBack={() => setStep(1)}
            onClose={() => setStep('landing')}
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
          </SheetContent>
          <SheetActions>
            <SheetButton
              onClick={handleSubmit}
              disabled={sliderValue === null}
            >
              Done
            </SheetButton>
          </SheetActions>
        </>
      )}

    </BottomSheet>
  )
}

export default SurveySheet