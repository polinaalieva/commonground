import { useEffect, useState } from 'react'
import Card_Frame from '../Frame/Card_Frame'
import DemoHeader from './DemoHeader'
import Gap from '../ui/Gap'
import DemoStepAnimation from './DemoStepAnimation'
import DemoStepper from './DemoStepper/DemoStepper'
import DemoNav from './DemoNav'
import EVENT_DEMO_STEPS from './demoSteps.config'
import './Demo_card.css'

/**
 * "How it works" onboarding demo card.
 *
 * Fully self-contained state (`currentStep`) — takes `steps` as a prop so the
 * same component can serve the common map later with a different config.
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {{key:string,label:string,animation:string}[]} [steps]
 * @param {() => void} [onLockMap]   - called when the card opens
 * @param {() => void} [onUnlockMap] - called when the card closes/unmounts
 */
function Demo_card({ open, onClose, steps = EVENT_DEMO_STEPS, onLockMap, onUnlockMap }) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (!open) return
    setCurrentStep(0)
    onLockMap?.()
    return () => onUnlockMap?.()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const isLast = currentStep === steps.length - 1
  const activeStep = steps[currentStep]

  return (
    <Card_Frame open={open} className="demo-card" ariaProps={{ 'aria-label': 'How it works' }}>
      <DemoHeader onClose={onClose} />

      <div className="demo-card__body">
        <div className="demo-card__anim-col">
          <DemoStepAnimation file={activeStep.animation} label={activeStep.label} />
        </div>

        <div className="demo-card__col">
          <DemoStepper
            steps={steps}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
          />
          <DemoNav
            canGoBack={currentStep > 0}
            isLast={isLast}
            onBack={() => setCurrentStep(s => Math.max(0, s - 1))}
            onNext={() => setCurrentStep(s => Math.min(steps.length - 1, s + 1))}
            onClose={onClose}
          />
        </div>
      </div>

      <Gap size={8} />
    </Card_Frame>
  )
}

export default Demo_card
