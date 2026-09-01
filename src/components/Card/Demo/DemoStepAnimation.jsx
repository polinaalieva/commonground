import { useState } from 'react'
import './DemoStepAnimation.css'

/**
 * Fixed 136x240 container that renders an <iframe> pointing at a self-contained
 * animation bundle in public/demo-animations/.
 *
 * While a new bundle loads, a blurred overlay hides the raw-content flash /
 * janky first paint; it fades out once the iframe fires `load`.
 *
 * @param {string} file  - file name inside public/demo-animations/
 * @param {string} [label] - used for the iframe title / a11y
 */
function DemoStepAnimation({ file, label }) {
  // which bundle has finished loading — `loaded` is derived, so it flips to
  // false synchronously the moment `file` changes (no flash of raw iframe)
  const [loadedFile, setLoadedFile] = useState(null)
  const loaded = loadedFile === file

  return (
    <div className="demo-step-animation">
      <iframe
        key={file}
        className={`demo-step-animation__frame ${loaded ? 'is-loaded' : ''}`}
        src={`/demo-animations/${file}`}
        title={label ? `${label} — animation` : 'Step animation'}
        loading="eager"
        scrolling="no"
        onLoad={() => setLoadedFile(file)}
      />
      <div
        className={`demo-step-animation__veil ${loaded ? 'is-hidden' : ''}`}
        aria-hidden="true"
      />
    </div>
  )
}

export default DemoStepAnimation
