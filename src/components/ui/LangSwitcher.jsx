import { useLocation, useNavigate } from 'react-router-dom'
import './LangSwitcher.css'

function LangSwitcher() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const isRu = pathname.startsWith('/ru')

  function toggleLang() {
    if (isRu) {
      navigate(pathname.replace('/ru', '') + search || '/' + search)
    } else {
      navigate('/ru' + pathname + search)
    }
  }

  return (
    <div className="lang-switcher" onClick={toggleLang}>
      <span className={`lang-switcher__option ${!isRu ? 'lang-switcher__option--active' : ''}`}>
        EN
      </span>
      <span className={`lang-switcher__option ${isRu ? 'lang-switcher__option--active' : ''}`}>
        RU
      </span>
    </div>
  )
}

export default LangSwitcher