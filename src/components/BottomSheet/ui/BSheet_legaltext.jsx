import './BSheet_legaltext.css'

function BSheet_legaltext() {
  const link = (href, label) => (
    <a className="sheet-legaltext__link" href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  )

  return (
    <p className="sheet-legaltext">
      By saving you agree to {link('/legal/terms-of-use', 'Terms')}
      , {link('/legal/privacy-policy', 'Privacy')}
      {' and '}{link('/legal/content-rules', 'Rules')}
    </p>
  )
}

export default BSheet_legaltext