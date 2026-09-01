import { Fragment } from 'react'
import DemoStepLabel from './DemoStepLabel'
import Gap from '../../ui/Gap'
import './DemoStepper.css'

/**
 * List of step labels. All rows are clickable and drive currentStep.
 * Rows are separated by Gap(16).
 *
 * @param {{key:string,label:string}[]} steps
 * @param {number} currentStep - 0-based index
 * @param {(i:number)=>void} onStepChange
 */
function DemoStepper({ steps, currentStep, onStepChange }) {
  return (
    <div className="demo-stepper">
      {steps.map((step, i) => (
        <Fragment key={step.key}>
          {i > 0 && <Gap size={16} />}
          <DemoStepLabel
            label={step.label}
            active={i === currentStep}
            onClick={() => onStepChange(i)}
          />
        </Fragment>
      ))}
    </div>
  )
}

export default DemoStepper
